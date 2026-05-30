---
name: macOS test report
about: Report macOS build, install, recording, or export results
title: "[macOS] "
labels: macOS, testing
assignees: ""
---

## Environment

- macOS version:
- CPU: Apple Silicon / Intel
- Photoshop version:
- UXP Developer Tool version:
- UXP Hybrid SDK version/source:
- FFmpeg source and `ffmpeg -version`:

## What You Ran

```bash
export UXP_HYBRID_SDK="/path/to/uxp-hybrid-plugin-sdk-main"
bash tools/verify-local-mac.sh --hybrid-sdk "$UXP_HYBRID_SDK" 2>&1 | tee mac-verify.log
bash packaging/build-release-mac.sh --hybrid-sdk "$UXP_HYBRID_SDK" --release-package-name "OK-Record_mac_YYYYMMDD" --sealed-date "YYYY-MM-DD" 2>&1 | tee mac-package.log
```

## Result

- Build/verification result:
- Photoshop panel load result:
- Recording result:
- Export result:

## Attachments

Attach the diagnostics archive from:

```bash
bash tools/collect-mac-diagnostics.sh --verify-log mac-verify.log --package-log mac-package.log --output-root "/path/to/output/root"
```

Do not attach PSD/PSB documents, private artwork, capture frames, full exports, Adobe SDK files, or generated `.uxpaddon` binaries unless a maintainer explicitly requests them.
