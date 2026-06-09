const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const panelView = require(path.join(repoRoot, "uxp", "panel-view.js"));
const { MockDocument, hasClass, textOf } = require("./helpers/mock-dom");

function makeHandlers() {
  return new Proxy({}, {
    get() {
      return () => {};
    },
  });
}

function makeRenderOptions(document) {
  return {
    body: document.body,
    styles: ".ok-record-panel {}",
    state: {
      intervalSeconds: 2,
      idleCaptureDelaySeconds: 0,
      idleCaptureMaxWaitSeconds: 5,
      paintingTimerIdleTimeoutSeconds: 10,
      exportHoldSeconds: 0.1,
      exportDurationParts: { minutes: 0, seconds: 10 },
      frameQualityPresetId: "default",
      captureResolutionPresetId: "1080p",
      updateAvailable: false,
      updateVersion: "",
    },
    ranges: {
      minIntervalSeconds: 1,
      maxIntervalSeconds: 86400,
      minIdleCaptureDelaySeconds: 0,
      maxIdleCaptureDelaySeconds: 3600,
      minIdleCaptureMaxWaitSeconds: 0,
      maxIdleCaptureMaxWaitSeconds: 3600,
      minPaintingTimerTimeoutSeconds: 1,
      maxPaintingTimerTimeoutSeconds: 86400,
      minExportHoldSeconds: 0.000001,
      maxExportHoldSeconds: 3600,
      maxExportDurationSeconds: 3600,
      secondsPerMinute: 60,
    },
    presets: {
      frameQualityPresets: [
        { id: "low", label: "低" },
        { id: "default", label: "默认" },
        { id: "high", label: "高" },
      ],
      captureResolutionPresets: [
        { id: "1080p", label: "1080p" },
        { id: "original", label: "原始尺寸" },
      ],
    },
    buttonStates: {
      recording: {
        indicatorClassName: "ok-record-record-indicator-active",
        labelText: "录制中 3 张",
      },
      stepCapture: {
        frameCount: 2,
      },
      paintingTimer: {
        indicatorClassName: "ok-record-timer-indicator-active",
        labelText: "绘画计时 00:00:05",
      },
      export: {
        indicatorClassName: "",
        labelText: "导出视频",
      },
    },
    handlers: makeHandlers(),
  };
}

function assertPanelShell(panel) {
  assert(panel, "renderPanel must create the panel root");
  assert.strictEqual(global.document.body.children[0].tagName, "STYLE", "renderPanel must install the style node first");
  assert.strictEqual(global.document.body.children[1], panel, "renderPanel must append the panel after styles");
  assert.strictEqual(panel.children.length, 7, "panel must render three groups, two section gaps, the export notice, and the update dialog");

  assert(hasClass(panel.children[0], "ok-record-primary-actions-group"), "primary recording actions must render before settings");
  assert(hasClass(panel.children[1], "ok-record-panel-section-gap"), "first section gap must be a real spacer node");
  assert(hasClass(panel.children[2], "ok-record-recording-group"), "OK-Record settings group must render after primary actions");
  assert(hasClass(panel.children[3], "ok-record-panel-section-gap"), "second section gap must be a real spacer node");
  assert(hasClass(panel.children[4], "ok-record-export-group"), "export group must render after OK-Record settings");
  assert(hasClass(panel.children[5], "ok-record-export-notice"), "export notice must render after the visible groups");
  assert(hasClass(panel.children[6], "ok-record-update-dialog"), "update download dialog must render as the final overlay surface");

  const groupTitles = global.document.querySelectorAll(".ok-record-group-title-text").map(textOf);
  assert.deepStrictEqual(groupTitles, ["OK-Record 设置", "导出设置"], "only settings and export groups should have visible titles");

  const panelText = textOf(panel);
  assert(!panelText.includes("状态摘要"), "panel-view must not render the retired persistent status summary group");
  assert(!panelText.includes("测试 Native"), "panel-view must not expose the retired native test action");
  assert(!panelText.includes("捕获探测"), "panel-view must not expose the retired capture probe action");
  assert(!panelText.includes("立即采样"), "panel-view must not expose the retired old manual-capture label");
  assert(!panelText.includes("仅在变化时采样"), "panel-view must not expose a redundant change-only capture checkbox");
  assert(!panelText.includes("每帧停留时长"), "panel-view must not keep the retired longer per-frame hold label");
  assert(!panelText.includes("每秒输出序列帧"), "panel-view must not expose the retired sequence-frames-per-second field");
  assert(!panelText.includes("输出帧率"), "panel-view must not expose output FPS as an editable control");
  assert(!panelText.includes("采样/导出最大宽度"), "panel-view must not expose a manual sampling/export max-width field");
  assert.strictEqual(panel.querySelector(".ok-record-section"), null, "panel-view must not render boxed workflow sections");
  assert.strictEqual(panel.querySelector(".ok-record-group-title-indicator"), null, "panel-view group headers must not copy the OP indicator control");
}

function assertPaintingTimerControls(refs) {
  assert.strictEqual(refs.paintingTimerDisplayButtonNode.getAttribute("aria-live"), "polite", "painting timer button must announce label updates");
  assert.strictEqual(refs.paintingTimerDisplayButtonNode.getAttribute("aria-label"), "开始、暂停或继续绘画计时；Alt+点击结束并显示绘画总时长");
  assert.strictEqual(refs.paintingTimerDisplayButtonNode.style.fontSize, "16px", "painting timer button must set UXP-safe text metrics directly");
  assert.strictEqual(refs.paintingTimerDisplayButtonNode.style.lineHeight, "22px", "painting timer button must set UXP-safe line height directly");
  assert.strictEqual(refs.paintingTimerDisplayButtonNode.style.fontWeight, "700", "painting timer button must keep bold status text");
  assert(hasClass(refs.paintingTimerDisplayButtonNode.querySelector(".ok-record-timer-indicator-slot"), "ok-record-timer-indicator-slot"), "painting timer label must reserve an indicator slot");
  assert.strictEqual(textOf(refs.paintingTimerDisplayButtonNode), "绘画计时 00:00:05", "painting timer label text must render after the indicator");
}

function assertPrimaryActionsGroup(group, refs) {
  const body = group.querySelector(".ok-record-group-body");
  assert(body, "primary actions group must have a body");
  assert(hasClass(body.children[0], "ok-record-timer-control-row"), "painting timer button must be the first visible action");
  assert(hasClass(body.children[0].children[0], "ok-record-update-badge-balance-slot"), "timer row must keep a left balance slot");
  assert.strictEqual(body.children[0].children[1], refs.paintingTimerDisplayButtonNode, "painting timer button must stay the centered top-row control");
  assert.strictEqual(body.children[0].children[2], refs.updateBadgeSlotNode, "available-update badge must sit inside the timer row right slot");
  assert(hasClass(body.children[1], "ok-record-recording-button-row-gap"), "painting timer and recording actions must use a 12px spacer node");
  assert(hasClass(body.children[2], "ok-record-recording-row"), "recording button must sit directly under painting timer");
  assert(hasClass(body.children[3], "ok-record-recording-button-row-gap"), "recording and manual sampling actions must use a 12px spacer node");
  assert(hasClass(body.children[4], "ok-record-step-row"), "manual sampling button must sit under recording");
  assertPaintingTimerControls(refs);
  assert.strictEqual(textOf(refs.startRecordingButtonNode), "录制中 3 张", "recording button must render status text through panel-view");
  assert.strictEqual(refs.startRecordingButtonNode.getAttribute("aria-label"), "开始、暂停或继续录制", "recording button must expose only recording control");
  assert(hasClass(refs.startRecordingButtonNode.querySelector(".ok-record-record-indicator-slot"), "ok-record-record-indicator-slot"), "recording status must reserve an indicator slot while active");
  assert.strictEqual(textOf(refs.captureNowButtonNode), "手动采样 2 张", "manual sampling button must show the sampled count");
  assert(!hasClass(refs.captureNowButtonNode.querySelector(".ok-record-step-indicator"), "ok-record-step-indicator-hidden"), "manual sampling indicator must be visible after sampling");
}

function assertRecordingGroup(group, refs) {
  const body = group.querySelector(".ok-record-group-body");
  assert(body, "recording group must have a body");
  assert(hasClass(body.children[0], "ok-record-field"), "sampling interval must be the first OK-Record setting");
  assert(hasClass(body.children[1], "ok-record-recording-input-row-gap"), "recording input rows must be separated by real spacer nodes");
  assert(hasClass(body.children[3], "ok-record-recording-input-row-gap"), "recording delay and max wait fields must be separated by a real spacer node");
  assert(hasClass(body.children[5], "ok-record-recording-input-row-gap"), "painting timer idle field must sit under max wait with a real spacer node");
  assert(hasClass(body.children[7], "ok-record-recording-button-row-gap"), "directory buttons must start under the painting timer idle field");
  assert(hasClass(body.children[8], "ok-record-directory-row"), "recording save directory buttons must be a compact directory row");
  assert(hasClass(body.children[9], "ok-record-recording-button-row-gap"), "save and open directory rows must use a 12px spacer node");
  assert(hasClass(body.children[10], "ok-record-directory-row"), "recording open directory buttons must be a compact directory row");
  assert(hasClass(body.children[11], "ok-record-recording-button-row-gap"), "open and clear directory rows must use a 12px spacer node");
  assert(hasClass(body.children[12], "ok-record-clear-recording-row"), "clear sequence-frame button must sit under the directory controls");

  assert.deepStrictEqual(
    group.querySelectorAll(".ok-record-field-label").map(textOf),
    ["采样间隔", "延迟采样", "最长等待时间", "空闲暂停绘画计时"],
    "OK-Record settings group must expose the expected field labels",
  );
  assert.strictEqual(textOf(refs.chooseProjectOutputDirButtonNode), "指定 OK-Record 保存目录");
  assert.strictEqual(textOf(refs.openFrameOutputDirButtonNode), "打开序列帧目录");
  assert.strictEqual(refs.chooseStepOutputDirButtonNode, undefined, "step image directory must not have an independent picker");
  assert.strictEqual(textOf(refs.openStepOutputDirButtonNode), "打开步骤图目录");
  assert.strictEqual(textOf(refs.clearRecordingTimelineButtonNode), "清空序列帧");
  assert(hasClass(refs.clearRecordingTimelineButtonNode, "ok-record-danger-button"), "clear sequence-frame button must use the red danger style");
  assert.strictEqual(refs.intervalSecondsInputNode.value, "2");
  assert.strictEqual(refs.intervalMinutesInputNode, undefined, "recording interval must not keep a retired minute input ref");
  assert.strictEqual(refs.captureOnlyChangedInputNode, undefined, "recording settings must not keep a retired change-only checkbox ref");
  assert.strictEqual(refs.idleCaptureDelaySecondsInputNode.value, "0");
  assert.strictEqual(refs.idleCaptureMaxWaitSecondsInputNode.value, "5");
  assert.strictEqual(refs.paintingTimerSecondsInputNode.value, "10", "painting timer idle threshold ref must point to the numeric editor");
  assert.strictEqual(refs.paintingTimerMinutesInputNode, undefined, "painting timer idle threshold must not keep a retired minute input ref");
}

function assertExportGroup(group, refs) {
  const body = group.querySelector(".ok-record-group-body");
  assert(body, "export group must have a body");
  assert(hasClass(body.children[0], "ok-record-field"), "per-frame hold field must be first in export settings");
  assert(hasClass(body.children[1], "ok-record-export-input-row-gap"), "hold duration and video duration must be separated by one 8px spacer node");
  assert(hasClass(body.children[2], "ok-record-field"), "video duration field must stay above quality presets");
  assert(hasClass(body.children[3], "ok-record-field"), "quality presets must sit above export action buttons");
  assert(hasClass(body.children[4], "ok-record-export-action-row-gap"), "quality presets and export directory row must use an explicit zero-height spacer node");
  assert(hasClass(body.children[5], "ok-record-directory-row"), "export directory actions must be paired as one compact row");
  assert(hasClass(body.children[6], "ok-record-export-button-row-gap"), "export video button must sit 12px under the export directory row");
  assert(hasClass(body.children[7], "ok-record-button-row"), "export video button must occupy the final full row");

  assert.deepStrictEqual(
    group.querySelectorAll(".ok-record-field-label").map(textOf),
    ["每帧停留", "视频时长", "质量预设"],
    "export group must expose the expected field labels",
  );
  assert.deepStrictEqual(
    group.querySelectorAll(".ok-record-quality-option-label").map(textOf),
    ["质量", "分辨率"],
    "quality presets must use short visible labels beside each dropdown",
  );
  assert.strictEqual(textOf(refs.exportButtonNode), "导出视频");
  assert(hasClass(refs.exportButtonNode, "ok-record-export-status-button"), "export video button must own the export status class");
  assert(hasClass(refs.exportButtonNode, "ok-record-control-button"), "export video button must share the status-control surface");
  assert.strictEqual(refs.exportButtonNode.querySelector(".ok-record-export-indicator-slot"), null, "idle export button must not reserve a status indicator slot");
  assert.strictEqual(refs.exportButtonNode.querySelector(".ok-record-export-indicator"), null, "idle export button must not show a neutral status dot");
  assert.strictEqual(textOf(refs.chooseExportSequenceDirButtonNode), "选择序列帧目录");
  assert.strictEqual(textOf(refs.openExportFolderButtonNode), "打开导出目录");
  assert.strictEqual(refs.exportHoldSecondsInputNode.value, "0.1");
  assert.strictEqual(refs.exportDurationMinutesInputNode.value, "0");
  assert.strictEqual(refs.exportDurationSecondsInputNode.value, "10");
  assert.strictEqual(refs.exportOutputFpsInputNode, undefined, "export settings must not expose output FPS as an editable ref");
  assert.strictEqual(refs.exportMaxWidthInputNode, undefined, "export settings must not expose a manual max-width ref");
  assert.strictEqual(refs.frameQualityPresetSelectNode.value, "default");
  assert.strictEqual(refs.frameQualityPresetSelectNode.title, "质量");
  assert.strictEqual(refs.frameQualityPresetSelectNode.getAttribute("aria-label"), "质量");
  assert.strictEqual(refs.captureResolutionPresetSelectNode.value, "1080p");
  assert.strictEqual(refs.captureResolutionPresetSelectNode.title, "分辨率预设");
  assert.strictEqual(refs.captureResolutionPresetSelectNode.getAttribute("aria-label"), "分辨率预设");
}

function assertNoticeOnly(refs) {
  assert.strictEqual(global.document.querySelector(".ok-record-documentation-button"), null, "visible local documentation button must stay retired from the panel body");
  assert.strictEqual(refs.exportNoticeNode.getAttribute("aria-live"), "polite");

  panelView.showExportNotice(refs, "导出完成", ["输出：test.mp4", "质量：默认"], "success");
  assert(hasClass(refs.exportNoticeNode, "ok-record-export-notice-visible"), "shown export notice must become visible");
  assert(hasClass(refs.exportNoticeNode, "ok-record-export-notice-success"), "success notice must use the success tone");
  assert.strictEqual(textOf(refs.exportNoticeTitleNode), "导出完成");
  assert.strictEqual(refs.exportNoticeBodyNode.tagName, "TEXTAREA", "export notice details must render as selectable text");
  assert.strictEqual(refs.exportNoticeBodyNode.readOnly, true, "export notice details must be read-only");
  assert.strictEqual(refs.exportNoticeBodyNode.getAttribute("aria-label"), "导出或更新详情，可选中复制");
  assert.strictEqual(refs.exportNoticeBodyNode.value, "输出：test.mp4\n质量：默认", "export notice details must be available for Ctrl+C copying");
  assert.strictEqual(textOf(refs.exportNoticeBodyNode), "输出：test.mp4\n质量：默认");

  panelView.hideExportNotice(refs);
  assert.strictEqual(refs.exportNoticeNode.className, "ok-record-export-notice", "hidden export notice must reset to its base class");
  assert.strictEqual(textOf(refs.exportNoticeTitleNode), "");
  assert.strictEqual(refs.exportNoticeBodyNode.value, "");
  assert.strictEqual(textOf(refs.exportNoticeBodyNode), "");
}

function assertUpdateSurfaces(refs) {
  assert.strictEqual(textOf(refs.updateBadgeButtonNode), "可更新", "update badge must use the requested visible label");
  assert(!hasClass(refs.updateBadgeSlotNode, "ok-record-update-badge-slot-visible"), "update badge slot must stay hidden before a newer manifest is found");
  assert.strictEqual(refs.updateBadgeButtonNode.disabled, true, "hidden update badge must also be disabled");

  panelView.renderUpdateBadge(refs, {
    updateAvailable: true,
    updateVersion: "1.0.3",
  });
  assert(hasClass(refs.updateBadgeSlotNode, "ok-record-update-badge-slot-visible"), "newer manifest must reveal the painting-timer-row update badge");
  assert.strictEqual(refs.updateBadgeButtonNode.disabled, false, "visible update badge must be clickable");
  assert.strictEqual(refs.updateBadgeButtonNode.getAttribute("aria-label"), "发现新版本 1.0.3，点击查看下载链接");

  panelView.showUpdateDialog(refs, {
    currentVersion: "1.0.2",
    version: "1.0.3",
    summary: "测试更新摘要",
    githubUrl: "https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3",
    netdiskUrl: "",
  });
  assert(hasClass(refs.updateDialogNode, "ok-record-update-dialog-visible"), "clicking the update badge must show the download dialog");
  assert.strictEqual(textOf(refs.updateDialogTitleNode), "发现新版本 1.0.3");
  assert(textOf(refs.updateDialogVersionNode).includes("当前版本：1.0.2"), "update dialog must show the installed version");
  assert.strictEqual(textOf(refs.updateDialogSummaryNode), "测试更新摘要");
  assert.strictEqual(textOf(refs.updateDialogGithubButtonNode), "GitHub");
  assert.strictEqual(textOf(refs.updateDialogNetdiskButtonNode), "网盘");
  assert.strictEqual(refs.updateDialogGithubButtonNode.disabled, false, "GitHub download button must be enabled when the release URL is present");
  assert.strictEqual(refs.updateDialogNetdiskButtonNode.disabled, true, "netdisk button must be disabled when update.json has no netdisk URL");
  assert.strictEqual(textOf(refs.updateDialogHintNode), "网盘链接未配置，可以先使用 GitHub 下载。");

  panelView.showUpdateDialog(refs, {
    currentVersion: "1.0.2",
    version: "1.0.3",
    summary: "测试更新摘要",
    githubUrl: "https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3",
    netdiskUrl: "https://pan.example.com/ok-record",
  });
  assert.strictEqual(refs.updateDialogNetdiskButtonNode.disabled, false, "netdisk button must become enabled when update.json supplies a URL");
  assert.strictEqual(textOf(refs.updateDialogHintNode), "请选择 GitHub 或网盘下载新版 .ccx 安装文件。");

  panelView.hideUpdateDialog(refs);
  assert.strictEqual(refs.updateDialogNode.className, "ok-record-update-dialog", "hidden update dialog must reset to its base class");
}

function testRenderPanel() {
  const document = new MockDocument();
  global.document = document;
  const refs = panelView.renderPanel(makeRenderOptions(document));
  const panel = document.querySelector(".ok-record-panel");

  assertPanelShell(panel);
  assertUpdateSurfaces(refs);
  assertPrimaryActionsGroup(panel.children[0], refs);
  assertRecordingGroup(panel.children[2], refs);
  assertExportGroup(panel.children[4], refs);
  assertNoticeOnly(refs);
}

function testLabelRenderers() {
  const document = new MockDocument();
  global.document = document;

  const idleRecordingButton = document.createElement("div");
  panelView.renderRecordingStatusLabel(idleRecordingButton, {
    indicatorClassName: "",
    labelText: "开始录制",
  });
  assert.strictEqual(textOf(idleRecordingButton), "开始录制", "idle recording label must not render a status indicator");
  assert.strictEqual(idleRecordingButton.querySelector(".ok-record-record-indicator-slot"), null);

  const activeRecordingButton = document.createElement("div");
  panelView.renderRecordingStatusLabel(activeRecordingButton, {
    indicatorClassName: "ok-record-record-indicator-active",
    labelText: "录制中 8 张",
  });
  assert(hasClass(activeRecordingButton.querySelector(".ok-record-record-indicator-slot"), "ok-record-record-indicator-slot"));
  assert.strictEqual(textOf(activeRecordingButton), "录制中 8 张");

  const timerButton = document.createElement("div");
  panelView.renderPaintingTimerStatusLabel(timerButton, {
    indicatorClassName: "ok-record-timer-indicator-waiting",
    labelText: "绘画计时 00:01:02",
  });
  assert(hasClass(timerButton.querySelector(".ok-record-timer-indicator-slot"), "ok-record-timer-indicator-slot"));
  assert.strictEqual(textOf(timerButton), "绘画计时 00:01:02");

  const emptyStepButton = document.createElement("div");
  panelView.renderStepCaptureButtonLabel(emptyStepButton, { frameCount: 0 });
  assert.strictEqual(textOf(emptyStepButton), "手动采样");
  assert(hasClass(emptyStepButton.querySelector(".ok-record-step-indicator"), "ok-record-step-indicator-hidden"));

  const samplingStepButton = document.createElement("div");
  panelView.renderStepCaptureButtonLabel(samplingStepButton, {
    frameCount: 0,
    indicatorClassName: "ok-record-step-indicator-sampling",
  });
  assert(hasClass(samplingStepButton.querySelector(".ok-record-step-indicator"), "ok-record-step-indicator-sampling"));
  assert.strictEqual(textOf(samplingStepButton), "手动采样");

  const countedStepButton = document.createElement("div");
  panelView.renderStepCaptureButtonLabel(countedStepButton, { frameCount: 5 });
  assert.strictEqual(textOf(countedStepButton), "手动采样 5 张");
  assert(!hasClass(countedStepButton.querySelector(".ok-record-step-indicator"), "ok-record-step-indicator-hidden"));
  assert(hasClass(countedStepButton.querySelector(".ok-record-step-indicator"), "ok-record-step-indicator-success"));

  const idleExportButton = document.createElement("button");
  panelView.renderExportStatusLabel(idleExportButton, { labelText: "导出视频" });
  assert.strictEqual(idleExportButton.querySelector(".ok-record-export-indicator-slot"), null);
  assert.strictEqual(idleExportButton.querySelector(".ok-record-export-indicator"), null);
  assert.strictEqual(textOf(idleExportButton), "导出视频");

  const exportingButton = document.createElement("button");
  panelView.renderExportStatusLabel(exportingButton, {
    indicatorClassName: "ok-record-export-indicator-exporting",
    labelText: "导出视频（正在导出）",
  });
  assert(hasClass(exportingButton.querySelector(".ok-record-export-indicator-slot"), "ok-record-export-indicator-slot"));
  assert(hasClass(exportingButton.querySelector(".ok-record-export-indicator"), "ok-record-export-indicator-exporting"));
  assert.strictEqual(textOf(exportingButton), "导出视频（正在导出）");

  const successButton = document.createElement("button");
  panelView.renderExportStatusLabel(successButton, {
    indicatorClassName: "ok-record-export-indicator-success",
    labelText: "导出视频（成功）",
  });
  assert(hasClass(successButton.querySelector(".ok-record-export-indicator"), "ok-record-export-indicator-success"));
  assert.strictEqual(textOf(successButton), "导出视频（成功）");

  const failureButton = document.createElement("button");
  panelView.renderExportStatusLabel(failureButton, {
    indicatorClassName: "ok-record-export-indicator-failure",
    labelText: "导出视频（失败）",
  });
  assert(hasClass(failureButton.querySelector(".ok-record-export-indicator"), "ok-record-export-indicator-failure"));
  assert.strictEqual(textOf(failureButton), "导出视频（失败）");
}

testRenderPanel();
testLabelRenderers();
