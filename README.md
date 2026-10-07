<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Folio" width="88" />
  <h1>Folio</h1>
  <p>A focused Markdown editor for local files. Write visually, inspect the source, or settle in to read.</p>
  <p><a href="https://github.com/mozanunal/folio/releases">Download the beta</a> · <a href="https://github.com/mozanunal/folio/issues">Report an issue</a> · <a href="releases/0.1.0.md">Release notes</a></p>
  <p><img src="https://img.shields.io/badge/version-0.1.0_beta-54705b" alt="0.1.0 beta" /> <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" /> <img src="https://img.shields.io/badge/desktop-Tauri_%2B_Rust-orange" alt="Tauri and Rust" /></p>
</div>

Folio opens individual Markdown files and folders without importing them into a vault. It combines a visual editor with formulas, diagrams, images and code, inside a small desktop shell built with Rust and Tauri. Your documents remain ordinary `.md` files.

## Install

Download **Folio 0.1.0 Beta** from [GitHub Releases](https://github.com/mozanunal/folio/releases).

| Platform | Asset | Installation |
| --- | --- | --- |
| macOS Apple Silicon | `Folio_0.1.0_macos-arm64.zip` | Extract and drag `Folio.app` into Applications. |
| Windows Intel/AMD x64 | `Folio_0.1.0_windows-x64-setup.exe` | Run the setup installer. |
| Linux Intel/AMD x64 | `Folio_0.1.0_linux-x64.AppImage` | Make executable and launch. |
| Debian/Ubuntu Intel/AMD x64 | `Folio_0.1.0_linux-x64.deb` | Install using `sudo apt install ./Folio_0.1.0_linux-x64.deb`. |

Only these architectures are built. Windows setup installs WebView2 if needed, which requires internet access. On Linux, AppImage may require FUSE; `--appimage-extract-and-run` is an alternative. The `.deb` package resolves its system dependencies through apt.

The beta is not signed by a trusted publisher or notarized by Apple. macOS may offer **Open Anyway** in System Settings > Privacy & Security after the first launch attempt. Windows SmartScreen may offer **More info > Run anyway**. Only allow a download you obtained from this repository. Each release includes `SHA256SUMS.txt` to verify the downloaded files.

### macOS says “Apple could not verify Folio”

Click **Done**, then open **System Settings > Privacy & Security**, scroll to Security, and click **Open Anyway** for Folio. Confirm with **Open**. This applies to the downloaded 0.1.0 beta. See the [macOS installation guide](docs/macos-installation.md) for the full steps and signing setup.

## What you can do

| Feature | Details |
| --- | --- |
| Visual editing | Format headings, emphasis, lists, quotes, links and code directly in the document. |
| Three modes | **Write** for visual editing, **Source** for highlighted Markdown, **Read** for a read-only view. |
| GFM tables and tasks | Insert tables, add or remove rows and columns, and work with nested checklists. |
| LaTeX math | Render inline and display formulas with KaTeX. Click a formula to edit it. |
| Images and SVG | Display raster images and SVGs, including relative local images within the opened document's directory. |
| Mermaid diagrams | Render diagrams on demand, follow the current theme, and reveal the source when editing. |
| Code blocks | Syntax highlighting and a copy button. |
| Files and folders | Open a single document or browse a folder through the sidebar. Follow relative Markdown links in document tabs. |
| Document tabs | Keep separate edits, undo history, view modes and scroll positions during the session. |
| Appearance | Light and dark themes, plus a remembered centered or full width layout. |
| Saving | Save and Save As, unsaved-change prompts, and checks for external changes before overwriting. |

KaTeX and Mermaid are bundled for offline rendering. Remote images still need a network connection. Folio uses the system webview rather than shipping a browser runtime.

## A quick start

Open a file or folder, or use **New** to start a document. The toolbar inserts tables, formulas, images and diagrams.

In **Write** mode:

- Type `$E = mc^2$` to create an inline formula, or `$$E = mc^2$$` on its own line for display math.
- Type `- [ ]` to create a task. Use Tab and Shift+Tab to nest and unnest list items.
- Enter `| Name | Value |`, press Enter, then type `| --- | --- |` to create a table. Click a cell to reveal row and column controls. Tab moves between cells and adds a row at the end.
- Use the diagram toolbar button to insert Mermaid. **Edit diagram** reveals its code.
- Use **↔** beside New to toggle full width.

Try [the sample document](examples/welcome.md) for tables, formulas, code and diagrams.

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

| Action | Shortcut |
| --- | --- |
| New document | Cmd/Ctrl+N |
| Open file | Cmd/Ctrl+O |
| Open folder | Cmd/Ctrl+Shift+O |
| Save | Cmd/Ctrl+S |
| Save As | Cmd/Ctrl+Shift+S |
| Close tab | Cmd/Ctrl+W |
| Next tab | Ctrl+Tab |
| Previous tab | Ctrl+Shift+Tab |
| Zoom in | Cmd/Ctrl++ or Cmd/Ctrl+= |
| Zoom out | Cmd/Ctrl+- |
| Reset zoom to 100% | Cmd/Ctrl+0 |

Desktop zoom changes the whole interface in 10% steps, from 50% to 200%, and is remembered between sessions. Browser previews use the browser's own zoom shortcuts.

## Beta status

Folio is ready for early testing. Keep backups of important documents: visual editing can normalize Markdown formatting, and unsupported syntax may not survive a round trip exactly.

macOS file opening at launch and while the app is running, and native window closing, have been manually checked. Windows and Linux desktop behavior still need testing on real machines. Cross-platform release builds run automated frontend and Rust tests before publication. Startup time and large-document performance have not yet been benchmarked.

Current gaps include complete GFM conformance, exact preservation of unchanged Markdown, clipboard image import, file watching, directory search and restoring tabs after quitting. Code highlighting currently includes six languages. Relative images outside the granted asset directory are not supported yet.

Found a problem? [Open an issue](https://github.com/mozanunal/folio/issues) with your OS version, steps to reproduce and a small example document. See [STATUS.md](STATUS.md) for verification details and remaining work.

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

macOS packaging supports Developer ID signing and notarization when all required Apple secrets are configured; otherwise it uses ad-hoc signing. See [macOS signing setup](docs/macos-installation.md#removing-this-warning-in-future-releases). The published 0.1.0 beta is ad-hoc signed and not notarized.

With an authenticated GitHub CLI, `npm run github:metadata` updates the repository About description, homepage and topics from `package.json`.

## License

[MIT](LICENSE).
