# Documentation Index

Last Updated: 2026-06-02
Authority: Scoped Document Index
Read After: `Architecture.md`

Use this index to find stable scoped topic docs. `Architecture.md` is the single architecture authority; do not create un-routed planning files or duplicate architecture mirrors under `docs/`.

## Topic Routes

| Task Domain | Read | Owner Paths | Verification Anchors |
| --- | --- | --- | --- |
| architecture contracts, clean-state decision, module boundaries | `Architecture.md` | `uxp/`, `native/src/`, `shared/`, `tests/` | focused JS tests, native recovery tests, UXP smoke |
| install and package contents | `packaging/INSTALL.md` | `packaging/`, `dist/`, `uxp/`, `docs/index.html`, `docs/update.json`, `docs/images/` | release manifest inspection, installed payload verification, Photoshop runtime smoke |
| macOS source build and diagnostics | `docs/mac-build.md` | `tools/*-mac.sh`, `packaging/build-release-mac.sh`, `native/src/` | `tools/verify-local-mac.sh`, user Mac runtime report |

## Document Roles

- `README.md`: user-facing entry plus developer command summary.
- `AGENTS.md`: development rules and document routing.
- `Architecture.md`: level-1 architecture contracts and the only architecture authority.
- `PLAN.md`: active accepted execution plan only.
- `Checklist.md`: active completion state only.
- `packaging/INSTALL.md`: package construction, package contents, user installation, and installed-payload verification.
- `docs/*.md`: scoped stable build, package, and platform references.
- `docs/index.html`: single user guide source for GitHub Pages and packaged local help.
- `docs/update.json`: static GitHub Pages update manifest used by the panel update reminder.
- `docs/images/`: screenshot assets used by `docs/index.html` and copied into packages.

## Mirror Policy

When a scoped non-architecture topic has a Chinese mirror under `docs/zh-CN/`, update both files in the same change. Do not recreate architecture mirrors under `docs/`.
