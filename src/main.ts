import { invoke, isTauri } from '@tauri-apps/api/core'
import { createEditor } from './editor'
import { basename, type DocumentFile, type DirectoryEntry } from './files'
import { sample } from './sample'
import 'katex/dist/katex.min.css'
import './style.css'

const desktop = isTauri()
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">f.</span><strong>folio</strong><span class="build-tag">EARLY BUILD</span></div>
    <div class="workspace-actions"><button data-action="open-file">Open file <kbd>⌘O</kbd></button><button data-action="open-folder">Open folder <span>↗</span></button></div>
    <div class="sidebar-caption"><span id="workspace-name">YOUR DESK</span><button data-action="refresh" title="Refresh folder" aria-label="Refresh folder">↻</button></div>
    <nav id="file-tree" aria-label="Workspace files"><button class="file-row selected" data-action="sample"><span>▤</span> Welcome.md</button></nav>
    <div class="sidebar-bottom"><span class="status-light"></span> Local files. Clear thoughts.<button data-action="theme" title="Toggle light or dark appearance" aria-label="Toggle theme">◐</button></div>
  </aside>
  <main>
    <header class="titlebar"><button data-action="sidebar" class="icon-button" title="Toggle sidebar" aria-label="Toggle sidebar">☷</button><div class="document-heading"><span id="document-name">Welcome.md</span><span id="document-location">A place to begin</span></div><span id="dirty-indicator" aria-label="Unsaved changes" hidden>●</span><div class="title-actions"><button data-action="new">New</button><button data-action="save" class="save-button">Save <kbd>⌘S</kbd></button></div></header>
    <div class="toolbar" role="toolbar" aria-label="Document formatting"><div class="formatting"><button data-format="heading" title="Heading">H₁</button><button data-format="bold" title="Bold"><b>B</b></button><button data-format="italic" title="Italic"><i>I</i></button><button data-format="strike" title="Strikethrough"><s>S</s></button><span class="toolbar-divider"></span><button data-format="list" title="Bullet list">≡</button><button data-format="task" title="Task list">☑</button><button data-format="quote" title="Blockquote">❞</button><button data-format="code" title="Code block">&lt;/&gt;</button><span class="toolbar-divider"></span><button data-format="table" title="Insert table">▦</button><button data-format="math" title="Insert formula">∑</button><button data-format="image" title="Insert image">▧</button><button data-format="mermaid" title="Insert Mermaid diagram">⋈</button></div><div class="mode-switch" aria-label="Editing mode"><button data-action="visual" class="active">Write</button><button data-action="source">Source</button></div></div>
    <section class="document-scroll"><div class="document-overline">THE WORK STARTS HERE</div><div id="editor"></div><textarea id="source" spellcheck="false" aria-label="Markdown source" hidden></textarea></section>
    <footer><span id="save-status" role="status">${desktop ? 'Ready' : 'Browser preview'}</span><span id="document-metrics">Markdown</span><span>UTF-8 <span class="footer-dot">·</span> Markdown</span></footer>
  </main>
  <dialog id="input-dialog"><form method="dialog"><div class="dialog-label">FOLIO</div><h2 id="dialog-title"></h2><p id="dialog-description"></p><textarea id="dialog-value" rows="5" spellcheck="false" aria-label="Value"></textarea><div class="dialog-actions"><button value="cancel">Cancel</button><button value="apply" class="save-button">Apply</button></div></form></dialog>
  <dialog id="confirm-dialog"><form method="dialog"><div class="dialog-label">UNSAVED DOCUMENT</div><h2>Keep your changes?</h2><p>Save this document before moving on, or discard your changes.</p><div class="dialog-actions"><button value="cancel">Cancel</button><button value="discard">Discard</button><button value="save" class="save-button">Save</button></div></form></dialog>
  <div id="toast" role="alert" hidden></div>
`

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const source = get<HTMLTextAreaElement>('source')
let path: string | null = null
let diskContent: string | null = null
let originalContent = sample
let dirty = false
let revision = 0
let sourceMode = false
let workspace: string | null = null
let busy = false
let statusTimer: ReturnType<typeof setTimeout>

function message(text: string, error = false) {
  get('save-status').textContent = text
  if (error) {
    get('toast').textContent = text
    get('toast').hidden = false
    setTimeout(() => { get('toast').hidden = true }, 7000)
  }
}

function updateTitle() {
  get('document-name').textContent = path ? basename(path) : 'Untitled.md'
  get('document-location').textContent = path || 'Not saved to disk'
  get('dirty-indicator').hidden = !dirty
  document.title = `${dirty ? '● ' : ''}${path ? basename(path) : 'Untitled'} | Folio`
}

function changed() {
  revision += 1
  dirty = true
  updateTitle()
  message('Unsaved changes')
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    const text = sourceMode ? source.value : editor.getText()
    get('document-metrics').textContent = `${text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : 0} words`
  }, 500)
}

function input(title: string, description: string, initial = ''): Promise<string | null> {
  const dialog = get<HTMLDialogElement>('input-dialog')
  get('dialog-title').textContent = title
  get('dialog-description').textContent = description
  const value = get<HTMLTextAreaElement>('dialog-value')
  value.value = initial
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'apply' ? value.value : null), { once: true })
    dialog.showModal()
    value.focus()
  })
}

const editor = createEditor(get('editor'), sample, {
  path: () => path,
  changed,
  editMath: async (latex, block, position) => {
    const value = await input('Edit formula', 'Use LaTeX math syntax. No dollar delimiters needed.', latex)
    if (value === null) return
    if (block) editor.chain().setNodeSelection(position).updateBlockMath({ latex: value }).focus().run()
    else editor.chain().setNodeSelection(position).updateInlineMath({ latex: value }).focus().run()
  },
})

function markdown(): string {
  if (!dirty) return originalContent
  return sourceMode ? source.value : editor.getMarkdown()
}

async function save(saveAs = false): Promise<boolean> {
  if (!desktop) {
    message('Saving to disk is available in the desktop app.', true)
    return false
  }
  const savedRevision = revision
  const content = markdown()
  const savedPath = await invoke<string | null>('save_document', { path: saveAs ? null : path, content, expected: saveAs ? null : diskContent })
  if (!savedPath) return false
  path = savedPath
  originalContent = content
  diskContent = content
  dirty = revision !== savedRevision
  updateTitle()
  message(dirty ? 'Saved; newer edits remain unsaved' : 'Saved to disk')
  return !dirty
}

async function mayLeave(): Promise<boolean> {
  if (!dirty) return true
  const dialog = get<HTMLDialogElement>('confirm-dialog')
  const decision = await new Promise<string>(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true })
    dialog.showModal()
  })
  return decision === 'discard' || (decision === 'save' && await save())
}

function showDocument(document: DocumentFile, fromDisk = true) {
  path = fromDisk ? document.path : null
  diskContent = fromDisk ? document.content : null
  originalContent = document.content
  dirty = false
  source.value = document.content
  editor.commands.setContent(document.content, { contentType: 'markdown', emitUpdate: false })
  updateTitle()
  message('Ready')
  editor.commands.focus('start')
}

async function openFile() {
  if (!await mayLeave()) return
  if (desktop) {
    const document = await invoke<DocumentFile | null>('choose_file')
    if (document) showDocument(document)
  } else {
    const picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = '.md,.markdown,.txt'
    picker.onchange = async () => {
      const file = picker.files?.[0]
      if (!file) return
      try {
        showDocument({ path: file.name, content: await file.text() }, false)
        get('document-name').textContent = file.name
      } catch (error) { message(String(error), true) }
    }
    picker.click()
  }
}

async function renderDirectory(directory: string, container: HTMLElement) {
  const entries = await invoke<DirectoryEntry[]>('list_directory', { path: directory })
  container.replaceChildren()
  if (!entries.length) {
    const empty = document.createElement('p')
    empty.className = 'empty-directory'
    empty.textContent = 'No Markdown files here.'
    container.append(empty)
  }
  for (const entry of entries) {
    const button = document.createElement('button')
    button.className = 'file-row'
    const icon = document.createElement('span')
    icon.textContent = entry.directory ? '›' : '▤'
    const name = document.createElement('span')
    name.textContent = entry.name
    button.append(icon, name)
    button.title = entry.path
    container.append(button)
    if (entry.directory) {
      const children = document.createElement('div')
      children.className = 'tree-children'
      children.hidden = true
      button.setAttribute('aria-expanded', 'false')
      container.append(children)
      let loaded = false
      button.onclick = () => run(async () => {
        if (!loaded) { await renderDirectory(entry.path, children); loaded = true }
        children.hidden = !children.hidden
        button.setAttribute('aria-expanded', String(!children.hidden))
        icon.textContent = children.hidden ? '›' : '⌄'
      })
    } else {
      button.onclick = () => run(async () => {
        if (!await mayLeave()) return
        showDocument(await invoke<DocumentFile>('read_document', { path: entry.path }))
        document.querySelectorAll('.file-row.selected').forEach(row => row.classList.remove('selected'))
        button.classList.add('selected')
      })
    }
  }
}

async function openFolder() {
  if (!desktop) { message('Open folders in the desktop app.', true); return }
  const selected = await invoke<string | null>('choose_directory')
  if (!selected) return
  workspace = selected
  get('workspace-name').textContent = basename(selected).toUpperCase()
  await renderDirectory(selected, get('file-tree'))
  app.classList.remove('sidebar-hidden')
}

function setMode(mode: boolean) {
  if (sourceMode === mode) return
  if (mode) source.value = markdown()
  else editor.commands.setContent(source.value, { contentType: 'markdown', emitUpdate: false })
  sourceMode = mode
  get('editor').hidden = mode
  source.hidden = !mode
  document.querySelector('[data-action="visual"]')?.classList.toggle('active', !mode)
  document.querySelector('[data-action="source"]')?.classList.toggle('active', mode)
  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(button => { button.disabled = mode })
  if (mode) source.focus()
  else editor.commands.focus()
}

async function format(action: string) {
  const chain = editor.chain().focus()
  switch (action) {
    case 'heading': chain.toggleHeading({ level: 1 }).run(); break
    case 'bold': chain.toggleBold().run(); break
    case 'italic': chain.toggleItalic().run(); break
    case 'strike': chain.toggleStrike().run(); break
    case 'list': chain.toggleBulletList().run(); break
    case 'task': chain.toggleTaskList().run(); break
    case 'quote': chain.toggleBlockquote().run(); break
    case 'code': chain.toggleCodeBlock().run(); break
    case 'table': chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break
    case 'math': {
      const value = await input('Insert formula', 'LaTeX math, rendered inline. Use source mode for display equations.', String.raw`E = mc^2`)
      if (value) editor.chain().focus().insertInlineMath({ latex: value }).run()
      break
    }
    case 'image': {
      const value = await input('Insert image', 'A relative file path, absolute path, or HTTPS URL. SVGs are supported.')
      if (value?.trim()) editor.chain().focus().setImage({ src: value.trim(), alt: '' }).run()
      break
    }
    case 'mermaid': chain.insertContent({ type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'flowchart LR\n    A[Idea] --> B[Result]' }] }).run(); break
  }
}

async function run(action: () => Promise<unknown> | unknown) {
  if (busy) return
  busy = true
  try { await action() } catch (error) { message(String(error), true) }
  finally { busy = false }
}

const actions: Record<string, () => Promise<unknown> | unknown> = {
  'open-file': openFile,
  'open-folder': openFolder,
  save: () => save(),
  new: async () => { if (await mayLeave()) showDocument({ path: '', content: '' }, false) },
  sample: async () => { if (await mayLeave()) showDocument({ path: '', content: sample }, false) },
  refresh: () => workspace && renderDirectory(workspace, get('file-tree')),
  sidebar: () => app.classList.toggle('sidebar-hidden'),
  theme: () => {
    const dark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('folio-theme', dark ? 'dark' : 'light')
  },
  visual: () => setMode(false),
  source: () => setMode(true),
}

app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button')
  if (!button || button.disabled) return
  const action = button.dataset.action
  if (action && actions[action]) void run(actions[action])
  if (button.dataset.format) void run(() => format(button.dataset.format!))
})

source.addEventListener('input', changed)
window.addEventListener('keydown', event => {
  if (!(event.metaKey || event.ctrlKey) || document.querySelector('dialog[open]')) return
  const key = event.key.toLowerCase()
  if (!['s', 'o', 'n'].includes(key)) return
  event.preventDefault()
  if (key === 's') void run(() => save(event.shiftKey))
  if (key === 'o') void run(event.shiftKey ? openFolder : openFile)
  if (key === 'n') void run(actions.new)
})
window.addEventListener('beforeunload', event => {
  if (dirty && !desktop) event.preventDefault()
})

if (localStorage.getItem('folio-theme') === 'dark') document.documentElement.classList.add('dark')
if (desktop) {
  void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
    await getCurrentWindow().onCloseRequested(async event => {
      if (!dirty) return
      event.preventDefault()
      await run(async () => {
        if (await mayLeave()) {
          dirty = false
          await getCurrentWindow().close()
        }
      })
    })
  }).catch(error => message(String(error), true))
}
