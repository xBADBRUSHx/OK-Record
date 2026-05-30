"use strict";

const DEFAULT_EXPORT_DURATION_SECONDS = 10;
const DEFAULT_EXPORT_HOLD_SECONDS = 0.1;
const DEFAULT_EXPORT_OUTPUT_FPS = 30;
const DEFAULT_EXPORT_MAX_WIDTH = 1920;
const DEFAULT_EXPORT_CRF = 18;
const MIN_EXPORT_DURATION_SECONDS = 1;
const MAX_EXPORT_DURATION_SECONDS = 3600;
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
  return clampNumber(value, DEFAULT_EXPORT_HOLD_SECONDS, 0.001, MAX_EXPORT_HOLD_SECONDS);
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

function calculateExportTiming(durationSeconds, frameCount, outputFps) {
  const normalizedDurationSeconds = normalizeDurationSeconds(durationSeconds);
  const normalizedOutputFps = normalizeOutputFps(outputFps);
  const numericFrameCount = Math.floor(Number(frameCount));
  const exportFrameCount = Number.isFinite(numericFrameCount) && numericFrameCount > 0 ? numericFrameCount : 0;
  const safeFrameCount = Math.max(1, exportFrameCount);
  const holdSeconds = normalizedDurationSeconds / safeFrameCount;

  return {
    durationSeconds: normalizedDurationSeconds,
    frameCount: safeFrameCount,
    sourceFrameCount: exportFrameCount,
    outputFps: normalizedOutputFps,
    holdSeconds,
    sequenceFramesPerSecond: exportFrameCount > 0 ? exportFrameCount / normalizedDurationSeconds : 0,
    outputFramesPerSequenceFrame: holdSeconds * normalizedOutputFps,
    minimumDurationSeconds: safeFrameCount / normalizedOutputFps,
  };
}

function calculateHoldSeconds(durationSeconds, frameCount, outputFps) {
  const timing = calculateExportTiming(durationSeconds, frameCount, outputFps);

  if (timing.sourceFrameCount > 0 && timing.durationSeconds < timing.minimumDurationSeconds) {
    throw new Error(
      `Export duration is too short for ${timing.frameCount} frames at ${timing.outputFps} fps.`,
    );
  }
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
    minimumDurationSeconds: timing.minimumDurationSeconds,
    sequenceFramesPerSecond: timing.sequenceFramesPerSecond,
    outputFramesPerSequenceFrame: timing.outputFramesPerSequenceFrame,
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
  MAX_EXPORT_HOLD_SECONDS,
  MIN_EXPORT_MAX_WIDTH,
  MAX_EXPORT_MAX_WIDTH,
  MIN_EXPORT_OUTPUT_FPS,
  MAX_EXPORT_OUTPUT_FPS,
  MIN_EXPORT_CRF,
  MAX_EXPORT_CRF,
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
