#pragma once

#include <cstdint>
#include <filesystem>
#include <string>

namespace ok_record {

namespace fs = std::filesystem;

struct FfmpegExportProgress {
    bool parsed = false;
    std::string status = "unknown";
    uint32_t frame = 0;
    double fps = 0.0;
    double outTimeSeconds = 0.0;
    double targetDurationSeconds = 0.0;
    double percent = 0.0;
    uint64_t totalSizeBytes = 0;
    std::string bitrate;
    std::string speed;
};

FfmpegExportProgress ParseFfmpegProgressText(
    const std::string& text,
    double targetDurationSeconds,
    uint32_t expectedFrameCount);

FfmpegExportProgress ParseFfmpegProgressFile(
    const fs::path& path,
    double targetDurationSeconds,
    uint32_t expectedFrameCount);

}  // namespace ok_record
