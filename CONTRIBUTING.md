# Contributing

OK-Record is a Photoshop UXP Hybrid plugin. Contributions should keep the current product path intact: UXP owns the panel and Photoshop capture orchestration, and the native addon owns durable frame I/O, recovery, FFmpeg export, and diagnostics.

## Before You Start

- Do not commit Adobe SDKs, Photoshop SDKs, generated `.uxpaddon` files, `.ccx` packages, release archives, capture frames, export videos, PSD/PSB documents, or local logs.
- Download the Adobe UXP Hybrid SDK yourself and point `UXP_HYBRID_SDK` to that local folder.
- Keep platform differences in platform build/package scripts or in guarded native platform branches.
- Do not add fallback, compatibility, or silent recovery paths unless the behavior is discussed and approved first.

## Verification

Windows:

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"
.\tools\verify-local.ps1 -HybridSdkPath $env:UXP_HYBRID_SDK
.\tools\open-source-audit.ps1
```

macOS:

```bash
export UXP_HYBRID_SDK="/path/to/uxp-hybrid-plugin-sdk-main"
bash tools/verify-local-mac.sh --hybrid-sdk "$UXP_HYBRID_SDK"
```

If macOS verification or Photoshop runtime testing fails, collect diagnostics before filing an issue:

```bash
bash tools/collect-mac-diagnostics.sh \
  --verify-log mac-verify.log \
  --package-log mac-package.log \
  --output-root "/path/to/your/test/output/root"
```

## Pull Requests

- Explain what owner path changed: UXP, native, shared contract, packaging, or docs.
- Include the verification commands you ran and the relevant output summary.
- For macOS fixes, include macOS version, Apple Silicon or Intel, Photoshop version, UXP Developer Tool version, and whether runtime recording/export was tested.
- Prefer source changes and reproducible build steps over attaching binaries.
