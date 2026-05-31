"use strict";

const SECONDS_PER_MINUTE = 60;
const CAPTURE_DIAGNOSTICS_DEBUG = false;

function toFiniteNumber(value, fallbackValue = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallbackValue;
}

function clampNumber(value, fallbackValue, minValue, maxValue) {
  const number = toFiniteNumber(value, fallbackValue);
  return Math.max(minValue, Math.min(maxValue, number));
}

function roundMilliseconds(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value * 100) / 100);
}

function formatNumberValue(value) {
  const rounded = Math.round(Number(value) * 1000) / 1000;
  if (!Number.isFinite(rounded)) {
    return "0";
  }
  return String(rounded).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatSecondsValue(seconds) {
  return formatNumberValue(seconds);
}

function formatIntervalSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const parts = [];
  if (minutes > 0) {
    parts.push(`${minutes} 分`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${formatNumberValue(seconds)} 秒`);
  }
  return parts.join(" ");
}

function formatMillisecondsValue(milliseconds) {
  return `${formatNumberValue(roundMilliseconds(milliseconds))} ms`;
}

function formatPercentValue(value) {
  const percent = clampNumber(value, 0, 0, 100);
  return `${percent >= 99.95 ? "100" : percent.toFixed(1)}%`;
}

function formatFrameStorageFormat(storageFormat, frameExtension) {
  const extension = frameExtension ? ` (${frameExtension})` : "";
  switch (storageFormat) {
    case "jpeg":
      return `JPEG${extension}`;
    case "png":
      return `PNG${extension}`;
    case "raw-rgba":
      return `Raw RGBA${extension}`;
    default:
      return `${storageFormat || "未知"}${extension}`;
  }
}

function createExportProgressSnapshot(result) {
  const targetDurationSeconds = toFiniteNumber(result.progressTargetDurationSeconds, result.targetDurationSeconds || 0);
  return {
    schema: typeof result.progressSchema === "string" ? result.progressSchema : "",
    parsed: Boolean(result.progressParsed),
    status: typeof result.progressStatus === "string" ? result.progressStatus : "unknown",
    percent: clampNumber(result.progressPercent, 0, 0, 100),
    frame: Math.max(0, Math.floor(toFiniteNumber(result.progressFrame, 0))),
    fps: Math.max(0, toFiniteNumber(result.progressFps, 0)),
    outTimeSeconds: Math.max(0, toFiniteNumber(result.progressOutTimeSeconds, 0)),
    targetDurationSeconds: Math.max(0, targetDurationSeconds),
    totalSizeBytes: Math.max(0, toFiniteNumber(result.progressTotalSizeBytes, 0)),
    bitrate: typeof result.progressBitrate === "string" ? result.progressBitrate : "",
    speed: typeof result.progressSpeed === "string" ? result.progressSpeed : "",
  };
}

function formatExportProgress(progressLike) {
  const progress = Object.prototype.hasOwnProperty.call(progressLike || {}, "progressParsed") ?
    createExportProgressSnapshot(progressLike) :
    progressLike;
  if (!progress || !progress.parsed) {
    return "导出进度：未从 FFmpeg progress 文件解析到进度";
  }

  const parts = [
    `导出进度：${formatPercentValue(progress.percent)}`,
    `状态 ${formatExportProgressStatus(progress.status)}`,
  ];
  if (progress.outTimeSeconds > 0 && progress.targetDurationSeconds > 0) {
    parts.push(`时长 ${formatIntervalSeconds(progress.outTimeSeconds)} / ${formatIntervalSeconds(progress.targetDurationSeconds)}`);
  }
  if (progress.frame > 0) {
    parts.push(`帧 ${progress.frame}`);
  }
  if (progress.speed) {
    parts.push(`速度 ${progress.speed}`);
  }
  return parts.join("，");
}

function formatExportProgressStatus(status) {
  if (status === "end") {
    return "完成";
  }
  if (status === "continue") {
    return "进行中";
  }
  return status || "未知";
}

function formatCaptureDiagnostics(diagnostics) {
  if (!diagnostics) {
    return "";
  }

  return [
    `modal ${formatMillisecondsValue(diagnostics.modalMs)}`,
    `getPixels ${formatMillisecondsValue(diagnostics.getPixelsMs)}`,
    `getData ${formatMillisecondsValue(diagnostics.getDataMs)}`,
    `复制 ${formatMillisecondsValue(diagnostics.copyMs)}`,
    `native ${formatMillisecondsValue(diagnostics.nativeWriteMs)}`,
  ].join("，");
}

function shouldShowCaptureDiagnostics() {
  return CAPTURE_DIAGNOSTICS_DEBUG === true;
}

function createCaptureDiagnosticsLines(diagnostics, options = {}) {
  if (!shouldShowCaptureDiagnostics() || !diagnostics) {
    return [];
  }

  const targetWidthLabel = options.targetWidthLabel || "原始尺寸";
  return [
    `采样上限：${targetWidthLabel}`,
    `采样耗时：${formatCaptureDiagnostics(diagnostics)}`,
  ];
}

function appendCaptureDiagnosticsLines(lines, diagnostics, options = {}) {
  lines.push(...createCaptureDiagnosticsLines(diagnostics, options));
}

function logCaptureDiagnostics(scope, diagnostics) {
  if (!shouldShowCaptureDiagnostics()) {
    return;
  }

  console.log(`[OK-Record] ${scope} diagnostics:`, diagnostics);
}

function formatError(error) {
  const message = error && error.message ? error.message : String(error);
  if (message.includes("FFmpeg was not found")) {
    return [
      "未找到 FFmpeg。请安装 FFmpeg，或下载 OK Record 的 with-ffmpeg 免配置版。",
      "Windows 安装命令：winget install --id Gyan.FFmpeg.Essentials -e --source winget",
      "安装后请重启 Photoshop。",
    ].join("\n");
  }
  return message;
}

function buildExportSuccessMessages(options) {
  const result = options.result || {};
  const exportProfile = options.exportProfile || {};
  const sequenceFramesPerSecond = result.holdSeconds > 0 ? 1 / result.holdSeconds : 0;
  const progressText = formatExportProgress(result);
  const frameStorageLine = result.inputFrameStorageFormat ?
    `序列格式：${formatFrameStorageFormat(result.inputFrameStorageFormat, result.inputFrameExtension)}` :
    "";

  const statusMessage = [
    "导出视频：成功",
    result.sourceType === "directory" ? `导出源：${result.sourcePath}` : `导出源：录制时间线`,
    `帧数：${result.frameCount}`,
    `目标时长：${formatIntervalSeconds(exportProfile.durationSeconds)}`,
    `每帧停留：${formatSecondsValue(result.holdSeconds)} 秒`,
    `输出帧率：${result.outputFps}`,
    frameStorageLine,
    `尺寸：${result.outputWidth} x ${result.outputHeight}`,
    progressText,
    `输出：${result.outputPath}`,
    `日志：${result.logPath}`,
    result.progressPath ? `进度日志：${result.progressPath}` : "",
  ].filter(Boolean).join("\n");

  const noticeLines = [
    result.sourceType === "directory" ? "导出源：序列帧目录" : "导出源：录制时间线",
    result.sourceType === "directory" ? `源路径：${result.sourcePath}` : `源路径：${result.sourcePath}`,
    `帧数：${result.frameCount}`,
    `视频时长：${formatIntervalSeconds(result.targetDurationSeconds || exportProfile.durationSeconds)}`,
    `每帧停留：${formatSecondsValue(result.holdSeconds)} 秒`,
    sequenceFramesPerSecond > 0 ? `每秒序列帧：${formatNumberValue(sequenceFramesPerSecond)} 张` : "",
    `输出帧率：${result.outputFps || exportProfile.outputFps} fps`,
    `质量：${options.frameQualityLabel}`,
    `分辨率：${options.captureResolutionLabel}`,
    frameStorageLine,
    `输出尺寸：${result.outputWidth} x ${result.outputHeight}`,
    `输出文件：${options.outputFileName}`,
    `输出路径：${result.outputPath}`,
    progressText,
    result.logPath ? `日志：${result.logPath}` : "",
    result.progressPath ? `进度日志：${result.progressPath}` : "",
  ].filter(Boolean);

  return {
    statusMessage,
    noticeTitle: "导出完成",
    noticeLines,
    noticeTone: "success",
  };
}

function buildExportFailureMessages(errorText) {
  return {
    statusMessage: `导出视频失败：${errorText}`,
    noticeTitle: "导出失败",
    noticeLines: [errorText],
    noticeTone: "error",
  };
}

function buildStepCaptureSuccessStatus(options) {
  const result = options.result || {};
  return [
    `${options.label}：成功`,
    "输出：原图尺寸 PNG 无损步骤图",
    `步骤图：${result.frameName}`,
    `张数：${result.frameCount}`,
    `尺寸：${result.width} x ${result.height}`,
    result.encodedByteLength ? `文件大小：${result.encodedByteLength} 字节` : "",
    `源缓冲区：${result.sourceByteLength || result.byteLength} 字节`,
    `文件：${result.framePath}`,
    ...(options.diagnosticsLines || []),
  ].filter(Boolean).join("\n");
}

function buildFrameCaptureSuccessStatus(options) {
  const result = options.result || {};
  return [
    `${options.label}：成功`,
    `尺寸：${result.width} x ${result.height}`,
    `录制：时间线`,
    `帧：${options.frameIndexText} (${result.frameName})`,
    `帧数：${result.frameCount}`,
    `上次采样：${result.lastCaptureAt}`,
    result.frameStorageFormat ? `帧格式：${options.frameStorageFormatLabel}` : "",
    result.frameQualityPreset ? `压缩质量：${options.frameQualityLabel}` : "",
    result.encodedByteLength ? `文件大小：${result.encodedByteLength} 字节` : "",
    result.sourceByteLength ? `源缓冲区：${result.sourceByteLength} 字节` : `源缓冲区：${result.byteLength} 字节`,
    `帧文件：${result.framePath}`,
    `元数据：${result.metadataPath}`,
    `Manifest: ${result.manifestPath}`,
    ...(options.diagnosticsLines || []),
  ].filter(Boolean).join("\n");
}

module.exports = {
  appendCaptureDiagnosticsLines,
  buildExportFailureMessages,
  buildExportSuccessMessages,
  buildFrameCaptureSuccessStatus,
  buildStepCaptureSuccessStatus,
  createCaptureDiagnosticsLines,
  createExportProgressSnapshot,
  formatError,
  formatExportProgress,
  formatFrameStorageFormat,
  formatIntervalSeconds,
  formatNumberValue,
  formatSecondsValue,
  logCaptureDiagnostics,
};
