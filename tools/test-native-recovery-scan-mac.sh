#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$REPO_ROOT/tests/out/native-mac"
mkdir -p "$OUT_DIR"

clang++ \
  -std=c++17 \
  -stdlib=libc++ \
  "$REPO_ROOT/tests/native-recovery-scan.test.cpp" \
  "$REPO_ROOT/native/src/storage_recovery.cpp" \
  -I"$REPO_ROOT/native/src" \
  -o "$OUT_DIR/native-recovery-scan.test"

"$OUT_DIR/native-recovery-scan.test"
