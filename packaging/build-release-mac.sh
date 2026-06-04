#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HYBRID_SDK="${UXP_HYBRID_SDK:-}"
OUTPUT_ROOT="$REPO_ROOT/dist"
PACKAGE_VERSION=""
RELEASE_PACKAGE_NAME=""
SEALED_DATE=""
SKIP_VERIFY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hybrid-sdk)
      HYBRID_SDK="${2:-}"
      shift 2
      ;;
    --output-root)
      OUTPUT_ROOT="${2:-}"
      shift 2
      ;;
    --package-version)
      PACKAGE_VERSION="${2:-}"
      shift 2
      ;;
    --release-package-name)
      RELEASE_PACKAGE_NAME="${2:-}"
      shift 2
      ;;
    --sealed-date)
      SEALED_DATE="${2:-}"
      shift 2
      ;;
    --skip-verify)
      SKIP_VERIFY=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

cd "$REPO_ROOT"

assert_valid_package_file_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
    echo "Release package name must contain only letters, digits, dot, underscore, or hyphen, and must start with a letter or digit: $name" >&2
    exit 1
  fi
  if [[ "$name" == *".."* || "$name" == *"/"* || "$name" == *"\\"* ]]; then
    echo "Release package name must not contain path traversal or path separators: $name" >&2
    exit 1
  fi
}

resolve_path() {
  node -e 'const path=require("path"); console.log(path.resolve(process.argv[1]));' "$1"
}

assert_child_path() {
  local parent="$1"
  local child="$2"
  node - "$parent" "$child" <<'NODE'
const path = require("path");
const [parentInput, childInput] = process.argv.slice(2);
const parent = path.resolve(parentInput);
const child = path.resolve(childInput);
const relative = path.relative(parent, child);
if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
  process.exit(0);
}
console.error(`Refusing to operate outside output root: ${child}`);
process.exit(1);
NODE
}

MANIFEST_JSON="$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync("uxp/manifest.json","utf8")); console.log(JSON.stringify({version:m.version, id:m.id, name:m.name, manifestVersion:m.manifestVersion, addonName:m.addon && m.addon.name}));')"
if [[ -z "$PACKAGE_VERSION" ]]; then
  PACKAGE_VERSION="$(node -e "const m=$MANIFEST_JSON; console.log(m.version || '')")"
fi
ADDON_NAME="$(node -e "const m=$MANIFEST_JSON; console.log(m.addonName || '')")"
if [[ -z "$PACKAGE_VERSION" || -z "$ADDON_NAME" ]]; then
  echo "Package version or addon name is empty." >&2
  exit 1
fi
if [[ -z "$SEALED_DATE" ]]; then
  SEALED_DATE="$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync("docs/update.json","utf8")); console.log(m.releaseDate || "");')"
fi
if [[ -z "$SEALED_DATE" ]]; then
  echo "Sealed date is empty. Set docs/update.json releaseDate or pass --sealed-date." >&2
  exit 1
fi

GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
GIT_SHORT="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  GIT_DIRTY=true
else
  GIT_DIRTY=false
fi

if [[ -z "$RELEASE_PACKAGE_NAME" ]]; then
  RELEASE_PACKAGE_NAME="OK-Record-$PACKAGE_VERSION-$GIT_SHORT"
fi
assert_valid_package_file_name "$RELEASE_PACKAGE_NAME"

if [[ "$SKIP_VERIFY" -eq 1 ]]; then
  echo "==> Native macOS build"
  if [[ -n "$HYBRID_SDK" ]]; then
    bash "$REPO_ROOT/tools/build-native-mac.sh" --hybrid-sdk "$HYBRID_SDK"
  else
    bash "$REPO_ROOT/tools/build-native-mac.sh"
  fi
  VERIFICATION_MODE="native-build-only"
  LOCAL_VERIFICATION_PASSED=false
  LOCAL_VERIFICATION_SKIPPED=true
else
  echo "==> Local macOS verification"
  if [[ -n "$HYBRID_SDK" ]]; then
    bash "$REPO_ROOT/tools/verify-local-mac.sh" --hybrid-sdk "$HYBRID_SDK"
  else
    bash "$REPO_ROOT/tools/verify-local-mac.sh"
  fi
  VERIFICATION_MODE="local-macos-verification"
  LOCAL_VERIFICATION_PASSED=true
  LOCAL_VERIFICATION_SKIPPED=false
fi

PAYLOAD=(
  "manifest.json"
  "main.js"
  "status-messages.js"
  "panel-dom.js"
  "panel-view.js"
  "panel-styles.js"
  "recorder-scheduler.js"
  "domain/export-profile.js"
  "domain/painting-timer.js"
  "domain/path-policy.js"
  "domain/recording-context.js"
  "domain/recorder-state.js"
  "domain/settings-model.js"
  "services/native-bridge.js"
  "icons/plugin@1x.png"
  "icons/plugin@2x.png"
  "mac/arm64/$ADDON_NAME"
  "mac/x64/$ADDON_NAME"
)
DOCUMENTATION_PAYLOAD=(
  "docs/index.html"
)
if [[ -d "$REPO_ROOT/docs/images" ]]; then
  while IFS= read -r IMAGE_PATH; do
    case "${IMAGE_PATH##*.}" in
      png|jpg|jpeg|webp|gif|svg|PNG|JPG|JPEG|WEBP|GIF|SVG)
        DOCUMENTATION_PAYLOAD+=("docs/images/$(basename "$IMAGE_PATH")")
        ;;
    esac
  done < <(find "$REPO_ROOT/docs/images" -maxdepth 1 -type f | sort)
fi
RELEASE_DOCS=(
  "INSTALL.md"
  "RELEASE_NOTES.md"
  "RUNTIME_SMOKE_CHECKLIST.md"
)
RELEASE_GUIDE_HTML="OK-Record-User-Guide.html"

for RELATIVE_PATH in "${PAYLOAD[@]}"; do
  if [[ ! -f "$REPO_ROOT/uxp/$RELATIVE_PATH" ]]; then
    echo "Required UXP payload file is missing: $REPO_ROOT/uxp/$RELATIVE_PATH" >&2
    exit 1
  fi
done
for RELATIVE_PATH in "${DOCUMENTATION_PAYLOAD[@]}"; do
  if [[ ! -f "$REPO_ROOT/$RELATIVE_PATH" ]]; then
    echo "Required documentation payload file is missing: $REPO_ROOT/$RELATIVE_PATH" >&2
    exit 1
  fi
done
ALL_PAYLOAD=("${PAYLOAD[@]}" "${DOCUMENTATION_PAYLOAD[@]}")

OUTPUT_ROOT="$(resolve_path "$OUTPUT_ROOT")"
RELEASE_ROOT="$OUTPUT_ROOT/release"
PACKAGE_DIR="$RELEASE_ROOT/$RELEASE_PACKAGE_NAME"
ZIP_PATH="$OUTPUT_ROOT/$RELEASE_PACKAGE_NAME.zip"
CCX_PATH="$OUTPUT_ROOT/$RELEASE_PACKAGE_NAME.ccx"
assert_child_path "$OUTPUT_ROOT" "$RELEASE_ROOT"
assert_child_path "$OUTPUT_ROOT" "$PACKAGE_DIR"
assert_child_path "$OUTPUT_ROOT" "$ZIP_PATH"
assert_child_path "$OUTPUT_ROOT" "$CCX_PATH"
rm -rf "$PACKAGE_DIR" "$ZIP_PATH" "$ZIP_PATH.sha256" "$CCX_PATH" "$CCX_PATH.sha256"
mkdir -p "$PACKAGE_DIR"

for RELATIVE_PATH in "${PAYLOAD[@]}"; do
  mkdir -p "$PACKAGE_DIR/$(dirname "$RELATIVE_PATH")"
  cp "$REPO_ROOT/uxp/$RELATIVE_PATH" "$PACKAGE_DIR/$RELATIVE_PATH"
done
for RELATIVE_PATH in "${DOCUMENTATION_PAYLOAD[@]}"; do
  mkdir -p "$PACKAGE_DIR/$(dirname "$RELATIVE_PATH")"
  cp "$REPO_ROOT/$RELATIVE_PATH" "$PACKAGE_DIR/$RELATIVE_PATH"
done
for DOC_NAME in "${RELEASE_DOCS[@]}"; do
  cp "$SCRIPT_DIR/$DOC_NAME" "$PACKAGE_DIR/$DOC_NAME"
done
node - "$REPO_ROOT/docs/index.html" "$PACKAGE_DIR/$RELEASE_GUIDE_HTML" <<'NODE'
const fs = require("fs");
const [sourcePath, destinationPath] = process.argv.slice(2);
const html = fs.readFileSync(sourcePath, "utf8").replace(/images\//g, "docs/images/");
fs.writeFileSync(destinationPath, html);
NODE

node - "$PACKAGE_DIR" "$RELEASE_PACKAGE_NAME" "$PACKAGE_VERSION" "$SEALED_DATE" "$GIT_COMMIT" "$GIT_DIRTY" "$VERIFICATION_MODE" "$LOCAL_VERIFICATION_PASSED" "$LOCAL_VERIFICATION_SKIPPED" "${ALL_PAYLOAD[@]}" <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const [
  packageDir,
  packageName,
  packageVersion,
  sealedDate,
  gitCommit,
  gitDirty,
  verificationMode,
  localVerificationPassed,
  localVerificationSkipped,
  ...payload
] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(path.join("uxp", "manifest.json"), "utf8"));
const pluginPayload = payload.map((relativePath) => {
  const filePath = path.join(packageDir, relativePath);
  const bytes = fs.readFileSync(filePath);
  return {
    path: relativePath.replace(/\\/g, "/"),
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
});
const releaseManifest = {
  schema: "ok-record.release-manifest.v1",
  packageName,
  defaultPackageName: `OK-Record-${packageVersion}-${gitCommit.slice(0, 7)}`,
  packageVersion,
  sealedDate,
  pluginId: manifest.id,
  pluginName: manifest.name,
  uxpManifestVersion: manifest.manifestVersion,
  addonName: manifest.addon.name,
  gitCommit,
  gitDirty: gitDirty === "true",
  verificationMode,
  localVerificationPassed: localVerificationPassed === "true",
  localVerificationSkipped: localVerificationSkipped === "true",
  packageArchiveRoot: "plugin-payload-root",
  inspectionArchiveRoot: "release-directory",
  runtimeSmokeRequired: true,
  runtimeSmokeStatus: "not-recorded-by-build",
  generatedAtUtc: new Date().toISOString(),
  pluginPayload,
};
fs.writeFileSync(path.join(packageDir, "release-manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);
NODE

(cd "$PACKAGE_DIR" && zip -qr "$CCX_PATH" .)
(cd "$RELEASE_ROOT" && zip -qr "$ZIP_PATH" "$RELEASE_PACKAGE_NAME")
shasum -a 256 "$CCX_PATH" | sed "s#  .*/#  #" > "$CCX_PATH.sha256"
shasum -a 256 "$ZIP_PATH" | sed "s#  .*/#  #" > "$ZIP_PATH.sha256"

echo "Release directory: $PACKAGE_DIR"
echo "Release zip: $ZIP_PATH"
echo "Release ccx: $CCX_PATH"
echo "Verification mode: $VERIFICATION_MODE"
echo "Archive structure: OK"
