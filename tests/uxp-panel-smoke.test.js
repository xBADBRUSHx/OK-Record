const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "uxp", "main.js");
const source = fs.readFileSync(sourcePath, "utf8");
const contract = JSON.parse(fs.readFileSync(path.join(repoRoot, "shared", "recorder-contract.json"), "utf8"));

class ClassList {
  constructor(element) {
    this.element = element;
  }

  add(...tokens) {
    const classes = new Set(this._tokens());
    tokens.filter(Boolean).forEach((token) => classes.add(String(token)));
    this.element.className = Array.from(classes).join(" ");
  }

  remove(...tokens) {
    const removeSet = new Set(tokens.map(String));
    this.element.className = this._tokens().filter((token) => !removeSet.has(token)).join(" ");
  }

  toggle(token, force) {
    const hasToken = this.contains(token);
    const shouldHave = force === undefined ? !hasToken : Boolean(force);
    if (shouldHave) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return shouldHave;
  }

  contains(token) {
    return this._tokens().includes(String(token));
  }

  _tokens() {
    return String(this.element.className || "").split(/\s+/).filter(Boolean);
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = String(tagName || "").toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.style = {};
    this.eventListeners = new Map();
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.title = "";
    this.type = "";
    this.min = "";
    this.max = "";
    this.step = "";
    this.inputMode = "";
    this.tabIndex = 0;
    this.classList = new ClassList(this);
  }

  get firstChild() {
    return this.children.length > 0 ? this.children[0] : null;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index < 0) {
      throw new Error("child is not attached");
    }
    this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  addEventListener(type, listener) {
    const key = String(type);
    const listeners = this.eventListeners.get(key) || [];
    listeners.push(listener);
    this.eventListeners.set(key, listeners);
  }

  dispatchEvent(event) {
    const listeners = this.eventListeners.get(String(event && event.type)) || [];
    event.target = event.target || this;
    for (const listener of listeners) {
      listener(event);
    }
    return true;
  }

  focus() {}

  select() {}

  querySelector(selector) {
    return findFirstDescendant(this, selector);
  }

  querySelectorAll(selector) {
    const matches = [];
    collectDescendants(this, selector, matches);
    return matches;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement("body");
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.defaultPrevented = false;
    this.target = null;
    this.key = options.key || "";
    this.altKey = Boolean(options.altKey);
    this.ctrlKey = Boolean(options.ctrlKey);
    this.shiftKey = Boolean(options.shiftKey);
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

function findFirstDescendant(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      return child;
    }
    const nested = findFirstDescendant(child, selector);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function collectDescendants(root, selector, matches) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      matches.push(child);
    }
    collectDescendants(child, selector, matches);
  }
}

function matchesSelector(element, selector) {
  if (!selector) {
    return false;
  }
  if (selector.startsWith(".")) {
    return element.classList.contains(selector.slice(1));
  }
  return element.tagName.toLowerCase() === selector.toLowerCase();
}

async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

async function waitForCondition(predicate, message) {
  for (let index = 0; index < 20; index += 1) {
    await flushMicrotasks();
    if (predicate()) {
      return;
    }
  }
  assert(predicate(), message);
}

async function run() {
  const document = new MockDocument();
  global.document = document;
  global.Event = MockEvent;
  const setupCalls = [];
  const timers = [];
  const addonCalls = {
    clearRecording: 0,
    exportSession: 0,
    exportSequence: 0,
    scanRecordings: 0,
    scanSequence: 0,
  };
  const idleListenerCalls = {
    add: 0,
    remove: 0,
    idleTimes: [],
  };
  const openPathCalls = [];
  const openExternalCalls = [];
  const fetchCalls = [];
  const confirmMessages = [];
  const alertMessages = [];
  const actionListeners = [];
  const folderSelections = [];
  const writeFrameOutputDirs = [];
  const openDocumentIds = new Set([1]);
  let writeFrameCount = 0;
  let failStepWrite = false;
  let failExportSession = false;
  let hostModalFailureCount = 0;
  const executeAsModalOptions = [];
  const confirmMock = (message) => {
    confirmMessages.push(String(message || ""));
    return true;
  };
  const alertMock = (message) => {
    alertMessages.push(String(message || ""));
  };
  async function runNextTimer(message) {
    const callback = timers.shift();
    assert(callback, message);
    callback();
    await flushMicrotasks();
  }
  const dataFolder = {
    isFolder: true,
    name: "data",
    nativePath: path.join(repoRoot, "tests", "out", "uxp-panel-smoke"),
    async getEntries() {
      return [];
    },
    async createFile(name) {
      return {
        isFile: true,
        name,
        async read() {
          return "";
        },
        async write() {},
      };
    },
  };
  const uxpMock = {
    entrypoints: {
      setup(config) {
        setupCalls.push(config);
      },
    },
    versions: {
      plugin: "1.0.0",
    },
    host: {
      version: "27.6.0",
    },
    storage: {
      localFileSystem: {
        async getDataFolder() {
          return dataFolder;
        },
        async getPluginFolder() {
          return {
            isFolder: true,
            name: "plugin",
            nativePath: path.join(repoRoot, "uxp"),
          };
        },
        async getFolder() {
          return folderSelections.shift() || null;
        },
        getNativePath(entry) {
          return entry && entry.nativePath ? entry.nativePath : "";
        },
      },
    },
    shell: {
      async openPath(targetPath, message) {
        openPathCalls.push({ openPath: targetPath, message });
      },
      async openExternal(url, message) {
        openExternalCalls.push({ url, message });
      },
    },
  };
  async function fetchMock(url) {
    fetchCalls.push(String(url || ""));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          schema: "ok-record.update-manifest.v1",
          version: "1.0.3",
          releasePageUrl: "https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3",
          downloadUrl: "https://github.com/xBADBRUSHx/OK-Record/releases/download/v1.0.3/OK-Record_with-ffmpeg.ccx",
          netdiskUrl: "https://pan.example.com/ok-record",
          summary: "测试更新提醒",
        };
      },
    };
  }
  const photoshopMock = {
    action: {
      async addNotificationListener(events, listener) {
        actionListeners.push({ events, listener });
      },
      validateReference(ref) {
        return Boolean(
          ref &&
          ref._ref === "document" &&
          openDocumentIds.has(Number(ref._id))
        );
      },
    },
    core: {
      async addNotificationListener() {
        idleListenerCalls.add += 1;
      },
      async removeNotificationListener() {
        idleListenerCalls.remove += 1;
      },
      async setUserIdleTime(seconds) {
        idleListenerCalls.idleTimes.push(Number(seconds));
      },
      async executeAsModal(callback, options = {}) {
        executeAsModalOptions.push(options);
        if (hostModalFailureCount > 0) {
          hostModalFailureCount -= 1;
          const error = new Error("host is in a modal state");
          error.number = 9;
          throw error;
        }
        return callback({}, options.descriptor || {});
      },
    },
    imaging: {
      async getPixels() {
        return {
          sourceBounds: {
            left: 0,
            top: 0,
            right: 2,
            bottom: 2,
          },
          imageData: {
            width: 2,
            height: 2,
            components: 4,
            componentSize: 8,
            pixelFormat: "RGBA",
            colorSpace: "RGB",
            colorProfile: "sRGB",
            hasAlpha: true,
            async getData() {
              return new Uint8Array(16);
            },
            dispose() {},
          },
        };
      },
    },
    app: {
      activeDocument: {
        id: 1,
        path: path.join(repoRoot, "tests", "out", "mock.psd"),
        activeHistoryState: {
          id: 1,
          name: "initial",
        },
      },
    },
  };
  const addonMock = {
    write_frame(metadata, arrayBuffer) {
      writeFrameOutputDirs.push(metadata.outputDir);
      writeFrameCount += 1;
      const sessionId = metadata.sessionId || "Timeline";
      const frameIndex = writeFrameCount;
      const frameName = `frame_${String(frameIndex).padStart(6, "0")}`;
      const recordingRoot = path.join(metadata.outputDir, "延时录制_Recordings");
      return {
        sessionId,
        frameIndex,
        frameName,
        frameCount: frameIndex,
        width: metadata.width,
        height: metadata.height,
        byteLength: arrayBuffer.byteLength,
        sourceByteLength: arrayBuffer.byteLength,
        encodedByteLength: 12,
        frameStorageFormat: metadata.frameStorageFormat || "jpeg",
        frameExtension: metadata.frameExtension || ".jpg",
        frameQualityPreset: metadata.frameQualityPreset || "default",
        jpegQuality: Number(metadata.jpegQuality) || 80,
        lastCaptureAt: metadata.capturedAt,
        sessionPath: recordingRoot,
        framesPath: path.join(recordingRoot, "frames"),
        framePath: path.join(recordingRoot, "frames", `${frameName}.jpg`),
        metadataPath: path.join(recordingRoot, "frames", `${frameName}.json`),
        manifestPath: path.join(recordingRoot, "manifest.json"),
        exportFrameMetadataConsistent: true,
        aspectRatioConsistent: true,
        aspectRatioGroupsJson: "[{\"ratio\":\"1:1\",\"frameCount\":1,\"maxWidth\":2,\"maxHeight\":2}]",
        majorityAspectRatioKey: "1:1",
        majorityAspectRatioFrameCount: 1,
      };
    },
    write_step_frame(metadata, arrayBuffer) {
      if (failStepWrite) {
        throw new Error("forced step write failure");
      }
      return {
        frameIndex: 1,
        frameName: "step_001",
        frameCount: 1,
        width: metadata.width,
        height: metadata.height,
        byteLength: arrayBuffer.byteLength,
        sourceByteLength: arrayBuffer.byteLength,
        encodedByteLength: 12,
        capturedAt: metadata.capturedAt,
        framePath: path.join(metadata.outputDir, "step_001.png"),
      };
    },
    scan_recordings() {
      addonCalls.scanRecordings += 1;
      return {
        schema: contract.scan.schema,
        restored: false,
        sessions: [],
        invalidSessions: [],
        hasInvalidSessions: false,
        invalidSessionCount: 0,
      };
    },
    scan_sequence() {
      addonCalls.scanSequence += 1;
      return {
        schema: contract.scan.sequenceSchema,
        frameCount: 0,
        firstFramePath: "",
        lastFramePath: "",
      };
    },
    clear_recording(request) {
      addonCalls.clearRecording += 1;
      return {
        schema: contract.export.clearRecordingSchema,
        frameCount: 0,
        framesPath: path.join(request.outputDir, "延时录制_Recordings", "frames"),
      };
    },
    export_session(request) {
      addonCalls.exportSession += 1;
      if (failExportSession) {
        throw new Error("forced export failure");
      }

      const recordingRoot = path.join(request.outputDir, "延时录制_Recordings");
      const exportsRoot = path.join(recordingRoot, "exports");
      const targetDurationSeconds = Number(request.targetDurationSeconds) || 10;
      const outputFps = Number(request.outputFps) || 30;
      const exportedFrameCount = Math.max(1, Math.min(writeFrameCount, Math.floor(targetDurationSeconds * outputFps)));
      return {
        schema: contract.export.schema,
        sourceType: "timeline",
        sourcePath: recordingRoot,
        sessionId: request.sessionId || "Timeline",
        frameCount: writeFrameCount,
        sourceFrameCount: writeFrameCount,
        exportedFrameCount,
        skippedFrameCount: Math.max(0, writeFrameCount - exportedFrameCount),
        samplingApplied: exportedFrameCount < writeFrameCount,
        holdSeconds: targetDurationSeconds / exportedFrameCount,
        outputFps,
        outputWidth: 1920,
        outputHeight: 1080,
        outputPath: path.join(exportsRoot, "OK-Record_timelapse_test.mp4"),
        logPath: path.join(exportsRoot, "export.log"),
        progressPath: path.join(exportsRoot, "progress.log"),
        targetDurationSeconds,
        inputFrameStorageFormat: "jpeg",
        inputFrameExtension: ".jpg",
        progressParsed: true,
        progressStatus: "end",
        progressPercent: 100,
      };
    },
    export_sequence(request) {
      addonCalls.exportSequence += 1;
      const targetDurationSeconds = Number(request.targetDurationSeconds) || 10;
      const outputFps = Number(request.outputFps) || 30;
      return {
        schema: contract.export.schema,
        sourceType: "directory",
        sourcePath: request.framesDir,
        sessionId: "",
        frameCount: 1,
        sourceFrameCount: 1,
        exportedFrameCount: 1,
        skippedFrameCount: 0,
        samplingApplied: false,
        holdSeconds: targetDurationSeconds,
        outputFps,
        outputWidth: 1920,
        outputHeight: 1080,
        outputPath: path.join(path.dirname(request.framesDir), "exports", "OK-Record_timelapse_test.mp4"),
        logPath: path.join(path.dirname(request.framesDir), "exports", "export.log"),
        progressPath: path.join(path.dirname(request.framesDir), "exports", "progress.log"),
        targetDurationSeconds,
        inputFrameStorageFormat: "jpeg",
        inputFrameExtension: ".jpg",
        progressParsed: true,
        progressStatus: "end",
        progressPercent: 100,
      };
    },
  };

  function mockRequire(request) {
    if (request === "uxp") {
      return uxpMock;
    }
    if (request === "photoshop") {
      return photoshopMock;
    }
    if (request === "./recorder-scheduler") {
      return require(path.join(repoRoot, "uxp", "recorder-scheduler.js"));
    }
    if (request === "./domain/export-profile") {
      return require(path.join(repoRoot, "uxp", "domain", "export-profile.js"));
    }
    if (request === "./domain/painting-timer") {
      return require(path.join(repoRoot, "uxp", "domain", "painting-timer.js"));
    }
    if (request === "./domain/path-policy") {
      return require(path.join(repoRoot, "uxp", "domain", "path-policy.js"));
    }
    if (request === "./domain/recording-context") {
      return require(path.join(repoRoot, "uxp", "domain", "recording-context.js"));
    }
    if (request === "./domain/recorder-state") {
      return require(path.join(repoRoot, "uxp", "domain", "recorder-state.js"));
    }
    if (request === "./domain/settings-model") {
      return require(path.join(repoRoot, "uxp", "domain", "settings-model.js"));
    }
    if (request === "./services/native-bridge") {
      return {
        writeFrame(metadata, arrayBuffer) {
          return addonMock.write_frame(metadata, arrayBuffer);
        },
        writeStepFrame(metadata, arrayBuffer) {
          return addonMock.write_step_frame(metadata, arrayBuffer);
        },
        scanRecordings(payload) {
          const result = addonMock.scan_recordings(payload);
          assert.strictEqual(result.schema, "ok-record.scan-result.v1");
          return result;
        },
        scanSequence(payload) {
          const result = addonMock.scan_sequence(payload);
          assert.strictEqual(result.schema, "ok-record.sequence-scan-result.v1");
          return result;
        },
        clearRecording(payload) {
          const result = addonMock.clear_recording(payload);
          assert.strictEqual(result.schema, "ok-record.clear-recording-result.v1");
          return result;
        },
        exportSession(payload) {
          const result = addonMock.export_session(payload);
          assert.strictEqual(result.schema, "ok-record.export-result.v1");
          return result;
        },
        exportSequence(payload) {
          const result = addonMock.export_sequence(payload);
          assert.strictEqual(result.schema, "ok-record.export-result.v1");
          return result;
        },
      };
    }
    if (request === "./panel-styles") {
      return require(path.join(repoRoot, "uxp", "panel-styles.js"));
    }
    if (request === "./panel-dom") {
      return require(path.join(repoRoot, "uxp", "panel-dom.js"));
    }
    if (request === "./panel-view") {
      return require(path.join(repoRoot, "uxp", "panel-view.js"));
    }
    if (request === "./status-messages") {
      return require(path.join(repoRoot, "uxp", "status-messages.js"));
    }
    if (request === "ok-record-addon.uxpaddon") {
      return addonMock;
    }
    throw new Error(`Unexpected require: ${request}`);
  }

  const sandbox = {
    require: mockRequire,
    console,
    document,
    Event: MockEvent,
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    confirm: confirmMock,
    alert: alertMock,
    fetch: fetchMock,
  };

  vm.runInNewContext(source, sandbox, { filename: sourcePath });

  assert.strictEqual(setupCalls.length, 1, "UXP main must register entrypoints once");
  const entrypoints = setupCalls[0];
  assert(entrypoints.panels && entrypoints.panels.okRecordPanel, "panel entrypoint must be registered");
  assert.strictEqual(entrypoints.commands, undefined, "Photoshop menu command entrypoints must stay retired");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems.length, 3, "panel flyout menu must expose documentation, download-page, and clear-frame actions");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[0].id, "openDocumentation", "documentation flyout menu item must use a stable id");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[0].label, "文档_Documentation", "documentation flyout menu item must use the requested label");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[1].id, "openUpdateDownloadPage", "download-page flyout menu item must use a stable id");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[1].label, "下载页_Download Page", "download-page flyout menu item must use the requested label");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[2].id, "clearRecordingTimeline", "clear-frame flyout menu item must use a stable id");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[2].label, "清空序列帧_Clear Frames", "clear-frame flyout menu item must use the requested label");
  assert.strictEqual(typeof entrypoints.panels.okRecordPanel.invokeMenu, "function", "panel flyout menu must have an invoke handler");
  entrypoints.panels.okRecordPanel.invokeMenu("openDocumentation");
  await flushMicrotasks();
  assert.strictEqual(openPathCalls.length, 1, "documentation flyout menu must open one path");
  assert(
    openPathCalls[0].openPath.endsWith(path.join("uxp", "docs", "index.html")),
    "documentation flyout menu must open the packaged documentation entry",
  );
  entrypoints.panels.okRecordPanel.invokeMenu("openUpdateDownloadPage");
  await flushMicrotasks();
  assert.strictEqual(openExternalCalls.length, 1, "download-page flyout menu must open one external URL");
  assert.strictEqual(
    openExternalCalls[0].url,
    "https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3",
    "download-page flyout menu must open the current public release before a newer manifest is fetched",
  );

  while (timers.length > 0) {
    const callback = timers.shift();
    callback();
    await flushMicrotasks();
  }
  await flushMicrotasks();

  const panel = document.querySelector(".ok-record-panel");
  assert(panel, "auto panel bootstrap must render the root panel");
  const recordingButton = document.querySelector(".ok-record-record-status-button");
  const manualStepButton = document.querySelector(".ok-record-step-status-button");
  const exportButton = document.querySelector(".ok-record-export-status-button");
  const directoryRows = document.querySelectorAll(".ok-record-directory-row");
  const chooseProjectOutputDirButton = directoryRows[0] && directoryRows[0].querySelector("button");
  const clearRecordingButton = document.querySelector(".ok-record-danger-button");
  assert(recordingButton, "recording status button must render");
  assert(manualStepButton, "manual step button must render");
  assert(exportButton, "export status button must render");
  assert(chooseProjectOutputDirButton, "project save directory button must render");
  assert(clearRecordingButton, "visible clear sequence-frame button must render");
  assert(exportButton.classList.contains("ok-record-control-button"), "export status button must use the same control surface as recording status buttons");
  assert.strictEqual(exportButton.querySelector(".ok-record-export-indicator"), null, "export status button must not render an idle status dot in the live panel");
  assert(document.querySelector(".ok-record-timer-status-button"), "painting timer status button must render");
  const documentationButton = document.querySelector(".ok-record-documentation-button");
  assert.strictEqual(documentationButton, null, "visible local documentation button must not render");
  assert(document.querySelector(".ok-record-export-notice"), "export notice panel must render");
  assert(document.querySelectorAll(".ok-record-group").length >= 3, "panel must render the expected control groups");
  assert(document.querySelectorAll("select").length >= 2, "quality and resolution selectors must render");
  assert(addonCalls.scanRecordings >= 1, "panel show must scan recording sessions through native");
  assert(addonCalls.scanSequence >= 1, "panel show must scan the step-image sequence through native");
  assert.strictEqual(openPathCalls.length, 1, "only the panel flyout documentation action should open documentation");
  assert.strictEqual(fetchCalls.length, 1, "panel show must fetch the static update manifest once");
  assert.strictEqual(fetchCalls[0], "https://xbadbrushx.github.io/OK-Record/update.json", "panel update check must read the GitHub Pages update manifest");
  assert.strictEqual(document.querySelector(".ok-record-export-notice-title").textContent, "发现新版本 1.0.3", "newer update manifest must show an update notice");
  assert(document.querySelector(".ok-record-export-notice-body").textContent.includes("当前版本：1.0.0"), "update notice must show the installed plugin version");
  assert(document.querySelector(".ok-record-export-notice-body").textContent.includes("网盘：https://pan.example.com/ok-record"), "update notice must include the configured netdisk URL");
  assert(document.querySelector(".ok-record-export-notice-body").textContent.includes("面板菜单：下载页_Download Page"), "update notice must point users to the download-page menu action");
  const updateBadgeRow = document.querySelector(".ok-record-update-badge-row");
  const updateBadgeButton = document.querySelector(".ok-record-update-badge");
  assert(updateBadgeRow.classList.contains("ok-record-update-badge-row-visible"), "newer update manifest must show the top-right update badge");
  assert.strictEqual(updateBadgeButton.querySelector(".ok-record-button-label").textContent, "可更新", "update badge must use the requested visible label");
  assert.strictEqual(updateBadgeButton.disabled, false, "visible update badge must be clickable");

  updateBadgeButton.dispatchEvent(new MockEvent("click"));
  await flushMicrotasks();
  const updateDialog = document.querySelector(".ok-record-update-dialog");
  assert(updateDialog.classList.contains("ok-record-update-dialog-visible"), "clicking the update badge must show the download dialog");
  assert.strictEqual(document.querySelector(".ok-record-update-dialog-title").textContent, "发现新版本 1.0.3", "update dialog must show the latest version");
  assert(document.querySelector(".ok-record-update-dialog-version").textContent.includes("当前版本：1.0.0"), "update dialog must show the installed plugin version");
  assert.strictEqual(document.querySelector(".ok-record-update-dialog-summary").textContent, "测试更新提醒", "update dialog must show the update summary");
  const updateLinkButtons = document.querySelectorAll(".ok-record-update-link-button");
  assert.strictEqual(updateLinkButtons.length, 2, "update dialog must offer GitHub and netdisk download entries");
  assert.strictEqual(updateLinkButtons[0].querySelector(".ok-record-button-label").textContent, "GitHub", "first update dialog link must be GitHub");
  assert.strictEqual(updateLinkButtons[1].querySelector(".ok-record-button-label").textContent, "网盘", "second update dialog link must be netdisk");
  assert.strictEqual(updateLinkButtons[1].disabled, false, "netdisk link button must be enabled when update.json provides netdiskUrl");

  updateLinkButtons[0].dispatchEvent(new MockEvent("click"));
  await flushMicrotasks();
  assert.strictEqual(openExternalCalls.length, 2, "GitHub update dialog button must open one external URL");
  assert.strictEqual(openExternalCalls[1].url, "https://github.com/xBADBRUSHx/OK-Record/releases/tag/v1.0.3", "GitHub update dialog button must open the release page");
  assert(!updateDialog.classList.contains("ok-record-update-dialog-visible"), "successful external-link open must hide the update dialog");

  updateBadgeButton.dispatchEvent(new MockEvent("click"));
  await flushMicrotasks();
  updateLinkButtons[1].dispatchEvent(new MockEvent("click"));
  await flushMicrotasks();
  assert.strictEqual(openExternalCalls.length, 3, "netdisk update dialog button must open one external URL");
  assert.strictEqual(openExternalCalls[2].url, "https://pan.example.com/ok-record", "netdisk update dialog button must open the configured netdisk URL");

  const numberInputs = document.querySelectorAll(".ok-record-number-input");
  assert(numberInputs.length >= 4, "panel must render recording scheduler numeric inputs");
  assert.strictEqual(numberInputs[0].value, "2", "default sampling interval must initialize to 2 seconds");
  assert.strictEqual(numberInputs[1].value, "0", "default delayed sampling must initialize to 0 seconds");
  assert.strictEqual(numberInputs[2].value, "5", "default idle max wait must initialize to 5 seconds");
  assert.strictEqual(numberInputs[3].value, "10", "default painting timer idle pause must initialize to 10 seconds");
  assert.strictEqual(numberInputs[4].value, "0.1", "default per-frame hold must initialize to 0.1 seconds");
  numberInputs[0].value = "0";
  numberInputs[0].dispatchEvent(new MockEvent("change"));
  assert.strictEqual(numberInputs[0].value, "1", "zero sampling interval must clamp back to the 1 second minimum");
  numberInputs[1].value = "0.1";

  const savedDocumentPath = photoshopMock.app.activeDocument.path;
  photoshopMock.app.activeDocument.path = "";
  recordingButton.dispatchEvent(new MockEvent("pointerdown"));
  recordingButton.dispatchEvent(new MockEvent("click"));
  await flushMicrotasks();
  assert.strictEqual(writeFrameCount, 0, "unsaved Photoshop documents must not start recording");
  assert.strictEqual(recordingButton.querySelector(".ok-record-record-text").textContent, "录制失败", "unsaved recording failure must update the recording button label");
  assert.strictEqual(document.querySelector(".ok-record-export-notice-title").textContent, "开始录制失败", "unsaved recording must show a failure notice title");
  assert(
    document.querySelector(".ok-record-export-notice-body").textContent.includes("请先保存 Photoshop 文档为本地 PSD/PSB 文件"),
    "unsaved recording failure notice must tell users to save the PSD/PSB first",
  );
  assert(alertMessages[0].includes("开始录制失败"), "unsaved recording failure must show a blocking alert title");
  assert(alertMessages[0].includes("请先保存 Photoshop 文档为本地 PSD/PSB 文件"), "unsaved recording failure alert must include the saved-document guidance");
  photoshopMock.app.activeDocument.path = savedDocumentPath;

  entrypoints.panels.okRecordPanel.invokeMenu("clearRecordingTimeline");
  await waitForCondition(() => addonCalls.clearRecording === 1, "panel flyout menu must clear sequence frames after confirmation");
  assert.strictEqual(writeFrameCount, 0, "clear menu action must not start recording");
  assert(confirmMessages[0].includes("确定要清空当前序列帧吗"), "clear menu action must require a confirmation dialog");

  clearRecordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => addonCalls.clearRecording === 2, "visible clear button must clear sequence frames after confirmation");
  assert.strictEqual(writeFrameCount, 0, "visible clear button must not start recording");
  assert(confirmMessages[1].includes("确定要清空当前序列帧吗"), "visible clear button must require a confirmation dialog");

  const manualProjectOutputDir = path.join(repoRoot, "tests", "out", "manual-project");
  folderSelections.push({
    isFolder: true,
    name: "manual-project",
    nativePath: manualProjectOutputDir,
  });
  chooseProjectOutputDirButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => folderSelections.length === 0, "manual OK-Record project folder picker must be consumed");

  photoshopMock.app.activeDocument.saved = false;
  recordingButton.dispatchEvent(new MockEvent("pointerdown", { altKey: true, ctrlKey: true, shiftKey: true }));
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => writeFrameCount === 1, "Ctrl+Shift+Alt recording click must behave as an ordinary recording click");
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-record-text").textContent === "录制中 1 帧",
    "initial recording must settle before pause checks",
  );
  assert.strictEqual(writeFrameOutputDirs[0], manualProjectOutputDir, "the current PSD must use the manually selected OK-Record project directory");
  assert.strictEqual(addonCalls.clearRecording, 2, "Ctrl+Shift+Alt recording click must not clear sequence frames");
  assert.strictEqual(chooseProjectOutputDirButton.disabled, true, "project save directory button must stay disabled while recording");
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-record-text").textContent === "暂停录制 1 帧",
    "recording button must settle into paused state",
  );
  assert.strictEqual(chooseProjectOutputDirButton.disabled, false, "project save directory button must be available while recording is paused");
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-record-text").textContent === "录制中 1 帧",
    "recording button must settle after resume",
  );
  assert.strictEqual(chooseProjectOutputDirButton.disabled, true, "project save directory button must disable again after resume");
  assert(idleListenerCalls.add >= 1, "recording with idle capture delay must register the idle listener");
  assert(idleListenerCalls.idleTimes.includes(0.1), "recording must configure the requested idle capture delay");

  failStepWrite = true;
  manualStepButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(
    () => idleListenerCalls.remove >= 1,
    "manual capture failure while recording must release the idle listener",
  );
  assert.strictEqual(
    idleListenerCalls.idleTimes[idleListenerCalls.idleTimes.length - 1],
    0,
    "manual capture failure while recording must reset the Photoshop idle timeout",
  );
  assert(alertMessages.some((message) => message.includes("手动采样失败") && message.includes("forced step write failure")), "manual step failure must show a blocking alert with the error details");

  failStepWrite = false;
  timers.length = 0;
  photoshopMock.app.activeDocument.path = savedDocumentPath;
  photoshopMock.app.activeDocument.id = 1;
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => writeFrameCount === 2, "recording can restart from an existing saved PSD with unsaved canvas edits");
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-record-text").textContent === "录制中 2 帧",
    "recording restart must refresh the recording button before close-event checks",
  );
  const documentCloseListener = actionListeners.find((entry) => Array.isArray(entry.events) && entry.events.includes("close"));
  assert(documentCloseListener, "recording must subscribe to Photoshop document close events");
  documentCloseListener.listener("close", {});
  await flushMicrotasks();
  assert.strictEqual(
    recordingButton.querySelector(".ok-record-record-text").textContent,
    "录制中 2 帧",
    "closing an unrelated Photoshop document must not stop the active recording document",
  );
  photoshopMock.app.activeDocument.path = path.join(repoRoot, "tests", "out", "other.psd");
  photoshopMock.app.activeDocument.id = 2;
  openDocumentIds.add(2);
  documentCloseListener.listener("close", {});
  await flushMicrotasks();
  assert.strictEqual(
    recordingButton.querySelector(".ok-record-record-text").textContent,
    "录制中 2 帧",
    "closing an unrelated Photoshop document while another document is active must not stop the locked recording document",
  );
  openDocumentIds.delete(1);
  documentCloseListener.listener("close", {});
  await flushMicrotasks();
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-button-label").textContent === "开始录制",
    "closing the PSD while recording must end the recording immediately",
  );
  while (timers.length > 0) {
    const staleTimer = timers.shift();
    staleTimer();
    await flushMicrotasks();
  }
  assert.strictEqual(writeFrameCount, 2, "stale scheduled capture after document close must not write a new frame");

  numberInputs[1].value = "0";
  numberInputs[1].dispatchEvent(new MockEvent("change"));
  const newSavedDocumentPath = path.join(repoRoot, "tests", "out", "new.psd");
  const newSavedDocumentDefaultOutputDir = path.join(repoRoot, "tests", "out", "OK-Record_new");
  photoshopMock.app.activeDocument.path = newSavedDocumentPath;
  photoshopMock.app.activeDocument.id = 3;
  openDocumentIds.add(3);
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => writeFrameCount === 3, "a newly saved PSD can start recording after a previous PSD close");
  assert.strictEqual(writeFrameOutputDirs[writeFrameOutputDirs.length - 1], newSavedDocumentDefaultOutputDir, "a newly saved PSD must use its own default OK-Record directory instead of the previous PSD manual directory");

  const documentChangeListener = actionListeners.find((entry) => Array.isArray(entry.events) && entry.events.includes("paint"));
  assert(documentChangeListener, "recording must subscribe to Photoshop document change events");
  documentChangeListener.listener("paint", {});
  await flushMicrotasks();
  await waitForCondition(() => timers.length > 0, "recording restart must schedule a timed capture for host-modal deferral coverage");
  const hostModalScheduledCapture = timers.shift();
  assert(hostModalScheduledCapture, "recording restart must schedule a timed capture for host-modal deferral coverage");
  const alertCountBeforeHostModal = alertMessages.length;
  hostModalFailureCount = 1;
  hostModalScheduledCapture();
  await flushMicrotasks();
  assert.strictEqual(writeFrameCount, 3, "host-modal collision during timed capture must not write a partial frame");
  assert.strictEqual(alertMessages.length, alertCountBeforeHostModal, "host-modal collision during timed capture must not show a blocking failure alert");
  assert(timers.length > 0, "host-modal collision during timed capture must schedule a short retry");
  await runNextTimer("host-modal deferred timed capture must retry after Photoshop leaves modal state");
  await waitForCondition(() => writeFrameCount === 4, "host-modal deferred timed capture must write on retry");
  assert(
    executeAsModalOptions.some((options) => options.timeOut === 1),
    "Photoshop 25.10+ capture modal calls must pass the executeAsModal timeOut option",
  );

  await waitForCondition(() => timers.length > 0, "host-modal retry success must schedule the next timed capture");
  photoshopMock.app.activeDocument.path = path.join(repoRoot, "tests", "out", "other.psd");
  photoshopMock.app.activeDocument.id = 2;
  const scheduledCapture = timers.shift();
  assert(scheduledCapture, "recording restart must schedule the next timed capture");
  scheduledCapture();
  await flushMicrotasks();
  assert.strictEqual(writeFrameCount, 4, "switching Photoshop documents while recording must not write into the locked timeline");
  assert.strictEqual(document.querySelector(".ok-record-export-notice-title").textContent, "定时采样失败", "document-switch failure must show a capture failure notice");
  assert(alertMessages.some((message) => message.includes("定时采样失败") && message.includes("当前 Photoshop 文档已经变化")), "timed recording failure must show a blocking alert with the document-change error");

  photoshopMock.app.activeDocument.path = newSavedDocumentPath;
  photoshopMock.app.activeDocument.id = 3;
  await waitForCondition(() => exportButton.disabled === false, "export button must re-enable after the recording failure settles");
  assert.strictEqual(exportButton.getAttribute("aria-disabled"), "false", "export button aria-disabled must clear before export");
  assert((exportButton.eventListeners.get("click") || []).length > 0, "export button must retain its click listener");
  exportButton.dispatchEvent(new MockEvent("click"));
  await runNextTimer("export success must wait for the render-delay timer");
  await waitForCondition(() => addonCalls.exportSession + addonCalls.exportSequence === 1, "export button must call a native exporter");
  assert(alertMessages[alertMessages.length - 1].includes("导出完成"), "export success must show a blocking alert title");
  assert(alertMessages[alertMessages.length - 1].includes("输出路径："), "export success alert must include the output path");

  failExportSession = true;
  exportButton.dispatchEvent(new MockEvent("click"));
  await runNextTimer("export failure must wait for the render-delay timer");
  await waitForCondition(() => addonCalls.exportSession + addonCalls.exportSequence === 2, "export button must call a native exporter again for failure coverage");
  assert(alertMessages[alertMessages.length - 1].includes("导出失败"), "export failure must show a blocking alert title");
  assert(alertMessages[alertMessages.length - 1].includes("forced export failure"), "export failure alert must include the native error details");

  failExportSession = false;
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => writeFrameCount === 5, "recording can restart after export failure");
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-record-text").textContent === "录制中 5 帧",
    "recording after export failure must settle before paused directory selection",
  );
  recordingButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(
    () => recordingButton.querySelector(".ok-record-record-text").textContent === "暂停录制 5 帧",
    "recording must pause before choosing a new project directory",
  );
  assert.strictEqual(chooseProjectOutputDirButton.disabled, false, "paused recording must allow choosing a new OK-Record project directory");
  folderSelections.push({
    isFolder: true,
    name: "paused-project",
    nativePath: path.join(repoRoot, "tests", "out", "paused-project"),
  });
  chooseProjectOutputDirButton.dispatchEvent(new MockEvent("click"));
  await waitForCondition(() => folderSelections.length === 0, "paused directory selection must consume the folder picker");
  assert.strictEqual(
    recordingButton.querySelector(".ok-record-button-label").textContent,
    "开始录制",
    "choosing a project directory while paused must end the paused recording state",
  );

  entrypoints.panels.okRecordPanel.show();
  await flushMicrotasks();
  assert.strictEqual(document.querySelectorAll(".ok-record-panel").length, 1, "panel show must rerender one root panel");
  assert.strictEqual(fetchCalls.length, 1, "panel show must not refetch after a newer update was already found");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
