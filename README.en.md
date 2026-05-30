# OK Record

[简体中文](README.md) | [English](README.en.md)

OK Record is a Photoshop time-lapse panel for turning long painting sessions into clean videos.

It does not continuously record your screen. Instead, it saves snapshots of the Photoshop canvas at the interval you choose, then exports those frames into an MP4 video. The result focuses on the artwork, keeps file sizes under control, and is easier to recover if Photoshop or the computer is interrupted.

## Download

Download the `.ccx` package from GitHub Releases:

[Win OK-Record](https://github.com/xBADBRUSHx/OK-Record/releases/tag/win-ok-record-2026-05-30)

User guide with screenshots: [OK Record User Guide](https://xbadbrushx.github.io/OK-Record/)

The current public package is a Windows test build. The release page provides two variants:

- `OK-Record_20260530.ccx`: lightweight build for users who already have FFmpeg installed or want to configure it themselves.
- `OK-Record_20260530_with-ffmpeg.ccx`: no-setup build with bundled FFmpeg for users who want video export to work out of the box.

macOS packages must be built and tested on a real Mac before release.

## Features

- Saves canvas snapshots while you paint.
- Lets you choose a capture interval, such as every few minutes or every 30 minutes.
- Appends repeated recording work for the same PSD to one continuous frame timeline.
- Saves manual step images when you want to capture an important stage immediately.
- Exports saved frames into an MP4 time-lapse video.
- Keeps frame files on disk so recordings can be scanned, recovered, and exported again.

## File Locations

If the Photoshop document has been saved, OK Record saves recordings in `<PSD filename>-OK-Record/` beside the PSD by default.
If the document has not been saved and no manual output folder was selected, it uses the plugin data folder.
If the user manually chooses a save folder, the plugin creates the two folders below directly inside the selected folder.

Recording folder layout:

```text
<PSD filename>-OK-Record/
  步骤图_Steps/
  延时录制_Recordings/
    frames/
    exports/
    logs/
    temp/
    manifest.json
```

## Requirements

- Photoshop must be able to load UXP Hybrid plugins.
- The lightweight build needs FFmpeg available from the system `PATH`.
- The with-ffmpeg build includes FFmpeg and does not need a separate FFmpeg install.
- Windows users use the `.ccx` package from the Releases page.
- macOS users currently need to build from source and report real Photoshop test results.

For the lightweight build, Windows users can install FFmpeg from PowerShell:

```powershell
winget install --id Gyan.FFmpeg.Essentials -e --source winget
```

Restart Photoshop after installing FFmpeg.

## Build From Source

This repository does not include Adobe SDKs, Photoshop, FFmpeg, generated `.uxpaddon` files, `.ccx` packages, PSD/PSB files, captured frames, or exported videos.

Windows verification:

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"
.\tools\verify-local.ps1 -HybridSdkPath $env:UXP_HYBRID_SDK
```

Windows package:

```powershell
.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_20260530" `
  -SealedDate "2026-05-30"
```

Windows package with bundled FFmpeg:

```powershell
.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_20260530_with-ffmpeg" `
  -SealedDate "2026-05-30" `
  -BundledFfmpegPath "C:\path\to\ffmpeg.exe"
```

For macOS build notes, see [docs/mac-build.md](docs/mac-build.md).

## Development Docs

The public development documentation is limited to:

- [Architecture.md](Architecture.md)

## Project Layout

- `uxp/`: Photoshop panel source
- `native/`: native plugin source
- `shared/`: shared contracts used by the panel, native code, and tests
- `tests/`: local tests
- `tools/`: build, verification, and diagnostics scripts
- `packaging/`: package and install verification scripts
- `docs/`: public user guide and local scoped build/platform references

## License

MIT License
