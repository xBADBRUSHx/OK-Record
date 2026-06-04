#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HYBRID_SDK="${UXP_HYBRID_SDK:-}"
CONFIGURATION="Release"
ARCHS="arm64 x86_64"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hybrid-sdk)
      HYBRID_SDK="${2:-}"
      shift 2
      ;;
    --configuration)
      CONFIGURATION="${2:-Release}"
      shift 2
      ;;
    --archs)
      ARCHS="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$HYBRID_SDK" ]]; then
  echo "UXP Hybrid SDK path is required. Pass --hybrid-sdk or set UXP_HYBRID_SDK." >&2
  exit 1
fi
if [[ ! -d "$HYBRID_SDK/src/api" || ! -d "$HYBRID_SDK/src/utilities" ]]; then
  echo "UXP Hybrid SDK is missing src/api or src/utilities: $HYBRID_SDK" >&2
  exit 1
fi

SDKROOT="$(xcrun --sdk macosx --show-sdk-path)"

for ARCH in $ARCHS; do
  case "$ARCH" in
    arm64)
      UXP_ARCH="arm64"
      ;;
    x86_64|x64)
      ARCH="x86_64"
      UXP_ARCH="x64"
      ;;
    *)
      echo "Unsupported macOS architecture: $ARCH" >&2
      exit 1
      ;;
  esac

  INT_DIR="$REPO_ROOT/native/mac/$UXP_ARCH/$CONFIGURATION"
  OUT_DIR="$REPO_ROOT/uxp/mac/$UXP_ARCH"
  mkdir -p "$INT_DIR" "$OUT_DIR"

  clang++ \
    -std=c++17 \
    -stdlib=libc++ \
    -arch "$ARCH" \
    -isysroot "$SDKROOT" \
    -mmacosx-version-min=12.1 \
    -dynamiclib \
    -O2 \
    -DNDEBUG \
    -DOK_RECORD_ADDON_EXPORTS \
    -I"$HYBRID_SDK/src/api" \
    -I"$HYBRID_SDK/src/utilities" \
    "$HYBRID_SDK/src/utilities/UxpAddon.cpp" \
    "$REPO_ROOT/native/src/export_frame_set.cpp" \
    "$REPO_ROOT/native/src/export_progress.cpp" \
    "$REPO_ROOT/native/src/export_runner.cpp" \
    "$REPO_ROOT/native/src/module.cpp" \
    "$REPO_ROOT/native/src/storage_recovery.cpp" \
    -framework CoreFoundation \
    -framework CoreGraphics \
    -framework ImageIO \
    -o "$OUT_DIR/ok-record-addon.uxpaddon"

  echo "Built $OUT_DIR/ok-record-addon.uxpaddon"
done
