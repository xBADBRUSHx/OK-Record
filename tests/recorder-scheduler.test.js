"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const scheduler = require(path.join(repoRoot, "uxp", "recorder-scheduler.js"));

const recordingState = contract.recorderStates.find((state) => state === "Recording");

assert.deepStrictEqual(
  scheduler.DOCUMENT_CHANGE_EVENTS,
  contract.scheduler.documentChangeEvents,
  "document dirty events must route through the scheduler owner and match the shared contract",
);

function baseRecorderState(overrides = {}) {
  return {
    captureOnlyWhenChanged: true,
    documentDirty: false,
    frameCount: 1,
    skippedCaptureCount: 0,
    lastError: "previous error",
    ...overrides,
  };
}

assert.strictEqual(
  scheduler.shouldSkipScheduledCaptureState(baseRecorderState(), {}),
  true,
  "clean sessions with completed frames should skip scheduled duplicate captures",
);

assert.strictEqual(
  scheduler.shouldSkipScheduledCaptureState(baseRecorderState(), { force: true }),
  false,
  "forced captures must never be skipped",
);

assert.strictEqual(
  scheduler.shouldSkipScheduledCaptureState(baseRecorderState({ frameCount: 0 }), {}),
  false,
  "the first recording frame must not be skipped",
);

assert.strictEqual(
  scheduler.shouldSkipScheduledCaptureState(baseRecorderState({ documentDirty: true }), {}),
  false,
  "dirty documents must not skip the next scheduled capture",
);

assert.strictEqual(
  scheduler.shouldSkipScheduledCaptureState(baseRecorderState({ captureOnlyWhenChanged: false }), {}),
  false,
  "disabled change-only capture must write at every interval",
);

const skippedPatch = scheduler.createSkippedCapturePatch(
  baseRecorderState({ skippedCaptureCount: 3 }),
  "2026-05-22T00:00:00.000Z",
  recordingState,
);
assert.deepStrictEqual(
  skippedPatch,
  {
    state: "Recording",
    lastSkipAt: "2026-05-22T00:00:00.000Z",
    skippedCaptureCount: 4,
    lastError: "",
  },
  "skip patches should keep the recorder in Recording state and increment the skip count",
);

assert.strictEqual(
  scheduler.createSkippedCapturePatch({}, "2026-05-22T00:00:00.000Z", recordingState).skippedCaptureCount,
  1,
  "skip patches should treat a missing previous skip count as zero",
);

assert.throws(
  () => scheduler.createSkippedCapturePatch(baseRecorderState(), "2026-05-22T00:00:00.000Z", ""),
  /recordingState is required/,
  "skip patches must receive the owner-provided recording state label",
);

assert.strictEqual(
  scheduler.didDocumentChangeDuringCapture(5, 5),
  false,
  "capture completion should clear dirty state when no edit arrived during capture/write",
);

assert.strictEqual(
  scheduler.didDocumentChangeDuringCapture(5, 6),
  true,
  "capture completion must preserve dirty state when an edit arrived during capture/write",
);

assert.strictEqual(
  scheduler.shouldDeferCaptureForIdle(
    { state: "Recording" },
    { photoshopIdle: false, idleCaptureDelaySeconds: 1, idleCaptureMaxWaitSeconds: 15 },
  ),
  true,
  "recording interval captures should defer until Photoshop reports user idle",
);

assert.strictEqual(
  scheduler.shouldDeferCaptureForIdle(
    { state: "Recording" },
    { photoshopIdle: true, idleCaptureDelaySeconds: 1, idleCaptureMaxWaitSeconds: 15 },
  ),
  false,
  "idle-aware captures should run immediately when Photoshop is already idle",
);

assert.strictEqual(
  scheduler.shouldDeferCaptureForIdle(
    { state: "Recording" },
    { force: true, photoshopIdle: false, idleCaptureDelaySeconds: 1, idleCaptureMaxWaitSeconds: 15 },
  ),
  false,
  "forced captures should not wait for idle",
);

assert.strictEqual(
  scheduler.shouldDeferCaptureForIdle(
    { state: "Paused" },
    { photoshopIdle: false, idleCaptureDelaySeconds: 1, idleCaptureMaxWaitSeconds: 15 },
  ),
  false,
  "paused sessions should not enter idle-deferred capture",
);

assert.strictEqual(
  scheduler.shouldDeferCaptureForIdle(
    { state: "Recording" },
    { photoshopIdle: false, idleCaptureDelaySeconds: 0, idleCaptureMaxWaitSeconds: 15 },
  ),
  false,
  "zero delay should sample immediately without waiting for idle",
);

assert.strictEqual(
  scheduler.shouldDeferCaptureForIdle(
    { state: "Recording" },
    { photoshopIdle: false, idleCaptureDelaySeconds: 1, idleCaptureMaxWaitSeconds: 0 },
  ),
  false,
  "zero max wait should sample immediately without waiting for idle",
);
