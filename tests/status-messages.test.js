"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const statusMessages = require(path.join(repoRoot, "uxp", "status-messages.js"));

const exportResult = {
  sourceType: "directory",
  sourcePath: "E:\\Project\\延时录制_Recordings\\frames",
  sessionId: "",
  frameCount: 120,
  holdSeconds: 0.5,
  outputFps: 30,
  outputWidth: 1920,
  outputHeight: 1080,
  outputPath: "E:\\Project\\exports\\OK_Record.mp4",
  logPath: "E:\\Project\\exports\\export.log",
  progressPath: "E:\\Project\\exports\\progress.log",
  targetDurationSeconds: 60,
  inputFrameStorageFormat: "jpeg",
  inputFrameExtension: ".jpg",
  progressParsed: true,
  progressStatus: "end",
  progressPercent: 100,
  progressFrame: 1800,
  progressOutTimeSeconds: 60,
  progressTargetDurationSeconds: 60,
  progressSpeed: "1.0x",
};

const exportProfile = {
  durationSeconds: 60,
  outputFps: 30,
};

const successMessages = statusMessages.buildExportSuccessMessages({
  result: exportResult,
  exportProfile,
  frameQualityLabel: "默认",
  captureResolutionLabel: "1080p",
  outputFileName: "OK_Record.mp4",
});

assert.strictEqual(successMessages.noticeTitle, "导出完成");
assert.strictEqual(successMessages.noticeTone, "success");
assert(successMessages.statusMessage.includes("导出视频：成功"), "export success status must keep a clear success heading");
assert(successMessages.statusMessage.includes("导出源：E:\\Project\\延时录制_Recordings"), "export status must include source path");
assert(successMessages.statusMessage.includes("帧数：120"), "export status must include frame count");
assert(successMessages.statusMessage.includes("导出进度：100%"), "export status must include parsed FFmpeg progress");
assert(successMessages.statusMessage.includes("序列格式：JPEG (.jpg)"), "export status must include sequence storage format");
assert(successMessages.noticeLines.includes("导出源：序列帧目录"), "export notice must distinguish sequence-directory export");
assert(successMessages.noticeLines.includes("每秒序列帧：2 张"), "export notice must derive sequence frames per second");
assert(successMessages.noticeLines.includes("输出帧率：30 fps"), "export notice must include output fps");
assert(successMessages.noticeLines.includes("质量：默认"), "export notice must include quality preset label");
assert(successMessages.noticeLines.includes("分辨率：1080p"), "export notice must include resolution label");
assert(successMessages.noticeLines.includes("输出文件：OK_Record.mp4"), "export notice must include output file name");
assert(successMessages.noticeLines.includes("输出路径：E:\\Project\\exports\\OK_Record.mp4"), "export notice must include full output path");

const failureMessages = statusMessages.buildExportFailureMessages("未找到 FFmpeg");
assert.deepStrictEqual(failureMessages, {
  statusMessage: "导出视频失败：未找到 FFmpeg",
  noticeTitle: "导出失败",
  noticeLines: ["未找到 FFmpeg"],
  noticeTone: "error",
});

const ffmpegError = statusMessages.formatError(new Error("FFmpeg was not found in PATH"));
assert(ffmpegError.includes("未找到 FFmpeg"), "missing-FFmpeg error must be translated for users");
assert(ffmpegError.includes("with-ffmpeg 免配置版"), "missing-FFmpeg error must mention the no-setup package");
assert(ffmpegError.includes("winget install --id Gyan.FFmpeg.Essentials -e --source winget"), "missing-FFmpeg error must include the Windows install command");
assert(ffmpegError.includes("安装后请重启 Photoshop"), "missing-FFmpeg error must tell users to restart Photoshop");

assert.strictEqual(
  statusMessages.formatExportProgress({
    parsed: true,
    status: "continue",
    percent: 50,
    frame: 90,
    outTimeSeconds: 3,
    targetDurationSeconds: 6,
    speed: "0.8x",
  }),
  "导出进度：50.0%，状态 进行中，时长 3 秒 / 6 秒，帧 90，速度 0.8x",
);
assert.strictEqual(statusMessages.formatExportProgress({ parsed: false }), "导出进度：未从 FFmpeg progress 文件解析到进度");

assert.deepStrictEqual(
  statusMessages.createCaptureDiagnosticsLines({
    targetWidth: 1920,
    modalMs: 10,
    getPixelsMs: 2,
    getDataMs: 3,
    copyMs: 4,
    nativeWriteMs: 5,
  }, {
    targetWidthLabel: "1080p",
  }),
  [],
  "capture diagnostics must be hidden by default",
);

assert.strictEqual(
  statusMessages.buildStepCaptureSuccessStatus({
    label: "手动采样",
    result: {
      frameName: "step_001.png",
      frameCount: 1,
      width: 100,
      height: 200,
      encodedByteLength: 2048,
      sourceByteLength: 80000,
      framePath: "E:\\Project\\步骤图_Steps\\step_001.png",
    },
  }),
  [
    "手动采样：成功",
    "输出：原图尺寸 PNG 无损步骤图",
    "步骤图：step_001.png",
    "张数：1",
    "尺寸：100 x 200",
    "文件大小：2048 字节",
    "源缓冲区：80000 字节",
    "文件：E:\\Project\\步骤图_Steps\\step_001.png",
  ].join("\n"),
);

assert.strictEqual(
  statusMessages.buildFrameCaptureSuccessStatus({
    label: "录制",
    result: {
      width: 1920,
      height: 1080,
      sessionId: "Timeline",
      frameName: "frame_000001.jpg",
      frameCount: 1,
      lastCaptureAt: "2026-05-29T15:30:00.000Z",
      frameStorageFormat: "jpeg",
      frameQualityPreset: "default",
      encodedByteLength: 1024,
      sourceByteLength: 8294400,
      framePath: "E:\\Project\\frames\\frame_000001.jpg",
      metadataPath: "E:\\Project\\frames\\frame_000001.json",
      manifestPath: "E:\\Project\\manifest.json",
    },
    frameIndexText: "frame_000001",
    frameStorageFormatLabel: "JPEG (.jpg)",
    frameQualityLabel: "默认",
  }),
  [
    "录制：成功",
    "尺寸：1920 x 1080",
    "录制：时间线",
    "帧：frame_000001 (frame_000001.jpg)",
    "帧数：1",
    "上次采样：2026-05-29T15:30:00.000Z",
    "帧格式：JPEG (.jpg)",
    "压缩质量：默认",
    "文件大小：1024 字节",
    "源缓冲区：8294400 字节",
    "帧文件：E:\\Project\\frames\\frame_000001.jpg",
    "元数据：E:\\Project\\frames\\frame_000001.json",
    "Manifest: E:\\Project\\manifest.json",
  ].join("\n"),
);
