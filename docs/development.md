# Development and releases

## Develop

Install **Node.js 22.18+**, **Rust stable** and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
npm ci
npm run tauri dev
```

For browser-only UI work, run `npm run dev`. Browser mode supports sample documents and file opening; native directory browsing and disk saving use the desktop app. The launcher falls back to the active rustup toolchain if Cargo is missing from PATH.

### Check and build

```sh
npm test
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

A standalone macOS app can be built with `npm run tauri -- build --bundles app`. Bundles appear under `src-tauri/target/release/bundle/` unless an explicit Rust target is selected.

### Project layout

```text
src/                  TypeScript UI, editor extensions and tests
src-tauri/            Rust desktop shell, file access and app configuration
scripts/              Toolchain launcher and release helpers
examples/             Sample Markdown document
releases/             Versioned release notes
.github/workflows/    Checks and beta packaging
```

### Performance approach

Folio keeps one editor instance, retains each tab's editor state, lists directories when expanded, and renders Mermaid only when visible. Full-document serialization happens on saving or mode changes rather than every keystroke. These choices are intended to keep editing responsive; measured performance on all three platforms remains a milestone.

## Release

Keep the version aligned across `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`. Add `releases/<version>.md`, then push a matching `v<version>` tag or run **Beta release** on the intended commit.

The workflow checks versions, tests the frontend, runs native tests and packages exactly three targets: `aarch64-apple-darwin`, `x86_64-pc-windows-msvc` and `x86_64-unknown-linux-gnu`. Publication waits for every platform build. Releases are marked as prereleases and include SHA-256 checksums; existing releases are not overwritten.

macOS packaging supports Developer ID signing and notarization when all required Apple secrets are configured; otherwise it uses ad-hoc signing. See [macOS signing setup](macos-installation.md#removing-this-warning-in-future-releases). The published 0.1.1 beta is ad-hoc signed and not notarized.

With an authenticated GitHub CLI, `npm run github:metadata` updates the repository About description, homepage and topics from `package.json`.

