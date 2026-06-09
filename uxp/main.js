const uxp = require("uxp");
const photoshop = require("photoshop");
const recorderScheduler = require("./recorder-scheduler");
const exportProfileModel = require("./domain/export-profile");
const paintingTimerModel = require("./domain/painting-timer");
const pathPolicy = require("./domain/path-policy");
const recordingContext = require("./domain/recording-context");
const recorderDomain = require("./domain/recorder-state");
const settingsModel = require("./domain/settings-model");
const nativeBridge = require("./services/native-bridge");
const statusMessages = require("./status-messages");
const PANEL_STYLES = require("./panel-styles");
const panelView = require("./panel-view");
const {
  setButtonClassName,
  setControlDisabled,
} = require("./panel-dom");
const {
  appendCaptureDiagnosticsLines,
  buildExportFailureMessages,
  buildExportSuccessMessages,
  buildFrameCaptureSuccessStatus,
  buildStepCaptureSuccessStatus,
  createCaptureDiagnosticsLines,
  createExportProgressSnapshot,
  formatError,
  formatExportProgress,
  formatFrameStorageFormat,
  formatIntervalSeconds,
  formatNumberValue,
  formatSecondsValue,
  logCaptureDiagnostics,
} = statusMessages;

const SECONDS_PER_MINUTE = 60;
const DEFAULT_INTERVAL_MINUTES = settingsModel.DEFAULT_INTERVAL_MINUTES;
const MIN_INTERVAL_MINUTES = settingsModel.MIN_INTERVAL_MINUTES;
const MIN_INTERVAL_SECONDS = MIN_INTERVAL_MINUTES * SECONDS_PER_MINUTE;
const MAX_INTERVAL_MINUTES = settingsModel.MAX_INTERVAL_MINUTES;
const MAX_INTERVAL_SECONDS = MAX_INTERVAL_MINUTES * SECONDS_PER_MINUTE;
const DOCUMENT_HISTORY_POLL_INTERVAL_MS = 1000;
const DEFAULT_IDLE_CAPTURE_DELAY_SECONDS = settingsModel.DEFAULT_IDLE_CAPTURE_DELAY_SECONDS;
const MIN_IDLE_CAPTURE_DELAY_SECONDS = settingsModel.MIN_IDLE_CAPTURE_DELAY_SECONDS;
const MAX_IDLE_CAPTURE_DELAY_SECONDS = settingsModel.MAX_IDLE_CAPTURE_DELAY_SECONDS;
const DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS = settingsModel.DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS;
const MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS = settingsModel.MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS;
const MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS = settingsModel.MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS;
const DEFAULT_EXPORT_DURATION_SECONDS = exportProfileModel.DEFAULT_EXPORT_DURATION_SECONDS;
const DEFAULT_EXPORT_HOLD_SECONDS = exportProfileModel.DEFAULT_EXPORT_HOLD_SECONDS;
const DEFAULT_EXPORT_OUTPUT_FPS = exportProfileModel.DEFAULT_EXPORT_OUTPUT_FPS;
const DEFAULT_EXPORT_MAX_WIDTH = exportProfileModel.DEFAULT_EXPORT_MAX_WIDTH;
const EXPORT_STATUS_PAINT_DELAY_MS = 80;
const EXECUTE_AS_MODAL_TIMEOUT_MIN_PHOTOSHOP_VERSION = "25.10";
const EXECUTE_AS_MODAL_COLLISION_TIMEOUT_SECONDS = 1;
const HOST_MODAL_CAPTURE_RETRY_DELAY_MS = 2000;
const DEFAULT_CAPTURE_RESOLUTION_PRESET_ID = settingsModel.DEFAULT_CAPTURE_RESOLUTION_PRESET_ID;
const CAPTURE_RESOLUTION_PRESET_LABELS = Object.freeze({
  [DEFAULT_CAPTURE_RESOLUTION_PRESET_ID]: "1080p",
  "2k": "2K",
  "4k": "4K",
});
const CAPTURE_RESOLUTION_PRESETS = Object.freeze(settingsModel.CAPTURE_RESOLUTION_PRESETS.map((preset) => ({
  ...preset,
  label: CAPTURE_RESOLUTION_PRESET_LABELS[preset.id] || preset.id,
})));
const DEFAULT_FRAME_QUALITY_PRESET_ID = settingsModel.DEFAULT_FRAME_QUALITY_PRESET_ID;
const FRAME_QUALITY_PRESET_LABELS = Object.freeze({
  low: "低",
  [DEFAULT_FRAME_QUALITY_PRESET_ID]: "默认",
  high: "高",
  lossless: "无损",
});
const FRAME_QUALITY_PRESETS = Object.freeze(settingsModel.FRAME_QUALITY_PRESETS.map((preset) => ({
  ...preset,
  label: FRAME_QUALITY_PRESET_LABELS[preset.id] || preset.id,
})));
const DEFAULT_EXPORT_CRF = exportProfileModel.DEFAULT_EXPORT_CRF;
const MIN_EXPORT_DURATION_SECONDS = exportProfileModel.MIN_EXPORT_DURATION_SECONDS;
const MAX_EXPORT_DURATION_SECONDS = exportProfileModel.MAX_EXPORT_DURATION_SECONDS;
const MIN_EXPORT_HOLD_SECONDS = exportProfileModel.MIN_EXPORT_HOLD_SECONDS;
const MAX_EXPORT_HOLD_SECONDS = exportProfileModel.MAX_EXPORT_HOLD_SECONDS;
const MIN_EXPORT_MAX_WIDTH = exportProfileModel.MIN_EXPORT_MAX_WIDTH;
const MAX_EXPORT_MAX_WIDTH = exportProfileModel.MAX_EXPORT_MAX_WIDTH;
const DEFAULT_PAINTING_TIMER_TIMEOUT_SECONDS = paintingTimerModel.DEFAULT_IDLE_TIMEOUT_SECONDS;
const MIN_PAINTING_TIMER_TIMEOUT_SECONDS = paintingTimerModel.MIN_IDLE_TIMEOUT_SECONDS;
const MAX_PAINTING_TIMER_TIMEOUT_SECONDS = paintingTimerModel.MAX_IDLE_TIMEOUT_SECONDS;
const PAINTING_TIMER_IDLE_STOP_REASON = paintingTimerModel.IDLE_STOP_REASON;
const PAINTING_TIMER_END_REASON = paintingTimerModel.MANUAL_END_REASON;
const PAINTING_TIMER_STATE_FILENAME = paintingTimerModel.PAINTING_TIMER_STATE_FILENAME;
const PANEL_SETTINGS_FILENAME = settingsModel.PANEL_SETTINGS_FILENAME;
const RECORDINGS_ROOT_DIR_NAME = pathPolicy.RECORDINGS_ROOT_DIR_NAME;
const DEFAULT_STEP_OUTPUT_DIR_NAME = pathPolicy.DEFAULT_STEP_OUTPUT_DIR_NAME;
const LOCAL_DOCUMENTATION_DIR_NAME = "docs";
const LOCAL_DOCUMENTATION_FILENAME = "index.html";
const DOCUMENTATION_PANEL_MENU_ID = "openDocumentation";
const UPDATE_PANEL_MENU_ID = "openUpdateDownloadPage";
const CLEAR_RECORDING_PANEL_MENU_ID = "clearRecordingTimeline";
const UPDATE_MANIFEST_SCHEMA = "ok-record.update-manifest.v1";
const UPDATE_MANIFEST_URL = "https://xbadbrushx.github.io/OK-Record/update.json";
const UPDATE_RELEASES_URL_PREFIX = "https://github.com/xBADBRUSHx/OK-Record/releases/";
const DEFAULT_UPDATE_RELEASE_PAGE_URL = "https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3";
const RECORDING_TIMELINE_ID = "Timeline";
const STEP_FRAME_FILENAME_PREFIX = "step_";
const STEP_FRAME_INDEX_DIGITS = 3;
const DEFAULT_CAPTURE_ONLY_WHEN_CHANGED = settingsModel.DEFAULT_CAPTURE_ONLY_WHEN_CHANGED;
const UNSAVED_DOCUMENT_RECORDING_MESSAGE = recordingContext.UNSAVED_DOCUMENT_RECORDING_MESSAGE;
const DOCUMENT_CONTEXT_CHANGED_MESSAGE = recordingContext.DOCUMENT_CONTEXT_CHANGED_MESSAGE;
const DOCUMENT_CLOSE_EVENT = "close";
const DOCUMENT_CHANGE_EVENTS = recorderScheduler.DOCUMENT_CHANGE_EVENTS;
const RECORDER_STATES = recorderDomain.RECORDER_STATES;
const EXPORT_STATUSES = recorderDomain.EXPORT_STATUSES;

let latestStatusMessage = "就绪";
let exportNoticeNode = null;
let exportNoticeTitleNode = null;
let exportNoticeBodyNode = null;
let exportNoticeCloseButtonNode = null;
let updateBadgeRowNode = null;
let updateBadgeButtonNode = null;
let updateDialogNode = null;
let updateDialogTitleNode = null;
let updateDialogVersionNode = null;
let updateDialogSummaryNode = null;
let updateDialogGithubButtonNode = null;
let updateDialogNetdiskButtonNode = null;
let updateDialogHintNode = null;
let updateDialogCloseButtonNode = null;
let intervalSecondsInputNode = null;
let idleCaptureDelaySecondsInputNode = null;
let idleCaptureMaxWaitSecondsInputNode = null;
let chooseProjectOutputDirButtonNode = null;
let openFrameOutputDirButtonNode = null;
let openStepOutputDirButtonNode = null;
let clearRecordingTimelineButtonNode = null;
let startRecordingButtonNode = null;
let captureNowButtonNode = null;
let chooseExportSequenceDirButtonNode = null;
let exportButtonNode = null;
let openExportFolderButtonNode = null;
let exportDurationMinutesInputNode = null;
let exportDurationSecondsInputNode = null;
let exportHoldSecondsInputNode = null;
let frameQualityPresetSelectNode = null;
let captureResolutionPresetSelectNode = null;
let paintingTimerSecondsInputNode = null;
let paintingTimerDisplayButtonNode = null;
let recorderState = createInitialRecorderState();
let paintingTimerState = createInitialPaintingTimerState();
let recordingLoopActive = false;
let recordingPauseRequested = false;
let captureTimerId = null;
let idleCaptureDeadlineTimerId = null;
let recorderHistoryPollId = null;
let paintingTimerIdleTimeoutId = null;
let paintingTimerTickId = null;
let recorderDocumentSignature = "";
let paintingTimerDocumentSignature = "";
let panelSettingsPersistPromise = Promise.resolve();
let paintingTimerPersistPromise = Promise.resolve();
let documentChangeListenerRegistered = false;
let idleCaptureListenerRegistered = false;
let idleCaptureListenerDelaySeconds = 0;
let photoshopUserIdle = false;
let idleCaptureWaiting = false;
let documentChangeGeneration = 0;
let stepCaptureActive = false;
let updateCheckPromise = null;
let latestAvailableUpdate = null;
let activeRecordingContext = null;

uxp.entrypoints.setup({
  panels: {
    okRecordPanel: {
      menuItems: [
        { id: DOCUMENTATION_PANEL_MENU_ID, label: "文档_Documentation" },
        { id: UPDATE_PANEL_MENU_ID, label: "下载页_Download Page" },
        { id: CLEAR_RECORDING_PANEL_MENU_ID, label: "清空序列帧_Clear Frames" },
      ],
      show() {
        showPanel();
      },
      hide() {},
      invokeMenu(id) {
        if (id === DOCUMENTATION_PANEL_MENU_ID) {
          openLocalDocumentation().catch((error) => {
            console.log("[OK-Record] panel menu documentation action failed:", error);
          });
          return;
        }
        if (id === UPDATE_PANEL_MENU_ID) {
          openUpdateDownloadPage().catch((error) => {
            console.log("[OK-Record] panel menu download-page action failed:", error);
          });
          return;
        }
        if (id === CLEAR_RECORDING_PANEL_MENU_ID) {
          clearRecordingTimeline().catch((error) => {
            console.log("[OK-Record] panel menu clear-recording action failed:", error);
          });
        }
      },
    },
  },
});

setTimeout(() => {
  if (typeof document !== "undefined" && document.body) {
    showPanel();
  }
}, 0);

function showPanel() {
  renderPanel();
  showCachedUpdateNotice();
  queueUpdateCheck();
  restorePanelSettings().catch((error) => {
    setRecorderState({ lastError: `设置恢复失败：${formatError(error)}` });
    updateControlState();
    setStatus(formatRecorderStatus("设置恢复失败"));
  }).then(() => {
    restoreRecorderState().catch(() => {});
    restoreStepFrameState().catch(() => {});
    restoreExportSourceState().catch(() => {});
  });
  restorePaintingTimerState().catch((error) => {
    setPaintingTimerState({ lastError: `绘画计时恢复失败：${formatError(error)}` });
    updatePaintingTimerStatus();
  });
}

function waitForTimeout(ms) {
  if (!ms || ms <= 0 || typeof setTimeout !== "function") {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPanelRender(options = {}) {
  const minDelayMs = Number.isFinite(options.minDelayMs) ? options.minDelayMs : 0;
  if (typeof requestAnimationFrame === "function") {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  await waitForTimeout(minDelayMs);
}

async function ensureDocumentChangeListener() {
  if (documentChangeListenerRegistered) {
    return;
  }

  await photoshop.action.addNotificationListener(DOCUMENT_CHANGE_EVENTS, handleDocumentChangeEvent);
  documentChangeListenerRegistered = true;
}

async function ensureIdleCaptureListener(delaySeconds) {
  if (delaySeconds <= 0) {
    await releaseIdleCaptureListener();
    return;
  }

  if (idleCaptureListenerRegistered && idleCaptureListenerDelaySeconds === delaySeconds) {
    return;
  }
  if (idleCaptureListenerRegistered) {
    await releaseIdleCaptureListener();
  }

  await photoshop.core.setUserIdleTime(delaySeconds);
  await photoshop.core.addNotificationListener("UI", ["userIdle"], handlePhotoshopUserIdle);
  idleCaptureListenerRegistered = true;
  idleCaptureListenerDelaySeconds = delaySeconds;
  photoshopUserIdle = false;
}

async function releaseIdleCaptureListener() {
  clearIdleCaptureDeadline();
  idleCaptureWaiting = false;
  photoshopUserIdle = false;
  if (!idleCaptureListenerRegistered) {
    return;
  }

  await photoshop.core.removeNotificationListener("UI", ["userIdle"], handlePhotoshopUserIdle);
  await photoshop.core.setUserIdleTime(0);
  idleCaptureListenerRegistered = false;
  idleCaptureListenerDelaySeconds = 0;
}

async function stopRecordingRuntimeSchedulers(options = {}) {
  stopRecorderHistoryPoll();
  await releaseIdleCaptureListener();
  clearScheduledCapture();
  if (options.resetDocumentSignature) {
    recorderDocumentSignature = "";
    activeRecordingContext = null;
  }
}

function handleDocumentChangeEvent(eventName) {
  if (eventName === DOCUMENT_CLOSE_EVENT) {
    queueDocumentCloseRecordingCheck();
    if (!detectPaintingTimerDocumentChange(eventName)) {
      recordPaintingActivity(eventName);
    }
    return;
  }

  markDocumentDirty(eventName);
  if (!detectPaintingTimerDocumentChange(eventName)) {
    recordPaintingActivity(eventName);
  }
}

function queueDocumentCloseRecordingCheck() {
  const runCloseCheck = () => {
    stopRecordingAfterDocumentClose().catch((error) => {
      console.log("[OK-Record] stop recording after document close failed:", error);
    });
  };
  runCloseCheck();
  setTimeout(runCloseCheck, 0);
}

function handlePhotoshopUserIdle(eventName, descriptor) {
  const idleEnd = Boolean(descriptor && descriptor.idleEnd);
  photoshopUserIdle = !idleEnd;
  if (idleEnd || !idleCaptureWaiting || !recordingLoopActive) {
    return;
  }

  clearIdleCaptureDeadline();
  idleCaptureWaiting = false;
  runScheduledCapture("空闲采样").catch(() => {});
}

function markDocumentDirty(eventName, options) {
  const force = options && options.force;
  if (!force && !recordingLoopActive) {
    return;
  }

  documentChangeGeneration += 1;
  setRecorderState({
    documentDirty: true,
    lastDirtyAt: new Date().toISOString(),
    lastChangeEvent: eventName || "unknown",
  });
  updateControlState();

  if (recorderState.state === RECORDER_STATES.recording) {
    setStatus(formatRecorderStatus("文档已变化；下次到达间隔时会采样"));
  }
}

async function captureNow() {
  const wasRecording = recordingLoopActive;
  const wasPaused = isRecordingPaused();

  try {
    if (wasRecording) {
      clearScheduledCapture();
      assertActiveRecordingContextStillCurrent();
    }

    const result = await captureStepFrame({
      label: "手动采样",
      commandName: "OK-Record 手动采样",
      finalState: () => {
        if (recordingPauseRequested) {
          return RECORDER_STATES.paused;
        }
        if (recordingLoopActive) {
          return RECORDER_STATES.recording;
        }
        return wasPaused ? RECORDER_STATES.paused : RECORDER_STATES.idle;
      },
    });

    if (recordingPauseRequested) {
      recordingPauseRequested = false;
      updateControlState();
      setStatus(formatRecorderStatus("录制已暂停"));
    } else if (recordingLoopActive) {
      scheduleNextCapture("录制：手动采样完成");
    }

    return result;
  } catch (error) {
    if (wasRecording) {
      recordingLoopActive = false;
      recordingPauseRequested = false;
      await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });
      updateControlState();
    }
    throw error;
  }
}

async function startRecording() {
  if (recordingLoopActive || recorderState.state === RECORDER_STATES.recording) {
    const error = new Error("录制已在运行");
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`开始录制失败：${formatError(error)}`));
    throw error;
  }
  if (isRecordingPaused()) {
    const error = new Error("录制已暂停；请继续或停止当前录制");
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`开始录制失败：${formatError(error)}`));
    throw error;
  }
  if (isRecorderBusy()) {
    const error = new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`开始录制失败：${formatError(error)}`));
    throw error;
  }

  try {
    const documentContext = assertSavedDocumentForRecording();
    if (recorderState.activeSession && !recordingContext.isSessionForRecordingContext(recorderState.activeSession, documentContext)) {
      setRecorderState(createClearedRecordingTimelineStatePatch());
    }
    await ensureDocumentChangeListener();
    const intervalMinutes = readIntervalMinutesFromPanel();
    const idleCaptureSettings = readIdleCaptureSettingsFromPanel();
    const captureOnlyWhenChanged = DEFAULT_CAPTURE_ONLY_WHEN_CHANGED;
    await ensureIdleCaptureListener(getIdleCaptureListenerDelaySeconds(idleCaptureSettings));
    recordingPauseRequested = false;
    recordingLoopActive = true;
    activeRecordingContext = documentContext;
    recorderDocumentSignature = getActiveDocumentHistorySignature();
    startRecorderHistoryPoll();
    markDocumentDirty("recordingStart", { force: true });
    setRecorderState(recorderDomain.startRecordingState(recorderState, {
      intervalMinutes,
      ...idleCaptureSettings,
      captureOnlyWhenChanged,
    }));
    queuePersistPanelSettings();
    updateControlState();
    setStatus(formatRecorderStatus("录制已开始；正在采样初始帧..."));

    await runScheduledCapture("录制", { force: true });
  } catch (error) {
    recordingLoopActive = false;
    recordingPauseRequested = false;
    await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });
    const errorText = formatError(error);
    setRecorderState({
      state: RECORDER_STATES.error,
      nextCaptureAt: "",
      lastError: errorText,
    });
    updateControlState();
    const message = `开始录制失败：${errorText}`;
    setStatus(message);
    showBlockingNotice("开始录制失败", [errorText], "error");
    console.log("[OK-Record] start recording failed:", error);
    throw error;
  }
}

async function pauseRecording() {
  try {
    if (isRecorderBusy()) {
      if (!recordingLoopActive) {
        throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
      }

      recordingPauseRequested = true;
      recordingLoopActive = false;
      await stopRecordingRuntimeSchedulers();
      setRecorderState({
        nextCaptureAt: "",
        lastError: "",
      });
      updateControlState();
      setStatus(formatRecorderStatus("已请求暂停录制；当前采样会先完成..."));
      return;
    }
    if (!recordingLoopActive || recorderState.state !== RECORDER_STATES.recording) {
      throw new Error("录制未在运行");
    }

    recordingLoopActive = false;
    recordingPauseRequested = false;
    await stopRecordingRuntimeSchedulers();
    setRecorderState(recorderDomain.pauseRecordingState(recorderState));
    updateControlState();
    setStatus(formatRecorderStatus("录制已暂停"));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`暂停录制失败：${formatError(error)}`));
    console.log("[OK-Record] pause recording failed:", error);
    throw error;
  }
}

async function resumeRecording() {
  if (recordingLoopActive || recorderState.state === RECORDER_STATES.recording) {
    const error = new Error("录制已在运行");
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`继续录制失败：${formatError(error)}`));
    throw error;
  }
  if (!isRecordingPaused()) {
    const error = new Error("录制未暂停");
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`继续录制失败：${formatError(error)}`));
    throw error;
  }
  if (isRecorderBusy()) {
    const error = new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`继续录制失败：${formatError(error)}`));
    throw error;
  }
  if (!recorderState.activeSession || recorderState.frameCount <= 0) {
    const error = new Error("没有可继续的录制时间线");
    setRecorderState({ lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`继续录制失败：${formatError(error)}`));
    throw error;
  }

  try {
    const documentContext = requireCurrentRecordingContextForSession("继续录制");
    await ensureDocumentChangeListener();
    const intervalMinutes = readIntervalMinutesFromPanel();
    const idleCaptureSettings = readIdleCaptureSettingsFromPanel();
    const captureOnlyWhenChanged = DEFAULT_CAPTURE_ONLY_WHEN_CHANGED;
    await ensureIdleCaptureListener(getIdleCaptureListenerDelaySeconds(idleCaptureSettings));
    recordingPauseRequested = false;
    recordingLoopActive = true;
    activeRecordingContext = documentContext;
    recorderDocumentSignature = getActiveDocumentHistorySignature();
    startRecorderHistoryPoll();
    setRecorderState(recorderDomain.resumeRecordingState(recorderState, {
      intervalMinutes,
      ...idleCaptureSettings,
      captureOnlyWhenChanged,
    }));
    markDocumentDirty("recordingResume", { force: true });
    queuePersistPanelSettings();
    scheduleNextCapture("录制已继续");
  } catch (error) {
    recordingLoopActive = false;
    recordingPauseRequested = false;
    await stopRecordingRuntimeSchedulers();
    setRecorderState({
      state: RECORDER_STATES.paused,
      nextCaptureAt: "",
      lastError: formatError(error),
    });
    updateControlState();
    setStatus(formatRecorderStatus(`继续录制失败：${formatError(error)}`));
    console.log("[OK-Record] resume recording failed:", error);
    throw error;
  }
}

async function stopRecording() {
  const wasRunning = recordingLoopActive ||
    recorderState.state === RECORDER_STATES.recording ||
    recordingPauseRequested ||
    isRecordingPaused();
  recordingLoopActive = false;
  recordingPauseRequested = false;
  await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });

  if (isRecorderBusy()) {
    setRecorderState({
      nextCaptureAt: "",
      documentDirty: false,
      lastError: "",
    });
    updateControlState();
    setStatus(formatRecorderStatus("已请求停止录制；当前采样会先完成..."));
    return;
  }

  setRecorderState(recorderDomain.stopRecordingState(recorderState));
  updateControlState();
  setStatus(formatRecorderStatus(wasRunning ? "录制已停止" : "录制未运行"));
}

async function stopRecordingAfterDocumentClose() {
  const wasRecordingSession = isRecordingActiveOrPendingPause();
  if (!wasRecordingSession) {
    return;
  }
  if (isActiveRecordingContextStillCurrent()) {
    return;
  }
  if (isActiveRecordingDocumentReferenceOpen()) {
    return;
  }

  const wasBusy = isRecorderBusy();
  recordingLoopActive = false;
  recordingPauseRequested = false;
  await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });

  if (wasBusy || isRecorderBusy()) {
    setRecorderState({
      nextCaptureAt: "",
      documentDirty: false,
      lastError: "",
    });
    updateControlState();
    setStatus(formatRecorderStatus("PSD 文档已关闭，当前采样完成后录制会结束"));
    return;
  }

  setRecorderState(recorderDomain.stopRecordingState(recorderState));
  updateControlState();
  setStatus(formatRecorderStatus("PSD 文档已关闭，录制已结束"));
}

async function clearRecordingTimeline() {
  try {
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }
    if (typeof confirm !== "function") {
      throw new Error("无法显示清空确认弹窗，已取消清空序列帧");
    }
    if (!confirm("确定要清空当前序列帧吗？这会删除延时录制_Recordings/frames 里的录制帧，但不会删除已导出的视频。")) {
      return null;
    }

    recordingLoopActive = false;
    recordingPauseRequested = false;
    await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });

    const documentContext = requireCurrentRecordingContext();
    const outputDir = documentContext.outputDir;
    const result = await nativeBridge.clearRecording({ outputDir });
    setRecorderState(createClearedRecordingTimelineStatePatch({
      state: RECORDER_STATES.idle,
      ...(recorderState.exportSourceDir ? {} : {
        exportSourceFrameCount: 0,
        exportSourceLastFramePath: "",
        exportSourceAspectRatioConsistent: true,
        exportSourceAspectRatioGroupsJson: "",
      }),
    }));
    updateHoldSecondsInput(recorderState.exportDurationSeconds);
    updateControlState();
    hideExportNotice();
    setStatus(formatRecorderStatus(`已清空序列帧：${result.framesPath || documentContext.recordingsRootDir}`));
    return result;
  } catch (error) {
    setRecorderState({ state: RECORDER_STATES.error, nextCaptureAt: "", lastError: formatError(error) });
    updateControlState();
    setStatus(formatRecorderStatus(`清空序列帧失败：${formatError(error)}`));
    showExportNotice("清空序列帧失败", [formatError(error)], "error");
    console.log("[OK-Record] clear recording timeline failed:", error);
    throw error;
  }
}

async function startPaintingTimer() {
  try {
    if (paintingTimerState.enabled) {
      throw new Error("绘画计时已开启");
    }

    await ensureDocumentChangeListener();
    const idleTimeoutSeconds = readPaintingTimerTimeoutSecondsFromPanel();
    paintingTimerDocumentSignature = getActiveDocumentHistorySignature();
    clearPaintingTimerTimeout();
    startPaintingTimerTick();
    setPaintingTimerState(paintingTimerModel.armPaintingTimerState(paintingTimerState, Date.now(), {
      idleTimeoutSeconds,
      waitingReason: "等待画布变化",
    }));
    updateControlState();
    updatePaintingTimerStatus();
    queuePersistPaintingTimerState();
    setStatus(formatRecorderStatus("绘画计时已开启；等待画布变化"));
  } catch (error) {
    setPaintingTimerState({ lastError: formatError(error) });
    updatePaintingTimerStatus();
    setStatus(formatRecorderStatus("绘画计时开启失败"));
    throw error;
  }
}

function stopPaintingTimer() {
  if (!paintingTimerState.enabled) {
    setPaintingTimerState({ lastStopReason: "绘画计时未开启", lastError: "" });
    updatePaintingTimerStatus();
    setStatus(formatRecorderStatus("绘画计时未开启"));
    return;
  }

  const stoppedAtMs = Date.now();
  const stoppedState = paintingTimerModel.finishActiveSegment(paintingTimerState, stoppedAtMs, "手动暂停");
  clearPaintingTimerTimeout();
  stopPaintingTimerTick();
  paintingTimerDocumentSignature = "";
  setPaintingTimerState({
    ...stoppedState,
    enabled: false,
    active: false,
    ended: false,
    stoppedAt: new Date(stoppedAtMs).toISOString(),
    idleDeadlineAt: "",
    idleDeadlineAtMs: 0,
    activeStartedAtMs: 0,
    lastStopReason: "手动暂停",
    lastError: "",
  });
  updateControlState();
  updatePaintingTimerStatus();
  queuePersistPaintingTimerState();
  setStatus(formatRecorderStatus("绘画计时已暂停"));
}

function endPaintingTimer() {
  const endedAtMs = Date.now();
  clearPaintingTimerTimeout();
  stopPaintingTimerTick();
  paintingTimerDocumentSignature = "";
  setPaintingTimerState({
    ...paintingTimerModel.endPaintingTimerState(paintingTimerState, endedAtMs),
    lastError: "",
  });
  updateControlState();
  updatePaintingTimerStatus();
  queuePersistPaintingTimerState();
  setStatus(formatRecorderStatus(`绘画计时已结束：绘画总时长 ${formatDurationClock(getPaintingTimerElapsedSeconds())}`));
}

function resetPaintingTimer(options = {}) {
  const idleTimeoutSeconds = paintingTimerState.idleTimeoutSeconds;
  clearPaintingTimerTimeout();
  stopPaintingTimerTick();
  paintingTimerDocumentSignature = "";
  paintingTimerState = createInitialPaintingTimerState();
  setPaintingTimerState({ idleTimeoutSeconds });
  updatePaintingTimerInputs();
  updateControlState();
  updatePaintingTimerStatus();
  queuePersistPaintingTimerState();
  if (options.announce !== false) {
    setStatus(formatRecorderStatus("绘画计时已重置"));
  }
}

function chooseTimelineExportAspectRatioMode(session) {
  if (!session || session.aspectRatioConsistent !== false) {
    return "strict";
  }

  return chooseSequenceExportAspectRatioMode(false, session.aspectRatioGroupsJson);
}

function chooseSequenceExportAspectRatioMode(aspectRatioConsistent, aspectRatioGroupsJson) {
  if (aspectRatioConsistent !== false) {
    return "strict";
  }

  const summaryText = formatAspectRatioGroupsForPrompt(aspectRatioGroupsJson);
  if (typeof confirm !== "function") {
    throw new Error(`检测到不同比例的序列帧，请先手动清理后再导出。${summaryText ? `\n${summaryText}` : ""}`);
  }

  if (confirm(`检测到不同比例的序列帧。\n${summaryText}\n\n确定：自动补边合并输出。\n取消：继续选择其它处理方式。`)) {
    return "pad";
  }
  if (confirm("是否自动忽略少数比例不统一的序列帧，只导出数量最多的那组比例？\n\n确定：忽略少数比例并导出。\n取消：手动清理后再导出。")) {
    return "majority";
  }
  throw new Error("已取消导出。请手动清理不同比例的序列帧后再导出。");
}

function formatAspectRatioGroupsForPrompt(groupsJson) {
  const groups = parseAspectRatioGroups(groupsJson);
  if (!groups.length) {
    return "";
  }
  return groups
    .map((group) => `${group.ratio || "未知比例"}：${Number(group.frameCount) || 0} 帧`)
    .join("\n");
}

function parseAspectRatioGroups(groupsJson) {
  try {
    const value = JSON.parse(groupsJson || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

async function exportSession() {
  try {
    if (recordingLoopActive ||
      recorderState.state === RECORDER_STATES.recording ||
      recordingPauseRequested) {
      throw new Error("导出前请先暂停录制");
    }
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }
    const exportingDirectorySequence = Boolean(recorderState.exportSourceDir);
    if (!exportingDirectorySequence && (!recorderState.activeSession || !recorderState.activeSession.sessionId)) {
      throw new Error("没有可导出的录制时间线或导出序列帧目录");
    }
    const exportContext = exportingDirectorySequence ? null : requireCurrentRecordingContextForSession("导出");
    if (!exportingDirectorySequence && recorderState.activeSession.exportFrameMetadataConsistent === false) {
      const frameName = recorderState.activeSession.inconsistentFrameName || "未知帧";
      throw new Error(`当前录制包含混合格式帧（从 ${frameName} 开始），请统一序列帧格式后再导出`);
    }

    setRecorderState({
      state: RECORDER_STATES.exporting,
      nextCaptureAt: "",
      lastExportProgress: null,
      lastExportStatus: EXPORT_STATUSES.exporting,
      lastError: "",
    });
    hideExportNotice();
    setStatus(formatRecorderStatus("正在通过 native FFmpeg 导出视频..."));
    updateControlState();
    await waitForPanelRender({ minDelayMs: EXPORT_STATUS_PAINT_DELAY_MS });

    const exportProfile = readExportProfileFromPanel();
    const aspectRatioMode = exportingDirectorySequence ?
      chooseSequenceExportAspectRatioMode(recorderState.exportSourceAspectRatioConsistent, recorderState.exportSourceAspectRatioGroupsJson) :
      chooseTimelineExportAspectRatioMode(recorderState.activeSession);
    const result = exportingDirectorySequence ?
      await nativeBridge.exportSequence({
        framesDir: recorderState.exportSourceDir,
        aspectRatioMode,
        targetDurationSeconds: exportProfile.durationSeconds,
        outputFps: exportProfile.outputFps,
        maxWidth: exportProfile.maxWidth,
        crf: exportProfile.crf,
      }) :
      await nativeBridge.exportSession({
        outputDir: exportContext.outputDir,
        sessionId: recorderState.activeSession.sessionId,
        aspectRatioMode,
        targetDurationSeconds: exportProfile.durationSeconds,
        outputFps: exportProfile.outputFps,
        maxWidth: exportProfile.maxWidth,
        crf: exportProfile.crf,
      });

    setRecorderState({
      state: RECORDER_STATES.idle,
      lastExportPath: result.outputPath,
      lastExportLogPath: result.logPath,
      lastExportProgress: createExportProgressSnapshot(result),
      lastExportStatus: EXPORT_STATUSES.success,
      lastError: "",
    });
    updateControlState();

    const exportMessages = buildExportSuccessMessages({
      result,
      exportProfile,
      frameQualityLabel: formatFrameQualityPreset(recorderState.frameQualityPreset),
      captureResolutionLabel: formatCaptureResolutionPreset(exportProfile.maxWidth),
      outputFileName: getNativeBasename(result.outputPath),
    });
    setStatus(exportMessages.statusMessage);
    showBlockingNotice(exportMessages.noticeTitle, exportMessages.noticeLines, exportMessages.noticeTone);
    console.log("[OK-Record] export session:", result);
    return result;
  } catch (error) {
    const errorText = formatError(error);
    setRecorderState({
      state: RECORDER_STATES.error,
      nextCaptureAt: "",
      lastExportStatus: EXPORT_STATUSES.failure,
      lastError: errorText,
    });
    updateControlState();
    const exportMessages = buildExportFailureMessages(errorText);
    setStatus(exportMessages.statusMessage);
    showBlockingNotice(exportMessages.noticeTitle, exportMessages.noticeLines, exportMessages.noticeTone);
    console.log("[OK-Record] export session failed:", error);
    throw error;
  }
}

async function openExportFolder() {
  try {
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }
    const folderPath = getExportFolderPath();
    const shell = uxp.shell;
    if (!shell || typeof shell.openPath !== "function") {
      throw new Error("UXP shell.openPath 不可用");
    }

    const result = await shell.openPath(folderPath, "打开 OK-Record 导出目录。");
    if (result) {
      throw new Error(result);
    }

    setRecorderState({ lastError: "" });
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("打开导出目录失败"));
    updateControlState();
    console.log("[OK-Record] open export folder failed:", error);
    throw error;
  }
}

async function getLocalDocumentationPath() {
  const localFileSystem = uxp.storage && uxp.storage.localFileSystem;
  if (
    !localFileSystem ||
    typeof localFileSystem.getPluginFolder !== "function" ||
    typeof localFileSystem.getNativePath !== "function"
  ) {
    throw new Error("UXP localFileSystem.getPluginFolder 不可用");
  }

  const pluginFolder = await localFileSystem.getPluginFolder();
  const pluginRootPath = localFileSystem.getNativePath(pluginFolder);
  if (!pluginRootPath) {
    throw new Error("无法解析 OK-Record 使用说明路径");
  }

  return pathPolicy.joinNativePath(
    pathPolicy.joinNativePath(pluginRootPath, LOCAL_DOCUMENTATION_DIR_NAME),
    LOCAL_DOCUMENTATION_FILENAME,
  );
}

async function openLocalDocumentation() {
  try {
    const documentationPath = await getLocalDocumentationPath();
    const shell = uxp.shell;
    if (!shell || typeof shell.openPath !== "function") {
      throw new Error("UXP shell.openPath 不可用");
    }

    const result = await shell.openPath(documentationPath, "打开 OK-Record 使用说明。");
    if (result) {
      throw new Error(result);
    }

    setRecorderState({ lastError: "" });
    setStatus(formatRecorderStatus(`已打开使用说明：${documentationPath}`));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("打开使用说明失败"));
    showExportNotice("打开使用说明失败", [formatError(error)], "error");
    console.log("[OK-Record] open local documentation failed:", error);
    throw error;
  }
}

function getCurrentPluginVersion() {
  return uxp.versions && uxp.versions.plugin ? String(uxp.versions.plugin).trim() : "";
}

function parseVersionParts(version) {
  return String(version || "")
    .split(".")
    .map((part) => {
      const match = String(part || "").match(/^\d+/);
      return match ? Number(match[0]) : 0;
    });
}

function compareVersionStrings(candidateVersion, currentVersion) {
  const candidateParts = parseVersionParts(candidateVersion);
  const currentParts = parseVersionParts(currentVersion);
  const partCount = Math.max(candidateParts.length, currentParts.length, 3);
  for (let index = 0; index < partCount; index += 1) {
    const candidatePart = candidateParts[index] || 0;
    const currentPart = currentParts[index] || 0;
    if (candidatePart > currentPart) {
      return 1;
    }
    if (candidatePart < currentPart) {
      return -1;
    }
  }
  return 0;
}

function getPhotoshopHostVersion() {
  return uxp.host && uxp.host.version ? String(uxp.host.version).trim() : "";
}

function supportsExecuteAsModalTimeout() {
  const hostVersion = getPhotoshopHostVersion();
  return hostVersion &&
    compareVersionStrings(hostVersion, EXECUTE_AS_MODAL_TIMEOUT_MIN_PHOTOSHOP_VERSION) >= 0;
}

function createCaptureExecuteAsModalOptions(commandName, descriptor) {
  const options = {
    commandName,
    interactive: true,
  };
  if (descriptor) {
    options.descriptor = descriptor;
  }
  if (supportsExecuteAsModalTimeout()) {
    options.timeOut = EXECUTE_AS_MODAL_COLLISION_TIMEOUT_SECONDS;
  }
  return options;
}

function normalizeUpdateUrl(url, fieldName) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }
  if (!value.startsWith(UPDATE_RELEASES_URL_PREFIX)) {
    throw new Error(`更新清单中的 ${fieldName} 不是 OK-Record GitHub Release 地址`);
  }
  return value;
}

function normalizeExternalUpdateUrl(url, fieldName) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }
  if (!value.startsWith("https://")) {
    throw new Error(`更新清单中的 ${fieldName} 必须是 https 地址`);
  }
  return value;
}

function normalizeUpdateManifest(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("更新清单格式无效");
  }
  if (payload.schema && payload.schema !== UPDATE_MANIFEST_SCHEMA) {
    throw new Error(`更新清单 schema 不匹配：${payload.schema}`);
  }

  const version = String(payload.version || "").trim();
  if (!version) {
    throw new Error("更新清单缺少 version");
  }

  return {
    version,
    releasePageUrl: normalizeUpdateUrl(payload.releasePageUrl, "releasePageUrl"),
    downloadUrl: normalizeUpdateUrl(payload.downloadUrl, "downloadUrl"),
    netdiskUrl: normalizeExternalUpdateUrl(payload.netdiskUrl, "netdiskUrl"),
    summary: String(payload.summary || "").trim(),
  };
}

function getUpdateDownloadPageUrl() {
  return (latestAvailableUpdate && latestAvailableUpdate.releasePageUrl) || DEFAULT_UPDATE_RELEASE_PAGE_URL;
}

function getUpdateDownloadTargets() {
  return {
    githubUrl: getUpdateDownloadPageUrl(),
    netdiskUrl: (latestAvailableUpdate && latestAvailableUpdate.netdiskUrl) || "",
  };
}

function getUpdateBadgeViewState() {
  return {
    updateAvailable: Boolean(latestAvailableUpdate),
    updateVersion: latestAvailableUpdate ? latestAvailableUpdate.version : "",
  };
}

function syncUpdateBadge() {
  panelView.renderUpdateBadge({
    updateBadgeRowNode,
    updateBadgeButtonNode,
  }, getUpdateBadgeViewState());
}

function showUpdateNotice(updateInfo, currentVersion) {
  const releasePageUrl = updateInfo.releasePageUrl || DEFAULT_UPDATE_RELEASE_PAGE_URL;
  const lines = [
    `当前版本：${currentVersion || "未知"}`,
    `最新版本：${updateInfo.version}`,
    updateInfo.summary,
    updateInfo.netdiskUrl ? `网盘：${updateInfo.netdiskUrl}` : "网盘：未配置",
    "面板菜单：下载页_Download Page",
    `下载页：${releasePageUrl}`,
  ].filter(Boolean);

  showExportNotice(`发现新版本 ${updateInfo.version}`, lines, "success");
  syncUpdateBadge();
  setStatus(formatRecorderStatus(`发现新版本 ${updateInfo.version}`));
}

function showCachedUpdateNotice() {
  if (!latestAvailableUpdate) {
    return;
  }
  showUpdateNotice(latestAvailableUpdate, getCurrentPluginVersion());
}

async function checkForUpdates() {
  const currentVersion = getCurrentPluginVersion();
  if (!currentVersion || typeof fetch !== "function") {
    return null;
  }

  const response = await fetch(UPDATE_MANIFEST_URL);
  if (!response || response.ok === false) {
    throw new Error(`更新检查请求失败：${response && response.status ? response.status : "unknown"}`);
  }
  if (typeof response.json !== "function") {
    throw new Error("更新检查响应不能解析为 JSON");
  }

  const updateInfo = normalizeUpdateManifest(await response.json());
  if (compareVersionStrings(updateInfo.version, currentVersion) <= 0) {
    return null;
  }

  latestAvailableUpdate = updateInfo;
  showUpdateNotice(updateInfo, currentVersion);
  return updateInfo;
}

function queueUpdateCheck() {
  if (latestAvailableUpdate) {
    return updateCheckPromise || Promise.resolve(latestAvailableUpdate);
  }
  if (updateCheckPromise) {
    return updateCheckPromise;
  }

  updateCheckPromise = checkForUpdates()
    .catch((error) => {
      console.log("[OK-Record] update check failed:", error);
      return null;
    })
    .then((result) => {
      if (!latestAvailableUpdate) {
        updateCheckPromise = null;
      }
      return result;
    });
  return updateCheckPromise;
}

function showUpdateDownloadDialog() {
  if (!latestAvailableUpdate) {
    return;
  }
  const targets = getUpdateDownloadTargets();
  panelView.showUpdateDialog({
    updateDialogNode,
    updateDialogTitleNode,
    updateDialogVersionNode,
    updateDialogSummaryNode,
    updateDialogGithubButtonNode,
    updateDialogNetdiskButtonNode,
    updateDialogHintNode,
  }, {
    currentVersion: getCurrentPluginVersion(),
    version: latestAvailableUpdate.version,
    summary: latestAvailableUpdate.summary,
    githubUrl: targets.githubUrl,
    netdiskUrl: targets.netdiskUrl,
  });
}

function hideUpdateDialog() {
  panelView.hideUpdateDialog({ updateDialogNode });
}

async function openExternalUpdateUrl(url, label) {
  try {
    const targetUrl = String(url || "").trim();
    if (!targetUrl) {
      throw new Error(`${label}链接未配置`);
    }
    const shell = uxp.shell;
    if (!shell || typeof shell.openExternal !== "function") {
      throw new Error("UXP shell.openExternal 不可用");
    }

    const result = await shell.openExternal(targetUrl, `打开 OK-Record ${label}。`);
    if (result) {
      throw new Error(result);
    }

    setRecorderState({ lastError: "" });
    hideUpdateDialog();
    setStatus(formatRecorderStatus(`已打开${label}：${targetUrl}`));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus(`打开${label}失败`));
    showExportNotice(`打开${label}失败`, [formatError(error)], "error");
    console.log(`[OK-Record] open update ${label} failed:`, error);
    throw error;
  }
}

async function openUpdateDownloadPage() {
  await openExternalUpdateUrl(getUpdateDownloadPageUrl(), "下载页");
}

async function openUpdateNetdiskPage() {
  const targets = getUpdateDownloadTargets();
  await openExternalUpdateUrl(targets.netdiskUrl, "网盘下载页");
}

async function chooseProjectOutputDir() {
  try {
    if (recordingLoopActive || recorderState.state === RECORDER_STATES.recording || recordingPauseRequested || isRecorderBusy()) {
      throw new Error("请先停止录制并等待当前任务完成");
    }

    const wasPaused = isRecordingPaused();
    const documentContext = requireCurrentRecordingContext();
    const localFileSystem = uxp.storage.localFileSystem;
    const folder = await localFileSystem.getFolder();
    if (!folder) {
      return null;
    }

    const nativePath = localFileSystem.getNativePath(folder);
    if (!nativePath) {
      throw new Error("无法解析所选 OK-Record 保存目录 native 路径");
    }
    const manualBinding = recordingContext.createManualProjectOutputBinding({
      ...documentContext,
      outputDir: nativePath,
    });
    const restoredAutomaticProjectOutputDir = Boolean(manualBinding.restoredAutomaticProjectOutputDir);

    recordingLoopActive = false;
    recordingPauseRequested = false;
    if (wasPaused) {
      await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });
    }

    setRecorderState({
      frameOutputDir: manualBinding.frameOutputDir,
      frameOutputDocumentKey: manualBinding.frameOutputDocumentKey,
      activeSession: null,
      frameCount: 0,
      lastCaptureAt: "",
      stepFrameCount: 0,
      lastStepCaptureAt: "",
      lastStepFramePath: "",
      lastExportPath: "",
      lastExportLogPath: "",
      lastExportProgress: null,
      lastExportStatus: EXPORT_STATUSES.idle,
      nextCaptureAt: "",
      documentDirty: false,
      lastDirtyAt: "",
      lastChangeEvent: "",
      lastSkipAt: "",
      skippedCaptureCount: 0,
      lastError: "",
    });
    queuePersistPanelSettings();
    updateControlState();
    const directoryStatus = restoredAutomaticProjectOutputDir ?
      "已恢复当前 PSD 默认 OK-Record 保存目录" :
      "OK-Record 保存目录已更新";
    setStatus(formatRecorderStatus(wasPaused ? `${directoryStatus}；暂停录制已结束` : directoryStatus));
    await restoreRecorderState();
    await restoreStepFrameState();
    return nativePath;
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("设置 OK-Record 保存目录失败"));
    updateControlState();
    console.log("[OK-Record] choose project output dir failed:", error);
    throw error;
  }
}

async function openFrameOutputDir() {
  try {
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }

    const folderPath = await getRecordingsRootDirNativePath();
    const shell = uxp.shell;
    if (!shell || typeof shell.openPath !== "function") {
      throw new Error("UXP shell.openPath 不可用");
    }

    const result = await shell.openPath(folderPath, "打开 OK-Record 序列帧目录。");
    if (result) {
      throw new Error(result);
    }

    setRecorderState({ lastError: "" });
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("打开序列帧目录失败"));
    updateControlState();
    console.log("[OK-Record] open frame output dir failed:", error);
    throw error;
  }
}

async function openStepOutputDir() {
  try {
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }

    const folderPath = await getStepOutputDirNativePath();
    const shell = uxp.shell;
    if (!shell || typeof shell.openPath !== "function") {
      throw new Error("UXP shell.openPath 不可用");
    }

    const result = await shell.openPath(folderPath, "打开 OK-Record 步骤图目录。");
    if (result) {
      throw new Error(result);
    }

    setRecorderState({ lastError: "" });
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("打开步骤图目录失败"));
    updateControlState();
    console.log("[OK-Record] open step output dir failed:", error);
    throw error;
  }
}

async function chooseExportSequenceDir() {
  let nativePath = "";
  try {
    if (recordingLoopActive || recordingPauseRequested || isRecorderBusy()) {
      throw new Error("请先暂停录制并等待当前任务完成");
    }

    const localFileSystem = uxp.storage.localFileSystem;
    const folder = await localFileSystem.getFolder();
    if (!folder) {
      return null;
    }

    nativePath = localFileSystem.getNativePath(folder);
    if (!nativePath) {
      throw new Error("无法解析所选导出序列帧目录 native 路径");
    }

    const resolvedSource = await resolveExportSequenceSelection(nativePath);
    const scan = resolvedSource.scan;
    if (!scan.frameCount) {
      throw new Error(`所选目录没有可导出的 step_001.png 或 frame_000001.jpg/png 序列，也没有可恢复的 ${RECORDINGS_ROOT_DIR_NAME} 录制时间线`);
    }

    setRecorderState({
      exportSourceDir: resolvedSource.framesDir,
      exportSourceFrameCount: Number(scan.frameCount) || 0,
      exportSourceLastFramePath: scan.lastFramePath || "",
      exportSourceAspectRatioConsistent: scan.aspectRatioConsistent !== false,
      exportSourceAspectRatioGroupsJson: scan.aspectRatioGroupsJson || "",
      lastExportStatus: EXPORT_STATUSES.idle,
      lastError: "",
    });
    queuePersistPanelSettings();
    updateHoldSecondsInput(recorderState.exportDurationSeconds);
    updateControlState();
    setStatus(formatRecorderStatus(`导出序列帧目录已更新：${scan.frameCount} 张`));
    return resolvedSource.framesDir;
  } catch (error) {
    const statePatch = nativePath ?
      {
        exportSourceDir: "",
        exportSourceFrameCount: 0,
        exportSourceLastFramePath: "",
        exportSourceAspectRatioConsistent: true,
        exportSourceAspectRatioGroupsJson: "",
        lastExportStatus: EXPORT_STATUSES.idle,
        lastError: formatError(error),
      } :
      { lastError: formatError(error) };
    setRecorderState(statePatch);
    if (nativePath) {
      queuePersistPanelSettings();
    }
    setStatus(formatRecorderStatus("设置导出序列帧目录失败"));
    updateControlState();
    console.log("[OK-Record] choose export sequence dir failed:", error);
    throw error;
  }
}

async function runScheduledCapture(label, options) {
  if (!recordingLoopActive) {
    return;
  }

  clearScheduledCapture();

  try {
    assertActiveRecordingContextStillCurrent();
    if (shouldSkipScheduledCapture(options)) {
      skipScheduledCapture();
      if (recordingLoopActive) {
        scheduleNextCapture(`${label}：没有文档变化，已跳过`);
      }
      return null;
    }

    if (shouldDeferScheduledCaptureForIdle(options)) {
      deferScheduledCaptureUntilIdle(label);
      return null;
    }

    await captureFrame({
      label,
      commandName: "OK-Record 定时采样",
      finalState: getRecordingFinalStateAfterCapture,
      deferHostModalCollision: true,
    });

    if (recordingPauseRequested) {
      recordingPauseRequested = false;
      updateControlState();
      setStatus(formatRecorderStatus("录制已暂停"));
    }

    if (recordingLoopActive) {
      scheduleNextCapture("Recording");
    } else if (recorderState.state === RECORDER_STATES.recording) {
      setRecorderState(recorderDomain.pauseRecordingState(recorderState));
      updateControlState();
      setStatus(formatRecorderStatus("录制已暂停"));
    }
  } catch (error) {
    if (recordingLoopActive && recorderScheduler.isHostModalCollisionError(error)) {
      deferScheduledCaptureForHostModal(label);
      return null;
    }

    recordingLoopActive = false;
    recordingPauseRequested = false;
    await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });
    setRecorderState({
      state: RECORDER_STATES.error,
      nextCaptureAt: "",
      lastError: formatError(error),
    });
    updateControlState();
    setStatus(formatRecorderStatus(`${label}失败：${formatError(error)}`));
    showBlockingNotice(`${label}失败`, [formatError(error)], "error");
    throw error;
  }
}

function shouldDeferScheduledCaptureForIdle(options) {
  if (options && options.idleDeadlineExpired) {
    return false;
  }
  return recorderScheduler.shouldDeferCaptureForIdle(recorderState, {
    force: options && options.force,
    photoshopIdle: photoshopUserIdle,
    idleAwareEnabled: idleCaptureListenerRegistered,
    idleCaptureDelaySeconds: recorderState.idleCaptureDelaySeconds,
    idleCaptureMaxWaitSeconds: recorderState.idleCaptureMaxWaitSeconds,
  });
}

function deferScheduledCaptureUntilIdle(label) {
  clearIdleCaptureDeadline();
  idleCaptureWaiting = true;
  const maxWaitSeconds = clampNumber(
    recorderState.idleCaptureMaxWaitSeconds,
    DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS,
  );
  const deadlineAt = new Date(Date.now() + (maxWaitSeconds * 1000)).toISOString();
  setRecorderState({
    state: RECORDER_STATES.recording,
    nextCaptureAt: deadlineAt,
    lastError: "",
  });
  idleCaptureDeadlineTimerId = setTimeout(() => {
    idleCaptureDeadlineTimerId = null;
    if (!idleCaptureWaiting || !recordingLoopActive) {
      return;
    }
    idleCaptureWaiting = false;
    runScheduledCapture(`${label}（等待空闲超时）`, { idleDeadlineExpired: true }).catch(() => {});
  }, maxWaitSeconds * 1000);
  updateControlState();
  setStatus(formatRecorderStatus(`${label}：等待 Photoshop 空闲后采样`));
}

function deferScheduledCaptureForHostModal(label) {
  clearScheduledCapture();
  const nextCaptureAt = new Date(Date.now() + HOST_MODAL_CAPTURE_RETRY_DELAY_MS).toISOString();
  setRecorderState({
    state: RECORDER_STATES.recording,
    nextCaptureAt,
    lastError: "",
  });
  captureTimerId = setTimeout(() => {
    runScheduledCapture(label, { force: true }).catch(() => {});
  }, HOST_MODAL_CAPTURE_RETRY_DELAY_MS);
  updateControlState();
  setStatus(formatRecorderStatus(`${label}：Photoshop 正在变换或显示模态窗口，等待完成后继续采样`));
}

async function captureStepFrame(options) {
  const core = photoshop.core;
  const label = options.label;
  const commandName = options.commandName;

  try {
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }

    stepCaptureActive = true;
    setRecorderState({ state: RECORDER_STATES.capturePending, nextCaptureAt: "", lastError: "" });
    updateControlState();
    setStatus(formatRecorderStatus(`${label}：正在读取原图尺寸合成图...`));
    await waitForPanelRender();

    const outputDir = await getStepOutputDirNativePath();
    const modalStartedAtMs = nowMs();
    const capture = await core.executeAsModal(
      captureCompositeForFrameRead,
      createCaptureExecuteAsModalOptions(commandName, {
        targetWidth: 0,
      }),
    );
    const modalMs = elapsedMsSince(modalStartedAtMs);
    const copyStartedAtMs = nowMs();
    const arrayBuffer = copyPixelDataToArrayBuffer(capture.pixelData);
    const copyMs = elapsedMsSince(copyStartedAtMs);
    capture.pixelData = null;
    capture.arrayBuffer = arrayBuffer;
    capture.metadata.byteLength = arrayBuffer.byteLength;
    capture.metadata.outputDir = outputDir;
    capture.metadata.requestId = buildCaptureRequestId();

    const captureDiagnostics = createCaptureDiagnostics(capture.timings, {
      targetWidth: 0,
      modalMs,
      copyMs,
      nativeWriteMs: 0,
    });

    setRecorderState({ state: RECORDER_STATES.writing });
    updateControlState();
    const captureStatusLines = [
      `${label}：已捕获`,
      "输出：原图尺寸 PNG 无损步骤图",
      `尺寸：${capture.metadata.width} x ${capture.metadata.height}`,
      `缓冲区：${capture.metadata.byteLength} 字节`,
    ];
    appendCaptureDiagnosticsLines(captureStatusLines, captureDiagnostics, {
      targetWidthLabel: formatCaptureTargetWidth(captureDiagnostics.targetWidth),
    });
    captureStatusLines.push("正在通过 native addon 写入...");
    setStatus(captureStatusLines.join("\n"));

    const nativeWriteStartedAtMs = nowMs();
    const result = await nativeBridge.writeStepFrame(capture.metadata, capture.arrayBuffer);
    captureDiagnostics.nativeWriteMs = elapsedMsSince(nativeWriteStartedAtMs);

    const finalState = typeof options.finalState === "function" ? options.finalState() : options.finalState;
    stepCaptureActive = false;
    setRecorderState({
      state: finalState || RECORDER_STATES.idle,
      stepFrameCount: Number(result.frameCount) || 0,
      lastStepCaptureAt: result.capturedAt || capture.metadata.capturedAt,
      lastStepFramePath: result.framePath || "",
      lastCaptureDiagnostics: captureDiagnostics,
      lastError: "",
    });
    updateControlState();

    setStatus(buildStepCaptureSuccessStatus({
      label,
      result,
      diagnosticsLines: createCaptureDiagnosticsLines(captureDiagnostics, {
        targetWidthLabel: formatCaptureTargetWidth(captureDiagnostics.targetWidth),
      }),
    }));
    console.log("[OK-Record] capture step frame:", result);
    logCaptureDiagnostics("capture step frame", captureDiagnostics);
    return result;
  } catch (error) {
    stepCaptureActive = false;
    setRecorderState({
      state: RECORDER_STATES.error,
      nextCaptureAt: "",
      lastError: formatError(error),
    });
    updateControlState();
    const message = `${label}失败：${formatError(error)}`;
    setStatus(message);
    showBlockingNotice(`${label}失败`, [formatError(error)], "error");
    console.log("[OK-Record] capture step frame failed:", error);
    throw error;
  }
}

async function captureFrame(options) {
  const core = photoshop.core;
  const label = options.label;
  const commandName = options.commandName;
  let modalReadCompleted = false;

  try {
    if (isRecorderBusy()) {
      throw new Error(`录制器忙碌：${formatRecorderState(recorderState.state)}`);
    }

    setRecorderState({ state: RECORDER_STATES.capturePending, nextCaptureAt: "", lastError: "" });
    updateControlState();
    setStatus(formatRecorderStatus(`${label}：正在读取文档合成图...`));

    const captureStartedAtChangeGeneration = documentChangeGeneration;
    const documentContext = assertActiveRecordingContextStillCurrent();
    const outputDir = documentContext.outputDir;
    const captureTargetWidth = readFrameCaptureTargetWidthFromPanel();
    const modalStartedAtMs = nowMs();
    const capture = await core.executeAsModal(
      captureCompositeForFrameRead,
      createCaptureExecuteAsModalOptions(commandName, {
        targetWidth: captureTargetWidth,
      }),
    );
    modalReadCompleted = true;
    const modalMs = elapsedMsSince(modalStartedAtMs);
    const copyStartedAtMs = nowMs();
    const arrayBuffer = copyPixelDataToArrayBuffer(capture.pixelData);
    const copyMs = elapsedMsSince(copyStartedAtMs);
    capture.pixelData = null;
    capture.arrayBuffer = arrayBuffer;
    capture.metadata.byteLength = arrayBuffer.byteLength;
    capture.metadata.captureTargetWidth = captureTargetWidth;
    const frameQualityPresetId = readFrameQualityPresetFromPanel();
    const frameQualityPreset = getFrameQualityPresetById(frameQualityPresetId);
    Object.assign(capture.metadata, createFrameStorageMetadata(frameQualityPreset));
    const captureDiagnostics = createCaptureDiagnostics(capture.timings, {
      targetWidth: captureTargetWidth,
      modalMs,
      copyMs,
      nativeWriteMs: 0,
    });
    const session = ensureActiveSessionForCapture(capture.metadata, documentContext);

    capture.metadata.outputDir = outputDir;
    capture.metadata.sessionId = session.sessionId;
    capture.metadata.requestId = buildCaptureRequestId();

    setRecorderState({ state: RECORDER_STATES.writing });
    updateControlState();
    const captureStatusLines = [
      `${label}：已捕获`,
      "录制：时间线",
      `尺寸：${capture.metadata.width} x ${capture.metadata.height}`,
      `压缩质量：${formatFrameQualityPreset(frameQualityPresetId)}`,
      `缓冲区：${capture.metadata.byteLength} 字节`,
    ].filter(Boolean);
    appendCaptureDiagnosticsLines(captureStatusLines, captureDiagnostics, {
      targetWidthLabel: formatCaptureTargetWidth(captureDiagnostics.targetWidth),
    });
    captureStatusLines.push("正在通过 native addon 写入...");
    setStatus(captureStatusLines.join("\n"));

    const nativeWriteStartedAtMs = nowMs();
    const result = await nativeBridge.writeFrame(capture.metadata, capture.arrayBuffer);
    captureDiagnostics.nativeWriteMs = elapsedMsSince(nativeWriteStartedAtMs);

    session.frameCount = result.frameCount;
    session.lastCaptureAt = result.lastCaptureAt;
    session.sessionPath = result.sessionPath;
    session.framesPath = result.framesPath || pathPolicy.joinNativePath(result.sessionPath || "", "frames");
    session.manifestPath = result.manifestPath;
    if (!session.captureGeometry) {
      session.captureGeometry = createCaptureGeometry(capture.metadata);
    }
    session.frameStorageFormat = result.frameStorageFormat || session.frameStorageFormat || "";
    session.frameExtension = result.frameExtension || session.frameExtension || "";
    session.frameQualityPreset = result.frameQualityPreset || session.frameQualityPreset || "";
    session.jpegQuality = Number(result.jpegQuality) || session.jpegQuality || 0;
    session.exportFrameMetadataConsistent = result.exportFrameMetadataConsistent !== false;
    session.aspectRatioConsistent = result.aspectRatioConsistent !== false;
    session.aspectRatioGroupsJson = result.aspectRatioGroupsJson || session.aspectRatioGroupsJson || "";
    session.majorityAspectRatioKey = result.majorityAspectRatioKey || session.majorityAspectRatioKey || "";
    session.majorityAspectRatioFrameCount = Number(result.majorityAspectRatioFrameCount) || session.majorityAspectRatioFrameCount || 0;
    session.inconsistentFrameName = result.inconsistentFrameName || "";
    session.inconsistentMetadataPath = result.inconsistentMetadataPath || "";
    refreshRecorderDocumentSignature();
    const finalState = typeof options.finalState === "function" ? options.finalState() : options.finalState;
    setRecorderState({
      state: finalState || RECORDER_STATES.idle,
      activeSession: session,
      frameCount: session.frameCount,
      lastCaptureAt: session.lastCaptureAt,
      lastCaptureDiagnostics: captureDiagnostics,
      documentDirty: recorderScheduler.didDocumentChangeDuringCapture(captureStartedAtChangeGeneration, documentChangeGeneration),
      lastError: "",
    });
    updateControlState();

    setStatus(buildFrameCaptureSuccessStatus({
      label,
      result,
      startedNewSession: false,
      frameIndexText: formatFrameIndex(result.frameIndex),
      frameStorageFormatLabel: formatFrameStorageFormat(result.frameStorageFormat, result.frameExtension),
      frameQualityLabel: formatFrameQualityPreset(result.frameQualityPreset),
      diagnosticsLines: createCaptureDiagnosticsLines(captureDiagnostics, {
        targetWidthLabel: formatCaptureTargetWidth(captureDiagnostics.targetWidth),
      }),
    }));
    console.log("[OK-Record] capture frame:", result);
    logCaptureDiagnostics("capture frame", captureDiagnostics);
    return result;
  } catch (error) {
    if (
      options &&
      options.deferHostModalCollision &&
      !modalReadCompleted &&
      recorderScheduler.isHostModalCollisionError(error)
    ) {
      console.log("[OK-Record] capture frame deferred because Photoshop is modal:", formatError(error));
      throw error;
    }

    setRecorderState({
      state: RECORDER_STATES.error,
      nextCaptureAt: "",
      lastError: formatError(error),
    });
    updateControlState();
    const message = `${label}失败：${formatError(error)}`;
    setStatus(message);
    showExportNotice(`${label}失败`, [formatError(error)], "error");
    console.log("[OK-Record] capture frame failed:", error);
    throw error;
  }
}

async function restoreRecorderState() {
  try {
    if (recordingLoopActive || isRecorderBusy()) {
      setStatus(formatRecorderStatus("录制器正在工作"));
      updateControlState();
      return null;
    }

    const documentContext = createCurrentRecordingContext();
    if (!documentContext.ok) {
      setRecorderState(createClearedRecordingTimelineStatePatch({ state: RECORDER_STATES.idle }));
      updateControlState();
      setStatus(formatRecorderStatus("就绪"));
      return null;
    }

    setStatus(formatRecorderStatus("正在恢复已完成帧..."));

    const outputDir = documentContext.outputDir;
    const scan = await scanRecordingSessionsForOutputRoot(outputDir);

    if (!scan.restored) {
      setRecorderState(createClearedRecordingTimelineStatePatch({
        state: RECORDER_STATES.idle,
      }));
      updateControlState();
      setStatus(formatRecorderStatus("就绪"));
      return scan;
    }

    const activeSessionScan = scan.activeSession;
    if (!activeSessionScan || !activeSessionScan.sessionId) {
      throw new Error("Native scan 结果缺少 activeSession");
    }

    const lastFrameMetadata = parseRecoveredFrameMetadata(activeSessionScan.lastFrameMetadataJson);
    if (!lastFrameMetadata.capturedAt) {
      throw new Error("恢复的帧元数据缺少 capturedAt");
    }
    const firstFrameMetadataJson = activeSessionScan.firstFrameMetadataJson || activeSessionScan.lastFrameMetadataJson;
    const firstFrameMetadata = parseRecoveredFrameMetadata(firstFrameMetadataJson);

    const session = recordingContext.applyRecordingContextToSession({
      sessionId: activeSessionScan.sessionId,
      createdAt: "",
      frameCount: Number(activeSessionScan.frameCount),
      lastCaptureAt: lastFrameMetadata.capturedAt,
      sessionPath: activeSessionScan.sessionPath,
      framesPath: activeSessionScan.framesPath || pathPolicy.joinNativePath(activeSessionScan.sessionPath || "", "frames"),
      manifestPath: activeSessionScan.manifestPath,
      captureGeometry: createCaptureGeometry(firstFrameMetadata),
      frameStorageFormat: firstFrameMetadata.frameStorageFormat || "raw-rgba",
      frameExtension: firstFrameMetadata.frameExtension || ".rgba",
      frameQualityPreset: firstFrameMetadata.frameQualityPreset || getFrameQualityPresetIdForStorage(firstFrameMetadata.frameStorageFormat),
      jpegQuality: Number(firstFrameMetadata.jpegQuality) || 0,
      exportFrameMetadataConsistent: activeSessionScan.exportFrameMetadataConsistent !== false,
      aspectRatioConsistent: activeSessionScan.aspectRatioConsistent !== false,
      aspectRatioGroupsJson: activeSessionScan.aspectRatioGroupsJson || "",
      majorityAspectRatioKey: activeSessionScan.majorityAspectRatioKey || "",
      majorityAspectRatioFrameCount: Number(activeSessionScan.majorityAspectRatioFrameCount) || 0,
      inconsistentFrameName: activeSessionScan.inconsistentFrameName || "",
      inconsistentMetadataPath: activeSessionScan.inconsistentMetadataPath || "",
    }, documentContext);

    setRecorderState({
      state: RECORDER_STATES.idle,
      activeSession: session,
      frameCount: session.frameCount,
      lastCaptureAt: session.lastCaptureAt,
      nextCaptureAt: "",
      documentDirty: false,
      lastDirtyAt: "",
      lastChangeEvent: "",
      lastSkipAt: "",
      skippedCaptureCount: 0,
      lastError: "",
    });
    updateControlState();
    setStatus(formatRecorderStatus("已从完成帧恢复录制时间线"));
    console.log("[OK-Record] recovered session:", scan);
    return scan;
  } catch (error) {
    setRecorderState({
      state: RECORDER_STATES.error,
      nextCaptureAt: "",
      lastError: formatError(error),
    });
    updateControlState();
    const message = `录制时间线恢复失败：${formatError(error)}`;
    setStatus(message);
    console.log("[OK-Record] session restore failed:", error);
    throw error;
  }
}

async function scanSequenceFrames(framesDir) {
  if (!framesDir) {
    return null;
  }
  return await nativeBridge.scanSequence({ framesDir });
}

async function scanRecordingSessionsForOutputRoot(outputDir) {
  if (!outputDir) {
    return null;
  }
  return await nativeBridge.scanRecordings({ outputDir });
}

async function resolveExportSequenceSelection(nativePath) {
  const directScan = await scanSequenceFrames(nativePath);
  if (directScan && Number(directScan.frameCount) > 0) {
    return { framesDir: nativePath, scan: directScan };
  }

  const candidateFrameDirs = [];
  const selectedBasename = getNativeBasename(nativePath).toLowerCase();
  if (selectedBasename !== "frames") {
    candidateFrameDirs.push(pathPolicy.joinNativePath(nativePath, "frames"));
  }

  const recordingOutputRoots = [nativePath];
  if (selectedBasename === RECORDINGS_ROOT_DIR_NAME.toLowerCase()) {
    recordingOutputRoots.unshift(getNativeDirname(nativePath));
  }

  for (const framesDir of uniqueStrings(candidateFrameDirs)) {
    const scan = await scanSequenceFrames(framesDir);
    if (scan && Number(scan.frameCount) > 0) {
      return { framesDir, scan };
    }
  }

  for (const outputRoot of uniqueStrings(recordingOutputRoots)) {
    const recordingsScan = await scanRecordingSessionsForOutputRoot(outputRoot);
    const activeSession = recordingsScan && recordingsScan.activeSession;
    if (!activeSession || !activeSession.framesPath) {
      continue;
    }
    const scan = await scanSequenceFrames(activeSession.framesPath);
    if (scan && Number(scan.frameCount) > 0) {
      return { framesDir: activeSession.framesPath, scan };
    }
  }

  return { framesDir: nativePath, scan: directScan };
}

function uniqueStrings(values) {
  const seen = new Set();
  const uniqueValues = [];
  for (const value of values) {
    const key = String(value || "");
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueValues.push(key);
  }
  return uniqueValues;
}

async function restoreStepFrameState() {
  try {
    if (!createCurrentRecordingContext().ok) {
      setRecorderState({
        stepFrameCount: 0,
        lastStepFramePath: "",
        lastError: "",
      });
      updateControlState();
      return null;
    }
    const stepsDir = await getStepOutputDirNativePath();
    const scan = await scanSequenceFrames(stepsDir);
    if (!scan) {
      return null;
    }
    setRecorderState({
      stepFrameCount: Number(scan.frameCount) || 0,
      lastStepFramePath: scan.lastFramePath || "",
      lastError: "",
    });
    updateControlState();
    return scan;
  } catch (error) {
    setRecorderState({ lastError: `步骤图恢复失败：${formatError(error)}` });
    updateControlState();
    console.log("[OK-Record] step frame restore failed:", error);
    return null;
  }
}

async function restoreExportSourceState() {
  if (!recorderState.exportSourceDir) {
    return null;
  }
  try {
    const scan = await scanSequenceFrames(recorderState.exportSourceDir);
    setRecorderState({
      exportSourceFrameCount: Number(scan.frameCount) || 0,
      exportSourceLastFramePath: scan.lastFramePath || "",
      exportSourceAspectRatioConsistent: scan.aspectRatioConsistent !== false,
      exportSourceAspectRatioGroupsJson: scan.aspectRatioGroupsJson || "",
      lastError: "",
    });
    updateHoldSecondsInput(recorderState.exportDurationSeconds);
    updateControlState();
    return scan;
  } catch (error) {
    setRecorderState({
      exportSourceFrameCount: 0,
      exportSourceLastFramePath: "",
      exportSourceAspectRatioConsistent: true,
      exportSourceAspectRatioGroupsJson: "",
      lastError: `导出源恢复失败：${formatError(error)}`,
    });
    updateControlState();
    console.log("[OK-Record] export source restore failed:", error);
    return null;
  }
}

async function captureCompositeForFrameRead(executionContext, descriptor) {
  const imaging = photoshop.imaging;
  let imageObj = null;

  try {
    if (executionContext && executionContext.reportProgress) {
      executionContext.reportProgress({
        commandName: "正在读取文档像素",
      });
    }

    const getPixelsStartedAtMs = nowMs();
    imageObj = await imaging.getPixels(createFrameCapturePixelOptions(descriptor));
    const getPixelsMs = elapsedMsSince(getPixelsStartedAtMs);
    const imageData = imageObj.imageData;
    const getDataStartedAtMs = nowMs();
    const pixelData = await imageData.getData({ chunky: true });
    const getDataMs = elapsedMsSince(getDataStartedAtMs);
    const byteLength = pixelData.byteLength || pixelData.length;
    const targetWidth = getFrameCaptureTargetWidth(descriptor);

    return {
      pixelData,
      timings: {
        getPixelsMs,
        getDataMs,
      },
      metadata: {
        capturedAt: new Date().toISOString(),
        width: imageData.width,
        height: imageData.height,
        components: imageData.components,
        componentSize: imageData.componentSize,
        pixelFormat: imageData.pixelFormat,
        colorSpace: imageData.colorSpace || "",
        colorProfile: imageData.colorProfile || "",
        hasAlpha: Boolean(imageData.hasAlpha),
        byteLength,
        captureTargetWidth: targetWidth,
        boundsJson: serializeSourceBounds(imageObj.sourceBounds),
      },
    };
  } finally {
    if (imageObj && imageObj.imageData) {
      imageObj.imageData.dispose();
    }
  }
}

function createFrameCapturePixelOptions(descriptor) {
  const targetWidth = getFrameCaptureTargetWidth(descriptor);
  if (targetWidth <= 0) {
    return {};
  }
  return {
    targetSize: {
      width: targetWidth,
    },
  };
}

function getFrameCaptureTargetWidth(descriptor) {
  const targetWidth = Number(descriptor && descriptor.targetWidth);
  if (!Number.isFinite(targetWidth)) {
    return 0;
  }
  if (targetWidth <= 0) {
    return 0;
  }
  return clampInteger(
    targetWidth,
    0,
    MIN_EXPORT_MAX_WIDTH,
    MAX_EXPORT_MAX_WIDTH,
  );
}

async function getRecorderOutputDirNativePath() {
  return requireCurrentRecordingContext().outputDir;
}

async function getRecordingsRootDirNativePath() {
  return requireCurrentRecordingContext().recordingsRootDir;
}

function getActiveDocumentDescriptor() {
  try {
    const activeDocument = photoshop.app && photoshop.app.activeDocument;
    if (!activeDocument) {
      return {
        documentPath: "",
        documentId: "",
        cloudDocument: false,
      };
    }
    return {
      documentPath: activeDocument.path || "",
      documentId: activeDocument.id === undefined || activeDocument.id === null ? "" : String(activeDocument.id),
      cloudDocument: Boolean(activeDocument.cloudDocument),
    };
  } catch (error) {
    return {
      documentPath: "",
      documentId: "",
      cloudDocument: false,
    };
  }
}

function getActiveDocumentNativePath() {
  return getActiveDocumentDescriptor().documentPath;
}

function createCurrentRecordingContext() {
  return recordingContext.createRecordingContext({
    ...getActiveDocumentDescriptor(),
    manualProjectOutputDir: recorderState.frameOutputDir,
    manualProjectOutputDocumentKey: recorderState.frameOutputDocumentKey,
  });
}

function requireCurrentRecordingContext() {
  return recordingContext.requireRecordingContext({
    ...getActiveDocumentDescriptor(),
    manualProjectOutputDir: recorderState.frameOutputDir,
    manualProjectOutputDocumentKey: recorderState.frameOutputDocumentKey,
  });
}

function assertSavedDocumentForRecording() {
  return requireCurrentRecordingContext();
}

function requireCurrentRecordingContextForSession(actionLabel) {
  const context = requireCurrentRecordingContext();
  if (recorderState.activeSession && !recordingContext.isSessionForRecordingContext(recorderState.activeSession, context)) {
    throw new Error(`${actionLabel}前请先切回这条录制时间线对应的本地 PSD/PSB 文档。`);
  }
  return context;
}

function assertActiveRecordingContextStillCurrent() {
  if (!activeRecordingContext) {
    return requireCurrentRecordingContext();
  }
  const currentContext = requireCurrentRecordingContext();
  if (!recordingContext.isSameRecordingContext(activeRecordingContext, currentContext)) {
    throw new Error(DOCUMENT_CONTEXT_CHANGED_MESSAGE);
  }
  return activeRecordingContext;
}

function isActiveRecordingContextStillCurrent() {
  if (!activeRecordingContext) {
    return false;
  }
  const currentContext = createCurrentRecordingContext();
  return currentContext.ok && recordingContext.isSameRecordingContext(activeRecordingContext, currentContext);
}

function isActiveRecordingDocumentReferenceOpen() {
  if (!activeRecordingContext || !activeRecordingContext.documentId) {
    return true;
  }

  const documentId = Number(activeRecordingContext.documentId);
  if (!Number.isFinite(documentId) || documentId <= 0) {
    return true;
  }

  return Boolean(photoshop.action.validateReference({
    _ref: "document",
    _id: documentId,
  }));
}

async function getStepOutputDirNativePath() {
  return pathPolicy.resolveStepOutputDir({
    recorderOutputDir: await getRecorderOutputDirNativePath(),
  });
}

function createInitialRecorderState() {
  return recorderDomain.createInitialRecorderState({
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    idleCaptureDelaySeconds: DEFAULT_IDLE_CAPTURE_DELAY_SECONDS,
    idleCaptureMaxWaitSeconds: DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    captureOnlyWhenChanged: DEFAULT_CAPTURE_ONLY_WHEN_CHANGED,
    exportDurationSeconds: DEFAULT_EXPORT_DURATION_SECONDS,
    exportHoldSeconds: DEFAULT_EXPORT_HOLD_SECONDS,
    exportOutputFps: DEFAULT_EXPORT_OUTPUT_FPS,
    exportMaxWidth: DEFAULT_EXPORT_MAX_WIDTH,
    frameQualityPreset: DEFAULT_FRAME_QUALITY_PRESET_ID,
  });
}

function createInitialPaintingTimerState() {
  return paintingTimerModel.createInitialPaintingTimerState({
    idleTimeoutSeconds: DEFAULT_PAINTING_TIMER_TIMEOUT_SECONDS,
  });
}

function setRecorderState(patch) {
  recorderState = {
    ...recorderState,
    ...patch,
  };
}

function createClearedRecordingTimelineStatePatch(extra = {}) {
  return {
    activeSession: null,
    frameCount: 0,
    lastCaptureAt: "",
    lastExportPath: "",
    lastExportLogPath: "",
    lastExportProgress: null,
    lastExportStatus: EXPORT_STATUSES.idle,
    nextCaptureAt: "",
    documentDirty: false,
    lastDirtyAt: "",
    lastChangeEvent: "",
    lastSkipAt: "",
    skippedCaptureCount: 0,
    lastError: "",
    ...extra,
  };
}

function setPaintingTimerState(patch) {
  paintingTimerState = {
    ...paintingTimerState,
    ...patch,
  };
}

function isRecorderBusy() {
  return recorderDomain.isRecorderBusy(recorderState);
}

function isRecordingPaused() {
  return recorderDomain.isRecordingPaused(recorderState);
}

function isRecordingActiveOrPendingPause() {
  return recorderDomain.isRecordingActiveOrPendingPause(recorderState, {
    recordingLoopActive,
    recordingPauseRequested,
  });
}

function getRecordingFrameCount() {
  return recorderDomain.getRecordingFrameCount(recorderState);
}

function getRecordingFrameCountText() {
  return `${getRecordingFrameCount()} 帧`;
}

function getRecordingFinalStateAfterCapture() {
  return recorderDomain.getRecordingFinalStateAfterCapture({
    recordingPauseRequested,
    recordingLoopActive,
  });
}

function readIntervalMinutesFromPanel() {
  const currentSeconds = getIntervalTotalSeconds(recorderState.intervalMinutes);
  const rawValue = intervalSecondsInputNode ? intervalSecondsInputNode.value : String(currentSeconds);
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    if (intervalSecondsInputNode) {
      intervalSecondsInputNode.value = String(currentSeconds);
    }
    throw new Error(`采样间隔（秒）必须在 ${MIN_INTERVAL_SECONDS} 到 ${MAX_INTERVAL_SECONDS} 之间`);
  }
  const seconds = Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, Math.round(value)));
  if (intervalSecondsInputNode) {
    intervalSecondsInputNode.value = String(seconds);
  }
  return seconds / SECONDS_PER_MINUTE;
}

function readIdleCaptureSettingsFromPanel() {
  const idleCaptureDelaySeconds = readBoundedNumber(
    idleCaptureDelaySecondsInputNode,
    recorderState.idleCaptureDelaySeconds,
    MIN_IDLE_CAPTURE_DELAY_SECONDS,
    MAX_IDLE_CAPTURE_DELAY_SECONDS,
    "延迟采样（秒）",
  );
  const idleCaptureMaxWaitSeconds = readBoundedNumber(
    idleCaptureMaxWaitSecondsInputNode,
    recorderState.idleCaptureMaxWaitSeconds,
    MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS,
    "最长等待时间（秒）",
  );
  if (
    idleCaptureDelaySeconds > 0 &&
    idleCaptureMaxWaitSeconds > 0 &&
    idleCaptureMaxWaitSeconds < idleCaptureDelaySeconds
  ) {
    throw new Error("最长等待时间不能小于延迟采样时间；输入 0 表示不等待，立刻采样");
  }
  return {
    idleCaptureDelaySeconds,
    idleCaptureMaxWaitSeconds,
  };
}

function getIdleCaptureListenerDelaySeconds(settings) {
  if (!settings || settings.idleCaptureDelaySeconds <= 0 || settings.idleCaptureMaxWaitSeconds <= 0) {
    return 0;
  }
  return settings.idleCaptureDelaySeconds;
}

function readPaintingTimerTimeoutSecondsFromPanel() {
  return readBoundedNumber(
    paintingTimerSecondsInputNode,
    paintingTimerState.idleTimeoutSeconds,
    MIN_PAINTING_TIMER_TIMEOUT_SECONDS,
    MAX_PAINTING_TIMER_TIMEOUT_SECONDS,
    "空闲暂停绘画计时（秒）",
  );
}

function readExportDurationSecondsFromPanel() {
  const currentParts = exportProfileModel.getDurationParts(recorderState.exportDurationSeconds);
  const minutes = readBoundedInteger(
    exportDurationMinutesInputNode,
    currentParts.minutes,
    0,
    Math.floor(MAX_EXPORT_DURATION_SECONDS / SECONDS_PER_MINUTE),
    "视频时长（分）",
  );
  const seconds = readBoundedNumber(
    exportDurationSecondsInputNode,
    currentParts.seconds,
    0,
    SECONDS_PER_MINUTE - 0.001,
    "视频时长（秒）",
  );
  const durationSeconds = (minutes * SECONDS_PER_MINUTE) + seconds;
  if (durationSeconds < MIN_EXPORT_DURATION_SECONDS || durationSeconds > MAX_EXPORT_DURATION_SECONDS) {
    throw new Error(`视频时长必须在 ${formatIntervalSeconds(MIN_EXPORT_DURATION_SECONDS)} 到 ${formatIntervalSeconds(MAX_EXPORT_DURATION_SECONDS)} 之间`);
  }
  return durationSeconds;
}

function readFrameQualityPresetFromPanel() {
  const presetId = frameQualityPresetSelectNode ? frameQualityPresetSelectNode.value : recorderState.frameQualityPreset;
  const preset = getFrameQualityPresetById(presetId);
  if (!preset) {
    throw new Error("压缩质量预设无效");
  }
  if (preset.id !== recorderState.frameQualityPreset) {
    setRecorderState({
      frameQualityPreset: preset.id,
      lastError: "",
    });
    queuePersistPanelSettings();
  }
  return preset.id;
}

function readCaptureResolutionPresetFromPanel() {
  const presetId = captureResolutionPresetSelectNode ?
    captureResolutionPresetSelectNode.value :
    getCaptureResolutionPresetIdForMaxWidth(recorderState.exportMaxWidth);
  const preset = getCaptureResolutionPresetById(presetId);
  if (!preset) {
    throw new Error("分辨率预设无效");
  }
  return preset;
}

function shouldSkipScheduledCapture(options) {
  const force = options && options.force;
  if (!force) {
    detectRecorderDocumentChange("historyStateChanged");
  }
  return recorderScheduler.shouldSkipScheduledCaptureState(recorderState, { force });
}

function skipScheduledCapture() {
  setRecorderState(recorderScheduler.createSkippedCapturePatch(
    recorderState,
    new Date().toISOString(),
    RECORDER_STATES.recording,
  ));
  updateControlState();
}

function readExportProfileFromPanel() {
  const outputFps = DEFAULT_EXPORT_OUTPUT_FPS;
  const durationSeconds = readExportDurationSecondsFromPanel();
  const resolutionPreset = readCaptureResolutionPresetFromPanel();
  const maxWidth = resolutionPreset.maxWidth;
  const frameCount = getExportFrameCountForProfile();
  const frameQualityPreset = readFrameQualityPresetFromPanel();
  const exportProfile = exportProfileModel.createExportProfile({
    durationSeconds,
    frameCount,
    outputFps,
    maxWidth,
    crf: DEFAULT_EXPORT_CRF,
  });

  const nextState = {
    exportDurationSeconds: exportProfile.durationSeconds,
    exportOutputFps: exportProfile.outputFps,
    exportMaxWidth: exportProfile.maxWidth,
    frameQualityPreset,
    lastError: "",
  };
  if (frameCount > 0) {
    nextState.exportHoldSeconds = exportProfile.sourceHoldSeconds;
  }
  setRecorderState(nextState);
  updateHoldSecondsInput(exportProfile.durationSeconds);
  queuePersistPanelSettings();

  return {
    ...exportProfile,
    frameQualityPreset,
  };
}

function readFrameCaptureTargetWidthFromPanel() {
  const maxWidth = readCaptureResolutionPresetFromPanel().maxWidth;
  if (maxWidth !== recorderState.exportMaxWidth) {
    setRecorderState({
      exportMaxWidth: maxWidth,
      lastError: "",
    });
    queuePersistPanelSettings();
  }
  return maxWidth;
}

function readBoundedNumber(inputNode, fallbackValue, minValue, maxValue, label) {
  const rawValue = inputNode ? inputNode.value : String(fallbackValue);
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < minValue || value > maxValue) {
    throw new Error(`${label}必须在 ${minValue} 到 ${maxValue} 之间`);
  }
  return value;
}

function readBoundedInteger(inputNode, fallbackValue, minValue, maxValue, label) {
  const value = readBoundedNumber(inputNode, fallbackValue, minValue, maxValue, label);
  if (!Number.isInteger(value)) {
    throw new Error(`${label}必须是整数`);
  }
  return value;
}

function getIntervalTotalSeconds(intervalMinutes) {
  const totalSeconds = Math.round(Number(intervalMinutes) * SECONDS_PER_MINUTE);
  if (!Number.isFinite(totalSeconds)) {
    return DEFAULT_INTERVAL_MINUTES * SECONDS_PER_MINUTE;
  }
  return totalSeconds;
}

function getExportFrameCountForProfile() {
  if (recorderState.exportSourceDir) {
    const sourceFrameCount = Number(recorderState.exportSourceFrameCount);
    return Number.isInteger(sourceFrameCount) && sourceFrameCount > 0 ? sourceFrameCount : 0;
  }
  const stateFrameCount = Number(recorderState.frameCount);
  if (Number.isInteger(stateFrameCount) && stateFrameCount > 0) {
    return stateFrameCount;
  }
  const sessionFrameCount = recorderState.activeSession ? Number(recorderState.activeSession.frameCount) : 0;
  if (Number.isInteger(sessionFrameCount) && sessionFrameCount > 0) {
    return sessionFrameCount;
  }
  return 0;
}

function updateExportDurationInputs(durationSeconds) {
  const durationParts = exportProfileModel.getDurationParts(durationSeconds);
  if (exportDurationMinutesInputNode) {
    exportDurationMinutesInputNode.value = String(durationParts.minutes);
  }
  if (exportDurationSecondsInputNode) {
    exportDurationSecondsInputNode.value = formatNumberValue(durationParts.seconds);
  }
}

function updateHoldSecondsInput(durationSeconds) {
  if (!exportHoldSecondsInputNode) {
    return;
  }

  const outputFps = DEFAULT_EXPORT_OUTPUT_FPS;
  exportHoldSecondsInputNode.min = formatSecondsValue(MIN_EXPORT_HOLD_SECONDS);
  exportHoldSecondsInputNode.max = String(MAX_EXPORT_HOLD_SECONDS);

  const frameCount = getExportFrameCountForProfile();
  if (frameCount <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    exportHoldSecondsInputNode.value = formatSecondsValue(recorderState.exportHoldSeconds || DEFAULT_EXPORT_HOLD_SECONDS);
    return;
  }
  exportHoldSecondsInputNode.value = formatSecondsValue(
    exportProfileModel.calculateExportTiming(durationSeconds, frameCount, outputFps).sourceHoldSeconds,
  );
}

function updateIntervalInputs() {
  if (intervalSecondsInputNode) {
    intervalSecondsInputNode.value = String(getIntervalTotalSeconds(recorderState.intervalMinutes));
  }
}

function updateIdleCaptureInputs() {
  if (idleCaptureDelaySecondsInputNode) {
    idleCaptureDelaySecondsInputNode.value = formatNumberValue(recorderState.idleCaptureDelaySeconds);
  }
  if (idleCaptureMaxWaitSecondsInputNode) {
    idleCaptureMaxWaitSecondsInputNode.value = formatNumberValue(recorderState.idleCaptureMaxWaitSeconds);
  }
}

function updatePanelSettingsInputs() {
  updateIntervalInputs();
  updateIdleCaptureInputs();
  updateExportDurationInputs(recorderState.exportDurationSeconds);
  updateHoldSecondsInput(recorderState.exportDurationSeconds);
  updateFrameQualityPresetInput();
  updateCaptureResolutionPresetInput();
}

function formatProjectOutputDir() {
  const context = createCurrentRecordingContext();
  return context.ok ? context.outputDir : "请先保存本地 PSD/PSB 文档";
}

function formatRecordingsOutputDir() {
  const context = createCurrentRecordingContext();
  return context.ok ? context.recordingsRootDir : `OK-Record 保存目录下的 ${RECORDINGS_ROOT_DIR_NAME}`;
}

function formatStepOutputDir() {
  const context = createCurrentRecordingContext();
  return context.ok ? context.stepOutputDir : `OK-Record 保存目录下的 ${DEFAULT_STEP_OUTPUT_DIR_NAME}`;
}

function clearScheduledCapture() {
  if (captureTimerId !== null) {
    clearTimeout(captureTimerId);
    captureTimerId = null;
  }
  clearIdleCaptureDeadline();
  idleCaptureWaiting = false;
}

function clearIdleCaptureDeadline() {
  if (idleCaptureDeadlineTimerId !== null) {
    clearTimeout(idleCaptureDeadlineTimerId);
    idleCaptureDeadlineTimerId = null;
  }
}

function startRecorderHistoryPoll() {
  if (recorderHistoryPollId !== null) {
    return;
  }

  recorderHistoryPollId = setInterval(() => {
    if (!recordingLoopActive) {
      stopRecorderHistoryPoll();
      return;
    }
    detectRecorderDocumentChange("historyStateChanged");
  }, DOCUMENT_HISTORY_POLL_INTERVAL_MS);
}

function stopRecorderHistoryPoll() {
  if (recorderHistoryPollId !== null) {
    clearInterval(recorderHistoryPollId);
    recorderHistoryPollId = null;
  }
}

function scheduleNextCapture(message) {
  clearScheduledCapture();
  const delayMs = Math.max(1000, getIntervalTotalSeconds(recorderState.intervalMinutes) * 1000);
  const nextCaptureAt = new Date(Date.now() + delayMs).toISOString();
  setRecorderState({
    state: RECORDER_STATES.recording,
    nextCaptureAt,
    lastError: "",
  });
  captureTimerId = setTimeout(() => {
    runScheduledCapture("定时采样").catch(() => {});
  }, delayMs);
  updateControlState();
  setStatus(formatRecorderStatus(message));
}

function refreshRecorderDocumentSignature() {
  if (!recordingLoopActive) {
    recorderDocumentSignature = "";
    return "";
  }

  recorderDocumentSignature = getActiveDocumentHistorySignature();
  return recorderDocumentSignature;
}

function detectRecorderDocumentChange(eventName) {
  if (!recordingLoopActive) {
    recorderDocumentSignature = "";
    return false;
  }

  const currentSignature = getActiveDocumentHistorySignature();
  if (!currentSignature) {
    return false;
  }
  if (!recorderDocumentSignature) {
    recorderDocumentSignature = currentSignature;
    return false;
  }
  if (currentSignature === recorderDocumentSignature) {
    return false;
  }

  recorderDocumentSignature = currentSignature;
  markDocumentDirty(eventName || "historyStateChanged", { force: true });
  return true;
}

function recordPaintingActivity(eventName) {
  if (!paintingTimerState.enabled) {
    return;
  }

  const nowMs = Date.now();
  setPaintingTimerState(paintingTimerModel.recordPaintingActivityState(
    paintingTimerState,
    nowMs,
    eventName || "unknown",
  ));
  schedulePaintingTimerIdleTimeout();
  startPaintingTimerTick();
  updatePaintingTimerStatus();
  queuePersistPaintingTimerState();
}

function detectPaintingTimerDocumentChange(eventName) {
  if (!paintingTimerState.enabled) {
    return false;
  }

  const currentSignature = getActiveDocumentHistorySignature();
  if (!currentSignature) {
    return false;
  }
  if (!paintingTimerDocumentSignature) {
    paintingTimerDocumentSignature = currentSignature;
    return false;
  }
  if (currentSignature === paintingTimerDocumentSignature) {
    return false;
  }

  paintingTimerDocumentSignature = currentSignature;
  recordPaintingActivity(eventName || "historyStateChanged");
  return true;
}

function getActiveDocumentHistorySignature() {
  try {
    const app = photoshop.app;
    const activeDocument = app && app.activeDocument;
    if (!activeDocument) {
      return "";
    }

    const documentId = activeDocument.id !== undefined ? activeDocument.id : "";
    const historyState = activeDocument.activeHistoryState;
    if (!historyState) {
      return String(documentId);
    }

    const historyId = historyState.id !== undefined ? historyState.id : "";
    const historyName = historyState.name || "";
    return `${documentId}:${historyId}:${historyName}`;
  } catch (error) {
    return "";
  }
}

function schedulePaintingTimerIdleTimeout() {
  clearPaintingTimerTimeout();
  if (!paintingTimerState.enabled || !paintingTimerState.active || !paintingTimerState.idleDeadlineAtMs) {
    return;
  }

  const delayMs = Math.max(0, paintingTimerState.idleDeadlineAtMs - Date.now());
  paintingTimerIdleTimeoutId = setTimeout(() => {
    finishPaintingTimerActiveSegment(paintingTimerState.idleDeadlineAtMs || Date.now(), PAINTING_TIMER_IDLE_STOP_REASON);
    clearPaintingTimerTimeout();
    updateControlState();
    updatePaintingTimerStatus();
    queuePersistPaintingTimerState();
  }, delayMs);
}

function clearPaintingTimerTimeout() {
  if (paintingTimerIdleTimeoutId !== null) {
    clearTimeout(paintingTimerIdleTimeoutId);
    paintingTimerIdleTimeoutId = null;
  }
}

function startPaintingTimerTick() {
  if (paintingTimerTickId !== null) {
    return;
  }
  paintingTimerTickId = setInterval(() => {
    detectPaintingTimerDocumentChange("historyStateChanged");
    updatePaintingTimerStatus();
  }, 1000);
}

function stopPaintingTimerTick() {
  if (paintingTimerTickId !== null) {
    clearInterval(paintingTimerTickId);
    paintingTimerTickId = null;
  }
}

function finishPaintingTimerActiveSegment(stopAtMs, reason) {
  setPaintingTimerState(paintingTimerModel.finishActiveSegment(paintingTimerState, stopAtMs, reason || ""));
}

function getPaintingTimerElapsedSeconds() {
  return paintingTimerModel.getElapsedSeconds(paintingTimerState, Date.now());
}

function updatePaintingTimerInputs() {
  if (paintingTimerSecondsInputNode) {
    paintingTimerSecondsInputNode.value = formatNumberValue(paintingTimerState.idleTimeoutSeconds);
  }
}

function updatePaintingTimerStatus() {
  if (paintingTimerDisplayButtonNode) {
    panelView.renderPaintingTimerStatusLabel(paintingTimerDisplayButtonNode, getPaintingTimerButtonViewState());
  }
}

async function restorePanelSettings() {
  const file = await getPluginDataFile(PANEL_SETTINGS_FILENAME, false);
  if (!file) {
    updatePanelSettingsInputs();
    return null;
  }

  const text = await file.read();
  if (!text || !text.trim()) {
    updatePanelSettingsInputs();
    return null;
  }

  const settings = settingsModel.parsePersistedPanelSettings(text);
  setRecorderState({
    ...settings,
    lastError: "",
  });
  updatePanelSettingsInputs();
  updateControlState();
  queuePersistPanelSettings();
  return settings;
}

function queuePersistPanelSettings() {
  const snapshot = settingsModel.createPersistedPanelSettings(recorderState);
  panelSettingsPersistPromise = panelSettingsPersistPromise
    .catch(() => {})
    .then(() => writePersistedPanelSettings(snapshot))
    .catch((error) => {
      setRecorderState({ lastError: `设置保存失败：${formatError(error)}` });
      setStatus(formatRecorderStatus("设置保存失败"));
    });
}

async function writePersistedPanelSettings(snapshot) {
  const file = await getPluginDataFile(PANEL_SETTINGS_FILENAME, true);
  await file.write(JSON.stringify(snapshot, null, 2));
}

async function restorePaintingTimerState() {
  const file = await getPaintingTimerStateFile(false);
  if (!file) {
    updatePaintingTimerStatus();
    return null;
  }

  const text = await file.read();
  if (!text || !text.trim()) {
    updatePaintingTimerStatus();
    return null;
  }

  const persistedState = paintingTimerModel.parsePersistedPaintingTimerState(text);
  paintingTimerState = paintingTimerModel.settleRestoredState(persistedState, Date.now());
  updatePaintingTimerInputs();
  if (paintingTimerState.enabled) {
    await ensureDocumentChangeListener();
    paintingTimerDocumentSignature = getActiveDocumentHistorySignature();
    if (paintingTimerState.active) {
      schedulePaintingTimerIdleTimeout();
    }
    startPaintingTimerTick();
  }
  updateControlState();
  updatePaintingTimerStatus();
  queuePersistPaintingTimerState();
  return paintingTimerState;
}

function queuePersistPaintingTimerState() {
  const snapshot = createPersistedPaintingTimerState();
  paintingTimerPersistPromise = paintingTimerPersistPromise
    .catch(() => {})
    .then(() => writePersistedPaintingTimerState(snapshot))
    .catch((error) => {
      setPaintingTimerState({ lastError: `计时状态保存失败：${formatError(error)}` });
      updatePaintingTimerStatus();
    });
}

function createPersistedPaintingTimerState() {
  return paintingTimerModel.createPersistedPaintingTimerState(
    paintingTimerState,
    new Date().toISOString(),
    getPersistedPaintingTimerAccumulatedSeconds(),
  );
}

function getPersistedPaintingTimerAccumulatedSeconds() {
  if (!paintingTimerState.active) {
    return paintingTimerState.accumulatedSeconds;
  }
  return paintingTimerState.accumulatedSeconds;
}

async function writePersistedPaintingTimerState(snapshot) {
  const file = await getPaintingTimerStateFile(true);
  await file.write(JSON.stringify(snapshot, null, 2));
}

async function getPaintingTimerStateFile(createIfMissing) {
  return getPluginDataFile(PAINTING_TIMER_STATE_FILENAME, createIfMissing);
}

async function getPluginDataFile(filename, createIfMissing) {
  const dataFolder = await uxp.storage.localFileSystem.getDataFolder();
  const entries = await dataFolder.getEntries();
  const existingFile = entries.find((entry) => entry.isFile && entry.name === filename);
  if (existingFile) {
    return existingFile;
  }
  if (!createIfMissing) {
    return null;
  }
  return dataFolder.createFile(filename, { overwrite: true });
}

function toFiniteNumber(value, fallbackValue) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallbackValue;
}

function clampNumber(value, fallbackValue, minValue, maxValue) {
  const number = toFiniteNumber(value, fallbackValue);
  return Math.min(maxValue, Math.max(minValue, number));
}

function clampInteger(value, fallbackValue, minValue, maxValue) {
  return Math.round(clampNumber(value, fallbackValue, minValue, maxValue));
}

function ensureActiveSessionForCapture(captureMetadata, documentContext) {
  const activeSession = recorderState.activeSession;
  if (recordingContext.isSessionForRecordingContext(activeSession, documentContext)) {
    return activeSession;
  }

  return createActiveSession(captureMetadata, documentContext);
}

function createActiveSession(captureMetadata, documentContext) {
  const now = new Date();
  const session = recordingContext.applyRecordingContextToSession({
    sessionId: RECORDING_TIMELINE_ID,
    createdAt: now.toISOString(),
    frameCount: 0,
    lastCaptureAt: "",
    sessionPath: "",
    framesPath: "",
    manifestPath: "",
    captureGeometry: createCaptureGeometry(captureMetadata),
    frameStorageFormat: "",
    frameExtension: "",
    frameQualityPreset: "",
    jpegQuality: 0,
    exportFrameMetadataConsistent: true,
    aspectRatioConsistent: true,
    aspectRatioGroupsJson: "",
    majorityAspectRatioKey: "",
    majorityAspectRatioFrameCount: 0,
    inconsistentFrameName: "",
    inconsistentMetadataPath: "",
  }, documentContext);
  setRecorderState({ activeSession: session });
  return session;
}

function createCaptureGeometry(metadata) {
  if (!metadata) {
    return null;
  }
  return {
    width: Number(metadata.width),
    height: Number(metadata.height),
    components: Number(metadata.components),
    componentSize: Number(metadata.componentSize),
    pixelFormat: metadata.pixelFormat || "",
    frameStorageFormat: metadata.frameStorageFormat || "",
    frameExtension: metadata.frameExtension || "",
    frameQualityPreset: metadata.frameQualityPreset || "",
    jpegQuality: Number(metadata.jpegQuality) || 0,
  };
}

function formatCaptureGeometry(geometry) {
  return `${geometry.width} x ${geometry.height}, ${geometry.pixelFormat}, ${geometry.components}x${geometry.componentSize}-bit, ${formatFrameStorageFormat(geometry.frameStorageFormat, geometry.frameExtension)}`;
}

function buildCaptureRequestId() {
  return `capture_${formatTimestampForId(new Date())}_${Date.now()}`;
}

function formatTimestampForId(date) {
  return date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
}

function formatFrameIndex(frameIndex) {
  return `frame_${String(frameIndex).padStart(6, "0")}`;
}

function getExportFolderPath() {
  if (recorderState.lastExportPath) {
    return getNativeDirname(recorderState.lastExportPath);
  }
  if (recorderState.activeSession && recorderState.activeSession.sessionPath) {
    return pathPolicy.joinNativePath(recorderState.activeSession.sessionPath, "exports");
  }
  if (recorderState.exportSourceDir) {
    return pathPolicy.joinNativePath(getExportSequenceRootPath(recorderState.exportSourceDir), "exports");
  }
  throw new Error("没有录制时间线的导出目录");
}

function getNativeDirname(nativePath) {
  const dirname = pathPolicy.getNativeDirname(nativePath);
  if (!dirname) {
    throw new Error(`无法从路径解析导出目录：${nativePath}`);
  }
  return dirname;
}

function getNativeBasename(nativePath) {
  const normalized = String(nativePath || "").replace(/[\\\/]+$/, "");
  const backslashIndex = normalized.lastIndexOf("\\");
  const slashIndex = normalized.lastIndexOf("/");
  const separatorIndex = Math.max(backslashIndex, slashIndex);
  return separatorIndex >= 0 ? normalized.slice(separatorIndex + 1) : normalized;
}

function getExportSequenceRootPath(framesDir) {
  if (getNativeBasename(framesDir).toLowerCase() === "frames") {
    return getNativeDirname(framesDir);
  }
  return framesDir;
}

function formatPaintingTimerControlLabel() {
  const elapsedSeconds = getPaintingTimerElapsedSeconds();
  if (paintingTimerState.ended) {
    return `绘画总时长 ${formatDurationClock(elapsedSeconds)}`;
  }
  if (!paintingTimerState.enabled) {
    if (elapsedSeconds <= 0) {
      return `绘画计时 ${formatDurationClock(elapsedSeconds)}`;
    }
    return `已暂停 ${formatDurationClock(elapsedSeconds)}`;
  }
  if (isPaintingTimerIdleStopped() && elapsedSeconds > 0) {
    return `空闲状态 ${formatDurationClock(elapsedSeconds)}`;
  }
  return formatDurationClock(elapsedSeconds);
}

function isPaintingTimerIdleStopped() {
  return !paintingTimerState.active && paintingTimerState.lastStopReason === PAINTING_TIMER_IDLE_STOP_REASON;
}

function formatPaintingTimerState() {
  if (paintingTimerState.ended) {
    return "已结束";
  }
  if (!paintingTimerState.enabled) {
    return getPaintingTimerElapsedSeconds() > 0 ? "已暂停" : "未开启";
  }
  return paintingTimerState.active ? "计时中" : "等待画布变化";
}

function formatDurationClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / SECONDS_PER_MINUTE);
  const seconds = safeSeconds % SECONDS_PER_MINUTE;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatRecorderStatus(message) {
  const lines = [
    message,
    `状态：${formatRecorderState(recorderState.state)}`,
    `OK-Record 保存目录：${formatProjectOutputDir()}`,
    `序列帧目录：${formatRecordingsOutputDir()}`,
    `步骤图目录：${formatStepOutputDir()}`,
  ];

  if (recorderState.activeSession) {
    lines.push("录制：时间线");
    lines.push(`帧数：${recorderState.frameCount}`);
    if (recorderState.activeSession.captureGeometry) {
      lines.push(`起始尺寸：${formatCaptureGeometry(recorderState.activeSession.captureGeometry)}`);
    }
    if (recorderState.activeSession.frameStorageFormat) {
      lines.push(`帧格式：${formatFrameStorageFormat(recorderState.activeSession.frameStorageFormat, recorderState.activeSession.frameExtension)}`);
    }
    if (recorderState.activeSession.frameQualityPreset) {
      lines.push(`压缩质量：${formatFrameQualityPreset(recorderState.activeSession.frameQualityPreset)}`);
    }
    if (recorderState.activeSession.exportFrameMetadataConsistent === false) {
      lines.push(`导出警告：录制包含混合格式帧（${recorderState.activeSession.inconsistentFrameName || "未知帧"}）`);
    }
    if (recorderState.activeSession.aspectRatioConsistent === false) {
      lines.push("导出提示：录制包含不同比例帧，导出时需要选择处理方式");
    }
  }
  if (recorderState.lastCaptureAt) {
    lines.push(`上次采样：${recorderState.lastCaptureAt}`);
  }
  if (recorderState.stepFrameCount > 0) {
    lines.push(`手动采样：${recorderState.stepFrameCount} 张`);
  }
  if (recorderState.exportSourceDir) {
    lines.push(`导出源目录：${recorderState.exportSourceDir}`);
    lines.push(`导出源帧数：${recorderState.exportSourceFrameCount || 0}`);
  }
  if (recorderState.intervalMinutes) {
    lines.push(`采样间隔：${formatIntervalMinutes(recorderState.intervalMinutes)}`);
  }
  lines.push(`延迟采样：${formatIdleCaptureSettings()}`);
  lines.push(`质量预设：${formatFrameQualityPreset(recorderState.frameQualityPreset)}`);
  if (recordingLoopActive || recorderState.documentDirty || recorderState.lastDirtyAt || recorderState.lastSkipAt) {
    lines.push(`有变化：${recorderState.documentDirty ? "是" : "否"}`);
  }
  if (recorderState.lastDirtyAt) {
    lines.push(`上次变化：${recorderState.lastChangeEvent || "未知"} 于 ${recorderState.lastDirtyAt}`);
  }
  if (recorderState.skippedCaptureCount > 0) {
    lines.push(`已跳过采样：${recorderState.skippedCaptureCount}`);
  }
  if (recorderState.lastSkipAt) {
    lines.push(`上次跳过：${recorderState.lastSkipAt}`);
  }
  if (recorderState.exportDurationSeconds && recorderState.exportOutputFps && recorderState.exportMaxWidth) {
    lines.push(`导出：${formatExportProfile(recorderState.exportDurationSeconds, recorderState.exportOutputFps, recorderState.exportMaxWidth)}`);
  }
  if (paintingTimerState.enabled || paintingTimerState.ended || getPaintingTimerElapsedSeconds() > 0) {
    lines.push(`绘画时长：${formatDurationClock(getPaintingTimerElapsedSeconds())}（${formatPaintingTimerState()}）`);
  }
  if (recorderState.nextCaptureAt) {
    lines.push(`下次采样：${recorderState.nextCaptureAt}`);
  }
  if (recorderState.activeSession && recorderState.activeSession.manifestPath) {
    lines.push(`Manifest: ${recorderState.activeSession.manifestPath}`);
  }
  if (recorderState.lastExportPath) {
    lines.push(`上次导出：${recorderState.lastExportPath}`);
  }
  if (recorderState.lastExportProgress) {
    lines.push(formatExportProgress(recorderState.lastExportProgress));
  }
  appendCaptureDiagnosticsLines(lines, recorderState.lastCaptureDiagnostics, {
    targetWidthLabel: recorderState.lastCaptureDiagnostics ?
      formatCaptureTargetWidth(recorderState.lastCaptureDiagnostics.targetWidth) :
      "",
  });
  if (recorderState.lastError) {
    lines.push(`错误：${recorderState.lastError}`);
  }

  return lines.join("\n");
}

function nowMs() {
  if (typeof performance !== "undefined" && performance && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function elapsedMsSince(startMs) {
  return roundMilliseconds(nowMs() - startMs);
}

function roundMilliseconds(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value * 100) / 100);
}

function createCaptureDiagnostics(modalTimings, overrides) {
  const timings = modalTimings || {};
  const values = overrides || {};
  return {
    targetWidth: Math.max(0, Math.round(toFiniteNumber(values.targetWidth, 0))),
    modalMs: roundMilliseconds(values.modalMs),
    getPixelsMs: roundMilliseconds(timings.getPixelsMs),
    getDataMs: roundMilliseconds(timings.getDataMs),
    copyMs: roundMilliseconds(values.copyMs),
    nativeWriteMs: roundMilliseconds(values.nativeWriteMs),
  };
}

function formatCaptureTargetWidth(targetWidth) {
  return targetWidth > 0 ? formatCaptureResolutionPreset(targetWidth) : "原始尺寸";
}

function getFrameQualityPresetById(id) {
  return FRAME_QUALITY_PRESETS.find((preset) => preset.id === id) || null;
}

function getFrameQualityPresetIdForStorage(storageFormat) {
  if (storageFormat === "png") {
    return "lossless";
  }
  if (storageFormat === "jpeg") {
    return "high";
  }
  return "";
}

function createFrameStorageMetadata(preset) {
  if (!preset) {
    throw new Error("压缩质量预设无效");
  }
  return {
    frameStorageFormat: preset.storageFormat,
    frameExtension: preset.frameExtension,
    frameQualityPreset: preset.id,
    jpegQuality: preset.jpegQuality,
  };
}

function formatFrameQualityPreset(presetId) {
  const preset = getFrameQualityPresetById(presetId);
  if (!preset) {
    return presetId || "未知";
  }
  return preset.label;
}

function formatCaptureResolutionPreset(maxWidth) {
  const preset = getCaptureResolutionPresetById(getCaptureResolutionPresetIdForMaxWidth(maxWidth));
  return preset.label;
}

function updateFrameQualityPresetInput() {
  if (!frameQualityPresetSelectNode) {
    return;
  }
  frameQualityPresetSelectNode.value = getFrameQualityPresetById(recorderState.frameQualityPreset) ?
    recorderState.frameQualityPreset :
    DEFAULT_FRAME_QUALITY_PRESET_ID;
}

function getCaptureResolutionPresetById(id) {
  return CAPTURE_RESOLUTION_PRESETS.find((preset) => preset.id === id) || null;
}

function getCaptureResolutionPresetIdForMaxWidth(maxWidth) {
  const width = Math.round(Number(maxWidth));
  const preset = CAPTURE_RESOLUTION_PRESETS.find((entry) =>
    entry.maxWidth === width
  );
  return preset ? preset.id : DEFAULT_CAPTURE_RESOLUTION_PRESET_ID;
}

function updateCaptureResolutionPresetInput() {
  if (!captureResolutionPresetSelectNode) {
    return;
  }
  captureResolutionPresetSelectNode.value = getCaptureResolutionPresetIdForMaxWidth(recorderState.exportMaxWidth);
}

function formatRecorderState(state) {
  switch (state) {
    case RECORDER_STATES.idle:
      return "空闲";
    case RECORDER_STATES.armed:
      return "已准备";
    case RECORDER_STATES.recording:
      return "录制中";
    case RECORDER_STATES.paused:
      return "已暂停";
    case RECORDER_STATES.capturePending:
      return "等待采样";
    case RECORDER_STATES.writing:
      return "写入中";
    case RECORDER_STATES.exporting:
      return "导出中";
    case RECORDER_STATES.error:
      return "错误";
    default:
      return state || "未知";
  }
}

function copyPixelDataToArrayBuffer(pixelData) {
  let source = null;

  if (pixelData instanceof ArrayBuffer) {
    source = new Uint8Array(pixelData);
  } else if (ArrayBuffer.isView(pixelData)) {
    source = new Uint8Array(pixelData.buffer, pixelData.byteOffset, pixelData.byteLength);
  } else {
    throw new Error("Unsupported pixel buffer type from imaging.getPixels()");
  }

  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy.buffer;
}

function formatIntervalMinutes(intervalMinutes) {
  return formatIntervalSeconds(getIntervalTotalSeconds(intervalMinutes));
}

function formatIdleCaptureSettings() {
  if (recorderState.idleCaptureDelaySeconds <= 0 || recorderState.idleCaptureMaxWaitSeconds <= 0) {
    return "0 秒（立刻采样）";
  }
  return `${formatSecondsValue(recorderState.idleCaptureDelaySeconds)} 秒后空闲采样，最长等待 ${formatSecondsValue(recorderState.idleCaptureMaxWaitSeconds)} 秒`;
}

function formatExportProfile(durationSeconds, outputFps, maxWidth) {
  const frameCount = getExportFrameCountForProfile();
  const timing = exportProfileModel.calculateExportTiming(durationSeconds, frameCount, outputFps);
  const fields = [
    `目标 ${formatIntervalSeconds(durationSeconds)}`,
  ];
  if (frameCount > 0) {
    fields.push(`源帧约 ${formatNumberValue(timing.sequenceFramesPerSecond)} 张/秒`);
    fields.push(`每张源帧约 ${formatSecondsValue(timing.sourceHoldSeconds)} 秒`);
    if (timing.samplingApplied) {
      fields.push(`均匀抽帧 ${timing.sourceFrameCount} -> ${timing.exportedFrameCount}`);
      fields.push(`代表帧约 ${formatSecondsValue(timing.exportedHoldSeconds)} 秒`);
    } else if (timing.outputFramesPerSequenceFrame >= 1) {
      fields.push(`每张约 ${formatNumberValue(timing.outputFramesPerSequenceFrame)} 个视频帧`);
    } else {
      fields.push("每张不足 1 个视频帧");
    }
  }
  fields.push(`${outputFps} fps`);
  fields.push(`压缩 ${formatFrameQualityPreset(recorderState.frameQualityPreset)}`);
  fields.push(`分辨率 ${formatCaptureResolutionPreset(maxWidth)}`);
  return fields.join("，");
}

function parseRecoveredFrameMetadata(metadataJson) {
  if (!metadataJson || typeof metadataJson !== "string") {
    throw new Error("Recovered frame metadata is empty");
  }

  const metadata = JSON.parse(metadataJson);
  if (!metadata || metadata.schema !== "ok-record.frame.v1") {
    throw new Error("恢复的帧元数据 schema 非预期");
  }
  return metadata;
}

function handleExportProfileChange() {
  try {
    readExportProfileFromPanel();
    updateCaptureResolutionPresetInput();
    setStatus(formatRecorderStatus("导出设置已更新"));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("导出设置无效"));
  }
}

function handleFrameQualityPresetChange() {
  try {
    const frameQualityPreset = readFrameQualityPresetFromPanel();
    setStatus(formatRecorderStatus(`压缩质量已更新：${formatFrameQualityPreset(frameQualityPreset)}`));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("压缩质量无效"));
  }
}

function handleCaptureResolutionPresetChange() {
  try {
    const preset = readCaptureResolutionPresetFromPanel();
    setRecorderState({
      exportMaxWidth: preset.maxWidth,
      lastError: "",
    });
    queuePersistPanelSettings();
    updateCaptureResolutionPresetInput();
    setStatus(formatRecorderStatus(`分辨率预设已更新：${preset.label}`));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("分辨率预设无效"));
  }
}

function handleIntervalChange() {
  try {
    const intervalMinutes = readIntervalMinutesFromPanel();
    setRecorderState({ intervalMinutes, lastError: "" });
    queuePersistPanelSettings();
    setStatus(formatRecorderStatus("采样间隔已更新"));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("采样间隔无效"));
  }
}

function handleHoldSecondsChange() {
  try {
    const frameCount = getExportFrameCountForProfile();
    const outputFps = DEFAULT_EXPORT_OUTPUT_FPS;
    if (exportHoldSecondsInputNode) {
      exportHoldSecondsInputNode.min = formatSecondsValue(MIN_EXPORT_HOLD_SECONDS);
      exportHoldSecondsInputNode.max = String(MAX_EXPORT_HOLD_SECONDS);
    }
    const holdSeconds = readBoundedNumber(
      exportHoldSecondsInputNode,
      frameCount > 0 ? recorderState.exportDurationSeconds / frameCount : recorderState.exportHoldSeconds,
      MIN_EXPORT_HOLD_SECONDS,
      MAX_EXPORT_HOLD_SECONDS,
      "每帧停留（秒）",
    );
    if (frameCount <= 0) {
      setRecorderState({
        exportHoldSeconds: holdSeconds,
        exportOutputFps: outputFps,
        lastError: "",
      });
      queuePersistPanelSettings();
      setStatus(formatRecorderStatus("导出设置已更新"));
      return;
    }

    const durationSeconds = frameCount * holdSeconds;
    if (durationSeconds < MIN_EXPORT_DURATION_SECONDS || durationSeconds > MAX_EXPORT_DURATION_SECONDS) {
      throw new Error(`反推的视频时长必须在 ${formatIntervalSeconds(MIN_EXPORT_DURATION_SECONDS)} 到 ${formatIntervalSeconds(MAX_EXPORT_DURATION_SECONDS)} 之间`);
    }

    updateExportDurationInputs(durationSeconds);
    readExportProfileFromPanel();
    setStatus(formatRecorderStatus("导出设置已更新"));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("导出设置无效"));
  }
}

function handleIdleCaptureSettingsChange() {
  try {
    const idleCaptureSettings = readIdleCaptureSettingsFromPanel();
    setRecorderState({
      ...idleCaptureSettings,
      lastError: "",
    });
    queuePersistPanelSettings();
    setStatus(formatRecorderStatus("延迟采样设置已更新"));
  } catch (error) {
    setRecorderState({ lastError: formatError(error) });
    setStatus(formatRecorderStatus("延迟采样设置无效"));
  }
}

function handlePaintingTimerTimeoutChange() {
  try {
    const idleTimeoutSeconds = readPaintingTimerTimeoutSecondsFromPanel();
    setPaintingTimerState({
      idleTimeoutSeconds,
      lastError: "",
    });
    if (paintingTimerState.active) {
      const nowMs = Date.now();
      setPaintingTimerState({
        idleDeadlineAtMs: nowMs + (idleTimeoutSeconds * 1000),
        idleDeadlineAt: new Date(nowMs + (idleTimeoutSeconds * 1000)).toISOString(),
      });
      schedulePaintingTimerIdleTimeout();
    }
    updatePaintingTimerStatus();
    queuePersistPaintingTimerState();
    setStatus(formatRecorderStatus("绘画计时设置已更新"));
  } catch (error) {
    setPaintingTimerState({ lastError: formatError(error) });
    updatePaintingTimerStatus();
    setStatus(formatRecorderStatus("绘画计时设置无效"));
  }
}






function resetPanelNodeReferences() {
  exportNoticeNode = null;
  exportNoticeTitleNode = null;
  exportNoticeBodyNode = null;
  exportNoticeCloseButtonNode = null;
  updateBadgeRowNode = null;
  updateBadgeButtonNode = null;
  updateDialogNode = null;
  updateDialogTitleNode = null;
  updateDialogVersionNode = null;
  updateDialogSummaryNode = null;
  updateDialogGithubButtonNode = null;
  updateDialogNetdiskButtonNode = null;
  updateDialogHintNode = null;
  updateDialogCloseButtonNode = null;
  intervalSecondsInputNode = null;
  idleCaptureDelaySecondsInputNode = null;
  idleCaptureMaxWaitSecondsInputNode = null;
  chooseProjectOutputDirButtonNode = null;
  openFrameOutputDirButtonNode = null;
  openStepOutputDirButtonNode = null;
  clearRecordingTimelineButtonNode = null;
  startRecordingButtonNode = null;
  captureNowButtonNode = null;
  exportButtonNode = null;
  openExportFolderButtonNode = null;
  exportDurationMinutesInputNode = null;
  exportDurationSecondsInputNode = null;
  exportHoldSecondsInputNode = null;
  frameQualityPresetSelectNode = null;
  captureResolutionPresetSelectNode = null;
  paintingTimerSecondsInputNode = null;
  paintingTimerDisplayButtonNode = null;
}

function assignPanelNodeReferences(refs) {
  resetPanelNodeReferences();
  exportNoticeNode = refs.exportNoticeNode || null;
  exportNoticeTitleNode = refs.exportNoticeTitleNode || null;
  exportNoticeBodyNode = refs.exportNoticeBodyNode || null;
  exportNoticeCloseButtonNode = refs.exportNoticeCloseButtonNode || null;
  updateBadgeRowNode = refs.updateBadgeRowNode || null;
  updateBadgeButtonNode = refs.updateBadgeButtonNode || null;
  updateDialogNode = refs.updateDialogNode || null;
  updateDialogTitleNode = refs.updateDialogTitleNode || null;
  updateDialogVersionNode = refs.updateDialogVersionNode || null;
  updateDialogSummaryNode = refs.updateDialogSummaryNode || null;
  updateDialogGithubButtonNode = refs.updateDialogGithubButtonNode || null;
  updateDialogNetdiskButtonNode = refs.updateDialogNetdiskButtonNode || null;
  updateDialogHintNode = refs.updateDialogHintNode || null;
  updateDialogCloseButtonNode = refs.updateDialogCloseButtonNode || null;
  intervalSecondsInputNode = refs.intervalSecondsInputNode || null;
  idleCaptureDelaySecondsInputNode = refs.idleCaptureDelaySecondsInputNode || null;
  idleCaptureMaxWaitSecondsInputNode = refs.idleCaptureMaxWaitSecondsInputNode || null;
  chooseProjectOutputDirButtonNode = refs.chooseProjectOutputDirButtonNode || null;
  openFrameOutputDirButtonNode = refs.openFrameOutputDirButtonNode || null;
  openStepOutputDirButtonNode = refs.openStepOutputDirButtonNode || null;
  clearRecordingTimelineButtonNode = refs.clearRecordingTimelineButtonNode || null;
  startRecordingButtonNode = refs.startRecordingButtonNode || null;
  captureNowButtonNode = refs.captureNowButtonNode || null;
  chooseExportSequenceDirButtonNode = refs.chooseExportSequenceDirButtonNode || null;
  exportButtonNode = refs.exportButtonNode || null;
  openExportFolderButtonNode = refs.openExportFolderButtonNode || null;
  exportDurationMinutesInputNode = refs.exportDurationMinutesInputNode || null;
  exportDurationSecondsInputNode = refs.exportDurationSecondsInputNode || null;
  exportHoldSecondsInputNode = refs.exportHoldSecondsInputNode || null;
  frameQualityPresetSelectNode = refs.frameQualityPresetSelectNode || null;
  captureResolutionPresetSelectNode = refs.captureResolutionPresetSelectNode || null;
  paintingTimerSecondsInputNode = refs.paintingTimerSecondsInputNode || null;
  paintingTimerDisplayButtonNode = refs.paintingTimerDisplayButtonNode || null;
}




function getRecordingIndicatorClassName() {
  if (recorderState.state === RECORDER_STATES.error && recorderState.lastError) {
    return "ok-record-record-indicator-error";
  }
  if (isRecordingPaused() || recordingPauseRequested) {
    return "ok-record-record-indicator-paused";
  }
  if (recordingLoopActive || recorderState.state === RECORDER_STATES.recording) {
    return "ok-record-record-indicator-active";
  }
  return "";
}

function formatRecordingControlLabel() {
  if (recorderState.state === RECORDER_STATES.error && recorderState.lastError) {
    return "录制失败";
  }
  if (isRecordingPaused() || recordingPauseRequested) {
    return `暂停录制 ${getRecordingFrameCountText()}`;
  }
  if (recordingLoopActive || recorderState.state === RECORDER_STATES.recording) {
    return `录制中 ${getRecordingFrameCountText()}`;
  }
  return "开始录制";
}

function getPaintingTimerIndicatorClassName() {
  const elapsedSeconds = getPaintingTimerElapsedSeconds();
  if (paintingTimerState.active) {
    return "ok-record-timer-indicator-active";
  }
  if (paintingTimerState.ended || (!paintingTimerState.enabled && elapsedSeconds <= 0)) {
    return "ok-record-timer-indicator-hidden";
  }
  if (paintingTimerState.enabled && !isPaintingTimerIdleStopped()) {
    return "ok-record-timer-indicator-waiting";
  }
  return "ok-record-timer-indicator-idle";
}

function getRecordingButtonViewState() {
  return {
    indicatorClassName: getRecordingIndicatorClassName(),
    labelText: formatRecordingControlLabel(),
  };
}

function getStepCaptureButtonViewState() {
  const frameCount = Number(recorderState.stepFrameCount) || 0;
  const isSampling = stepCaptureActive &&
    (recorderState.state === RECORDER_STATES.capturePending ||
      recorderState.state === RECORDER_STATES.writing);
  return {
    frameCount,
    indicatorClassName: isSampling ?
      "ok-record-step-indicator-sampling" :
      (frameCount > 0 ? "ok-record-step-indicator-success" : "ok-record-step-indicator-hidden"),
  };
}

function getPaintingTimerButtonViewState() {
  return {
    indicatorClassName: getPaintingTimerIndicatorClassName(),
    labelText: formatPaintingTimerControlLabel(),
  };
}

function getExportButtonViewState() {
  if (recorderState.state === RECORDER_STATES.exporting ||
    recorderState.lastExportStatus === EXPORT_STATUSES.exporting) {
    return {
      indicatorClassName: "ok-record-export-indicator-exporting",
      labelText: "导出视频（正在导出）",
    };
  }
  if (recorderState.lastExportStatus === EXPORT_STATUSES.success) {
    return {
      indicatorClassName: "ok-record-export-indicator-success",
      labelText: "导出视频（成功）",
    };
  }
  if (recorderState.lastExportStatus === EXPORT_STATUSES.failure) {
    return {
      indicatorClassName: "ok-record-export-indicator-failure",
      labelText: "导出视频（失败）",
    };
  }
  return {
    indicatorClassName: "",
    labelText: "导出视频",
  };
}

function getPaintingTimerActionLabel() {
  const hasPaintingTimerValue = paintingTimerState.enabled || getPaintingTimerElapsedSeconds() > 0;
  const timerToggleLabel = paintingTimerState.ended ?
    "重新开始绘画计时" :
    (paintingTimerState.enabled ? "暂停绘画计时" : (hasPaintingTimerValue ? "继续绘画计时" : "开始绘画计时"));
  return `${timerToggleLabel}；Alt+点击结束并显示绘画总时长`;
}


async function toggleRecording() {
  if (recordingPauseRequested && isRecorderBusy()) {
    return;
  }
  if (isRecordingPaused()) {
    await resumeRecording();
    return;
  }
  if (recordingLoopActive || recorderState.state === RECORDER_STATES.recording) {
    await pauseRecording();
    return;
  }
  await startRecording();
}

async function togglePaintingTimer() {
  if (paintingTimerState.ended) {
    resetPaintingTimer({ announce: false });
  }
  if (paintingTimerState.enabled) {
    stopPaintingTimer();
    return;
  }
  await startPaintingTimer();
}

async function handlePaintingTimerControl(event) {
  if (event && event.type === "click" && event.altKey) {
    endPaintingTimer();
    return;
  }
  await togglePaintingTimer();
}

function renderPanel() {
  const refs = panelView.renderPanel({
    body: document.body,
    styles: PANEL_STYLES,
    state: {
      intervalSeconds: getIntervalTotalSeconds(recorderState.intervalMinutes),
      idleCaptureDelaySeconds: formatNumberValue(recorderState.idleCaptureDelaySeconds),
      idleCaptureMaxWaitSeconds: formatNumberValue(recorderState.idleCaptureMaxWaitSeconds),
      paintingTimerIdleTimeoutSeconds: formatNumberValue(paintingTimerState.idleTimeoutSeconds),
      exportHoldSeconds: recorderState.exportHoldSeconds,
      exportDurationParts: exportProfileModel.getDurationParts(recorderState.exportDurationSeconds),
      frameQualityPresetId: getFrameQualityPresetById(recorderState.frameQualityPreset) ?
        recorderState.frameQualityPreset :
        DEFAULT_FRAME_QUALITY_PRESET_ID,
      captureResolutionPresetId: getCaptureResolutionPresetIdForMaxWidth(recorderState.exportMaxWidth),
      ...getUpdateBadgeViewState(),
    },
    ranges: {
      minIntervalSeconds: MIN_INTERVAL_SECONDS,
      maxIntervalSeconds: MAX_INTERVAL_SECONDS,
      minIdleCaptureDelaySeconds: MIN_IDLE_CAPTURE_DELAY_SECONDS,
      maxIdleCaptureDelaySeconds: MAX_IDLE_CAPTURE_DELAY_SECONDS,
      minIdleCaptureMaxWaitSeconds: MIN_IDLE_CAPTURE_MAX_WAIT_SECONDS,
      maxIdleCaptureMaxWaitSeconds: MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS,
      minPaintingTimerTimeoutSeconds: MIN_PAINTING_TIMER_TIMEOUT_SECONDS,
      maxPaintingTimerTimeoutSeconds: MAX_PAINTING_TIMER_TIMEOUT_SECONDS,
      minExportHoldSeconds: MIN_EXPORT_HOLD_SECONDS,
      maxExportHoldSeconds: MAX_EXPORT_HOLD_SECONDS,
      maxExportDurationSeconds: MAX_EXPORT_DURATION_SECONDS,
      secondsPerMinute: SECONDS_PER_MINUTE,
    },
    presets: {
      frameQualityPresets: FRAME_QUALITY_PRESETS,
      captureResolutionPresets: CAPTURE_RESOLUTION_PRESETS,
    },
    buttonStates: {
      recording: getRecordingButtonViewState(),
      stepCapture: getStepCaptureButtonViewState(),
      paintingTimer: getPaintingTimerButtonViewState(),
      export: getExportButtonViewState(),
    },
    handlers: {
      onIntervalChange: handleIntervalChange,
      onIdleCaptureSettingsChange: handleIdleCaptureSettingsChange,
      onFrameQualityPresetChange: handleFrameQualityPresetChange,
      onCaptureResolutionPresetChange: handleCaptureResolutionPresetChange,
      onHoldSecondsChange: handleHoldSecondsChange,
      onExportProfileChange: handleExportProfileChange,
      onPaintingTimerTimeoutChange: handlePaintingTimerTimeoutChange,
      onChooseProjectOutputDir: () => chooseProjectOutputDir(),
      onOpenFrameOutputDir: () => openFrameOutputDir(),
      onOpenStepOutputDir: () => openStepOutputDir(),
      onClearRecordingTimeline: () => clearRecordingTimeline(),
      onToggleRecording: toggleRecording,
      onCaptureNow: () => captureNow(),
      onPaintingTimerControl: (event) => handlePaintingTimerControl(event),
      onChooseExportSequenceDir: () => chooseExportSequenceDir(),
      onExportSession: () => exportSession(),
      onOpenExportFolder: () => openExportFolder(),
      onOpenLocalDocumentation: () => openLocalDocumentation(),
      onHideExportNotice: () => hideExportNotice(),
      onShowUpdateDialog: () => showUpdateDownloadDialog(),
      onHideUpdateDialog: () => hideUpdateDialog(),
      onOpenUpdateGithub: () => openUpdateDownloadPage(),
      onOpenUpdateNetdisk: () => openUpdateNetdiskPage(),
    },
  });
  assignPanelNodeReferences(refs);
  updateHoldSecondsInput(recorderState.exportDurationSeconds);
  updateControlState();
}

function setStatus(message) {
  latestStatusMessage = String(message || "");
}

function showExportNotice(title, lines, tone = "success") {
  panelView.showExportNotice({
    exportNoticeNode,
    exportNoticeTitleNode,
    exportNoticeBodyNode,
  }, title, lines, tone);
}

function showBlockingNotice(title, lines, tone = "success") {
  showExportNotice(title, lines, tone);
  showAlertNotice(title, lines);
}

function showAlertNotice(title, lines) {
  if (typeof alert !== "function") {
    return;
  }

  const detailText = Array.isArray(lines) ?
    lines.filter(Boolean).join("\n") :
    String(lines || "");
  const titleText = String(title || "");
  const message = detailText ? `${titleText}\n\n${detailText}` : titleText;
  alert(message);
}

function hideExportNotice() {
  panelView.hideExportNotice({
    exportNoticeNode,
    exportNoticeTitleNode,
    exportNoticeBodyNode,
  });
}

function updateControlState() {
  const busy = isRecorderBusy();
  const paused = isRecordingPaused();
  const activeRecordingSession = isRecordingActiveOrPendingPause();
  const recordingWriteActive = recordingLoopActive ||
    recordingPauseRequested ||
    recorderState.state === RECORDER_STATES.recording;
  updateHoldSecondsInput(recorderState.exportDurationSeconds);
  updatePaintingTimerStatus();
  if (intervalSecondsInputNode) {
    intervalSecondsInputNode.disabled = recordingLoopActive || busy;
  }
  if (idleCaptureDelaySecondsInputNode) {
    idleCaptureDelaySecondsInputNode.disabled = recordingLoopActive || busy;
  }
  if (idleCaptureMaxWaitSecondsInputNode) {
    idleCaptureMaxWaitSecondsInputNode.disabled = recordingLoopActive || busy;
  }
  if (chooseProjectOutputDirButtonNode) {
    chooseProjectOutputDirButtonNode.disabled = recordingLoopActive ||
      recordingPauseRequested ||
      recorderState.state === RECORDER_STATES.recording ||
      busy;
  }
  if (openFrameOutputDirButtonNode) {
    openFrameOutputDirButtonNode.disabled = busy;
  }
  if (openStepOutputDirButtonNode) {
    openStepOutputDirButtonNode.disabled = busy;
  }
  if (clearRecordingTimelineButtonNode) {
    clearRecordingTimelineButtonNode.disabled = busy;
  }
  if (startRecordingButtonNode) {
    setButtonClassName(
      startRecordingButtonNode,
      "ok-record-control-button",
      "ok-record-record-status-button",
      activeRecordingSession ? "ok-record-state-active" : "",
    );
    panelView.renderRecordingStatusLabel(startRecordingButtonNode, getRecordingButtonViewState());
    const recordingActionLabel = paused || recordingPauseRequested ?
      "继续录制" :
      (activeRecordingSession ? "暂停录制" : "开始录制");
    startRecordingButtonNode.title = recordingActionLabel;
    startRecordingButtonNode.setAttribute("aria-label", recordingActionLabel);
    setControlDisabled(startRecordingButtonNode, busy && !activeRecordingSession);
  }
  if (captureNowButtonNode) {
    setButtonClassName(
      captureNowButtonNode,
      "ok-record-control-button",
      "ok-record-step-status-button",
    );
    panelView.renderStepCaptureButtonLabel(captureNowButtonNode, getStepCaptureButtonViewState());
    setControlDisabled(captureNowButtonNode, busy);
  }
  if (paintingTimerDisplayButtonNode) {
    const timerActionLabel = getPaintingTimerActionLabel();
    setControlDisabled(paintingTimerDisplayButtonNode, false);
    panelView.renderPaintingTimerStatusLabel(paintingTimerDisplayButtonNode, getPaintingTimerButtonViewState());
    paintingTimerDisplayButtonNode.title = timerActionLabel;
    paintingTimerDisplayButtonNode.setAttribute("aria-label", timerActionLabel);
    paintingTimerDisplayButtonNode.setAttribute("aria-pressed", String(paintingTimerState.enabled));
    panelView.setTimerStatusButtonMetrics(paintingTimerDisplayButtonNode);
    setButtonClassName(
      paintingTimerDisplayButtonNode,
      "ok-record-control-button",
      "ok-record-timer-status-button",
      "ok-record-timer-status-action",
      paintingTimerState.active ? "ok-record-timer-clock-active" : "",
      paintingTimerState.ended ? "ok-record-timer-clock-ended" : "",
    );
  }
  if (exportDurationMinutesInputNode) {
    exportDurationMinutesInputNode.disabled = busy || recordingWriteActive;
  }
  if (exportDurationSecondsInputNode) {
    exportDurationSecondsInputNode.disabled = busy || recordingWriteActive;
  }
  if (exportHoldSecondsInputNode) {
    exportHoldSecondsInputNode.disabled = busy || recordingWriteActive;
  }
  if (frameQualityPresetSelectNode) {
    frameQualityPresetSelectNode.disabled = busy || activeRecordingSession;
  }
  if (captureResolutionPresetSelectNode) {
    captureResolutionPresetSelectNode.disabled = busy || activeRecordingSession;
  }
  if (chooseExportSequenceDirButtonNode) {
    chooseExportSequenceDirButtonNode.disabled = busy || recordingWriteActive;
  }
  if (exportButtonNode) {
    const hasExportSource = recorderState.exportSourceDir ?
      recorderState.exportSourceFrameCount > 0 :
      Boolean(recorderState.activeSession);
    const exportButtonViewState = getExportButtonViewState();
    const exportStatusVisible = Boolean(exportButtonViewState.indicatorClassName);
    const exportInProgress = recorderState.state === RECORDER_STATES.exporting;
    setButtonClassName(
      exportButtonNode,
      "ok-record-control-button",
      "ok-record-export-status-button",
      recorderState.state === RECORDER_STATES.exporting ? "ok-record-state-active" : "",
      exportStatusVisible ? "ok-record-export-state-visible" : "",
    );
    setControlDisabled(exportButtonNode, busy || recordingWriteActive || !hasExportSource);
    panelView.renderExportStatusLabel(exportButtonNode, exportButtonViewState);
    exportButtonNode.setAttribute("aria-label", exportButtonViewState.labelText);
    exportButtonNode.setAttribute("aria-busy", String(exportInProgress));
  }
  if (openExportFolderButtonNode) {
    openExportFolderButtonNode.disabled = busy || (!recorderState.activeSession && !recorderState.lastExportPath);
    setButtonClassName(openExportFolderButtonNode);
  }
}

function serializeSourceBounds(bounds) {
  if (!bounds) {
    return "";
  }

  const right = bounds.right !== undefined ? bounds.right : bounds.left + bounds.width;
  const bottom = bounds.bottom !== undefined ? bounds.bottom : bounds.top + bounds.height;
  return JSON.stringify({
    left: bounds.left,
    top: bounds.top,
    right,
    bottom,
  });
}
