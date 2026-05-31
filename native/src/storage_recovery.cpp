#include "storage_recovery.h"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <limits>
#include <sstream>
#include <stdexcept>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#endif

namespace ok_record {

namespace {

bool IsSupportedFrameExtension(const std::string& extension) {
    return extension == kRawFrameExtension ||
        extension == kJpegFrameExtension ||
        extension == ".jpeg" ||
        extension == kPngFrameExtension;
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

struct AspectRatioGroup {
    std::string key;
    uint32_t frameCount = 0;
    uint32_t maxWidth = 0;
    uint32_t maxHeight = 0;
};

struct AspectRatioSummary {
    std::vector<AspectRatioGroup> groups;
    std::string majorityKey;
    uint32_t majorityFrameCount = 0;
};

AspectRatioSummary AnalyzeAspectRatios(const std::vector<CommittedFrameRecord>& frames) {
    AspectRatioSummary summary;
    for (const CommittedFrameRecord& frame : frames) {
        const FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
        const std::string key = BuildAspectRatioKey(metadata.width, metadata.height);
        auto group = std::find_if(summary.groups.begin(), summary.groups.end(), [&key](const AspectRatioGroup& candidate) {
            return candidate.key == key;
        });
        if (group == summary.groups.end()) {
            summary.groups.push_back({key, 0, 0, 0});
            group = summary.groups.end() - 1;
        }
        group->frameCount += 1;
        group->maxWidth = std::max(group->maxWidth, metadata.width);
        group->maxHeight = std::max(group->maxHeight, metadata.height);
    }

    std::sort(summary.groups.begin(), summary.groups.end(), [](const AspectRatioGroup& lhs, const AspectRatioGroup& rhs) {
        if (lhs.frameCount != rhs.frameCount) {
            return lhs.frameCount > rhs.frameCount;
        }
        return lhs.key < rhs.key;
    });
    if (!summary.groups.empty()) {
        summary.majorityKey = summary.groups.front().key;
        summary.majorityFrameCount = summary.groups.front().frameCount;
    }
    return summary;
}

std::string BuildAspectRatioGroupsJson(const AspectRatioSummary& summary) {
    std::ostringstream json;
    json << "[";
    for (size_t index = 0; index < summary.groups.size(); ++index) {
        const AspectRatioGroup& group = summary.groups[index];
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

std::string ReadTextFile(const fs::path& path) {
    std::ifstream stream(path, std::ios::binary);
    if (!stream) {
        throw std::runtime_error("Unable to open text file for read: " + PathToUtf8(path));
    }

    std::ostringstream text;
    text << stream.rdbuf();
    if (!stream.good() && !stream.eof()) {
        throw std::runtime_error("Unable to read full text file: " + PathToUtf8(path));
    }
    return text.str();
}

bool LooksLikeJsonObject(const std::string& text) {
    const auto first = text.find_first_not_of(" \t\r\n");
    const auto last = text.find_last_not_of(" \t\r\n");
    return first != std::string::npos && text[first] == '{' && text[last] == '}';
}

size_t FindJsonValueStart(const std::string& text, const char* key) {
    const std::string needle = std::string("\"") + key + "\"";
    const size_t keyOffset = text.find(needle);
    if (keyOffset == std::string::npos) {
        throw std::runtime_error(std::string("Frame metadata is missing field: ") + key);
    }

    const size_t colonOffset = text.find(':', keyOffset + needle.size());
    if (colonOffset == std::string::npos) {
        throw std::runtime_error(std::string("Frame metadata field is missing ':' separator: ") + key);
    }

    const size_t valueOffset = text.find_first_not_of(" \t\r\n", colonOffset + 1);
    if (valueOffset == std::string::npos) {
        throw std::runtime_error(std::string("Frame metadata field is empty: ") + key);
    }
    return valueOffset;
}

std::string ExtractJsonStringField(const std::string& text, const char* key) {
    size_t offset = FindJsonValueStart(text, key);
    if (text[offset] != '"') {
        throw std::runtime_error(std::string("Frame metadata field is not a string: ") + key);
    }
    ++offset;

    std::string value;
    for (; offset < text.size(); ++offset) {
        const char ch = text[offset];
        if (ch == '"') {
            return value;
        }
        if (ch == '\\') {
            ++offset;
            if (offset >= text.size()) {
                throw std::runtime_error(std::string("Frame metadata has invalid escape in field: ") + key);
            }
            const char escaped = text[offset];
            switch (escaped) {
            case '"': value.push_back('"'); break;
            case '\\': value.push_back('\\'); break;
            case '/': value.push_back('/'); break;
            case 'b': value.push_back('\b'); break;
            case 'f': value.push_back('\f'); break;
            case 'n': value.push_back('\n'); break;
            case 'r': value.push_back('\r'); break;
            case 't': value.push_back('\t'); break;
            default: value.push_back(escaped); break;
            }
        } else {
            value.push_back(ch);
        }
    }

    throw std::runtime_error(std::string("Frame metadata string is unterminated: ") + key);
}

bool HasJsonField(const std::string& text, const char* key) {
    const std::string needle = std::string("\"") + key + "\"";
    return text.find(needle) != std::string::npos;
}

std::string ExtractOptionalJsonStringField(const std::string& text, const char* key, const std::string& defaultValue) {
    if (!HasJsonField(text, key)) {
        return defaultValue;
    }
    return ExtractJsonStringField(text, key);
}

uint64_t ExtractJsonUnsignedField(const std::string& text, const char* key) {
    size_t offset = FindJsonValueStart(text, key);
    if (offset >= text.size() || text[offset] < '0' || text[offset] > '9') {
        throw std::runtime_error(std::string("Frame metadata field is not an unsigned integer: ") + key);
    }

    uint64_t value = 0;
    for (; offset < text.size(); ++offset) {
        const char ch = text[offset];
        if (ch < '0' || ch > '9') {
            return value;
        }

        const uint64_t digit = static_cast<uint64_t>(ch - '0');
        if (value > (std::numeric_limits<uint64_t>::max() - digit) / 10) {
            throw std::runtime_error(std::string("Frame metadata numeric field overflow: ") + key);
        }
        value = (value * 10) + digit;
    }
    return value;
}

uint64_t ExtractOptionalJsonUnsignedField(const std::string& text, const char* key, uint64_t defaultValue) {
    if (!HasJsonField(text, key)) {
        return defaultValue;
    }
    return ExtractJsonUnsignedField(text, key);
}

uint32_t CheckedJsonUInt32(const std::string& text, const char* key) {
    const uint64_t value = ExtractJsonUnsignedField(text, key);
    if (value > std::numeric_limits<uint32_t>::max()) {
        throw std::runtime_error(std::string("Frame metadata field is out of uint32 range: ") + key);
    }
    return static_cast<uint32_t>(value);
}

}  // namespace

#ifdef _WIN32
std::wstring Utf8ToWide(const std::string& value) {
    if (value.empty()) {
        return {};
    }
    if (value.size() > static_cast<size_t>(std::numeric_limits<int>::max())) {
        throw std::runtime_error("UTF-8 string is too long to convert");
    }

    const int sourceLength = static_cast<int>(value.size());
    const int wideLength = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(), sourceLength, nullptr, 0);
    if (wideLength <= 0) {
        throw std::runtime_error("Invalid UTF-8 string");
    }

    std::wstring result(static_cast<size_t>(wideLength), L'\0');
    const int convertedLength = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(), sourceLength, result.data(), wideLength);
    if (convertedLength != wideLength) {
        throw std::runtime_error("Unable to convert UTF-8 string");
    }
    return result;
}

std::string WideToUtf8(const std::wstring& value) {
    if (value.empty()) {
        return {};
    }
    if (value.size() > static_cast<size_t>(std::numeric_limits<int>::max())) {
        throw std::runtime_error("Wide string is too long to convert");
    }

    const int sourceLength = static_cast<int>(value.size());
    const int utf8Length = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value.data(), sourceLength, nullptr, 0, nullptr, nullptr);
    if (utf8Length <= 0) {
        throw std::runtime_error("Invalid wide string");
    }

    std::string result(static_cast<size_t>(utf8Length), '\0');
    const int convertedLength = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value.data(), sourceLength, result.data(), utf8Length, nullptr, nullptr);
    if (convertedLength != utf8Length) {
        throw std::runtime_error("Unable to convert wide string");
    }
    return result;
}

fs::path PathFromUtf8(const std::string& value) {
    return fs::path(Utf8ToWide(value));
}

std::string PathToUtf8(const fs::path& path) {
    return WideToUtf8(path.wstring());
}
#else
fs::path PathFromUtf8(const std::string& value) {
    return fs::u8path(value);
}

std::string PathToUtf8(const fs::path& path) {
    return path.u8string();
}
#endif

bool IsSafeIdentifier(const std::string& value) {
    if (value.empty()) {
        return false;
    }

    for (char ch : value) {
        const bool isDigit = ch >= '0' && ch <= '9';
        const bool isLower = ch >= 'a' && ch <= 'z';
        const bool isUpper = ch >= 'A' && ch <= 'Z';
        if (!isDigit && !isLower && !isUpper && ch != '_' && ch != '-') {
            return false;
        }
    }

    return true;
}

std::string FormatFrameName(uint32_t frameIndex) {
    std::ostringstream name;
    name << "frame_";
    name.width(6);
    name.fill('0');
    name << frameIndex;
    return name.str();
}

std::string NormalizeExtension(const fs::path& path) {
    std::string extension = path.extension().string();
    std::transform(extension.begin(), extension.end(), extension.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return extension;
}

std::string JsonEscape(const std::string& value) {
    std::ostringstream escaped;
    for (char ch : value) {
        switch (ch) {
        case '\\': escaped << "\\\\"; break;
        case '"': escaped << "\\\""; break;
        case '\b': escaped << "\\b"; break;
        case '\f': escaped << "\\f"; break;
        case '\n': escaped << "\\n"; break;
        case '\r': escaped << "\\r"; break;
        case '\t': escaped << "\\t"; break;
        default:
            const auto byte = static_cast<unsigned char>(ch);
            if (byte < 0x20) {
                escaped << "\\u";
                escaped << "00";
                constexpr char kHex[] = "0123456789abcdef";
                escaped << kHex[(byte >> 4) & 0x0f] << kHex[byte & 0x0f];
            } else {
                escaped << ch;
            }
            break;
        }
    }
    return escaped.str();
}

bool IsRawFrameStorage(const FrameStorageSpec& storageSpec) {
    return storageSpec.storageFormat == kFrameStorageRawRgba ||
        storageSpec.frameExtension == kRawFrameExtension;
}

bool IsJpegFrameStorage(const FrameStorageSpec& storageSpec) {
    return storageSpec.storageFormat == kFrameStorageJpeg ||
        storageSpec.frameExtension == kJpegFrameExtension ||
        storageSpec.frameExtension == ".jpeg";
}

bool IsPngFrameStorage(const FrameStorageSpec& storageSpec) {
    return storageSpec.storageFormat == kFrameStoragePng ||
        storageSpec.frameExtension == kPngFrameExtension;
}

FrameStorageSpec NormalizeFrameStorageSpec(const FrameStorageSpec& storageSpec) {
    FrameStorageSpec normalized = storageSpec;
    std::transform(
        normalized.storageFormat.begin(),
        normalized.storageFormat.end(),
        normalized.storageFormat.begin(),
        [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
    std::transform(
        normalized.frameExtension.begin(),
        normalized.frameExtension.end(),
        normalized.frameExtension.begin(),
        [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });

    if (normalized.frameExtension.empty()) {
        if (normalized.storageFormat == kFrameStorageRawRgba) {
            normalized.frameExtension = kRawFrameExtension;
        } else if (normalized.storageFormat == kFrameStoragePng) {
            normalized.frameExtension = kPngFrameExtension;
        } else {
            normalized.frameExtension = kJpegFrameExtension;
        }
    }
    if (normalized.storageFormat.empty()) {
        if (normalized.frameExtension == kRawFrameExtension) {
            normalized.storageFormat = kFrameStorageRawRgba;
        } else if (normalized.frameExtension == kPngFrameExtension) {
            normalized.storageFormat = kFrameStoragePng;
        } else {
            normalized.storageFormat = kFrameStorageJpeg;
        }
    }
    if (!IsSupportedFrameExtension(normalized.frameExtension)) {
        throw std::runtime_error("Unsupported frame extension: " + normalized.frameExtension);
    }
    if (normalized.storageFormat == kFrameStorageRawRgba) {
        if (normalized.frameExtension != kRawFrameExtension) {
            throw std::runtime_error("Raw frame storage must use .rgba extension");
        }
    } else if (normalized.storageFormat == kFrameStorageJpeg) {
        if (normalized.frameExtension != kJpegFrameExtension && normalized.frameExtension != ".jpeg") {
            throw std::runtime_error("JPEG frame storage must use .jpg or .jpeg extension");
        }
    } else if (normalized.storageFormat == kFrameStoragePng) {
        if (normalized.frameExtension != kPngFrameExtension) {
            throw std::runtime_error("PNG frame storage must use .png extension");
        }
    } else {
        throw std::runtime_error("Unsupported frame storage format: " + normalized.storageFormat);
    }
    return normalized;
}

bool ParseFrameIndex(const fs::path& framePath, uint32_t& frameIndex) {
    if (!IsSupportedFrameExtension(NormalizeExtension(framePath))) {
        return false;
    }

    const std::string stem = framePath.stem().string();
    constexpr size_t kPrefixLength = 6;
    constexpr size_t kDigits = 6;
    if (stem.size() != kPrefixLength + kDigits || stem.rfind("frame_", 0) != 0) {
        return false;
    }

    uint32_t value = 0;
    for (size_t offset = kPrefixLength; offset < stem.size(); ++offset) {
        const char ch = stem[offset];
        if (ch < '0' || ch > '9') {
            return false;
        }
        value = (value * 10) + static_cast<uint32_t>(ch - '0');
    }

    if (value == 0) {
        return false;
    }

    frameIndex = value;
    return true;
}

uint32_t FindNextFrameIndex(const fs::path& framesDir) {
    uint32_t highestFrameIndex = 0;
    for (const CommittedFrameRecord& frame : CollectCommittedFrames(framesDir)) {
        highestFrameIndex = std::max(highestFrameIndex, frame.frameIndex);
    }

    if (highestFrameIndex == std::numeric_limits<uint32_t>::max()) {
        throw std::runtime_error("Frame index overflow");
    }

    return highestFrameIndex + 1;
}

void ValidateCommittedFrameRecord(const CommittedFrameRecord& frame) {
    const FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
    if (metadata.frameIndex != frame.frameIndex) {
        throw std::runtime_error("Frame metadata index does not match filename: " + PathToUtf8(frame.metadataPath));
    }
    if (NormalizeExtension(frame.framePath) != metadata.frameExtension) {
        throw std::runtime_error("Frame file extension does not match metadata: " + PathToUtf8(frame.framePath));
    }

    const uint64_t expectedBytes = ExpectedFrameByteLength(metadata);
    if (metadata.byteLength != expectedBytes) {
        throw std::runtime_error("Frame metadata source byteLength does not match dimensions: " + PathToUtf8(frame.metadataPath));
    }

    const FrameStorageSpec storageSpec = GetFrameStorageSpecFromMetadata(metadata);
    const uint64_t fileSize = fs::file_size(frame.framePath);
    if (IsRawFrameStorage(storageSpec)) {
        if (fileSize != metadata.byteLength) {
            throw std::runtime_error("Raw frame file size does not match metadata: " + PathToUtf8(frame.framePath));
        }
    } else if (metadata.encodedByteLength == 0 || fileSize != metadata.encodedByteLength) {
        throw std::runtime_error("Encoded frame file size does not match metadata: " + PathToUtf8(frame.framePath));
    }
}

std::vector<CommittedFrameRecord> CollectCommittedFrames(const fs::path& framesDir) {
    std::vector<CommittedFrameRecord> frames;
    if (!fs::exists(framesDir)) {
        return frames;
    }

    for (const auto& entry : fs::directory_iterator(framesDir)) {
        if (!entry.is_regular_file()) {
            continue;
        }

        uint32_t frameIndex = 0;
        if (!ParseFrameIndex(entry.path(), frameIndex)) {
            continue;
        }

        const std::string frameName = entry.path().stem().string();
        const fs::path metadataPath = framesDir / (frameName + ".json");
        if (!fs::exists(metadataPath)) {
            continue;
        }

        std::string metadataJson = ReadTextFile(metadataPath);
        if (!LooksLikeJsonObject(metadataJson)) {
            throw std::runtime_error("Committed frame metadata is not a JSON object: " + PathToUtf8(metadataPath));
        }

        CommittedFrameRecord frame{frameIndex, frameName, entry.path(), metadataPath, metadataJson};
        ValidateCommittedFrameRecord(frame);
        frames.push_back(frame);
    }

    std::sort(frames.begin(), frames.end(), [](const CommittedFrameRecord& lhs, const CommittedFrameRecord& rhs) {
        return lhs.frameIndex < rhs.frameIndex;
    });
    for (size_t index = 1; index < frames.size(); ++index) {
        if (frames[index - 1].frameIndex == frames[index].frameIndex) {
            throw std::runtime_error("Duplicate committed frame index: " + frames[index].frameName);
        }
    }
    return frames;
}

std::vector<fs::path> CollectOrphanFramePaths(const fs::path& framesDir) {
    std::vector<fs::path> orphanFramePaths;
    if (!fs::exists(framesDir)) {
        return orphanFramePaths;
    }

    for (const auto& entry : fs::directory_iterator(framesDir)) {
        if (!entry.is_regular_file()) {
            continue;
        }

        uint32_t frameIndex = 0;
        if (!ParseFrameIndex(entry.path(), frameIndex)) {
            continue;
        }

        const std::string frameName = entry.path().stem().string();
        const fs::path metadataPath = framesDir / (frameName + ".json");
        if (!fs::exists(metadataPath)) {
            orphanFramePaths.push_back(entry.path());
        }
    }

    std::sort(orphanFramePaths.begin(), orphanFramePaths.end());
    return orphanFramePaths;
}

void RemoveOrphanFrameFilesForIndex(const fs::path& framesDir, uint32_t frameIndex) {
    if (!fs::exists(framesDir)) {
        return;
    }

    for (const auto& entry : fs::directory_iterator(framesDir)) {
        if (!entry.is_regular_file()) {
            continue;
        }

        uint32_t existingFrameIndex = 0;
        if (!ParseFrameIndex(entry.path(), existingFrameIndex) || existingFrameIndex != frameIndex) {
            continue;
        }

        const std::string frameName = entry.path().stem().string();
        const fs::path metadataPath = framesDir / (frameName + ".json");
        if (!fs::exists(metadataPath)) {
            fs::remove(entry.path());
        }
    }
}

std::string BuildManifestJsonFromCommittedFrames(
    const std::string& sessionId,
    const fs::path& sessionRoot,
    const fs::path& framesDir,
    const fs::path& manifestPath,
    const std::vector<CommittedFrameRecord>& frames) {
    if (frames.empty()) {
        throw std::runtime_error("Cannot rebuild manifest without committed frames: " + PathToUtf8(sessionRoot));
    }

    const FrameMetadata firstMetadata = ReadFrameMetadata(frames.front().metadataJson);
    const FrameMetadata lastMetadata = ReadFrameMetadata(frames.back().metadataJson);
    const FrameStorageSpec storageSpec = GetFrameStorageSpecFromMetadata(firstMetadata);

    for (const CommittedFrameRecord& frame : frames) {
        const FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
        if (!metadata.sessionId.empty() && metadata.sessionId != sessionId) {
            throw std::runtime_error("Frame metadata sessionId does not match recording timeline: " + PathToUtf8(frame.metadataPath));
        }
    }

    const uint32_t lastFrameIndex = frames.back().frameIndex;
    const std::string lastFrameName = frames.back().frameName;

    std::ostringstream json;
    json << "{\n";
    json << "  \"schema\": \"ok-record.manifest.v1\",\n";
    json << "  \"sessionId\": \"" << JsonEscape(sessionId) << "\",\n";
    json << "  \"updatedAt\": \"" << JsonEscape(lastMetadata.capturedAt) << "\",\n";
    json << "  \"state\": \"Idle\",\n";
    json << "  \"sessionPath\": \"" << JsonEscape(PathToUtf8(sessionRoot)) << "\",\n";
    json << "  \"manifestPath\": \"" << JsonEscape(PathToUtf8(manifestPath)) << "\",\n";
    json << "  \"framesPath\": \"" << JsonEscape(PathToUtf8(framesDir)) << "\",\n";
    json << "  \"frameCount\": " << frames.size() << ",\n";
    json << "  \"lastFrameIndex\": " << lastFrameIndex << ",\n";
    json << "  \"lastFrameName\": \"" << JsonEscape(lastFrameName) << "\",\n";
    json << "  \"lastCaptureAt\": \"" << JsonEscape(lastMetadata.capturedAt) << "\",\n";
    json << "  \"metadataSidecarsAreAuthority\": true,\n";
    json << "  \"frameFormat\": {\n";
    json << "    \"storageFormat\": \"" << JsonEscape(storageSpec.storageFormat) << "\",\n";
    json << "    \"frameExtension\": \"" << JsonEscape(storageSpec.frameExtension) << "\",\n";
    json << "    \"frameQualityPreset\": \"" << JsonEscape(firstMetadata.frameQualityPreset) << "\",\n";
    json << "    \"jpegQuality\": " << firstMetadata.jpegQuality << ",\n";
    json << "    \"metadataExtension\": \"" << kMetadataExtension << "\",\n";
    json << "    \"pixelFormat\": \"" << JsonEscape(firstMetadata.pixelFormat) << "\",\n";
    json << "    \"colorSpace\": \"" << JsonEscape(firstMetadata.colorSpace) << "\",\n";
    json << "    \"colorProfile\": \"" << JsonEscape(firstMetadata.colorProfile) << "\",\n";
    json << "    \"components\": " << firstMetadata.components << ",\n";
    json << "    \"componentSize\": " << firstMetadata.componentSize << "\n";
    json << "  },\n";
    json << "  \"frames\": [\n";

    for (size_t index = 0; index < frames.size(); ++index) {
        const CommittedFrameRecord& frame = frames[index];
        json << "    {\n";
        json << "      \"frameIndex\": " << frame.frameIndex << ",\n";
        json << "      \"frameName\": \"" << JsonEscape(frame.frameName) << "\",\n";
        json << "      \"framePath\": \"" << JsonEscape(PathToUtf8(frame.framePath)) << "\",\n";
        json << "      \"metadataPath\": \"" << JsonEscape(PathToUtf8(frame.metadataPath)) << "\",\n";
        json << "      \"metadata\": " << frame.metadataJson << "\n";
        json << "    }";
        if (index + 1 < frames.size()) {
            json << ",";
        }
        json << "\n";
    }

    json << "  ]\n";
    json << "}\n";
    return json.str();
}

void RebuildManifestFromCommittedFrames(
    const fs::path& sessionRoot,
    const std::vector<CommittedFrameRecord>& frames) {
    if (frames.empty()) {
        return;
    }

    const std::string sessionId = kRecordingTimelineId;
    const fs::path framesDir = sessionRoot / "frames";
    const fs::path manifestPath = sessionRoot / "manifest.json";
    const fs::path tempDir = sessionRoot / "temp";
    const fs::path tempManifestPath = tempDir / "manifest.json.rebuild.tmp";
    fs::create_directories(tempDir);

    if (fs::exists(tempManifestPath)) {
        fs::remove(tempManifestPath);
    }

    const std::string manifestJson = BuildManifestJsonFromCommittedFrames(
        sessionId,
        sessionRoot,
        framesDir,
        manifestPath,
        frames);

    {
        std::ofstream stream(tempManifestPath, std::ios::binary);
        if (!stream) {
            throw std::runtime_error("Unable to open temp manifest for rebuild: " + PathToUtf8(tempManifestPath));
        }
        stream.write(manifestJson.data(), static_cast<std::streamsize>(manifestJson.size()));
        if (!stream.good()) {
            throw std::runtime_error("Unable to write rebuilt manifest: " + PathToUtf8(tempManifestPath));
        }
    }

    if (fs::exists(manifestPath)) {
        fs::remove(manifestPath);
    }
    fs::rename(tempManifestPath, manifestPath);
}

uint32_t FindFirstMissingCommittedFrameIndex(const std::vector<CommittedFrameRecord>& frames) {
    if (frames.empty()) {
        return 0;
    }

    uint32_t expectedFrameIndex = frames.front().frameIndex;
    for (const CommittedFrameRecord& frame : frames) {
        if (frame.frameIndex != expectedFrameIndex) {
            return expectedFrameIndex;
        }
        if (expectedFrameIndex != std::numeric_limits<uint32_t>::max()) {
            ++expectedFrameIndex;
        }
    }
    return 0;
}

RecordingSessionScanSummary ScanRecordingSessions(const fs::path& recordingsRoot) {
    RecordingSessionScanSummary summary;
    if (!fs::exists(recordingsRoot)) {
        return summary;
    }
    if (!fs::is_directory(recordingsRoot)) {
        throw std::runtime_error("Recordings root is not a directory: " + PathToUtf8(recordingsRoot));
    }

    const fs::path sessionRoot = recordingsRoot;
    const fs::path framesDir = sessionRoot / "frames";
    const std::string sessionId = kRecordingTimelineId;
    auto recordInvalidSession = [&summary, &sessionId, &sessionRoot, &framesDir](const std::string& error) {
        summary.invalidSessions.push_back({sessionId, sessionRoot, framesDir, error});
    };

    try {
        const std::vector<CommittedFrameRecord> frames = CollectCommittedFrames(framesDir);
        const std::vector<fs::path> orphanFramePaths = CollectOrphanFramePaths(framesDir);
        if (frames.empty()) {
            return summary;
        }
        if (frames.size() > std::numeric_limits<uint32_t>::max()) {
            throw std::runtime_error("Recording timeline has too many frames: " + PathToUtf8(sessionRoot));
        }

        const CommittedFrameRecord& firstFrame = frames.front();
        const CommittedFrameRecord& lastFrame = frames.back();
        const FrameMetadata firstMetadata = ReadFrameMetadata(firstFrame.metadataJson);
        bool exportFrameMetadataConsistent = true;
        std::string inconsistentFrameName;
        fs::path inconsistentMetadataPath;
        for (const CommittedFrameRecord& frame : frames) {
            const FrameMetadata metadata = ReadFrameMetadata(frame.metadataJson);
            if (metadata.components != firstMetadata.components ||
                metadata.componentSize != firstMetadata.componentSize ||
                metadata.pixelFormat != firstMetadata.pixelFormat ||
                metadata.frameStorageFormat != firstMetadata.frameStorageFormat ||
                metadata.frameQualityPreset != firstMetadata.frameQualityPreset ||
                metadata.jpegQuality != firstMetadata.jpegQuality ||
                metadata.frameExtension != firstMetadata.frameExtension ||
                NormalizeExtension(frame.framePath) != metadata.frameExtension) {
                exportFrameMetadataConsistent = false;
                inconsistentFrameName = frame.frameName;
                inconsistentMetadataPath = frame.metadataPath;
                break;
            }
        }
        const AspectRatioSummary aspectRatioSummary = AnalyzeAspectRatios(frames);
        const bool aspectRatioConsistent = aspectRatioSummary.groups.size() <= 1;
        const uint32_t firstMissingFrameIndex = FindFirstMissingCommittedFrameIndex(frames);
        const bool contiguousFrames = firstMissingFrameIndex == 0;
        bool exportable = contiguousFrames && exportFrameMetadataConsistent;
        std::string exportBlockReason;
        if (!contiguousFrames) {
            exportBlockReason = "Frame sequence is not contiguous at expected frame index: " + std::to_string(firstMissingFrameIndex);
        } else if (!exportFrameMetadataConsistent) {
            exportBlockReason = "Export frame metadata is inconsistent at: " + inconsistentFrameName;
        }
        RebuildManifestFromCommittedFrames(sessionRoot, frames);

        summary.sessions.push_back({
            sessionId,
            sessionRoot,
            framesDir,
            sessionRoot / "manifest.json",
            static_cast<uint32_t>(frames.size()),
            lastFrame.frameIndex,
            lastFrame.frameName,
            lastFrame.framePath,
            lastFrame.metadataPath,
            firstFrame.metadataJson,
            lastFrame.metadataJson,
            exportFrameMetadataConsistent,
            aspectRatioConsistent,
            BuildAspectRatioGroupsJson(aspectRatioSummary),
            aspectRatioSummary.majorityKey,
            aspectRatioSummary.majorityFrameCount,
            inconsistentFrameName,
            inconsistentMetadataPath,
            contiguousFrames,
            exportable,
            firstMissingFrameIndex,
            static_cast<uint32_t>(orphanFramePaths.size()),
            orphanFramePaths.empty() ? fs::path() : orphanFramePaths.front(),
            exportBlockReason,
        });
    } catch (const std::exception& exception) {
        recordInvalidSession(exception.what());
    }
    return summary;
}

FrameMetadata ReadFrameMetadata(const std::string& metadataJson) {
    if (!LooksLikeJsonObject(metadataJson)) {
        throw std::runtime_error("Frame metadata is not a JSON object");
    }

    FrameMetadata metadata;
    metadata.frameIndex = CheckedJsonUInt32(metadataJson, "frameIndex");
    metadata.width = CheckedJsonUInt32(metadataJson, "width");
    metadata.height = CheckedJsonUInt32(metadataJson, "height");
    metadata.components = CheckedJsonUInt32(metadataJson, "components");
    metadata.componentSize = CheckedJsonUInt32(metadataJson, "componentSize");
    metadata.byteLength = ExtractJsonUnsignedField(metadataJson, "byteLength");
    metadata.pixelFormat = ExtractJsonStringField(metadataJson, "pixelFormat");
    metadata.sessionId = ExtractOptionalJsonStringField(metadataJson, "sessionId", "");
    metadata.capturedAt = ExtractOptionalJsonStringField(metadataJson, "capturedAt", "");
    metadata.colorSpace = ExtractOptionalJsonStringField(metadataJson, "colorSpace", "");
    metadata.colorProfile = ExtractOptionalJsonStringField(metadataJson, "colorProfile", "");
    metadata.frameStorageFormat = ExtractOptionalJsonStringField(metadataJson, "frameStorageFormat", kFrameStorageRawRgba);
    metadata.frameExtension = ExtractOptionalJsonStringField(metadataJson, "frameExtension", kRawFrameExtension);
    FrameStorageSpec storageSpec = NormalizeFrameStorageSpec({metadata.frameStorageFormat, metadata.frameExtension});
    metadata.frameStorageFormat = storageSpec.storageFormat;
    metadata.frameExtension = storageSpec.frameExtension;
    metadata.encodedByteLength = ExtractOptionalJsonUnsignedField(metadataJson, "encodedByteLength", metadata.byteLength);
    metadata.frameQualityPreset = ExtractOptionalJsonStringField(metadataJson, "frameQualityPreset", "");
    if (metadata.frameQualityPreset.empty()) {
        if (IsJpegFrameStorage(storageSpec)) {
            metadata.frameQualityPreset = kFrameQualityHigh;
        } else if (IsPngFrameStorage(storageSpec)) {
            metadata.frameQualityPreset = kFrameQualityLossless;
        }
    }
    const uint64_t defaultJpegQuality = IsJpegFrameStorage(storageSpec) ? 92 : 0;
    const uint64_t jpegQuality = ExtractOptionalJsonUnsignedField(metadataJson, "jpegQuality", defaultJpegQuality);
    if (jpegQuality > 100) {
        throw std::runtime_error("Frame metadata jpegQuality is out of range");
    }
    metadata.jpegQuality = static_cast<uint32_t>(jpegQuality);
    return metadata;
}

FrameStorageSpec GetFrameStorageSpecFromMetadata(const FrameMetadata& metadata) {
    return NormalizeFrameStorageSpec({metadata.frameStorageFormat, metadata.frameExtension});
}

uint64_t ExpectedFrameByteLength(const FrameMetadata& metadata) {
    if (metadata.width == 0 || metadata.height == 0 || metadata.components == 0 || metadata.componentSize == 0) {
        throw std::runtime_error("Frame metadata contains empty dimensions or component fields");
    }
    if (metadata.componentSize % 8 != 0) {
        throw std::runtime_error("Frame metadata componentSize is not byte aligned");
    }

    const uint64_t bytesPerPixel = static_cast<uint64_t>(metadata.components) * (metadata.componentSize / 8);
    return static_cast<uint64_t>(metadata.width) * metadata.height * bytesPerPixel;
}

}  // namespace ok_record
