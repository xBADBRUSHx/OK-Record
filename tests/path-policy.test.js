"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const pathPolicy = require(path.join(repoRoot, "uxp", "domain", "path-policy.js"));

assert.strictEqual(pathPolicy.RECORDINGS_ROOT_DIR_NAME, contract.sessionLayout.rootDirName);
assert.strictEqual(pathPolicy.DOCUMENT_PROJECT_DIR_SUFFIX, contract.projectLayout.documentProjectDirSuffix);
assert.strictEqual(pathPolicy.DEFAULT_STEP_OUTPUT_DIR_NAME, contract.stepFrame.defaultDirName);

assert.strictEqual(pathPolicy.isLocalDocumentNativePath("C:\\Art\\file.psd"), true);
assert.strictEqual(pathPolicy.isLocalDocumentNativePath("\\\\NAS\\Share\\file.psd"), true);
assert.strictEqual(pathPolicy.isLocalDocumentNativePath("/Users/name/file.psd"), true);
assert.strictEqual(pathPolicy.isLocalDocumentNativePath("cloud://file.psd"), false);
assert.strictEqual(pathPolicy.isLocalDocumentNativePath(""), false);

assert.strictEqual(
  pathPolicy.getLocalDocumentParentDirNativePath("E:\\BADBRUSH\\Paint\\image.psd"),
  "E:\\BADBRUSH\\Paint",
  "saved Windows documents should route default output beside the document",
);

assert.strictEqual(
  pathPolicy.getLocalDocumentParentDirNativePath("/Users/badbrush/Paint/image.psd"),
  "/Users/badbrush/Paint",
  "saved POSIX documents should route default output beside the document",
);

assert.strictEqual(
  pathPolicy.resolveRecorderOutputDir({
    manualFrameOutputDir: "D:\\Manual",
    activeDocumentPath: "E:\\Doc\\image.psd",
    pluginDataDir: "C:\\PluginData",
  }),
  "D:\\Manual",
  "manual sequence frame folder has highest priority",
);

assert.strictEqual(
  pathPolicy.resolveRecorderOutputDir({
    activeDocumentPath: "E:\\Doc\\image.psd",
    pluginDataDir: "C:\\PluginData",
  }),
  "E:\\Doc\\image-OK-Record",
  "saved Photoshop document project folder is the second priority",
);

assert.strictEqual(
  pathPolicy.resolveRecorderOutputDir({
    activeDocumentPath: "",
    pluginDataDir: "C:\\PluginData",
  }),
  "C:\\PluginData",
  "plugin data folder is the final fallback",
);

assert.strictEqual(
  pathPolicy.resolveRecorderOutputDir({
    activeDocumentPath: "cloud://document.psd",
    pluginDataDir: "C:\\PluginData",
  }),
  "C:\\PluginData",
  "cloud or unsaved Photoshop document identifiers should fall back to plugin data",
);

assert.strictEqual(
  pathPolicy.resolveRecordingsRootDir({
    activeDocumentPath: "E:\\Doc\\image.psd",
    pluginDataDir: "C:\\PluginData",
  }),
  "E:\\Doc\\image-OK-Record\\延时录制_Recordings",
  "recordings root should use the bilingual root directory",
);

assert.strictEqual(
  pathPolicy.getLocalDocumentProjectRootNativePath("E:\\Doc\\character.final.psd"),
  "E:\\Doc\\character.final-OK-Record",
  "document project root should use the PSD basename without the final extension",
);

assert.strictEqual(
  pathPolicy.resolveStepOutputDir({ manualStepOutputDir: "D:\\Steps", recorderOutputDir: "E:\\Doc" }),
  "D:\\Steps\\步骤图_Steps",
  "manual step image folder should create the stable Steps child under the selected folder",
);

assert.strictEqual(
  pathPolicy.resolveStepOutputDir({ recorderOutputDir: "E:\\Doc" }),
  "E:\\Doc\\步骤图_Steps",
  "step image folder should default under the recorder output root",
);
