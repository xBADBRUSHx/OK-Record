#include "export_progress.h"

#include "storage_recovery.h"

#include <algorithm>
#include <cerrno>
#include <cmath>
#include <cstdlib>
#include <fstream>
#include <limits>
#include <sstream>
#include <stdexcept>

namespace ok_record {

namespace {

std::string Trim(std::string value) {
    const auto isSpace = [](unsigned char ch) {
        return ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n';
    };
    const auto begin = std::find_if_not(value.begin(), value.end(), isSpace);
    const auto end = std::find_if_not(value.rbegin(), value.rend(), isSpace).base();
    if (begin >= end) {
        return {};
    }
    return std::string(begin, end);
}

bool ParseDouble(const std::string& text, double& value) {
    const std::string trimmed = Trim(text);
    if (trimmed.empty()) {
        return false;
    }

    char* end = nullptr;
    errno = 0;
    const double parsed = std::strtod(trimmed.c_str(), &end);
    if (end == trimmed.c_str() || errno == ERANGE || !std::isfinite(parsed)) {
        return false;
    }

    value = parsed;
    return true;
}

bool ParseUInt32(const std::string& text, uint32_t& value) {
    const std::string trimmed = Trim(text);
    if (trimmed.empty()) {
        return false;
    }

    char* end = nullptr;
    errno = 0;
    const unsigned long parsed = std::strtoul(trimmed.c_str(), &end, 10);
    if (end == trimmed.c_str() || errno == ERANGE || parsed > std::numeric_limits<uint32_t>::max()) {
        return false;
    }

    value = static_cast<uint32_t>(parsed);
    return true;
}

bool ParseUInt64(const std::string& text, uint64_t& value) {
    const std::string trimmed = Trim(text);
    if (trimmed.empty()) {
        return false;
    }

    char* end = nullptr;
    errno = 0;
    const unsigned long long parsed = std::strtoull(trimmed.c_str(), &end, 10);
    if (end == trimmed.c_str() || errno == ERANGE) {
        return false;
    }

    value = static_cast<uint64_t>(parsed);
    return true;
}

bool ParseClockSeconds(const std::string& text, double& seconds) {
    const std::string trimmed = Trim(text);
    const size_t firstColon = trimmed.find(':');
    const size_t secondColon = firstColon == std::string::npos ? std::string::npos : trimmed.find(':', firstColon + 1);
    if (firstColon == std::string::npos || secondColon == std::string::npos) {
        return false;
    }

    uint32_t hours = 0;
    uint32_t minutes = 0;
    double secondPart = 0.0;
    if (!ParseUInt32(trimmed.substr(0, firstColon), hours) ||
        !ParseUInt32(trimmed.substr(firstColon + 1, secondColon - firstColon - 1), minutes) ||
        !ParseDouble(trimmed.substr(secondColon + 1), secondPart)) {
        return false;
    }
    if (minutes >= 60 || secondPart < 0.0 || secondPart >= 61.0) {
        return false;
    }

    seconds = static_cast<double>(hours) * 3600.0 + static_cast<double>(minutes) * 60.0 + secondPart;
    return true;
}

std::string ReadTextFile(const fs::path& path) {
    std::ifstream stream(path, std::ios::binary);
    if (!stream) {
        throw std::runtime_error("Unable to open FFmpeg progress file: " + PathToUtf8(path));
    }

    std::ostringstream text;
    text << stream.rdbuf();
    if (!stream.good() && !stream.eof()) {
        throw std::runtime_error("Unable to read FFmpeg progress file: " + PathToUtf8(path));
    }
    return text.str();
}

double ClampPercent(double value) {
    if (!std::isfinite(value)) {
        return 0.0;
    }
    return std::min(100.0, std::max(0.0, value));
}

}  // namespace

FfmpegExportProgress ParseFfmpegProgressText(
    const std::string& text,
    double targetDurationSeconds,
    uint32_t expectedFrameCount) {
    FfmpegExportProgress progress;
    progress.targetDurationSeconds = std::max(0.0, targetDurationSeconds);

    std::istringstream lines(text);
    std::string line;
    while (std::getline(lines, line)) {
        const size_t separator = line.find('=');
        if (separator == std::string::npos) {
            continue;
        }

        const std::string key = Trim(line.substr(0, separator));
        const std::string value = Trim(line.substr(separator + 1));
        if (key.empty()) {
            continue;
        }

        if (key == "frame") {
            uint32_t frame = 0;
            if (ParseUInt32(value, frame)) {
                progress.frame = frame;
                progress.parsed = true;
            }
        } else if (key == "fps") {
            double fps = 0.0;
            if (ParseDouble(value, fps)) {
                progress.fps = fps;
                progress.parsed = true;
            }
        } else if (key == "out_time") {
            double outTimeSeconds = 0.0;
            if (ParseClockSeconds(value, outTimeSeconds)) {
                progress.outTimeSeconds = outTimeSeconds;
                progress.parsed = true;
            }
        } else if (key == "total_size") {
            uint64_t totalSizeBytes = 0;
            if (ParseUInt64(value, totalSizeBytes)) {
                progress.totalSizeBytes = totalSizeBytes;
                progress.parsed = true;
            }
        } else if (key == "bitrate") {
            progress.bitrate = value;
            progress.parsed = true;
        } else if (key == "speed") {
            progress.speed = value;
            progress.parsed = true;
        } else if (key == "progress") {
            progress.status = value.empty() ? "unknown" : value;
            progress.parsed = true;
        }
    }

    if (progress.status == "end") {
        progress.percent = 100.0;
    } else if (progress.targetDurationSeconds > 0.0 && progress.outTimeSeconds > 0.0) {
        progress.percent = ClampPercent((progress.outTimeSeconds / progress.targetDurationSeconds) * 100.0);
    } else if (expectedFrameCount > 0 && progress.frame > 0) {
        progress.percent = ClampPercent((static_cast<double>(progress.frame) / static_cast<double>(expectedFrameCount)) * 100.0);
    }

    return progress;
}

FfmpegExportProgress ParseFfmpegProgressFile(
    const fs::path& path,
    double targetDurationSeconds,
    uint32_t expectedFrameCount) {
    return ParseFfmpegProgressText(ReadTextFile(path), targetDurationSeconds, expectedFrameCount);
}

}  // namespace ok_record
