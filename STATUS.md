# Prototype status

The project is initialized locally as Folio in `markdown-studio`.

## Implemented in source

- Rust/Tauri desktop shell and cross-platform build configuration.
- A visual editor using Tiptap with GFM table/task extensions, KaTeX formulas, local SVG/image node views, code highlighting and lazy Mermaid rendering.
- Visual and source modes, formatting controls, theme switching and keyboard shortcuts.
- Native file/folder dialogs, a lazy directory tree, explicit saving and Save As.
- File access restricted to selected files and directory roots.
- Save conflict detection, replacement through a temporary file, and unsaved-change prompts.
- An example document and regression tests for Markdown import/serialization.

## Verification in the initial session

Passed: two path/link tests using Node; two Rust storage tests compiled directly with rustc; Rust formatting; JSON configuration parsing; first-party TypeScript syntax checks.

Not verified: dependency-resolved TypeScript build, Tiptap integration tests, Tauri compilation, desktop launch, visual inspection, packaging or performance. The session cannot resolve npm/Cargo registry hosts, and required dependencies are absent from the local cache.

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

Exact preservation of unchanged Markdown blocks; complete GFM conformance and unknown-syntax preservation; OS open-event handling; clipboard image import; directory-wide search; external file watching; multi-document tabs; large-document benchmarks; accessibility and platform input testing; signed release packaging. Code highlighting currently includes six languages. Relative images outside the granted asset directory are not yet supported. The core editor uses a system webview, so performance must be measured on all three platforms.
