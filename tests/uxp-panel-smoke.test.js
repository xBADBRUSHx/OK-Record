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
  let writeFrameCount = 0;
  let failStepWrite = false;
  const confirmMock = (message) => {
    confirmMessages.push(String(message || ""));
    return true;
  };
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
      plugin: "0.1.3",
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
          version: "0.1.4",
          releasePageUrl: "https://github.com/xBADBRUSHx/OK-Record/releases/tag/win-ok-record-2026-06-03",
          downloadUrl: "https://github.com/xBADBRUSHx/OK-Record/releases/download/win-ok-record-2026-06-03/OK-Record_20260603_with-ffmpeg.ccx",
          summary: "测试更新提醒",
        };
      },
    };
  }
  const photoshopMock = {
    action: {
      async addNotificationListener() {},
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
      writeFrameCount += 1;
      const sessionId = metadata.sessionId || "Timeline";
      const frameIndex = writeFrameCount;
      const frameName = `frame_${String(frameIndex).padStart(6, "0")}`;
      const recordingRoot = path.join(dataFolder.nativePath, "延时录制_Recordings");
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
        framePath: path.join(dataFolder.nativePath, "步骤图_Steps", "step_001.png"),
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
    fetch: fetchMock,
  };

  vm.runInNewContext(source, sandbox, { filename: sourcePath });

  assert.strictEqual(setupCalls.length, 1, "UXP main must register entrypoints once");
  const entrypoints = setupCalls[0];
  assert(entrypoints.panels && entrypoints.panels.okRecordPanel, "panel entrypoint must be registered");
  assert.strictEqual(entrypoints.commands, undefined, "Photoshop menu command entrypoints must stay retired");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems.length, 2, "panel flyout menu must expose documentation and download-page actions");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[0].id, "openDocumentation", "documentation flyout menu item must use a stable id");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[0].label, "文档_Documentation", "documentation flyout menu item must use the requested label");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[1].id, "openUpdateDownloadPage", "download-page flyout menu item must use a stable id");
  assert.strictEqual(entrypoints.panels.okRecordPanel.menuItems[1].label, "下载页_Download Page", "download-page flyout menu item must use the requested label");
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
    "https://github.com/xBADBRUSHx/OK-Record/releases/tag/win-ok-record-2026-06-02-r2",
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
  assert(recordingButton, "recording status button must render");
  assert(manualStepButton, "manual step button must render");
  assert(exportButton, "export status button must render");
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
  assert.strictEqual(document.querySelector(".ok-record-export-notice-title").textContent, "发现新版本 0.1.4", "newer update manifest must show an update notice");
  assert(document.querySelector(".ok-record-export-notice-body").textContent.includes("当前版本：0.1.3"), "update notice must show the installed plugin version");
  assert(document.querySelector(".ok-record-export-notice-body").textContent.includes("面板菜单：下载页_Download Page"), "update notice must point users to the download-page menu action");

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
  recordingButton.dispatchEvent(new MockEvent("click", { altKey: true, ctrlKey: true, shiftKey: true }));
  await waitForCondition(() => addonCalls.clearRecording === 1, "Ctrl+Shift+Alt click must clear sequence frames after confirmation");
  assert.strictEqual(writeFrameCount, 0, "clear shortcut must not start recording");
  assert(confirmMessages[0].includes("确定要清空当前序列帧吗"), "clear shortcut must require a confirmation dialog");

  recordingButton.dispatchEvent(new MockEvent("click", { altKey: true }));
  await waitForCondition(() => writeFrameCount === 1, "start recording must write the initial frame");
  assert.strictEqual(addonCalls.clearRecording, 1, "Alt-only recording click must not clear sequence frames");
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

  entrypoints.panels.okRecordPanel.show();
  await flushMicrotasks();
  assert.strictEqual(document.querySelectorAll(".ok-record-panel").length, 1, "panel show must rerender one root panel");
  assert.strictEqual(fetchCalls.length, 1, "panel show must not refetch after a newer update was already found");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
