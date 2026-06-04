#pragma once

#include "export_runner.h"
#include "storage_recovery.h"

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace ok_record {

namespace fs = std::filesystem;

inline constexpr const char* kStepFrameFilenamePrefix = "step_";
inline constexpr uint32_t kStepFrameIndexDigits = 3;
inline constexpr const char* kRecordingsRootDirName = u8"延时录制_Recordings";

struct TimelineExportFrameSetRequest {
    std::string outputDir;
    std::string aspectRatioMode = "strict";
    uint32_t maxWidth = 1920;
};

struct SequenceExportFrameSetRequest {
    std::string framesDir;
    std::string aspectRatioMode = "strict";
    uint32_t maxWidth = 1920;
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

struct ExportAspectGroup {
    std::string key;
    uint32_t frameCount = 0;
    uint32_t maxWidth = 0;
    uint32_t maxHeight = 0;
};

fs::path GetRecordingsRootPath(const std::string& outputDir);
bool IsSupportedAspectRatioMode(const std::string& mode);
std::string FormatStepFrameName(uint32_t frameIndex);
bool ParseStepFrame(const fs::path& framePath, SequenceFrameRecord& record);
std::vector<SequenceFrameRecord> CollectStepFrames(const fs::path& framesDir);
std::vector<SequenceFrameRecord> CollectExportableSequenceFrames(const fs::path& framesDir);
uint32_t FindNextStepFrameIndex(const fs::path& framesDir);
FrameStorageSpec GetSequenceFrameStorageSpec(const SequenceFrameRecord& frame);
fs::path GetSequenceExportRoot(const fs::path& framesDir);
uint32_t MakeEvenDimension(uint32_t value);
std::string BuildAspectRatioKey(uint32_t width, uint32_t height);
void AddExportAspectGroupFrame(std::vector<ExportAspectGroup>& groups, uint32_t width, uint32_t height);
ExportAspectGroup SelectMajorityAspectGroup(std::vector<ExportAspectGroup> groups);
std::string BuildExportAspectGroupsJson(std::vector<ExportAspectGroup> groups);
ImageDimensions ReadEncodedImageDimensions(const fs::path& imagePath);
ExportFrameSet BuildTimelineExportFrameSet(const TimelineExportFrameSetRequest& request);
ExportFrameSet BuildSequenceExportFrameSet(const SequenceExportFrameSetRequest& request);

}  // namespace ok_record
