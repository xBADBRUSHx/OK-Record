# OK Record Release Notes

## OK Record v1.0 - 2026-06-02

### 中文

这是 OK Record 的 Windows v1.0 发布版，主要用于 Photoshop 画布延时录制、序列帧恢复和 MP4 导出。

发布两个插件 zip：

- `OK-Record_v1.0_with-ffmpeg.zip`：推荐普通用户下载。内置 FFmpeg，可以直接导出 MP4。
- `OK-Record_v1.0.zip`：轻量版。需要系统 `PATH` 中能找到 FFmpeg。

主要变化：

- 增加启动时更新提醒，发现新版本后引导用户打开 GitHub Release 下载新版 zip。
- 更新提醒的详情文本可以用光标选中并用 Ctrl+C 复制。
- 清空序列帧目录的快捷操作改为 Ctrl+Shift+Alt 点击录制按钮，并需要确认。
- 采样间隔最小值固定为 1 秒，输入 0 秒会自动回到 1 秒。
- 默认采样间隔为 30 分钟。

已知限制：

- 当前公开包仅支持 Windows。
- macOS 版本需要在真实 Mac 上构建和测试。
- 只有 `with-ffmpeg` 版本内置 FFmpeg。
- 当前版本不包含实时取消导出和手动指定 FFmpeg 路径功能。

### English

This is the OK Record Windows v1.0 release for Photoshop canvas time-lapse recording, frame recovery, and MP4 export.

Two plugin zip packages are published:

- `OK-Record_v1.0_with-ffmpeg.zip`: recommended for most users. FFmpeg is included, so MP4 export works without extra setup.
- `OK-Record_v1.0.zip`: lightweight package. Requires FFmpeg to be available from the system `PATH`.

Main changes:

- Added an update reminder on panel open. When a newer version is available, the panel points users to the GitHub Release page to download the new zip manually.
- Update notice details are selectable and can be copied with Ctrl+C.
- The clear sequence-frame-directory shortcut is now Ctrl+Shift+Alt click on the record button and requires confirmation.
- The minimum capture interval is fixed at 1 second. Entering 0 seconds clamps back to 1 second.
- The default capture interval is 30 minutes.

Known limitations:

- The current public package is Windows only.
- macOS builds must be produced and tested on a real Mac.
- FFmpeg is bundled only in the `with-ffmpeg` package variant.
- Live export cancellation and explicit FFmpeg path configuration are not included in this build.
