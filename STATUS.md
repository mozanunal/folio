# Beta status

The project is initialized locally as Folio in `markdown-studio`.

Version 0.1.0 is designated beta. The release workflow targets only macOS ARM64, Windows x64 and Linux x64, and publishes a prerelease after all tests and packaging jobs pass. Published artifacts and real Windows/Linux desktop behavior must be checked separately.

## Implemented in source

- Rust/Tauri desktop shell and cross-platform build configuration.
- A visual editor using Tiptap with GFM table/task extensions, KaTeX formulas, local SVG/image node views, code highlighting and lazy Mermaid rendering.
- Write, Source and Read modes, contextual table controls, theme switching and keyboard shortcuts.
- Document tabs with separate text, editing history, modes, scroll positions and unsaved-change prompts.
- Typed inline/display formulas, pipe tables and checklists convert in Write mode.
- Mermaid previews follow the theme and hide the code frame outside source editing; code blocks support clipboard copying.
- Source syntax highlighting and task checkboxes excluded from the Tab focus order.
- Platform-specific Cmd/Ctrl plus, minus and zero zoom shortcuts, persistent native webview zoom, and bounded zoom requests applied in order.
- Native file/folder dialogs, a lazy directory tree, explicit saving and Save As.
- Queued macOS file/folder-open events, startup file/directory arguments and the window-destroy capability required by the native close handler.
- A macOS `folio` command-line launcher installed through `npm run install:cli`, including paths with spaces and forwarding to a running app.
- File access restricted to selected files, directory roots and explicitly followed Markdown/text links from an authorized document.
- Relative Markdown links open or select tabs, preserve unsaved edits and Read mode, and navigate heading fragments.
- Save conflict detection, replacement through a temporary file, and unsaved-change prompts.
- An example document and regression tests for Markdown import/serialization.

## Verification

Passed: 52 JavaScript/TypeScript tests using Node and Vitest, including typing conversions, table commands and Markdown round trips, read-only behavior, clipboard feedback, Mermaid theme changes, per-document tab state, save arguments and tab/window close prompts. TypeScript checking and the Vite production build pass. All four Cargo tests pass, covering file access, save conflicts, startup file-open request queuing and resolving linked documents from authorized origins.

The installed dependency tree uses Vitest 4.1.11 and KaTeX 0.18.10, with Mermaid sharing KaTeX. npm and Cargo lockfiles are tracked. esbuild's installed setup script is approved and optional fsevents installation scripts are disabled. A fresh online npm audit remains unverified in this session.

The macOS release build and app bundling pass. The explicit aarch64-apple-darwin beta build also passes; its ARM64-only architecture and ad-hoc signature are verified, and its release ZIP passes archive integrity checks. The 0.1.0 release workflow passed on macOS ARM64, Windows x64 and Linux x64, and all four published artifacts are available. The downloaded Windows installer checksum was verified. A 6.9 MiB standalone app is installed at ~/Downloads/Folio.app, locally signed, signature-verified, launched and inspected through the native accessibility tree. Finder Open With was checked in a separately signed test copy: the requested file replaces Welcome at cold start, a second file opens as another tab in the running app, and the red close button exits a clean window. Unsaved tab and window prompts have automated coverage using mocked native dialogs and commands. Windows/Linux interactive desktop behavior, full visual inspection and startup timing remain unverified. GitHub publication and repository metadata updates succeeded after terminal network access became available.

Optional macOS Developer ID signing and notarization are wired into the release build. Empty secrets preserve ad-hoc beta builds; incomplete credentials fail. Packaging preserves Developer ID signatures and verifies notarization tickets and Gatekeeper assessment. Four regression tests cover signing configuration. Real signing and notarization remain unverified because no Apple distribution certificate or repository signing secrets are configured.

## Run next

```sh
npm install
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

First acceptance check: open `examples/welcome.md`, edit a table and equation, expand its folder, save a copy, and reopen it. Run the Markdown integration tests before using important documents.

## Remaining work

Exact preservation of unchanged Markdown blocks; complete GFM conformance and unknown-syntax preservation; Windows/Linux open-event acceptance checks; clipboard image import; directory-wide search; external file watching; tab session restoration; large-document benchmarks; accessibility and platform input testing; signed release packaging. Code highlighting currently includes six languages. Relative images outside the granted asset directory are not yet supported. The core editor uses a system webview, so performance must be measured on all three platforms.
