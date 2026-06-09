#include "export_runner.h"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstring>
#include <ctime>
#include <iomanip>
#include <limits>
#include <sstream>
#include <stdexcept>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#endif

#ifdef __APPLE__
#include <cerrno>
#include <cstdlib>
#include <fcntl.h>
#include <spawn.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

extern char** environ;
#endif

namespace ok_record {

namespace {

#ifdef _WIN32
using ProcessArgument = std::wstring;
#else
using ProcessArgument = std::string;
#endif

std::string FormatUtcTimestampForFilename() {
    const auto now = std::chrono::system_clock::now();
    const std::time_t nowTime = std::chrono::system_clock::to_time_t(now);
    std::tm utcTime = {};
#ifdef _WIN32
    gmtime_s(&utcTime, &nowTime);
#else
    gmtime_r(&utcTime, &nowTime);
#endif

    std::ostringstream timestamp;
    timestamp << std::put_time(&utcTime, "%Y%m%d%H%M%S");
    return timestamp.str();
}

std::string FormatDoubleArgument(double value) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(6) << value;
    std::string result = text.str();
    while (!result.empty() && result.back() == '0') {
        result.pop_back();
    }
    if (!result.empty() && result.back() == '.') {
        result.pop_back();
    }
    return result.empty() ? "0" : result;
}

std::string BuildImageSequencePattern(const std::string& prefix, uint32_t indexDigits, const std::string& extension) {
    std::ostringstream pattern;
    pattern << prefix << "%0" << indexDigits << "d" << extension;
    return pattern.str();
}

uint32_t CalculateMaxExportedFrameCount(double targetDurationSeconds, uint32_t outputFps) {
    if (!std::isfinite(targetDurationSeconds) || targetDurationSeconds <= 0.0) {
        throw std::runtime_error("Export targetDurationSeconds must be greater than zero");
    }
    if (outputFps == 0) {
        throw std::runtime_error("Export outputFps must be greater than zero");
    }

    const double rawFrameCount = std::floor((targetDurationSeconds * static_cast<double>(outputFps)) + 0.0000001);
    if (rawFrameCount < 1.0) {
        return 1;
    }
    if (rawFrameCount > static_cast<double>(std::numeric_limits<uint32_t>::max())) {
        throw std::runtime_error("Export target frame count is too large");
    }
    return static_cast<uint32_t>(rawFrameCount);
}

std::vector<CommittedFrameRecord> SelectRepresentativeFrames(
    const std::vector<CommittedFrameRecord>& frames,
    uint32_t maxFrameCount) {
    if (frames.empty()) {
        return {};
    }
    if (maxFrameCount == 0) {
        throw std::runtime_error("Export representative frame count must be greater than zero");
    }
    if (frames.size() <= maxFrameCount) {
        return frames;
    }
    if (maxFrameCount == 1) {
        return {frames.back()};
    }

    std::vector<CommittedFrameRecord> selectedFrames;
    selectedFrames.reserve(maxFrameCount);
    const double sourceLastIndex = static_cast<double>(frames.size() - 1);
    const double selectedLastIndex = static_cast<double>(maxFrameCount - 1);
    size_t previousSourceIndex = 0;
    for (uint32_t selectedIndex = 0; selectedIndex < maxFrameCount; ++selectedIndex) {
        size_t sourceIndex = static_cast<size_t>(std::llround((static_cast<double>(selectedIndex) * sourceLastIndex) / selectedLastIndex));
        if (!selectedFrames.empty() && sourceIndex <= previousSourceIndex) {
            sourceIndex = previousSourceIndex + 1;
        }
        if (sourceIndex >= frames.size()) {
            sourceIndex = frames.size() - 1;
        }
        selectedFrames.push_back(frames[sourceIndex]);
        previousSourceIndex = sourceIndex;
    }
    selectedFrames.front() = frames.front();
    selectedFrames.back() = frames.back();
    return selectedFrames;
}

#ifdef _WIN32
std::wstring WidenAscii(const std::string& value) {
    return std::wstring(value.begin(), value.end());
}

ProcessArgument MakeProcessArgument(const char* value) {
    return WidenAscii(std::string(value));
}

ProcessArgument MakeProcessArgument(const std::string& value) {
    return WidenAscii(value);
}

ProcessArgument MakeProcessArgument(const fs::path& value) {
    return value.wstring();
}

fs::path GetCurrentModulePath() {
    HMODULE module = nullptr;
    const DWORD flags = GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT;
    if (!GetModuleHandleExW(flags, reinterpret_cast<LPCWSTR>(&GetCurrentModulePath), &module) || module == nullptr) {
        return {};
    }

    std::vector<wchar_t> buffer(MAX_PATH);
    while (true) {
        const DWORD length = GetModuleFileNameW(module, buffer.data(), static_cast<DWORD>(buffer.size()));
        if (length == 0) {
            return {};
        }
        if (length < buffer.size() - 1) {
            return fs::path(std::wstring(buffer.data(), length));
        }
        buffer.resize(buffer.size() * 2);
    }
}

std::wstring QuoteWindowsArgument(const std::wstring& value) {
    std::wstring result = L"\"";
    size_t backslashCount = 0;
    for (wchar_t ch : value) {
        if (ch == L'\\') {
            ++backslashCount;
            continue;
        }
        if (ch == L'"') {
            result.append(backslashCount * 2 + 1, L'\\');
            result.push_back(ch);
            backslashCount = 0;
            continue;
        }

        result.append(backslashCount, L'\\');
        backslashCount = 0;
        result.push_back(ch);
    }
    result.append(backslashCount * 2, L'\\');
    result.push_back(L'"');
    return result;
}

std::wstring JoinWindowsCommandLine(const std::vector<std::wstring>& arguments) {
    std::wstring commandLine;
    for (size_t index = 0; index < arguments.size(); ++index) {
        if (index > 0) {
            commandLine.push_back(L' ');
        }
        commandLine += QuoteWindowsArgument(arguments[index]);
    }
    return commandLine;
}
#else
ProcessArgument MakeProcessArgument(const char* value) {
    return std::string(value);
}

ProcessArgument MakeProcessArgument(const std::string& value) {
    return value;
}

ProcessArgument MakeProcessArgument(const fs::path& value) {
    return PathToUtf8(value);
}
#endif

uint32_t RunProcessToLog(const fs::path& executablePath, const std::vector<ProcessArgument>& arguments, const fs::path& logPath) {
#ifdef _WIN32
    SECURITY_ATTRIBUTES securityAttributes = {};
    securityAttributes.nLength = sizeof(securityAttributes);
    securityAttributes.bInheritHandle = TRUE;

    HANDLE logHandle = CreateFileW(
        logPath.wstring().c_str(),
        GENERIC_WRITE,
        FILE_SHARE_READ,
        &securityAttributes,
        CREATE_NEW,
        FILE_ATTRIBUTE_NORMAL,
        nullptr);
    if (logHandle == INVALID_HANDLE_VALUE) {
        throw std::runtime_error("Unable to create export log: " + PathToUtf8(logPath));
    }

    STARTUPINFOW startupInfo = {};
    startupInfo.cb = sizeof(startupInfo);
    startupInfo.dwFlags = STARTF_USESTDHANDLES;
    startupInfo.hStdOutput = logHandle;
    startupInfo.hStdError = logHandle;
    startupInfo.hStdInput = nullptr;

    PROCESS_INFORMATION processInfo = {};
    std::wstring commandLine = JoinWindowsCommandLine(arguments);
    BOOL started = CreateProcessW(
        executablePath.wstring().c_str(),
        commandLine.data(),
        nullptr,
        nullptr,
        TRUE,
        CREATE_NO_WINDOW,
        nullptr,
        nullptr,
        &startupInfo,
        &processInfo);

    if (!started) {
        CloseHandle(logHandle);
        throw std::runtime_error("Unable to start FFmpeg process");
    }

    CloseHandle(processInfo.hThread);
    WaitForSingleObject(processInfo.hProcess, INFINITE);

    DWORD exitCode = 0;
    if (!GetExitCodeProcess(processInfo.hProcess, &exitCode)) {
        CloseHandle(processInfo.hProcess);
        CloseHandle(logHandle);
        throw std::runtime_error("Unable to read FFmpeg exit code");
    }

    CloseHandle(processInfo.hProcess);
    CloseHandle(logHandle);
    return static_cast<uint32_t>(exitCode);
#elif defined(__APPLE__)
    const std::string logPathUtf8 = PathToUtf8(logPath);
    const int logFile = open(logPathUtf8.c_str(), O_WRONLY | O_CREAT | O_EXCL, S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH);
    if (logFile < 0) {
        throw std::runtime_error("Unable to create export log: " + PathToUtf8(logPath));
    }

    posix_spawn_file_actions_t actions;
    if (posix_spawn_file_actions_init(&actions) != 0) {
        close(logFile);
        throw std::runtime_error("Unable to initialize FFmpeg process actions");
    }
    auto addSpawnAction = [&](int status, const char* message) {
        if (status != 0) {
            posix_spawn_file_actions_destroy(&actions);
            close(logFile);
            throw std::runtime_error(std::string(message) + ": " + std::strerror(status));
        }
    };
    addSpawnAction(posix_spawn_file_actions_adddup2(&actions, logFile, STDOUT_FILENO), "Unable to redirect FFmpeg stdout");
    addSpawnAction(posix_spawn_file_actions_adddup2(&actions, logFile, STDERR_FILENO), "Unable to redirect FFmpeg stderr");
    addSpawnAction(posix_spawn_file_actions_addclose(&actions, logFile), "Unable to close FFmpeg log handle in child");

    std::vector<std::string> argumentStorage = arguments;
    std::vector<char*> argv;
    argv.reserve(argumentStorage.size() + 1);
    for (std::string& argument : argumentStorage) {
        argv.push_back(argument.data());
    }
    argv.push_back(nullptr);

    pid_t processId = 0;
    const std::string executable = PathToUtf8(executablePath);
    const int spawnStatus = posix_spawn(&processId, executable.c_str(), &actions, nullptr, argv.data(), environ);
    posix_spawn_file_actions_destroy(&actions);
    close(logFile);

    if (spawnStatus != 0) {
        throw std::runtime_error(std::string("Unable to start FFmpeg process: ") + std::strerror(spawnStatus));
    }

    int status = 0;
    while (waitpid(processId, &status, 0) < 0) {
        if (errno == EINTR) {
            continue;
        }
        throw std::runtime_error("Unable to wait for FFmpeg process");
    }
    if (WIFEXITED(status)) {
        return static_cast<uint32_t>(WEXITSTATUS(status));
    }
    if (WIFSIGNALED(status)) {
        return static_cast<uint32_t>(128 + WTERMSIG(status));
    }
    throw std::runtime_error("Unable to read FFmpeg exit code");
#else
    (void)executablePath;
    (void)arguments;
    (void)logPath;
    throw std::runtime_error("Process execution is not implemented on this platform");
#endif
}

}  // namespace

fs::path ResolveBundledFfmpegPathFromModulePath(const fs::path& modulePath) {
    if (modulePath.empty()) {
        return {};
    }

    const fs::path packageRoot = modulePath.parent_path().parent_path().parent_path();
    const fs::path candidate = packageRoot / "vendor" / "ffmpeg" / "win" / "x64" / "ffmpeg.exe";
    std::error_code error;
    if (fs::is_regular_file(candidate, error)) {
        return fs::absolute(candidate);
    }
    return {};
}

fs::path ResolveFfmpegPath() {
#ifdef _WIN32
    const fs::path bundledFfmpegPath = ResolveBundledFfmpegPathFromModulePath(GetCurrentModulePath());
    if (!bundledFfmpegPath.empty()) {
        return bundledFfmpegPath;
    }

    std::vector<wchar_t> buffer(32768);
    const DWORD length = SearchPathW(nullptr, L"ffmpeg.exe", nullptr, static_cast<DWORD>(buffer.size()), buffer.data(), nullptr);
    if (length == 0 || length >= buffer.size()) {
        throw std::runtime_error("FFmpeg was not found. Install FFmpeg or use the OK-Record with-ffmpeg package.");
    }
    return fs::path(std::wstring(buffer.data(), length));
#elif defined(__APPLE__)
    const char* pathValue = std::getenv("PATH");
    if (!pathValue || std::strlen(pathValue) == 0) {
        throw std::runtime_error("FFmpeg was not found in PATH");
    }

    std::stringstream pathStream(pathValue);
    std::string directory;
    while (std::getline(pathStream, directory, ':')) {
        if (directory.empty()) {
            continue;
        }
        fs::path candidate = fs::path(directory) / "ffmpeg";
        const std::string candidatePath = PathToUtf8(candidate);
        if (access(candidatePath.c_str(), X_OK) == 0 && fs::is_regular_file(candidate)) {
            return fs::absolute(candidate);
        }
    }
    throw std::runtime_error("FFmpeg was not found in PATH");
#else
    throw std::runtime_error("FFmpeg discovery is not implemented on this platform");
#endif
}

std::string BuildExportFilter(const ExportFrameSet& frameSet, uint32_t outputFps) {
    std::ostringstream filter;
    if (frameSet.padToOutput) {
        filter << "scale=" << frameSet.outputWidth << ":" << frameSet.outputHeight
            << ":force_original_aspect_ratio=decrease,"
            << "pad=" << frameSet.outputWidth << ":" << frameSet.outputHeight << ":(ow-iw)/2:(oh-ih)/2,";
    } else if (frameSet.forceScaleToOutput ||
        frameSet.outputWidth != frameSet.metadata.width ||
        frameSet.outputHeight != frameSet.metadata.height) {
        filter << "scale=" << frameSet.outputWidth << ":" << frameSet.outputHeight << ",";
    }
    filter << "fps=" << outputFps << ",format=yuv420p";
    return filter.str();
}

NativeFfmpegExportResult RunNativeFfmpegExport(
    const ExportFrameSet& frameSet,
    const NativeFfmpegExportRequest& request) {
    if (frameSet.frames.empty()) {
        throw std::runtime_error("Export frame set is empty");
    }
    if (!std::isfinite(request.targetDurationSeconds) || request.targetDurationSeconds <= 0.0) {
        throw std::runtime_error("Export targetDurationSeconds must be greater than zero");
    }

    const fs::path ffmpegPath = ResolveFfmpegPath();
    const std::string exportId =
        "OK-Record_timelapse_" + FormatUtcTimestampForFilename() + "_" + request.exportIdSuffix;
    const fs::path finalOutputPath = frameSet.exportsDir / (exportId + ".mp4");
    const fs::path tempOutputPath = frameSet.tempDir / (exportId + ".mp4.tmp");
    const fs::path logPath = frameSet.logsDir / (exportId + ".log");
    const fs::path progressPath = frameSet.logsDir / (exportId + ".progress");
    const fs::path stagedInputDir = frameSet.tempDir / (exportId + "_frames");
    if (fs::exists(finalOutputPath)) {
        throw std::runtime_error("Export output already exists: " + PathToUtf8(finalOutputPath));
    }
    if (fs::exists(tempOutputPath)) {
        throw std::runtime_error("Export temp output already exists: " + PathToUtf8(tempOutputPath));
    }
    if (fs::exists(stagedInputDir)) {
        throw std::runtime_error("Export staged input already exists: " + PathToUtf8(stagedInputDir));
    }

    const uint32_t sourceFrameCount = static_cast<uint32_t>(frameSet.frames.size());
    const uint32_t maxExportedFrameCount = CalculateMaxExportedFrameCount(request.targetDurationSeconds, request.outputFps);
    const std::vector<CommittedFrameRecord> exportFrames = SelectRepresentativeFrames(frameSet.frames, maxExportedFrameCount);
    if (exportFrames.empty()) {
        throw std::runtime_error("Export representative frame set is empty");
    }
    const uint32_t exportedFrameCount = static_cast<uint32_t>(exportFrames.size());
    const double holdSeconds = request.targetDurationSeconds / static_cast<double>(exportedFrameCount);
    if (!std::isfinite(holdSeconds) || holdSeconds <= 0.0) {
        throw std::runtime_error("Export calculated holdSeconds must be greater than zero");
    }
    const bool samplingApplied = exportedFrameCount < sourceFrameCount;
    const bool stageInputSequence = frameSet.stageInputSequence || samplingApplied;
    const double inputFps = 1.0 / holdSeconds;
    const std::string filter = BuildExportFilter(frameSet, request.outputFps);
    fs::path inputFramesDir = frameSet.framesDir;
    std::string inputFilenamePrefix = frameSet.filenamePrefix;
    uint32_t inputIndexDigits = frameSet.indexDigits;
    uint32_t inputStartNumber = exportFrames.front().frameIndex;

    if (stageInputSequence) {
        fs::create_directories(stagedInputDir);
        uint32_t stagedFrameIndex = 1;
        for (const CommittedFrameRecord& frame : exportFrames) {
            const std::string stagedFrameName = FormatFrameName(stagedFrameIndex);
            fs::copy_file(
                frame.framePath,
                stagedInputDir / (stagedFrameName + frameSet.storageSpec.frameExtension),
                fs::copy_options::none);
            ++stagedFrameIndex;
        }
        inputFramesDir = stagedInputDir;
        inputFilenamePrefix = "frame_";
        inputIndexDigits = 6;
        inputStartNumber = 1;
    }

    const fs::path framePattern = inputFramesDir /
        BuildImageSequencePattern(inputFilenamePrefix, inputIndexDigits, frameSet.storageSpec.frameExtension);

    std::vector<ProcessArgument> command = {
        MakeProcessArgument(ffmpegPath),
        MakeProcessArgument("-y"),
        MakeProcessArgument("-hide_banner"),
        MakeProcessArgument("-progress"),
        MakeProcessArgument(progressPath),
        MakeProcessArgument("-f"),
        MakeProcessArgument("image2"),
        MakeProcessArgument("-framerate"),
        MakeProcessArgument(FormatDoubleArgument(inputFps)),
    };
    if (IsRawFrameStorage(frameSet.storageSpec)) {
        const std::string videoSize = std::to_string(frameSet.metadata.width) + "x" + std::to_string(frameSet.metadata.height);
        command.push_back(MakeProcessArgument("-vcodec"));
        command.push_back(MakeProcessArgument("rawvideo"));
        command.push_back(MakeProcessArgument("-pixel_format"));
        command.push_back(MakeProcessArgument("rgba"));
        command.push_back(MakeProcessArgument("-video_size"));
        command.push_back(MakeProcessArgument(videoSize));
    }
    command.insert(command.end(), {
        MakeProcessArgument("-start_number"),
        MakeProcessArgument(std::to_string(inputStartNumber)),
        MakeProcessArgument("-i"),
        MakeProcessArgument(framePattern),
        MakeProcessArgument("-vf"),
        MakeProcessArgument(filter),
        MakeProcessArgument("-c:v"),
        MakeProcessArgument("libx264"),
        MakeProcessArgument("-crf"),
        MakeProcessArgument(std::to_string(request.crf)),
        MakeProcessArgument("-preset"),
        MakeProcessArgument("medium"),
        MakeProcessArgument("-movflags"),
        MakeProcessArgument("+faststart"),
        MakeProcessArgument("-f"),
        MakeProcessArgument("mp4"),
        MakeProcessArgument(tempOutputPath),
    });

    const uint32_t exitCode = RunProcessToLog(ffmpegPath, command, logPath);
    const double targetDurationSeconds = static_cast<double>(exportedFrameCount) * holdSeconds;
    if (exitCode != 0) {
        if (fs::exists(tempOutputPath)) {
            fs::remove(tempOutputPath);
        }
        if (stageInputSequence) {
            std::error_code cleanupError;
            fs::remove_all(stagedInputDir, cleanupError);
        }
        throw std::runtime_error(
            "FFmpeg export failed with exit code " + std::to_string(exitCode) +
            ". Log: " + PathToUtf8(logPath) +
            ". Progress: " + PathToUtf8(progressPath));
    }
    if (!fs::exists(tempOutputPath)) {
        if (stageInputSequence) {
            std::error_code cleanupError;
            fs::remove_all(stagedInputDir, cleanupError);
        }
        throw std::runtime_error("FFmpeg did not create export output. Log: " + PathToUtf8(logPath));
    }
    const FfmpegExportProgress progress = ParseFfmpegProgressFile(
        progressPath,
        targetDurationSeconds,
        exportedFrameCount);
    fs::rename(tempOutputPath, finalOutputPath);
    if (stageInputSequence) {
        std::error_code cleanupError;
        fs::remove_all(stagedInputDir, cleanupError);
    }

    return {
        ffmpegPath,
        finalOutputPath,
        logPath,
        progressPath,
        filter,
        holdSeconds,
        targetDurationSeconds,
        sourceFrameCount,
        exportedFrameCount,
        sourceFrameCount - exportedFrameCount,
        samplingApplied,
        progress,
    };
}

}  // namespace ok_record
