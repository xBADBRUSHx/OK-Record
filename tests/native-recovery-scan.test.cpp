#include "storage_recovery.h"

#include <cassert>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>

namespace fs = std::filesystem;

namespace {

void WriteText(const fs::path& path, const std::string& text) {
    fs::create_directories(path.parent_path());
    std::ofstream stream(path, std::ios::binary);
    if (!stream) {
        throw std::runtime_error("Unable to open test text path");
    }
    stream.write(text.data(), static_cast<std::streamsize>(text.size()));
}

std::string ReadText(const fs::path& path) {
    std::ifstream stream(path, std::ios::binary);
    if (!stream) {
        throw std::runtime_error("Unable to open test text path for read");
    }

    std::ostringstream text;
    text << stream.rdbuf();
    return text.str();
}

void WriteBytes(const fs::path& path, size_t byteLength) {
    fs::create_directories(path.parent_path());
    std::ofstream stream(path, std::ios::binary);
    if (!stream) {
        throw std::runtime_error("Unable to open test binary path");
    }
    for (size_t offset = 0; offset < byteLength; ++offset) {
        const char value = static_cast<char>(offset % 251);
        stream.write(&value, 1);
    }
}

struct MetadataOptions {
    uint64_t byteLength = 32;
    uint64_t encodedByteLength = std::numeric_limits<uint64_t>::max();
    std::string sessionId;
    std::string capturedAt = "2026-05-22T00:00:00.000Z";
    uint32_t components = 4;
    uint32_t componentSize = 8;
    std::string pixelFormat = "RGBA";
};

std::string MetadataJson(uint32_t frameIndex, const std::string& extension = ".jpg", MetadataOptions options = {}) {
    const std::string storageFormat = extension == ".rgba" ? "raw-rgba" : (extension == ".png" ? "png" : "jpeg");
    const uint64_t encodedByteLength = options.encodedByteLength == std::numeric_limits<uint64_t>::max()
        ? (extension == ".rgba" ? options.byteLength : 12)
        : options.encodedByteLength;
    const std::string frameQualityPreset = extension == ".png" ? "lossless" : (extension == ".rgba" ? "" : "default");
    const uint32_t jpegQuality = extension == ".jpg" ? 80 : 0;

    std::ostringstream json;
    json << "{\n";
    json << "  \"schema\": \"ok-record.frame.v1\",\n";
    if (!options.sessionId.empty()) {
        json << "  \"sessionId\": \"" << options.sessionId << "\",\n";
    }
    json << "  \"frameIndex\": " << frameIndex << ",\n";
    json << "  \"capturedAt\": \"" << options.capturedAt << "\",\n";
    json << "  \"frameStorageFormat\": \"" << storageFormat << "\",\n";
    json << "  \"frameExtension\": \"" << extension << "\",\n";
    json << "  \"frameQualityPreset\": \"" << frameQualityPreset << "\",\n";
    json << "  \"jpegQuality\": " << jpegQuality << ",\n";
    json << "  \"width\": 4,\n";
    json << "  \"height\": 2,\n";
    json << "  \"components\": " << options.components << ",\n";
    json << "  \"componentSize\": " << options.componentSize << ",\n";
    json << "  \"pixelFormat\": \"" << options.pixelFormat << "\",\n";
    json << "  \"colorSpace\": \"RGB\",\n";
    json << "  \"colorProfile\": \"sRGB\",\n";
    json << "  \"byteLength\": " << options.byteLength << ",\n";
    json << "  \"sourceByteLength\": " << options.byteLength << ",\n";
    json << "  \"encodedByteLength\": " << encodedByteLength << "\n";
    json << "}\n";
    return json.str();
}

void WriteCommittedFrame(
    const fs::path& framesDir,
    uint32_t frameIndex,
    const std::string& extension = ".jpg",
    size_t fileByteLength = std::numeric_limits<size_t>::max(),
    MetadataOptions metadataOptions = {}) {
    const std::string frameName = ok_record::FormatFrameName(frameIndex);
    const size_t byteLength = fileByteLength == std::numeric_limits<size_t>::max()
        ? (extension == ".rgba" ? 32 : 12)
        : fileByteLength;
    if (metadataOptions.sessionId.empty()) {
        metadataOptions.sessionId = ok_record::kRecordingTimelineId;
    }
    WriteBytes(framesDir / (frameName + extension), byteLength);
    WriteText(framesDir / (frameName + ".json"), MetadataJson(frameIndex, extension, metadataOptions));
}

void ExpectThrowsContaining(void (*callback)(const fs::path&), const fs::path& path, const std::string& needle) {
    try {
        callback(path);
    } catch (const std::exception& exception) {
        const std::string message = exception.what();
        if (message.find(needle) == std::string::npos) {
            throw std::runtime_error("Expected exception containing '" + needle + "', got: " + message);
        }
        return;
    }

    throw std::runtime_error("Expected exception containing '" + needle + "'");
}

void CollectFramesCallback(const fs::path& framesDir) {
    (void)ok_record::CollectCommittedFrames(framesDir);
}

const ok_record::RecordingSessionScanResult& FindSession(
    const std::vector<ok_record::RecordingSessionScanResult>& sessions,
    const std::string& sessionId) {
    for (const ok_record::RecordingSessionScanResult& session : sessions) {
        if (session.sessionId == sessionId) {
            return session;
        }
    }
    throw std::runtime_error("Expected session was not found: " + sessionId);
}

fs::path MakeTempRoot() {
    const auto stamp = std::chrono::high_resolution_clock::now().time_since_epoch().count();
    return fs::temp_directory_path() / ("ok-record-native-recovery-scan-test-" + std::to_string(stamp));
}

}  // namespace

int main() {
    const fs::path root = MakeTempRoot();
    try {
        const fs::path recordingsRoot = root / u8"延时录制_Recordings";
        const fs::path sessionRoot = recordingsRoot;
        const fs::path framesDir = sessionRoot / "frames";
        const fs::path tempDir = sessionRoot / "temp";

        WriteCommittedFrame(framesDir, 1);
        WriteCommittedFrame(framesDir, 2);
        WriteText(sessionRoot / "manifest.json", "{ \"schema\": \"ok-record.manifest.v1\", \"frameCount\": 999 }\n");
        WriteBytes(tempDir / "frame_000003.jpg.tmp", 7);
        WriteText(tempDir / "frame_000003.json.tmp", "{ \"partial\": true }\n");
        WriteBytes(framesDir / "frame_000003.jpg", 12);
        WriteBytes(framesDir / "frame_000003.jpg.tmp", 7);
        WriteText(framesDir / "frame_000009.json", "{ \"sidecarOnly\": true }\n");
        WriteText(framesDir / "notes.txt", "ignored\n");
        const std::vector<ok_record::CommittedFrameRecord> frames = ok_record::CollectCommittedFrames(framesDir);
        assert(frames.size() == 2);
        assert(frames[0].frameIndex == 1);
        assert(frames[1].frameIndex == 2);
        assert(ok_record::FindNextFrameIndex(framesDir) == 3);
        const std::vector<fs::path> orphanFramePaths = ok_record::CollectOrphanFramePaths(framesDir);
        assert(orphanFramePaths.size() == 1);
        assert(orphanFramePaths.front().filename().string() == "frame_000003.jpg");
        ok_record::RemoveOrphanFrameFilesForIndex(framesDir, 3);
        assert(!fs::exists(framesDir / "frame_000003.jpg"));

        const ok_record::RecordingSessionScanSummary scan = ok_record::ScanRecordingSessions(recordingsRoot);
        const std::vector<ok_record::RecordingSessionScanResult>& sessions = scan.sessions;
        assert(sessions.size() == 1);
        const ok_record::RecordingSessionScanResult& recoveredSession = FindSession(sessions, ok_record::kRecordingTimelineId);
        assert(recoveredSession.frameCount == 2);
        assert(recoveredSession.lastFrameIndex == 2);
        assert(recoveredSession.lastFrameName == "frame_000002");
        assert(recoveredSession.exportFrameMetadataConsistent);
        assert(recoveredSession.aspectRatioConsistent);
        assert(recoveredSession.majorityAspectRatioKey == "2:1");
        assert(recoveredSession.majorityAspectRatioFrameCount == 2);
        assert(recoveredSession.contiguousFrames);
        assert(recoveredSession.exportable);
        assert(recoveredSession.firstMissingFrameIndex == 0);
        assert(recoveredSession.orphanFrameCount == 0);
        assert(fs::exists(sessionRoot / "manifest.json"));
        const std::string rebuiltManifest = ReadText(sessionRoot / "manifest.json");
        assert(rebuiltManifest.find("\"frameCount\": 2") != std::string::npos);
        assert(rebuiltManifest.find("\"lastFrameIndex\": 2") != std::string::npos);
        assert(rebuiltManifest.find("\"lastFrameName\": \"frame_000002\"") != std::string::npos);
        assert(rebuiltManifest.find("\"metadataSidecarsAreAuthority\": true") != std::string::npos);
        assert(rebuiltManifest.find("\"frameFilesAreAuthority\"") == std::string::npos);
        assert(rebuiltManifest.find("\"frameCount\": 999") == std::string::npos);

        const fs::path orphanTimelineRoot = root / "orphan-recordings";
        const fs::path orphanTimelineFramesDir = orphanTimelineRoot / "frames";
        WriteCommittedFrame(orphanTimelineFramesDir, 1);
        WriteBytes(orphanTimelineFramesDir / "frame_000002.jpg", 12);
        const ok_record::RecordingSessionScanSummary orphanScan = ok_record::ScanRecordingSessions(orphanTimelineRoot);
        const ok_record::RecordingSessionScanResult& orphanTimeline = orphanScan.sessions.front();
        assert(orphanTimeline.frameCount == 1);
        assert(orphanTimeline.orphanFrameCount == 1);
        assert(orphanTimeline.firstOrphanFramePath.filename().string() == "frame_000002.jpg");
        assert(orphanTimeline.contiguousFrames);
        assert(orphanTimeline.exportable);

        const fs::path gappedTimelineRoot = root / "gapped-recordings";
        const fs::path gappedTimelineFramesDir = gappedTimelineRoot / "frames";
        WriteCommittedFrame(gappedTimelineFramesDir, 1);
        WriteCommittedFrame(gappedTimelineFramesDir, 3);
        const ok_record::RecordingSessionScanSummary gappedScan = ok_record::ScanRecordingSessions(gappedTimelineRoot);
        const ok_record::RecordingSessionScanResult& gappedTimeline = gappedScan.sessions.front();
        assert(gappedTimeline.frameCount == 2);
        assert(gappedTimeline.lastFrameIndex == 3);
        assert(!gappedTimeline.contiguousFrames);
        assert(!gappedTimeline.exportable);
        assert(gappedTimeline.firstMissingFrameIndex == 2);
        assert(gappedTimeline.exportBlockReason.find("not contiguous") != std::string::npos);

        const fs::path invalidTimelineRoot = root / "invalid-recordings";
        WriteCommittedFrame(invalidTimelineRoot / "frames", 1, ".jpg", 10);
        const ok_record::RecordingSessionScanSummary invalidScan = ok_record::ScanRecordingSessions(invalidTimelineRoot);
        assert(invalidScan.invalidSessions.size() == 1);
        bool sawEncodedSizeMismatch = false;
        for (const ok_record::InvalidRecordingSessionScanResult& invalidSession : invalidScan.invalidSessions) {
            if (invalidSession.error.find("Encoded frame file size does not match metadata") != std::string::npos) {
                sawEncodedSizeMismatch = true;
            }
        }
        assert(sawEncodedSizeMismatch);

        const ok_record::FrameMetadata metadata = ok_record::ReadFrameMetadata(frames.front().metadataJson);
        assert(metadata.frameIndex == 1);
        assert(metadata.width == 4);
        assert(metadata.height == 2);
        assert(metadata.byteLength == 32);
        assert(metadata.encodedByteLength == 12);
        assert(metadata.frameStorageFormat == "jpeg");
        assert(metadata.frameExtension == ".jpg");
        assert(metadata.frameQualityPreset == "default");
        assert(metadata.jpegQuality == 80);
        assert(ok_record::ExpectedFrameByteLength(metadata) == 32);

        const fs::path pngFramesDir = root / "png-session" / "frames";
        WriteCommittedFrame(pngFramesDir, 1, ".png");
        const std::vector<ok_record::CommittedFrameRecord> pngFrames = ok_record::CollectCommittedFrames(pngFramesDir);
        assert(pngFrames.size() == 1);
        const ok_record::FrameMetadata pngMetadata = ok_record::ReadFrameMetadata(pngFrames.front().metadataJson);
        assert(pngMetadata.frameStorageFormat == "png");
        assert(pngMetadata.frameExtension == ".png");
        assert(pngMetadata.frameQualityPreset == "lossless");
        assert(pngMetadata.jpegQuality == 0);

        const fs::path mixedRgbRgbaTimelineRoot = root / "mixed-rgb-rgba-recordings";
        const fs::path mixedRgbRgbaFramesDir = mixedRgbRgbaTimelineRoot / "frames";
        WriteCommittedFrame(mixedRgbRgbaFramesDir, 1, ".png");
        MetadataOptions rgbMetadataOptions;
        rgbMetadataOptions.byteLength = 24;
        rgbMetadataOptions.components = 3;
        rgbMetadataOptions.pixelFormat = "RGB";
        WriteCommittedFrame(mixedRgbRgbaFramesDir, 2, ".png", std::numeric_limits<size_t>::max(), rgbMetadataOptions);
        const ok_record::RecordingSessionScanSummary mixedRgbRgbaScan = ok_record::ScanRecordingSessions(mixedRgbRgbaTimelineRoot);
        const ok_record::RecordingSessionScanResult& mixedRgbRgbaTimeline = mixedRgbRgbaScan.sessions.front();
        assert(mixedRgbRgbaTimeline.frameCount == 2);
        assert(mixedRgbRgbaTimeline.exportFrameMetadataConsistent);
        assert(mixedRgbRgbaTimeline.exportable);

        const fs::path missingSidecarFramesDir = root / "missing-sidecar" / "frames";
        WriteBytes(missingSidecarFramesDir / "frame_000001.jpg", 12);
        assert(ok_record::CollectCommittedFrames(missingSidecarFramesDir).empty());
        assert(ok_record::FindNextFrameIndex(missingSidecarFramesDir) == 1);
        assert(ok_record::CollectOrphanFramePaths(missingSidecarFramesDir).size() == 1);

        const fs::path invalidSidecarFramesDir = root / "invalid-sidecar" / "frames";
        WriteBytes(invalidSidecarFramesDir / "frame_000001.jpg", 12);
        WriteText(invalidSidecarFramesDir / "frame_000001.json", "not json");
        ExpectThrowsContaining(CollectFramesCallback, invalidSidecarFramesDir, "not a JSON object");

        const fs::path metadataIndexMismatchFramesDir = root / "metadata-index-mismatch" / "frames";
        WriteBytes(metadataIndexMismatchFramesDir / "frame_000001.jpg", 12);
        WriteText(metadataIndexMismatchFramesDir / "frame_000001.json", MetadataJson(2));
        ExpectThrowsContaining(CollectFramesCallback, metadataIndexMismatchFramesDir, "metadata index does not match filename");

        const fs::path sourceByteLengthMismatchFramesDir = root / "source-byte-length-mismatch" / "frames";
        WriteCommittedFrame(sourceByteLengthMismatchFramesDir, 1, ".jpg", std::numeric_limits<size_t>::max(), {16});
        ExpectThrowsContaining(CollectFramesCallback, sourceByteLengthMismatchFramesDir, "source byteLength does not match dimensions");

        const fs::path encodedSizeMismatchFramesDir = root / "encoded-size-mismatch" / "frames";
        WriteCommittedFrame(encodedSizeMismatchFramesDir, 1, ".jpg", 10);
        ExpectThrowsContaining(CollectFramesCallback, encodedSizeMismatchFramesDir, "Encoded frame file size does not match metadata");

        fs::remove_all(root);
        std::cout << "native recovery scan tests passed\n";
        return 0;
    } catch (...) {
        fs::remove_all(root);
        throw;
    }
}
