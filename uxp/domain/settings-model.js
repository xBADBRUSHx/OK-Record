"use strict";

const PANEL_SETTINGS_SCHEMA = "ok-record.panel-settings.v1";
const PANEL_SETTINGS_FILENAME = "panel-settings.json";
const SECONDS_PER_MINUTE = 60;

const DEFAULT_INTERVAL_MINUTES = 2 / SECONDS_PER_MINUTE;
const MIN_INTERVAL_MINUTES = 1 / SECONDS_PER_MINUTE;
const MAX_INTERVAL_MINUTES = 1440;

const DEFAULT_IDLE_CAPTURE_DELAY_SECONDS = 0;
const MIN_IDLE_CAPTURE_DELAY_SECONDS = 0;
const MAX_IDLE_CAPTURE_DELAY_SECONDS = 3600;
const DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS = 5;
const MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS = 0;
const MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS = 3600;

const DEFAULT_CAPTURE_ONLY_WHEN_CHANGED = true;
const DEFAULT_EXPORT_DURATION_SECONDS = 10;
const DEFAULT_EXPORT_HOLD_SECONDS = 0.1;
const DEFAULT_EXPORT_OUTPUT_FPS = 30;
const MAX_EXPORT_HOLD_SECONDS = 3600;
const MIN_EXPORT_DURATION_SECONDS = 1;
const MAX_EXPORT_DURATION_SECONDS = 3600;
const DEFAULT_EXPORT_MAX_WIDTH = 1920;

const DEFAULT_CAPTURE_RESOLUTION_PRESET_ID = "1080p";
const CAPTURE_RESOLUTION_PRESETS = Object.freeze([
  { id: DEFAULT_CAPTURE_RESOLUTION_PRESET_ID, maxWidth: 1920 },
  { id: "2k", maxWidth: 2560 },
  { id: "4k", maxWidth: 3840 },
]);

const DEFAULT_FRAME_QUALITY_PRESET_ID = "default";
const FRAME_QUALITY_PRESET_IDS = Object.freeze(["low", DEFAULT_FRAME_QUALITY_PRESET_ID, "high", "lossless"]);

function toFiniteNumber(value, fallbackValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallbackValue;
}

function clampNumber(value, fallbackValue, minValue, maxValue) {
  const number = toFiniteNumber(value, fallbackValue);
  return Math.min(maxValue, Math.max(minValue, number));
}

function getCaptureResolutionPresetById(id) {
  return CAPTURE_RESOLUTION_PRESETS.find((preset) => preset.id === id) || null;
}

function getCaptureResolutionPresetIdForMaxWidth(maxWidth) {
  const width = Math.round(Number(maxWidth));
  const preset = CAPTURE_RESOLUTION_PRESETS.find((entry) => entry.maxWidth === width);
  return preset ? preset.id : DEFAULT_CAPTURE_RESOLUTION_PRESET_ID;
}

function normalizeCaptureResolutionMaxWidth(maxWidth) {
  return getCaptureResolutionPresetById(getCaptureResolutionPresetIdForMaxWidth(maxWidth)).maxWidth;
}

function normalizeFrameQualityPresetId(presetId) {
  return FRAME_QUALITY_PRESET_IDS.includes(presetId) ? presetId : DEFAULT_FRAME_QUALITY_PRESET_ID;
}

function normalizeString(value, fallbackValue = "") {
  return typeof value === "string" ? value : fallbackValue;
}

function createDefaultPanelSettings() {
  return {
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    idleCaptureDelaySeconds: DEFAULT_IDLE_CAPTURE_DELAY_SECONDS,
    idleCaptureMaxWaitSeconds: DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    frameOutputDir: "",
    frameOutputDocumentKey: "",
    exportSourceDir: "",
    captureOnlyWhenChanged: DEFAULT_CAPTURE_ONLY_WHEN_CHANGED,
    exportDurationSeconds: DEFAULT_EXPORT_DURATION_SECONDS,
    exportHoldSeconds: DEFAULT_EXPORT_HOLD_SECONDS,
    exportOutputFps: DEFAULT_EXPORT_OUTPUT_FPS,
    exportMaxWidth: DEFAULT_EXPORT_MAX_WIDTH,
    frameQualityPreset: DEFAULT_FRAME_QUALITY_PRESET_ID,
  };
}

function normalizePanelSettings(settings = {}) {
  const defaults = createDefaultPanelSettings();
  return {
    intervalMinutes: clampNumber(
      settings.intervalMinutes,
      defaults.intervalMinutes,
      MIN_INTERVAL_MINUTES,
      MAX_INTERVAL_MINUTES,
    ),
    idleCaptureDelaySeconds: clampNumber(
      settings.idleCaptureDelaySeconds,
      defaults.idleCaptureDelaySeconds,
      MIN_IDLE_CAPTURE_DELAY_SECONDS,
      MAX_IDLE_CAPTURE_DELAY_SECONDS,
    ),
    idleCaptureMaxWaitSeconds: clampNumber(
      settings.idleCaptureMaxWaitSeconds,
      defaults.idleCaptureMaxWaitSeconds,
      MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS,
      MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    ),
    frameOutputDir: normalizeString(settings.frameOutputDir, defaults.frameOutputDir),
    frameOutputDocumentKey: normalizeString(settings.frameOutputDocumentKey, defaults.frameOutputDocumentKey),
    exportSourceDir: normalizeString(settings.exportSourceDir, defaults.exportSourceDir),
    captureOnlyWhenChanged: DEFAULT_CAPTURE_ONLY_WHEN_CHANGED,
    exportDurationSeconds: clampNumber(
      settings.exportDurationSeconds,
      defaults.exportDurationSeconds,
      MIN_EXPORT_DURATION_SECONDS,
      MAX_EXPORT_DURATION_SECONDS,
    ),
    exportHoldSeconds: clampNumber(
      settings.exportHoldSeconds,
      defaults.exportHoldSeconds,
      1 / DEFAULT_EXPORT_OUTPUT_FPS,
      MAX_EXPORT_HOLD_SECONDS,
    ),
    exportOutputFps: DEFAULT_EXPORT_OUTPUT_FPS,
    exportMaxWidth: normalizeCaptureResolutionMaxWidth(settings.exportMaxWidth),
    frameQualityPreset: normalizeFrameQualityPresetId(settings.frameQualityPreset),
  };
}

function parsePersistedPanelSettings(input) {
  const data = typeof input === "string" ? JSON.parse(input) : input;
  if (!data || data.schema !== PANEL_SETTINGS_SCHEMA || !data.settings) {
    throw new Error("Panel settings schema is unsupported.");
  }
  return normalizePanelSettings(data.settings);
}

function createPersistedPanelSettings(state = {}, savedAt = new Date().toISOString()) {
  const settings = normalizePanelSettings(state);
  return {
    schema: PANEL_SETTINGS_SCHEMA,
    savedAt,
    settings: {
      intervalMinutes: settings.intervalMinutes,
      idleCaptureDelaySeconds: settings.idleCaptureDelaySeconds,
      idleCaptureMaxWaitSeconds: settings.idleCaptureMaxWaitSeconds,
      frameOutputDir: settings.frameOutputDir,
      frameOutputDocumentKey: settings.frameOutputDocumentKey,
      exportSourceDir: settings.exportSourceDir,
      captureOnlyWhenChanged: DEFAULT_CAPTURE_ONLY_WHEN_CHANGED,
      exportDurationSeconds: settings.exportDurationSeconds,
      exportHoldSeconds: settings.exportHoldSeconds,
      exportMaxWidth: settings.exportMaxWidth,
      frameQualityPreset: settings.frameQualityPreset,
    },
  };
}

module.exports = {
  PANEL_SETTINGS_SCHEMA,
  PANEL_SETTINGS_FILENAME,
  DEFAULT_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  DEFAULT_IDLE_CAPTURE_DELAY_SECONDS,
  MIN_IDLE_CAPTURE_DELAY_SECONDS,
  MAX_IDLE_CAPTURE_DELAY_SECONDS,
  DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS,
  MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS,
  MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS,
  DEFAULT_CAPTURE_ONLY_WHEN_CHANGED,
  DEFAULT_EXPORT_DURATION_SECONDS,
  DEFAULT_EXPORT_HOLD_SECONDS,
  DEFAULT_EXPORT_OUTPUT_FPS,
  MAX_EXPORT_HOLD_SECONDS,
  MIN_EXPORT_DURATION_SECONDS,
  MAX_EXPORT_DURATION_SECONDS,
  DEFAULT_EXPORT_MAX_WIDTH,
  DEFAULT_CAPTURE_RESOLUTION_PRESET_ID,
  DEFAULT_FRAME_QUALITY_PRESET_ID,
  FRAME_QUALITY_PRESET_IDS,
  CAPTURE_RESOLUTION_PRESETS,
  createDefaultPanelSettings,
  createPersistedPanelSettings,
  normalizeCaptureResolutionMaxWidth,
  normalizeFrameQualityPresetId,
  normalizePanelSettings,
  parsePersistedPanelSettings,
};
