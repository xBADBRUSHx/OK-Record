# OK Record Release Notes

## Win OK-Record - 2026-06-02

This Windows test build focuses on Photoshop canvas time-lapse recording, recovery, and MP4 export.

Two package variants are published:

- `OK-Record_20260602.ccx`: lightweight package. Requires FFmpeg on system `PATH`.
- `OK-Record_20260602_with-ffmpeg.ccx`: no-setup package. Includes FFmpeg under `vendor/ffmpeg/win/x64/`.

## Safety Fix

- Removed the hidden Alt-click clear-frames action from the recording button. The recording button now only starts, pauses, and resumes recording.

## Recording

- Default capture interval: 30 minutes.
- Minimum capture interval: 1 second.
- Scheduled recording captures only when the document result changed after the initial frame.
- Pause and resume continue writing to the same `延时录制_Recordings/frames/` timeline.

## Storage

- If a manual sequence-frame folder is selected, OK Record uses it as the output root.
- If no manual output root is set, OK Record follows the active saved local Photoshop document folder.
- If the document has no local saved path, OK Record falls back to the plugin data folder.
- Recording frames are written below `延时录制_Recordings/frames/`.
- Manual step images default to `步骤图_Steps/`.

## Export

- Export uses numbered image sequences and FFmpeg.
- The no-setup package uses bundled FFmpeg first.
- The lightweight package requires `ffmpeg.exe` to be discoverable from `PATH` on Windows.
- Exports write MP4 files under `延时录制_Recordings/exports/`.
- FFmpeg logs and progress files are written under `logs/`.

## Known Limitations

- The current public package is Windows only.
- macOS builds must be produced and tested on a real Mac.
- FFmpeg is bundled only in the `with-ffmpeg` package variant.
- Live export cancellation and explicit FFmpeg path configuration are not included in this build.
