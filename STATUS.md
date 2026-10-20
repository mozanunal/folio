# Beta status

The project is initialized locally as Folio in `markdown-studio`.

Version 0.1.1 is designated beta. The release workflow targets only macOS ARM64, Windows x64 and Linux x64, and publishes a prerelease after all tests and packaging jobs pass. Published artifacts and real Windows/Linux desktop behavior must be checked separately.

## Implemented in source

- Rust/Tauri desktop shell and cross-platform build configuration.
- A visual editor using Tiptap with GFM table/task extensions, KaTeX formulas, local SVG/image node views, code highlighting and lazy Pele rendering of Mermaid syntax.
- Write, Source and Read modes, contextual table controls, six color schemes with independent light/dark modes, a remembered resizable sidebar and keyboard shortcuts.
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

Passed: 70 JavaScript/TypeScript tests using Node and Vitest, including typing conversions, table commands and Markdown round trips, read-only behavior, clipboard feedback, Pele rendering, theme-independent previews, rendering error recovery, per-document tab state, save arguments and tab/window close prompts. TypeScript checking and the Vite production build pass. All four Cargo tests pass, covering file access, save conflicts, startup file-open request queuing and resolving linked documents from authorized origins.

The installed dependency tree uses Vitest 4.1.11, KaTeX 0.18.10 and Pele 1.7.0. Mermaid.js and its unused transitive dependencies have been removed. npm and Cargo lockfiles are tracked. esbuild's installed setup script is approved and optional fsevents installation scripts are disabled. On 2026-10-20, npm install reported zero vulnerabilities in the resulting 147-package dependency tree.

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

## Pele migration, 2026-10-20

Pele 1.7.0 replaces Mermaid.js as the renderer, while documents keep their `mermaid` fences. Real-renderer tests cover flowcharts, sequences, class/state/ER diagrams, pie, Gantt, mindmaps, timelines and XY charts, plus error limits and markup handling. Editor tests cover unchanged Markdown, theme changes without re-rendering and recovery from errors. Diagram links and embedded images are disabled.

On the same local production build setup, total emitted JavaScript decreased from 4,048,576 bytes to 1,594,928 bytes, a 60.6% reduction. These totals include all lazy chunks, not just initial downloads. Startup time, rendering speed and RAM have not been benchmarked. The main application chunk still triggers Vite's existing size warning. Native desktop packages for this renderer change have not been rebuilt or manually checked.
