# OK Record Release Notes

## OK Record v1.0.2 - 2026-06-03

### 中文

- 修复同一时间线里 Photoshop/UXP 交替返回 8 位 RGB 和 8 位 RGBA 像素时，后续录制被 metadata 兼容检查阻止的问题。
- 新增红色“清空序列帧”按钮和面板菜单“清空序列帧_Clear Frames”，清空前必须通过 UXP 确认弹窗；`Ctrl+Shift+Alt` 点击录制按钮不再承担清空功能。
- 自动录制现在绑定当前本地 PSD/PSB 文档；从未保存到本地的文档会被阻止，保存过但当前有未保存修改的文档仍可继续录制。
- 录制中切换到其它 Photoshop 文档时会停止并报错，避免把新文档写入上一条时间线。
- 暂停录制时可以重新指定 OK-Record 保存目录；选择新目录会结束当前暂停录制状态，并按新目录恢复或扫描时间线。
- 录制失败、手动采样失败、导出完成和导出失败都会弹出提醒窗口，底部详情仍保留可选中复制。

### English

- Fixed timeline append failures when Photoshop/UXP alternates between 8-bit RGB and 8-bit RGBA source pixels in the same recording timeline.
- Added the red "Clear Frames" button and the panel flyout action "清空序列帧_Clear Frames". Clearing requires a UXP confirmation dialog; Ctrl+Shift+Alt-clicking the recording button no longer clears frames.
- Automatic recording is now bound to the current local PSD/PSB document. Never-saved local documents are blocked, while saved documents with unsaved canvas edits can keep recording.
- Switching to another Photoshop document while recording now stops with an error instead of writing that document into the previous timeline.
- The OK-Record save folder can be changed while recording is paused. Choosing a new folder ends the paused recording state and restores or scans the timeline from the new folder.
- Recording failures, manual capture failures, export completion, and export failures now show an alert dialog while keeping selectable details in the bottom notice.

## OK Record v1.0.1 - 2026-06-03

### 中文

- 修复部分 Photoshop 2026 环境中，RGB 颜色 / 8 位文档被 UXP 返回为 3 通道 RGB 像素后无法录制的问题。
- OK Record 现在同时支持 8 位 RGB 和 8 位 RGBA 像素缓冲区；用户不需要为了这个问题调整文档设置。

### English

- Fixed recording failures in some Photoshop 2026 environments where RGB Color / 8-bit documents are returned by UXP as 3-channel RGB pixels.
- OK Record now accepts both 8-bit RGB and 8-bit RGBA pixel buffers; users do not need to change document settings for this issue.

## OK Record v1.0 - 2026-06-02

### 中文

这是 OK Record 的 Windows v1.0 发布版，主要用于 Photoshop 画布延时录制、序列帧恢复和 MP4 导出。

GitHub Release 直接提供两个 `.ccx` 安装文件：

- `OK-Record_with-ffmpeg.ccx`：推荐普通用户下载。内置 FFmpeg，可以直接导出 MP4。
- `OK-Record.ccx`：轻量版。需要系统 `PATH` 中能找到 FFmpeg。

本地用户包 `OK-Record_v1.0_User-Package.zip` 只包含这两个 `.ccx` 安装文件和使用说明，不上传 GitHub。

主要变化：

- 增加启动时更新提醒，发现新版本后引导用户打开 GitHub Release 下载新版 `.ccx` 安装文件。
- 更新提醒的详情文本可以用光标选中并用 Ctrl+C 复制。
- 清空序列帧目录需要通过显式清空入口，并在弹窗中确认。
- 采样间隔最小值固定为 1 秒，输入 0 秒会自动回到 1 秒。
- 默认采样间隔为 30 分钟。

已知限制：

- 当前公开包仅支持 Windows。
- macOS 版本需要在真实 Mac 上构建和测试。
- 只有 `with-ffmpeg` 版本内置 FFmpeg。
- 当前版本不包含实时取消导出和手动指定 FFmpeg 路径功能。

### English

This is the OK Record Windows v1.0 release for Photoshop canvas time-lapse recording, frame recovery, and MP4 export.

The GitHub Release directly provides two `.ccx` installers:

- `OK-Record_with-ffmpeg.ccx`: recommended for most users. FFmpeg is bundled, so MP4 export works without extra setup.
- `OK-Record.ccx`: lightweight installer. Requires FFmpeg to be available from the system `PATH`.

The local user package `OK-Record_v1.0_User-Package.zip` contains only these two `.ccx` installers and the user guide. It is not uploaded to GitHub.

Main changes:

- Added an update reminder on panel open. When a newer version is available, the panel points users to the GitHub Release page to download the new `.ccx` installer manually.
- Update notice details are selectable and can be copied with Ctrl+C.
- Clearing the sequence-frame directory requires an explicit clear action and a confirmation dialog.
- The minimum capture interval is fixed at 1 second. Entering 0 seconds clamps back to 1 second.
- The default capture interval is 30 minutes.

Known limitations:

- The current public package is Windows only.
- macOS builds must be produced and tested on a real Mac.
- FFmpeg is bundled only in the `with-ffmpeg` package variant.
- Live export cancellation and explicit FFmpeg path configuration are not included in this build.
