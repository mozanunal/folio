# Prototype status

The project is initialized locally as Folio in `markdown-studio`.

## Implemented in source

- Rust/Tauri desktop shell and cross-platform build configuration.
- A visual editor using Tiptap with GFM table/task extensions, KaTeX formulas, local SVG/image node views, code highlighting and lazy Mermaid rendering.
- Write, Source and Read modes, contextual table controls, theme switching and keyboard shortcuts.
- Document tabs with separate text, editing history, modes, scroll positions and unsaved-change prompts.
- Typed inline/display formulas, pipe tables and checklists convert in Write mode.
- Mermaid previews follow the theme and hide the code frame outside source editing; code blocks support clipboard copying.
- Native file/folder dialogs, a lazy directory tree, explicit saving and Save As.
- File access restricted to selected files and directory roots.
- Save conflict detection, replacement through a temporary file, and unsaved-change prompts.
- An example document and regression tests for Markdown import/serialization.

## Verification

Passed: 37 frontend tests using Node and Vitest, including typing conversions, table commands and Markdown round trips, read-only behavior, clipboard feedback, Mermaid theme changes, per-document tab state, save arguments and tab/window close prompts. TypeScript checking and the Vite production build pass. The initial two standalone Rust storage tests passed; native code has not changed since those checks.

The installed dependency tree uses Vitest 4.1.11 and KaTeX 0.18.10, with Mermaid sharing KaTeX. npm and Cargo lockfiles are tracked. esbuild's installed setup script is approved and optional fsevents installation scripts are disabled. A fresh online npm audit remains unverified in this session.

Desktop screenshots from the user confirm the app runs on macOS. Native tab and window workflows still need manual acceptance testing; tests mock the native dialogs and commands. Windows/Linux launch, packaging, full visual inspection and performance remain unverified. This agent session cannot bind the development server port or resolve GitHub and package registries.

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

Exact preservation of unchanged Markdown blocks; complete GFM conformance and unknown-syntax preservation; OS open-event handling; clipboard image import; directory-wide search; external file watching; tab session restoration; large-document benchmarks; accessibility and platform input testing; signed release packaging. Code highlighting currently includes six languages. Relative images outside the granted asset directory are not yet supported. The core editor uses a system webview, so performance must be measured on all three platforms.
