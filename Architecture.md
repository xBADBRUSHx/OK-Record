# Architecture

Last Updated: 2026-06-03

`Architecture.md` is the level-1 architecture contract map and the single architecture authority for OK Record. Scoped docs may own build, packaging, or platform procedures, but they must not duplicate architecture truth.

## Product Boundary

Status: implemented

Contract: OK Record is a Photoshop UXP Hybrid plugin for interval-based canvas snapshot recording and MP4 timelapse export. It is not real-time screen recording and does not record cursor, menus, dialogs, or other screen content.

Owners: `uxp/`, `native/`, `shared/recorder-contract.json`.

Topic docs:

- None. Keep product architecture truth in this file.

Code anchors:

- `uxp/main.js`
- `native/src/module.cpp`
- `native/src/storage_recovery.cpp`
- `native/src/export_progress.cpp`

Verification anchors: UXP panel smoke, shared contract test, native recovery/export-progress tests, Photoshop runtime acceptance.

Forbidden paths: CEP rewrite, real-time screen capture, browser automation as recorder core.

Predicted wrong defaults: Treating OK Record as a screen recorder instead of a canvas snapshot recorder.

WHY: The product value is clean artwork-state snapshots that can survive interruptions and export later. Screen recording would capture unrelated UI, increase file size, and move ownership outside the current UXP/native recorder architecture.

## UXP Shell And JS Domain

Status: implemented

Contract: UXP owns Photoshop API calls, panel lifecycle, DOM events, and status display. Critical recording/export failures and export completion keep the bottom selectable detail notice and also show a native blocking alert so users cannot miss the result. Pure JS domain modules own recorder state transitions, export profile math, path policy, settings parsing, and painting timer rules. Native addon calls route through a single service bridge before entering UI workflow code.

Owners: `uxp/main.js`, `uxp/status-messages.js`, `uxp/panel-view.js`, `uxp/panel-dom.js`, `uxp/panel-styles.js`, `uxp/domain/`, `uxp/services/native-bridge.js`.

Topic docs:

- None. Keep UXP/domain architecture truth in this file.

Code anchors:

- `uxp/main.js`
- `uxp/status-messages.js`
- `uxp/panel-view.js`
- `uxp/panel-dom.js`
- `uxp/panel-styles.js`
- `uxp/recorder-scheduler.js`
- `uxp/domain/export-profile.js`
- `uxp/domain/path-policy.js`
- `uxp/domain/recording-context.js`
- `uxp/domain/settings-model.js`
- `uxp/domain/painting-timer.js`
- `uxp/domain/recorder-state.js`
- `uxp/services/native-bridge.js`

Verification anchors: JS syntax checks, UXP panel smoke, focused domain/status-message/native-bridge/panel-styles/panel-dom/panel-view/recording-context tests, shared contract test. The broad shared contract test is intentionally reserved for cross-layer, packaging, documentation, native protocol, and retired-surface sentinels.

Forbidden paths: durable storage truth in UI code, domain rules coupled directly to DOM nodes, Photoshop calls inside pure domain modules, plugin-data fallback for automatic recording, using `activeDocument.saved` as the "has ever been saved locally" gate, reintroducing separate sequence-frame and step-image save roots, applying a manual OK-Record project folder globally across unrelated PSD/PSB documents, treating every Photoshop `close` event as the active recording document closing.

Predicted wrong defaults: Splitting into generic managers before there is a real domain boundary.

WHY: The OK-Record project folder is the user-visible continuity boundary, but the default directory must follow the current saved PSD/PSB to prevent a new document from silently writing into the previous document's timeline. A manual project-folder selection is scoped to the current document identity; artists who use incremental PSD/PSB saves can still continue one project by explicitly choosing that same OK-Record folder in each saved variant.

Implemented owner split:

- `uxp/domain/export-profile.js` owns export timing and profile normalization.
- `uxp/domain/path-policy.js` owns native path helpers, saved-PSD project roots, and bilingual recording/step directory names.
- `uxp/domain/recording-context.js` owns local PSD/PSB document identity, the OK-Record project output directory, document-scoped manual project-directory overrides, recording output context, and active-session/current-document matching. It intentionally ignores `activeDocument.saved` because that flag means "saved since last edit", not "has a local file path". Default recording roots are derived from the current saved PSD/PSB path. A manual project root applies only when the persisted `frameOutputDocumentKey` matches the current document key, so incremental PSD/PSB saves can continue one project only after the user explicitly selects that project folder for the current document; active recording writes still lock to the currently opened document identity to prevent accidental writes after a document switch. Document-close handling validates the locked Photoshop document id before ending a recording, so closing an unrelated document cannot stop the active timeline.
- `uxp/domain/settings-model.js` owns persisted panel settings defaults and normalization.
- `uxp/domain/painting-timer.js` owns painting timer state transitions and restore rules.
- `uxp/domain/recorder-state.js` owns recorder state transitions and active/busy predicates.
- `uxp/services/native-bridge.js` owns the native addon call boundary.
- `uxp/status-messages.js`, `uxp/panel-view.js`, `uxp/panel-dom.js`, and `uxp/panel-styles.js` own status copy, panel construction, DOM helpers, and panel styling.

## Native Storage And Recovery

Status: implemented

Contract: Native storage owns frame writing, metadata writing, manifest summaries, timeline scanning, and recovery. In v2, a frame is committed only when its metadata sidecar is valid. Orphan frame files are reported and ignored instead of invalidating the entire timeline.

Owners: `native/src/module.cpp`, `native/src/storage_recovery.cpp`, `native/src/storage_recovery.h`.

Topic docs:

- None. Keep storage/recovery architecture truth in this file.

Code anchors:

- `native/src/storage_recovery.cpp`
- `tests/native-recovery-scan.test.cpp`

Verification anchors: native recovery scan tests for orphan frames, gapped sessions, valid prefix recovery, and manifest rebuild.

Forbidden paths: frame-file-only commit authority, silent recovery guesses, automatic migration of old session internals in the v2 core.

Predicted wrong defaults: Marking the whole timeline invalid because a trailing orphan frame exists.

WHY: Crashes can occur after a frame file is written but before metadata is written. Metadata sidecars are the commit boundary because they let recovery distinguish committed frames from orphan files without guessing.

Clean-state decision: v2 does not automatically migrate old panel settings, old manifest internals, or old `Record_*` internals. Existing user files are not deleted or rewritten. Usable old raw-frame directories remain manually exportable as an implemented compatibility path, but there is no migration framework.

## Native Export

Status: implemented

Contract: Native export owns FFmpeg discovery, structured argv command assembly, logs, progress parsing, aspect-ratio normalization, and output publishing. Timeline export and directory export share one FFmpeg runner while keeping frame discovery separate.

Owners: `native/src/module.cpp`, `native/src/export_runner.cpp`, `native/src/export_runner.h`, `native/src/export_progress.cpp`, `native/src/export_progress.h`.

Topic docs:

- None. Keep export architecture truth in this file.

Code anchors:

- `native/src/module.cpp`
- `native/src/export_runner.cpp`
- `native/src/export_progress.cpp`

Verification anchors: native export-progress tests, native export-runner smoke, `packaging/RUNTIME_SMOKE_CHECKLIST.md`, bundled and PATH-based FFmpeg checks.

Forbidden paths: shell-string FFmpeg commands, duplicated FFmpeg runner logic, export logs outside the timeline/directory export root.

Predicted wrong defaults: Reintroducing `Record_*` as the recording unit, or merging timeline and directory frame discovery instead of only sharing the FFmpeg runner.

WHY: A drawing document should export as one continuous timelapse across pauses and restarts. Timeline export and arbitrary sequence export have different discovery rules, but they share the same FFmpeg execution, progress, log, and publishing semantics.

## Documentation And Build Routing

Status: implemented

Contract: Root docs route development work. `docs/index.html` is the single user-facing documentation source for GitHub Pages and packaged local help. `docs/update.json` is the static GitHub Pages update manifest consumed by the UXP panel for update reminders only. `packaging/INSTALL.md` owns install/package contents. Build and packaging scripts copy `docs/index.html` and `docs/images/` into the installed plugin payload without becoming architecture truth.

Public GitHub source uploads expose `Architecture.md` as the only developer documentation. Do not include local collaboration docs such as `AGENTS.md`, `PLAN.md`, `Checklist.md`, `docs/README.md`, or scoped docs in the public upload set.

Owners: `README.md`, `AGENTS.md`, `Architecture.md`, `PLAN.md`, `Checklist.md`, `docs/README.md`, `docs/index.html`, `docs/update.json`, `docs/images/`, `packaging/INSTALL.md`, `packaging/`.

Topic docs:

- `docs/README.md`
- `docs/mac-build.md`
- `docs/update.json`
- `packaging/INSTALL.md`

Code anchors:

- `packaging/build-release.ps1`
- `tests/recorder-contract.test.js`

Verification anchors: docs routing review, contract test, open-source audit, package manifest inspection.

Forbidden paths: un-routed planning docs, duplicate active plans, treating user docs as the architecture source of truth.

Predicted wrong defaults: Recreating a second HTML documentation source under `uxp/docs/` or adding a new planning file outside the root doc chain.

Retired documentation paths: `docs/v2-architecture.md` and `docs/zh-CN/v2-architecture.md` were duplicate scoped architecture mirrors. Their stable contracts now live in this file, so they must not be recreated as parallel architecture authorities.

## Verification Baseline

Minimum architecture verification uses the smallest checks that prove the touched owner path:

```powershell
node --check uxp\main.js
node --check uxp\status-messages.js
node --check uxp\panel-styles.js
node --check uxp\panel-dom.js
node --check uxp\panel-view.js
node --check uxp\services\native-bridge.js
node tests\uxp-panel-smoke.test.js
node tests\panel-styles.test.js
node tests\panel-dom.test.js
node tests\panel-view.test.js
node tests\native-bridge.test.js
node tests\recorder-contract.test.js
node tests\status-messages.test.js
node tests\recorder-scheduler.test.js
.\tools\test-native-recovery-scan.ps1
.\tools\test-native-export-progress.ps1
.\tools\test-native-export-runner.ps1
.\packaging\verify-installed-payload.ps1
.\tools\open-source-audit.ps1
git diff --check
```

Focused domain tests:

- `tests/export-profile.test.js`
- `tests/path-policy.test.js`
- `tests/recording-context.test.js`
- `tests/settings-model.test.js`
- `tests/painting-timer.test.js`
- `tests/recorder-domain.test.js`
