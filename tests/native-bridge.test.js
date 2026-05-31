"use strict";

const assert = require("assert");
const Module = require("module");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contract = require(path.join(repoRoot, "shared", "recorder-contract.json"));
const bridge = require(path.join(repoRoot, "uxp", "services", "native-bridge.js"));

const calls = [];
const results = {
  ping: { ok: true },
  writeFrame: { frameName: "frame_000001.jpg" },
  writeStepFrame: { frameName: "step_001.png" },
  scanRecordings: { schema: contract.scan.schema, sessions: [] },
  scanSequence: { schema: contract.scan.sequenceSchema, frames: [] },
  clearRecording: { schema: contract.export.clearRecordingSchema, frameCount: 0 },
  exportSession: { schema: contract.export.schema, outputPath: "session.mp4" },
  exportSequence: { schema: contract.export.schema, outputPath: "sequence.mp4" },
};

const addonMock = {
  ping() {
    calls.push({ name: "ping", args: [] });
    return results.ping;
  },
  write_frame(metadata, arrayBuffer) {
    calls.push({ name: "write_frame", args: [metadata, arrayBuffer] });
    return results.writeFrame;
  },
  write_step_frame(metadata, arrayBuffer) {
    calls.push({ name: "write_step_frame", args: [metadata, arrayBuffer] });
    return results.writeStepFrame;
  },
  scan_recordings(request) {
    calls.push({ name: "scan_recordings", args: [request] });
    return results.scanRecordings;
  },
  scan_sequence(request) {
    calls.push({ name: "scan_sequence", args: [request] });
    return results.scanSequence;
  },
  clear_recording(request) {
    calls.push({ name: "clear_recording", args: [request] });
    return results.clearRecording;
  },
  export_session(request) {
    calls.push({ name: "export_session", args: [request] });
    return results.exportSession;
  },
  export_sequence(request) {
    calls.push({ name: "export_sequence", args: [request] });
    return results.exportSequence;
  },
};

const originalLoad = Module._load;
Module._load = function loadWithNativeAddonMock(request, parent, isMain) {
  if (request === bridge.ADDON_NAME) {
    return addonMock;
  }
  return originalLoad.call(this, request, parent, isMain);
};

function assertLastCall(name, args) {
  assert.deepStrictEqual(calls[calls.length - 1], { name, args });
}

(async () => {
try {
  assert.strictEqual(bridge.ADDON_NAME, "ok-record-addon.uxpaddon");
  assert.deepStrictEqual(bridge.REQUIRED_METHODS, [
    "ping",
    "write_frame",
    "write_step_frame",
    "scan_recordings",
    "scan_sequence",
    "clear_recording",
    "export_session",
    "export_sequence",
  ]);
  assert.deepStrictEqual(bridge.SCHEMAS, {
    clearRecordingResult: contract.export.clearRecordingSchema,
    exportResult: contract.export.schema,
    scanResult: contract.scan.schema,
    sequenceScanResult: contract.scan.sequenceSchema,
  });

  assert.strictEqual(await bridge.loadAddon(), addonMock);
  assert.strictEqual(await bridge.ping(), results.ping);
  assertLastCall("ping", []);

  const metadata = { frameName: "frame_000001" };
  const arrayBuffer = new ArrayBuffer(4);
  assert.strictEqual(await bridge.writeFrame(metadata, arrayBuffer), results.writeFrame);
  assertLastCall("write_frame", [metadata, arrayBuffer]);
  assert.strictEqual(await bridge.writeStepFrame(metadata, arrayBuffer), results.writeStepFrame);
  assertLastCall("write_step_frame", [metadata, arrayBuffer]);

  const scanRequest = { outputDir: "E:\\Project" };
  assert.strictEqual(await bridge.scanRecordings(scanRequest), results.scanRecordings);
  assertLastCall("scan_recordings", [scanRequest]);

  const sequenceScanRequest = { framesDir: "E:\\Project\\frames" };
  assert.strictEqual(await bridge.scanSequence(sequenceScanRequest), results.scanSequence);
  assertLastCall("scan_sequence", [sequenceScanRequest]);

  const clearRecordingRequest = { outputDir: "E:\\Project" };
  assert.strictEqual(await bridge.clearRecording(clearRecordingRequest), results.clearRecording);
  assertLastCall("clear_recording", [clearRecordingRequest]);

  const sessionExportRequest = { outputDir: "E:\\Project", sessionId: "Timeline" };
  assert.strictEqual(await bridge.exportSession(sessionExportRequest), results.exportSession);
  assertLastCall("export_session", [sessionExportRequest]);

  const sequenceExportRequest = { framesDir: "E:\\Project\\frames" };
  assert.strictEqual(await bridge.exportSequence(sequenceExportRequest), results.exportSequence);
  assertLastCall("export_sequence", [sequenceExportRequest]);

  results.scanRecordings = { schema: "wrong.schema" };
  await assert.rejects(
    async () => bridge.scanRecordings(scanRequest),
    (error) => error instanceof Error && error.message.includes("Native scan_recordings"),
    "scanRecordings must reject unexpected native schemas",
  );
  results.scanRecordings = { schema: contract.scan.schema, sessions: [] };

  results.scanSequence = { schema: "wrong.schema" };
  await assert.rejects(
    async () => bridge.scanSequence(sequenceScanRequest),
    (error) => error instanceof Error && error.message.includes("Native scan_sequence"),
    "scanSequence must reject unexpected native schemas",
  );
  results.scanSequence = { schema: contract.scan.sequenceSchema, frames: [] };

  results.clearRecording = { schema: "wrong.schema" };
  await assert.rejects(
    async () => bridge.clearRecording(clearRecordingRequest),
    (error) => error instanceof Error && error.message.includes("Native clear_recording"),
    "clearRecording must reject unexpected native schemas",
  );
  results.clearRecording = { schema: contract.export.clearRecordingSchema, frameCount: 0 };

  results.exportSession = { schema: "wrong.schema" };
  await assert.rejects(
    async () => bridge.exportSession(sessionExportRequest),
    (error) => error instanceof Error && error.message.includes("Native export_session"),
    "exportSession must reject unexpected native schemas",
  );
  results.exportSession = { schema: contract.export.schema, outputPath: "session.mp4" };

  results.exportSequence = { schema: "wrong.schema" };
  await assert.rejects(
    async () => bridge.exportSequence(sequenceExportRequest),
    (error) => error instanceof Error && error.message.includes("Native export_sequence"),
    "exportSequence must reject unexpected native schemas",
  );

  console.log("native-bridge tests passed");
} finally {
  Module._load = originalLoad;
}
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
