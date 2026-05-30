#pragma once

#include "export_progress.h"
#include "storage_recovery.h"

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace ok_record {

namespace fs = std::filesystem;

struct ExportFrameSet {
    fs::path sessionRoot;
    fs::path framesDir;
    fs::path tempDir;
    fs::path exportsDir;
    fs::path logsDir;
    std::vector<CommittedFrameRecord> frames;
    FrameMetadata metadata;
    FrameStorageSpec storageSpec;
    uint32_t outputWidth = 0;
    uint32_t outputHeight = 0;
    bool forceScaleToOutput = false;
    bool padToOutput = false;
    bool stageInputSequence = false;
    std::string filenamePrefix = "frame_";
    uint32_t indexDigits = 6;
    std::string sourceType = "timeline";
    fs::path sourcePath;
};

struct NativeFfmpegExportRequest {
    double holdSeconds = 1.0;
    uint32_t outputFps = 30;
    uint32_t crf = 18;
    std::string exportIdSuffix;
};

struct NativeFfmpegExportResult {
    fs::path ffmpegPath;
    fs::path outputPath;
    fs::path logPath;
    fs::path progressPath;
    std::string filter;
    double targetDurationSeconds = 0.0;
    FfmpegExportProgress progress;
};

fs::path ResolveBundledFfmpegPathFromModulePath(const fs::path& modulePath);
fs::path ResolveFfmpegPath();
std::string BuildExportFilter(const ExportFrameSet& frameSet, uint32_t outputFps);
NativeFfmpegExportResult RunNativeFfmpegExport(
    const ExportFrameSet& frameSet,
    const NativeFfmpegExportRequest& request);

}  // namespace ok_record
