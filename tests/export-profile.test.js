"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const exportProfile = require(path.join(repoRoot, "uxp", "domain", "export-profile.js"));

assert.strictEqual(exportProfile.DEFAULT_EXPORT_DURATION_SECONDS, contract.export.defaultDurationSeconds);
assert.strictEqual(exportProfile.DEFAULT_EXPORT_HOLD_SECONDS, contract.export.defaultHoldSeconds);
assert.strictEqual(exportProfile.DEFAULT_EXPORT_OUTPUT_FPS, contract.export.defaultOutputFps);
assert.strictEqual(exportProfile.DEFAULT_EXPORT_MAX_WIDTH, contract.export.defaultMaxWidth);
assert.strictEqual(exportProfile.DEFAULT_EXPORT_CRF, contract.export.defaultCrf);
assert.strictEqual(exportProfile.MIN_EXPORT_DURATION_SECONDS, contract.export.minDurationSeconds);
assert.strictEqual(exportProfile.MAX_EXPORT_DURATION_SECONDS, contract.export.maxDurationSeconds);
assert.strictEqual(exportProfile.MAX_EXPORT_HOLD_SECONDS, contract.export.maxHoldSeconds);
assert.strictEqual(exportProfile.MIN_EXPORT_MAX_WIDTH, contract.export.minMaxWidth);
assert.strictEqual(exportProfile.MAX_EXPORT_MAX_WIDTH, contract.export.maxMaxWidth);
assert.strictEqual(exportProfile.MIN_EXPORT_OUTPUT_FPS, contract.export.minOutputFps);
assert.strictEqual(exportProfile.MAX_EXPORT_OUTPUT_FPS, contract.export.maxOutputFps);

assert.deepStrictEqual(
  exportProfile.getDurationParts(125.5),
  { minutes: 2, seconds: 5.5 },
  "duration parts should split decimal seconds without losing precision",
);

assert.deepStrictEqual(
  exportProfile.calculateExportTiming(10, 5, 30),
  {
    durationSeconds: 10,
    frameCount: 5,
    sourceFrameCount: 5,
    exportedFrameCount: 5,
    skippedFrameCount: 0,
    maxExportedFrameCount: 300,
    samplingApplied: false,
    outputFps: 30,
    holdSeconds: 2,
    sourceHoldSeconds: 2,
    exportedHoldSeconds: 2,
    sequenceFramesPerSecond: 0.5,
    exportedFramesPerSecond: 0.5,
    outputFramesPerSequenceFrame: 60,
    outputFramesPerExportedFrame: 60,
    fullFrameMinimumDurationSeconds: 5 / 30,
    minimumDurationSeconds: 1 / 30,
  },
  "export timing should derive hold seconds from target duration and frame count",
);

assert.strictEqual(
  exportProfile.calculateHoldSeconds(30, 15, 30),
  2,
  "hold seconds should be the target duration divided by sequence frames",
);

assert.deepStrictEqual(
  exportProfile.calculateExportTiming(1, 120, 30),
  {
    durationSeconds: 1,
    frameCount: 120,
    sourceFrameCount: 120,
    exportedFrameCount: 30,
    skippedFrameCount: 90,
    maxExportedFrameCount: 30,
    samplingApplied: true,
    outputFps: 30,
    holdSeconds: 1 / 120,
    sourceHoldSeconds: 1 / 120,
    exportedHoldSeconds: 1 / 30,
    sequenceFramesPerSecond: 120,
    exportedFramesPerSecond: 30,
    outputFramesPerSequenceFrame: 0.25,
    outputFramesPerExportedFrame: 1,
    fullFrameMinimumDurationSeconds: 4,
    minimumDurationSeconds: 1 / 30,
  },
  "target duration shorter than the full source cadence should uniformly sample representative frames",
);

assert.deepStrictEqual(
  exportProfile.createExportProfile({
    durationSeconds: 20,
    frameCount: 10,
    outputFps: 30,
    maxWidth: 4096,
    crf: 22,
  }),
  {
    durationSeconds: 20,
    holdSeconds: 2,
    outputFps: 30,
    maxWidth: 4096,
    crf: 22,
    frameCount: 10,
    sourceFrameCount: 10,
    exportedFrameCount: 10,
    skippedFrameCount: 0,
    maxExportedFrameCount: 600,
    samplingApplied: false,
    sourceHoldSeconds: 2,
    exportedHoldSeconds: 2,
    minimumDurationSeconds: 1 / 30,
    fullFrameMinimumDurationSeconds: 10 / 30,
    sequenceFramesPerSecond: 0.5,
    exportedFramesPerSecond: 0.5,
    outputFramesPerSequenceFrame: 60,
    outputFramesPerExportedFrame: 60,
  },
  "normalized export profiles should preserve the user-facing export timing model",
);

assert.strictEqual(exportProfile.normalizeDurationSeconds(-5), contract.export.minDurationSeconds);
assert.strictEqual(exportProfile.normalizeDurationSeconds(999999), contract.export.maxDurationSeconds);
assert.strictEqual(exportProfile.normalizeHoldSeconds(-5), exportProfile.MIN_EXPORT_HOLD_SECONDS);
assert.strictEqual(exportProfile.normalizeHoldSeconds(999999), contract.export.maxHoldSeconds);
assert.strictEqual(exportProfile.normalizeOutputFps(0), contract.export.minOutputFps);
assert.strictEqual(exportProfile.normalizeOutputFps(999), contract.export.maxOutputFps);
assert.strictEqual(exportProfile.normalizeMaxWidth(1), contract.export.minMaxWidth);
assert.strictEqual(exportProfile.normalizeMaxWidth(999999), contract.export.maxMaxWidth);
assert.strictEqual(exportProfile.normalizeCrf(-5), 0);
assert.strictEqual(exportProfile.normalizeCrf(99), 51);
