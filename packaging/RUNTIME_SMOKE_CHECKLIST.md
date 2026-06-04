# OK-Record Runtime Smoke Checklist

Run this checklist in Photoshop after loading or installing the release package.

## Environment

- [ ] For the lightweight Windows package, FFmpeg is available from `PATH` as `ffmpeg.exe`.
- [ ] For the no-setup Windows package, `vendor/ffmpeg/win/x64/ffmpeg.exe` is present in the installed payload.
- [ ] On macOS source builds, FFmpeg is available from `PATH` as `ffmpeg`.
- [ ] Photoshop opens the OK-Record panel without UXP errors.
- [ ] The loaded plugin payload matches the release package when payload verification is available.

## Capture And Storage

- [ ] Open a saved local PSD/PSB and clear any manual sequence-frame output root.
- [ ] Start recording with a 1 second interval and confirm the first frame is written below the document folder.
- [ ] Confirm frames are written under `延时录制_Recordings/frames/`.
- [ ] Pause and resume recording; confirm frames continue in the same Record folder.
- [ ] While paused, click `指定 OK-Record 保存目录`, choose another project folder, and confirm the paused state ends before the new folder is restored or scanned.
- [ ] Stop recording and confirm `manifest.json`, `frames/`, `exports/`, `logs/`, and `temp/` are present.
- [ ] Run manual sampling and confirm `步骤图_Steps/step_001.png` is written when no manual step directory is set.

## Export

- [ ] Click the sequence-frame folder button and confirm it opens `延时录制_Recordings/`.
- [ ] Select `延时录制_Recordings/` as the export source and confirm OK-Record resolves the latest valid Record frames.
- [ ] Export a short MP4 and confirm output is written under `exports/`.
- [ ] Confirm export success shows a dialog and leaves selectable details in the bottom notice.
- [ ] Confirm FFmpeg log and `.progress` files are written under `logs/`.

## Saved Document Gate

- [ ] Create a new never-saved document and confirm Start Recording shows the save-first warning without writing frames.
- [ ] Confirm the save-first warning appears in a dialog and remains selectable in the bottom notice.
- [ ] Save that document as a local PSD/PSB, make another canvas edit without saving again, and confirm recording is allowed.
- [ ] While recording one saved PSD/PSB, switch to a different document before the next interval and confirm OK-Record stops instead of writing frames into the previous timeline.
- [ ] Use the panel flyout menu clear-frame action and confirm it shows a destructive confirmation before clearing the current document's sequence frames.
