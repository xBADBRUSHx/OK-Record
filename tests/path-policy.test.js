"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const pathPolicy = require(path.join(repoRoot, "uxp", "domain", "path-policy.js"));

assert.strictEqual(pathPolicy.RECORDINGS_ROOT_DIR_NAME, contract.sessionLayout.rootDirName);
assert.strictEqual(pathPolicy.DOCUMENT_PROJECT_DIR_PREFIX, contract.projectLayout.documentProjectDirPrefix);
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
    activeDocumentPath: "E:\\Doc\\image.psd",
  }),
  "E:\\Doc\\OK-Record_image",
  "saved Photoshop document project folder is the path-policy recording root",
);

assert.strictEqual(
  pathPolicy.resolveRecorderOutputDir({
    activeDocumentPath: "",
  }),
  "",
  "missing document context must not fall back to plugin data for recording",
);

assert.strictEqual(
  pathPolicy.resolveRecorderOutputDir({
    activeDocumentPath: "cloud://document.psd",
  }),
  "",
  "cloud or unsaved Photoshop document identifiers must not resolve an automatic recording root",
);

assert.strictEqual(
  pathPolicy.resolveRecordingsRootDir({
    activeDocumentPath: "E:\\Doc\\image.psd",
  }),
  "E:\\Doc\\OK-Record_image\\延时录制_Recordings",
  "recordings root should use the bilingual root directory",
);

assert.strictEqual(
  pathPolicy.getLocalDocumentProjectRootNativePath("E:\\Doc\\character.final.psd"),
  "E:\\Doc\\OK-Record_character.final",
  "document project root should use the PSD basename without the final extension",
);

assert.strictEqual(
  pathPolicy.resolveStepOutputDir({ recorderOutputDir: "E:\\Doc" }),
  "E:\\Doc\\步骤图_Steps",
  "step image folder should default under the recorder output root",
);
