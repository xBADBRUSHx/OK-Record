"use strict";

const DOCUMENT_CHANGE_EVENTS = Object.freeze([
  "paint",
  "draw",
  "set",
  "make",
  "delete",
  "move",
  "transform",
  "paste",
  "pasteInto",
  "pasteOutside",
  "cut",
  "clearEvent",
  "crop",
  "canvasSize",
  "imageSize",
  "duplicate",
  "mergeLayersNew",
  "mergeLayers",
  "mergeVisible",
  "flattenImage",
  "rasterize",
  "rasterizeTypeLayer",
  "placeEvent",
  "convertMode",
  "applyStyle",
  "stroke",
  "gradientClassEvent",
  "hueSaturation",
  "levels",
  "curves",
  "invert",
  "undoEvent",
  "revert",
  "open",
  "close",
]);

function shouldSkipScheduledCaptureState(recorderState, options) {
  const force = Boolean(options && options.force);
  return !force &&
    Boolean(recorderState && recorderState.captureOnlyWhenChanged) &&
    !Boolean(recorderState && recorderState.documentDirty) &&
    Number(recorderState && recorderState.frameCount) > 0;
}

function createSkippedCapturePatch(recorderState, skippedAt, recordingState) {
  if (!recordingState) {
    throw new Error("recordingState is required");
  }

  return {
    state: recordingState,
    lastSkipAt: skippedAt,
    skippedCaptureCount: Number(recorderState && recorderState.skippedCaptureCount || 0) + 1,
    lastError: "",
  };
}

function didDocumentChangeDuringCapture(captureStartedAtChangeGeneration, currentDocumentChangeGeneration) {
  return currentDocumentChangeGeneration !== captureStartedAtChangeGeneration;
}

function shouldDeferCaptureForIdle(recorderState, options) {
  const force = Boolean(options && options.force);
  const idleAwareEnabled = options && options.idleAwareEnabled !== false;
  const photoshopIdle = Boolean(options && options.photoshopIdle);
  const idleCaptureDelaySeconds = Number(options && options.idleCaptureDelaySeconds);
  const idleCaptureMaxWaitSeconds = Number(options && options.idleCaptureMaxWaitSeconds);
  return idleAwareEnabled &&
    !force &&
    !photoshopIdle &&
    idleCaptureDelaySeconds > 0 &&
    idleCaptureMaxWaitSeconds > 0 &&
    Boolean(recorderState && recorderState.state === "Recording");
}

function isHostModalCollisionError(error) {
  if (Number(error && error.number) === 9) {
    return true;
  }

  const message = String(error && (error.message || error) || "").toLowerCase();
  return message.includes("host is in a modal state") ||
    message.includes("running a modal command");
}

module.exports = {
  DOCUMENT_CHANGE_EVENTS,
  shouldSkipScheduledCaptureState,
  createSkippedCapturePatch,
  didDocumentChangeDuringCapture,
  shouldDeferCaptureForIdle,
  isHostModalCollisionError,
};
