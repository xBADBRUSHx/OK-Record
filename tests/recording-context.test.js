"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const recordingContext = require(path.join(repoRoot, "uxp", "domain", "recording-context.js"));

const savedPsdContext = recordingContext.createRecordingContext({
  documentPath: "E:\\Paint\\Character.psd",
  documentId: 42,
  cloudDocument: false,
});
assert.strictEqual(savedPsdContext.ok, true, "local PSD documents must create a recording context");
assert.strictEqual(savedPsdContext.outputDir, "E:\\Paint\\OK-Record_Character");
assert.strictEqual(savedPsdContext.recordingsRootDir, "E:\\Paint\\OK-Record_Character\\延时录制_Recordings");
assert.strictEqual(savedPsdContext.stepOutputDir, "E:\\Paint\\OK-Record_Character\\步骤图_Steps");
assert.strictEqual(savedPsdContext.documentId, "42");

const savedPsbContext = recordingContext.createRecordingContext({
  documentPath: "E:\\Paint\\Large.PSB",
  saved: false,
});
assert.strictEqual(savedPsbContext.ok, true, "saved local PSB identity must be allowed even when the canvas has unsaved edits");
assert.strictEqual(savedPsbContext.outputDir, "E:\\Paint\\OK-Record_Large");

for (const blockedCase of [
  { documentPath: "", label: "empty unsaved document path" },
  { documentPath: "Untitled-1", label: "untitled document identifier" },
  { documentPath: "cloud://document.psd", label: "cloud document path" },
  { documentPath: "E:\\Paint\\reference.jpg", label: "non-PSD image path" },
  { documentPath: "/tmp", label: "local path without a PSD/PSB extension" },
  { documentPath: "E:\\Paint\\Character.psd", cloudDocument: true, label: "cloud document flag" },
]) {
  const context = recordingContext.createRecordingContext(blockedCase);
  assert.strictEqual(context.ok, false, `${blockedCase.label} must not create a recording context`);
  assert.strictEqual(context.message, recordingContext.UNSAVED_DOCUMENT_RECORDING_MESSAGE);
}

const manualContext = recordingContext.createRecordingContext({
  documentPath: "E:\\Paint\\Character.psd",
  manualProjectOutputDir: "D:\\OK-Record\\Character",
  manualProjectOutputDocumentKey: recordingContext.normalizePathKey("E:\\Paint\\Character.psd"),
});
assert.strictEqual(manualContext.ok, true);
assert.strictEqual(manualContext.outputDir, "D:\\OK-Record\\Character", "manual project output dir must override the PSD-adjacent project dir");

const newDocumentContext = recordingContext.createRecordingContext({
  documentPath: "E:\\Paint\\Other.psd",
  manualProjectOutputDir: "D:\\OK-Record\\Character",
  manualProjectOutputDocumentKey: recordingContext.normalizePathKey("E:\\Paint\\Character.psd"),
});
assert.strictEqual(newDocumentContext.ok, true);
assert.strictEqual(newDocumentContext.outputDir, "E:\\Paint\\OK-Record_Other", "manual project dir for another PSD must not carry over automatically");

const manuallyJoinedIncrementalContext = recordingContext.createRecordingContext({
  documentPath: "E:\\Paint\\Other.psd",
  manualProjectOutputDir: "D:\\OK-Record\\Character",
  manualProjectOutputDocumentKey: recordingContext.normalizePathKey("E:\\Paint\\Other.psd"),
});
assert.strictEqual(manuallyJoinedIncrementalContext.ok, true);
assert.strictEqual(manuallyJoinedIncrementalContext.outputDir, "D:\\OK-Record\\Character", "a new PSD can join an old project only after the user manually chooses that project for the new PSD");

const automaticBinding = recordingContext.createManualProjectOutputBinding({
  documentPath: "E:\\Paint\\Character.psd",
  outputDir: "E:\\Paint\\OK-Record_Character",
});
assert.strictEqual(automaticBinding.frameOutputDir, "", "choosing the automatic PSD project dir should clear the manual project override");
assert.strictEqual(automaticBinding.frameOutputDocumentKey, "", "choosing the automatic PSD project dir should clear the manual document binding");
assert.strictEqual(automaticBinding.restoredAutomaticProjectOutputDir, true);

const session = recordingContext.applyRecordingContextToSession({ sessionId: "Timeline" }, manualContext);
assert.strictEqual(recordingContext.isSessionForRecordingContext(session, manualContext), true);
assert.strictEqual(recordingContext.isSessionForRecordingContext(session, newDocumentContext), false);
assert.strictEqual(recordingContext.isSessionForRecordingContext(session, manuallyJoinedIncrementalContext), true);
assert.strictEqual(recordingContext.isSameRecordingContext(manualContext, manualContext), true);
assert.strictEqual(recordingContext.isSameRecordingContext(manualContext, manuallyJoinedIncrementalContext), false);
