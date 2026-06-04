#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_ROOT=""
DIST_ROOT="$REPO_ROOT/dist"
OUT_ROOT="$REPO_ROOT/dist/diagnostics"
VERIFY_LOG=""
PACKAGE_LOG=""
EXTRA_LOGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-root)
      OUTPUT_ROOT="${2:-}"
      shift 2
      ;;
    --dist-root)
      DIST_ROOT="${2:-}"
      shift 2
      ;;
    --out-root)
      OUT_ROOT="${2:-}"
      shift 2
      ;;
    --verify-log)
      VERIFY_LOG="${2:-}"
      shift 2
      ;;
    --package-log)
      PACKAGE_LOG="${2:-}"
      shift 2
      ;;
    --extra-log)
      EXTRA_LOGS+=("${2:-}")
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

timestamp="$(date -u +"%Y%m%d_%H%M%S")"
package_name="ok-record-mac-diagnostics-$timestamp"
work_dir="$OUT_ROOT/$package_name"
archive_path="$OUT_ROOT/$package_name.tar.gz"

rm -rf "$work_dir"
mkdir -p "$work_dir/logs" "$work_dir/release-manifests"

capture_command() {
  local title="$1"
  shift
  {
    echo "== $title =="
    "$@"
    echo
  } >> "$work_dir/environment.txt" 2>&1 || true
}

{
  echo "generatedAtUtc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "repoRoot=$REPO_ROOT"
  echo "outputRoot=$OUTPUT_ROOT"
  echo "distRoot=$DIST_ROOT"
  echo "UXP_HYBRID_SDK=${UXP_HYBRID_SDK:-}"
  if [[ -n "${UXP_HYBRID_SDK:-}" && -d "${UXP_HYBRID_SDK:-}" ]]; then
    echo "UXP_HYBRID_SDK_exists=true"
  else
    echo "UXP_HYBRID_SDK_exists=false"
  fi
  echo
} > "$work_dir/environment.txt"

capture_command "uname" uname -a
capture_command "macOS" sw_vers
capture_command "CPU brand" sysctl -n machdep.cpu.brand_string
capture_command "Apple Silicon flag" sysctl -n hw.optional.arm64
capture_command "Xcode" xcodebuild -version
capture_command "clang" xcrun clang --version
capture_command "node" node --version
capture_command "git" git --version
capture_command "ffmpeg" ffmpeg -version

(
  cd "$REPO_ROOT"
  git rev-parse HEAD > "$work_dir/git-head.txt" 2>&1 || true
  git status --short --ignored > "$work_dir/git-status.txt" 2>&1 || true
)

copy_if_file() {
  local source="$1"
  local target_dir="$2"
  local prefix="$3"
  if [[ -n "$source" && -f "$source" ]]; then
    local base
    base="$(basename "$source")"
    cp "$source" "$target_dir/${prefix}${base}"
  fi
}

copy_if_file "$VERIFY_LOG" "$work_dir/logs" "verify-"
copy_if_file "$PACKAGE_LOG" "$work_dir/logs" "package-"
for log_path in "${EXTRA_LOGS[@]}"; do
  copy_if_file "$log_path" "$work_dir/logs" "extra-"
done

if [[ -d "$DIST_ROOT/release" ]]; then
  index=1
  while IFS= read -r manifest_path; do
    cp "$manifest_path" "$work_dir/release-manifests/release-manifest-$index.json"
    index=$((index + 1))
  done < <(find "$DIST_ROOT/release" -name release-manifest.json -type f 2>/dev/null)
fi

if [[ -n "$OUTPUT_ROOT" && -d "$OUTPUT_ROOT/延时录制_Recordings" ]]; then
  while IFS= read -r export_log; do
    safe_name="$(echo "$export_log" | sed 's#[/: ]#_#g')"
    cp "$export_log" "$work_dir/logs/$safe_name"
  done < <(find "$OUTPUT_ROOT/延时录制_Recordings" -path "*/logs/*" \( -name "*.log" -o -name "*.progress" \) -type f 2>/dev/null)
fi

cat > "$work_dir/README.txt" <<'EOF'
This archive is intended for OK-Record macOS diagnostics.

It should contain environment details, git status, release manifests, verification/package logs, and FFmpeg export logs only.
It should not contain PSD/PSB documents, frame images, exported videos, Adobe SDK files, or generated .uxpaddon binaries.
EOF

mkdir -p "$OUT_ROOT"
tar -czf "$archive_path" -C "$OUT_ROOT" "$package_name"
echo "Diagnostics archive: $archive_path"
