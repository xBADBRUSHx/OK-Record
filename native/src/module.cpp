#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <cctype>
#include <exception>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

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

#include "UxpAddon.h"
#include "export_runner.h"
#include "export_progress.h"
#include "storage_recovery.h"

namespace {

namespace fs = std::filesystem;
using namespace ok_record;

constexpr const char* STEP_FRAME_FILENAME_PREFIX = "step_";
constexpr uint32_t STEP_FRAME_INDEX_DIGITS = 3;
constexpr const char* RECORDINGS_ROOT_DIR_NAME = u8"延时录制_Recordings";
constexpr uint32_t MIN_EXPORT_MAX_WIDTH = 16;
constexpr uint32_t MAX_EXPORT_MAX_WIDTH = 16384;

struct FrameWriteRequest {
    std::string outputDir;
    std::string sessionId;
    std::string requestId;
    std::string capturedAt;
    std::string pixelFormat;
    std::string colorSpace;
    std::string colorProfile;
    std::string boundsJson;
    std::string frameStorageFormat;
    std::string frameExtension;
    std::string frameQualityPreset;
    uint32_t width = 0;
    uint32_t height = 0;
    uint32_t components = 0;
    uint32_t componentSize = 0;
    uint32_t jpegQuality = 80;
    uint64_t byteLength = 0;
    bool hasAlpha = false;
};

struct ExportRequest {
    std::string outputDir;
    std::string sessionId;
    std::string aspectRatioMode = "strict";
    double holdSeconds = 1.0;
    uint32_t outputFps = 30;
    uint32_t maxWidth = 1920;
    uint32_t crf = 18;
};

struct SequenceExportRequest {
    std::string framesDir;
    std::string aspectRatioMode = "strict";
    double holdSeconds = 1.0;
    uint32_t outputFps = 30;
    uint32_t maxWidth = 1920;
    uint32_t crf = 18;
};

struct SequenceFrameRecord {
    uint32_t frameIndex = 0;
    std::string frameName;
    fs::path framePath;
    std::string filenamePrefix;
    uint32_t indexDigits = 0;
    std::string frameExtension;
};

struct ImageDimensions {
    uint32_t width = 0;
    uint32_t height = 0;
};

ImageDimensions ReadEncodedImageDimensions(const fs::path& imagePath);

fs::path GetRecordingsRootPath(const std::string& outputDir) {
    return PathFromUtf8(outputDir) / PathFromUtf8(RECORDINGS_ROOT_DIR_NAME);
}

bool IsSupportedAspectRatioMode(const std::string& mode) {
    return mode == "strict" || mode == "pad" || mode == "majority";
}

addon_value ThrowAddonError(addon_env env, const std::string& message) {
    UxpAddonApis.uxp_addon_throw_error(env, nullptr, message.c_str());
    return nullptr;
}

addon_value CreateString(addon_env env, const std::string& value) {
    addon_value result = nullptr;
    Check(UxpAddonApis.uxp_addon_create_string_utf8(env, value.c_str(), value.size(), &result));
    return result;
}

void SetStringProperty(addon_env env, addon_value object, const char* name, const std::string& value) {
    Check(UxpAddonApis.uxp_addon_set_named_property(env, object, name, CreateString(env, value)));
}

void SetPathProperty(addon_env env, addon_value object, const char* name, const fs::path& value) {
    SetStringProperty(env, object, name, PathToUtf8(value));
}

void SetNumberProperty(addon_env env, addon_value object, const char* name, double value) {
    addon_value number = nullptr;
    Check(UxpAddonApis.uxp_addon_create_double(env, value, &number));
    Check(UxpAddonApis.uxp_addon_set_named_property(env, object, name, number));
}

void SetBoolProperty(addon_env env, addon_value object, const char* name, bool value) {
    addon_value boolean = nullptr;
    Check(UxpAddonApis.uxp_addon_get_boolean(env, value, &boolean));
    Check(UxpAddonApis.uxp_addon_set_named_property(env, object, name, boolean));
}

void SetValueProperty(addon_env env, addon_value object, const char* name, addon_value value) {
    Check(UxpAddonApis.uxp_addon_set_named_property(env, object, name, value));
}

addon_value GetRequiredProperty(addon_env env, addon_value object, const char* name) {
    bool hasProperty = false;
    Check(UxpAddonApis.uxp_addon_has_named_property(env, object, name, &hasProperty));
    if (!hasProperty) {
        throw std::runtime_error(std::string("Missing metadata field: ") + name);
    }

    addon_value value = nullptr;
    Check(UxpAddonApis.uxp_addon_get_named_property(env, object, name, &value));
    return value;
}

std::string GetStringProperty(addon_env env, addon_value object, const char* name) {
    addon_value value = GetRequiredProperty(env, object, name);
    size_t length = 0;
    Check(UxpAddonApis.uxp_addon_get_value_string_utf8(env, value, nullptr, 0, &length));

    std::string result;
    if (length == 0) {
        return result;
    }

    result.resize(length + 1);
    size_t actualLength = 0;
    Check(UxpAddonApis.uxp_addon_get_value_string_utf8(env, value, result.data(), result.size(), &actualLength));
    result.resize(actualLength);
    return result;
}

std::string GetOptionalStringProperty(addon_env env, addon_value object, const char* name, const std::string& defaultValue) {
    bool hasProperty = false;
    Check(UxpAddonApis.uxp_addon_has_named_property(env, object, name, &hasProperty));
    if (!hasProperty) {
        return defaultValue;
    }
    return GetStringProperty(env, object, name);
}

uint32_t GetUInt32Property(addon_env env, addon_value object, const char* name) {
    addon_value value = GetRequiredProperty(env, object, name);
    uint32_t result = 0;
    Check(UxpAddonApis.uxp_addon_get_value_uint32(env, value, &result));
    return result;
}

double GetDoubleProperty(addon_env env, addon_value object, const char* name) {
    addon_value value = GetRequiredProperty(env, object, name);
    double result = 0;
    Check(UxpAddonApis.uxp_addon_get_value_double(env, value, &result));
    return result;
}

uint64_t GetUInt64Property(addon_env env, addon_value object, const char* name) {
    addon_value value = GetRequiredProperty(env, object, name);
    double number = 0;
    Check(UxpAddonApis.uxp_addon_get_value_double(env, value, &number));
    if (number < 0 || number > static_cast<double>(std::numeric_limits<uint64_t>::max())) {
        throw std::runtime_error(std::string("Invalid numeric metadata field: ") + name);
    }
    return static_cast<uint64_t>(number);
}

bool GetBoolProperty(addon_env env, addon_value object, const char* name) {
    addon_value value = GetRequiredProperty(env, object, name);
    bool result = false;
    Check(UxpAddonApis.uxp_addon_get_value_bool(env, value, &result));
    return result;
}

uint32_t ExpectedJpegQualityForPreset(const std::string& preset) {
    if (preset == kFrameQualityLow) {
        return 60;
    }
    if (preset == kFrameQualityDefault) {
        return 80;
    }
    if (preset == kFrameQualityHigh) {
        return 92;
    }
    if (preset == kFrameQualityLossless) {
        return 0;
    }
    throw std::runtime_error("Unsupported frame quality preset: " + preset);
}

FrameStorageSpec NormalizeRequestedFrameStorage(FrameWriteRequest& request) {
    FrameStorageSpec storageSpec = NormalizeFrameStorageSpec({request.frameStorageFormat, request.frameExtension});
    request.frameStorageFormat = storageSpec.storageFormat;
    request.frameExtension = storageSpec.frameExtension;

    const uint32_t expectedJpegQuality = ExpectedJpegQualityForPreset(request.frameQualityPreset);
    if (request.jpegQuality != expectedJpegQuality) {
        throw std::runtime_error("metadata.jpegQuality does not match frameQualityPreset");
    }
    if (request.frameQualityPreset == kFrameQualityLossless) {
        if (!IsPngFrameStorage(storageSpec)) {
            throw std::runtime_error("Lossless frame quality preset must use PNG frame storage");
        }
    } else if (!IsJpegFrameStorage(storageSpec)) {
        throw std::runtime_error("JPEG frame quality presets must use JPEG frame storage");
    }
    return storageSpec;
}

FrameWriteRequest ReadFrameWriteRequest(addon_env env, addon_value metadataValue) {
    addon_valuetype type = addon_undefined;
    Check(UxpAddonApis.uxp_addon_typeof(env, metadataValue, &type));
    if (type != addon_object) {
        throw std::runtime_error("write_frame metadata must be an object");
    }

    FrameWriteRequest request;
    request.outputDir = GetStringProperty(env, metadataValue, "outputDir");
    request.sessionId = GetStringProperty(env, metadataValue, "sessionId");
    request.requestId = GetStringProperty(env, metadataValue, "requestId");
    request.capturedAt = GetStringProperty(env, metadataValue, "capturedAt");
    request.pixelFormat = GetStringProperty(env, metadataValue, "pixelFormat");
    request.colorSpace = GetStringProperty(env, metadataValue, "colorSpace");
    request.colorProfile = GetStringProperty(env, metadataValue, "colorProfile");
    request.boundsJson = GetStringProperty(env, metadataValue, "boundsJson");
    request.frameStorageFormat = GetStringProperty(env, metadataValue, "frameStorageFormat");
    request.frameExtension = GetStringProperty(env, metadataValue, "frameExtension");
    request.frameQualityPreset = GetStringProperty(env, metadataValue, "frameQualityPreset");
    request.width = GetUInt32Property(env, metadataValue, "width");
    request.height = GetUInt32Property(env, metadataValue, "height");
    request.components = GetUInt32Property(env, metadataValue, "components");
    request.componentSize = GetUInt32Property(env, metadataValue, "componentSize");
    request.jpegQuality = GetUInt32Property(env, metadataValue, "jpegQuality");
    request.byteLength = GetUInt64Property(env, metadataValue, "byteLength");
    request.hasAlpha = GetBoolProperty(env, metadataValue, "hasAlpha");

    if (request.outputDir.empty()) {
        throw std::runtime_error("metadata.outputDir is empty");
    }
    if (!IsSafeIdentifier(request.sessionId)) {
        throw std::runtime_error("metadata.sessionId must contain only letters, digits, '_' or '-'");
    }
    if (request.sessionId != kRecordingTimelineId) {
        throw std::runtime_error("metadata.sessionId must use the recording timeline id");
    }
    if (!IsSafeIdentifier(request.requestId)) {
        throw std::runtime_error("metadata.requestId must contain only letters, digits, '_' or '-'");
    }
    if (request.width == 0 || request.height == 0 || request.components == 0 || request.componentSize == 0) {
        throw std::runtime_error("Invalid empty frame dimensions or component metadata");
    }
    if (request.componentSize % 8 != 0) {
        throw std::runtime_error("Only byte-aligned component sizes can be written by the frame writer");
    }
    (void)NormalizeRequestedFrameStorage(request);

    const uint64_t bytesPerPixel = static_cast<uint64_t>(request.components) * (request.componentSize / 8);
    const uint64_t expectedBytes = static_cast<uint64_t>(request.width) * request.height * bytesPerPixel;
    if (expectedBytes != request.byteLength) {
        throw std::runtime_error("metadata.byteLength does not match frame dimensions");
    }

    return request;
}

FrameWriteRequest ReadStepFrameWriteRequest(addon_env env, addon_value metadataValue) {
    addon_valuetype type = addon_undefined;
    Check(UxpAddonApis.uxp_addon_typeof(env, metadataValue, &type));
    if (type != addon_object) {
        throw std::runtime_error("write_step_frame metadata must be an object");
    }

    FrameWriteRequest request;
    request.outputDir = GetStringProperty(env, metadataValue, "outputDir");
    request.sessionId = "step_frames";
    request.requestId = GetStringProperty(env, metadataValue, "requestId");
    request.capturedAt = GetStringProperty(env, metadataValue, "capturedAt");
    request.pixelFormat = GetStringProperty(env, metadataValue, "pixelFormat");
    request.colorSpace = GetStringProperty(env, metadataValue, "colorSpace");
    request.colorProfile = GetStringProperty(env, metadataValue, "colorProfile");
    request.boundsJson = GetStringProperty(env, metadataValue, "boundsJson");
    request.frameStorageFormat = kFrameStoragePng;
    request.frameExtension = kPngFrameExtension;
    request.frameQualityPreset = kFrameQualityLossless;
    request.width = GetUInt32Property(env, metadataValue, "width");
    request.height = GetUInt32Property(env, metadataValue, "height");
    request.components = GetUInt32Property(env, metadataValue, "components");
    request.componentSize = GetUInt32Property(env, metadataValue, "componentSize");
    request.jpegQuality = 0;
    request.byteLength = GetUInt64Property(env, metadataValue, "byteLength");
    request.hasAlpha = GetBoolProperty(env, metadataValue, "hasAlpha");

    if (request.outputDir.empty()) {
        throw std::runtime_error("step metadata.outputDir is empty");
    }
    if (!IsSafeIdentifier(request.requestId)) {
        throw std::runtime_error("step metadata.requestId must contain only letters, digits, '_' or '-'");
    }
    if (request.width == 0 || request.height == 0 || request.components == 0 || request.componentSize == 0) {
        throw std::runtime_error("Invalid empty step dimensions or component metadata");
    }
    if (request.componentSize % 8 != 0) {
        throw std::runtime_error("Only byte-aligned component sizes can be written by the step writer");
    }
    (void)NormalizeRequestedFrameStorage(request);

    const uint64_t bytesPerPixel = static_cast<uint64_t>(request.components) * (request.componentSize / 8);
    const uint64_t expectedBytes = static_cast<uint64_t>(request.width) * request.height * bytesPerPixel;
    if (expectedBytes != request.byteLength) {
        throw std::runtime_error("step metadata.byteLength does not match frame dimensions");
    }

    return request;
}

std::string ReadScanRecordingsOutputDir(addon_env env, addon_value requestValue) {
    addon_valuetype type = addon_undefined;
    Check(UxpAddonApis.uxp_addon_typeof(env, requestValue, &type));
    if (type != addon_object) {
        throw std::runtime_error("scan_recordings request must be an object");
    }

    std::string outputDir = GetStringProperty(env, requestValue, "outputDir");
    if (outputDir.empty()) {
        throw std::runtime_error("scan_recordings outputDir is empty");
    }
    return outputDir;
}

std::string ReadScanSequenceFramesDir(addon_env env, addon_value requestValue) {
    addon_valuetype type = addon_undefined;
    Check(UxpAddonApis.uxp_addon_typeof(env, requestValue, &type));
    if (type != addon_object) {
        throw std::runtime_error("scan_sequence request must be an object");
    }

    std::string framesDir = GetStringProperty(env, requestValue, "framesDir");
    if (framesDir.empty()) {
        throw std::runtime_error("scan_sequence framesDir is empty");
    }
    return framesDir;
}

ExportRequest ReadExportRequest(addon_env env, addon_value requestValue) {
    addon_valuetype type = addon_undefined;
    Check(UxpAddonApis.uxp_addon_typeof(env, requestValue, &type));
    if (type != addon_object) {
        throw std::runtime_error("export_session request must be an object");
    }

    ExportRequest request;
    request.outputDir = GetStringProperty(env, requestValue, "outputDir");
    request.sessionId = GetStringProperty(env, requestValue, "sessionId");
    request.aspectRatioMode = GetOptionalStringProperty(env, requestValue, "aspectRatioMode", "strict");
    request.holdSeconds = GetDoubleProperty(env, requestValue, "holdSeconds");
    request.outputFps = GetUInt32Property(env, requestValue, "outputFps");
    request.maxWidth = GetUInt32Property(env, requestValue, "maxWidth");
    request.crf = GetUInt32Property(env, requestValue, "crf");

    if (request.outputDir.empty()) {
        throw std::runtime_error("export_session outputDir is empty");
    }
    if (!IsSafeIdentifier(request.sessionId)) {
        throw std::runtime_error("export_session sessionId must contain only letters, digits, '_' or '-'");
    }
    if (request.sessionId != kRecordingTimelineId) {
        throw std::runtime_error("export_session sessionId must use the recording timeline id");
    }
    if (!IsSupportedAspectRatioMode(request.aspectRatioMode)) {
        throw std::runtime_error("export_session aspectRatioMode must be strict, pad, or majority");
    }
    if (!std::isfinite(request.holdSeconds) || request.holdSeconds <= 0 || request.holdSeconds > 3600) {
        throw std::runtime_error("export_session holdSeconds must be > 0 and <= 3600");
    }
    if (request.outputFps == 0 || request.outputFps > 120) {
        throw std::runtime_error("export_session outputFps must be between 1 and 120");
    }
    if (request.maxWidth < MIN_EXPORT_MAX_WIDTH || request.maxWidth > MAX_EXPORT_MAX_WIDTH) {
        throw std::runtime_error("export_session maxWidth must be between 16 and 16384");
    }
    if (request.crf > 51) {
        throw std::runtime_error("export_session crf must be between 0 and 51");
    }
    return request;
}

SequenceExportRequest ReadSequenceExportRequest(addon_env env, addon_value requestValue) {
    addon_valuetype type = addon_undefined;
    Check(UxpAddonApis.uxp_addon_typeof(env, requestValue, &type));
    if (type != addon_object) {
        throw std::runtime_error("export_sequence request must be an object");
    }

    SequenceExportRequest request;
    request.framesDir = GetStringProperty(env, requestValue, "framesDir");
    request.aspectRatioMode = GetOptionalStringProperty(env, requestValue, "aspectRatioMode", "strict");
    request.holdSeconds = GetDoubleProperty(env, requestValue, "holdSeconds");
    request.outputFps = GetUInt32Property(env, requestValue, "outputFps");
    request.maxWidth = GetUInt32Property(env, requestValue, "maxWidth");
    request.crf = GetUInt32Property(env, requestValue, "crf");

    if (request.framesDir.empty()) {
        throw std::runtime_error("export_sequence framesDir is empty");
    }
    if (!IsSupportedAspectRatioMode(request.aspectRatioMode)) {
        throw std::runtime_error("export_sequence aspectRatioMode must be strict, pad, or majority");
    }
    if (!std::isfinite(request.holdSeconds) || request.holdSeconds <= 0 || request.holdSeconds > 3600) {
        throw std::runtime_error("export_sequence holdSeconds must be > 0 and <= 3600");
    }
    if (request.outputFps == 0 || request.outputFps > 120) {
        throw std::runtime_error("export_sequence outputFps must be between 1 and 120");
    }
    if (request.maxWidth < MIN_EXPORT_MAX_WIDTH || request.maxWidth > MAX_EXPORT_MAX_WIDTH) {
        throw std::runtime_error("export_sequence maxWidth must be between 16 and 16384");
    }
    if (request.crf > 51) {
        throw std::runtime_error("export_sequence crf must be between 0 and 51");
    }
    return request;
}

std::string FormatFrameFormat(const FrameMetadata& metadata) {
    std::ostringstream text;
    text << metadata.width << "x" << metadata.height
        << ", components=" << metadata.components
        << ", componentSize=" << metadata.componentSize
        << ", pixelFormat=" << metadata.pixelFormat
        << ", storage=" << metadata.frameStorageFormat
        << ", qualityPreset=" << metadata.frameQualityPreset
        << ", jpegQuality=" << metadata.jpegQuality;
    return text.str();
}

std::string FormatFrameFormat(const FrameWriteRequest& request) {
    std::ostringstream text;
    text << request.width << "x" << request.height
        << ", components=" << request.components
        << ", componentSize=" << request.componentSize
        << ", pixelFormat=" << request.pixelFormat
        << ", storage=" << request.frameStorageFormat
        << ", qualityPreset=" << request.frameQualityPreset
        << ", jpegQuality=" << request.jpegQuality;
    return text.str();
}

FrameStorageSpec SelectFrameStorageSpec(const std::vector<CommittedFrameRecord>& existingFrames, const FrameWriteRequest& request) {
    if (existingFrames.empty()) {
        return NormalizeFrameStorageSpec({request.frameStorageFormat, request.frameExtension});
    }

    const FrameMetadata firstMetadata = ReadFrameMetadata(existingFrames.front().metadataJson);
    return GetFrameStorageSpecFromMetadata(firstMetadata);
}

std::string FormatStepFrameName(uint32_t frameIndex) {
    std::ostringstream name;
    name << STEP_FRAME_FILENAME_PREFIX;
    name.width(STEP_FRAME_INDEX_DIGITS);
    name.fill('0');
    name << frameIndex;
    return name.str();
}

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

bool ParseStepFrame(const fs::path& framePath, SequenceFrameRecord& record) {
    return ParseIndexedSequenceFrame(framePath, STEP_FRAME_FILENAME_PREFIX, STEP_FRAME_INDEX_DIGITS, record);
}

bool ParseExportableSequenceFrame(const fs::path& framePath, SequenceFrameRecord& record) {
    if (ParseIndexedSequenceFrame(framePath, "frame_", 6, record)) {
        return true;
    }
    return ParseStepFrame(framePath, record);
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

uint32_t GreatestCommonDivisor(uint32_t lhs, uint32_t rhs) {
    while (rhs != 0) {
        const uint32_t next = lhs % rhs;
        lhs = rhs;
        rhs = next;
    }
    return lhs == 0 ? 1 : lhs;
}

std::string BuildAspectRatioKey(uint32_t width, uint32_t height) {
    if (width == 0 || height == 0) {
        return "0:0";
    }
    const uint32_t divisor = GreatestCommonDivisor(width, height);
    return std::to_string(width / divisor) + ":" + std::to_string(height / divisor);
}

struct ExportAspectGroup {
    std::string key;
    uint32_t frameCount = 0;
    uint32_t maxWidth = 0;
    uint32_t maxHeight = 0;
};

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

ExportFrameSet BuildExportFrameSet(const ExportRequest& request) {
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
    if (firstMetadata.pixelFormat != "RGBA" || firstMetadata.components != 4 || firstMetadata.componentSize != 8) {
        throw std::runtime_error("Current export only supports frames captured from 8-bit RGBA source pixels");
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
        if (metadata.components != firstMetadata.components ||
            metadata.componentSize != firstMetadata.componentSize ||
            metadata.pixelFormat != firstMetadata.pixelFormat ||
            metadata.frameStorageFormat != firstMetadata.frameStorageFormat ||
            metadata.frameQualityPreset != firstMetadata.frameQualityPreset ||
            metadata.jpegQuality != firstMetadata.jpegQuality ||
            metadata.frameExtension != firstMetadata.frameExtension) {
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

ExportFrameSet BuildSequenceExportFrameSet(const SequenceExportRequest& request) {
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

std::string BuildFrameMetadataJson(
    const FrameWriteRequest& request,
    uint32_t frameIndex,
    const std::string& frameName,
    const fs::path& framePath,
    const fs::path& metadataPath,
    const FrameStorageSpec& storageSpec,
    uint64_t sourceByteLength,
    uint64_t encodedByteLength) {
    std::ostringstream json;
    json << "{\n";
    json << "  \"schema\": \"ok-record.frame.v1\",\n";
    json << "  \"sessionId\": \"" << JsonEscape(request.sessionId) << "\",\n";
    json << "  \"requestId\": \"" << JsonEscape(request.requestId) << "\",\n";
    json << "  \"frameIndex\": " << frameIndex << ",\n";
    json << "  \"frameName\": \"" << JsonEscape(frameName) << "\",\n";
    json << "  \"capturedAt\": \"" << JsonEscape(request.capturedAt) << "\",\n";
    json << "  \"framePath\": \"" << JsonEscape(PathToUtf8(framePath)) << "\",\n";
    json << "  \"metadataPath\": \"" << JsonEscape(PathToUtf8(metadataPath)) << "\",\n";
    json << "  \"frameStorageFormat\": \"" << JsonEscape(storageSpec.storageFormat) << "\",\n";
    json << "  \"frameExtension\": \"" << JsonEscape(storageSpec.frameExtension) << "\",\n";
    json << "  \"frameQualityPreset\": \"" << JsonEscape(request.frameQualityPreset) << "\",\n";
    json << "  \"jpegQuality\": " << request.jpegQuality << ",\n";
    json << "  \"width\": " << request.width << ",\n";
    json << "  \"height\": " << request.height << ",\n";
    json << "  \"components\": " << request.components << ",\n";
    json << "  \"componentSize\": " << request.componentSize << ",\n";
    json << "  \"pixelFormat\": \"" << JsonEscape(request.pixelFormat) << "\",\n";
    json << "  \"colorSpace\": \"" << JsonEscape(request.colorSpace) << "\",\n";
    json << "  \"colorProfile\": \"" << JsonEscape(request.colorProfile) << "\",\n";
    json << "  \"hasAlpha\": " << (request.hasAlpha ? "true" : "false") << ",\n";
    json << "  \"byteLength\": " << sourceByteLength << ",\n";
    json << "  \"sourceByteLength\": " << sourceByteLength << ",\n";
    json << "  \"encodedByteLength\": " << encodedByteLength << ",\n";
    json << "  \"alphaMode\": \"" << (IsJpegFrameStorage(storageSpec) ? "flattened-on-white" : "preserved") << "\",\n";
    json << "  \"boundsJson\": \"" << JsonEscape(request.boundsJson) << "\"\n";
    json << "}\n";
    return json.str();
}

addon_value CreateSessionScanValue(addon_env env, const RecordingSessionScanResult& session) {
    if (session.lastFrameIndex == std::numeric_limits<uint32_t>::max()) {
        throw std::runtime_error("Frame index overflow in scan result");
    }

    addon_value result = nullptr;
    Check(UxpAddonApis.uxp_addon_create_object(env, &result));
    SetStringProperty(env, result, "sessionId", session.sessionId);
    SetPathProperty(env, result, "sessionPath", session.sessionRoot);
    SetPathProperty(env, result, "framesPath", session.framesDir);
    SetPathProperty(env, result, "manifestPath", session.manifestPath);
    SetBoolProperty(env, result, "manifestExists", fs::exists(session.manifestPath));
    SetNumberProperty(env, result, "frameCount", session.frameCount);
    SetNumberProperty(env, result, "lastFrameIndex", session.lastFrameIndex);
    SetNumberProperty(env, result, "nextFrameIndex", static_cast<double>(session.lastFrameIndex + 1));
    SetStringProperty(env, result, "lastFrameName", session.lastFrameName);
    SetPathProperty(env, result, "lastFramePath", session.lastFramePath);
    SetPathProperty(env, result, "lastMetadataPath", session.lastMetadataPath);
    SetStringProperty(env, result, "firstFrameMetadataJson", session.firstFrameMetadataJson);
    SetStringProperty(env, result, "lastFrameMetadataJson", session.lastFrameMetadataJson);
    SetBoolProperty(env, result, "exportFrameMetadataConsistent", session.exportFrameMetadataConsistent);
    SetBoolProperty(env, result, "aspectRatioConsistent", session.aspectRatioConsistent);
    SetStringProperty(env, result, "aspectRatioGroupsJson", session.aspectRatioGroupsJson);
    SetStringProperty(env, result, "majorityAspectRatioKey", session.majorityAspectRatioKey);
    SetNumberProperty(env, result, "majorityAspectRatioFrameCount", session.majorityAspectRatioFrameCount);
    SetStringProperty(env, result, "inconsistentFrameName", session.inconsistentFrameName);
    SetPathProperty(env, result, "inconsistentMetadataPath", session.inconsistentMetadataPath);
    SetBoolProperty(env, result, "contiguousFrames", session.contiguousFrames);
    SetBoolProperty(env, result, "exportable", session.exportable);
    SetNumberProperty(env, result, "firstMissingFrameIndex", session.firstMissingFrameIndex);
    SetNumberProperty(env, result, "orphanFrameCount", session.orphanFrameCount);
    SetPathProperty(env, result, "firstOrphanFramePath", session.firstOrphanFramePath);
    SetStringProperty(env, result, "exportBlockReason", session.exportBlockReason);
    return result;
}

addon_value CreateInvalidSessionScanValue(addon_env env, const InvalidRecordingSessionScanResult& session) {
    addon_value result = nullptr;
    Check(UxpAddonApis.uxp_addon_create_object(env, &result));
    SetStringProperty(env, result, "sessionId", session.sessionId);
    SetPathProperty(env, result, "sessionPath", session.sessionRoot);
    SetPathProperty(env, result, "framesPath", session.framesDir);
    SetStringProperty(env, result, "error", session.error);
    return result;
}

addon_value CreateRecordingsScanValue(
    addon_env env,
    const fs::path& recordingsRoot,
    const RecordingSessionScanSummary& scan) {
    const std::vector<RecordingSessionScanResult>& sessions = scan.sessions;
    const std::vector<InvalidRecordingSessionScanResult>& invalidSessions = scan.invalidSessions;
    addon_value result = nullptr;
    Check(UxpAddonApis.uxp_addon_create_object(env, &result));
    SetStringProperty(env, result, "schema", "ok-record.scan-result.v1");
    SetPathProperty(env, result, "rootPath", recordingsRoot);
    SetBoolProperty(env, result, "restored", !sessions.empty());
    SetNumberProperty(env, result, "sessionCount", static_cast<double>(sessions.size()));
    SetBoolProperty(env, result, "hasInvalidSessions", !invalidSessions.empty());
    SetNumberProperty(env, result, "invalidSessionCount", static_cast<double>(invalidSessions.size()));

    addon_value sessionsArray = nullptr;
    Check(UxpAddonApis.uxp_addon_create_array_with_length(env, sessions.size(), &sessionsArray));
    addon_value activeSession = nullptr;
    for (size_t index = 0; index < sessions.size(); ++index) {
        addon_value sessionValue = CreateSessionScanValue(env, sessions[index]);
        if (index == 0) {
            activeSession = sessionValue;
        }
        Check(UxpAddonApis.uxp_addon_set_element(env, sessionsArray, static_cast<uint32_t>(index), sessionValue));
    }
    SetValueProperty(env, result, "sessions", sessionsArray);
    addon_value invalidSessionsArray = nullptr;
    Check(UxpAddonApis.uxp_addon_create_array_with_length(env, invalidSessions.size(), &invalidSessionsArray));
    for (size_t index = 0; index < invalidSessions.size(); ++index) {
        addon_value sessionValue = CreateInvalidSessionScanValue(env, invalidSessions[index]);
        Check(UxpAddonApis.uxp_addon_set_element(env, invalidSessionsArray, static_cast<uint32_t>(index), sessionValue));
    }
    SetValueProperty(env, result, "invalidSessions", invalidSessionsArray);
    if (activeSession != nullptr) {
        SetValueProperty(env, result, "activeSession", activeSession);
        SetNumberProperty(env, result, "frameCount", sessions.front().frameCount);
        SetNumberProperty(env, result, "nextFrameIndex", static_cast<double>(sessions.front().lastFrameIndex + 1));
    } else {
        SetNumberProperty(env, result, "frameCount", 0);
        SetNumberProperty(env, result, "nextFrameIndex", 1);
    }
    return result;
}

addon_value CreateSequenceScanValue(
    addon_env env,
    const fs::path& framesDir,
    const std::vector<SequenceFrameRecord>& frames) {
    addon_value result = nullptr;
    Check(UxpAddonApis.uxp_addon_create_object(env, &result));
    SetStringProperty(env, result, "schema", "ok-record.sequence-scan-result.v1");
    SetPathProperty(env, result, "framesDir", framesDir);
    SetBoolProperty(env, result, "exists", fs::exists(framesDir));
    SetNumberProperty(env, result, "frameCount", static_cast<double>(frames.size()));
    if (frames.empty()) {
        SetNumberProperty(env, result, "firstFrameIndex", 0);
        SetNumberProperty(env, result, "lastFrameIndex", 0);
        SetStringProperty(env, result, "firstFrameName", "");
        SetStringProperty(env, result, "lastFrameName", "");
        SetStringProperty(env, result, "firstFramePath", "");
        SetStringProperty(env, result, "lastFramePath", "");
        SetStringProperty(env, result, "filenamePrefix", "");
        SetNumberProperty(env, result, "indexDigits", 0);
        SetStringProperty(env, result, "frameExtension", "");
        SetStringProperty(env, result, "frameStorageFormat", "");
        SetBoolProperty(env, result, "aspectRatioConsistent", true);
        SetStringProperty(env, result, "aspectRatioGroupsJson", "[]");
        SetStringProperty(env, result, "majorityAspectRatioKey", "");
        SetNumberProperty(env, result, "majorityAspectRatioFrameCount", 0);
        return result;
    }

    const SequenceFrameRecord& firstFrame = frames.front();
    const SequenceFrameRecord& lastFrame = frames.back();
    const FrameStorageSpec storageSpec = GetSequenceFrameStorageSpec(firstFrame);
    std::vector<ExportAspectGroup> aspectGroups;
    for (const SequenceFrameRecord& frame : frames) {
        const ImageDimensions dimensions = ReadEncodedImageDimensions(frame.framePath);
        if (dimensions.width > 0 && dimensions.height > 0) {
            AddExportAspectGroupFrame(aspectGroups, dimensions.width, dimensions.height);
        }
    }
    const ExportAspectGroup majorityAspectGroup = SelectMajorityAspectGroup(aspectGroups);
    SetNumberProperty(env, result, "firstFrameIndex", firstFrame.frameIndex);
    SetNumberProperty(env, result, "lastFrameIndex", lastFrame.frameIndex);
    SetStringProperty(env, result, "firstFrameName", firstFrame.frameName);
    SetStringProperty(env, result, "lastFrameName", lastFrame.frameName);
    SetPathProperty(env, result, "firstFramePath", firstFrame.framePath);
    SetPathProperty(env, result, "lastFramePath", lastFrame.framePath);
    SetStringProperty(env, result, "filenamePrefix", firstFrame.filenamePrefix);
    SetNumberProperty(env, result, "indexDigits", firstFrame.indexDigits);
    SetStringProperty(env, result, "frameExtension", firstFrame.frameExtension);
    SetStringProperty(env, result, "frameStorageFormat", storageSpec.storageFormat);
    SetBoolProperty(env, result, "aspectRatioConsistent", aspectGroups.size() <= 1);
    SetStringProperty(env, result, "aspectRatioGroupsJson", BuildExportAspectGroupsJson(aspectGroups));
    SetStringProperty(env, result, "majorityAspectRatioKey", majorityAspectGroup.key);
    SetNumberProperty(env, result, "majorityAspectRatioFrameCount", majorityAspectGroup.frameCount);
    return result;
}

#ifdef _WIN32
std::string FormatHResult(HRESULT hr) {
    std::ostringstream text;
    text << "0x" << std::hex << std::setw(8) << std::setfill('0') << static_cast<uint32_t>(hr);
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
        ThrowIfFailed(hr, "Unable to initialize COM for WIC encoding");
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
#elif !defined(__APPLE__)
ImageDimensions ReadEncodedImageDimensions(const fs::path& imagePath) {
    (void)imagePath;
    throw std::runtime_error("Image dimension probing is not implemented on this platform");
}
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
#endif

uint8_t FlattenChannelOnWhite(uint8_t channel, uint8_t alpha) {
    return static_cast<uint8_t>((static_cast<uint32_t>(channel) * alpha + 255u * (255u - alpha) + 127u) / 255u);
}

std::vector<uint8_t> FlattenRgbaToBgrOnWhite(const void* frameData, size_t byteLength, const FrameWriteRequest& request) {
    if (request.pixelFormat != "RGBA" || request.components != 4 || request.componentSize != 8) {
        throw std::runtime_error("JPEG frame storage currently requires 8-bit RGBA source pixels");
    }

    const uint64_t pixelCount = static_cast<uint64_t>(request.width) * request.height;
    if (pixelCount > std::numeric_limits<size_t>::max() / 3) {
        throw std::runtime_error("Frame is too large to encode as JPEG");
    }
    if (byteLength != pixelCount * 4) {
        throw std::runtime_error("RGBA buffer size does not match JPEG encoder input dimensions");
    }

    const uint8_t* rgba = static_cast<const uint8_t*>(frameData);
    std::vector<uint8_t> bgr(static_cast<size_t>(pixelCount) * 3);
    for (uint64_t pixel = 0; pixel < pixelCount; ++pixel) {
        const size_t source = static_cast<size_t>(pixel * 4);
        const size_t target = static_cast<size_t>(pixel * 3);
        const uint8_t alpha = rgba[source + 3];
        bgr[target] = FlattenChannelOnWhite(rgba[source + 2], alpha);
        bgr[target + 1] = FlattenChannelOnWhite(rgba[source + 1], alpha);
        bgr[target + 2] = FlattenChannelOnWhite(rgba[source], alpha);
    }
    return bgr;
}

std::vector<uint8_t> FlattenRgbaOnWhite(const void* frameData, size_t byteLength, const FrameWriteRequest& request) {
    if (request.pixelFormat != "RGBA" || request.components != 4 || request.componentSize != 8) {
        throw std::runtime_error("JPEG frame storage currently requires 8-bit RGBA source pixels");
    }

    const uint64_t pixelCount = static_cast<uint64_t>(request.width) * request.height;
    if (pixelCount > std::numeric_limits<size_t>::max() / 4) {
        throw std::runtime_error("Frame is too large to encode as JPEG");
    }
    if (byteLength != pixelCount * 4) {
        throw std::runtime_error("RGBA buffer size does not match JPEG encoder input dimensions");
    }

    const uint8_t* rgba = static_cast<const uint8_t*>(frameData);
    std::vector<uint8_t> flattened(static_cast<size_t>(pixelCount) * 4);
    for (uint64_t pixel = 0; pixel < pixelCount; ++pixel) {
        const size_t offset = static_cast<size_t>(pixel * 4);
        const uint8_t alpha = rgba[offset + 3];
        flattened[offset] = FlattenChannelOnWhite(rgba[offset], alpha);
        flattened[offset + 1] = FlattenChannelOnWhite(rgba[offset + 1], alpha);
        flattened[offset + 2] = FlattenChannelOnWhite(rgba[offset + 2], alpha);
        flattened[offset + 3] = 255;
    }
    return flattened;
}

uint64_t WriteJpegFrameAtomically(
    const fs::path& tempPath,
    const fs::path& finalPath,
    const void* frameData,
    size_t byteLength,
    const FrameWriteRequest& request) {
    if (fs::exists(tempPath)) {
        throw std::runtime_error("Temp frame path already exists");
    }
    if (fs::exists(finalPath)) {
        throw std::runtime_error("Final frame path already exists");
    }

#ifdef _WIN32
    try {
        std::vector<uint8_t> bgr = FlattenRgbaToBgrOnWhite(frameData, byteLength, request);
        if (request.width > std::numeric_limits<UINT>::max() ||
            request.height > std::numeric_limits<UINT>::max() ||
            static_cast<uint64_t>(request.width) * 3 > std::numeric_limits<UINT>::max() ||
            bgr.size() > std::numeric_limits<UINT>::max()) {
            throw std::runtime_error("Frame is too large for WIC JPEG encoder");
        }

        ComInitializer com;
        using Microsoft::WRL::ComPtr;
        ComPtr<IWICImagingFactory> factory;
        ThrowIfFailed(
            CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory)),
            "Unable to create WIC imaging factory");

        ComPtr<IWICStream> stream;
        ThrowIfFailed(factory->CreateStream(&stream), "Unable to create WIC stream");
        ThrowIfFailed(stream->InitializeFromFilename(tempPath.wstring().c_str(), GENERIC_WRITE), "Unable to open temp JPEG");

        ComPtr<IWICBitmapEncoder> encoder;
        ThrowIfFailed(factory->CreateEncoder(GUID_ContainerFormatJpeg, nullptr, &encoder), "Unable to create JPEG encoder");
        ThrowIfFailed(encoder->Initialize(stream.Get(), WICBitmapEncoderNoCache), "Unable to initialize JPEG encoder");

        ComPtr<IWICBitmapFrameEncode> frameEncode;
        ComPtr<IPropertyBag2> encoderOptions;
        ThrowIfFailed(encoder->CreateNewFrame(&frameEncode, &encoderOptions), "Unable to create JPEG frame");
        if (encoderOptions) {
            PROPBAG2 option = {};
            option.pstrName = const_cast<LPOLESTR>(L"ImageQuality");
            VARIANT value = {};
            value.vt = VT_R4;
            value.fltVal = static_cast<float>(request.jpegQuality) / 100.0f;
            ThrowIfFailed(encoderOptions->Write(1, &option, &value), "Unable to set JPEG quality");
        }

        ThrowIfFailed(frameEncode->Initialize(encoderOptions.Get()), "Unable to initialize JPEG frame");
        ThrowIfFailed(frameEncode->SetSize(request.width, request.height), "Unable to set JPEG frame size");
        WICPixelFormatGUID pixelFormat = GUID_WICPixelFormat24bppBGR;
        ThrowIfFailed(frameEncode->SetPixelFormat(&pixelFormat), "Unable to set JPEG pixel format");
        if (!IsEqualGUID(pixelFormat, GUID_WICPixelFormat24bppBGR)) {
            throw std::runtime_error("WIC JPEG encoder did not accept 24bpp BGR pixels");
        }

        const UINT stride = request.width * 3;
        ThrowIfFailed(
            frameEncode->WritePixels(request.height, stride, static_cast<UINT>(bgr.size()), bgr.data()),
            "Unable to write JPEG pixels");
        ThrowIfFailed(frameEncode->Commit(), "Unable to commit JPEG frame");
        ThrowIfFailed(encoder->Commit(), "Unable to commit JPEG encoder");

        encoderOptions.Reset();
        frameEncode.Reset();
        encoder.Reset();
        stream.Reset();
        factory.Reset();

        fs::rename(tempPath, finalPath);
        return fs::file_size(finalPath);
    } catch (...) {
        if (fs::exists(tempPath)) {
            fs::remove(tempPath);
        }
        throw;
    }
#elif defined(__APPLE__)
    try {
        std::vector<uint8_t> rgba = FlattenRgbaOnWhite(frameData, byteLength, request);
        if (request.width == 0 || request.height == 0) {
            throw std::runtime_error("JPEG frame dimensions are empty");
        }

        CfPtr<CGColorSpaceRef> colorSpace(CGColorSpaceCreateDeviceRGB());
        ThrowIfFalse(static_cast<bool>(colorSpace), "Unable to create JPEG color space");
        CfPtr<CGDataProviderRef> provider(CGDataProviderCreateWithData(nullptr, rgba.data(), rgba.size(), nullptr));
        ThrowIfFalse(static_cast<bool>(provider), "Unable to create JPEG data provider");

        const size_t bytesPerRow = static_cast<size_t>(request.width) * 4;
        CfPtr<CGImageRef> image(CGImageCreate(
            request.width,
            request.height,
            8,
            32,
            bytesPerRow,
            colorSpace.get(),
            kCGImageAlphaNoneSkipLast | kCGBitmapByteOrder32Big,
            provider.get(),
            nullptr,
            false,
            kCGRenderingIntentDefault));
        ThrowIfFalse(static_cast<bool>(image), "Unable to create JPEG image");

        CfPtr<CFURLRef> url(CreateFileUrl(tempPath));
        ThrowIfFalse(static_cast<bool>(url), "Unable to create temp JPEG URL");
        CfPtr<CGImageDestinationRef> destination(CGImageDestinationCreateWithURL(url.get(), CFSTR("public.jpeg"), 1, nullptr));
        ThrowIfFalse(static_cast<bool>(destination), "Unable to create JPEG destination");

        const double quality = static_cast<double>(request.jpegQuality) / 100.0;
        CfPtr<CFNumberRef> qualityValue(CFNumberCreate(nullptr, kCFNumberDoubleType, &quality));
        ThrowIfFalse(static_cast<bool>(qualityValue), "Unable to create JPEG quality value");
        CfPtr<CFMutableDictionaryRef> properties(CFDictionaryCreateMutable(
            nullptr,
            1,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks));
        ThrowIfFalse(static_cast<bool>(properties), "Unable to create JPEG properties");
        CFDictionarySetValue(properties.get(), kCGImageDestinationLossyCompressionQuality, qualityValue.get());

        CGImageDestinationAddImage(destination.get(), image.get(), properties.get());
        ThrowIfFalse(CGImageDestinationFinalize(destination.get()), "Unable to write JPEG image");

        fs::rename(tempPath, finalPath);
        return fs::file_size(finalPath);
    } catch (...) {
        if (fs::exists(tempPath)) {
            fs::remove(tempPath);
        }
        throw;
    }
#else
    (void)tempPath;
    (void)finalPath;
    (void)frameData;
    (void)byteLength;
    (void)request;
    throw std::runtime_error("JPEG encoding is not implemented on this platform");
#endif
}

std::vector<uint8_t> ConvertRgbaToBgra(const void* frameData, size_t byteLength, const FrameWriteRequest& request) {
    if (request.pixelFormat != "RGBA" || request.components != 4 || request.componentSize != 8) {
        throw std::runtime_error("PNG frame storage currently requires 8-bit RGBA source pixels");
    }

    const uint64_t pixelCount = static_cast<uint64_t>(request.width) * request.height;
    if (pixelCount > std::numeric_limits<size_t>::max() / 4) {
        throw std::runtime_error("Frame is too large to encode as PNG");
    }
    if (byteLength != pixelCount * 4) {
        throw std::runtime_error("RGBA buffer size does not match PNG encoder input dimensions");
    }

    const uint8_t* rgba = static_cast<const uint8_t*>(frameData);
    std::vector<uint8_t> bgra(static_cast<size_t>(pixelCount) * 4);
    for (uint64_t pixel = 0; pixel < pixelCount; ++pixel) {
        const size_t offset = static_cast<size_t>(pixel * 4);
        bgra[offset] = rgba[offset + 2];
        bgra[offset + 1] = rgba[offset + 1];
        bgra[offset + 2] = rgba[offset];
        bgra[offset + 3] = rgba[offset + 3];
    }
    return bgra;
}

uint64_t WritePngFrameAtomically(
    const fs::path& tempPath,
    const fs::path& finalPath,
    const void* frameData,
    size_t byteLength,
    const FrameWriteRequest& request) {
    if (fs::exists(tempPath)) {
        throw std::runtime_error("Temp frame path already exists");
    }
    if (fs::exists(finalPath)) {
        throw std::runtime_error("Final frame path already exists");
    }

#ifdef _WIN32
    try {
        std::vector<uint8_t> bgra = ConvertRgbaToBgra(frameData, byteLength, request);
        if (request.width > std::numeric_limits<UINT>::max() ||
            request.height > std::numeric_limits<UINT>::max() ||
            static_cast<uint64_t>(request.width) * 4 > std::numeric_limits<UINT>::max() ||
            bgra.size() > std::numeric_limits<UINT>::max()) {
            throw std::runtime_error("Frame is too large for WIC PNG encoder");
        }

        ComInitializer com;
        using Microsoft::WRL::ComPtr;
        ComPtr<IWICImagingFactory> factory;
        ThrowIfFailed(
            CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory)),
            "Unable to create WIC imaging factory");

        ComPtr<IWICStream> stream;
        ThrowIfFailed(factory->CreateStream(&stream), "Unable to create WIC stream");
        ThrowIfFailed(stream->InitializeFromFilename(tempPath.wstring().c_str(), GENERIC_WRITE), "Unable to open temp PNG");

        ComPtr<IWICBitmapEncoder> encoder;
        ThrowIfFailed(factory->CreateEncoder(GUID_ContainerFormatPng, nullptr, &encoder), "Unable to create PNG encoder");
        ThrowIfFailed(encoder->Initialize(stream.Get(), WICBitmapEncoderNoCache), "Unable to initialize PNG encoder");

        ComPtr<IWICBitmapFrameEncode> frameEncode;
        ComPtr<IPropertyBag2> encoderOptions;
        ThrowIfFailed(encoder->CreateNewFrame(&frameEncode, &encoderOptions), "Unable to create PNG frame");
        ThrowIfFailed(frameEncode->Initialize(encoderOptions.Get()), "Unable to initialize PNG frame");
        ThrowIfFailed(frameEncode->SetSize(request.width, request.height), "Unable to set PNG frame size");
        WICPixelFormatGUID pixelFormat = GUID_WICPixelFormat32bppBGRA;
        ThrowIfFailed(frameEncode->SetPixelFormat(&pixelFormat), "Unable to set PNG pixel format");
        if (!IsEqualGUID(pixelFormat, GUID_WICPixelFormat32bppBGRA)) {
            throw std::runtime_error("WIC PNG encoder did not accept 32bpp BGRA pixels");
        }

        const UINT stride = request.width * 4;
        ThrowIfFailed(
            frameEncode->WritePixels(request.height, stride, static_cast<UINT>(bgra.size()), bgra.data()),
            "Unable to write PNG pixels");
        ThrowIfFailed(frameEncode->Commit(), "Unable to commit PNG frame");
        ThrowIfFailed(encoder->Commit(), "Unable to commit PNG encoder");

        encoderOptions.Reset();
        frameEncode.Reset();
        encoder.Reset();
        stream.Reset();
        factory.Reset();

        fs::rename(tempPath, finalPath);
        return fs::file_size(finalPath);
    } catch (...) {
        if (fs::exists(tempPath)) {
            fs::remove(tempPath);
        }
        throw;
    }
#elif defined(__APPLE__)
    try {
        if (request.pixelFormat != "RGBA" || request.components != 4 || request.componentSize != 8) {
            throw std::runtime_error("PNG frame storage currently requires 8-bit RGBA source pixels");
        }
        const uint64_t pixelCount = static_cast<uint64_t>(request.width) * request.height;
        if (pixelCount > std::numeric_limits<size_t>::max() / 4) {
            throw std::runtime_error("Frame is too large to encode as PNG");
        }
        if (byteLength != pixelCount * 4) {
            throw std::runtime_error("RGBA buffer size does not match PNG encoder input dimensions");
        }

        CfPtr<CGColorSpaceRef> colorSpace(CGColorSpaceCreateDeviceRGB());
        ThrowIfFalse(static_cast<bool>(colorSpace), "Unable to create PNG color space");
        CfPtr<CGDataProviderRef> provider(CGDataProviderCreateWithData(nullptr, frameData, byteLength, nullptr));
        ThrowIfFalse(static_cast<bool>(provider), "Unable to create PNG data provider");

        const size_t bytesPerRow = static_cast<size_t>(request.width) * 4;
        CfPtr<CGImageRef> image(CGImageCreate(
            request.width,
            request.height,
            8,
            32,
            bytesPerRow,
            colorSpace.get(),
            kCGImageAlphaLast | kCGBitmapByteOrder32Big,
            provider.get(),
            nullptr,
            false,
            kCGRenderingIntentDefault));
        ThrowIfFalse(static_cast<bool>(image), "Unable to create PNG image");

        CfPtr<CFURLRef> url(CreateFileUrl(tempPath));
        ThrowIfFalse(static_cast<bool>(url), "Unable to create temp PNG URL");
        CfPtr<CGImageDestinationRef> destination(CGImageDestinationCreateWithURL(url.get(), CFSTR("public.png"), 1, nullptr));
        ThrowIfFalse(static_cast<bool>(destination), "Unable to create PNG destination");

        CGImageDestinationAddImage(destination.get(), image.get(), nullptr);
        ThrowIfFalse(CGImageDestinationFinalize(destination.get()), "Unable to write PNG image");

        fs::rename(tempPath, finalPath);
        return fs::file_size(finalPath);
    } catch (...) {
        if (fs::exists(tempPath)) {
            fs::remove(tempPath);
        }
        throw;
    }
#else
    (void)tempPath;
    (void)finalPath;
    (void)frameData;
    (void)byteLength;
    (void)request;
    throw std::runtime_error("PNG encoding is not implemented on this platform");
#endif
}

void WriteBytesAtomically(const fs::path& tempPath, const fs::path& finalPath, const void* data, size_t byteLength) {
    if (fs::exists(tempPath)) {
        throw std::runtime_error("Temp frame path already exists");
    }
    if (fs::exists(finalPath)) {
        throw std::runtime_error("Final frame path already exists");
    }

    {
        std::ofstream stream(tempPath, std::ios::binary);
        if (!stream) {
            throw std::runtime_error("Unable to open temp frame for write");
        }
        stream.write(static_cast<const char*>(data), static_cast<std::streamsize>(byteLength));
        if (!stream) {
            throw std::runtime_error("Unable to write full frame buffer");
        }
    }

    fs::rename(tempPath, finalPath);
}

void WriteTextAtomically(const fs::path& tempPath, const fs::path& finalPath, const std::string& text) {
    if (fs::exists(tempPath)) {
        throw std::runtime_error("Temp metadata path already exists");
    }
    if (fs::exists(finalPath)) {
        throw std::runtime_error("Final metadata path already exists");
    }

    {
        std::ofstream stream(tempPath, std::ios::binary);
        if (!stream) {
            throw std::runtime_error("Unable to open temp metadata for write");
        }
        stream.write(text.data(), static_cast<std::streamsize>(text.size()));
        if (!stream) {
            throw std::runtime_error("Unable to write metadata");
        }
    }

    fs::rename(tempPath, finalPath);
}

void ReplaceTextAtomically(const fs::path& tempPath, const fs::path& finalPath, const std::string& text) {
    if (fs::exists(tempPath)) {
        throw std::runtime_error("Temp manifest path already exists");
    }

    {
        std::ofstream stream(tempPath, std::ios::binary);
        if (!stream) {
            throw std::runtime_error("Unable to open temp manifest for write");
        }
        stream.write(text.data(), static_cast<std::streamsize>(text.size()));
        if (!stream) {
            throw std::runtime_error("Unable to write manifest");
        }
    }

#ifdef _WIN32
    if (!MoveFileExW(tempPath.wstring().c_str(), finalPath.wstring().c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) {
        throw std::runtime_error("Unable to publish manifest");
    }
#else
    if (fs::exists(finalPath)) {
        fs::remove(finalPath);
    }
    fs::rename(tempPath, finalPath);
#endif
}

void SetExportProgressProperties(addon_env env, addon_value result, const FfmpegExportProgress& progress) {
    SetStringProperty(env, result, "progressSchema", "ok-record.export-progress.v1");
    SetBoolProperty(env, result, "progressParsed", progress.parsed);
    SetStringProperty(env, result, "progressStatus", progress.status);
    SetNumberProperty(env, result, "progressFrame", progress.frame);
    SetNumberProperty(env, result, "progressFps", progress.fps);
    SetNumberProperty(env, result, "progressOutTimeSeconds", progress.outTimeSeconds);
    SetNumberProperty(env, result, "progressTargetDurationSeconds", progress.targetDurationSeconds);
    SetNumberProperty(env, result, "progressPercent", progress.percent);
    SetNumberProperty(env, result, "progressTotalSizeBytes", static_cast<double>(progress.totalSizeBytes));
    SetStringProperty(env, result, "progressBitrate", progress.bitrate);
    SetStringProperty(env, result, "progressSpeed", progress.speed);
}

addon_value CreateNativeExportResultValue(
    addon_env env,
    const std::string& sessionId,
    const ExportFrameSet& frameSet,
    const NativeFfmpegExportRequest& request,
    const NativeFfmpegExportResult& exportResult) {
    addon_value result = nullptr;
    Check(UxpAddonApis.uxp_addon_create_object(env, &result));
    SetStringProperty(env, result, "schema", "ok-record.export-result.v1");
    SetStringProperty(env, result, "sessionId", sessionId);
    SetStringProperty(env, result, "sourceType", frameSet.sourceType);
    SetPathProperty(env, result, "sourcePath", frameSet.sourcePath);
    SetPathProperty(env, result, "ffmpegPath", exportResult.ffmpegPath);
    SetPathProperty(env, result, "outputPath", exportResult.outputPath);
    SetPathProperty(env, result, "logPath", exportResult.logPath);
    SetPathProperty(env, result, "progressPath", exportResult.progressPath);
    SetNumberProperty(env, result, "frameCount", static_cast<double>(frameSet.frames.size()));
    SetNumberProperty(env, result, "holdSeconds", request.holdSeconds);
    SetNumberProperty(env, result, "targetDurationSeconds", exportResult.targetDurationSeconds);
    SetNumberProperty(env, result, "outputFps", request.outputFps);
    SetNumberProperty(env, result, "sourceWidth", frameSet.metadata.width);
    SetNumberProperty(env, result, "sourceHeight", frameSet.metadata.height);
    SetNumberProperty(env, result, "outputWidth", frameSet.outputWidth);
    SetNumberProperty(env, result, "outputHeight", frameSet.outputHeight);
    SetStringProperty(env, result, "inputPixelFormat", frameSet.metadata.pixelFormat);
    SetStringProperty(env, result, "inputFrameStorageFormat", frameSet.storageSpec.storageFormat);
    SetStringProperty(env, result, "inputFrameExtension", frameSet.storageSpec.frameExtension);
    SetStringProperty(env, result, "filter", exportResult.filter);
    SetExportProgressProperties(env, result, exportResult.progress);
    return result;
}

addon_value Ping(addon_env env, addon_callback_info info) {
    try {
        (void)info;

        constexpr char kMessage[] = "ok-record-native:ready";
        addon_value result = nullptr;
        Check(UxpAddonApis.uxp_addon_create_string_utf8(env, kMessage, std::strlen(kMessage), &result));
        return result;
    } catch (...) {
        return CreateErrorFromException(env);
    }
}

addon_value WriteFrame(addon_env env, addon_callback_info info) {
    try {
        addon_value args[2] = {nullptr, nullptr};
        size_t argc = 2;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 2) {
            throw std::runtime_error("write_frame(metadata, arrayBuffer) expects 2 arguments");
        }

        FrameWriteRequest request = ReadFrameWriteRequest(env, args[0]);

        bool isArrayBuffer = false;
        Check(UxpAddonApis.uxp_addon_is_arraybuffer(env, args[1], &isArrayBuffer));
        if (!isArrayBuffer) {
            throw std::runtime_error("write_frame second argument must be an ArrayBuffer");
        }

        void* frameData = nullptr;
        size_t actualByteLength = 0;
        Check(UxpAddonApis.uxp_addon_get_arraybuffer_info(env, args[1], &frameData, &actualByteLength));
        if (frameData == nullptr || actualByteLength == 0) {
            throw std::runtime_error("ArrayBuffer is empty");
        }
        if (static_cast<uint64_t>(actualByteLength) != request.byteLength) {
            throw std::runtime_error("ArrayBuffer byteLength does not match metadata.byteLength");
        }

        const fs::path recordingsRoot = GetRecordingsRootPath(request.outputDir);
        const fs::path sessionRoot = recordingsRoot;
        const fs::path tempDir = sessionRoot / "temp";
        const fs::path framesDir = sessionRoot / "frames";
        const fs::path exportsDir = sessionRoot / "exports";
        const fs::path logsDir = sessionRoot / "logs";
        fs::create_directories(tempDir);
        fs::create_directories(framesDir);
        fs::create_directories(exportsDir);
        fs::create_directories(logsDir);

        const std::vector<CommittedFrameRecord> existingFrames = CollectCommittedFrames(framesDir);
        const FrameStorageSpec storageSpec = SelectFrameStorageSpec(existingFrames, request);
        if (!existingFrames.empty()) {
            const FrameMetadata firstMetadata = ReadFrameMetadata(existingFrames.front().metadataJson);
            if (firstMetadata.components != request.components ||
                firstMetadata.componentSize != request.componentSize ||
                firstMetadata.pixelFormat != request.pixelFormat ||
                firstMetadata.frameStorageFormat != request.frameStorageFormat ||
                firstMetadata.frameExtension != request.frameExtension ||
                firstMetadata.frameQualityPreset != request.frameQualityPreset ||
                firstMetadata.jpegQuality != request.jpegQuality) {
                throw std::runtime_error(
                    "write_frame metadata is incompatible with existing timeline. expected " +
                    FormatFrameFormat(firstMetadata) + ", got " + FormatFrameFormat(request));
            }
        }

        const uint32_t frameIndex = FindNextFrameIndex(framesDir);
        const std::string frameName = FormatFrameName(frameIndex);
        const fs::path finalFramePath = framesDir / (frameName + storageSpec.frameExtension);
        const fs::path tempFramePath = tempDir / (frameName + storageSpec.frameExtension + ".tmp");
        const fs::path finalMetadataPath = framesDir / (frameName + kMetadataExtension);
        const fs::path tempMetadataPath = tempDir / (frameName + std::string(kMetadataExtension) + ".tmp");
        const fs::path finalManifestPath = sessionRoot / "manifest.json";
        const fs::path tempManifestPath = tempDir / "manifest.json.tmp";
        RemoveOrphanFrameFilesForIndex(framesDir, frameIndex);

        uint64_t encodedByteLength = 0;
        if (IsRawFrameStorage(storageSpec)) {
            WriteBytesAtomically(tempFramePath, finalFramePath, frameData, actualByteLength);
            encodedByteLength = static_cast<uint64_t>(actualByteLength);
        } else if (IsJpegFrameStorage(storageSpec)) {
            encodedByteLength = WriteJpegFrameAtomically(tempFramePath, finalFramePath, frameData, actualByteLength, request);
        } else if (IsPngFrameStorage(storageSpec)) {
            encodedByteLength = WritePngFrameAtomically(tempFramePath, finalFramePath, frameData, actualByteLength, request);
        } else {
            throw std::runtime_error("Unsupported frame storage format: " + storageSpec.storageFormat);
        }

        const std::string metadataJson =
            BuildFrameMetadataJson(request, frameIndex, frameName, finalFramePath, finalMetadataPath, storageSpec, actualByteLength, encodedByteLength);
        WriteTextAtomically(tempMetadataPath, finalMetadataPath, metadataJson);
        const std::vector<CommittedFrameRecord> frames = CollectCommittedFrames(framesDir);
        const std::string manifestJson = BuildManifestJsonFromCommittedFrames(
            request.sessionId,
            sessionRoot,
            framesDir,
            finalManifestPath,
            frames);
        ReplaceTextAtomically(tempManifestPath, finalManifestPath, manifestJson);
        const RecordingSessionScanSummary scan = ScanRecordingSessions(recordingsRoot);
        const RecordingSessionScanResult* timelineScan = scan.sessions.empty() ? nullptr : &scan.sessions.front();

        addon_value result = nullptr;
        Check(UxpAddonApis.uxp_addon_create_object(env, &result));
        SetStringProperty(env, result, "sessionId", request.sessionId);
        SetPathProperty(env, result, "sessionPath", sessionRoot);
        SetPathProperty(env, result, "framesPath", framesDir);
        SetPathProperty(env, result, "manifestPath", finalManifestPath);
        SetNumberProperty(env, result, "frameCount", static_cast<double>(frames.size()));
        SetStringProperty(env, result, "lastCaptureAt", request.capturedAt);
        SetNumberProperty(env, result, "frameIndex", frameIndex);
        SetStringProperty(env, result, "frameName", frameName);
        SetPathProperty(env, result, "framePath", finalFramePath);
        SetPathProperty(env, result, "metadataPath", finalMetadataPath);
        SetPathProperty(env, result, "rootPath", recordingsRoot);
        SetStringProperty(env, result, "frameStorageFormat", storageSpec.storageFormat);
        SetStringProperty(env, result, "frameExtension", storageSpec.frameExtension);
        SetStringProperty(env, result, "frameQualityPreset", request.frameQualityPreset);
        SetNumberProperty(env, result, "jpegQuality", request.jpegQuality);
        SetNumberProperty(env, result, "byteLength", static_cast<double>(actualByteLength));
        SetNumberProperty(env, result, "sourceByteLength", static_cast<double>(actualByteLength));
        SetNumberProperty(env, result, "encodedByteLength", static_cast<double>(encodedByteLength));
        SetNumberProperty(env, result, "width", request.width);
        SetNumberProperty(env, result, "height", request.height);
        if (timelineScan != nullptr) {
            SetBoolProperty(env, result, "exportFrameMetadataConsistent", timelineScan->exportFrameMetadataConsistent);
            SetBoolProperty(env, result, "aspectRatioConsistent", timelineScan->aspectRatioConsistent);
            SetStringProperty(env, result, "aspectRatioGroupsJson", timelineScan->aspectRatioGroupsJson);
            SetStringProperty(env, result, "majorityAspectRatioKey", timelineScan->majorityAspectRatioKey);
            SetNumberProperty(env, result, "majorityAspectRatioFrameCount", timelineScan->majorityAspectRatioFrameCount);
            SetStringProperty(env, result, "inconsistentFrameName", timelineScan->inconsistentFrameName);
            SetPathProperty(env, result, "inconsistentMetadataPath", timelineScan->inconsistentMetadataPath);
        }
        return result;
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native write_frame error");
    }
}

addon_value WriteStepFrame(addon_env env, addon_callback_info info) {
    try {
        addon_value args[2] = {nullptr, nullptr};
        size_t argc = 2;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 2) {
            throw std::runtime_error("write_step_frame(metadata, arrayBuffer) expects 2 arguments");
        }

        FrameWriteRequest request = ReadStepFrameWriteRequest(env, args[0]);

        bool isArrayBuffer = false;
        Check(UxpAddonApis.uxp_addon_is_arraybuffer(env, args[1], &isArrayBuffer));
        if (!isArrayBuffer) {
            throw std::runtime_error("write_step_frame second argument must be an ArrayBuffer");
        }

        void* frameData = nullptr;
        size_t actualByteLength = 0;
        Check(UxpAddonApis.uxp_addon_get_arraybuffer_info(env, args[1], &frameData, &actualByteLength));
        if (frameData == nullptr || actualByteLength == 0) {
            throw std::runtime_error("ArrayBuffer is empty");
        }
        if (static_cast<uint64_t>(actualByteLength) != request.byteLength) {
            throw std::runtime_error("ArrayBuffer byteLength does not match step metadata.byteLength");
        }

        const fs::path outputDir = PathFromUtf8(request.outputDir);
        fs::create_directories(outputDir);
        const uint32_t frameIndex = FindNextStepFrameIndex(outputDir);
        const std::string frameName = FormatStepFrameName(frameIndex);
        const fs::path finalFramePath = outputDir / (frameName + kPngFrameExtension);
        const fs::path tempFramePath = outputDir / (frameName + std::string(kPngFrameExtension) + ".tmp");

        const uint64_t encodedByteLength = WritePngFrameAtomically(tempFramePath, finalFramePath, frameData, actualByteLength, request);
        const std::vector<SequenceFrameRecord> frames = CollectStepFrames(outputDir);

        addon_value result = nullptr;
        Check(UxpAddonApis.uxp_addon_create_object(env, &result));
        SetStringProperty(env, result, "schema", "ok-record.step-result.v1");
        SetPathProperty(env, result, "rootPath", outputDir);
        SetNumberProperty(env, result, "frameCount", static_cast<double>(frames.size()));
        SetStringProperty(env, result, "capturedAt", request.capturedAt);
        SetNumberProperty(env, result, "frameIndex", frameIndex);
        SetStringProperty(env, result, "frameName", frameName);
        SetPathProperty(env, result, "framePath", finalFramePath);
        SetStringProperty(env, result, "frameStorageFormat", kFrameStoragePng);
        SetStringProperty(env, result, "frameExtension", kPngFrameExtension);
        SetNumberProperty(env, result, "byteLength", static_cast<double>(actualByteLength));
        SetNumberProperty(env, result, "sourceByteLength", static_cast<double>(actualByteLength));
        SetNumberProperty(env, result, "encodedByteLength", static_cast<double>(encodedByteLength));
        SetNumberProperty(env, result, "width", request.width);
        SetNumberProperty(env, result, "height", request.height);
        return result;
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native write_step_frame error");
    }
}

addon_value ScanSequence(addon_env env, addon_callback_info info) {
    try {
        addon_value args[1] = {nullptr};
        size_t argc = 1;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 1) {
            throw std::runtime_error("scan_sequence({ framesDir }) expects 1 argument");
        }

        const std::string framesDir = ReadScanSequenceFramesDir(env, args[0]);
        const fs::path framesPath = PathFromUtf8(framesDir);
        const std::vector<SequenceFrameRecord> frames = CollectExportableSequenceFrames(framesPath);
        return CreateSequenceScanValue(env, framesPath, frames);
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native scan_sequence error");
    }
}

addon_value ScanRecordings(addon_env env, addon_callback_info info) {
    try {
        addon_value args[1] = {nullptr};
        size_t argc = 1;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 1) {
            throw std::runtime_error("scan_recordings({ outputDir }) expects 1 argument");
        }

        const std::string outputDir = ReadScanRecordingsOutputDir(env, args[0]);
        const fs::path recordingsRoot = GetRecordingsRootPath(outputDir);
        const RecordingSessionScanSummary scan = ScanRecordingSessions(recordingsRoot);
        return CreateRecordingsScanValue(env, recordingsRoot, scan);
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native scan_recordings error");
    }
}

addon_value ClearRecording(addon_env env, addon_callback_info info) {
    try {
        addon_value args[1] = {nullptr};
        size_t argc = 1;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 1) {
            throw std::runtime_error("clear_recording({ outputDir }) expects 1 argument");
        }

        const std::string outputDir = ReadScanRecordingsOutputDir(env, args[0]);
        const fs::path recordingsRoot = GetRecordingsRootPath(outputDir);
        const fs::path framesDir = recordingsRoot / "frames";
        const fs::path tempDir = recordingsRoot / "temp";
        const fs::path exportsDir = recordingsRoot / "exports";
        const fs::path logsDir = recordingsRoot / "logs";
        const fs::path manifestPath = recordingsRoot / "manifest.json";

        fs::remove_all(framesDir);
        fs::remove_all(tempDir);
        if (fs::exists(manifestPath)) {
            fs::remove(manifestPath);
        }
        fs::create_directories(framesDir);
        fs::create_directories(tempDir);
        fs::create_directories(exportsDir);
        fs::create_directories(logsDir);

        addon_value result = nullptr;
        Check(UxpAddonApis.uxp_addon_create_object(env, &result));
        SetStringProperty(env, result, "schema", "ok-record.clear-recording-result.v1");
        SetPathProperty(env, result, "rootPath", recordingsRoot);
        SetPathProperty(env, result, "framesPath", framesDir);
        SetPathProperty(env, result, "manifestPath", manifestPath);
        SetNumberProperty(env, result, "frameCount", 0);
        return result;
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native clear_recording error");
    }
}

addon_value ExportSession(addon_env env, addon_callback_info info) {
    try {
        addon_value args[1] = {nullptr};
        size_t argc = 1;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 1) {
            throw std::runtime_error("export_session({ outputDir, sessionId, aspectRatioMode, holdSeconds, outputFps, maxWidth, crf }) expects 1 argument");
        }

        const ExportRequest request = ReadExportRequest(env, args[0]);
        const ExportFrameSet frameSet = BuildExportFrameSet(request);
        NativeFfmpegExportRequest exportRequest;
        exportRequest.holdSeconds = request.holdSeconds;
        exportRequest.outputFps = request.outputFps;
        exportRequest.crf = request.crf;
        exportRequest.exportIdSuffix = FormatFrameName(frameSet.frames.back().frameIndex);
        const NativeFfmpegExportResult exportResult = RunNativeFfmpegExport(frameSet, exportRequest);
        return CreateNativeExportResultValue(env, request.sessionId, frameSet, exportRequest, exportResult);
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native export_session error");
    }
}

addon_value ExportSequence(addon_env env, addon_callback_info info) {
    try {
        addon_value args[1] = {nullptr};
        size_t argc = 1;
        Check(UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr));
        if (argc != 1) {
            throw std::runtime_error("export_sequence({ framesDir, holdSeconds, outputFps, maxWidth, crf }) expects 1 argument");
        }

        const SequenceExportRequest request = ReadSequenceExportRequest(env, args[0]);
        const ExportFrameSet frameSet = BuildSequenceExportFrameSet(request);
        NativeFfmpegExportRequest exportRequest;
        exportRequest.holdSeconds = request.holdSeconds;
        exportRequest.outputFps = request.outputFps;
        exportRequest.crf = request.crf;
        exportRequest.exportIdSuffix = frameSet.frames.back().frameName;
        const NativeFfmpegExportResult exportResult = RunNativeFfmpegExport(frameSet, exportRequest);
        return CreateNativeExportResultValue(env, "", frameSet, exportRequest, exportResult);
    } catch (const std::exception& exception) {
        return ThrowAddonError(env, exception.what());
    } catch (...) {
        return ThrowAddonError(env, "Unknown native export_sequence error");
    }
}

void ExportFunction(addon_env env, addon_value exports, const addon_apis& addonAPIs, const char* name, addon_callback callback) {
    addon_value function = nullptr;
    addon_status status = addonAPIs.uxp_addon_create_function(env, nullptr, 0, callback, nullptr, &function);
    if (status != addon_ok) {
        addonAPIs.uxp_addon_throw_error(env, nullptr, "Unable to wrap native function");
        return;
    }

    status = addonAPIs.uxp_addon_set_named_property(env, exports, name, function);
    if (status != addon_ok) {
        addonAPIs.uxp_addon_throw_error(env, nullptr, "Unable to export native function");
    }
}

addon_value Init(addon_env env, addon_value exports, const addon_apis& addonAPIs) {
    ExportFunction(env, exports, addonAPIs, "ping", Ping);
    ExportFunction(env, exports, addonAPIs, "write_frame", WriteFrame);
    ExportFunction(env, exports, addonAPIs, "write_step_frame", WriteStepFrame);
    ExportFunction(env, exports, addonAPIs, "scan_recordings", ScanRecordings);
    ExportFunction(env, exports, addonAPIs, "scan_sequence", ScanSequence);
    ExportFunction(env, exports, addonAPIs, "clear_recording", ClearRecording);
    ExportFunction(env, exports, addonAPIs, "export_session", ExportSession);
    ExportFunction(env, exports, addonAPIs, "export_sequence", ExportSequence);
    return exports;
}

void Terminate(addon_env env) {
    (void)env;
}

}  // namespace

UXP_ADDON_INIT(Init)
UXP_ADDON_TERMINATE(Terminate)
