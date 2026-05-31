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
    outputFps: 30,
    holdSeconds: 2,
    sequenceFramesPerSecond: 0.5,
    outputFramesPerSequenceFrame: 60,
    minimumDurationSeconds: 5 / 30,
  },
  "export timing should derive hold seconds from target duration and frame count",
);

assert.strictEqual(
  exportProfile.calculateHoldSeconds(30, 15, 30),
  2,
  "hold seconds should be the target duration divided by sequence frames",
);

assert.throws(
  () => exportProfile.calculateHoldSeconds(1, 120, 30),
  /too short/,
  "target duration shorter than output frame cadence must be rejected",
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
    minimumDurationSeconds: 10 / 30,
    sequenceFramesPerSecond: 0.5,
    outputFramesPerSequenceFrame: 60,
  },
  "normalized export profiles should preserve the user-facing export timing model",
);

assert.strictEqual(exportProfile.normalizeDurationSeconds(-5), contract.export.minDurationSeconds);
assert.strictEqual(exportProfile.normalizeDurationSeconds(999999), contract.export.maxDurationSeconds);
assert.strictEqual(exportProfile.normalizeHoldSeconds(-5), 0.001);
assert.strictEqual(exportProfile.normalizeHoldSeconds(999999), contract.export.maxHoldSeconds);
assert.strictEqual(exportProfile.normalizeOutputFps(0), contract.export.minOutputFps);
assert.strictEqual(exportProfile.normalizeOutputFps(999), contract.export.maxOutputFps);
assert.strictEqual(exportProfile.normalizeMaxWidth(1), contract.export.minMaxWidth);
assert.strictEqual(exportProfile.normalizeMaxWidth(999999), contract.export.maxMaxWidth);
assert.strictEqual(exportProfile.normalizeCrf(-5), 0);
assert.strictEqual(exportProfile.normalizeCrf(99), 51);
