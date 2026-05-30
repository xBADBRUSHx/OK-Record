# Security Policy

## Supported Versions

This repository is pre-1.0. Security fixes should target the current `main` branch unless a release branch is explicitly created later.

## Reporting

Do not open a public issue for a vulnerability that exposes private data, unsafe command execution, install hijacking, or a malicious payload path. Contact the maintainer privately first. If no private contact is listed on the GitHub repository, open a minimal public issue asking for a security contact without including exploit details.

## Scope

Relevant security issues include:

- unsafe handling of user-selected filesystem paths
- unintended inclusion of Adobe SDKs, generated binaries, PSD/PSB files, captures, exports, logs, or private data
- unsafe FFmpeg command construction or process invocation
- installer/package contents that differ from the reviewed source build

This repository does not commit FFmpeg, Adobe UXP Hybrid SDK, Adobe Photoshop SDK, or Photoshop itself. A Windows no-setup release package may bundle FFmpeg inside the plugin payload, with the matching third-party notices and license files.
