# Architecture & Collaboration Guide

## Role

`AGENTS.md` is the repository-level development canon for OK-Record. Keep this file compact and practical.

It owns:

- collaboration discipline
- coding and abstraction discipline
- dirty-worktree rules
- architecture and fallback approval gates
- root and scoped document routing
- closeout expectations

It does not own:

- level-1 architecture contracts and scoped routes: `Architecture.md`
- active development planning: `PLAN.md`
- completion tracking: `Checklist.md`
- topic details and engineering rationale: `docs/`
- user-facing usage instructions: `docs/index.html`

## Read Order

For non-trivial work, read:

1. `README.md`
2. `AGENTS.md`
3. `Architecture.md`
4. `PLAN.md`
5. `Checklist.md`
6. `docs/README.md`
7. The scoped docs routed from `docs/README.md`

## Documentation Rules

- `README.md` stays user-facing first, with a short developer entry map.
- `docs/index.html` is the single user-documentation source for GitHub Pages and the packaged local help entry.
- `Architecture.md` records stable level-1 architecture contracts, owner boundaries, source-of-truth routes, scoped-document routes, and verification anchors.
- `PLAN.md` records the active accepted execution plan only.
- `Checklist.md` records active completion state only.
- Scoped docs record stable topic contracts, engineering rationale, code routes, verification/audit anchors, forbidden paths, and deferred questions.
- Non-obvious decisions must include WHY and the rejected alternative when a future agent is likely to choose the wrong owner, dependency, fallback, or abstraction.
- After closeout, promote stable conclusions into `Architecture.md` and scoped docs, then reset `PLAN.md` and `Checklist.md`.

## Coding Discipline

For non-trivial changes:

- Convert the request into a verifiable goal before implementation.
- Keep every semantic changed line traceable to the user request, repo canon, required verification, or cleanup caused by the change.
- Match existing owner paths, naming, style, and verification patterns.
- Do not perform drive-by refactors or formatting changes.
- Preserve unrelated user or parallel-thread changes.
- Do not add speculative flexibility, configurability, broad fallback paths, compatibility paths, or broad error handling without repo evidence and explicit approval.

## Naming Discipline

- Use `OK-Record` for user-visible product spelling, package names, release assets, project folders, and generated export file prefixes.
- Use `ok-record` for technical slugs such as schemas, CSS classes, addon filenames, and web/update paths.
- Use `okRecord` for JavaScript identifiers and `ok_record` for C++ namespaces.
- Keep the stable install identity `com.badbrush.okrecord`; do not change it for cosmetic naming cleanup.
- Do not introduce a three-letter abbreviation, the old space-separated product spelling, or retired Stage-era naming unless the user explicitly approves a product rename.

## Abstraction Discipline

Prefer abstraction only when it compresses real same-type behavior into a clearer domain expression.

An abstraction must be justified by at least one of:

- multiple real call sites or same-type variants
- a stable domain concept that deserves a name
- a real boundary such as process, protocol, persistence, UI, native API, or test ownership
- reduced duplicate truth or a smaller future modification surface
- clearer verification around one owner path

Avoid generic `manager`, `coordinator`, `facade`, `strategy`, or `adapter` layers for a single call site unless the boundary is real and documented.

## Fallback And Compatibility Gates

- Do not add hidden fallback, compatibility, legacy migration, or silent recovery paths by default.
- A fallback or compatibility path requires explicit approval plus an owner, trigger, exit condition, and verification route.
- For the accepted v2 rebuild, old panel settings, old manifest internals, and old session internals are not automatically migrated.

## Dirty Worktree Rules

- Check `git status -sb` before editing.
- Never revert unrelated changes.
- Work with user changes if they affect the same file.
- Ignore unrelated dirty files unless they block the task.

## Verification Discipline

Use the smallest verification that proves the touched owner path, then run broader checks when the slice reaches integration.

Common anchors:

- `node --check uxp\main.js`
- `node tests\uxp-panel-smoke.test.js`
- `node tests\recorder-contract.test.js`
- `node tests\recorder-scheduler.test.js`
- `.\tools\test-native-recovery-scan.ps1`
- `.\tools\test-native-export-progress.ps1`
- `.\tools\open-source-audit.ps1`
- `git diff --check`
- `.\tools\verify-local.ps1 -HybridSdkPath $env:UXP_HYBRID_SDK`

## Predicted Wrong Defaults

| Use | Do Not Use | Why | Verification |
| --- | --- | --- | --- |
| UXP shell as a thin entry and UI owner | UXP shell as durable storage truth | Storage truth belongs to native frame/metadata files and JS domain state remains directly testable | Domain tests plus UXP smoke |
| Metadata sidecar as committed-frame marker | Frame file alone as committed authority | A crash can leave orphan frame files before metadata is written | Native recovery tests |
| Behavior tests for domain logic | Source-string assertions as the main proof | String checks preserve spelling, not behavior | Focused JS and native tests |
| One documented docs source route | Parallel un-routed docs | Hidden duplicate authority makes future edits drift | `docs/README.md` routing and doc parity checks |
