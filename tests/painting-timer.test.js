"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const timer = require(path.join(repoRoot, "uxp", "domain", "painting-timer.js"));

assert.strictEqual(timer.DEFAULT_IDLE_TIMEOUT_SECONDS, contract.activityTimer.defaultIdleTimeoutSeconds);
assert.strictEqual(timer.MIN_IDLE_TIMEOUT_SECONDS, contract.activityTimer.minIdleTimeoutSeconds);
assert.strictEqual(timer.MAX_IDLE_TIMEOUT_SECONDS, contract.activityTimer.maxIdleTimeoutSeconds);
assert.strictEqual(timer.PAINTING_TIMER_STATE_SCHEMA, contract.activityTimer.schema);
assert.strictEqual(timer.PAINTING_TIMER_STATE_FILENAME, contract.activityTimer.stateFilename);

const initial = timer.createInitialPaintingTimerState();
assert.strictEqual(initial.enabled, false);
assert.strictEqual(initial.active, false);
assert.strictEqual(initial.ended, false);
assert.strictEqual(initial.idleTimeoutSeconds, contract.activityTimer.defaultIdleTimeoutSeconds);
assert.strictEqual(
  timer.createInitialPaintingTimerState({ idleTimeoutSeconds: 0 }).idleTimeoutSeconds,
  contract.activityTimer.minIdleTimeoutSeconds,
);
assert.strictEqual(
  timer.createInitialPaintingTimerState({ idleTimeoutSeconds: 999999 }).idleTimeoutSeconds,
  contract.activityTimer.maxIdleTimeoutSeconds,
);

const startMs = Date.UTC(2026, 4, 23, 10, 0, 0);
const armed = timer.armPaintingTimerState(initial, startMs, {
  idleTimeoutSeconds: 60,
  waitingReason: "waiting",
});
assert.strictEqual(armed.enabled, true);
assert.strictEqual(armed.active, false);
assert.strictEqual(armed.idleTimeoutSeconds, 60);
assert.strictEqual(armed.lastStopReason, "waiting");
assert.strictEqual(
  timer.armPaintingTimerState(initial, startMs, { idleTimeoutSeconds: 0 }).idleTimeoutSeconds,
  contract.activityTimer.minIdleTimeoutSeconds,
);

const started = timer.startPaintingTimerState(initial, startMs);
assert.strictEqual(started.enabled, true);
assert.strictEqual(started.active, true);
assert.strictEqual(started.activeStartedAtMs, startMs);
assert.strictEqual(started.idleDeadlineAtMs, startMs + (contract.activityTimer.defaultIdleTimeoutSeconds * 1000));
assert.strictEqual(timer.getElapsedSeconds(started, startMs + 5000), 5);

const activity = timer.recordPaintingActivityState(started, startMs + 10000, "paint");
assert.strictEqual(activity.activeStartedAtMs, startMs);
assert.strictEqual(activity.eventCount, 1);
assert.strictEqual(activity.lastEventName, "paint");
assert.strictEqual(activity.idleDeadlineAtMs, startMs + 10000 + (contract.activityTimer.defaultIdleTimeoutSeconds * 1000));

const idleStopped = timer.finishActiveSegment(activity, activity.idleDeadlineAtMs + 60000, timer.IDLE_STOP_REASON);
assert.strictEqual(idleStopped.active, false);
assert.strictEqual(
  idleStopped.accumulatedSeconds,
  contract.activityTimer.defaultIdleTimeoutSeconds + 10,
  "idle stop should count only through the idle deadline",
);
assert.strictEqual(idleStopped.lastStopReason, timer.IDLE_STOP_REASON);

const restoredActive = timer.settleRestoredState(activity, activity.idleDeadlineAtMs - 1000);
assert.strictEqual(restoredActive.active, true);
assert.strictEqual(restoredActive.lastStopReason, "");

const restoredExpired = timer.settleRestoredState(activity, activity.idleDeadlineAtMs);
assert.strictEqual(restoredExpired.active, false);
assert.strictEqual(restoredExpired.lastStopReason, timer.IDLE_STOP_REASON);

const ended = timer.endPaintingTimerState(started, startMs + 5000);
assert.strictEqual(ended.enabled, false);
assert.strictEqual(ended.active, false);
assert.strictEqual(ended.ended, true);
assert.strictEqual(ended.accumulatedSeconds, 5);
assert.strictEqual(ended.lastStopReason, timer.MANUAL_END_REASON);

const restoredEnded = timer.settleRestoredState({
  ...ended,
  enabled: true,
  active: true,
  activeStartedAtMs: startMs,
  idleDeadlineAtMs: startMs + 60000,
  idleDeadlineAt: new Date(startMs + 60000).toISOString(),
}, startMs + 1000);
assert.strictEqual(restoredEnded.enabled, false);
assert.strictEqual(restoredEnded.active, false);
assert.strictEqual(restoredEnded.activeStartedAtMs, 0);
assert.strictEqual(restoredEnded.idleDeadlineAtMs, 0);
assert.strictEqual(restoredEnded.idleDeadlineAt, "");

const persisted = timer.parsePersistedPaintingTimerState(JSON.stringify({
  schema: contract.activityTimer.schema,
  state: {
    enabled: true,
    active: true,
    ended: false,
    idleTimeoutSeconds: "0",
    accumulatedSeconds: "-5",
    activeStartedAtMs: startMs,
    idleDeadlineAtMs: startMs + 30000,
    startedAt: new Date(startMs).toISOString(),
    stoppedAt: 123,
    lastActivityAt: new Date(startMs + 1000).toISOString(),
    idleDeadlineAt: new Date(startMs + 30000).toISOString(),
    eventCount: "4.8",
    lastEventName: "paint",
    lastStopReason: "waiting",
    lastError: "old",
  },
}));
assert.strictEqual(persisted.enabled, true);
assert.strictEqual(persisted.active, true);
assert.strictEqual(persisted.idleTimeoutSeconds, contract.activityTimer.minIdleTimeoutSeconds);
assert.strictEqual(persisted.accumulatedSeconds, 0);
assert.strictEqual(persisted.activeStartedAtMs, startMs);
assert.strictEqual(persisted.idleDeadlineAtMs, startMs + 30000);
assert.strictEqual(persisted.stoppedAt, "");
assert.strictEqual(persisted.eventCount, 4);
assert.strictEqual(persisted.lastEventName, "paint");
assert.strictEqual(persisted.lastStopReason, "waiting");
assert.strictEqual(persisted.lastError, "");

assert.throws(
  () => timer.parsePersistedPaintingTimerState({ schema: "wrong", state: {} }),
  /schema/,
  "timer parser should reject unsupported persisted schemas",
);

const persistedSnapshot = timer.createPersistedPaintingTimerState({
  ...started,
  eventCount: 2,
  lastEventName: "paint",
}, "2026-06-04T00:00:00.000Z", 12.5);
assert.strictEqual(persistedSnapshot.schema, contract.activityTimer.schema);
assert.strictEqual(persistedSnapshot.savedAt, "2026-06-04T00:00:00.000Z");
assert.strictEqual(persistedSnapshot.state.active, true);
assert.strictEqual(persistedSnapshot.state.accumulatedSeconds, 12.5);
assert.strictEqual(persistedSnapshot.state.activeStartedAtMs, startMs);
assert.strictEqual(persistedSnapshot.state.eventCount, 2);
assert.strictEqual(persistedSnapshot.state.lastEventName, "paint");

const pausedSnapshot = timer.createPersistedPaintingTimerState({
  ...ended,
  activeStartedAtMs: startMs,
  idleDeadlineAtMs: startMs + 1000,
  idleDeadlineAt: new Date(startMs + 1000).toISOString(),
}, "2026-06-04T00:00:00.000Z");
assert.strictEqual(pausedSnapshot.state.active, false);
assert.strictEqual(pausedSnapshot.state.activeStartedAtMs, 0);
assert.strictEqual(pausedSnapshot.state.idleDeadlineAtMs, 0);
assert.strictEqual(pausedSnapshot.state.idleDeadlineAt, "");
