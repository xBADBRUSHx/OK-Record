#include "export_frame_set.h"

#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <limits>
#include <sstream>
#include <stdexcept>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <wincodec.h>
#include <wrl/client.h>
#endif

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <CoreGraphics/CoreGraphics.h>
#include <ImageIO/ImageIO.h>
#endif

namespace ok_record {

namespace {

bool ParseIndexedSequenceFrame(
    const fs::path& framePath,
    const std::string& prefix,
    uint32_t minimumDigits,
    SequenceFrameRecord& record) {
    const std::string extension = NormalizeExtension(framePath);
    if (extension != kJpegFrameExtension && extension != ".jpeg" && extension != kPngFrameExtension) {
        return false;
    }

    const std::string stem = framePath.stem().string();
    if (stem.rfind(prefix, 0) != 0) {
        return false;
    }

    const size_t digitOffset = prefix.size();
    const size_t digitCount = stem.size() - digitOffset;
    if (digitCount < minimumDigits) {
        return false;
    }

    uint32_t value = 0;
    for (size_t offset = digitOffset; offset < stem.size(); ++offset) {
        const char ch = stem[offset];
        if (ch < '0' || ch > '9') {
            return false;
        }
        value = (value * 10) + static_cast<uint32_t>(ch - '0');
    }
    if (value == 0) {
        return false;
    }

    record = {
        value,
        stem,
        framePath,
        prefix,
        static_cast<uint32_t>(digitCount),
        extension,
    };
    return true;
}

bool ParseExportableSequenceFrame(const fs::path& framePath, SequenceFrameRecord& record) {
    if (ParseIndexedSequenceFrame(framePath, "frame_", 6, record)) {
        return true;
    }
    return ParseStepFrame(framePath, record);
}

void ComputeOutputDimensionsForAspectGroup(
    const ExportAspectGroup& group,
    uint32_t maxWidth,
    uint32_t& outputWidth,
    uint32_t& outputHeight) {
    outputWidth = group.maxWidth;
    outputHeight = group.maxHeight;
    if (outputWidth > maxWidth) {
        const double scale = static_cast<double>(maxWidth) / static_cast<double>(outputWidth);
        outputWidth = maxWidth;
        outputHeight = static_cast<uint32_t>(std::llround(static_cast<double>(outputHeight) * scale));
    }
    outputWidth = MakeEvenDimension(outputWidth);
    outputHeight = MakeEvenDimension(outputHeight);
}

uint32_t GreatestCommonDivisor(uint32_t lhs, uint32_t rhs) {
    while (rhs != 0) {
        const uint32_t next = lhs % rhs;
        lhs = rhs;
        rhs = next;
    }
    return lhs == 0 ? 1 : lhs;
}

#ifdef _WIN32
std::string FormatHResult(HRESULT hr) {
    std::ostringstream text;
    text << "0x" << std::hex;
    text.width(8);
    text.fill('0');
    text << static_cast<uint32_t>(hr);
    return text.str();
}

void ThrowIfFailed(HRESULT hr, const char* message) {
    if (FAILED(hr)) {
        throw std::runtime_error(std::string(message) + " (HRESULT " + FormatHResult(hr) + ")");
    }
}

class ComInitializer {
public:
    ComInitializer() {
        const HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
        if (SUCCEEDED(hr)) {
            initialized_ = true;
            return;
        }
        if (hr == RPC_E_CHANGED_MODE) {
            initialized_ = false;
            return;
        }
        ThrowIfFailed(hr, "Unable to initialize COM for WIC dimension read");
    }

    ~ComInitializer() {
        if (initialized_) {
            CoUninitialize();
        }
    }

    ComInitializer(const ComInitializer&) = delete;
    ComInitializer& operator=(const ComInitializer&) = delete;

private:
    bool initialized_ = false;
};
#endif

#ifdef __APPLE__
template <typename T>
class CfPtr {
public:
    explicit CfPtr(T value = nullptr) : value_(value) {}
    ~CfPtr() {
        if (value_) {
            CFRelease(value_);
        }
    }

    CfPtr(const CfPtr&) = delete;
    CfPtr& operator=(const CfPtr&) = delete;

    T get() const {
        return value_;
    }

    explicit operator bool() const {
        return value_ != nullptr;
    }

private:
    T value_ = nullptr;
};

CFURLRef CreateFileUrl(const fs::path& path) {
    const std::string utf8Path = PathToUtf8(path);
    return CFURLCreateFromFileSystemRepresentation(
        nullptr,
        reinterpret_cast<const UInt8*>(utf8Path.data()),
        static_cast<CFIndex>(utf8Path.size()),
        false);
}

void ThrowIfFalse(bool condition, const char* message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}
#endif

}  // namespace

fs::path GetRecordingsRootPath(const std::string& outputDir) {
    return PathFromUtf8(outputDir) / PathFromUtf8(kRecordingsRootDirName);
}

bool IsSupportedAspectRatioMode(const std::string& mode) {
    return mode == "strict" || mode == "pad" || mode == "majority";
}

std::string FormatStepFrameName(uint32_t frameIndex) {
    std::ostringstream name;
    name << kStepFrameFilenamePrefix;
    name.width(kStepFrameIndexDigits);
    name.fill('0');
    name << frameIndex;
    return name.str();
}

bool ParseStepFrame(const fs::path& framePath, SequenceFrameRecord& record) {
    return ParseIndexedSequenceFrame(framePath, kStepFrameFilenamePrefix, kStepFrameIndexDigits, record);
}

std::vector<SequenceFrameRecord> CollectStepFrames(const fs::path& framesDir) {
    std::vector<SequenceFrameRecord> frames;
    if (!fs::exists(framesDir)) {
        return frames;
    }
    if (!fs::is_directory(framesDir)) {
        throw std::runtime_error("Step output path is not a directory: " + PathToUtf8(framesDir));
    }

    for (const auto& entry : fs::directory_iterator(framesDir)) {
        if (!entry.is_regular_file()) {
            continue;
        }
        SequenceFrameRecord frame;
        if (ParseStepFrame(entry.path(), frame)) {
            frames.push_back(frame);
        }
    }

    std::sort(frames.begin(), frames.end(), [](const SequenceFrameRecord& lhs, const SequenceFrameRecord& rhs) {
        return lhs.frameIndex < rhs.frameIndex;
    });
    return frames;
}

std::vector<SequenceFrameRecord> CollectExportableSequenceFrames(const fs::path& framesDir) {
    std::vector<SequenceFrameRecord> frames;
    if (!fs::exists(framesDir)) {
        return frames;
    }
    if (!fs::is_directory(framesDir)) {
        throw std::runtime_error("Sequence path is not a directory: " + PathToUtf8(framesDir));
    }

    for (const auto& entry : fs::directory_iterator(framesDir)) {
        if (!entry.is_regular_file()) {
            continue;
        }
        SequenceFrameRecord frame;
        if (ParseExportableSequenceFrame(entry.path(), frame)) {
            frames.push_back(frame);
        }
    }

    std::sort(frames.begin(), frames.end(), [](const SequenceFrameRecord& lhs, const SequenceFrameRecord& rhs) {
        return lhs.frameIndex < rhs.frameIndex;
    });
    if (frames.empty()) {
        return frames;
    }

    const std::string prefix = frames.front().filenamePrefix;
    const std::string extension = frames.front().frameExtension;
    const uint32_t indexDigits = frames.front().indexDigits;
    uint32_t expectedIndex = frames.front().frameIndex;
    for (const SequenceFrameRecord& frame : frames) {
        if (frame.filenamePrefix != prefix || frame.frameExtension != extension || frame.indexDigits != indexDigits) {
            throw std::runtime_error("Sequence directory contains mixed frame naming or image formats: " + PathToUtf8(framesDir));
        }
        if (frame.frameIndex != expectedIndex) {
            throw std::runtime_error("Sequence frame numbers are not contiguous at: " + frame.frameName);
        }
        ++expectedIndex;
    }
    return frames;
}

uint32_t FindNextStepFrameIndex(const fs::path& framesDir) {
    uint32_t highestFrameIndex = 0;
    for (const SequenceFrameRecord& frame : CollectStepFrames(framesDir)) {
        highestFrameIndex = std::max(highestFrameIndex, frame.frameIndex);
    }
    if (highestFrameIndex == std::numeric_limits<uint32_t>::max()) {
        throw std::runtime_error("Step frame index overflow");
    }
    return highestFrameIndex + 1;
}

FrameStorageSpec GetSequenceFrameStorageSpec(const SequenceFrameRecord& frame) {
    if (frame.frameExtension == kPngFrameExtension) {
        return {kFrameStoragePng, kPngFrameExtension};
    }
    return {kFrameStorageJpeg, frame.frameExtension};
}

fs::path GetSequenceExportRoot(const fs::path& framesDir) {
    if (framesDir.filename() == "frames" && framesDir.has_parent_path()) {
        return framesDir.parent_path();
    }
    return framesDir;
}

uint32_t MakeEvenDimension(uint32_t value) {
    if (value <= 2) {
        return 2;
    }
    return (value % 2 == 0) ? value : value - 1;
}

std::string BuildAspectRatioKey(uint32_t width, uint32_t height) {
    if (width == 0 || height == 0) {
        return "0:0";
    }
    const uint32_t divisor = GreatestCommonDivisor(width, height);
    return std::to_string(width / divisor) + ":" + std::to_string(height / divisor);
}

void AddExportAspectGroupFrame(std::vector<ExportAspectGroup>& groups, uint32_t width, uint32_t height) {
    const std::string key = BuildAspectRatioKey(width, height);
    auto group = std::find_if(groups.begin(), groups.end(), [&key](const ExportAspectGroup& candidate) {
        return candidate.key == key;
    });
    if (group == groups.end()) {
        groups.push_back({key, 0, 0, 0});
        group = groups.end() - 1;
    }
    group->frameCount += 1;
    group->maxWidth = std::max(group->maxWidth, width);
    group->maxHeight = std::max(group->maxHeight, height);
}

ExportAspectGroup SelectMajorityAspectGroup(std::vector<ExportAspectGroup> groups) {
    if (groups.empty()) {
        return {};
    }
    std::sort(groups.begin(), groups.end(), [](const ExportAspectGroup& lhs, const ExportAspectGroup& rhs) {
        if (lhs.frameCount != rhs.frameCount) {
            return lhs.frameCount > rhs.frameCount;
        }
        return lhs.key < rhs.key;
    });
    return groups.front();
}

std::string BuildExportAspectGroupsJson(std::vector<ExportAspectGroup> groups) {
    std::sort(groups.begin(), groups.end(), [](const ExportAspectGroup& lhs, const ExportAspectGroup& rhs) {
        if (lhs.frameCount != rhs.frameCount) {
            return lhs.frameCount > rhs.frameCount;
        }
        return lhs.key < rhs.key;
    });
    std::ostringstream json;
    json << "[";
    for (size_t index = 0; index < groups.size(); ++index) {
        const ExportAspectGroup& group = groups[index];
        if (index > 0) {
            json << ",";
        }
        json << "{\"ratio\":\"" << JsonEscape(group.key) << "\",";
        json << "\"frameCount\":" << group.frameCount << ",";
        json << "\"maxWidth\":" << group.maxWidth << ",";
        json << "\"maxHeight\":" << group.maxHeight << "}";
    }
    json << "]";
    return json.str();
}

#ifdef _WIN32
ImageDimensions ReadEncodedImageDimensions(const fs::path& imagePath) {
    ComInitializer com;
    using Microsoft::WRL::ComPtr;
    ComPtr<IWICImagingFactory> factory;
    ThrowIfFailed(
        CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory)),
        "Unable to create WIC imaging factory");

    ComPtr<IWICBitmapDecoder> decoder;
    ThrowIfFailed(
        factory->CreateDecoderFromFilename(
            imagePath.wstring().c_str(),
            nullptr,
            GENERIC_READ,
            WICDecodeMetadataCacheOnDemand,
            &decoder),
        "Unable to open sequence frame for dimension read");

    ComPtr<IWICBitmapFrameDecode> frame;
    ThrowIfFailed(decoder->GetFrame(0, &frame), "Unable to read first image frame");

    UINT width = 0;
    UINT height = 0;
    ThrowIfFailed(frame->GetSize(&width, &height), "Unable to read image dimensions");
    return {static_cast<uint32_t>(width), static_cast<uint32_t>(height)};
}
#elif defined(__APPLE__)
ImageDimensions ReadEncodedImageDimensions(const fs::path& imagePath) {
    CfPtr<CFURLRef> url(CreateFileUrl(imagePath));
    ThrowIfFalse(static_cast<bool>(url), "Unable to create image URL for dimension read");

    CfPtr<CGImageSourceRef> source(CGImageSourceCreateWithURL(url.get(), nullptr));
    ThrowIfFalse(static_cast<bool>(source), "Unable to open sequence frame for dimension read");

    CfPtr<CGImageRef> image(CGImageSourceCreateImageAtIndex(source.get(), 0, nullptr));
    ThrowIfFalse(static_cast<bool>(image), "Unable to read first image frame");

    return {
        static_cast<uint32_t>(CGImageGetWidth(image.get())),
        static_cast<uint32_t>(CGImageGetHeight(image.get())),
    };
}
#else
ImageDimensions ReadEncodedImageDimensions(const fs::path& imagePath) {
    (void)imagePath;
    throw std::runtime_error("Image dimension probing is not implemented on this platform");
}
#endif

ExportFrameSet BuildTimelineExportFrameSet(const TimelineExportFrameSetRequest& request) {
    const fs::path recordingsRoot = GetRecordingsRootPath(request.outputDir);
    const fs::path sessionRoot = recordingsRoot;
    const fs::path framesDir = sessionRoot / "frames";
    const fs::path tempDir = sessionRoot / "temp";
    const fs::path exportsDir = sessionRoot / "exports";
    const fs::path logsDir = sessionRoot / "logs";

    if (!fs::exists(sessionRoot) || !fs::is_directory(sessionRoot)) {
        throw std::runtime_error("Export recording timeline directory does not exist: " + PathToUtf8(sessionRoot));
    }

    std::vector<CommittedFrameRecord> frames = CollectCommittedFrames(framesDir);
    if (frames.empty()) {
        throw std::runtime_error("Export recording timeline has no completed frames: " + PathToUtf8(sessionRoot));
    }

    FrameMetadata firstMetadata = ReadFrameMetadata(frames.front().metadataJson);
    if (!IsEightBitRgbSourceMetadata(firstMetadata)) {
        throw std::runtime_error("Current export only supports frames captured from 8-bit RGB or RGBA source pixels");
    }
    const FrameStorageSpec storageSpec = GetFrameStorageSpecFromMetadata(firstMetadata);

    std::vector<ExportAspectGroup> aspectGroups;
    uint32_t expectedFrameIndex = frames.front().frameIndex;
    for (const CommittedFrameRecord& frame : frames) {
        if (frame.frameIndex != expectedFrameIndex) {
            throw std::runtime_error("Frame sequence is not contiguous at: " + frame.frameName);
        }
        ++expectedFrameIndex;

        FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
        if (!IsTimelineFrameFormatCompatible(firstMetadata, metadata)) {
            throw std::runtime_error("Export frame metadata is inconsistent: " + PathToUtf8(frame.metadataPath));
        }
        AddExportAspectGroupFrame(aspectGroups, metadata.width, metadata.height);
    }

    const ExportAspectGroup majorityGroup = SelectMajorityAspectGroup(aspectGroups);
    const bool mixedAspectRatios = aspectGroups.size() > 1;
    if (mixedAspectRatios && request.aspectRatioMode == "strict") {
        throw std::runtime_error("Recording timeline contains mixed aspect ratios. Choose pad or majority export.");
    }
    if (request.aspectRatioMode == "majority") {
        frames.erase(std::remove_if(frames.begin(), frames.end(), [&majorityGroup](const CommittedFrameRecord& frame) {
            const FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
            return BuildAspectRatioKey(metadata.width, metadata.height) != majorityGroup.key;
        }), frames.end());
        if (frames.empty()) {
            throw std::runtime_error("Majority aspect-ratio export has no frames");
        }
    }
    const FrameMetadata selectedFirstMetadata = ReadFrameMetadata(frames.front().metadataJson);

    fs::create_directories(tempDir);
    fs::create_directories(exportsDir);
    fs::create_directories(logsDir);

    uint32_t outputWidth = selectedFirstMetadata.width;
    uint32_t outputHeight = selectedFirstMetadata.height;
    ComputeOutputDimensionsForAspectGroup(majorityGroup, request.maxWidth, outputWidth, outputHeight);
    const bool forceScaleToOutput = std::any_of(frames.begin(), frames.end(), [outputWidth, outputHeight](const CommittedFrameRecord& frame) {
        const FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
        return MakeEvenDimension(metadata.width) != outputWidth ||
            MakeEvenDimension(metadata.height) != outputHeight;
    });
    const bool padToOutput = mixedAspectRatios && request.aspectRatioMode == "pad";
    const bool stageInputSequence = request.aspectRatioMode == "majority";

    return {
        sessionRoot,
        framesDir,
        tempDir,
        exportsDir,
        logsDir,
        frames,
        selectedFirstMetadata,
        storageSpec,
        outputWidth,
        outputHeight,
        forceScaleToOutput,
        padToOutput,
        stageInputSequence,
        "frame_",
        6,
        "timeline",
        sessionRoot,
    };
}

ExportFrameSet BuildSequenceExportFrameSet(const SequenceExportFrameSetRequest& request) {
    const fs::path framesDir = PathFromUtf8(request.framesDir);
    const std::vector<SequenceFrameRecord> sequenceFrames = CollectExportableSequenceFrames(framesDir);
    if (sequenceFrames.empty()) {
        throw std::runtime_error("Sequence directory has no exportable frames: " + PathToUtf8(framesDir));
    }

    const ImageDimensions firstDimensions = ReadEncodedImageDimensions(sequenceFrames.front().framePath);
    if (firstDimensions.width == 0 || firstDimensions.height == 0) {
        throw std::runtime_error("Unable to read sequence frame dimensions: " + PathToUtf8(sequenceFrames.front().framePath));
    }

    std::vector<ExportAspectGroup> aspectGroups;
    for (const SequenceFrameRecord& frame : sequenceFrames) {
        const ImageDimensions dimensions = ReadEncodedImageDimensions(frame.framePath);
        if (dimensions.width == 0 || dimensions.height == 0) {
            throw std::runtime_error("Unable to read sequence frame dimensions: " + PathToUtf8(frame.framePath));
        }
        AddExportAspectGroupFrame(aspectGroups, dimensions.width, dimensions.height);
    }
    const ExportAspectGroup majorityGroup = SelectMajorityAspectGroup(aspectGroups);
    const bool mixedAspectRatios = aspectGroups.size() > 1;
    if (mixedAspectRatios && request.aspectRatioMode == "strict") {
        throw std::runtime_error("Sequence directory contains mixed aspect ratios. Choose pad or majority export.");
    }

    const fs::path sequenceRoot = GetSequenceExportRoot(framesDir);
    const fs::path tempDir = sequenceRoot / "temp";
    const fs::path exportsDir = sequenceRoot / "exports";
    const fs::path logsDir = sequenceRoot / "logs";
    fs::create_directories(tempDir);
    fs::create_directories(exportsDir);
    fs::create_directories(logsDir);

    std::vector<CommittedFrameRecord> frames;
    frames.reserve(sequenceFrames.size());
    for (const SequenceFrameRecord& frame : sequenceFrames) {
        if (request.aspectRatioMode == "majority") {
            const ImageDimensions dimensions = ReadEncodedImageDimensions(frame.framePath);
            if (BuildAspectRatioKey(dimensions.width, dimensions.height) != majorityGroup.key) {
                continue;
            }
        }
        frames.push_back({frame.frameIndex, frame.frameName, frame.framePath, fs::path(), ""});
    }
    if (frames.empty()) {
        throw std::runtime_error("Majority aspect-ratio export has no frames");
    }

    const ImageDimensions selectedFirstDimensions = ReadEncodedImageDimensions(frames.front().framePath);
    uint32_t outputWidth = selectedFirstDimensions.width;
    uint32_t outputHeight = selectedFirstDimensions.height;
    ComputeOutputDimensionsForAspectGroup(majorityGroup, request.maxWidth, outputWidth, outputHeight);
    const bool forceScaleToOutput = std::any_of(frames.begin(), frames.end(), [outputWidth, outputHeight](const CommittedFrameRecord& frame) {
        const ImageDimensions dimensions = ReadEncodedImageDimensions(frame.framePath);
        return MakeEvenDimension(dimensions.width) != outputWidth ||
            MakeEvenDimension(dimensions.height) != outputHeight;
    });
    const bool padToOutput = mixedAspectRatios && request.aspectRatioMode == "pad";
    const bool stageInputSequence = request.aspectRatioMode == "majority";

    FrameMetadata metadata;
    metadata.width = selectedFirstDimensions.width;
    metadata.height = selectedFirstDimensions.height;
    metadata.components = 4;
    metadata.componentSize = 8;
    metadata.pixelFormat = "encoded";
    metadata.frameStorageFormat = GetSequenceFrameStorageSpec(sequenceFrames.front()).storageFormat;
    metadata.frameExtension = sequenceFrames.front().frameExtension;
    metadata.frameQualityPreset = "";
    metadata.jpegQuality = 0;

    const FrameStorageSpec storageSpec = GetSequenceFrameStorageSpec(sequenceFrames.front());
    return {
        sequenceRoot,
        framesDir,
        tempDir,
        exportsDir,
        logsDir,
        frames,
        metadata,
        storageSpec,
        outputWidth,
        outputHeight,
        forceScaleToOutput,
        padToOutput,
        stageInputSequence,
        sequenceFrames.front().filenamePrefix,
        sequenceFrames.front().indexDigits,
        "directory",
        framesDir,
    };
}

}  // namespace ok_record
