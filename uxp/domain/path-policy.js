"use strict";

const RECORDINGS_ROOT_DIR_NAME = "延时录制_Recordings";
const DEFAULT_STEP_OUTPUT_DIR_NAME = "步骤图_Steps";
const DOCUMENT_PROJECT_DIR_SUFFIX = "-OK-Record";

function normalizeNativePath(value) {
  return String(value || "").trim();
}

function isLocalDocumentNativePath(nativePath) {
  const normalizedPath = normalizeNativePath(nativePath);
  return /^[A-Za-z]:[\\/]/.test(normalizedPath) ||
    /^\\\\[^\\/]+[\\/][^\\/]+/.test(normalizedPath) ||
    /^\//.test(normalizedPath);
}

function getNativeDirname(nativePath) {
  const normalizedPath = normalizeNativePath(nativePath).replace(/[\\/]+$/, "");
  const separatorIndex = Math.max(normalizedPath.lastIndexOf("\\"), normalizedPath.lastIndexOf("/"));
  if (separatorIndex <= 0) {
    return "";
  }
  return normalizedPath.slice(0, separatorIndex);
}

function getNativeBasename(nativePath) {
  const normalizedPath = normalizeNativePath(nativePath).replace(/[\\/]+$/, "");
  const separatorIndex = Math.max(normalizedPath.lastIndexOf("\\"), normalizedPath.lastIndexOf("/"));
  return separatorIndex >= 0 ? normalizedPath.slice(separatorIndex + 1) : normalizedPath;
}

function getNativeBasenameWithoutExtension(nativePath) {
  const basename = getNativeBasename(nativePath);
  const extensionIndex = basename.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return basename;
  }
  return basename.slice(0, extensionIndex);
}

function getLocalDocumentParentDirNativePath(documentPath) {
  const nativePath = normalizeNativePath(documentPath);
  if (!isLocalDocumentNativePath(nativePath)) {
    return "";
  }
  return getNativeDirname(nativePath);
}

function getLocalDocumentProjectRootNativePath(documentPath) {
  const nativePath = normalizeNativePath(documentPath);
  if (!isLocalDocumentNativePath(nativePath)) {
    return "";
  }

  const documentDir = getNativeDirname(nativePath);
  const documentName = getNativeBasenameWithoutExtension(nativePath);
  if (!documentDir || !documentName) {
    return "";
  }
  return joinNativePath(documentDir, `${documentName}${DOCUMENT_PROJECT_DIR_SUFFIX}`);
}

function getPathSeparator(basePath) {
  return String(basePath || "").includes("\\") ? "\\" : "/";
}

function joinNativePath(basePath, childName) {
  const base = normalizeNativePath(basePath);
  const child = String(childName || "").trim();
  if (!base) {
    return child;
  }
  if (!child) {
    return base;
  }
  return `${base.replace(/[\\/]+$/, "")}${getPathSeparator(base)}${child.replace(/^[\\/]+/, "")}`;
}

function resolveRecorderOutputDir({ manualFrameOutputDir = "", activeDocumentPath = "", pluginDataDir = "" } = {}) {
  const manualDir = normalizeNativePath(manualFrameOutputDir);
  if (manualDir) {
    return manualDir;
  }

  const documentProjectRoot = getLocalDocumentProjectRootNativePath(activeDocumentPath);
  if (documentProjectRoot) {
    return documentProjectRoot;
  }

  return normalizeNativePath(pluginDataDir);
}

function resolveRecordingsRootDir(options = {}) {
  return joinNativePath(resolveRecorderOutputDir(options), RECORDINGS_ROOT_DIR_NAME);
}

function resolveStepOutputDir({ manualStepOutputDir = "", recorderOutputDir = "" } = {}) {
  const manualDir = normalizeNativePath(manualStepOutputDir);
  if (manualDir) {
    return manualDir;
  }
  return joinNativePath(recorderOutputDir, DEFAULT_STEP_OUTPUT_DIR_NAME);
}

module.exports = {
  DEFAULT_STEP_OUTPUT_DIR_NAME,
  DOCUMENT_PROJECT_DIR_SUFFIX,
  RECORDINGS_ROOT_DIR_NAME,
  getLocalDocumentProjectRootNativePath,
  getLocalDocumentParentDirNativePath,
  getNativeBasename,
  getNativeBasenameWithoutExtension,
  getNativeDirname,
  isLocalDocumentNativePath,
  joinNativePath,
  resolveRecorderOutputDir,
  resolveRecordingsRootDir,
  resolveStepOutputDir,
};
