![Folio](src-tauri/icons/icon.png)

# Folio

A focused WYSIWYG Markdown editor for local files. Write visually, inspect the source, or settle in to read.

[Download the beta](https://github.com/mozanunal/folio/releases) · [Release notes](releases/0.1.1.md) · [Report an issue](https://github.com/mozanunal/folio/issues)

## Why another Markdown editor?

Many editors cover parts of this workflow. We wanted visual Markdown editing, technical notation and ordinary file access together in a small, open-source desktop app. Something you could open for a single README, then use to browse a whole folder of research notes, without creating a vault.

Our wishlist was WYSIWYG editing with Markdown source access, GFM tables and task lists, inline and display LaTeX, Mermaid diagrams, local images and SVGs, and syntax highlighting. It also had to open both individual files and directories on macOS, Windows and Linux.

Folio brings that combination together, with tabs, a read-only mode and links between documents. Rust and Tauri provide the desktop shell, using the system webview. A small download and responsive editing are design goals; performance benchmarks are still ahead.

## What it offers

- **Write, Source and Read** modes, with document tabs and separate undo histories.
- **GFM tables and task lists**, LaTeX math, Mermaid, images, SVGs and syntax highlighting.
- **Files and folders**, relative Markdown links and local saving.
- **Six color schemes**, independent light/dark modes, zoom and a resizable sidebar.

Math and diagrams render offline. Your documents stay ordinary `.md` files.

## Install

Download **Folio 0.1.1 Beta** from [GitHub Releases](https://github.com/mozanunal/folio/releases/tag/v0.1.1).

| Platform | Package |
| --- | --- |
| macOS Apple Silicon | ZIP, extract and drag Folio.app to Applications |
| Windows Intel/AMD x64 | Setup installer |
| Linux Intel/AMD x64 | AppImage or Debian/Ubuntu `.deb` |

The beta is not signed by a trusted publisher. See the [macOS first-launch instructions](docs/macos-installation.md); Windows may show SmartScreen. Windows setup may need internet to install WebView2. Release notes include Linux installation details and download checksums.

## Get started

Open a file or folder, or choose **New**. Use the toolbar to insert tables, formulas, images and diagrams. Type `$E = mc^2$` for inline math or `- [ ]` for a checklist.

See the [usage guide](docs/usage.md) for shortcuts, terminal opening and editing controls, or try the [sample document](examples/welcome.md).

## Beta status

Visual edits can normalize Markdown formatting, and unsupported syntax may not round-trip exactly. Keep backups of important documents. Clipboard image import, file watching, directory search and restoring tabs after quitting are still planned. Windows and Linux builds pass automated checks; interactive desktop testing remains ongoing.

See [STATUS.md](STATUS.md) for verification details and [development instructions](docs/development.md) to build, test or contribute.

## License

[MIT](LICENSE).
