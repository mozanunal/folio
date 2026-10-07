# Folio

A focused, local Markdown editor for macOS, Windows and Linux. Rust and Tauri provide the desktop shell; TypeScript and Tiptap provide the visual editor.

## Development

Install Node.js 22.18+, Rust, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev
```

Browser development: `npm run dev`. The browser supports sample documents and opening files, while directory browsing and saving to disk use the desktop app.

```sh
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

## First milestone

Visual Markdown editing, GFM tables and tasks, inline and display math, images including SVG, Mermaid code blocks, highlighted code, individual documents, and a directory sidebar. Math and Mermaid dependencies are bundled for offline use. Mermaid loads on demand.

This is an early prototype. Do not use it as the only copy of an important document. Markdown serialization currently normalizes formatting after edits; exact preservation of untouched source, complete GFM conformance, file watching, directory search, clipboard image import, OS open-event handling and platform performance measurements remain milestones. Saving checks for external changes before overwriting. Platform file associations are declared but end-to-end Finder/Explorer integration still needs validation.

## Performance approach

Keep a single editor instance. Update editor nodes through ProseMirror transactions. Render diagrams only when visible, cache unchanged diagrams, and serialize only on explicit save or mode changes. List directories on expansion rather than recursively scanning the whole workspace.

Initial goals, not measured claims: an editable window within one second on agreed hardware, responsive editing of a 1 MB Markdown document, and a small installer measured separately from platform webview runtimes.

## License

MIT. See LICENSE.
