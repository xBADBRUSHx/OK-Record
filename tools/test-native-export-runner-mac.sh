#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$REPO_ROOT/tests/out/native-export-runner-mac"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg was not found in PATH. Install FFmpeg before running the native export runner smoke test." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

clang++ \
  -std=c++17 \
  -I"$REPO_ROOT/native/src" \
  "$REPO_ROOT/tests/native-export-runner.test.cpp" \
  "$REPO_ROOT/native/src/export_frame_set.cpp" \
  "$REPO_ROOT/native/src/export_runner.cpp" \
  "$REPO_ROOT/native/src/export_progress.cpp" \
  "$REPO_ROOT/native/src/storage_recovery.cpp" \
  -framework CoreFoundation \
  -framework CoreGraphics \
  -framework ImageIO \
  -o "$OUT_DIR/native-export-runner.test"

"$OUT_DIR/native-export-runner.test"
