# 文档索引

Last Updated: 2026-06-02
Authority: Scoped Document Index
Read After: `Architecture.md`

使用这个索引查找稳定的 scoped 主题文档。`Architecture.md` 是唯一架构权威；不要在 `docs/` 下新增无路由的计划文档或重复架构镜像。

## 主题路由

| 任务领域 | 阅读 | Owner 路径 | 验证锚点 |
| --- | --- | --- | --- |
| 架构契约、干净状态决策、模块边界 | `Architecture.md` | `uxp/`, `native/src/`, `shared/`, `tests/` | focused JS tests, native recovery tests, UXP smoke |
| 安装与打包内容 | `packaging/INSTALL.md` | `packaging/`, `dist/`, `uxp/`, `docs/index.html`, `docs/update.json`, `docs/images/` | release manifest inspection, installed payload verification, Photoshop runtime smoke |
| macOS 源码构建和诊断 | `docs/zh-CN/mac-build.md` | `tools/*-mac.sh`, `packaging/build-release-mac.sh`, `native/src/` | `tools/verify-local-mac.sh`, 用户 Mac 运行时反馈 |

## 文档职责

- `README.md`：用户入口和开发命令摘要。
- `AGENTS.md`：开发规则和文档路由。
- `Architecture.md`：一级架构契约和唯一架构权威。
- `PLAN.md`：当前已接受执行计划。
- `Checklist.md`：当前计划完成状态。
- `packaging/INSTALL.md`：打包构建、包内容、用户安装和 installed-payload 校验。
- `docs/*.md`：稳定的构建、打包、平台主题参考。
- `docs/index.html`：GitHub Pages 和插件包内本地帮助共用的唯一使用说明源文件。
- `docs/update.json`：面板更新提醒使用的 GitHub Pages 静态更新清单。
- `docs/images/`：`docs/index.html` 使用的截图资源，打包时复制进插件包。

## 镜像规则

如果非架构 scoped topic 在 `docs/zh-CN/` 下有中文镜像，同一次改动必须同步更新两个文件。不要在 `docs/` 下重新创建架构镜像。
