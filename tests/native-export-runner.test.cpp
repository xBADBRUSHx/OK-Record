#include "export_frame_set.h"
#include "export_runner.h"

#include <cassert>
#include <chrono>
#include <exception>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

namespace {

std::string UniqueSuffix() {
    return std::to_string(std::chrono::high_resolution_clock::now().time_since_epoch().count());
}

void WriteBytes(const fs::path& path, const std::vector<uint8_t>& bytes) {
    std::ofstream stream(path, std::ios::binary);
    assert(stream);
    stream.write(reinterpret_cast<const char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
    assert(stream);
}

void WriteText(const fs::path& path, const std::string& text) {
    std::ofstream stream(path, std::ios::binary);
    assert(stream);
    stream << text;
    assert(stream);
}

std::string ReadText(const fs::path& path) {
    std::ifstream stream(path, std::ios::binary);
    assert(stream);
    return std::string(std::istreambuf_iterator<char>(stream), std::istreambuf_iterator<char>());
}

template <typename Callback>
void ExpectThrowsContaining(Callback callback, const std::string& needle) {
    try {
        callback();
    } catch (const std::exception& exception) {
        const std::string message = exception.what();
        if (message.find(needle) == std::string::npos) {
            throw std::runtime_error("Expected exception containing '" + needle + "', got: " + message);
        }
        return;
    }

    throw std::runtime_error("Expected exception containing '" + needle + "'");
}

std::vector<uint8_t> MakeTinyPng() {
    return {
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
        0, 0, 0, 2, 0, 0, 0, 2, 8, 6, 0, 0, 0, 114, 182, 13,
        36, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0,
        0, 0, 4, 103, 65, 77, 65, 0, 0, 177, 143, 11, 252, 97, 5,
        0, 0, 0, 9, 112, 72, 89, 115, 0, 0, 14, 195, 0, 0, 14,
        195, 1, 199, 111, 168, 100, 0, 0, 0, 19, 73, 68, 65, 84,
        24, 87, 99, 248, 207, 0, 68, 32, 8, 164, 129, 224, 255, 127,
        0, 73, 200, 9, 247, 139, 53, 44, 127, 0, 0, 0, 0, 73, 69,
        78, 68, 174, 66, 96, 130,
    };
}

std::vector<uint8_t> MakeTinyJpeg() {
    return {
        255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 96,
        0, 96, 0, 0, 255, 219, 0, 67, 0, 8, 6, 6, 7, 6, 5, 8,
        7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11, 11, 12, 25, 18,
        19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39, 32,
        34, 44, 35, 28, 28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39,
        57, 61, 56, 50, 60, 46, 51, 52, 50, 255, 219, 0, 67, 1, 9, 9,
        9, 12, 11, 12, 24, 13, 13, 24, 50, 33, 28, 33, 50, 50, 50, 50,
        50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50,
        50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50,
        50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 255, 192,
        0, 17, 8, 0, 2, 0, 2, 3, 1, 34, 0, 2, 17, 1, 3, 17,
        1, 255, 196, 0, 31, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        10, 11, 255, 196, 0, 181, 16, 0, 2, 1, 3, 3, 2, 4, 3, 5,
        5, 4, 4, 0, 0, 1, 125, 1, 2, 3, 0, 4, 17, 5, 18, 33,
        49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35,
        66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23,
        24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58,
        67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90,
        99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122,
        131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153,
        154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183,
        184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213,
        214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241,
        242, 243, 244, 245, 246, 247, 248, 249, 250, 255, 196, 0, 31, 1, 0, 3,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1,
        2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 255, 196, 0, 181, 17, 0,
        2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119, 0,
        1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19,
        34, 50, 129, 8, 20, 66, 145, 161, 177, 193, 9, 35, 51, 82, 240, 21,
        98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26, 38, 39,
        40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73,
        74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105,
        106, 115, 116, 117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136,
        137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166,
        167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196,
        197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226,
        227, 228, 229, 230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249,
        250, 255, 218, 0, 12, 3, 1, 0, 2, 17, 3, 17, 0, 63, 0, 245,
        143, 7, 233, 122, 124, 222, 9, 208, 101, 150, 198, 213, 228, 125, 58, 221,
        153, 218, 21, 37, 137, 141, 114, 73, 199, 38, 138, 40, 175, 158, 173, 252,
        89, 122, 179, 229, 113, 31, 198, 159, 171, 252, 207, 255, 217,
    };
}

std::string ExportFrameMetadataJson(
    uint32_t frameIndex,
    uint32_t width,
    uint32_t height,
    size_t encodedByteLength,
    const std::string& extension = ".jpg") {
    const uint64_t sourceByteLength = static_cast<uint64_t>(width) * height * 4;
    const std::string storageFormat = extension == ".png" ? ok_record::kFrameStoragePng : ok_record::kFrameStorageJpeg;
    const std::string frameQualityPreset = extension == ".png" ? ok_record::kFrameQualityLossless : ok_record::kFrameQualityDefault;
    const uint32_t jpegQuality = extension == ".png" ? 0 : 80;

    std::ostringstream json;
    json << "{\n";
    json << "  \"schema\": \"ok-record.frame.v1\",\n";
    json << "  \"sessionId\": \"" << ok_record::kRecordingTimelineId << "\",\n";
    json << "  \"frameIndex\": " << frameIndex << ",\n";
    json << "  \"capturedAt\": \"2026-06-04T00:00:00.000Z\",\n";
    json << "  \"frameStorageFormat\": \"" << storageFormat << "\",\n";
    json << "  \"frameExtension\": \"" << extension << "\",\n";
    json << "  \"frameQualityPreset\": \"" << frameQualityPreset << "\",\n";
    json << "  \"jpegQuality\": " << jpegQuality << ",\n";
    json << "  \"width\": " << width << ",\n";
    json << "  \"height\": " << height << ",\n";
    json << "  \"components\": 4,\n";
    json << "  \"componentSize\": 8,\n";
    json << "  \"pixelFormat\": \"RGBA\",\n";
    json << "  \"colorSpace\": \"RGB\",\n";
    json << "  \"colorProfile\": \"sRGB\",\n";
    json << "  \"byteLength\": " << sourceByteLength << ",\n";
    json << "  \"sourceByteLength\": " << sourceByteLength << ",\n";
    json << "  \"encodedByteLength\": " << encodedByteLength << "\n";
    json << "}\n";
    return json.str();
}

void WriteCommittedExportFrame(
    const fs::path& framesDir,
    uint32_t frameIndex,
    uint32_t width,
    uint32_t height,
    const std::vector<uint8_t>& bytes) {
    fs::create_directories(framesDir);
    const std::string frameName = ok_record::FormatFrameName(frameIndex);
    WriteBytes(framesDir / (frameName + ".jpg"), bytes);
    WriteText(framesDir / (frameName + ".json"), ExportFrameMetadataJson(frameIndex, width, height, bytes.size()));
}

void AssertTimelineFrameSetDiscovery(const fs::path& root) {
    using namespace ok_record;

    const fs::path outputDir = root / "timeline-frame-set";
    const fs::path framesDir = GetRecordingsRootPath(PathToUtf8(outputDir)) / "frames";
    const std::vector<uint8_t> encodedBytes = {1, 2, 3, 4, 5, 6};
    WriteCommittedExportFrame(framesDir, 1, 4, 2, encodedBytes);
    WriteCommittedExportFrame(framesDir, 2, 2, 2, encodedBytes);
    WriteCommittedExportFrame(framesDir, 3, 4, 2, encodedBytes);

    TimelineExportFrameSetRequest strictRequest;
    strictRequest.outputDir = PathToUtf8(outputDir);
    strictRequest.aspectRatioMode = "strict";
    strictRequest.maxWidth = 1920;
    ExpectThrowsContaining([&]() {
        (void)BuildTimelineExportFrameSet(strictRequest);
    }, "mixed aspect ratios");

    TimelineExportFrameSetRequest padRequest = strictRequest;
    padRequest.aspectRatioMode = "pad";
    const ExportFrameSet padFrameSet = BuildTimelineExportFrameSet(padRequest);
    assert(padFrameSet.frames.size() == 3);
    assert(padFrameSet.outputWidth == 4);
    assert(padFrameSet.outputHeight == 2);
    assert(padFrameSet.padToOutput);
    assert(padFrameSet.forceScaleToOutput);
    assert(!padFrameSet.stageInputSequence);

    TimelineExportFrameSetRequest majorityRequest = strictRequest;
    majorityRequest.aspectRatioMode = "majority";
    const ExportFrameSet majorityFrameSet = BuildTimelineExportFrameSet(majorityRequest);
    assert(majorityFrameSet.frames.size() == 2);
    assert(majorityFrameSet.frames[0].frameIndex == 1);
    assert(majorityFrameSet.frames[1].frameIndex == 3);
    assert(majorityFrameSet.stageInputSequence);
    assert(!majorityFrameSet.padToOutput);
}

void AssertSequenceFrameSetDiscovery(const fs::path& root) {
    using namespace ok_record;

    const fs::path sequenceDir = root / "sequence-frame-set";
    fs::create_directories(sequenceDir);
    WriteBytes(sequenceDir / "step_001.png", MakeTinyPng());
    WriteBytes(sequenceDir / "step_002.png", MakeTinyPng());
    WriteText(sequenceDir / "notes.txt", "ignored\n");

    SequenceExportFrameSetRequest request;
    request.framesDir = PathToUtf8(sequenceDir);
    request.aspectRatioMode = "strict";
    request.maxWidth = 1920;
    const ExportFrameSet frameSet = BuildSequenceExportFrameSet(request);
    assert(frameSet.frames.size() == 2);
    assert(frameSet.filenamePrefix == "step_");
    assert(frameSet.indexDigits == 3);
    assert(frameSet.storageSpec.storageFormat == kFrameStoragePng);
    assert(frameSet.outputWidth == 2);
    assert(frameSet.outputHeight == 2);
    assert(frameSet.sourceType == "directory");

    const fs::path mixedNamingDir = root / "mixed-sequence-names";
    fs::create_directories(mixedNamingDir);
    WriteBytes(mixedNamingDir / "step_001.png", MakeTinyPng());
    WriteBytes(mixedNamingDir / "frame_000002.png", MakeTinyPng());
    ExpectThrowsContaining([&]() {
        (void)CollectExportableSequenceFrames(mixedNamingDir);
    }, "mixed frame naming");
}

ok_record::NativeFfmpegExportResult RunExportSmoke(
    const fs::path& root,
    const std::string& sessionName,
    const std::string& storageFormat,
    const std::string& frameExtension,
    const std::vector<uint8_t>& firstFrameBytes,
    const std::vector<uint8_t>& secondFrameBytes) {
    using namespace ok_record;

    const fs::path sessionRoot = root / sessionName;
    const fs::path framesDir = sessionRoot / "frames";
    const fs::path tempDir = sessionRoot / "temp";
    const fs::path exportsDir = sessionRoot / "exports";
    const fs::path logsDir = sessionRoot / "logs";
    fs::create_directories(framesDir);
    fs::create_directories(tempDir);
    fs::create_directories(exportsDir);
    fs::create_directories(logsDir);

    const fs::path firstFramePath = framesDir / ("frame_000001" + frameExtension);
    const fs::path secondFramePath = framesDir / ("frame_000002" + frameExtension);
    WriteBytes(firstFramePath, firstFrameBytes);
    WriteBytes(secondFramePath, secondFrameBytes);

    FrameMetadata metadata;
    metadata.width = 2;
    metadata.height = 2;
    metadata.components = 4;
    metadata.componentSize = 8;
    metadata.pixelFormat = storageFormat == kFrameStorageRawRgba ? "RGBA" : "encoded";
    metadata.frameStorageFormat = storageFormat;
    metadata.frameExtension = frameExtension;

    ExportFrameSet frameSet;
    frameSet.sessionRoot = sessionRoot;
    frameSet.framesDir = framesDir;
    frameSet.tempDir = tempDir;
    frameSet.exportsDir = exportsDir;
    frameSet.logsDir = logsDir;
    frameSet.frames = {
        {1, "frame_000001", firstFramePath, {}, {}},
        {2, "frame_000002", secondFramePath, {}, {}},
    };
    frameSet.metadata = metadata;
    frameSet.storageSpec = {storageFormat, frameExtension};
    frameSet.outputWidth = 2;
    frameSet.outputHeight = 2;
    frameSet.filenamePrefix = "frame_";
    frameSet.indexDigits = 6;
    frameSet.sourceType = "test";
    frameSet.sourcePath = framesDir;

    NativeFfmpegExportRequest request;
    request.holdSeconds = 0.5;
    request.outputFps = 2;
    request.crf = 23;
    request.exportIdSuffix = sessionName;

    return RunNativeFfmpegExport(frameSet, request);
}

void AssertExportResult(const ok_record::NativeFfmpegExportResult& result) {
    assert(fs::exists(result.outputPath));
    assert(fs::file_size(result.outputPath) > 0);
    assert(fs::exists(result.logPath));
    assert(fs::exists(result.progressPath));
    assert(result.filter == "fps=2,format=yuv420p");
    assert(result.targetDurationSeconds == 1.0);
    assert(result.progress.parsed);
    assert(result.progress.status == "end");
    assert(result.progress.percent == 100.0);
    assert(result.progress.targetDurationSeconds == 1.0);
    assert(result.progress.frame >= 1);

    const std::string progressText = ReadText(result.progressPath);
    assert(progressText.find("progress=end") != std::string::npos);
}

}  // namespace

int main() {
    using namespace ok_record;

    const fs::path root = fs::temp_directory_path() / ("ok-record-native-export-runner-" + UniqueSuffix());
    fs::remove_all(root);
    fs::create_directories(root);

    try {
        const fs::path packageRoot = root / "package";
        const fs::path modulePath = packageRoot / "win" / "x64" / "ok-record-addon.uxpaddon";
        const fs::path bundledFfmpegPath = packageRoot / "vendor" / "ffmpeg" / "win" / "x64" / "ffmpeg.exe";
        fs::create_directories(modulePath.parent_path());
        fs::create_directories(bundledFfmpegPath.parent_path());
        WriteText(modulePath, "addon");
        WriteText(bundledFfmpegPath, "ffmpeg");
        assert(ResolveBundledFfmpegPathFromModulePath(modulePath) == fs::absolute(bundledFfmpegPath));
        assert(ResolveBundledFfmpegPathFromModulePath(root / "missing" / "win" / "x64" / "ok-record-addon.uxpaddon").empty());

        AssertTimelineFrameSetDiscovery(root);
        AssertSequenceFrameSetDiscovery(root);

        const fs::path ffmpegPath = ResolveFfmpegPath();
        assert(!ffmpegPath.empty());
        assert(fs::exists(ffmpegPath));

        AssertExportResult(RunExportSmoke(
            root,
            "raw-rgba-session",
            kFrameStorageRawRgba,
            kRawFrameExtension,
            {
            255, 0, 0, 255, 0, 255, 0, 255,
            0, 0, 255, 255, 255, 255, 255, 255,
            },
            {
            255, 255, 255, 255, 0, 0, 255, 255,
            0, 255, 0, 255, 255, 0, 0, 255,
            }));
        AssertExportResult(RunExportSmoke(root, "jpeg-session", kFrameStorageJpeg, kJpegFrameExtension, MakeTinyJpeg(), MakeTinyJpeg()));
        AssertExportResult(RunExportSmoke(root, "png-session", kFrameStoragePng, kPngFrameExtension, MakeTinyPng(), MakeTinyPng()));

        fs::remove_all(root);
        std::cout << "native export runner tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "native export runner test failed: " << error.what() << "\n";
        std::cerr << "temporary test root preserved: " << root << "\n";
        return 1;
    } catch (...) {
        std::cerr << "native export runner test failed with an unknown error\n";
        std::cerr << "temporary test root preserved: " << root << "\n";
        return 1;
    }
}
