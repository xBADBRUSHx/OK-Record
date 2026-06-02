# OK Record Install And Package Notes

OK Record is distributed as two GitHub Release `.ccx` installers and one local user-package `.zip` that contains both installers.

## Build On Windows

From the repository root:

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"

.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record" `
  -SealedDate "2026-06-02"
```

The build writes files under `dist/`:

- `dist/release/OK-Record/`
- `dist/OK-Record.ccx`

Local verification runs by default. Do not publish a package built with `-SkipVerify` as a user release.

To build the no-setup package with bundled FFmpeg:

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"

.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_with-ffmpeg" `
  -SealedDate "2026-06-02" `
  -BundledFfmpegPath "C:\path\to\ffmpeg.exe"
```

The bundled package places FFmpeg under `vendor/ffmpeg/win/x64/` inside the plugin payload. Runtime export uses that bundled executable first and falls back to system `PATH` only when no bundled executable is present.

## Install On Windows

For normal users, download one `.ccx` installer from GitHub Releases and install it with Creative Cloud Desktop.

Choose the package variant based on the user:

- `OK-Record_with-ffmpeg.ccx`: recommended installer package for normal users. FFmpeg is included for MP4 export.
- `OK-Record.ccx`: lightweight installer. FFmpeg must be installed separately and available from `PATH`.

For the lightweight package, Windows users can install FFmpeg with:

```powershell
winget install --id Gyan.FFmpeg.Essentials -e --source winget
```

For development inspection, load `dist/release/OK-Record/` in UXP Developer Tool.

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
- `OK-Record-User-Guide.html`
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

`OK-Record-User-Guide.html` is a root-level copy of the user guide for users who unzip the package and want to open the instructions directly. The plugin runtime still opens `docs/index.html`.

## Verify Installed Payload

After loading or installing the package, compare the installed payload against the package:

```powershell
.\packaging\verify-installed-payload.ps1 `
  -ReleaseDir "dist\release\OK-Record" `
  -InstalledPluginDir "<installed OK Record plugin directory>" `
  -OutputPath "dist\OK-Record-installed-payload-verification.json"
```

Release readiness still depends on a real Photoshop smoke test.
