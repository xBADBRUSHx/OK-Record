"use strict";

const RECORDER_STATES = Object.freeze({
  idle: "Idle",
  armed: "Armed",
  recording: "Recording",
  paused: "Paused",
  capturePending: "CapturePending",
  writing: "Writing",
  exporting: "Exporting",
  error: "Error",
});

const EXPORT_STATUSES = Object.freeze({
  idle: "Idle",
  exporting: "Exporting",
  success: "Success",
  failure: "Failure",
});

function createInitialRecorderState(defaults = {}) {
  return {
    state: RECORDER_STATES.idle,
    activeSession: null,
    frameCount: 0,
    lastCaptureAt: "",
    frameOutputDir: "",
    frameOutputDocumentKey: "",
    stepFrameCount: 0,
    lastStepCaptureAt: "",
    lastStepFramePath: "",
    exportSourceDir: "",
    exportSourceFrameCount: 0,
    exportSourceLastFramePath: "",
    exportSourceAspectRatioConsistent: true,
    exportSourceAspectRatioGroupsJson: "",
    intervalMinutes: defaults.intervalMinutes || (2 / 60),
    idleCaptureDelaySeconds: defaults.idleCaptureDelaySeconds || 0,
    idleCaptureMaxWaitSeconds: defaults.idleCaptureMaxWaitSeconds || 5,
    captureOnlyWhenChanged: defaults.captureOnlyWhenChanged !== false,
    documentDirty: false,
    lastDirtyAt: "",
    lastChangeEvent: "",
    lastSkipAt: "",
    skippedCaptureCount: 0,
    exportDurationSeconds: defaults.exportDurationSeconds || 10,
    exportHoldSeconds: defaults.exportHoldSeconds || 0.1,
    exportOutputFps: defaults.exportOutputFps || 30,
    exportMaxWidth: defaults.exportMaxWidth || 1920,
    frameQualityPreset: defaults.frameQualityPreset || "default",
    nextCaptureAt: "",
    lastExportPath: "",
    lastExportLogPath: "",
    lastExportProgress: null,
    lastExportStatus: EXPORT_STATUSES.idle,
    lastCaptureDiagnostics: null,
    lastError: "",
  };
}

function isRecorderBusy(state) {
  const currentState = state && state.state;
  return currentState === RECORDER_STATES.capturePending ||
    currentState === RECORDER_STATES.writing ||
    currentState === RECORDER_STATES.exporting;
}

function isRecordingPaused(state) {
  return Boolean(state && state.state === RECORDER_STATES.paused);
}

function isRecordingActiveOrPendingPause(state, runtime = {}) {
  return Boolean(runtime.recordingLoopActive) ||
    Boolean(runtime.recordingPauseRequested) ||
    Boolean(state && state.state === RECORDER_STATES.recording) ||
    isRecordingPaused(state);
}

function getRecordingFrameCount(state) {
  return Math.max(0, Math.floor(Number(state && state.frameCount) || 0));
}

function getRecordingFinalStateAfterCapture(runtime = {}) {
  if (runtime.recordingPauseRequested) {
    return RECORDER_STATES.paused;
  }
  if (runtime.recordingLoopActive) {
    return RECORDER_STATES.recording;
  }
  return RECORDER_STATES.idle;
}

function applyPatch(state, patch) {
  return {
    ...state,
    ...patch,
  };
}

function startRecordingState(state, settings = {}) {
  if (isRecorderBusy(state) || state.state === RECORDER_STATES.recording) {
    throw new Error(`Recorder is not ready to start from state ${state.state}.`);
  }
  return applyPatch(state, {
    state: RECORDER_STATES.recording,
    intervalMinutes: settings.intervalMinutes || state.intervalMinutes,
    idleCaptureDelaySeconds: settings.idleCaptureDelaySeconds ?? state.idleCaptureDelaySeconds,
    idleCaptureMaxWaitSeconds: settings.idleCaptureMaxWaitSeconds ?? state.idleCaptureMaxWaitSeconds,
    captureOnlyWhenChanged: settings.captureOnlyWhenChanged ?? state.captureOnlyWhenChanged,
    nextCaptureAt: "",
    lastExportPath: "",
    lastExportLogPath: "",
    lastExportProgress: null,
    lastExportStatus: EXPORT_STATUSES.idle,
    lastSkipAt: "",
    skippedCaptureCount: 0,
    lastError: "",
  });
}

function pauseRecordingState(state) {
  if (state.state !== RECORDER_STATES.recording) {
    throw new Error(`Recorder is not recording from state ${state.state}.`);
  }
  return applyPatch(state, {
    state: RECORDER_STATES.paused,
    nextCaptureAt: "",
    lastError: "",
  });
}

function resumeRecordingState(state, settings = {}) {
  if (state.state !== RECORDER_STATES.paused) {
    throw new Error(`Recorder is not paused from state ${state.state}.`);
  }
  if (!state.activeSession || getRecordingFrameCount(state) <= 0) {
    throw new Error("Recorder has no paused session to resume.");
  }
  return applyPatch(state, {
    state: RECORDER_STATES.recording,
    intervalMinutes: settings.intervalMinutes || state.intervalMinutes,
    idleCaptureDelaySeconds: settings.idleCaptureDelaySeconds ?? state.idleCaptureDelaySeconds,
    idleCaptureMaxWaitSeconds: settings.idleCaptureMaxWaitSeconds ?? state.idleCaptureMaxWaitSeconds,
    captureOnlyWhenChanged: settings.captureOnlyWhenChanged ?? state.captureOnlyWhenChanged,
    nextCaptureAt: "",
    lastError: "",
  });
}

function stopRecordingState(state) {
  return applyPatch(state, {
    state: RECORDER_STATES.idle,
    nextCaptureAt: "",
    documentDirty: false,
    lastError: "",
  });
}

module.exports = {
  EXPORT_STATUSES,
  RECORDER_STATES,
  applyPatch,
  createInitialRecorderState,
  getRecordingFinalStateAfterCapture,
  getRecordingFrameCount,
  isRecorderBusy,
  isRecordingActiveOrPendingPause,
  isRecordingPaused,
  pauseRecordingState,
  resumeRecordingState,
  startRecordingState,
  stopRecordingState,
};
