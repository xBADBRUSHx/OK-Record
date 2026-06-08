Last Updated: 2026-05-29
Authority: macOS build, verification, package, runtime smoke, and diagnostic handoff notes.
Read When: building or testing OK-Record on macOS, or collecting a Mac user failure report.
Owner: packaging and native macOS maintainers.
Scope: macOS only; Windows packaging remains owned by `packaging/INSTALL.md`.

# macOS Build And Test

OK-Record can be tested on macOS from source, but the macOS native plugin binaries must be built on a Mac. A Windows-built package is not proof that the macOS package works.

## Prerequisites

- macOS with Xcode command-line tools.
- Photoshop 24.4 or later.
- UXP Developer Tool 1.7 or later.
- Adobe UXP Hybrid SDK downloaded separately from Adobe.
- FFmpeg available from `PATH` as `ffmpeg`.
- Node.js for the JavaScript tests.

Keep Adobe SDKs outside this repository and pass the SDK path through `UXP_HYBRID_SDK`.

## Verify From Source

```bash
export UXP_HYBRID_SDK="/path/to/uxp-hybrid-plugin-sdk-main"
bash tools/verify-local-mac.sh --hybrid-sdk "$UXP_HYBRID_SDK" 2>&1 | tee mac-verify.log
```

This runs JavaScript checks, panel smoke tests, shared contract tests, scheduler tests, native recovery/export-progress fixtures, native macOS addon builds, and whitespace checks.

## Build A macOS Package

```bash
export UXP_HYBRID_SDK="/path/to/uxp-hybrid-plugin-sdk-main"
bash packaging/build-release-mac.sh \
  --hybrid-sdk "$UXP_HYBRID_SDK" \
  --release-package-name "OK-Record_mac_20260530" \
  --sealed-date "2026-05-30" \
  2>&1 | tee mac-package.log
```

The macOS package should contain both:

- `mac/arm64/ok-record-addon.uxpaddon`
- `mac/x64/ok-record-addon.uxpaddon`

## Runtime Smoke Test

After installing or loading the package in Photoshop:

1. Open the OK-Record panel.
2. Start a short recording from a saved local PSD/PSB.
3. Confirm frames are written under `延时录制_Recordings/frames/`.
4. Run manual sampling and confirm `步骤图_Steps/step_001.png`.
5. Export a short MP4 and confirm output under `exports/` plus logs under `logs/`.

## Diagnostics

When reporting a macOS failure, collect diagnostics:

```bash
bash tools/collect-mac-diagnostics.sh \
  --verify-log mac-verify.log \
  --package-log mac-package.log \
  --output-root "/path/to/your/test/output/root"
```

The diagnostics script collects environment information, git status, release manifests, verification/package logs, and FFmpeg export logs. It does not collect PSD/PSB files, frame images, exported videos, Adobe SDK files, or generated `.uxpaddon` binaries.
