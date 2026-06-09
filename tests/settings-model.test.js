"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const settingsModel = require(path.join(repoRoot, "uxp", "domain", "settings-model.js"));

assert.strictEqual(settingsModel.PANEL_SETTINGS_SCHEMA, contract.panelSettings.schema);
assert.strictEqual(settingsModel.PANEL_SETTINGS_FILENAME, contract.panelSettings.filename);
assert.strictEqual(settingsModel.DEFAULT_INTERVAL_MINUTES, contract.scheduler.defaultIntervalMinutes);
assert.strictEqual(settingsModel.MIN_INTERVAL_MINUTES, contract.scheduler.minIntervalMinutes);
assert.strictEqual(settingsModel.DEFAULT_IDLE_CAPTURE_DELAY_SECONDS, contract.scheduler.defaultIdleCaptureDelaySeconds);
assert.strictEqual(settingsModel.MIN_IDLE_CAPTURE_DELAY_SECONDS, contract.scheduler.minIdleCaptureDelaySeconds);
assert.strictEqual(settingsModel.MAX_IDLE_CAPTURE_DELAY_SECONDS, contract.scheduler.maxIdleCaptureDelaySeconds);
assert.strictEqual(settingsModel.DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS, contract.scheduler.defaultIdleCaptureMaxWaitSeconds);
assert.strictEqual(settingsModel.MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS, contract.scheduler.minIdleCaptureMaxWaitSeconds);
assert.strictEqual(settingsModel.MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS, contract.scheduler.maxIdleCaptureMaxWaitSeconds);
assert.strictEqual(settingsModel.DEFAULT_CAPTURE_ONLY_WHEN_CHANGED, contract.scheduler.defaultCaptureOnlyWhenChanged);
assert.strictEqual(settingsModel.DEFAULT_EXPORT_DURATION_SECONDS, contract.export.defaultDurationSeconds);
assert.strictEqual(settingsModel.DEFAULT_EXPORT_HOLD_SECONDS, contract.export.defaultHoldSeconds);
assert.strictEqual(settingsModel.DEFAULT_EXPORT_OUTPUT_FPS, contract.export.defaultOutputFps);
assert.strictEqual(settingsModel.DEFAULT_EXPORT_MAX_WIDTH, contract.export.defaultMaxWidth);
assert.strictEqual(settingsModel.MIN_EXPORT_HOLD_SECONDS, 0.000001);
assert.strictEqual(settingsModel.DEFAULT_CAPTURE_RESOLUTION_PRESET_ID, "1080p");
assert.strictEqual(settingsModel.DEFAULT_FRAME_QUALITY_PRESET_ID, contract.frame.defaultQualityPreset);
assert.deepStrictEqual(
  settingsModel.FRAME_QUALITY_PRESETS,
  contract.frame.qualityPresets.map((preset) => ({
    id: preset.id,
    storageFormat: preset.storageFormat,
    frameExtension: preset.extension,
    jpegQuality: preset.jpegQuality,
  })),
);
assert.deepStrictEqual(
  settingsModel.FRAME_QUALITY_PRESET_IDS,
  contract.frame.qualityPresets.map((preset) => preset.id),
);
assert.deepStrictEqual(settingsModel.CAPTURE_RESOLUTION_PRESETS, [
  { id: "1080p", maxWidth: 1920 },
  { id: "2k", maxWidth: 2560 },
  { id: "4k", maxWidth: 3840 },
]);
assert.strictEqual(settingsModel.normalizeCaptureResolutionMaxWidth(1920), 1920);
assert.strictEqual(settingsModel.normalizeCaptureResolutionMaxWidth("2560"), 2560);
assert.strictEqual(settingsModel.normalizeCaptureResolutionMaxWidth(1234), contract.export.defaultMaxWidth);
assert.strictEqual(settingsModel.normalizeFrameQualityPresetId("high"), "high");
assert.strictEqual(settingsModel.normalizeFrameQualityPresetId("unknown"), contract.frame.defaultQualityPreset);

const defaults = settingsModel.createDefaultPanelSettings();
assert.deepStrictEqual(defaults, {
  intervalMinutes: contract.scheduler.defaultIntervalMinutes,
  idleCaptureDelaySeconds: contract.scheduler.defaultIdleCaptureDelaySeconds,
  idleCaptureMaxWaitSeconds: contract.scheduler.defaultIdleCaptureMaxWaitSeconds,
  frameOutputDir: "",
  frameOutputDocumentKey: "",
  exportSourceDir: "",
  captureOnlyWhenChanged: true,
  exportDurationSeconds: contract.export.defaultDurationSeconds,
  exportHoldSeconds: contract.export.defaultHoldSeconds,
  exportOutputFps: contract.export.defaultOutputFps,
  exportMaxWidth: contract.export.defaultMaxWidth,
  frameQualityPreset: contract.frame.defaultQualityPreset,
});

const normalized = settingsModel.normalizePanelSettings({
  intervalMinutes: 999999,
  idleCaptureDelaySeconds: -10,
  idleCaptureMaxWaitSeconds: 999999,
  frameOutputDir: "E:\\frames",
  frameOutputDocumentKey: "e:\\doc\\image.psd",
  exportSourceDir: "E:\\old",
  captureOnlyWhenChanged: false,
  exportDurationSeconds: 0,
  exportHoldSeconds: 0,
  exportOutputFps: 999,
  exportMaxWidth: 3840,
  frameQualityPreset: "lossless",
});
assert.strictEqual(normalized.intervalMinutes, settingsModel.MAX_INTERVAL_MINUTES);
assert.strictEqual(normalized.idleCaptureDelaySeconds, contract.scheduler.minIdleCaptureDelaySeconds);
assert.strictEqual(normalized.idleCaptureMaxWaitSeconds, contract.scheduler.maxIdleCaptureMaxWaitSeconds);
assert.strictEqual(normalized.frameOutputDir, "E:\\frames");
assert.strictEqual(normalized.frameOutputDocumentKey, "e:\\doc\\image.psd");
assert.strictEqual(normalized.exportSourceDir, "E:\\old");
assert.strictEqual(normalized.captureOnlyWhenChanged, true);
assert.strictEqual(normalized.exportDurationSeconds, contract.export.minDurationSeconds);
assert.strictEqual(normalized.exportHoldSeconds, settingsModel.MIN_EXPORT_HOLD_SECONDS);
assert.strictEqual(normalized.exportOutputFps, contract.export.defaultOutputFps);
assert.strictEqual(normalized.exportMaxWidth, 3840);
assert.strictEqual(normalized.frameQualityPreset, "lossless");

const parsed = settingsModel.parsePersistedPanelSettings(JSON.stringify({
  schema: contract.panelSettings.schema,
  settings: {
    intervalMinutes: "5",
    idleCaptureDelaySeconds: "2",
    idleCaptureMaxWaitSeconds: "20",
    frameOutputDir: "D:\\recordings",
    frameOutputDocumentKey: "d:\\art\\mock.psd",
    exportSourceDir: "D:\\source",
    captureOnlyWhenChanged: false,
    exportDurationSeconds: "60",
    exportHoldSeconds: "3",
    exportOutputFps: 120,
    exportMaxWidth: 1234,
    frameQualityPreset: "unknown",
  },
}));
assert.strictEqual(parsed.intervalMinutes, 5);
assert.strictEqual(parsed.idleCaptureDelaySeconds, 2);
assert.strictEqual(parsed.idleCaptureMaxWaitSeconds, 20);
assert.strictEqual(parsed.frameOutputDir, "D:\\recordings");
assert.strictEqual(parsed.frameOutputDocumentKey, "d:\\art\\mock.psd");
assert.strictEqual(parsed.captureOnlyWhenChanged, true);
assert.strictEqual(parsed.exportOutputFps, contract.export.defaultOutputFps);
assert.strictEqual(parsed.exportMaxWidth, contract.export.defaultMaxWidth);
assert.strictEqual(parsed.frameQualityPreset, contract.frame.defaultQualityPreset);

assert.throws(
  () => settingsModel.parsePersistedPanelSettings({ schema: "wrong", settings: {} }),
  /schema/,
  "settings parser should reject unsupported schema",
);

const snapshot = settingsModel.createPersistedPanelSettings({
  intervalMinutes: 5,
  idleCaptureDelaySeconds: 2,
  idleCaptureMaxWaitSeconds: 20,
  frameOutputDir: "D:\\recordings",
  frameOutputDocumentKey: "d:\\art\\mock.psd",
  exportSourceDir: "D:\\source",
  captureOnlyWhenChanged: false,
  exportDurationSeconds: 60,
  exportHoldSeconds: 3,
  exportOutputFps: 120,
  exportMaxWidth: 2560,
  frameQualityPreset: "high",
}, "2026-05-29T00:00:00.000Z");
assert.strictEqual(snapshot.schema, contract.panelSettings.schema);
assert.strictEqual(snapshot.savedAt, "2026-05-29T00:00:00.000Z");
assert.deepStrictEqual(snapshot.settings, {
  intervalMinutes: 5,
  idleCaptureDelaySeconds: 2,
  idleCaptureMaxWaitSeconds: 20,
  frameOutputDir: "D:\\recordings",
  frameOutputDocumentKey: "d:\\art\\mock.psd",
  exportSourceDir: "D:\\source",
  captureOnlyWhenChanged: true,
  exportDurationSeconds: 60,
  exportHoldSeconds: 3,
  exportMaxWidth: 2560,
  frameQualityPreset: "high",
});
assert.strictEqual(Object.prototype.hasOwnProperty.call(snapshot.settings, "exportOutputFps"), false);
