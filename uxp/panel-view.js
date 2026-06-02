"use strict";

const {
  clearChildren,
  appendChildren,
  createSpacer,
  createPanelSectionGap,
  createFieldContainer,
  createFieldLabel,
  createMinuteSecondField,
  createSecondField,
  createInlineSelectControl,
  createPresetSelect,
  appendFieldControls,
  createPanelGroup,
  createButton,
  createControlButton,
  createButtonRow,
  setButtonLabel,
  setButtonTextMetrics,
} = require("./panel-dom");

function createQualityPresetField({ presets, state, handlers }) {
  const field = createFieldContainer();
  const fieldLabel = createFieldLabel("质量预设");
  const controls = document.createElement("div");
  controls.className = "ok-record-quality-controls";

  const qualitySelect = createPresetSelect({
    title: "质量",
    options: presets.frameQualityPresets,
    value: state.frameQualityPresetId,
    onChange: handlers.onFrameQualityPresetChange,
  });
  const resolutionSelect = createPresetSelect({
    title: "分辨率预设",
    options: presets.captureResolutionPresets,
    value: state.captureResolutionPresetId,
    onChange: handlers.onCaptureResolutionPresetChange,
  });

  appendChildren(controls, [
    createInlineSelectControl("质量", qualitySelect),
    createSpacer("ok-record-quality-control-gap"),
    createInlineSelectControl("分辨率", resolutionSelect),
  ]);
  appendFieldControls(field, fieldLabel, [controls]);
  return { field, qualitySelect, resolutionSelect };
}

function renderPaintingTimerStatusLabel(button, state) {
  if (!button) {
    return;
  }

  let label = button.querySelector(".ok-record-button-label");
  if (!label) {
    clearChildren(button);
    label = document.createElement("span");
    label.className = "ok-record-button-label";
    button.appendChild(label);
  }

  clearChildren(label);
  const indicatorClassName = state.indicatorClassName || "ok-record-timer-indicator-hidden";
  const indicatorHidden = indicatorClassName === "ok-record-timer-indicator-hidden";

  const indicatorSlot = document.createElement("span");
  indicatorSlot.className = [
    "ok-record-timer-indicator-slot",
    indicatorHidden ? "ok-record-timer-indicator-slot-hidden" : "",
  ].filter(Boolean).join(" ");
  indicatorSlot.setAttribute("aria-hidden", "true");

  const indicator = document.createElement("span");
  indicator.className = [
    "ok-record-timer-indicator",
    indicatorClassName,
  ].filter(Boolean).join(" ");
  indicatorSlot.appendChild(indicator);

  const text = document.createElement("span");
  text.className = "ok-record-timer-text";
  text.textContent = state.labelText || "";

  appendChildren(label, [indicatorSlot, text]);
}

function renderRecordingStatusLabel(button, state) {
  if (!button) {
    return;
  }

  const indicatorClassName = state.indicatorClassName || "";
  const labelText = state.labelText || "";
  if (!indicatorClassName) {
    setButtonLabel(button, labelText);
    return;
  }

  let label = button.querySelector(".ok-record-button-label");
  if (!label) {
    clearChildren(button);
    label = document.createElement("span");
    label.className = "ok-record-button-label";
    button.appendChild(label);
  }

  clearChildren(label);

  const indicator = document.createElement("span");
  indicator.className = [
    "ok-record-record-indicator",
    indicatorClassName,
  ].join(" ");
  indicator.setAttribute("aria-hidden", "true");

  const indicatorSlot = document.createElement("span");
  indicatorSlot.className = "ok-record-record-indicator-slot";
  indicatorSlot.setAttribute("aria-hidden", "true");
  indicatorSlot.appendChild(indicator);

  const text = document.createElement("span");
  text.className = "ok-record-record-text";
  text.textContent = labelText;

  appendChildren(label, [indicatorSlot, text]);
}

function renderExportStatusLabel(button, state = {}) {
  if (!button) {
    return;
  }

  const indicatorClassName = state.indicatorClassName || "";
  const labelText = state.labelText || "";

  let label = button.querySelector(".ok-record-button-label");
  if (!label) {
    clearChildren(button);
    label = document.createElement("span");
    label.className = "ok-record-button-label";
    button.appendChild(label);
  }

  clearChildren(label);

  const text = document.createElement("span");
  text.className = "ok-record-export-text";
  text.textContent = labelText;

  if (indicatorClassName) {
    const indicator = document.createElement("span");
    indicator.className = [
      "ok-record-export-indicator",
      indicatorClassName,
    ].join(" ");
    indicator.setAttribute("aria-hidden", "true");

    const indicatorSlot = document.createElement("span");
    indicatorSlot.className = "ok-record-export-indicator-slot";
    indicatorSlot.setAttribute("aria-hidden", "true");
    indicatorSlot.appendChild(indicator);
    appendChildren(label, [indicatorSlot, text]);
    return;
  }

  appendChildren(label, [text]);
}

function renderStepCaptureButtonLabel(button, state) {
  if (!button) {
    return;
  }

  let label = button.querySelector(".ok-record-button-label");
  if (!label) {
    clearChildren(button);
    label = document.createElement("span");
    label.className = "ok-record-button-label";
    button.appendChild(label);
  }

  clearChildren(label);
  const frameCount = Number(state.frameCount) || 0;
  const indicatorClassName = state.indicatorClassName ||
    (frameCount > 0 ? "ok-record-step-indicator-success" : "ok-record-step-indicator-hidden");
  const indicator = document.createElement("span");
  indicator.className = [
    "ok-record-step-indicator",
    indicatorClassName,
  ].filter(Boolean).join(" ");
  indicator.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = state.labelText || (frameCount > 0 ? `手动采样 ${frameCount} 张` : "手动采样");
  appendChildren(label, [indicator, text]);
}

function setTimerStatusButtonMetrics(button) {
  setButtonTextMetrics(button, "16px", "22px");
  button.style.fontWeight = "700";
  const label = button.querySelector(".ok-record-button-label");
  if (label) {
    label.style.fontWeight = "700";
  }
}

function createPrimaryActionsGroup({ refs, buttonStates, handlers }) {
  refs.paintingTimerDisplayButtonNode = createControlButton(
    buttonStates.paintingTimer.labelText,
    handlers.onPaintingTimerControl,
    "ok-record-timer-status-button ok-record-timer-status-action",
  );
  refs.paintingTimerDisplayButtonNode.title = "开始、暂停或继续绘画计时；Alt+点击结束并显示绘画总时长";
  refs.paintingTimerDisplayButtonNode.setAttribute("aria-label", "开始、暂停或继续绘画计时；Alt+点击结束并显示绘画总时长");
  refs.paintingTimerDisplayButtonNode.setAttribute("aria-live", "polite");
  renderPaintingTimerStatusLabel(refs.paintingTimerDisplayButtonNode, buttonStates.paintingTimer);
  setTimerStatusButtonMetrics(refs.paintingTimerDisplayButtonNode);

  refs.startRecordingButtonNode = createControlButton(
    "开始录制",
    handlers.onToggleRecording,
    "ok-record-record-status-button",
  );
  refs.startRecordingButtonNode.title = "开始、暂停或继续录制";
  refs.startRecordingButtonNode.setAttribute("aria-label", "开始、暂停或继续录制");
  renderRecordingStatusLabel(refs.startRecordingButtonNode, buttonStates.recording);

  refs.captureNowButtonNode = createControlButton(
    "手动采样",
    handlers.onCaptureNow,
    "ok-record-step-status-button",
  );
  renderStepCaptureButtonLabel(refs.captureNowButtonNode, buttonStates.stepCapture);

  const timerActionRow = createButtonRow([refs.paintingTimerDisplayButtonNode], "ok-record-primary-action-row ok-record-timer-control-row");
  const recordingActionRow = createButtonRow([refs.startRecordingButtonNode], "ok-record-primary-action-row ok-record-recording-row");
  const stepActionRow = createButtonRow([refs.captureNowButtonNode], "ok-record-primary-action-row ok-record-step-row");

  const group = createPanelGroup("", [
    timerActionRow,
    createSpacer("ok-record-recording-button-row-gap", "div"),
    recordingActionRow,
    createSpacer("ok-record-recording-button-row-gap", "div"),
    stepActionRow,
  ], { showTitle: false });
  group.classList.add("ok-record-primary-actions-group");
  return group;
}

function createRecordingGroup({ refs, state, ranges, handlers }) {
  const intervalField = createSecondField({
    label: "采样间隔",
    value: String(state.intervalSeconds),
    min: ranges.minIntervalSeconds,
    max: ranges.maxIntervalSeconds,
    step: 1,
    onChange: handlers.onIntervalChange,
  });
  refs.intervalSecondsInputNode = intervalField.input;

  const idleCaptureDelayField = createSecondField({
    label: "延迟采样",
    value: state.idleCaptureDelaySeconds,
    min: ranges.minIdleCaptureDelaySeconds,
    max: ranges.maxIdleCaptureDelaySeconds,
    step: 0.1,
    onInput: handlers.onIdleCaptureSettingsChange,
    onChange: handlers.onIdleCaptureSettingsChange,
  });
  refs.idleCaptureDelaySecondsInputNode = idleCaptureDelayField.input;

  const idleCaptureMaxWaitField = createSecondField({
    label: "最长等待时间",
    value: state.idleCaptureMaxWaitSeconds,
    min: ranges.minIdleCaptureMaxWaitSeconds,
    max: ranges.maxIdleCaptureMaxWaitSeconds,
    step: 0.1,
    onInput: handlers.onIdleCaptureSettingsChange,
    onChange: handlers.onIdleCaptureSettingsChange,
  });
  refs.idleCaptureMaxWaitSecondsInputNode = idleCaptureMaxWaitField.input;

  const paintingTimerField = createSecondField({
    label: "空闲暂停绘画计时",
    value: state.paintingTimerIdleTimeoutSeconds,
    min: ranges.minPaintingTimerTimeoutSeconds,
    max: ranges.maxPaintingTimerTimeoutSeconds,
    step: 0.1,
    onInput: handlers.onPaintingTimerTimeoutChange,
    onChange: handlers.onPaintingTimerTimeoutChange,
  });
  refs.paintingTimerSecondsInputNode = paintingTimerField.input;

  refs.chooseFrameOutputDirButtonNode = createButton("序列帧保存目录", handlers.onChooseFrameOutputDir);
  refs.openFrameOutputDirButtonNode = createButton("打开序列帧目录", handlers.onOpenFrameOutputDir);
  refs.chooseStepOutputDirButtonNode = createButton("步骤图保存目录", handlers.onChooseStepOutputDir);
  refs.openStepOutputDirButtonNode = createButton("打开步骤图目录", handlers.onOpenStepOutputDir);

  const saveDirectoryRow = createButtonRow([refs.chooseFrameOutputDirButtonNode, refs.chooseStepOutputDirButtonNode], "ok-record-directory-row");
  const openDirectoryRow = createButtonRow([refs.openFrameOutputDirButtonNode, refs.openStepOutputDirButtonNode], "ok-record-directory-row");

  const group = createPanelGroup("OK-Record 设置", [
    intervalField.field,
    createSpacer("ok-record-recording-input-row-gap", "div"),
    idleCaptureDelayField.field,
    createSpacer("ok-record-recording-input-row-gap", "div"),
    idleCaptureMaxWaitField.field,
    createSpacer("ok-record-recording-input-row-gap", "div"),
    paintingTimerField.field,
    createSpacer("ok-record-recording-button-row-gap", "div"),
    saveDirectoryRow,
    createSpacer("ok-record-recording-button-row-gap", "div"),
    openDirectoryRow,
  ]);
  group.classList.add("ok-record-recording-group");
  return group;
}

function createExportGroup({ refs, state, ranges, presets, buttonStates, handlers }) {
  const holdSecondsField = createSecondField({
    label: "每帧停留",
    value: state.exportHoldSeconds,
    min: 0.001,
    max: ranges.maxExportHoldSeconds,
    step: 0.001,
    onInput: handlers.onHoldSecondsChange,
    onChange: handlers.onHoldSecondsChange,
  });
  refs.exportHoldSecondsInputNode = holdSecondsField.input;

  const durationField = createMinuteSecondField({
    label: "视频时长",
    parts: state.exportDurationParts,
    minuteMax: Math.floor(ranges.maxExportDurationSeconds / ranges.secondsPerMinute),
    secondMax: ranges.secondsPerMinute - 0.001,
    secondStep: 0.1,
    onInput: handlers.onExportProfileChange,
    onChange: handlers.onExportProfileChange,
  });
  refs.exportDurationMinutesInputNode = durationField.minutesInput;
  refs.exportDurationSecondsInputNode = durationField.secondsInput;

  const qualityPresetField = createQualityPresetField({ presets, state, handlers });
  refs.frameQualityPresetSelectNode = qualityPresetField.qualitySelect;
  refs.captureResolutionPresetSelectNode = qualityPresetField.resolutionSelect;

  refs.chooseExportSequenceDirButtonNode = createButton("选择序列帧目录", handlers.onChooseExportSequenceDir);
  refs.exportButtonNode = createControlButton("导出视频", handlers.onExportSession, "ok-record-export-status-button");
  renderExportStatusLabel(refs.exportButtonNode, buttonStates.export);
  refs.openExportFolderButtonNode = createButton("打开导出目录", handlers.onOpenExportFolder);
  const exportActionRow = createButtonRow([refs.exportButtonNode]);
  const exportDirectoryRow = createButtonRow(
    [refs.chooseExportSequenceDirButtonNode, refs.openExportFolderButtonNode],
    "ok-record-directory-row",
  );

  const group = createPanelGroup("导出设置", [
    holdSecondsField.field,
    createSpacer("ok-record-export-input-row-gap", "div"),
    durationField.field,
    qualityPresetField.field,
    createSpacer("ok-record-export-action-row-gap", "div"),
    exportDirectoryRow,
    createSpacer("ok-record-export-button-row-gap", "div"),
    exportActionRow,
  ]);
  group.classList.add("ok-record-export-group");
  return group;
}

function createExportNoticePanel({ refs, handlers }) {
  refs.exportNoticeNode = document.createElement("div");
  refs.exportNoticeNode.className = "ok-record-export-notice";
  refs.exportNoticeNode.setAttribute("aria-live", "polite");

  const header = document.createElement("div");
  header.className = "ok-record-export-notice-header";

  refs.exportNoticeTitleNode = document.createElement("div");
  refs.exportNoticeTitleNode.className = "ok-record-export-notice-title";

  refs.exportNoticeCloseButtonNode = createButton("X", handlers.onHideExportNotice, "ok-record-notice-close-button");
  refs.exportNoticeCloseButtonNode.setAttribute("aria-label", "关闭导出信息");
  refs.exportNoticeCloseButtonNode.title = "关闭";

  refs.exportNoticeBodyNode = document.createElement("div");
  refs.exportNoticeBodyNode.className = "ok-record-export-notice-body";

  appendChildren(header, [refs.exportNoticeTitleNode, refs.exportNoticeCloseButtonNode]);
  appendChildren(refs.exportNoticeNode, [header, refs.exportNoticeBodyNode]);
  return refs.exportNoticeNode;
}

function renderPanel(options) {
  const refs = {};
  const body = options.body;
  clearChildren(body);

  const style = document.createElement("style");
  style.textContent = options.styles;
  body.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "ok-record-panel";
  const panelSections = [
    createPrimaryActionsGroup({ ...options, refs }),
    createRecordingGroup({ ...options, refs }),
    createExportGroup({ ...options, refs }),
  ];
  const spacedPanelSections = [];
  panelSections.forEach((section, index) => {
    if (index > 0) {
      spacedPanelSections.push(createPanelSectionGap());
    }
    spacedPanelSections.push(section);
  });
  spacedPanelSections.push(createExportNoticePanel({ ...options, refs }));
  appendChildren(panel, spacedPanelSections);
  body.appendChild(panel);
  return refs;
}

function showExportNotice(refs, title, lines, tone = "success") {
  if (!refs.exportNoticeNode || !refs.exportNoticeTitleNode || !refs.exportNoticeBodyNode) {
    return;
  }

  refs.exportNoticeTitleNode.textContent = title;
  refs.exportNoticeBodyNode.textContent = Array.isArray(lines) ?
    lines.filter(Boolean).join("\n") :
    String(lines || "");
  refs.exportNoticeNode.className = [
    "ok-record-export-notice",
    "ok-record-export-notice-visible",
    tone === "error" ? "ok-record-export-notice-error" : "ok-record-export-notice-success",
  ].join(" ");
}

function hideExportNotice(refs) {
  if (!refs.exportNoticeNode) {
    return;
  }

  refs.exportNoticeNode.className = "ok-record-export-notice";
  if (refs.exportNoticeTitleNode) {
    refs.exportNoticeTitleNode.textContent = "";
  }
  if (refs.exportNoticeBodyNode) {
    refs.exportNoticeBodyNode.textContent = "";
  }
}

module.exports = {
  renderPanel,
  renderExportStatusLabel,
  renderPaintingTimerStatusLabel,
  renderRecordingStatusLabel,
  renderStepCaptureButtonLabel,
  setTimerStatusButtonMetrics,
  showExportNotice,
  hideExportNotice,
};
