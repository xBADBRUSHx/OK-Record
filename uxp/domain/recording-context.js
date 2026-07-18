"use strict";

const pathPolicy = require("./path-policy");

const UNSAVED_DOCUMENT_RECORDING_MESSAGE = "开始录制前请先保存 Photoshop 文档为本地 PSD/PSB 文件。保存后重新点击开始录制。";
const DOCUMENT_CONTEXT_CHANGED_MESSAGE = "当前 Photoshop 文档已经变化，录制已停止。请切回开始录制时的本地 PSD/PSB 文档后再继续。";
const DOCUMENT_CONTEXT_UNAVAILABLE_MESSAGE = "当前 Photoshop 文档暂时不可用，录制已停止。请确认录制文档仍然打开并处于活动状态后再继续。";
const SUPPORTED_DOCUMENT_EXTENSIONS = Object.freeze([".psd", ".psb"]);
const RECORDING_CONTINUITY_STATES = Object.freeze({
  current: "current",
  closed: "closed",
  changed: "changed",
  unavailable: "unavailable",
});

function normalizeNativePath(value) {
  return String(value || "").trim().replace(/[\\/]+$/, "");
}

function normalizePathKey(value) {
  const normalizedPath = normalizeNativePath(value);
  if (!normalizedPath) {
    return "";
  }
  if (/^[A-Za-z]:[\\/]/.test(normalizedPath) || /^\\\\/.test(normalizedPath)) {
    return normalizedPath.replace(/\//g, "\\").toLowerCase();
  }
  return normalizedPath.replace(/\\/g, "/");
}

function getNativeExtension(nativePath) {
  const basename = pathPolicy.getNativeBasename(nativePath);
  const extensionIndex = basename.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return "";
  }
  return basename.slice(extensionIndex).toLowerCase();
}

function isSupportedLocalDocumentPath(documentPath) {
  const nativePath = normalizeNativePath(documentPath);
  return pathPolicy.isLocalDocumentNativePath(nativePath) &&
    SUPPORTED_DOCUMENT_EXTENSIONS.includes(getNativeExtension(nativePath));
}

function createDocumentIdentity(input = {}) {
  const documentPath = normalizeNativePath(input.documentPath);
  const documentId = input.documentId === undefined || input.documentId === null ? "" : String(input.documentId);
  const cloudDocument = Boolean(input.cloudDocument);
  const documentAvailable = input.documentAvailable === undefined ?
    Boolean(documentId || documentPath || cloudDocument) :
    Boolean(input.documentAvailable);
  if (!documentAvailable) {
    return {
      ok: false,
      reason: "no-active-document",
      message: UNSAVED_DOCUMENT_RECORDING_MESSAGE,
      documentPath: "",
      documentKey: "",
      documentId: "",
    };
  }
  if (cloudDocument || !isSupportedLocalDocumentPath(documentPath)) {
    return {
      ok: false,
      reason: "local-psd-psb-required",
      message: UNSAVED_DOCUMENT_RECORDING_MESSAGE,
      documentPath,
      documentKey: "",
      documentId,
    };
  }

  return {
    ok: true,
    reason: "",
    message: "",
    documentPath,
    documentKey: normalizePathKey(documentPath),
    documentId,
  };
}

function createRecordingContext(input = {}) {
  const identity = createDocumentIdentity(input);
  if (!identity.ok) {
    return identity;
  }

  const automaticProjectOutputDir = pathPolicy.getLocalDocumentProjectRootNativePath(identity.documentPath);
  const manualProjectOutputDir = normalizeNativePath(input.manualProjectOutputDir);
  const manualProjectOutputDocumentKey = normalizePathKey(input.manualProjectOutputDocumentKey);
  const hasManualProjectOutputDir = Boolean(manualProjectOutputDir) &&
    manualProjectOutputDocumentKey &&
    manualProjectOutputDocumentKey === identity.documentKey &&
    normalizePathKey(manualProjectOutputDir) !== normalizePathKey(automaticProjectOutputDir);
  const outputDir = hasManualProjectOutputDir ? manualProjectOutputDir : automaticProjectOutputDir;

  if (!outputDir) {
    return {
      ...identity,
      ok: false,
      reason: "recording-output-dir-unresolved",
      message: UNSAVED_DOCUMENT_RECORDING_MESSAGE,
    };
  }

  return {
    ...identity,
    outputDir,
    outputDirKey: normalizePathKey(outputDir),
    recordingsRootDir: pathPolicy.joinNativePath(outputDir, pathPolicy.RECORDINGS_ROOT_DIR_NAME),
    stepOutputDir: pathPolicy.joinNativePath(outputDir, pathPolicy.DEFAULT_STEP_OUTPUT_DIR_NAME),
    automaticProjectOutputDir,
    manualProjectOutputDir: hasManualProjectOutputDir ? manualProjectOutputDir : "",
    manualProjectOutputDocumentKey: hasManualProjectOutputDir ? manualProjectOutputDocumentKey : "",
  };
}

function requireRecordingContext(input = {}) {
  const context = createRecordingContext(input);
  if (!context.ok) {
    throw new Error(context.message);
  }
  return context;
}

function createManualProjectOutputBinding(input = {}) {
  const context = requireRecordingContext(input);
  const outputDir = normalizeNativePath(input.outputDir);
  if (!outputDir) {
    throw new Error("无法解析所选 OK-Record 保存目录 native 路径");
  }
  const selectedIsAutomatic = normalizePathKey(outputDir) === normalizePathKey(context.automaticProjectOutputDir);
  return {
    frameOutputDir: selectedIsAutomatic ? "" : outputDir,
    frameOutputDocumentKey: selectedIsAutomatic ? "" : context.documentKey,
    restoredAutomaticProjectOutputDir: selectedIsAutomatic,
  };
}

function isSameRecordingContext(left, right) {
  return Boolean(
    left &&
    right &&
    left.documentKey &&
    right.documentKey &&
    left.documentKey === right.documentKey &&
    normalizePathKey(left.outputDir) === normalizePathKey(right.outputDir),
  );
}

function classifyRecordingContinuity(input = {}) {
  const activeContext = input.activeContext;
  const currentContext = input.currentContext;
  if (!activeContext || !activeContext.documentKey) {
    return {
      state: RECORDING_CONTINUITY_STATES.unavailable,
      reason: "active-recording-context-missing",
      context: null,
    };
  }
  if (input.activeDocumentReferenceOpen === false) {
    return {
      state: RECORDING_CONTINUITY_STATES.closed,
      reason: "active-recording-document-closed",
      context: null,
    };
  }
  if (input.activeDocumentReferenceOpen !== true) {
    return {
      state: RECORDING_CONTINUITY_STATES.unavailable,
      reason: "active-recording-document-reference-unavailable",
      context: null,
    };
  }
  if (currentContext && currentContext.ok) {
    if (isSameRecordingContext(activeContext, currentContext)) {
      return {
        state: RECORDING_CONTINUITY_STATES.current,
        reason: "",
        context: activeContext,
      };
    }
    return {
      state: RECORDING_CONTINUITY_STATES.changed,
      reason: "active-recording-context-changed",
      context: null,
    };
  }
  if (currentContext && currentContext.reason === "no-active-document") {
    return {
      state: RECORDING_CONTINUITY_STATES.unavailable,
      reason: currentContext.reason,
      context: null,
    };
  }
  return {
    state: RECORDING_CONTINUITY_STATES.changed,
    reason: currentContext && currentContext.reason ? currentContext.reason : "active-recording-context-changed",
    context: null,
  };
}

function isSessionForRecordingContext(session, context) {
  return Boolean(
    session &&
    context &&
    session.outputDir &&
    context.outputDir &&
    normalizePathKey(session.outputDir) === normalizePathKey(context.outputDir),
  );
}

function applyRecordingContextToSession(session, context) {
  return {
    ...session,
    documentPath: context.documentPath,
    documentKey: context.documentKey,
    documentId: context.documentId,
    outputDir: context.outputDir,
  };
}

module.exports = {
  DOCUMENT_CONTEXT_CHANGED_MESSAGE,
  DOCUMENT_CONTEXT_UNAVAILABLE_MESSAGE,
  RECORDING_CONTINUITY_STATES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
  UNSAVED_DOCUMENT_RECORDING_MESSAGE,
  applyRecordingContextToSession,
  classifyRecordingContinuity,
  createDocumentIdentity,
  createManualProjectOutputBinding,
  createRecordingContext,
  isSameRecordingContext,
  isSessionForRecordingContext,
  isSupportedLocalDocumentPath,
  normalizePathKey,
  requireRecordingContext,
};
