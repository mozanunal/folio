# Prototype status

The project is initialized locally as Folio in `markdown-studio`.

## Implemented in source

- Rust/Tauri desktop shell and cross-platform build configuration.
- A visual editor using Tiptap with GFM table/task extensions, KaTeX formulas, local SVG/image node views, code highlighting and lazy Mermaid rendering.
- Write, Source and Read modes, contextual table controls, theme switching and keyboard shortcuts.
- Document tabs with separate text, editing history, modes, scroll positions and unsaved-change prompts.
- Typed inline/display formulas, pipe tables and checklists convert in Write mode.
- Mermaid previews follow the theme and hide the code frame outside source editing; code blocks support clipboard copying.
- Source syntax highlighting and task checkboxes excluded from the Tab focus order.
- Native file/folder dialogs, a lazy directory tree, explicit saving and Save As.
- Queued macOS file-open events, startup file arguments and the window-destroy capability required by the native close handler.
- File access restricted to selected files and directory roots.
- Save conflict detection, replacement through a temporary file, and unsaved-change prompts.
- An example document and regression tests for Markdown import/serialization.

## Verification

Passed: 41 frontend tests using Node and Vitest, including typing conversions, table commands and Markdown round trips, read-only behavior, clipboard feedback, Mermaid theme changes, per-document tab state, save arguments and tab/window close prompts. TypeScript checking and the Vite production build pass. All three Cargo tests pass, covering file access, save conflicts and startup file-open request queuing.

The installed dependency tree uses Vitest 4.1.11 and KaTeX 0.18.10, with Mermaid sharing KaTeX. npm and Cargo lockfiles are tracked. esbuild's installed setup script is approved and optional fsevents installation scripts are disabled. A fresh online npm audit remains unverified in this session.

The macOS release build and app bundling pass. A 6.9 MiB standalone app is installed at ~/Downloads/Folio.app, locally signed, signature-verified, launched and inspected through the native accessibility tree. Finder Open With was checked in a separately signed test copy: the requested file replaces Welcome at cold start, a second file opens as another tab in the running app, and the red close button exits a clean window. Unsaved tab and window prompts have automated coverage using mocked native dialogs and commands. Windows/Linux launch, distribution packaging, full visual inspection and startup timing remain unverified. This agent session cannot bind the development server port or resolve GitHub and package registries.

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
