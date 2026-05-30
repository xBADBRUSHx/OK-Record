"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const recorder = require(path.join(repoRoot, "uxp", "domain", "recorder-state.js"));

assert.deepStrictEqual(
  Object.values(recorder.RECORDER_STATES),
  contract.recorderStates,
  "recorder domain states should match the shared contract ordering",
);

const initial = recorder.createInitialRecorderState();
assert.strictEqual(initial.state, "Idle");
assert.strictEqual(initial.frameCount, 0);
assert.strictEqual(initial.captureOnlyWhenChanged, true);
assert.strictEqual(initial.intervalMinutes, contract.scheduler.defaultIntervalMinutes);
assert.strictEqual(initial.idleCaptureDelaySeconds, contract.scheduler.defaultIdleCaptureDelaySeconds);
assert.strictEqual(initial.idleCaptureMaxWaitSeconds, contract.scheduler.defaultIdleCaptureMaxWaitSeconds);
assert.strictEqual(initial.exportDurationSeconds, contract.export.defaultDurationSeconds);
assert.strictEqual(initial.exportHoldSeconds, contract.export.defaultHoldSeconds);
assert.strictEqual(initial.exportOutputFps, contract.export.defaultOutputFps);
assert.strictEqual(initial.exportMaxWidth, contract.export.defaultMaxWidth);
assert.strictEqual(initial.lastExportStatus, recorder.EXPORT_STATUSES.idle);

assert.strictEqual(recorder.isRecorderBusy({ state: "CapturePending" }), true);
assert.strictEqual(recorder.isRecorderBusy({ state: "Writing" }), true);
assert.strictEqual(recorder.isRecorderBusy({ state: "Exporting" }), true);
assert.strictEqual(recorder.isRecorderBusy({ state: "Recording" }), false);
assert.strictEqual(recorder.isRecordingPaused({ state: "Paused" }), true);
assert.strictEqual(recorder.getRecordingFrameCount({ frameCount: "3.9" }), 3);
assert.strictEqual(recorder.getRecordingFrameCount({ frameCount: -2 }), 0);
assert.strictEqual(
  recorder.isRecordingActiveOrPendingPause({ state: "Idle" }, { recordingPauseRequested: true }),
  true,
  "pending pause requests should keep the recording control active until the current capture settles",
);
assert.strictEqual(
  recorder.isRecordingActiveOrPendingPause({ state: "Paused" }, { recordingLoopActive: false }),
  true,
);

const recording = recorder.startRecordingState(initial, {
  intervalMinutes: 5,
  idleCaptureDelaySeconds: 2,
  idleCaptureMaxWaitSeconds: 20,
});
assert.strictEqual(recording.state, "Recording");
assert.strictEqual(recording.intervalMinutes, 5);
assert.strictEqual(recording.idleCaptureDelaySeconds, 2);
assert.strictEqual(recording.idleCaptureMaxWaitSeconds, 20);
assert.strictEqual(recording.skippedCaptureCount, 0);

const recordingAfterExport = recorder.startRecordingState({
  ...initial,
  lastExportPath: "exports\\old.mp4",
  lastExportLogPath: "exports\\old.log",
  lastExportProgress: { frameCount: 12 },
  lastExportStatus: recorder.EXPORT_STATUSES.success,
});
assert.strictEqual(recordingAfterExport.lastExportPath, "");
assert.strictEqual(recordingAfterExport.lastExportLogPath, "");
assert.strictEqual(recordingAfterExport.lastExportProgress, null);
assert.strictEqual(recordingAfterExport.lastExportStatus, recorder.EXPORT_STATUSES.idle);

assert.throws(
  () => recorder.startRecordingState({ ...initial, state: "Writing" }),
  /not ready/,
  "busy recorder states must not start a new recording",
);

const paused = recorder.pauseRecordingState({ ...recording, frameCount: 2, activeSession: { sessionId: "Timeline" } });
assert.strictEqual(paused.state, "Paused");
assert.strictEqual(paused.nextCaptureAt, "");

assert.throws(
  () => recorder.pauseRecordingState(initial),
  /not recording/,
  "pause should only be valid while recording",
);

const resumed = recorder.resumeRecordingState(paused, { intervalMinutes: 10 });
assert.strictEqual(resumed.state, "Recording");
assert.strictEqual(resumed.intervalMinutes, 10);

assert.throws(
  () => recorder.resumeRecordingState({ ...paused, activeSession: null }),
  /no paused session/,
  "resume must require an existing paused session",
);

const stopped = recorder.stopRecordingState(resumed);
assert.strictEqual(stopped.state, "Idle");
assert.strictEqual(stopped.documentDirty, false);

assert.strictEqual(
  recorder.getRecordingFinalStateAfterCapture({ recordingPauseRequested: true, recordingLoopActive: true }),
  "Paused",
  "a pending pause should win after the current capture finishes",
);
assert.strictEqual(
  recorder.getRecordingFinalStateAfterCapture({ recordingPauseRequested: false, recordingLoopActive: true }),
  "Recording",
  "active loops should return to recording after capture",
);
assert.strictEqual(
  recorder.getRecordingFinalStateAfterCapture({ recordingPauseRequested: false, recordingLoopActive: false }),
  "Idle",
  "manual captures outside a loop should return to idle",
);
