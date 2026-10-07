# Folio

A focused, local Markdown editor for macOS, Windows and Linux. Rust and Tauri provide the desktop shell; TypeScript and Tiptap provide the visual editor.

## Development

Install Node.js 22.18+, Rust, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
npm install
npm run tauri dev
```

Browser development: `npm run dev`. The browser supports sample documents and opening files, while directory browsing and saving to disk use the desktop app.

The desktop launcher checks for Cargo on PATH and falls back to the active rustup toolchain when needed.

```sh
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

## First milestone

In Write mode, type `$m/a$` to render inline math when the closing dollar sign is entered. Click a rendered formula to edit it, or use the ∑ toolbar button. Source mode also supports display equations between `$$` delimiters.

Type `$$A/B$$` on its own line for display math. To type a table, enter `| One | Two |`, press Enter, and type `| --- | --- |`. Completing the separator creates the table and places the cursor in its first body cell. Separators without outer pipes convert on Enter.

The ↔ button beside New switches between centered reading width and full width in every mode. This preference is remembered between sessions.

Read mode renders the current document without allowing edits. Code copying and document scrolling remain available.

Open files and create documents in separate tabs. Each tab keeps its unsaved changes, editing history, mode and scroll position. Use the + button or Cmd/Ctrl+N for a new tab, Cmd/Ctrl+W to close it, and Ctrl+Tab or Ctrl+Shift+Tab to switch tabs. Closing a modified document prompts to save or discard. Tabs are kept in memory during the current session.

In Write mode, click inside a table to show its row and column controls. Insert rows above or below, insert columns left or right, remove the selected row or column, or delete the table. Tab moves between cells and adds a row at the end. Table edits support undo.

Visual Markdown editing, GFM tables and tasks, inline and display math, images including SVG, Mermaid code blocks, highlighted code, individual documents, and a directory sidebar. Math and Mermaid dependencies are bundled for offline use. Mermaid loads on demand.

This is an early prototype. Do not use it as the only copy of an important document. Markdown serialization currently normalizes formatting after edits; exact preservation of untouched source, complete GFM conformance, file watching, directory search, clipboard image import, OS open-event handling and platform performance measurements remain milestones. Saving checks for external changes before overwriting. Platform file associations are declared but end-to-end Finder/Explorer integration still needs validation.

## Performance approach

Keep a single editor instance and retain each tab's editor state. Update editor nodes through ProseMirror transactions. Render diagrams only when visible, cache unchanged diagrams, and serialize only on explicit save or mode changes. List directories on expansion rather than recursively scanning the whole workspace.

Initial goals, not measured claims: an editable window within one second on agreed hardware, responsive editing of a 1 MB Markdown document, and a small installer measured separately from platform webview runtimes.

## License

MIT. See LICENSE.
