const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const contract = readJson("shared/recorder-contract.json");
const manifest = readJson("uxp/manifest.json");
const updateManifest = readJson("docs/update.json");
const readme = readText("README.md");
const readmeEnglish = readText("README.en.md");
const agentsDocs = readText("AGENTS.md");
const contributingDocs = readText("CONTRIBUTING.md");
const uxpMain = readText("uxp/main.js");
const panelViewModule = readText("uxp/panel-view.js");
const panelStylesModule = readText("uxp/panel-styles.js");
const statusMessagesModule = readText("uxp/status-messages.js");
const settingsModelModule = readText("uxp/domain/settings-model.js");
const paintingTimerModule = readText("uxp/domain/painting-timer.js");
const pathPolicyModule = readText("uxp/domain/path-policy.js");
const recordingContextModule = readText("uxp/domain/recording-context.js");
const localDocumentation = readText("docs/index.html");
const architectureDocs = readText("Architecture.md");
const scopedDocumentationIndex = readText("docs/README.md");
const scopedChineseDocumentationIndex = readText("docs/zh-CN/README.md");
const securityPolicy = readText("SECURITY.md");
const packageInstallNotes = readText("packaging/INSTALL.md");
const releaseNotes = readText("packaging/RELEASE_NOTES.md");
const runtimeSmokeChecklist = readText("packaging/RUNTIME_SMOKE_CHECKLIST.md");
const macBuildDocs = readText("docs/mac-build.md");
const macBuildChineseDocs = readText("docs/zh-CN/mac-build.md");
const recorderSchedulerModule = readText("uxp/recorder-scheduler.js");
const nativeModule = readText("native/src/module.cpp");
const nativeExportFrameSetHeader = readText("native/src/export_frame_set.h");
const nativeExportFrameSetModule = readText("native/src/export_frame_set.cpp");
const nativeStorageRecoveryHeader = readText("native/src/storage_recovery.h");
const nativeStorageRecoveryModule = readText("native/src/storage_recovery.cpp");
const nativeExportProgressHeader = readText("native/src/export_progress.h");
const nativeExportProgressModule = readText("native/src/export_progress.cpp");
const nativeExportRunnerHeader = readText("native/src/export_runner.h");
const nativeExportRunnerModule = readText("native/src/export_runner.cpp");
const nativeProject = readText("native/win/OK-Record-Addon.vcxproj");
const buildNativeMacScript = readText("tools/build-native-mac.sh");
const verifyLocalWindowsScript = readText("tools/verify-local.ps1");
const verifyLocalMacScript = readText("tools/verify-local-mac.sh");
const openSourceAuditScript = readText("tools/open-source-audit.ps1");
const buildReleaseMacScript = readText("packaging/build-release-mac.sh");
const buildReleaseWindowsScript = readText("packaging/build-release.ps1");
const buildUserPackageScript = readText("packaging/build-user-package.ps1");
const verifyInstalledPayloadScript = readText("packaging/verify-installed-payload.ps1");
const gitignore = readText(".gitignore");
const nativeSources = `${nativeModule}\n${nativeExportFrameSetHeader}\n${nativeExportFrameSetModule}\n${nativeStorageRecoveryHeader}\n${nativeStorageRecoveryModule}\n${nativeExportProgressHeader}\n${nativeExportProgressModule}\n${nativeExportRunnerHeader}\n${nativeExportRunnerModule}`;

assert.deepStrictEqual(contract.recorderStates, [
  "Idle",
  "Armed",
  "Recording",
  "Paused",
  "CapturePending",
  "Writing",
  "Exporting",
  "Error",
]);
assert.deepStrictEqual(contract.productNaming, {
  displayName: "OK-Record",
  repositorySlug: "OK-Record",
  technicalSlug: "ok-record",
  jsPanelId: "okRecordPanel",
  pascalIdentifierPrefix: "OkRecord",
  cppNamespace: "ok_record",
  installIdentity: "com.badbrush.okrecord",
  nativeAddonName: "ok-record-addon.uxpaddon",
  exportFilePrefix: "OK-Record_timelapse_",
});
assert.strictEqual(manifest.id, contract.productNaming.installIdentity, "manifest install identity must stay stable and reverse-DNS compatible");
assert.strictEqual(manifest.name, contract.productNaming.displayName, "manifest display name must use the branded product spelling");
assert.strictEqual(manifest.addon.name, contract.productNaming.nativeAddonName, "manifest native addon name must use the technical slug");
assert(nativeProject.includes(`<RootNamespace>${contract.productNaming.pascalIdentifierPrefix}Addon</RootNamespace>`), "native project namespace metadata must use the PascalCase product identifier");
assert.strictEqual(contract.sessionLayout.rootDirName, "延时录制_Recordings");
assert.strictEqual(contract.sessionLayout.timelineId, "Timeline");
assert.strictEqual(contract.sessionLayout.framesDirName, "frames");
assert.strictEqual(contract.sessionLayout.tempDirName, "temp");
assert.strictEqual(contract.sessionLayout.exportsDirName, "exports");
assert.strictEqual(contract.sessionLayout.logsDirName, "logs");
assert.strictEqual(contract.projectLayout.documentProjectDirPrefix, "OK-Record_");
assert.strictEqual(contract.scheduler.defaultIntervalMinutes, 2 / 60);
assert.strictEqual(contract.scheduler.minIntervalMinutes, 1 / 60);
assert.strictEqual(contract.scheduler.defaultIdleCaptureDelaySeconds, 0);
assert.strictEqual(contract.scheduler.minIdleCaptureDelaySeconds, 0);
assert.strictEqual(contract.scheduler.maxIdleCaptureDelaySeconds, 3600);
assert.strictEqual(contract.scheduler.defaultIdleCaptureMaxWaitSeconds, 5);
assert.strictEqual(contract.scheduler.minIdleCaptureMaxWaitSeconds, 0);
assert.strictEqual(contract.scheduler.maxIdleCaptureMaxWaitSeconds, 3600);
assert.strictEqual(contract.scheduler.defaultCaptureOnlyWhenChanged, true);
assert.strictEqual(contract.activityTimer.schema, "ok-record.activity-timer.v1");
assert.strictEqual(contract.activityTimer.stateFilename, "activity-timer.json");
assert.strictEqual(contract.activityTimer.defaultIdleTimeoutSeconds, 10);
assert.strictEqual(contract.activityTimer.minIdleTimeoutSeconds, 1);
assert.strictEqual(contract.activityTimer.maxIdleTimeoutSeconds, 86400);
assert.strictEqual(contract.panelSettings.schema, "ok-record.panel-settings.v1");
assert.strictEqual(contract.panelSettings.filename, "panel-settings.json");
assert.strictEqual(contract.panelSettings.frameOutputDirField, "frameOutputDir");
assert.strictEqual(contract.panelSettings.frameOutputDocumentKeyField, "frameOutputDocumentKey");
assert.strictEqual(contract.panelSettings.exportSourceDirField, "exportSourceDir");
assert.deepStrictEqual(contract.scheduler.documentChangeEvents, [
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
assert.strictEqual(contract.export.defaultDurationSeconds, 10);
assert.strictEqual(contract.export.clearRecordingSchema, "ok-record.clear-recording-result.v1");
assert.deepStrictEqual(contract.export.aspectRatioModes, ["strict", "pad", "majority"]);
assert.strictEqual(contract.export.progressSchema, "ok-record.export-progress.v1");
assert.strictEqual(contract.export.progressExtension, ".progress");
assert.strictEqual(contract.export.defaultHoldSeconds, 0.1);
assert.strictEqual(contract.export.defaultOutputFps, 30);
assert.strictEqual(contract.export.defaultMaxWidth, 1920);
assert.strictEqual(contract.export.defaultCrf, 18);
assert.strictEqual(contract.export.minDurationSeconds, 1);
assert.strictEqual(contract.export.maxDurationSeconds, 3600);
assert.strictEqual(contract.export.maxHoldSeconds, 3600);
assert.strictEqual(contract.export.minOutputFps, 1);
assert.strictEqual(contract.export.maxOutputFps, 120);
assert.strictEqual(contract.export.minMaxWidth, 16);
assert.strictEqual(contract.export.maxMaxWidth, 16384);
assert.strictEqual(contract.frame.defaultStorageFormat, "jpeg");
assert.strictEqual(contract.frame.defaultExtension, ".jpg");
assert.strictEqual(contract.frame.pngStorageFormat, "png");
assert.strictEqual(contract.frame.pngExtension, ".png");
assert.strictEqual(contract.frame.defaultQualityPreset, "default");
assert.deepStrictEqual(
  contract.frame.qualityPresets.map((preset) => ({
    id: preset.id,
    storageFormat: preset.storageFormat,
    extension: preset.extension,
    jpegQuality: preset.jpegQuality,
  })),
  [
    { id: "low", storageFormat: "jpeg", extension: ".jpg", jpegQuality: 60 },
    { id: "default", storageFormat: "jpeg", extension: ".jpg", jpegQuality: 80 },
    { id: "high", storageFormat: "jpeg", extension: ".jpg", jpegQuality: 92 },
    { id: "lossless", storageFormat: "png", extension: ".png", jpegQuality: 0 },
  ],
);
assert.strictEqual(contract.frame.legacyRawStorageFormat, "raw-rgba");
assert.strictEqual(contract.frame.legacyRawExtension, ".rgba");
assert.strictEqual(contract.frame.metadataExtension, ".json");
assert.strictEqual(contract.frame.filenamePrefix, "frame_");
assert.strictEqual(contract.frame.indexDigits, 6);
assert.strictEqual(contract.stepFrame.schema, "ok-record.step-result.v1");
assert.strictEqual(contract.stepFrame.defaultDirName, "步骤图_Steps");
assert.strictEqual(contract.stepFrame.filenamePrefix, "step_");
assert.strictEqual(contract.stepFrame.indexDigits, 3);
assert.strictEqual(contract.stepFrame.storageFormat, "png");
assert.strictEqual(contract.stepFrame.extension, ".png");
assert.strictEqual(contract.scan.schema, "ok-record.scan-result.v1");
assert.strictEqual(contract.scan.sequenceSchema, "ok-record.sequence-scan-result.v1");
assert.strictEqual(contract.scan.firstFrameMetadataField, "firstFrameMetadataJson");
assert.strictEqual(contract.scan.exportFrameMetadataConsistentField, "exportFrameMetadataConsistent");
assert.strictEqual(contract.scan.contiguousFramesField, "contiguousFrames");
assert.strictEqual(contract.scan.exportableField, "exportable");
assert.strictEqual(contract.scan.firstMissingFrameIndexField, "firstMissingFrameIndex");
assert.strictEqual(contract.scan.orphanFrameCountField, "orphanFrameCount");
assert.strictEqual(contract.scan.firstOrphanFramePathField, "firstOrphanFramePath");
assert.strictEqual(contract.scan.aspectRatioConsistentField, "aspectRatioConsistent");
assert.strictEqual(contract.scan.aspectRatioGroupsJsonField, "aspectRatioGroupsJson");
assert.strictEqual(contract.scan.majorityAspectRatioKeyField, "majorityAspectRatioKey");
assert.strictEqual(contract.scan.majorityAspectRatioFrameCountField, "majorityAspectRatioFrameCount");
assert.strictEqual(contract.scan.exportBlockReasonField, "exportBlockReason");
assert.strictEqual(contract.scan.invalidSessionsField, "invalidSessions");
assert.strictEqual(contract.scan.hasInvalidSessionsField, "hasInvalidSessions");
assert.strictEqual(contract.scan.invalidSessionCountField, "invalidSessionCount");

assert(
  manifest.requiredPermissions &&
    manifest.requiredPermissions.launchProcess &&
    manifest.requiredPermissions.launchProcess.extensions.includes(""),
  "manifest must allow UXP shell.openPath to open folders",
);
assert(
  manifest.requiredPermissions &&
    manifest.requiredPermissions.launchProcess &&
    manifest.requiredPermissions.launchProcess.extensions.includes(".html"),
  "manifest must allow UXP shell.openPath to open the packaged HTML usage guide",
);
assert.strictEqual(
  manifest.requiredPermissions && manifest.requiredPermissions.localFileSystem,
  "request",
  "manifest must allow UXP folder pickers for user-selected save and export directories",
);
assert(
  manifest.requiredPermissions &&
    manifest.requiredPermissions.network &&
    manifest.requiredPermissions.network.domains.includes("https://xbadbrushx.github.io"),
  "manifest must allow fetching the GitHub Pages update manifest",
);
assert(
  manifest.requiredPermissions &&
    manifest.requiredPermissions.launchProcess &&
    manifest.requiredPermissions.launchProcess.schemes.includes("https"),
  "manifest must allow opening the GitHub Release download page",
);
assert.strictEqual(updateManifest.schema, "ok-record.update-manifest.v1", "update manifest must use the static update schema");
assert.strictEqual(updateManifest.version, manifest.version, "update manifest must publish the current public package version");
assert(
  updateManifest.releasePageUrl.startsWith("https://github.com/xBADBRUSHx/OK-Record/releases/"),
  "update manifest release page must point to OK-Record GitHub Releases",
);
assert(
  updateManifest.releasePageUrl.includes(`/v${manifest.version}`) || updateManifest.releasePageUrl.endsWith(`/${manifest.version}`),
  "update manifest release page must include the current package version",
);
assert(
  updateManifest.downloadUrl.startsWith("https://github.com/xBADBRUSHx/OK-Record/releases/"),
  "update manifest download URL must point to OK-Record GitHub Releases",
);
assert(
  updateManifest.downloadUrl.includes(`/v${manifest.version}/`) || updateManifest.downloadUrl.includes(`/${manifest.version}/`),
  "update manifest download URL must include the current package version",
);
assert(
  Object.prototype.hasOwnProperty.call(updateManifest, "netdiskUrl"),
  "update manifest must expose an optional netdiskUrl field for the panel update dialog",
);
assert(
  !updateManifest.netdiskUrl || updateManifest.netdiskUrl.startsWith("https://"),
  "update manifest netdiskUrl must be empty or an https URL",
);

assert.strictEqual(contract.commands, undefined, "shared contract must not keep retired Photoshop menu commands");
assert(
  !manifest.entryPoints.some((entryPoint) => entryPoint.type === "command"),
  "manifest must not expose Photoshop menu command entry points",
);
const panelEntryPoint = manifest.entryPoints.find((entryPoint) => entryPoint.type === "panel" && entryPoint.id === contract.productNaming.jsPanelId);
assert(panelEntryPoint, "manifest must expose the OK-Record panel entry point");
assert.strictEqual(panelEntryPoint.label.default, contract.productNaming.displayName, "manifest panel label must use the branded product spelling");
assert.strictEqual(panelEntryPoint.minimumSize.width, 250, "manifest panel minimum width must allow the compact narrow layout");
assert.strictEqual(panelEntryPoint.minimumSize.height, 200, "manifest panel minimum height must allow the compact primary-action layout");
assert(panelEntryPoint.maximumSize.height >= 2000, "manifest panel maximum height must not clip the current control surface");
assert(panelEntryPoint.maximumSize.width >= 2000, "manifest panel maximum width must leave room for future controls");
assert.strictEqual(panelEntryPoint.preferredDockedSize.width, 450, "manifest panel docked width must use the 450px default layout standard");
assert.strictEqual(panelEntryPoint.preferredDockedSize.height, 750, "manifest panel docked height must use the 750px default layout standard");
assert.strictEqual(panelEntryPoint.preferredFloatingSize.width, 450, "manifest panel floating width must use the 450px default layout standard");
assert.strictEqual(panelEntryPoint.preferredFloatingSize.height, 750, "manifest panel floating height must use the 750px default layout standard");
assert(panelEntryPoint.preferredDockedSize.height >= 720, "manifest panel docked height should fit the current control surface");
assert(panelEntryPoint.preferredFloatingSize.height >= 750, "manifest panel floating height should fit the current control surface");
assert(
  !manifest.entryPoints.some((entryPoint) => entryPoint.type === "command" && entryPoint.id === "okRecordPingNative"),
  "manifest must not expose the retired Native test command",
);
assert(
  !manifest.entryPoints.some((entryPoint) => entryPoint.type === "command" && entryPoint.id === "okRecordCaptureProbe"),
  "manifest must not expose the retired Capture Probe command",
);

assert(!uxpMain.includes("COMMAND_IDS"), "UXP shell must not keep a command-id map after menu commands were retired");
assert(!uxpMain.includes("commands: {"), "UXP entrypoints must not register Photoshop menu commands");
assert(!uxpMain.includes("okRecordPingNative"), "UXP command map must not keep the retired Native test command");
assert(!uxpMain.includes("okRecordCaptureProbe"), "UXP command map must not keep the retired Capture Probe command");
assert(!uxpMain.includes("async function pingNative"), "UXP panel must not keep the retired Native test handler");
assert(!uxpMain.includes("async function captureProbe"), "UXP panel must not keep the retired Capture Probe handler");
assert(!uxpMain.includes("captureActiveDocumentComposite"), "UXP panel must not keep the retired Capture Probe capture path");
assert(!uxpMain.includes("createJpegPreview"), "UXP panel must not keep the retired Capture Probe preview encoder");
assert(!uxpMain.includes("ok-record-title"), "UXP panel must not render a redundant in-panel product title");
assert(!uxpMain.includes("测试 Native"), "UXP panel must not expose the retired Native test button");
assert(!uxpMain.includes("捕获探测"), "UXP panel must not expose the retired Capture Probe button");

assert(uxpMain.includes("pauseRecording"), "UXP panel must implement Pause Recording");
assert(uxpMain.includes("resumeRecording"), "UXP panel must implement Resume Recording");
assert(uxpMain.includes("暂停录制"), "UXP panel must still expose Pause Recording");
assert(uxpMain.includes("继续录制"), "UXP panel must still expose Resume Recording");
assert(uxpMain.includes("停止"), "UXP panel must expose Stop");
assert(uxpMain.includes("idleCaptureDelaySeconds"), "UXP panel settings must persist idle capture delay seconds");
assert(uxpMain.includes("idleCaptureMaxWaitSeconds"), "UXP panel settings must persist idle capture maximum wait seconds");
assert(!uxpMain.includes("createCheckboxField"), "UXP panel must not keep the retired checkbox helper");
assert(uxpMain.includes("togglePaintingTimer"), "UXP panel must use one painting timer button that toggles start and pause");
assert(uxpMain.includes("handlePaintingTimerControl"), "UXP painting timer status button must route ordinary clicks and Alt-clicks through one handler");
assert(uxpMain.includes("function endPaintingTimer"), "UXP painting timer must have an explicit ended-state transition");
assert(uxpMain.includes("PAINTING_TIMER_END_REASON"), "UXP painting timer must use a named end reason for durable ended state");
assert(paintingTimerModule.includes("ended: false"), "painting timer domain must define ended as explicit state truth");
assert(paintingTimerModule.includes("ended: Boolean(state.ended)"), "painting timer domain must restore ended state from persistence");
assert(paintingTimerModule.includes("ended: normalized.ended"), "painting timer domain must persist ended state");
assert(uxpMain.includes('event && event.type === "click" && event.altKey'), "UXP painting timer must reserve Alt-click for ending the timer");
assert(uxpMain.includes("endPaintingTimer();"), "UXP painting timer Alt-click must enter the ended state");
assert(uxpMain.includes("resetPaintingTimer({ announce: false })"), "UXP painting timer ordinary click after ended state must reset before restarting");
assert(!uxpMain.includes("stopPaintingTimerButtonNode"), "UXP panel must not keep a separate painting timer stop button node");
assert(!uxpMain.includes("resetPaintingTimerButtonNode"), "UXP panel must not keep a separate painting timer reset button node");
assert(uxpMain.includes("paintingTimerDisplayButtonNode"), "UXP painting timer must keep a status display button");
assert(!uxpMain.includes("paintingTimerStatusNode"), "UXP painting timer must not render a separate log/status block");
assert(!uxpMain.includes("function formatPaintingTimerStatus"), "UXP painting timer must not keep a formatter for a removed log/status block");
assert(!uxpMain.includes("ok-record-status ok-record-timer-status"), "UXP painting timer must not create a separate status-log DOM node");
assert(uxpMain.includes("formatPaintingTimerControlLabel"), "UXP painting timer display button must own the elapsed-time label");
assert(!uxpMain.includes("getPaintingTimerControlLabelParts"), "UXP painting timer display button must not keep the split status/time label path");
assert(uxpMain.includes("getPaintingTimerIndicatorClassName"), "UXP painting timer indicator color must derive from timer state");
assert(uxpMain.includes('return "ok-record-timer-indicator-active"'), "UXP painting timer indicator must use red active state while timing");
assert(uxpMain.includes("const elapsedSeconds = getPaintingTimerElapsedSeconds();"), "UXP painting timer indicator must derive paused and waiting visibility from elapsed time");
assert(uxpMain.includes("if (paintingTimerState.ended || (!paintingTimerState.enabled && elapsedSeconds <= 0))"), "UXP painting timer indicator must hide before timing starts and after ended state");
assert(uxpMain.includes("paintingTimerState.enabled && !isPaintingTimerIdleStopped()"), "UXP painting timer indicator must classify waiting-for-canvas-change separately");
assert(uxpMain.includes('return "ok-record-timer-indicator-waiting"'), "UXP painting timer indicator must use green for waiting-for-canvas-change state");
assert(uxpMain.includes('return "ok-record-timer-indicator-idle"'), "UXP painting timer indicator must use yellow for idle and manually paused states");
assert(!uxpMain.includes("return `${formatPaintingTimerState()} ${formatDurationClock(elapsedSeconds)}`"), "UXP painting timer status button must not show waiting/paused words after timing starts");
assert(uxpMain.includes('paintingTimerDisplayButtonNode.setAttribute("aria-pressed"'), "UXP painting timer status button must expose toggle state");
assert(!uxpMain.includes("ok-record-icon-button"), "UXP painting timer must not keep a separate icon button after moving reset/end into the status button");
assert(!uxpMain.includes("ok-record-icon-shape"), "UXP painting timer must not keep retired geometry icon helpers");
assert(!uxpMain.includes("ok-record-stop-icon"), "UXP painting timer must not keep a separate stop icon");
assert(!uxpMain.includes("ok-record-play-icon"), "UXP painting timer must not keep a separate play icon button");
assert(!uxpMain.includes("ok-record-pause-icon"), "UXP painting timer must not keep a separate pause icon button");
assert(!uxpMain.includes("ok-record-play-triangle"), "UXP painting timer must not keep retired play triangle geometry");
assert(!uxpMain.includes("ok-record-pause-bar"), "UXP painting timer must not keep retired pause bar geometry");
assert(!uxpMain.includes("ok-record-stop-square"), "UXP painting timer must not keep retired stop square geometry");
assert(!uxpMain.includes('"▶"'), "UXP painting timer play icon must not rely on font glyph pixels");
assert(!uxpMain.includes('"Ⅱ"'), "UXP painting timer pause icon must not rely on font glyph pixels");
assert(!uxpMain.includes('"■"'), "UXP painting timer stop icon must not rely on font glyph pixels");
assert(!uxpMain.includes("ok-record-reset-ready"), "UXP painting timer must not keep the retired reset-ready icon state");
assert(uxpMain.includes("已暂停 ${formatDurationClock(elapsedSeconds)}"), "UXP painting timer status must keep paused text inside one centered label");
assert(uxpMain.includes("绘画计时 ${formatDurationClock(elapsedSeconds)}"), "UXP painting timer initial state must show the zero clock in the main label without a plus sign");
assert(uxpMain.includes("绘画总时长 ${formatDurationClock(elapsedSeconds)}"), "UXP painting timer ended state must show the final total duration text without a plus sign");
assert(!uxpMain.includes("绘画计时+${formatDurationClock(elapsedSeconds)}"), "UXP painting timer initial state must not keep a plus sign");
assert(!uxpMain.includes("绘画总时长+${formatDurationClock(elapsedSeconds)}"), "UXP painting timer ended state must not keep a plus sign");
assert(uxpMain.includes("ok-record-timer-clock-ended"), "UXP painting timer ended state must have a distinct text color class");
assert(uxpMain.includes("PAINTING_TIMER_IDLE_STOP_REASON"), "UXP painting timer must keep a single idle-stop reason contract");
assert(uxpMain.includes("isPaintingTimerIdleStopped"), "UXP painting timer status must derive idle-stop display from timer state");
assert(uxpMain.includes("空闲状态 ${formatDurationClock(elapsedSeconds)}"), "UXP painting timer status must keep idle-state text inside one centered label");
assert(uxpMain.includes("if (elapsedSeconds <= 0)"), "UXP painting timer must keep a dedicated zero elapsed label branch");
assert(!uxpMain.includes("ok-record-timer-toggle-button"), "UXP painting timer must route start and pause through the center status button");
assert(uxpMain.includes("Alt+点击结束并显示绘画总时长"), "UXP painting timer status button must expose the Alt-click end affordance");
assert(!uxpMain.includes('startPaintingTimerButtonNode.textContent = paintingTimerState.enabled ? "停止计时" : "开始计时"'), "UXP painting timer must not switch between old start/stop text labels");
assert(!uxpMain.includes("startPaintingTimerButtonNode"), "UXP painting timer must not keep a separate start/pause button node");
assert(uxpMain.includes('require("./domain/painting-timer")'), "UXP painting timer state calculations must route through the painting-timer domain");
assert(uxpMain.includes("paintingTimerModel.armPaintingTimerState"), "UXP painting timer start must use the domain waiting state");
assert(uxpMain.includes("paintingTimerModel.recordPaintingActivityState"), "UXP painting timer activity must use the domain activity transition");
assert(uxpMain.includes("paintingTimerModel.finishActiveSegment"), "UXP painting timer segment finish must use the domain transition");
assert(uxpMain.includes("paintingTimerModel.settleRestoredState"), "UXP painting timer restore must use the domain settle transition");
assert(paintingTimerModule.includes(`PAINTING_TIMER_STATE_SCHEMA = "${contract.activityTimer.schema}"`), "painting timer domain schema must match the shared contract");
assert(paintingTimerModule.includes(`PAINTING_TIMER_STATE_FILENAME = "${contract.activityTimer.stateFilename}"`), "painting timer domain filename must match the shared contract");
assert(uxpMain.includes("PAINTING_TIMER_STATE_FILENAME = paintingTimerModel.PAINTING_TIMER_STATE_FILENAME"), "UXP shell must route timer persistence filename through the painting-timer domain");
assert(uxpMain.includes("paintingTimerModel.parsePersistedPaintingTimerState"), "UXP shell must parse persisted timer state through the painting-timer domain");
assert(uxpMain.includes("paintingTimerModel.createPersistedPaintingTimerState"), "UXP shell must create timer persistence snapshots through the painting-timer domain");
assert(!uxpMain.includes(`PANEL_SETTINGS_SCHEMA = "${contract.panelSettings.schema}"`), "UXP shell must not duplicate the panel settings schema literal");
assert(uxpMain.includes("PANEL_SETTINGS_FILENAME = settingsModel.PANEL_SETTINGS_FILENAME"), "UXP panel settings filename must route through the settings model domain");
assert(uxpMain.includes(contract.panelSettings.frameOutputDirField), "UXP panel settings must persist the manual OK-Record project output directory");
assert(settingsModelModule.includes(contract.panelSettings.frameOutputDocumentKeyField), "settings model must persist the current-document binding for the manual project output directory");
assert(!settingsModelModule.includes("frameOutputDocumentPath"), "settings model must not persist display paths for retired document-bound output dirs");
assert(!settingsModelModule.includes("stepOutputDir"), "settings model must not persist an independent step-image output directory");
assert(!pathPolicyModule.includes("manualProjectOutputDir"), "path-policy must not own document-scoped manual project directory precedence");
assert(uxpMain.includes(contract.panelSettings.exportSourceDirField), "UXP panel settings must persist the export source directory");
assert(uxpMain.includes("recordPaintingActivity"), "UXP must feed document-change events into the standalone painting activity timer");
assert(uxpMain.includes("detectPaintingTimerDocumentChange"), "UXP painting timer must detect active document history changes");
assert(uxpMain.includes("activeHistoryState"), "UXP painting timer must use Photoshop document history state as the canvas-change signal");
assert(uxpMain.includes("historyStateChanged"), "UXP painting timer must label history-state polling changes");
assert(uxpMain.includes("recorderDocumentSignature"), "UXP recording dirty checks must track active document history state");
assert(uxpMain.includes("detectRecorderDocumentChange"), "UXP recording dirty checks must use history-state changes before skipping scheduled captures");
assert(uxpMain.includes('detectRecorderDocumentChange("historyStateChanged")'), "UXP scheduled capture skip checks must poll active document history state");
assert(uxpMain.includes("paintingTimerState"), "UXP must keep painting activity timer state separate from recorder session state");
assert(uxpMain.includes("restorePaintingTimerState"), "UXP must restore persisted painting activity timer state on panel load");
assert(uxpMain.includes("queuePersistPaintingTimerState"), "UXP must persist painting activity timer state after timer changes");
assert(uxpMain.includes("restorePanelSettings"), "UXP must restore persisted panel settings on panel load");
assert(uxpMain.includes("queuePersistPanelSettings"), "UXP must persist panel settings after control changes");
assert(uxpMain.includes("updatePanelSettingsInputs"), "UXP must push restored panel settings back into visible controls");
const startPaintingTimerBody = uxpMain.slice(
  uxpMain.indexOf("async function startPaintingTimer"),
  uxpMain.indexOf("function stopPaintingTimer"),
);
assert(!startPaintingTimerBody.includes("accumulatedSeconds: 0"), "Start Timer must not clear accumulated activity time; Reset owns reinitialization");
assert(!startPaintingTimerBody.includes("eventCount: 0"), "Start Timer must not clear activity event count; Reset owns reinitialization");
assert(uxpMain.includes("chooseExportSequenceDir"), "UXP export settings must expose a sequence-directory picker");
assert(uxpMain.includes("getFolder"), "UXP panel must use the UXP folder picker for manual OK-Record project directories");
assert(uxpMain.includes("getRecorderOutputDirNativePath"), "UXP capture, restore, and export must share the project output directory");
assert(uxpMain.includes("exportHoldSeconds"), "UXP panel settings must persist per-frame hold duration");
assert(!uxpMain.includes('item.textContent = preset.storageFormat === "png"'), "UXP compression dropdown must not expose JPEG/PNG implementation text");
assert(!uxpMain.includes("preset.label} JPEG ${preset.jpegQuality}"), "UXP compression dropdown must not expose JPEG quality numbers");
assert(!uxpMain.includes("preset.label} ${preset.maxWidth}px"), "UXP resolution dropdown must not expose pixel widths");
assert(settingsModelModule.includes("FRAME_QUALITY_PRESETS"), "settings model must own frame quality storage metadata");
assert(uxpMain.includes("settingsModel.FRAME_QUALITY_PRESETS.map"), "UXP panel must derive frame quality storage metadata from the settings model domain");
assert(uxpMain.includes("FRAME_QUALITY_PRESET_LABELS"), "UXP panel may own display labels for frame quality presets");
assert(!uxpMain.includes('storageFormat: "jpeg", frameExtension: ".jpg", jpegQuality: 60'), "UXP shell must not duplicate JPEG 60 quality metadata");
assert(!uxpMain.includes('storageFormat: "jpeg", frameExtension: ".jpg", jpegQuality: 80'), "UXP shell must not duplicate JPEG 80 quality metadata");
assert(!uxpMain.includes('storageFormat: "jpeg", frameExtension: ".jpg", jpegQuality: 92'), "UXP shell must not duplicate JPEG 92 quality metadata");
assert(!uxpMain.includes('storageFormat: "png", frameExtension: ".png", jpegQuality: 0'), "UXP shell must not duplicate PNG lossless quality metadata");
assert(uxpMain.includes("frameQualityPreset"), "UXP panel settings and capture metadata must carry the frame quality preset");
assert(uxpMain.includes("createFrameStorageMetadata"), "UXP capture must translate the quality preset into native storage metadata");
assert(uxpMain.includes('require("./services/native-bridge")'), "UXP native calls must route through the native bridge service");
assert(!uxpMain.includes("ok-record-addon.uxpaddon"), "UXP main must not load the native addon directly");
assert(uxpMain.includes("nativeBridge.writeStepFrame"), "UXP manual sampling must call the native bridge step writer");
assert(uxpMain.includes("nativeBridge.writeFrame"), "UXP automatic recording must call the native bridge frame writer");
assert(uxpMain.includes("targetWidth: 0"), "UXP manual sampling must request original-size Photoshop pixels");
const captureTargetWidthFunction = uxpMain.slice(
  uxpMain.indexOf("function getFrameCaptureTargetWidth"),
  uxpMain.indexOf("async function getRecorderOutputDirNativePath"),
);
assert(
  captureTargetWidthFunction.indexOf("if (targetWidth <= 0)") >= 0 &&
    captureTargetWidthFunction.indexOf("return 0;") < captureTargetWidthFunction.indexOf("return clampInteger"),
  "UXP manual sampling targetWidth 0 must stay original-size instead of being clamped to the minimum preset width",
);
const chooseExportSequenceDirBody = uxpMain.slice(
  uxpMain.indexOf("async function chooseExportSequenceDir"),
  uxpMain.indexOf("async function runScheduledCapture"),
);
const openExportFolderBody = uxpMain.slice(
  uxpMain.indexOf("async function openExportFolder"),
  uxpMain.indexOf("async function getLocalDocumentationPath"),
);
const openFrameOutputDirBody = uxpMain.slice(
  uxpMain.indexOf("async function openFrameOutputDir"),
  uxpMain.indexOf("async function openStepOutputDir"),
);
const openStepOutputDirBody = uxpMain.slice(
  uxpMain.indexOf("async function openStepOutputDir"),
  uxpMain.indexOf("async function chooseExportSequenceDir"),
);
assert(uxpMain.includes("stepFrameCount"), "UXP manual sampling must track the step image count");
assert(uxpMain.includes("nativeBridge.exportSequence"), "UXP export must support a selected image-sequence directory through the native bridge");
assert(uxpMain.includes("nativeBridge.scanSequence"), "UXP must scan selected image-sequence directories through the native bridge before export");
assert(uxpMain.includes('require("./domain/path-policy")'), "UXP path rules must route through the path-policy domain");
assert(uxpMain.includes('require("./domain/recording-context")'), "UXP recording document identity rules must route through the recording-context domain");
assert(uxpMain.includes("function getRecordingsRootDirNativePath"), "UXP must expose one helper for the actual recordings root path");
assert(uxpMain.includes("requireCurrentRecordingContext().recordingsRootDir"), "UXP recordings root helper must derive from the current recording context");
assert(openFrameOutputDirBody.includes("await getRecordingsRootDirNativePath()"), "UXP open sequence-frame directory button must open the actual recordings root");
assert(!uxpMain.includes("async function chooseStepOutputDir"), "UXP must not expose an independent step-image directory picker");
assert(openStepOutputDirBody.includes("await getStepOutputDirNativePath()"), "UXP open step directory button must open the resolved Steps child directory");
for (const openFolderBody of [openExportFolderBody, openFrameOutputDirBody, openStepOutputDirBody]) {
  const successBody = openFolderBody.slice(openFolderBody.indexOf("const result = await shell.openPath"), openFolderBody.indexOf("} catch"));
  assert(!successBody.includes("setStatus("), "folder open success paths must not update panel status after shell.openPath returns");
  assert(!successBody.includes("updateControlState()"), "folder open success paths must not rerender controls after shell.openPath returns");
}
const recorderOutputDirBody = uxpMain.slice(
  uxpMain.indexOf("async function getRecorderOutputDirNativePath"),
  uxpMain.indexOf("async function getStepOutputDirNativePath"),
);
assert(
  recorderOutputDirBody.includes("requireCurrentRecordingContext().outputDir") &&
    !recorderOutputDirBody.includes("pluginDataDir") &&
    !recorderOutputDirBody.includes("getPluginDataNativePath"),
  "UXP recorder output root must require a current recording context and must not fall back to plugin data",
);
assert(uxpMain.includes("activeDocument.path"), "UXP recorder output root must read the saved Photoshop document path when no manual path is set");
assert(uxpMain.includes("activeDocument.cloudDocument"), "UXP recorder output root must reject cloud documents through the recording context");
assert(uxpMain.includes("function assertSavedDocumentForRecording"), "UXP automatic recording must enforce a saved document precondition before starting");
assert(recordingContextModule.includes("请先保存 Photoshop 文档为本地 PSD/PSB 文件"), "recording context failure must tell users to save the PSD/PSB first");
assert(uxpMain.includes("activeRecordingContext"), "UXP recording must lock the document context while the recording loop is active");
assert(uxpMain.includes("assertActiveRecordingContextStillCurrent"), "UXP scheduled captures must verify the active Photoshop document still matches the locked recording context");
assert(uxpMain.includes("isSessionForRecordingContext"), "UXP active sessions must be bound to the current recording context");
assert(!uxpMain.includes("默认插件数据目录"), "UXP user-facing recording status must not advertise plugin data as an unsaved-document recording fallback");
assert(!uxpMain.includes("pathPolicy.buildRecordSessionId"), "UXP must not allocate Record timestamp directories after the single-timeline change");
assert(!uxpMain.includes("pathPolicy.buildUniqueRecordSessionId"), "UXP must not keep same-second Record directory collision logic");
assert(!uxpMain.includes("forceNewSessionOnNextCapture"), "UXP start recording must append to the document timeline instead of forcing a new Record directory");
assert(uxpMain.includes('sessionId: RECORDING_TIMELINE_ID'), "UXP must use one stable recording timeline id");
assert(!uxpMain.includes("session_${formatTimestampForId(now)}_${now.getTime()}"), "UXP must not create user-visible session_ timestamp directories");
assert(uxpMain.includes("resolveExportSequenceSelection"), "UXP export source picker must normalize recording-root/session selections before export");
assert(uxpMain.includes('candidateFrameDirs.push(pathPolicy.joinNativePath(nativePath, "frames"))'), "UXP export source picker must resolve recording roots to their timeline frames directory");
assert(uxpMain.includes("scanRecordingSessionsForOutputRoot"), "UXP export source picker must use native recording recovery when a recording root is selected");
assert(uxpMain.includes('exportSourceDir: ""'), "UXP export source picker must clear stale export sources after an invalid selected folder");
assert(
  /if \(nativePath\) \{\s*queuePersistPanelSettings\(\);\s*\}/.test(chooseExportSequenceDirBody),
  "UXP export source picker must persist stale export-source clearing after an invalid selected folder",
);
assert(!uxpMain.includes("handleMaxWidthChange"), "UXP panel must not keep a manual max-width change handler");
assert(!uxpMain.includes("CUSTOM_CAPTURE_RESOLUTION_PRESET_ID"), "UXP resolution presets must not expose a custom width option");
assert(uxpMain.includes("CAPTURE_RESOLUTION_PRESET_LABELS"), "UXP panel must own resolution preset display labels");
assert(uxpMain.includes("settingsModel.CAPTURE_RESOLUTION_PRESETS.map"), "UXP panel must derive resolution preset widths from the settings model domain");
assert(uxpMain.includes("getCaptureResolutionPresetIdForMaxWidth"), "UXP presets must normalize the persisted max-width value to one of the named presets");
assert(uxpMain.includes('require("./domain/settings-model")'), "UXP panel settings must route through the settings model domain");
assert(uxpMain.includes("captureTargetWidth"), "UXP frame capture must pass a target width into the capture request");
assert(uxpMain.includes("targetSize"), "UXP frame capture must use Photoshop target-size sampling");
assert(uxpMain.includes("copyPixelDataToArrayBuffer(capture.pixelData)"), "UXP frame capture must copy pixel data after the Photoshop modal read");
assert(!uxpMain.includes('console.log("[OK-Record] capture diagnostics:"'), "UXP frame capture must not log capture diagnostics unconditionally");
assert(uxpMain.includes("DEFAULT_INTERVAL_MINUTES = settingsModel.DEFAULT_INTERVAL_MINUTES"), "UXP default interval must route through the settings model domain");
assert(uxpMain.includes("SECONDS_PER_MINUTE = 60"), "UXP interval UI must split minutes and seconds from the shared interval");
assert(uxpMain.includes("MIN_INTERVAL_SECONDS = MIN_INTERVAL_MINUTES * SECONDS_PER_MINUTE"), "UXP interval UI must derive its minimum seconds from the settings model interval");
assert(uxpMain.includes("Math.max(MIN_INTERVAL_SECONDS"), "UXP interval input must clamp manually entered zero back to the minimum");
assert(uxpMain.includes("DEFAULT_CAPTURE_ONLY_WHEN_CHANGED = settingsModel.DEFAULT_CAPTURE_ONLY_WHEN_CHANGED"), "UXP capture policy default must route through the settings model domain");
assert(recorderSchedulerModule.includes("DOCUMENT_CHANGE_EVENTS"), "scheduler owner must declare explicit Photoshop document change events");
assert(uxpMain.includes("DOCUMENT_CHANGE_EVENTS = recorderScheduler.DOCUMENT_CHANGE_EVENTS"), "UXP shell must consume Photoshop document change events from the scheduler owner");
assert(uxpMain.includes('DOCUMENT_CLOSE_EVENT = "close"'), "UXP must name the Photoshop document close event");
assert(uxpMain.includes("queueDocumentCloseRecordingCheck"), "UXP document close handling must re-check the active document context before stopping recording");
assert(uxpMain.includes("isActiveRecordingContextStillCurrent"), "UXP document close handling must not stop recording when an unrelated document closes");
assert(uxpMain.includes("validateReference"), "UXP document close handling must validate the locked Photoshop document reference before stopping recording");
assert(uxpMain.includes("stopRecordingAfterDocumentClose"), "UXP document close handling must stop the recording runtime immediately");
for (const eventName of contract.scheduler.documentChangeEvents) {
  assert(recorderSchedulerModule.includes(`"${eventName}"`), `scheduler document change events must include ${eventName}`);
}
assert(uxpMain.includes("action.addNotificationListener"), "UXP must register explicit Photoshop document change events");
assert(uxpMain.includes("markDocumentDirty"), "UXP must mark recording sessions dirty from document events");
assert(uxpMain.includes("shouldSkipScheduledCapture"), "UXP must skip scheduled captures when nothing changed");
assert(uxpMain.includes('require("./recorder-scheduler")'), "UXP must route scheduler state decisions through the focused scheduler helper");
assert(uxpMain.includes('require("./panel-styles")'), "UXP panel styles must live in the dedicated style module");
assert(uxpMain.includes('require("./panel-view")'), "UXP concrete panel DOM ownership must live in the dedicated panel view module");
assert(uxpMain.includes('require("./panel-dom")'), "UXP panel DOM helpers must live in the dedicated helper module");
assert(recorderSchedulerModule.includes("shouldSkipScheduledCaptureState"), "scheduler helper must expose change-only skip state logic");
assert(recorderSchedulerModule.includes("didDocumentChangeDuringCapture"), "scheduler helper must expose dirty-generation capture completion logic");
assert(uxpMain.includes("documentChangeGeneration"), "UXP must preserve dirty events that arrive during capture/write");
assert(uxpMain.includes("startRecorderHistoryPoll"), "UXP recording must poll active history while recording, before the next skip decision");
assert(uxpMain.includes("DOCUMENT_HISTORY_POLL_INTERVAL_MS = 1000"), "UXP recording history polling must stay low frequency");
assert(uxpMain.includes("DEFAULT_IDLE_CAPTURE_DELAY_SECONDS = settingsModel.DEFAULT_IDLE_CAPTURE_DELAY_SECONDS"), "UXP idle delay default must route through the settings model domain");
assert(uxpMain.includes("DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS = settingsModel.DEFAULT_IDLE_CAPTURE_MAX_WAIT_SECONDS"), "UXP idle wait default must route through the settings model domain");
assert(uxpMain.includes("MAX_IDLE_CAPTURE_DELAY_SECONDS = settingsModel.MAX_IDLE_CAPTURE_DELAY_SECONDS"), "UXP idle delay maximum must route through the settings model domain");
assert(uxpMain.includes("MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS = settingsModel.MAX_IDLE_CAPTURE_MAX_WAIT_SECONDS"), "UXP idle wait maximum must route through the settings model domain");
assert(uxpMain.includes("core.addNotificationListener(\"UI\", [\"userIdle\"]"), "UXP recording must listen for Photoshop userIdle events");
assert(uxpMain.includes("core.setUserIdleTime(delaySeconds)"), "UXP recording must configure Photoshop user idle timing from the panel setting");
assert(uxpMain.includes("shouldDeferScheduledCaptureForIdle"), "UXP scheduled captures must prefer idle-aware capture");
assert(recorderSchedulerModule.includes("shouldDeferCaptureForIdle"), "scheduler helper must expose idle-defer state logic");
assert(uxpMain.includes("interactive: true"), "UXP scheduled capture modal calls should use interactive mode to reduce blocking UI while sampling");
assert(uxpMain.includes('require("./domain/export-profile")'), "UXP export settings must route through the export-profile domain");
assert(nativeModule.includes("uint32_t outputFps = 30"), "native export request default fps must match the shared export contract");
assert(nativeModule.includes("request.outputFps == 0 || request.outputFps > 120"), "native export must retain protocol validation for output fps");
assert(nativeModule.includes("MIN_EXPORT_MAX_WIDTH = 16"), "native export max-width minimum must match the shared export contract");
assert(nativeModule.includes("MAX_EXPORT_MAX_WIDTH = 16384"), "native export max-width maximum must match the shared export contract");
assert(nativeExportRunnerHeader.includes("struct NativeFfmpegExportRequest"), "native export must model FFmpeg runner inputs once");
assert(nativeExportRunnerHeader.includes("struct NativeFfmpegExportResult"), "native export must model FFmpeg runner outputs once");
assert(nativeExportFrameSetHeader.includes("struct TimelineExportFrameSetRequest"), "native export frame-set owner must model timeline discovery inputs once");
assert(nativeExportFrameSetHeader.includes("struct SequenceExportFrameSetRequest"), "native export frame-set owner must model directory discovery inputs once");
assert(nativeExportFrameSetModule.includes("BuildTimelineExportFrameSet"), "native export frame-set owner must build timeline frame sets");
assert(nativeExportFrameSetModule.includes("BuildSequenceExportFrameSet"), "native export frame-set owner must build directory frame sets");
assert(nativeExportRunnerModule.includes("RunNativeFfmpegExport"), "native export must route timeline and directory exports through one FFmpeg runner");
assert(nativeModule.includes("CreateNativeExportResultValue"), "native export must map FFmpeg runner results through one result builder");
assert(nativeModule.includes("const ExportFrameSet frameSet = BuildTimelineExportFrameSet(frameSetRequest);"), "native timeline export must route through the frame-set discovery owner");
assert(nativeModule.includes("const ExportFrameSet frameSet = BuildSequenceExportFrameSet(frameSetRequest);"), "native directory export must route through the frame-set discovery owner");
assert.strictEqual(
  (nativeExportRunnerModule.match(/RunProcessToLog\(ffmpegPath, command, logPath\)/g) || []).length,
  1,
  "native export must run FFmpeg from one shared runner",
);
assert.strictEqual(
  (nativeExportRunnerModule.match(/ParseFfmpegProgressFile\(/g) || []).length,
  1,
  "native export must parse FFmpeg progress from one shared runner",
);
assert(uxpMain.includes("readExportProfileFromPanel"), "UXP must read export profile settings from the panel");
assert(uxpMain.includes("exportProfileModel.createExportProfile"), "UXP must normalize export settings through the export-profile domain");
assert(uxpMain.includes("targetDurationSeconds: exportProfile.durationSeconds"), "UXP must pass target video duration to native export");
assert(uxpMain.includes("calculateExportTiming"), "UXP must derive export timing preview values from frame count, target duration, and fixed output fps");
assert(uxpMain.includes("均匀抽帧"), "UXP status must preview representative-frame sampling when target duration is short");
assert(uxpMain.includes("handleHoldSecondsChange"), "UXP must let per-frame hold duration drive target duration");
assert(statusMessagesModule.includes("buildExportSuccessMessages"), "UXP status message module must expose export-success mapping");
assert(statusMessagesModule.includes("samplingApplied"), "UXP export success messaging must expose native sampling details");
assert(nativeModule.includes("targetDurationSeconds must be > 0 and <= 3600"), "native export protocol must validate target duration");
assert(nativeExportRunnerModule.includes("SelectRepresentativeFrames"), "native export must own representative-frame sampling");
assert(nativeExportRunnerModule.includes("samplingApplied"), "native export result must report whether sampling occurred");
assert(nativeExportRunnerModule.includes(`"${contract.productNaming.exportFilePrefix}"`), "native exports must use the branded OK-Record file prefix");
assert(!nativeExportRunnerModule.includes(`stage_${"timelapse"}`), "native exports must not keep the retired Stage-era file prefix");
assert(uxpMain.includes("lastExportProgress"), "UXP recorder state must retain the last export progress summary");
assert(uxpMain.includes("lastExportStatus"), "UXP recorder state must retain the last export UI status");
assert(uxpMain.includes("getExportButtonViewState"), "UXP export button state must be derived in one view-state helper");
assert(uxpMain.includes("EXPORT_STATUS_PAINT_DELAY_MS"), "UXP export must reserve a paint window before native export starts");
assert(uxpMain.includes("waitForPanelRender({ minDelayMs: EXPORT_STATUS_PAINT_DELAY_MS })"), "UXP export must let the in-progress status render before calling native FFmpeg");
assert(uxpMain.includes("导出视频（正在导出）"), "UXP export button must show an in-progress label");
assert(uxpMain.includes("导出视频（成功）"), "UXP export button must show a success label");
assert(uxpMain.includes("导出视频（失败）"), "UXP export button must show a failure label");
assert(uxpMain.includes("menuItems"), "UXP panel must register a panel flyout menu");
assert(uxpMain.includes("文档_Documentation"), "UXP panel flyout menu must expose local documentation");
assert(uxpMain.includes("invokeMenu"), "UXP panel flyout menu must handle documentation menu clicks");
assert(uxpMain.includes("shell.openPath"), "UXP must open the export folder through the UXP shell API");
assert(localDocumentation.includes("<title>OK-Record 使用说明</title>"), "local documentation must expose the requested user-facing title");
assert(
  !fs.existsSync(path.join(repoRoot, "uxp", "docs", "Documentation_使用说明.html")),
  "UXP source tree must not keep a duplicate packaged documentation HTML source",
);
assert(!fs.existsSync(path.join(repoRoot, "uxp", "docs", "images")), "UXP source tree must not keep duplicate documentation images");
assert(localDocumentation.includes('data-language-choice="zh"'), "local documentation must expose an in-page Chinese language switch");
assert(localDocumentation.includes('data-language-choice="en"'), "local documentation must expose an in-page English language switch");
assert(localDocumentation.includes("OK-Record User Guide"), "local documentation must include English user-guide copy");
assert(localDocumentation.includes("ok-record-doc-language"), "local documentation must remember the selected documentation language locally");
assert(localDocumentation.includes("4. 绘画计时"), "local documentation must follow the panel order with painting timer first");
assert(localDocumentation.includes("4. Painting Timer"), "local documentation must translate the painting timer section");
assert(localDocumentation.includes("5. OK-Record 设置"), "local documentation must group OK-Record controls after the painting timer");
assert(localDocumentation.includes("6. 导出设置"), "local documentation must group export controls after recording controls");
{
  const timerIndex = localDocumentation.indexOf("4. 绘画计时");
  const recordingSettingsIndex = localDocumentation.indexOf("5. OK-Record 设置");
  const exportSettingsIndex = localDocumentation.indexOf("6. 导出设置");
  assert(timerIndex >= 0 && recordingSettingsIndex > timerIndex && exportSettingsIndex > recordingSettingsIndex, "local documentation sections must follow the panel's functional order");
}
assert(localDocumentation.includes("screenshot-placeholder"), "local documentation must reserve screenshot slots");
assert(localDocumentation.includes("截图待放"), "local documentation must keep readable missing-screenshot placeholders");
assert(localDocumentation.includes("images/02-install-ccx.jpg"), "local documentation must expose the Creative Cloud install screenshot");
assert(localDocumentation.includes("images/02-install-ccx_2.jpg"), "local documentation must expose the Creative Cloud installed-state screenshot");
assert(localDocumentation.includes("images/03-open-photoshop-panel.png.jpg"), "local documentation must expose the Photoshop panel screenshot");
assert(localDocumentation.includes('href="https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3"'), "local documentation must link to the GitHub Release download page");
assert(localDocumentation.includes("Download page:"), "local documentation must translate the GitHub Release download link label");
assert.strictEqual(manifest.host.minVersion, "24.4.0", "manifest minimum Photoshop version must match the stable Imaging API requirement");
assert(localDocumentation.includes("★ 仅支持 Photoshop 2023 24.4.0 或更高版本。"), "local documentation must state the Photoshop version requirement in the download section");
assert(localDocumentation.includes("★ Only Photoshop 2023 24.4.0 or newer is supported."), "local documentation must translate the Photoshop version requirement");
assert(localDocumentation.includes("Cannot read properties of undefined (reading 'getPixels')"), "local documentation must explain the common Imaging API support failure");
assert(readText("README.md").includes("★ 仅支持 Photoshop 2023 24.4.0 或更高版本。"), "Chinese README must state the Photoshop version requirement in the download section");
assert(readText("README.en.md").includes("★ Only Photoshop 2023 24.4.0 or newer is supported."), "English README must state the Photoshop version requirement in the download section");
assert(readText("README.md").includes("作者目前没有 macOS 开发环境，无法部署和测试 macOS 版本。macOS 用户需要下载源代码自行适配、构建和测试。"), "Chinese README must clearly explain the macOS support boundary");
assert(readText("README.en.md").includes("The author currently does not have a macOS development environment and cannot deploy or test the macOS version."), "English README must clearly explain the macOS support boundary");
assert(!localDocumentation.includes("images/01-release-download.png"), "local documentation must not keep the retired Release screenshot placeholder");
assert(!localDocumentation.includes("截图预留"), "local documentation must not keep retired plain placeholder blocks");
assert(localDocumentation.includes("开始录制前，先把 Photoshop 文档保存为本地 PSD/PSB 文件"), "local documentation must describe the local PSD/PSB recording precondition");
assert(localDocumentation.includes("保存过的 PSD/PSB 即使当前画布还有未保存修改，也可以继续录制"), "local documentation must clarify that saved-but-dirty documents may keep recording");
assert(localDocumentation.includes("如果文档从未保存到本地目录，点击开始录制会提示先保存，不会写入序列帧。"), "local documentation must describe the never-saved document block");
assert(localDocumentation.includes("手动指定只对当前 PSD/PSB 生效"), "local documentation must describe document-scoped manual project folders");
assert(localDocumentation.includes("需要让增量 PSD/PSB 续写旧项目时"), "local documentation must describe explicit manual joining for incremental PSD recording");
assert(localDocumentation.includes("录制失败、手动采样失败、导出完成或导出失败时，插件会弹出提醒窗口。"), "local documentation must describe blocking dialogs for important results");
assert(localDocumentation.includes("暂停录制后可以点击"), "local documentation must describe choosing the OK-Record save folder while paused");
assert(localDocumentation.includes("正在录制或正在写入时不能切换保存目录。"), "local documentation must describe when the save folder cannot be changed");
assert(localDocumentation.includes("导出完成或导出失败都会弹出提醒窗口。"), "local documentation must describe export completion and failure dialogs");
assert(!localDocumentation.includes("如果 Photoshop 文档也还没有保存，录制文件会放到 OK-Record 的默认路径。"), "local documentation must not describe plugin-data recording fallback for unsaved documents");
assert(localDocumentation.includes("A saved PSD/PSB can keep recording even when the current canvas has unsaved edits."), "local documentation must translate the saved-but-dirty recording rule");
assert(localDocumentation.includes("If the document has never been saved to a local folder"), "local documentation must translate the never-saved document block");
assert(localDocumentation.includes("a manual choice applies only to the current PSD/PSB"), "local documentation must translate document-scoped manual project folders");
assert(localDocumentation.includes("To continue an incremental PSD/PSB in an older project"), "local documentation must translate explicit manual joining for incremental PSD recording");
assert(localDocumentation.includes("the plugin shows an alert dialog"), "local documentation must translate blocking dialogs for important results");
assert(localDocumentation.includes("After pausing recording, you can click"), "local documentation must translate choosing the OK-Record save folder while paused");
assert(localDocumentation.includes("You cannot switch the save folder while recording or writing."), "local documentation must translate save-folder lockout while recording or writing");
assert(localDocumentation.includes("Export completion and export failure both show an alert dialog."), "local documentation must translate export completion and failure dialogs");
assert(readText("README.md").includes("暂停录制时可以重新指定 OK-Record 保存目录"), "Chinese README must describe save-folder changes while paused");
assert(readText("README.en.md").includes("You can choose a new OK-Record save folder while recording is paused."), "English README must describe save-folder changes while paused");
assert(readText("README.md").includes("录制失败、手动采样失败、导出完成和导出失败都会弹出提醒窗口"), "Chinese README must describe important-result dialogs");
assert(readText("README.en.md").includes("Recording failures, manual capture failures, export completion, and export failures show an alert dialog."), "English README must describe important-result dialogs");
assert(!releaseNotes.includes("Ctrl+Shift+Alt 点击录制按钮仍会尝试触发同一清空流程"), "release notes must not describe the retired Ctrl+Shift+Alt clear-frame path");
assert(!releaseNotes.includes("The clear sequence-frame-directory shortcut is now Ctrl+Shift+Alt click"), "release notes must not describe the retired Ctrl+Shift+Alt clear-frame shortcut");
assert(localDocumentation.includes("面板最上方的绘画计时用于单独统计实际绘画时间。"), "local documentation must explain the painting timer");
assert(localDocumentation.includes("timer-state-table"), "local documentation must present painting timer states as a table");
assert(localDocumentation.includes("OK-Record 设置主要用于控制绘画计时、自动序列帧录制和手动采样。"), "local documentation must keep OK-Record settings text-first");
assert(localDocumentation.includes("设置好参数后，可以把面板缩到最小，刚好显示绘画计时、开始录制和手动采样三个主要功能。"), "local documentation must explain the compact panel workflow after setup");
assert(localDocumentation.includes("images/03_Mini面板.jpg"), "local documentation must show the compact panel main-controls screenshot");
assert(localDocumentation.includes("After setting the parameters, you can shrink the panel to its minimum size"), "local documentation must translate the compact panel workflow");
assert(localDocumentation.includes("recording-state-table"), "local documentation must present recording and manual capture states as a table");
assert(localDocumentation.includes("导出设置用于把序列帧合成为 MP4 视频。"), "local documentation must keep export settings text-first");
for (const recordingImageName of [
  "05-录制-初始未开启.jpg",
  "05-录制-开启录制.jpg",
  "05-录制-暂停录制.jpg",
  "06-手动采样-未采样.jpg",
  "06-手动采样-已采样数量.jpg",
]) {
  assert(localDocumentation.includes(`images/${recordingImageName}`), `local documentation must include recording/manual capture state image ${recordingImageName}`);
}
for (const recordingStateCopy of [
  "录制未开启",
  "正在录制",
  "暂停录制",
  "手动采样",
  "采样计数",
]) {
  assert(localDocumentation.includes(recordingStateCopy), `local documentation must describe recording/manual capture state ${recordingStateCopy}`);
}
for (const translatedRecordingState of [
  "Recording Off",
  "Recording",
  "Paused",
  "Manual Capture",
  "Capture Count",
]) {
  assert(localDocumentation.includes(translatedRecordingState), `local documentation must translate recording/manual capture state ${translatedRecordingState}`);
}
for (const controlImageName of [
  "08_序列帧保存目录.jpg",
  "08_选择要导出的目录.jpg",
]) {
  assert(localDocumentation.includes(`images/${controlImageName}`), `local documentation must include control screenshot ${controlImageName}`);
}
assert(localDocumentation.includes("OK-Record save folder location."), "local documentation must translate the project folder screenshot caption");
assert(localDocumentation.includes("Choose the image sequence folder to export."), "local documentation must translate the export-folder screenshot caption");
assert(!localDocumentation.includes("每帧停留决定每张序列帧在视频里停留多久；视频时长可以反推每帧停留时间。"), "local documentation must not keep the dense export settings paragraph");
for (const exportOptionCopy of [
  "每帧停留</span>：根据当前源帧数量反推视频时长。大量源帧导出为短视频时，OK-Record 会自动均匀抽取代表帧。",
  "视频时长</span>：优先控制最终视频长度。源帧太多时会保留首尾帧并均匀抽取中间帧，不会强制导出超长视频。",
  "质量预设</span>：控制视频压缩质量。质量越高，画面越清晰，文件也会更大。",
  "分辨率</span>：控制导出视频的最大尺寸。分辨率越高，细节越完整，导出文件也会更大。",
]) {
  assert(localDocumentation.includes(exportOptionCopy), `local documentation must split export option copy into bullets: ${exportOptionCopy}`);
}
for (const translatedExportOption of [
  "Hold per Frame",
  "Video Duration",
  "Quality Preset",
  "Resolution",
]) {
  assert(localDocumentation.includes(translatedExportOption), `local documentation must translate export option label ${translatedExportOption}`);
}
for (const timerImageName of [
  "04-绘画计时-初始未开启.jpg",
  "04-绘画计时-准备计时.jpg",
  "04-绘画计时-计时中.jpg",
  "04-绘画计时-空闲等待.jpg",
  "04-绘画计时-结束计时.jpg",
]) {
  assert(localDocumentation.includes(`images/${timerImageName}`), `local documentation must include painting timer state image ${timerImageName}`);
}
assert(!localDocumentation.includes("images/04-panel-overview.png"), "local documentation must not keep the retired painting timer overview placeholder");
assert(!localDocumentation.includes("images/05-recording-state.png"), "local documentation must not keep the retired recording placeholder");
assert(!localDocumentation.includes("images/06-manual-capture-button.png"), "local documentation must not keep the retired manual capture placeholder");
assert(!localDocumentation.includes("images/07-step-frames-folder.png"), "local documentation must not keep the retired manual capture folder placeholder");
assert(!localDocumentation.includes("images/08-export-video-button.png"), "local documentation must keep export settings text-only instead of the export button placeholder");
assert(!localDocumentation.includes("images/09-export-success.png"), "local documentation must keep export settings text-only instead of the export success placeholder");
assert(!localDocumentation.includes("images/10-exported-mp4.png"), "local documentation must keep export settings text-only instead of the exported MP4 placeholder");
assert(localDocumentation.includes("images/07-文件夹路径.jpg"), "local documentation must use the single folder-path screenshot");
assert(!localDocumentation.includes("images/11-recordings-folder.png"), "local documentation must not keep the retired recordings-folder placeholder");
assert(!localDocumentation.includes("images/12-record-folder-structure.png"), "local documentation must not keep the retired record-folder placeholder");
assert(!localDocumentation.includes("images/13-steps-folder.png"), "local documentation must not keep the retired steps-folder placeholder");
assert(localDocumentation.includes("如果导出时出现缺少 FFmpeg 的提示，请安装 FFmpeg，或者使用免配置版。"), "local documentation must tell users what to do when FFmpeg is missing");
assert(localDocumentation.includes("If export shows a missing FFmpeg message, install FFmpeg or use the no-configuration version."), "local documentation must translate the FFmpeg missing-message guidance");
assert(!localDocumentation.includes("images/14-ffmpeg-missing.png"), "local documentation must not keep the retired FFmpeg missing placeholder");
assert(!localDocumentation.includes("截图待放：轻量版缺少 FFmpeg"), "local documentation must not keep the retired FFmpeg missing placeholder text");
assert(localDocumentation.includes("录制中请先暂停再导出。"), "local documentation must describe the export precondition in export settings");
assert(localDocumentation.includes('<a href="#contact">10. 联系作者</a>'), "local documentation navigation must point to the contact section");
assert(localDocumentation.includes('<h2 id="contact">10. 联系作者</h2>'), "local documentation must replace recommended workflow with contact information");
assert(localDocumentation.includes("QQ：100209743"), "local documentation must include the QQ contact");
assert(localDocumentation.includes("B站：-BADBRUSH-"), "local documentation must include the Bilibili contact");
assert(localDocumentation.includes("10. Contact the Author"), "local documentation must translate the contact section");
assert(!localDocumentation.includes("10. 推荐用法"), "local documentation must remove the recommended workflow section title");
for (const pagesImageName of [
  "02-install-ccx.jpg",
  "02-install-ccx_2.jpg",
  "03-open-photoshop-panel.png.jpg",
  "04-绘画计时-初始未开启.jpg",
  "04-绘画计时-准备计时.jpg",
  "04-绘画计时-计时中.jpg",
  "04-绘画计时-空闲等待.jpg",
  "04-绘画计时-结束计时.jpg",
  "03_Mini面板.jpg",
  "05-录制-初始未开启.jpg",
  "05-录制-开启录制.jpg",
  "05-录制-暂停录制.jpg",
  "06-手动采样-未采样.jpg",
  "06-手动采样-已采样数量.jpg",
  "08_序列帧保存目录.jpg",
  "08_选择要导出的目录.jpg",
  "07-文件夹路径.jpg",
]) {
  assert(fs.existsSync(path.join(repoRoot, "docs", "images", pagesImageName)), `GitHub Pages documentation must include image ${pagesImageName}`);
}
assert(readText("README.md").includes("https://xbadbrushx.github.io/OK-Record/"), "Chinese README must link to the GitHub Pages guide");
assert(readText("README.en.md").includes("https://xbadbrushx.github.io/OK-Record/"), "English README must link to the GitHub Pages guide");
assert(uxpMain.includes('LOCAL_DOCUMENTATION_FILENAME = "index.html"'), "UXP must open the packaged documentation entry copied from docs/index.html");
assert(architectureDocs.includes("single architecture authority"), "Architecture.md must declare itself as the single architecture authority");
assert(architectureDocs.includes("Retired documentation paths"), "Architecture.md must record the retired duplicate architecture docs");
assert(architectureDocs.includes("docs/update.json"), "Architecture.md must route the static update manifest");
assert(scopedDocumentationIndex.includes("docs/update.json"), "docs index must route the static update manifest");
assert(scopedChineseDocumentationIndex.includes("docs/update.json"), "Chinese docs index must route the static update manifest");
assert(!scopedDocumentationIndex.includes("docs/v2-architecture.md"), "docs index must not route duplicate architecture mirrors");
assert(!scopedChineseDocumentationIndex.includes("docs/zh-CN/v2-architecture.md"), "Chinese docs index must not route duplicate architecture mirrors");
assert(!fs.existsSync(path.join(repoRoot, "docs/v2-architecture.md")), "English scoped architecture mirror must stay retired");
assert(!fs.existsSync(path.join(repoRoot, "docs/zh-CN/v2-architecture.md")), "Chinese scoped architecture mirror must stay retired");
assert(uxpMain.includes("getLocalDocumentationPath"), "UXP must resolve the packaged local documentation path");
assert(uxpMain.includes("getPluginFolder"), "UXP must resolve local documentation from the installed plugin folder");
assert(uxpMain.includes("openLocalDocumentation"), "UXP must expose a local documentation action");
assert(uxpMain.includes('UPDATE_MANIFEST_URL = "https://xbadbrushx.github.io/OK-Record/update.json"'), "UXP update check must read the GitHub Pages update manifest");
assert(uxpMain.includes("uxp.versions.plugin"), "UXP update check must compare against the runtime plugin version from the manifest");
assert(uxpMain.includes("compareVersionStrings(updateInfo.version, currentVersion)"), "UXP update check must compare remote and installed versions before showing a notice");
assert(uxpMain.includes("openUpdateDownloadPage"), "UXP must expose a download-page action for update reminders");
assert(uxpMain.includes("shell.openExternal"), "UXP must open the GitHub Release download page through the UXP shell external-url API");
assert(uxpMain.includes("UPDATE_RELEASES_URL_PREFIX"), "UXP update manifest URLs must stay constrained to OK-Record GitHub Releases");
assert(uxpMain.includes("netdiskUrl"), "UXP update manifest parsing must preserve the optional netdisk download URL");
assert(panelViewModule.includes("ok-record-update-badge"), "panel view must render the visible available-update badge");
assert(panelViewModule.includes("可更新"), "panel view must label the available-update badge in Chinese");
assert(panelViewModule.includes("showUpdateDialog"), "panel view must own the update download dialog rendering");
assert(panelStylesModule.includes(".ok-record-update-badge"), "panel styles must style the available-update badge");
assert(panelStylesModule.includes(".ok-record-update-dialog"), "panel styles must style the update download dialog");
assert(localDocumentation.includes("蓝色“可更新”按钮"), "user guide must describe the visible available-update badge");
{
  const brandedSources = [
    readme,
    readmeEnglish,
    agentsDocs,
    contributingDocs,
    architectureDocs,
    localDocumentation,
    packageInstallNotes,
    releaseNotes,
    runtimeSmokeChecklist,
    macBuildDocs,
    macBuildChineseDocs,
    uxpMain,
    statusMessagesModule,
    nativeExportRunnerModule,
    buildReleaseWindowsScript,
  ].join("\n");
  assert(!brandedSources.includes(`OK ${"Record"}`), "user-facing docs and runtime copy must not use the old space-separated product spelling");
  assert(agentsDocs.includes("`OK-Record`"), "AGENTS.md must document the branded product spelling");
  assert(architectureDocs.includes("Product Naming"), "Architecture.md must document the product naming contract");
}
assert(buildReleaseWindowsScript.includes('"docs\\index.html"'), "Windows package must include the root documentation entry");
assert(buildReleaseWindowsScript.includes('"domain\\recording-context.js"'), "Windows package must include the recording-context domain module");
assert(buildReleaseWindowsScript.includes('$documentationImageRoot = Join-Path $repoRoot "docs\\images"'), "Windows package must read documentation images from the root docs source");
assert(buildReleaseWindowsScript.includes("$documentationPayload"), "Windows package must include optional local documentation files and images");
assert(buildReleaseWindowsScript.includes('"docs\\images\\$($_.Name)"'), "Windows package must preserve local documentation image paths");
assert(buildReleaseWindowsScript.includes("OK-Record-User-Guide.html"), "Windows package must include a root-level user guide HTML copy for extracted packages");
assert(buildReleaseWindowsScript.includes('.Replace("images/", "docs/images/")'), "Windows package root-level user guide must resolve packaged image paths");
assert(buildReleaseMacScript.includes('"domain/recording-context.js"'), "macOS package must include the recording-context domain module");
assert(buildReleaseWindowsScript.includes("updateManifest.releaseDate"), "Windows release build must derive the default sealed date from docs/update.json");
assert(buildReleaseMacScript.includes('fs.readFileSync("docs/update.json","utf8")'), "macOS release build must derive the default sealed date from docs/update.json");
assert(buildUserPackageScript.includes("OK-Record.ccx"), "local user-package builder must include the lightweight installer");
assert(buildUserPackageScript.includes("OK-Record_with-ffmpeg.ccx"), "local user-package builder must include the bundled-FFmpeg installer");
assert(buildUserPackageScript.includes('OK-Record_v${version}_User-Package'), "local user-package builder must delimit the version variable in the package name");
assert(buildUserPackageScript.includes("README.txt"), "local user-package builder must include a user-facing README");
assert(buildUserPackageScript.includes("OK-Record-User-Guide.html"), "local user-package builder must include the local user guide");
assert(packageInstallNotes.includes("build-user-package.ps1"), "package install notes must route local user-package creation to the user-package builder");
assert(!packageInstallNotes.includes('-SealedDate "2026-06-02"'), "package install notes must not hard-code an old sealed date");
assert(!readme.includes('-SealedDate "2026-06-02"'), "README build commands must not hard-code an old sealed date");
assert(!uxpMain.includes("ok-record-timer-time"), "UXP painting timer must not keep the split time node");
assert(uxpMain.includes("setControlDisabled(startRecordingButtonNode, busy && !activeRecordingSession);"), "UXP recording button must remain enabled while active so busy capture states do not gray out the stop control");
assert(!uxpMain.includes("；Alt+点击清空序列帧"), "UXP recording button must not expose the old Alt-click clear-frames affordance");
assert(!uxpMain.includes("Ctrl+Shift+Alt+点击也可清空"), "UXP recording button must not advertise the retired clear-frame shortcut");
assert(!uxpMain.includes("function isRecordingClearShortcut"), "UXP recording button must not keep a clear-frame shortcut predicate");
assert(!uxpMain.includes("event.ctrlKey && event.shiftKey && event.altKey"), "UXP recording button must not branch on Ctrl+Shift+Alt for clearing frames");
assert(uxpMain.includes("clearRecordingTimelineButtonNode"), "UXP panel must expose a visible clear sequence-frame button");
assert(panelViewModule.includes("指定 OK-Record 保存目录"), "UXP panel must label the project directory picker as an explicit choose action");
assert(uxpMain.includes("chooseProjectOutputDirButtonNode.disabled = recordingLoopActive"), "UXP project directory picker must stay disabled while actively recording");
assert(!uxpMain.includes("chooseProjectOutputDirButtonNode.disabled = activeRecordingSession || busy"), "UXP project directory picker must not stay disabled only because recording is paused");
assert(uxpMain.includes("showBlockingNotice"), "UXP important recording and export notices must route through the blocking alert helper");
assert(uxpMain.includes("alert(message)"), "UXP blocking notices must use the native alert dialog when available");
assert(uxpMain.includes("CLEAR_RECORDING_PANEL_MENU_ID"), "UXP panel flyout menu must expose an explicit clear sequence-frame action");
assert(uxpMain.includes("清空序列帧_Clear Frames"), "UXP panel flyout menu must label the explicit clear sequence-frame action");
assert(uxpMain.includes("clearRecordingTimeline"), "UXP panel must keep an explicit clear-recording handler");
assert(uxpMain.includes('typeof confirm !== "function"'), "UXP clear-frames action must fail closed when no confirmation dialog is available");
assert(uxpMain.includes("nativeBridge.clearRecording"), "UXP clear-frames action must route through the native bridge");
assert.deepStrictEqual(manifest.featureFlags, { enableAlerts: true }, "UXP manifest must enable confirm dialogs for destructive clear-frame confirmation");
assert(uxpMain.includes('require("./status-messages")'), "UXP user-facing status text must route through the status messages module");
assert(uxpMain.includes("buildExportSuccessMessages"), "UXP export success must use the status message mapper");
assert(uxpMain.includes("buildExportFailureMessages"), "UXP export failure must use the status message mapper");
assert(uxpMain.includes("formatFrameQualityPreset(recorderState.frameQualityPreset)"), "UXP export success notice must include the selected quality preset");
assert(uxpMain.includes("formatCaptureResolutionPreset(exportProfile.maxWidth)"), "UXP export success notice must include the selected resolution preset");
assert(!uxpMain.includes("function formatError"), "UXP shell must not own user-facing native error mapping");
assert(!uxpMain.includes("function createSelectField"), "UXP panel must not keep unused generic select helpers");
assert(!uxpMain.includes("resumeRecordingButtonNode"), "UXP panel must not keep the retired separate resume button node");
assert(!uxpMain.includes("stopRecordingButtonNode"), "UXP panel must not keep the retired separate stop button node");
assert(!uxpMain.includes("pauseRecordingButtonNode"), "UXP panel must not keep a separate pause button node");
assert(!uxpMain.includes("toggleRecordingPause"), "UXP panel must not keep a separate pause/resume UI toggle");
assert(uxpMain.includes("toggleRecording"), "UXP panel must use one recording button for start, pause, and resume");
assert(uxpMain.includes("await pauseRecording();"), "UXP recording button ordinary click must pause while recording");
assert(uxpMain.includes("await resumeRecording();"), "UXP recording button ordinary click must resume while paused");
assert(uxpMain.includes("getRecordingFrameCountText"), "UXP recording button must show the sampled frame count in active and paused states");
assert(uxpMain.includes("recordingPauseRequested"), "UXP recording button must handle pause requests during capture/write without becoming a stop button");
assert(uxpMain.includes("async function stopRecordingRuntimeSchedulers"), "UXP recorder failures must share runtime scheduler cleanup");
assert(
  uxpMain.includes("await stopRecordingRuntimeSchedulers({ resetDocumentSignature: true });"),
  "UXP recorder failure paths must release idle listeners before leaving the recording runtime",
);
assert(uxpMain.includes("ok-record-state-active"), "UXP panel must color active states instead of permanently coloring primary actions");
assert(!uxpMain.includes('createButton("暂停"'), "UXP panel must not expose a separate pause button");
assert(!uxpMain.includes("ok-record-primary-button"), "UXP panel must not permanently color ordinary action buttons as primary");
assert(panelViewModule.includes("ok-record-danger-button"), "UXP panel must render the visible clear sequence-frame button with the danger style class");
assert(panelStylesModule.includes(".ok-record-danger-button"), "UXP panel must define a red danger style for the visible clear sequence-frame button");
assert(nativeModule.includes("write_frame"), "native addon must expose the main frame writer");
assert(nativeModule.includes("write_step_frame"), "native addon must expose the manual step PNG writer");
assert(nativeModule.includes("scan_recordings"), "native addon must expose the frame directory scanner");
assert(nativeModule.includes("scan_sequence"), "native addon must expose the image-sequence scanner");
assert(nativeModule.includes("CollectExportableSequenceFrames(framesPath)"), "native sequence scanner must use the shared exportable-sequence collection path");
assert(nativeExportFrameSetModule.includes("Sequence directory contains mixed frame naming or image formats"), "native sequence scanner must reject mixed image-sequence naming");
assert(nativeExportFrameSetModule.includes("Sequence frame numbers are not contiguous"), "native sequence scanner must reject non-contiguous image-sequence numbering");
assert(nativeModule.includes("export_session"), "native addon must expose the FFmpeg exporter");
assert(nativeModule.includes("export_sequence"), "native addon must expose the arbitrary sequence FFmpeg exporter");
assert(nativeModule.includes('#include "storage_recovery.h"'), "native addon must consume the shared storage recovery core");
assert(nativeModule.includes('#include "export_progress.h"'), "native addon must consume the shared export progress parser");
assert(nativeModule.includes('#include "export_runner.h"'), "native addon must consume the shared FFmpeg export runner");
assert(nativeStorageRecoveryHeader.includes("ScanRecordingSessions"), "native storage recovery header must expose the scan owner path");
assert(nativeStorageRecoveryModule.includes("CollectCommittedFrames"), "native storage recovery module must own committed-frame collection");
assert(nativeStorageRecoveryHeader.includes("ValidateCommittedFrameRecord"), "native storage recovery header must expose committed-frame validity checks");
assert(nativeStorageRecoveryModule.includes("ValidateCommittedFrameRecord(frame);"), "native committed-frame collection must validate frame and metadata consistency before recovery/export");
assert(nativeExportProgressHeader.includes("ParseFfmpegProgressText"), "native export progress header must expose the parser owner path");
assert(nativeExportProgressModule.includes("ParseFfmpegProgressFile"), "native export progress module must parse FFmpeg progress files");
assert(nativeProject.includes("..\\src\\export_frame_set.cpp"), "native build must compile the export frame-set discovery owner");
assert(nativeProject.includes("..\\src\\export_progress.cpp"), "native build must compile the export progress parser");
assert(nativeProject.includes("..\\src\\export_runner.cpp"), "native build must compile the shared export runner");
assert(nativeProject.includes("..\\src\\storage_recovery.cpp"), "native build must compile the storage recovery core");
assert(nativeProject.includes("/utf-8"), "native build must compile UTF-8 source literals for bilingual directory names");
assert(buildNativeMacScript.includes('UXP_ARCH="arm64"'), "macOS native build must map arm64 to the UXP arm64 payload folder");
assert(buildNativeMacScript.includes('UXP_ARCH="x64"'), "macOS native build must map x86_64 to the UXP x64 payload folder");
assert(buildNativeMacScript.includes("uxp/mac/$UXP_ARCH"), "macOS native build must write into the UXP mac payload root");
assert(buildNativeMacScript.includes("-framework ImageIO"), "macOS native build must link ImageIO for JPEG/PNG encoding");
assert(buildNativeMacScript.includes("native/src/export_frame_set.cpp"), "macOS native build must compile the export frame-set discovery owner");
assert(buildNativeMacScript.includes("native/src/export_runner.cpp"), "macOS native build must compile the shared export runner");
assert(verifyLocalWindowsScript.includes("uxp\\services\\native-bridge.js"), "Windows local verification must syntax-check the native bridge");
assert(verifyLocalWindowsScript.includes("tests\\native-bridge.test.js"), "Windows local verification must run the native bridge behavior test");
assert(verifyLocalWindowsScript.includes("uxp\\panel-view.js"), "Windows local verification must syntax-check the concrete panel view");
assert(verifyLocalWindowsScript.includes("uxp\\status-messages.js"), "Windows local verification must syntax-check status message mappings");
assert(verifyLocalWindowsScript.includes("tests\\panel-styles.test.js"), "Windows local verification must run the panel-styles style contract test");
assert(verifyLocalWindowsScript.includes("tests\\panel-dom.test.js"), "Windows local verification must run the panel-dom behavior test");
assert(verifyLocalWindowsScript.includes("tests\\panel-view.test.js"), "Windows local verification must run the panel-view behavior test");
assert(verifyLocalWindowsScript.includes("test-native-export-runner.ps1"), "Windows local verification must run the native export runner smoke test");
assert(verifyLocalWindowsScript.includes("open-source-audit.ps1"), "Windows local verification must run the open-source audit");
assert(verifyLocalMacScript.includes("test-native-recovery-scan-mac.sh"), "macOS local verification must run the recovery scan fixture");
assert(verifyLocalMacScript.includes("uxp/services/native-bridge.js"), "macOS local verification must syntax-check the native bridge");
assert(verifyLocalMacScript.includes("tests/native-bridge.test.js"), "macOS local verification must run the native bridge behavior test");
assert(verifyLocalMacScript.includes("uxp/panel-view.js"), "macOS local verification must syntax-check the concrete panel view");
assert(verifyLocalMacScript.includes("uxp/status-messages.js"), "macOS local verification must syntax-check status message mappings");
assert(verifyLocalMacScript.includes("tests/panel-styles.test.js"), "macOS local verification must run the panel-styles style contract test");
assert(verifyLocalMacScript.includes("tests/panel-dom.test.js"), "macOS local verification must run the panel-dom behavior test");
assert(verifyLocalMacScript.includes("tests/panel-view.test.js"), "macOS local verification must run the panel-view behavior test");
assert(verifyLocalMacScript.includes("test-native-export-runner-mac.sh"), "macOS local verification must run the native export runner smoke test");
assert(verifyLocalMacScript.includes("build-native-mac.sh"), "macOS local verification must build the native addon");
assert(verifyLocalMacScript.includes("open-source-audit.ps1"), "macOS local verification must run the open-source audit");
assert(buildReleaseMacScript.includes("mac/arm64/$ADDON_NAME"), "macOS release package must include the arm64 addon payload");
assert(buildReleaseMacScript.includes("mac/x64/$ADDON_NAME"), "macOS release package must include the x64 addon payload");
assert(buildReleaseMacScript.includes("DOCUMENTATION_PAYLOAD=("), "macOS release package must define documentation payload from the root docs source");
assert(buildReleaseMacScript.includes('"docs/index.html"'), "macOS release package must include the root documentation entry");
assert(buildReleaseMacScript.includes("OK-Record-User-Guide.html"), "macOS release package must include a root-level user guide HTML copy for extracted packages");
assert(buildReleaseMacScript.includes('replace(/images\\//g, "docs/images/")'), "macOS package root-level user guide must resolve packaged image paths");
assert(buildReleaseMacScript.includes("assert_valid_package_file_name"), "macOS packaging must validate release package names before filesystem operations");
assert(buildReleaseMacScript.includes("assert_child_path"), "macOS packaging must guard release output paths before recursive cleanup");
assert(buildReleaseWindowsScript.includes("domain\\export-profile.js"), "Windows release package must include UXP domain modules");
assert(buildReleaseWindowsScript.includes("services\\native-bridge.js"), "Windows release package must include the native bridge service");
assert(buildReleaseWindowsScript.includes("panel-styles.js"), "Windows release package must include the panel style module");
assert(buildReleaseWindowsScript.includes("panel-view.js"), "Windows release package must include the concrete panel view");
assert(buildReleaseWindowsScript.includes("status-messages.js"), "Windows release package must include status message mappings");
assert(buildReleaseMacScript.includes("domain/export-profile.js"), "macOS release package must include UXP domain modules");
assert(buildReleaseMacScript.includes("services/native-bridge.js"), "macOS release package must include the native bridge service");
assert(buildReleaseMacScript.includes("panel-styles.js"), "macOS release package must include the panel style module");
assert(buildReleaseMacScript.includes("panel-view.js"), "macOS release package must include the concrete panel view");
assert(buildReleaseMacScript.includes("status-messages.js"), "macOS release package must include status message mappings");
assert(gitignore.includes("native/mac/"), "macOS native build intermediates must stay out of git");
assert(gitignore.includes("uxp/mac/**/*.uxpaddon"), "macOS runtime addon outputs must stay out of git");
assert(gitignore.includes("延时录制_Recordings/"), "repo must ignore local recording output roots");
assert(gitignore.includes("步骤图_Steps/"), "repo must ignore local manual step-image roots");
assert(openSourceAuditScript.includes("延时录制_Recordings"), "open-source audit must block local recording output roots");
assert(openSourceAuditScript.includes("步骤图_Steps"), "open-source audit must block local manual step-image roots");
assert(openSourceAuditScript.includes("[switch]$PublicUpload"), "open-source audit must expose a public-upload mode for filtered source releases");
assert(openSourceAuditScript.includes("^AGENTS\\.md$"), "public-upload audit must block local collaboration docs");
assert(openSourceAuditScript.includes("^docs/mac-build\\.md$"), "public-upload audit must block scoped development docs");
assert(openSourceAuditScript.includes("\\.(ccx|zxp|psd|psb|psdc|mp4|mov|avi|dll|exe|zip)$"), "open-source audit must block zip release packages");
assert(gitignore.includes("*.zip"), "repo must ignore local zip release/user packages");
assert(verifyInstalledPayloadScript.includes("bundledFfmpeg"), "installed-payload verification must cover bundled FFmpeg payload entries");
assert(verifyInstalledPayloadScript.includes("bundledFfmpegFilesVerified"), "installed-payload verification summary must report bundled FFmpeg verification");
assert(packageInstallNotes.includes("docs/index.html"), "package install notes must list packaged local documentation");
assert(packageInstallNotes.includes("docs/images/"), "package install notes must list packaged documentation images");
assert(packageInstallNotes.includes("OK-Record-User-Guide.html"), "package install notes must list the root-level user guide HTML copy");
assert(securityPolicy.includes("does not commit FFmpeg"), "security policy must distinguish source repository contents from release package variants");
assert(securityPolicy.includes("no-setup release package may bundle FFmpeg"), "security policy must allow the documented bundled-FFmpeg release variant");
assert(macBuildDocs.includes("Authority:"), "macOS build docs must keep a scoped-doc authority header");
assert(nativeSources.includes("GetRecordingsRootPath(request.outputDir)"), "native writer/exporter must decode UXP outputDir through the recording-root helper before filesystem use");
assert(nativeModule.includes("GetRecordingsRootPath(outputDir)"), "native scanner must decode UXP outputDir through the recording-root helper before filesystem use");
assert(nativeExportFrameSetModule.includes("PathFromUtf8(outputDir) / PathFromUtf8(kRecordingsRootDirName)"), "native recording-root helper must decode UXP outputDir and the bilingual root as UTF-8 before filesystem use");
assert(nativeSources.includes("PathToUtf8"), "native addon must return filesystem paths to UXP as UTF-8 strings");
assert(!nativeSources.includes("fs::path(request.outputDir)"), "native addon must not construct Windows filesystem paths directly from UTF-8 outputDir bytes");
assert(!nativeSources.includes("fs::path(outputDir)"), "native scanner must not construct Windows filesystem paths directly from UTF-8 outputDir bytes");
assert(nativeSources.includes(contract.frame.schema), "native metadata schema must match the shared contract");
assert(nativeSources.includes(contract.manifest.schema), "native manifest schema must match the shared contract");
assert(nativeModule.includes(contract.scan.schema), "native scan result schema must match the shared contract");
assert(nativeModule.includes(contract.scan.sequenceSchema), "native sequence scan result schema must match the shared contract");
assert(nativeModule.includes(contract.export.schema), "native export result schema must match the shared contract");
assert(nativeModule.includes(contract.stepFrame.schema), "native step writer result schema must match the shared contract");
assert(nativeSources.includes(contract.export.progressSchema), "native export progress schema must match the shared contract");
assert(nativeSources.includes(contract.export.progressExtension), "native exporter must write the shared FFmpeg progress extension");
assert(nativeModule.includes(contract.manifest.filename), "native writer must write the shared manifest filename");
assert(nativeSources.includes("BuildManifestJsonFromCommittedFrames"), "native writer and recovery scan must share metadata-derived manifest building");
assert(nativeSources.includes("RebuildManifestFromCommittedFrames"), "native recovery scan must rebuild manifest.json from committed metadata");
assert(nativeSources.includes("metadataSidecarsAreAuthority"), "native manifest must declare metadata sidecars as the committed-frame authority");
assert(!nativeSources.includes("frameFilesAreAuthority"), "native manifest must not keep frame-file-only authority");
assert(nativeExportFrameSetHeader.includes(`kRecordingsRootDirName = u8"${contract.sessionLayout.rootDirName}"`), "native writer must use the shared bilingual recording root");
assert(nativeSources.includes(contract.frame.filenamePrefix), "native writer must use numbered frame names");
assert(nativeSources.includes(contract.stepFrame.filenamePrefix), "native step writer must use step frame names");
assert(nativeExportFrameSetHeader.includes("kStepFrameIndexDigits = 3"), "native step writer must use three-digit step frame names");
assert(nativeSources.includes(contract.frame.defaultStorageFormat), "native writer must use the shared default encoded frame storage format");
assert(nativeSources.includes(contract.frame.defaultExtension), "native writer must write the shared default encoded frame extension");
assert(nativeSources.includes(contract.frame.pngStorageFormat), "native writer must recognize PNG frame storage");
assert(nativeSources.includes(contract.frame.pngExtension), "native writer must write the shared PNG frame extension");
assert(nativeSources.includes(contract.frame.legacyRawStorageFormat), "native writer must still recognize existing raw-frame directories");
assert(nativeModule.includes("GUID_ContainerFormatJpeg"), "native writer must encode default frame storage through WIC JPEG");
assert(nativeModule.includes("GUID_ContainerFormatPng"), "native writer must encode lossless frame storage through WIC PNG");
assert(nativeModule.includes("CGImageDestinationCreateWithURL"), "native writer must encode JPEG/PNG through ImageIO on macOS");
assert(nativeSources.includes('pixelFormat == "RGB" && components == 3'), "native writer must accept opaque RGB 8-bit pixels returned by Photoshop imaging");
assert(nativeSources.includes('pixelFormat == "RGBA" && components == 4'), "native writer must continue accepting RGBA 8-bit pixels returned by Photoshop imaging");
assert(nativeModule.includes("ConvertRgbSourceToBgrOnWhite"), "native JPEG writer must normalize RGB/RGBA source pixels before encoding");
assert(nativeModule.includes("ConvertRgbSourceToBgra"), "native PNG writer must normalize RGB/RGBA source pixels before encoding");
assert(nativeExportRunnerModule.includes("posix_spawn"), "native exporter must run FFmpeg through the macOS process API");
assert(nativeExportRunnerModule.includes("ResolveBundledFfmpegPathFromModulePath"), "native exporter must look for bundled FFmpeg before falling back to PATH on Windows");
assert(nativeExportRunnerModule.includes('"vendor" / "ffmpeg" / "win" / "x64" / "ffmpeg.exe"'), "native exporter must use the packaged Windows FFmpeg location");
assert(nativeExportRunnerModule.includes('fs::path(directory) / "ffmpeg"'), "native exporter must discover ffmpeg from PATH on macOS");
assert(buildReleaseWindowsScript.includes("BundledFfmpegPath"), "Windows packaging must support a bundled FFmpeg variant");
assert(buildReleaseWindowsScript.includes("THIRD_PARTY_NOTICES.md"), "Windows bundled FFmpeg packaging must include third-party notices");
assert(gitignore.includes("vendor/ffmpeg/"), "repo must ignore local bundled FFmpeg staging paths");
assert(nativeModule.includes("stream.Reset();"), "native JPEG writer must release the WIC stream before atomic rename");
assert(nativeSources.includes("frameStorageFormat"), "native metadata must record frame storage format");
assert(nativeSources.includes("frameQualityPreset"), "native metadata must record frame quality preset");
assert(nativeSources.includes("jpegQuality"), "native metadata must record JPEG quality");
assert(nativeSources.includes("encodedByteLength"), "native metadata must record encoded frame byte size");
assert(uxpMain.includes("formatFrameStorageFormat"), "UXP status must display the recovered/native frame storage format");
assert(uxpMain.includes("manifestPath"), "UXP must display the native manifest path returned by the writer");
assert(uxpMain.includes("restoreRecorderState"), "UXP panel must restore recorder state on show");
assert(uxpMain.includes('require("./domain/recorder-state")'), "UXP recorder state transitions must route through the recorder-state domain");
assert(uxpMain.includes("recorderDomain.startRecordingState"), "UXP start recording must use recorder-state domain transition");
assert(uxpMain.includes("recorderDomain.pauseRecordingState"), "UXP pause recording must use recorder-state domain transition");
assert(uxpMain.includes("recorderDomain.resumeRecordingState"), "UXP resume recording must use recorder-state domain transition");
assert(uxpMain.includes("recorderDomain.stopRecordingState"), "UXP stop recording must use recorder-state domain transition");
assert(uxpMain.includes("nativeBridge.scanRecordings"), "UXP must call the native frame directory scanner through the native bridge");
assert(uxpMain.includes("firstFrameMetadataJson"), "UXP must restore timeline capture geometry from native scan results");
assert(uxpMain.includes("exportFrameMetadataConsistent"), "UXP must surface mixed-format timeline state from native scan results");
assert(uxpMain.includes("aspectRatioConsistent"), "UXP must surface mixed-aspect-ratio timeline state from native scan results");
assert(uxpMain.includes("ensureActiveSessionForCapture"), "UXP must append captures to one active timeline");
assert(uxpMain.includes("scheduleNextCapture"), "UXP must include the interval capture scheduler");
assert(uxpMain.includes("nativeBridge.exportSession"), "UXP must call the native FFmpeg exporter through the native bridge");
assert(nativeSources.includes("firstFrameMetadataJson"), "native scanner must return first-frame metadata for timeline geometry");
assert(nativeSources.includes("exportFrameMetadataConsistent"), "native scanner must flag export-incompatible timelines");
assert(nativeSources.includes("aspectRatioConsistent"), "native scanner must flag mixed-aspect-ratio timelines");
assert(nativeSources.includes("CollectOrphanFramePaths"), "native scanner must report orphan frame files separately from committed frames");
assert(nativeSources.includes("FindFirstMissingCommittedFrameIndex"), "native scanner must flag gapped committed frame sequences");
assert(nativeModule.includes(contract.scan.contiguousFramesField), "native scan result must expose committed-frame contiguity");
assert(nativeModule.includes(contract.scan.exportableField), "native scan result must expose whether the timeline can be exported");
assert(nativeModule.includes(contract.scan.orphanFrameCountField), "native scan result must expose orphan frame count");
assert(nativeModule.includes(contract.scan.exportBlockReasonField), "native scan result must expose export block reason");
assert(nativeSources.includes("InvalidRecordingSessionScanResult"), "native scanner must report invalid timeline diagnostics without blocking valid recovery");
assert(nativeModule.includes(contract.scan.invalidSessionsField), "native scan result must expose invalid timeline diagnostics");
assert(nativeModule.includes(contract.scan.hasInvalidSessionsField), "native scan result must expose whether invalid timeline diagnostics exist");
assert(nativeModule.includes(contract.scan.invalidSessionCountField), "native scan result must expose the invalid timeline count");
assert(nativeSources.includes("IsTimelineFrameFormatCompatible"), "native scanner/exporter must share the timeline frame-format compatibility rule");
assert(nativeModule.includes("IsFrameWriteFormatCompatible"), "native writer must use the timeline frame-format compatibility rule for appends");
assert(nativeModule.includes("write_frame metadata is incompatible with existing timeline"), "native writer must reject incompatible frame appends while allowing dimension changes and RGB/RGBA source alternation");
