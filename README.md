# OK Record

[简体中文](README.md) | [English](README.en.md)

OK Record 是一个 Photoshop 延时录制面板，用来把长时间绘画过程保存成干净的延时视频。

它不是实时录屏。OK Record 会按你设置的时间间隔保存 Photoshop 画布结果图，之后再把这些序列帧导出成 MP4 视频。这样视频只关注作品本身，文件量更可控，遇到 Photoshop 或电脑中断时也更容易恢复。

## 下载

普通用户请从 GitHub Releases 下载 `.zip` 包：

[Win OK-Record](https://github.com/xBADBRUSHx/OK-Record/releases/tag/win-ok-record-2026-06-02-r2)

图文使用说明：[OK Record 使用说明](https://xbadbrushx.github.io/OK-Record/)

插件打开面板时会检查公开版本；如果发现新版本，会提示用户打开下载页并手动下载新版 `.zip`。

当前公开包是 Windows 测试版。Release 页面提供两个版本：

★ 仅支持 Photoshop 2023 24.2.0 或更高版本。

- `OK-Record_20260602_r2.zip`: 轻量版。适合已经安装或愿意自己配置 FFmpeg 的用户。
- `OK-Record_20260602_r2_with-ffmpeg.zip`: 免配置版。内置 FFmpeg，适合希望下载后直接导出视频的用户。

作者目前没有 macOS 开发环境，无法部署和测试 macOS 版本。macOS 用户需要下载源代码自行适配、构建和测试。

## 主要功能

- 绘画时按间隔自动保存画布快照。
- 可以设置采样间隔，例如几分钟一次或 30 分钟一次。
- 同一个 PSD 的多次录制会追加到同一条序列帧时间线。
- 可以手动采样，立即保存一张重要阶段图。
- 可以把已保存的序列帧导出为 MP4 延时视频。
- 序列帧保留在磁盘上，后续可以扫描、恢复和重新导出。

## 文件保存位置

如果 Photoshop 文档已经保存，OK Record 默认把录制内容保存到 PSD 同级目录的 `<PSD文件名>-OK-Record/`。
如果文档还没有保存，并且用户也没有手动选择保存目录，则使用插件数据目录。
如果用户手动选择保存目录，插件会直接在所选目录下创建下面两个文件夹。

录制目录结构：

```text
<PSD文件名>-OK-Record/
  步骤图_Steps/
  延时录制_Recordings/
    frames/
    exports/
    logs/
    temp/
    manifest.json
```

## 使用前准备

- Photoshop 需要能加载 UXP Hybrid 插件。
- 轻量版导出视频需要系统能在 `PATH` 中找到 FFmpeg。
- 免配置版已经内置 FFmpeg，不需要用户单独安装。
- Windows 用户优先使用 Release 页面提供的 `.zip` 包。
- macOS 用户需要下载源代码自行适配、构建和测试。

如果使用轻量版，Windows 可以通过 PowerShell 安装 FFmpeg：

```powershell
winget install --id Gyan.FFmpeg.Essentials -e --source winget
```

安装后重启 Photoshop，再导出视频。

## 从源码构建

本仓库不包含 Adobe SDK、Photoshop、FFmpeg、生成的 `.uxpaddon`、`.ccx` 包、PSD/PSB 文件、录制帧或导出视频。

Windows 本地验证：

```powershell
$env:UXP_HYBRID_SDK = "C:\path\to\uxp-hybrid-plugin-sdk-main"
.\tools\verify-local.ps1 -HybridSdkPath $env:UXP_HYBRID_SDK
```

Windows 打包：

```powershell
.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_20260602_r2" `
  -SealedDate "2026-06-02"
```

Windows 免配置版打包：

```powershell
.\packaging\build-release.ps1 `
  -HybridSdkPath $env:UXP_HYBRID_SDK `
  -ReleasePackageName "OK-Record_20260602_r2_with-ffmpeg" `
  -SealedDate "2026-06-02" `
  -BundledFfmpegPath "C:\path\to\ffmpeg.exe"
```

macOS 构建说明见 [docs/mac-build.md](docs/mac-build.md)。

## 开发文档入口

公开开发文档只保留：

- [Architecture.md](Architecture.md)

## 项目结构

- `uxp/`: Photoshop 面板代码
- `native/`: 原生插件源码
- `shared/`: 面板、原生代码和测试共用的数据契约
- `tests/`: 本地测试
- `tools/`: 构建、验证和诊断脚本
- `packaging/`: 打包和安装校验脚本
- `docs/`: 公开使用说明和本地 scoped 构建/平台参考

## 许可证

MIT License
