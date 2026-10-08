# Using Folio

## Getting started

Open a file or folder, or use **New** to start a document. The toolbar inserts tables, formulas, images and diagrams.

In **Write** mode:

- Type `$E = mc^2$` to create an inline formula, or `$$E = mc^2$$` on its own line for display math.
- Type `- [ ]` to create a task. Use Tab and Shift+Tab to nest and unnest list items.
- Enter `| Name | Value |`, press Enter, then type `| --- | --- |` to create a table. Click a cell to reveal row and column controls. Tab moves between cells and adds a row at the end.
- Use the diagram toolbar button to insert Mermaid. **Edit diagram** reveals its code.
- Use **↔** beside New to toggle full width.
- Drag the sidebar edge to reveal longer filenames. Double-click to reset its width, or focus the edge and use the arrow keys.
- Use the light/dark button at the sidebar bottom to switch appearance. The adjacent color scheme button offers Paper, Sepia, Ocean, Forest, Nord and Graphite, each in both modes. Folio remembers your mode, color scheme and sidebar width.

Try [the sample document](../examples/welcome.md) for tables, formulas, code and diagrams.

### Follow links between documents

Click a relative Markdown link in Write or Read mode to open the target in a tab. Paths resolve from the current document's folder, including parent folders and encoded spaces. Already open documents keep their unsaved edits. New tabs opened from Read mode stay read-only.

```markdown
[Training Patterns](development/training-patterns.md)
[CT Reconstruction](../ct-reconstruction.md#filtered-back-projection)
[Development](#development)
```

Heading fragments jump to matching headings, including repeated headings with `-1`, `-2` suffixes. Linked files must be Markdown or text documents (`.md`, `.markdown`, `.txt`). Save a new document before following relative file links. File navigation is available in the desktop app; missing files and headings display an error without replacing the current document.

### Shortcuts

Use **Cmd** on macOS and **Ctrl** on Windows/Linux unless specified otherwise.

| Action             | Shortcut                 |
| ------------------ | ------------------------ |
| New document       | Cmd/Ctrl+N               |
| Open file          | Cmd/Ctrl+O               |
| Open folder        | Cmd/Ctrl+Shift+O         |
| Save               | Cmd/Ctrl+S               |
| Save As            | Cmd/Ctrl+Shift+S         |
| Close tab          | Cmd/Ctrl+W               |
| Next tab           | Ctrl+Tab                 |
| Previous tab       | Ctrl+Shift+Tab           |
| Zoom in            | Cmd/Ctrl++ or Cmd/Ctrl+= |
| Zoom out           | Cmd/Ctrl+-               |
| Reset zoom to 100% | Cmd/Ctrl+0               |

Desktop zoom changes the whole interface in 10% steps, from 50% to 200%, and is remembered between sessions. Browser previews use the browser's own zoom shortcuts.

## Open from a terminal

On macOS, install the launcher once from this source checkout:

```sh
npm run install:cli
```

It installs `folio` in `~/.local/bin`, which must be on your PATH. The launcher finds Folio in Applications or Downloads and forwards paths to the app, including an already running window.

```sh
folio ~/notes/                   # Open a folder in the sidebar
folio ~/notes/ideas.md           # Open a file in a tab
folio ./one.md ./two.md          # Open multiple files
folio "./Research Notes/"        # Paths containing spaces
```

Opening a folder keeps existing document tabs and unsaved changes. The native executable also accepts file and folder paths at startup on Windows/Linux; their command installation depends on how the app is installed.

