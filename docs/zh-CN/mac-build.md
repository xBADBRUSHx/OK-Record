Last Updated: 2026-05-29
Authority: macOS 构建、验证、打包、Photoshop 冒烟测试和诊断交接说明。
Read When: 在 macOS 构建或测试 OK-Record，或者收集 Mac 用户失败反馈。
Owner: 打包与 macOS 原生维护者。
Scope: 仅限 macOS；Windows 打包由 `packaging/INSTALL.md` 负责。

# macOS 构建与测试

OK-Record 可以在 macOS 上从源码测试，但 macOS 原生插件文件必须在 Mac 上构建。Windows 生成的包不能证明 macOS 包可用。

## 前置条件

- 安装 Xcode command-line tools 的 macOS。
- Photoshop 24.2 或更高版本。
- UXP Developer Tool 1.7 或更高版本。
- 单独从 Adobe 获取的 Adobe UXP Hybrid SDK。
- `PATH` 中可以找到 `ffmpeg`。
- 用于 JavaScript 测试的 Node.js。

Adobe SDK 不应放入本仓库，请通过 `UXP_HYBRID_SDK` 传入 SDK 路径。

## 从源码验证

```bash
export UXP_HYBRID_SDK="/path/to/uxp-hybrid-plugin-sdk-main"
bash tools/verify-local-mac.sh --hybrid-sdk "$UXP_HYBRID_SDK" 2>&1 | tee mac-verify.log
```

该命令会运行 JavaScript 检查、面板冒烟测试、共享契约测试、调度器测试、原生恢复/导出进度测试、macOS 原生插件构建和空白字符检查。

## 构建 macOS 包

```bash
export UXP_HYBRID_SDK="/path/to/uxp-hybrid-plugin-sdk-main"
bash packaging/build-release-mac.sh \
  --hybrid-sdk "$UXP_HYBRID_SDK" \
  --release-package-name "OK-Record_mac_20260530" \
  --sealed-date "2026-05-30" \
  2>&1 | tee mac-package.log
```

macOS 包应包含：

- `mac/arm64/ok-record-addon.uxpaddon`
- `mac/x64/ok-record-addon.uxpaddon`

## Photoshop 冒烟测试

在 Photoshop 中安装或加载包之后：

1. 打开 OK-Record 面板。
2. 使用已保存的本地 PSD/PSB 开始一次短录制。
3. 确认帧文件写入 `延时录制_Recordings/frames/`。
4. 执行手动采样，确认生成 `步骤图_Steps/step_001.png`。
5. 导出一个短 MP4，确认视频输出在 `exports/`，日志输出在 `logs/`。

## 诊断信息

如果 macOS 测试失败，请收集诊断信息：

```bash
bash tools/collect-mac-diagnostics.sh \
  --verify-log mac-verify.log \
  --package-log mac-package.log \
  --output-root "/path/to/your/test/output/root"
```

诊断脚本会收集环境信息、git 状态、release manifest、验证/打包日志和 FFmpeg 导出日志。它不会收集 PSD/PSB、序列帧、导出视频、Adobe SDK 文件或生成的 `.uxpaddon` 文件。
