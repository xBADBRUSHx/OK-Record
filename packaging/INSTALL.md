# OK Record Install And Package Notes

OK Record is distributed as a Photoshop UXP Hybrid `.ccx` package.

## Build On Windows

From the repository root:

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"

.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_20260530" `
  -SealedDate "2026-05-30"
```

The build writes files under `dist/`:

- `dist/release/OK-Record_20260530/`
- `dist/OK-Record_20260530.ccx`
- `dist/OK-Record_20260530.ccx.sha256`
- `dist/OK-Record_20260530.zip`
- `dist/OK-Record_20260530.zip.sha256`

Local verification runs by default. Do not publish a package built with `-SkipVerify` as a user release.

To build the no-setup package with bundled FFmpeg:

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"

.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_20260530_with-ffmpeg" `
  -SealedDate "2026-05-30" `
  -BundledFfmpegPath "C:\path\to\ffmpeg.exe"
```

The bundled package places FFmpeg under `vendor/ffmpeg/win/x64/` inside the plugin payload. Runtime export uses that bundled executable first and falls back to system `PATH` only when no bundled executable is present.

## Install On Windows

For normal users, download the `.ccx` package from GitHub Releases and install it with Adobe's plugin installer.

Choose the package variant based on the user:

- `OK-Record_20260530.ccx`: lightweight package. FFmpeg must be installed separately and available from `PATH`.
- `OK-Record_20260530_with-ffmpeg.ccx`: no-setup package. FFmpeg is included for MP4 export.

For the lightweight package, Windows users can install FFmpeg with:

```powershell
winget install --id Gyan.FFmpeg.Essentials -e --source winget
```

On systems where Adobe's Unified Plugin Installer Agent is available, the package can also be installed from PowerShell:

```powershell
& "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "C:\path\OK-Record_20260530.ccx"
```

For development inspection, load `dist/release/OK-Record_20260530/` in UXP Developer Tool.

## Package Contents

A Windows package should contain:

- `manifest.json`
- `main.js`
- `status-messages.js`
- `panel-dom.js`
- `panel-view.js`
- `panel-styles.js`
- `recorder-scheduler.js`
- `domain/`
- `services/`
- `docs/index.html`
- `docs/images/`
- `icons/`
- `win/x64/ok-record-addon.uxpaddon`
- `release-manifest.json`
- `INSTALL.md`
- `RELEASE_NOTES.md`
- `RUNTIME_SMOKE_CHECKLIST.md`

The no-setup package also contains:

- `vendor/ffmpeg/win/x64/ffmpeg.exe`
- FFmpeg runtime DLLs when required by the chosen FFmpeg build
- `vendor/ffmpeg/THIRD_PARTY_NOTICES.md`
- FFmpeg license files when present next to the source FFmpeg build

## Verify Installed Payload

After loading or installing the package, compare the installed payload against the package:

```powershell
.\packaging\verify-installed-payload.ps1 `
  -ReleaseDir "dist\release\OK-Record_20260530" `
  -InstalledPluginDir "<installed OK Record plugin directory>" `
  -OutputPath "dist\OK-Record_20260530-installed-payload-verification.json"
```

Release readiness still depends on a real Photoshop smoke test.
