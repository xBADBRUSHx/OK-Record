"use strict";

const DEFAULT_IDLE_TIMEOUT_SECONDS = 10;
const MIN_IDLE_TIMEOUT_SECONDS = 1;
const MAX_IDLE_TIMEOUT_SECONDS = 86400;
const IDLE_STOP_REASON = "超过无变化时间，已暂停累计";
const MANUAL_END_REASON = "手动结束";

function toFiniteNumber(value, fallbackValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallbackValue;
}

function clampNumber(value, fallbackValue, minValue, maxValue) {
  const number = toFiniteNumber(value, fallbackValue);
  return Math.min(maxValue, Math.max(minValue, number));
}

function createInitialPaintingTimerState(defaults = {}) {
  return {
    enabled: false,
    active: false,
    ended: false,
    idleTimeoutSeconds: clampNumber(
      defaults.idleTimeoutSeconds,
      DEFAULT_IDLE_TIMEOUT_SECONDS,
      MIN_IDLE_TIMEOUT_SECONDS,
      MAX_IDLE_TIMEOUT_SECONDS,
    ),
    accumulatedSeconds: 0,
    activeStartedAtMs: 0,
    idleDeadlineAtMs: 0,
    startedAt: "",
    stoppedAt: "",
    lastActivityAt: "",
    idleDeadlineAt: "",
    eventCount: 0,
    lastEventName: "",
    lastStopReason: "",
    lastError: "",
  };
}

function armPaintingTimerState(state, startedAtMs, options = {}) {
  const startMs = Number(startedAtMs);
  const startedAt = new Date(startMs).toISOString();
  return {
    ...state,
    enabled: true,
    active: false,
    ended: false,
    idleTimeoutSeconds: clampNumber(
      options.idleTimeoutSeconds,
      state.idleTimeoutSeconds,
      MIN_IDLE_TIMEOUT_SECONDS,
      MAX_IDLE_TIMEOUT_SECONDS,
    ),
    activeStartedAtMs: 0,
    idleDeadlineAtMs: 0,
    startedAt: state.startedAt || startedAt,
    stoppedAt: "",
    idleDeadlineAt: "",
    lastStopReason: options.waitingReason || "",
    lastError: "",
  };
}

function startPaintingTimerState(state, startedAtMs) {
  const startMs = Number(startedAtMs);
  const startedAt = new Date(startMs).toISOString();
  return {
    ...state,
    enabled: true,
    active: true,
    ended: false,
    activeStartedAtMs: startMs,
    idleDeadlineAtMs: startMs + (state.idleTimeoutSeconds * 1000),
    startedAt: state.startedAt || startedAt,
    stoppedAt: "",
    lastActivityAt: startedAt,
    idleDeadlineAt: new Date(startMs + (state.idleTimeoutSeconds * 1000)).toISOString(),
    lastStopReason: "",
    lastError: "",
  };
}

function recordPaintingActivityState(state, activityAtMs, eventName = "") {
  const nowMs = Number(activityAtMs);
  const activeStartedAtMs = state.active && state.activeStartedAtMs ? state.activeStartedAtMs : nowMs;
  const idleDeadlineAtMs = nowMs + (state.idleTimeoutSeconds * 1000);
  return {
    ...state,
    enabled: true,
    active: true,
    ended: false,
    activeStartedAtMs,
    idleDeadlineAtMs,
    lastActivityAt: new Date(nowMs).toISOString(),
    idleDeadlineAt: new Date(idleDeadlineAtMs).toISOString(),
    eventCount: Math.max(0, Math.floor(Number(state.eventCount) || 0)) + 1,
    lastEventName: String(eventName || ""),
    lastStopReason: "",
    lastError: "",
  };
}

function finishActiveSegment(state, stopAtMs, reason = "") {
  if (!state.active || !state.activeStartedAtMs) {
    return state;
  }

  const deadlineMs = state.idleDeadlineAtMs || stopAtMs;
  const segmentEndMs = Math.max(state.activeStartedAtMs, Math.min(stopAtMs, deadlineMs));
  const segmentSeconds = (segmentEndMs - state.activeStartedAtMs) / 1000;
  return {
    ...state,
    active: false,
    accumulatedSeconds: state.accumulatedSeconds + segmentSeconds,
    activeStartedAtMs: 0,
    idleDeadlineAtMs: 0,
    idleDeadlineAt: "",
    lastStopReason: reason,
  };
}

function getElapsedSeconds(state, nowMs) {
  let elapsedSeconds = Number(state.accumulatedSeconds) || 0;
  if (state.active && state.activeStartedAtMs) {
    const deadlineMs = state.idleDeadlineAtMs || nowMs;
    const currentMs = Math.min(nowMs, deadlineMs);
    elapsedSeconds += Math.max(0, currentMs - state.activeStartedAtMs) / 1000;
  }
  return elapsedSeconds;
}

function settleRestoredState(state, nowMs) {
  if (state.ended) {
    return {
      ...state,
      enabled: false,
      active: false,
      activeStartedAtMs: 0,
      idleDeadlineAtMs: 0,
      idleDeadlineAt: "",
    };
  }

  if (!state.enabled || !state.active || !state.activeStartedAtMs || !state.idleDeadlineAtMs) {
    return {
      ...state,
      active: false,
      activeStartedAtMs: 0,
      idleDeadlineAtMs: 0,
      idleDeadlineAt: "",
    };
  }

  if (nowMs >= state.idleDeadlineAtMs) {
    return finishActiveSegment(state, state.idleDeadlineAtMs, IDLE_STOP_REASON);
  }

  return {
    ...state,
    idleDeadlineAt: new Date(state.idleDeadlineAtMs).toISOString(),
    lastStopReason: "",
  };
}

function endPaintingTimerState(state, endedAtMs) {
  const finished = finishActiveSegment(state, endedAtMs, MANUAL_END_REASON);
  return {
    ...finished,
    enabled: false,
    active: false,
    ended: true,
    stoppedAt: new Date(Number(endedAtMs)).toISOString(),
    lastStopReason: MANUAL_END_REASON,
  };
}

module.exports = {
  DEFAULT_IDLE_TIMEOUT_SECONDS,
  IDLE_STOP_REASON,
  MANUAL_END_REASON,
  MAX_IDLE_TIMEOUT_SECONDS,
  MIN_IDLE_TIMEOUT_SECONDS,
  armPaintingTimerState,
  createInitialPaintingTimerState,
  endPaintingTimerState,
  finishActiveSegment,
  getElapsedSeconds,
  recordPaintingActivityState,
  settleRestoredState,
  startPaintingTimerState,
};
