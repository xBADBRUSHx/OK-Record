const ADDON_NAME = "ok-record-addon.uxpaddon";

const SCHEMAS = {
  exportResult: "ok-record.export-result.v1",
  clearRecordingResult: "ok-record.clear-recording-result.v1",
  scanResult: "ok-record.scan-result.v1",
  sequenceScanResult: "ok-record.sequence-scan-result.v1",
};

const REQUIRED_METHODS = [
  "ping",
  "write_frame",
  "write_step_frame",
  "scan_recordings",
  "scan_sequence",
  "clear_recording",
  "export_session",
  "export_sequence",
];

let addonPromise = null;

function describeAddonKeys(addon) {
  if (!addon || typeof addon !== "object") {
    return typeof addon;
  }
  return Object.keys(addon).sort().join(", ") || "(no enumerable keys)";
}

function requireAddonMethod(addon, methodName) {
  if (!addon || typeof addon[methodName] !== "function") {
    throw new Error(`Native addon missing required method "${methodName}". Available keys: ${describeAddonKeys(addon)}`);
  }
  return addon[methodName];
}

function validateAddon(addon) {
  for (const methodName of REQUIRED_METHODS) {
    requireAddonMethod(addon, methodName);
  }
  return addon;
}

async function loadAddon() {
  if (!addonPromise) {
    addonPromise = Promise.resolve(require(ADDON_NAME))
      .then(validateAddon, (error) => {
        addonPromise = null;
        throw error;
      });
  }
  return addonPromise;
}

async function callAddonMethod(methodName, args) {
  const addon = await loadAddon();
  const method = requireAddonMethod(addon, methodName);
  return method.apply(addon, args);
}

function requireSchema(result, schema, operation) {
  if (!result || result.schema !== schema) {
    throw new Error(`${operation} 返回了非预期结果`);
  }
  return result;
}

async function ping() {
  return callAddonMethod("ping", []);
}

async function writeFrame(metadata, arrayBuffer) {
  return callAddonMethod("write_frame", [metadata, arrayBuffer]);
}

async function writeStepFrame(metadata, arrayBuffer) {
  return callAddonMethod("write_step_frame", [metadata, arrayBuffer]);
}

async function scanRecordings(request) {
  return requireSchema(await callAddonMethod("scan_recordings", [request]), SCHEMAS.scanResult, "Native scan_recordings");
}

async function scanSequence(request) {
  return requireSchema(await callAddonMethod("scan_sequence", [request]), SCHEMAS.sequenceScanResult, "Native scan_sequence");
}

async function exportSession(request) {
  return requireSchema(await callAddonMethod("export_session", [request]), SCHEMAS.exportResult, "Native export_session");
}

async function exportSequence(request) {
  return requireSchema(await callAddonMethod("export_sequence", [request]), SCHEMAS.exportResult, "Native export_sequence");
}

async function clearRecording(request) {
  return requireSchema(await callAddonMethod("clear_recording", [request]), SCHEMAS.clearRecordingResult, "Native clear_recording");
}

module.exports = {
  ADDON_NAME,
  REQUIRED_METHODS,
  SCHEMAS,
  loadAddon,
  ping,
  writeFrame,
  writeStepFrame,
  scanRecordings,
  scanSequence,
  clearRecording,
  exportSession,
  exportSequence,
};
