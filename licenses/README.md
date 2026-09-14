# Bundled Runtime notices

Codex Shell bundles an unmodified Codex Runtime and its companion binaries so
that the application can run without a separate Codex installation.

- `Apache-2.0.txt` is the Apache License 2.0 text used by the Codex project.
- `CODEX-NOTICE` is the notice file distributed with the Codex source tree.
- `RIPGREP-MIT.txt` covers the separately bundled, unmodified ripgrep 15.2.0
  Windows x64 MSVC executable under the MIT license (upstream also offers
  the Unlicense). Source and release: https://github.com/BurntSushi/ripgrep/tree/15.2.0.
  The archive and executable SHA-256 pins are in `scripts/stage-ripgrep.ps1`.

The Codex Runtime is an independent component of Codex Shell. Codex Shell does
not modify Codex Core and is not an official OpenAI product or an OpenAI
endorsed application. The installer does not contain an API key or model
credentials; each user supplies and stores their own credentials.

The Runtime version and SHA-256 values bundled in this build are recorded in
`bundled/runtime-manifest.json`. Third-party dependency notices should be
extended here before a public commercial release if the Runtime build changes.
