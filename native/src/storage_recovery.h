#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace ok_record {

namespace fs = std::filesystem;

inline constexpr const char* kFrameStorageRawRgba = "raw-rgba";
inline constexpr const char* kFrameStorageJpeg = "jpeg";
inline constexpr const char* kFrameStoragePng = "png";
inline constexpr const char* kRawFrameExtension = ".rgba";
inline constexpr const char* kJpegFrameExtension = ".jpg";
inline constexpr const char* kPngFrameExtension = ".png";
inline constexpr const char* kMetadataExtension = ".json";
inline constexpr const char* kFrameQualityLow = "low";
inline constexpr const char* kFrameQualityDefault = "default";
inline constexpr const char* kFrameQualityHigh = "high";
inline constexpr const char* kFrameQualityLossless = "lossless";
inline constexpr const char* kRecordingTimelineId = "Timeline";

struct CommittedFrameRecord {
    uint32_t frameIndex = 0;
    std::string frameName;
    fs::path framePath;
    fs::path metadataPath;
    std::string metadataJson;
};

struct RecordingSessionScanResult {
    std::string sessionId;
    fs::path sessionRoot;
    fs::path framesDir;
    fs::path manifestPath;
    uint32_t frameCount = 0;
    uint32_t lastFrameIndex = 0;
    std::string lastFrameName;
    fs::path lastFramePath;
    fs::path lastMetadataPath;
    std::string firstFrameMetadataJson;
    std::string lastFrameMetadataJson;
    bool exportFrameMetadataConsistent = true;
    bool aspectRatioConsistent = true;
    std::string aspectRatioGroupsJson;
    std::string majorityAspectRatioKey;
    uint32_t majorityAspectRatioFrameCount = 0;
    std::string inconsistentFrameName;
    fs::path inconsistentMetadataPath;
    bool contiguousFrames = true;
    bool exportable = true;
    uint32_t firstMissingFrameIndex = 0;
    uint32_t orphanFrameCount = 0;
    fs::path firstOrphanFramePath;
    std::string exportBlockReason;
};

struct InvalidRecordingSessionScanResult {
    std::string sessionId;
    fs::path sessionRoot;
    fs::path framesDir;
    std::string error;
};

struct RecordingSessionScanSummary {
    std::vector<RecordingSessionScanResult> sessions;
    std::vector<InvalidRecordingSessionScanResult> invalidSessions;
};

struct FrameMetadata {
    uint32_t frameIndex = 0;
    uint32_t width = 0;
    uint32_t height = 0;
    uint32_t components = 0;
    uint32_t componentSize = 0;
    uint64_t byteLength = 0;
    uint64_t encodedByteLength = 0;
    std::string pixelFormat;
    std::string sessionId;
    std::string capturedAt;
    std::string colorSpace;
    std::string colorProfile;
    std::string frameStorageFormat;
    std::string frameExtension;
    std::string frameQualityPreset;
    uint32_t jpegQuality = 0;
};

struct FrameStorageSpec {
    std::string storageFormat;
    std::string frameExtension;
};

#ifdef _WIN32
std::wstring Utf8ToWide(const std::string& value);
std::string WideToUtf8(const std::wstring& value);
#endif

fs::path PathFromUtf8(const std::string& value);
std::string PathToUtf8(const fs::path& path);

bool IsSafeIdentifier(const std::string& value);
std::string FormatFrameName(uint32_t frameIndex);
std::string NormalizeExtension(const fs::path& path);
std::string JsonEscape(const std::string& value);
bool IsRawFrameStorage(const FrameStorageSpec& storageSpec);
bool IsJpegFrameStorage(const FrameStorageSpec& storageSpec);
bool IsPngFrameStorage(const FrameStorageSpec& storageSpec);
FrameStorageSpec NormalizeFrameStorageSpec(const FrameStorageSpec& storageSpec);
bool ParseFrameIndex(const fs::path& framePath, uint32_t& frameIndex);
uint32_t FindNextFrameIndex(const fs::path& framesDir);
std::vector<CommittedFrameRecord> CollectCommittedFrames(const fs::path& framesDir);
std::vector<fs::path> CollectOrphanFramePaths(const fs::path& framesDir);
void RemoveOrphanFrameFilesForIndex(const fs::path& framesDir, uint32_t frameIndex);
void ValidateCommittedFrameRecord(const CommittedFrameRecord& frame);
std::string BuildManifestJsonFromCommittedFrames(
    const std::string& sessionId,
    const fs::path& sessionRoot,
    const fs::path& framesDir,
    const fs::path& manifestPath,
    const std::vector<CommittedFrameRecord>& frames);
void RebuildManifestFromCommittedFrames(
    const fs::path& sessionRoot,
    const std::vector<CommittedFrameRecord>& frames);
RecordingSessionScanSummary ScanRecordingSessions(const fs::path& recordingsRoot);
FrameMetadata ReadFrameMetadata(const std::string& metadataJson);
FrameStorageSpec GetFrameStorageSpecFromMetadata(const FrameMetadata& metadata);
uint64_t ExpectedFrameByteLength(const FrameMetadata& metadata);

}  // namespace ok_record
