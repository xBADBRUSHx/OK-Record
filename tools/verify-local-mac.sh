#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HYBRID_SDK="${UXP_HYBRID_SDK:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hybrid-sdk)
      HYBRID_SDK="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

run_step() {
  echo "==> $1"
  shift
  "$@"
}

cd "$REPO_ROOT"

run_step "JS syntax: UXP main" node --check "uxp/main.js"
run_step "JS syntax: panel styles" node --check "uxp/panel-styles.js"
run_step "JS syntax: panel DOM" node --check "uxp/panel-dom.js"
run_step "JS syntax: panel view" node --check "uxp/panel-view.js"
run_step "JS syntax: status messages" node --check "uxp/status-messages.js"
run_step "JS syntax: native bridge" node --check "uxp/services/native-bridge.js"
run_step "UXP panel smoke" node "tests/uxp-panel-smoke.test.js"
run_step "UXP panel styles" node "tests/panel-styles.test.js"
run_step "UXP panel DOM" node "tests/panel-dom.test.js"
run_step "UXP panel view" node "tests/panel-view.test.js"
run_step "UXP native bridge" node "tests/native-bridge.test.js"
run_step "Shared contract" node "tests/recorder-contract.test.js"
run_step "UXP status messages" node "tests/status-messages.test.js"
run_step "Scheduler" node "tests/recorder-scheduler.test.js"
run_step "Domain: export profile" node "tests/export-profile.test.js"
run_step "Domain: path policy" node "tests/path-policy.test.js"
run_step "Domain: recorder state" node "tests/recorder-domain.test.js"
run_step "Domain: painting timer" node "tests/painting-timer.test.js"
run_step "Domain: settings model" node "tests/settings-model.test.js"
run_step "Native recovery scan" bash "$REPO_ROOT/tools/test-native-recovery-scan-mac.sh"
run_step "Native export progress" bash "$REPO_ROOT/tools/test-native-export-progress-mac.sh"
run_step "Native export runner" bash "$REPO_ROOT/tools/test-native-export-runner-mac.sh"
if [[ -n "$HYBRID_SDK" ]]; then
  run_step "Native macOS build" bash "$REPO_ROOT/tools/build-native-mac.sh" --hybrid-sdk "$HYBRID_SDK"
else
  run_step "Native macOS build" bash "$REPO_ROOT/tools/build-native-mac.sh"
fi
run_step "Open-source audit" pwsh -NoProfile -File "$REPO_ROOT/tools/open-source-audit.ps1"
run_step "Whitespace diff check" git diff --check
