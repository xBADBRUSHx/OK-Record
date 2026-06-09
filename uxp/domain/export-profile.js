"use strict";

const DEFAULT_EXPORT_DURATION_SECONDS = 10;
const DEFAULT_EXPORT_HOLD_SECONDS = 0.1;
const DEFAULT_EXPORT_OUTPUT_FPS = 30;
const DEFAULT_EXPORT_MAX_WIDTH = 1920;
const DEFAULT_EXPORT_CRF = 18;
const MIN_EXPORT_DURATION_SECONDS = 1;
const MAX_EXPORT_DURATION_SECONDS = 3600;
const MIN_EXPORT_HOLD_SECONDS = 0.000001;
const MAX_EXPORT_HOLD_SECONDS = 3600;
const MIN_EXPORT_MAX_WIDTH = 16;
const MAX_EXPORT_MAX_WIDTH = 16384;
const MIN_EXPORT_OUTPUT_FPS = 1;
const MAX_EXPORT_OUTPUT_FPS = 120;
const MIN_EXPORT_CRF = 0;
const MAX_EXPORT_CRF = 51;
const SECONDS_PER_MINUTE = 60;

function toFiniteNumber(value, fallbackValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallbackValue;
}

function clampNumber(value, fallbackValue, minValue, maxValue) {
  const number = toFiniteNumber(value, fallbackValue);
  return Math.min(maxValue, Math.max(minValue, number));
}

function clampInteger(value, fallbackValue, minValue, maxValue) {
  return Math.round(clampNumber(value, fallbackValue, minValue, maxValue));
}

function normalizeDurationSeconds(value) {
  return clampNumber(
    value,
    DEFAULT_EXPORT_DURATION_SECONDS,
    MIN_EXPORT_DURATION_SECONDS,
    MAX_EXPORT_DURATION_SECONDS,
  );
}

function normalizeHoldSeconds(value) {
  return clampNumber(value, DEFAULT_EXPORT_HOLD_SECONDS, MIN_EXPORT_HOLD_SECONDS, MAX_EXPORT_HOLD_SECONDS);
}

function normalizeOutputFps(value) {
  return clampInteger(value, DEFAULT_EXPORT_OUTPUT_FPS, MIN_EXPORT_OUTPUT_FPS, MAX_EXPORT_OUTPUT_FPS);
}

function normalizeMaxWidth(value) {
  return clampInteger(value, DEFAULT_EXPORT_MAX_WIDTH, MIN_EXPORT_MAX_WIDTH, MAX_EXPORT_MAX_WIDTH);
}

function normalizeCrf(value) {
  return clampInteger(value, DEFAULT_EXPORT_CRF, MIN_EXPORT_CRF, MAX_EXPORT_CRF);
}

function getDurationParts(durationSeconds) {
  const normalizedSeconds = Math.max(0, Math.round(Number(durationSeconds) * 1000) / 1000);
  let minutes = Math.floor(normalizedSeconds / SECONDS_PER_MINUTE);
  let seconds = Math.round((normalizedSeconds - (minutes * SECONDS_PER_MINUTE)) * 1000) / 1000;
  if (seconds >= SECONDS_PER_MINUTE) {
    minutes += 1;
    seconds = 0;
  }
  return { minutes, seconds };
}

function calculateMaxExportedFrameCount(durationSeconds, outputFps) {
  const normalizedDurationSeconds = normalizeDurationSeconds(durationSeconds);
  const normalizedOutputFps = normalizeOutputFps(outputFps);
  return Math.max(1, Math.floor((normalizedDurationSeconds * normalizedOutputFps) + 0.0000001));
}

function calculateExportTiming(durationSeconds, frameCount, outputFps) {
  const normalizedDurationSeconds = normalizeDurationSeconds(durationSeconds);
  const normalizedOutputFps = normalizeOutputFps(outputFps);
  const numericFrameCount = Math.floor(Number(frameCount));
  const sourceFrameCount = Number.isFinite(numericFrameCount) && numericFrameCount > 0 ? numericFrameCount : 0;
  const safeSourceFrameCount = Math.max(1, sourceFrameCount);
  const maxExportedFrameCount = calculateMaxExportedFrameCount(normalizedDurationSeconds, normalizedOutputFps);
  const exportedFrameCount = sourceFrameCount > 0 ?
    Math.min(sourceFrameCount, maxExportedFrameCount) :
    0;
  const safeExportedFrameCount = Math.max(1, exportedFrameCount);
  const sourceHoldSeconds = normalizedDurationSeconds / safeSourceFrameCount;
  const exportedHoldSeconds = normalizedDurationSeconds / safeExportedFrameCount;

  return {
    durationSeconds: normalizedDurationSeconds,
    frameCount: safeSourceFrameCount,
    sourceFrameCount,
    exportedFrameCount,
    skippedFrameCount: Math.max(0, sourceFrameCount - exportedFrameCount),
    maxExportedFrameCount,
    samplingApplied: sourceFrameCount > exportedFrameCount && exportedFrameCount > 0,
    outputFps: normalizedOutputFps,
    holdSeconds: sourceHoldSeconds,
    sourceHoldSeconds,
    exportedHoldSeconds,
    sequenceFramesPerSecond: sourceFrameCount > 0 ? sourceFrameCount / normalizedDurationSeconds : 0,
    exportedFramesPerSecond: exportedFrameCount > 0 ? exportedFrameCount / normalizedDurationSeconds : 0,
    outputFramesPerSequenceFrame: sourceHoldSeconds * normalizedOutputFps,
    outputFramesPerExportedFrame: exportedHoldSeconds * normalizedOutputFps,
    fullFrameMinimumDurationSeconds: sourceFrameCount > 0 ? sourceFrameCount / normalizedOutputFps : 1 / normalizedOutputFps,
    minimumDurationSeconds: 1 / normalizedOutputFps,
  };
}

function calculateHoldSeconds(durationSeconds, frameCount, outputFps) {
  const timing = calculateExportTiming(durationSeconds, frameCount, outputFps);

  if (!Number.isFinite(timing.holdSeconds) || timing.holdSeconds <= 0 || timing.holdSeconds > MAX_EXPORT_HOLD_SECONDS) {
    throw new Error(`Hold seconds must be greater than 0 and no more than ${MAX_EXPORT_HOLD_SECONDS}.`);
  }
  return timing.holdSeconds;
}

function createExportProfile(input = {}) {
  const outputFps = normalizeOutputFps(input.outputFps);
  const durationSeconds = normalizeDurationSeconds(input.durationSeconds);
  const frameCount = Math.max(0, Math.floor(toFiniteNumber(input.frameCount, 0)));
  const timing = calculateExportTiming(durationSeconds, frameCount, outputFps);

  return {
    durationSeconds,
    holdSeconds: calculateHoldSeconds(durationSeconds, frameCount, outputFps),
    outputFps,
    maxWidth: normalizeMaxWidth(input.maxWidth),
    crf: normalizeCrf(input.crf),
    frameCount: timing.frameCount,
    sourceFrameCount: timing.sourceFrameCount,
    exportedFrameCount: timing.exportedFrameCount,
    skippedFrameCount: timing.skippedFrameCount,
    maxExportedFrameCount: timing.maxExportedFrameCount,
    samplingApplied: timing.samplingApplied,
    sourceHoldSeconds: timing.sourceHoldSeconds,
    exportedHoldSeconds: timing.exportedHoldSeconds,
    minimumDurationSeconds: timing.minimumDurationSeconds,
    fullFrameMinimumDurationSeconds: timing.fullFrameMinimumDurationSeconds,
    sequenceFramesPerSecond: timing.sequenceFramesPerSecond,
    exportedFramesPerSecond: timing.exportedFramesPerSecond,
    outputFramesPerSequenceFrame: timing.outputFramesPerSequenceFrame,
    outputFramesPerExportedFrame: timing.outputFramesPerExportedFrame,
  };
}

module.exports = {
  DEFAULT_EXPORT_DURATION_SECONDS,
  DEFAULT_EXPORT_HOLD_SECONDS,
  DEFAULT_EXPORT_OUTPUT_FPS,
  DEFAULT_EXPORT_MAX_WIDTH,
  DEFAULT_EXPORT_CRF,
  MIN_EXPORT_DURATION_SECONDS,
  MAX_EXPORT_DURATION_SECONDS,
  MIN_EXPORT_HOLD_SECONDS,
  MAX_EXPORT_HOLD_SECONDS,
  MIN_EXPORT_MAX_WIDTH,
  MAX_EXPORT_MAX_WIDTH,
  MIN_EXPORT_OUTPUT_FPS,
  MAX_EXPORT_OUTPUT_FPS,
  MIN_EXPORT_CRF,
  MAX_EXPORT_CRF,
  calculateMaxExportedFrameCount,
  calculateExportTiming,
  calculateHoldSeconds,
  createExportProfile,
  getDurationParts,
  normalizeCrf,
  normalizeDurationSeconds,
  normalizeHoldSeconds,
  normalizeMaxWidth,
  normalizeOutputFps,
};
