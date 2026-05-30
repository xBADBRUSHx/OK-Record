#include "export_progress.h"

#include <cassert>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>

namespace fs = std::filesystem;

namespace {

void WriteText(const fs::path& path, const std::string& text) {
    fs::create_directories(path.parent_path());
    std::ofstream stream(path, std::ios::binary);
    if (!stream) {
        throw std::runtime_error("Unable to write progress fixture");
    }
    stream.write(text.data(), static_cast<std::streamsize>(text.size()));
}

bool CloseEnough(double lhs, double rhs) {
    return std::fabs(lhs - rhs) < 0.001;
}

}  // namespace

int main() {
    const std::string progressText =
        "frame=12\n"
        "fps=24.5\n"
        "total_size=4096\n"
        "out_time=00:00:03.500000\n"
        "bitrate=123.4kbits/s\n"
        "speed=1.25x\n"
        "progress=continue\n"
        "frame=24\n"
        "fps=30.0\n"
        "total_size=8192\n"
        "out_time=00:00:07.250000\n"
        "bitrate=256.0kbits/s\n"
        "speed=2.50x\n"
        "progress=end\n";

    const ok_record::FfmpegExportProgress progress =
        ok_record::ParseFfmpegProgressText(progressText, 7.25, 24);
    assert(progress.parsed);
    assert(progress.status == "end");
    assert(progress.frame == 24);
    assert(CloseEnough(progress.fps, 30.0));
    assert(CloseEnough(progress.outTimeSeconds, 7.25));
    assert(CloseEnough(progress.targetDurationSeconds, 7.25));
    assert(CloseEnough(progress.percent, 100.0));
    assert(progress.totalSizeBytes == 8192);
    assert(progress.bitrate == "256.0kbits/s");
    assert(progress.speed == "2.50x");

    const ok_record::FfmpegExportProgress partial =
        ok_record::ParseFfmpegProgressText("frame=5\nprogress=continue\n", 0.0, 20);
    assert(partial.parsed);
    assert(partial.status == "continue");
    assert(partial.frame == 5);
    assert(CloseEnough(partial.percent, 25.0));

    const ok_record::FfmpegExportProgress empty =
        ok_record::ParseFfmpegProgressText("not progress\n", 10.0, 10);
    assert(!empty.parsed);
    assert(empty.status == "unknown");
    assert(CloseEnough(empty.percent, 0.0));

    const fs::path fixturePath = fs::temp_directory_path() / "ok-record-native-export-progress.progress";
    WriteText(fixturePath, progressText);
    const ok_record::FfmpegExportProgress fromFile =
        ok_record::ParseFfmpegProgressFile(fixturePath, 7.25, 24);
    fs::remove(fixturePath);
    assert(fromFile.parsed);
    assert(fromFile.status == "end");
    assert(CloseEnough(fromFile.percent, 100.0));

    std::cout << "native export progress tests passed\n";
    return 0;
}
