import { EditorState } from '@tiptap/pm/state'
import { Fragment } from '@tiptap/pm/model'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { createEditor } from './editor'
import { basename, headingSlug, parseDocumentLink, type DocumentFile, type DirectoryEntry } from './files'
import { sample } from './sample'
import { attachTableControls } from './table-controls'
import { attachSourceHighlighting } from './source-highlighting'
import { attachZoomShortcuts } from './zoom'
import 'katex/dist/katex.min.css'
import './style.css'

const desktop = isTauri()
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">f.</span><strong>folio</strong><span class="build-tag">BETA</span></div>
    <div class="workspace-actions"><button data-action="open-file">Open file <kbd>⌘O</kbd></button><button data-action="open-folder">Open folder <span>↗</span></button></div>
    <div class="sidebar-caption"><span id="workspace-name">YOUR DESK</span><button data-action="refresh" title="Refresh folder" aria-label="Refresh folder">↻</button></div>
    <nav id="file-tree" aria-label="Workspace files"><button class="file-row selected" data-action="sample"><span>▤</span> Welcome.md</button></nav>
    <div class="sidebar-bottom"><span class="status-light"></span> Local files. Clear thoughts.<button data-action="theme" title="Toggle light or dark appearance" aria-label="Toggle theme">◐</button></div>
  </aside>
  <main>
    <header class="titlebar"><button data-action="sidebar" class="icon-button" title="Toggle sidebar" aria-label="Toggle sidebar">☷</button><div class="document-heading"><span id="document-name">Welcome.md</span><span id="document-location">A place to begin</span></div><span id="dirty-indicator" aria-label="Unsaved changes" hidden>●</span><div class="title-actions"><button data-action="width" class="width-toggle" title="Use full width" aria-label="Full width" aria-pressed="false">↔</button><button data-action="new">New</button><button data-action="save" class="save-button">Save <kbd>⌘S</kbd></button></div></header>
    <div class="document-tabs-bar"><div id="document-tabs" class="document-tabs" role="tablist" aria-label="Open documents"></div><button data-action="new" class="new-tab" title="New document" aria-label="New document">+</button></div>
    <div class="toolbar" role="toolbar" aria-label="Document formatting"><div class="formatting"><button data-format="heading" title="Heading">H₁</button><button data-format="bold" title="Bold"><b>B</b></button><button data-format="italic" title="Italic"><i>I</i></button><button data-format="strike" title="Strikethrough"><s>S</s></button><span class="toolbar-divider"></span><button data-format="list" title="Bullet list">≡</button><button data-format="task" title="Task list">☑</button><button data-format="quote" title="Blockquote">❞</button><button data-format="code" title="Code block">&lt;/&gt;</button><span class="toolbar-divider"></span><button data-format="table" title="Insert table">▦</button><button data-format="math" title="Insert formula">∑</button><button data-format="image" title="Insert image">▧</button><button data-format="mermaid" title="Insert Mermaid diagram">⋈</button></div><div class="mode-switch" aria-label="Editing mode"><button data-action="visual" class="active">Write</button><button data-action="source">Source</button><button data-action="read">Read</button></div></div>
    <div id="table-controls" class="table-controls" role="toolbar" aria-label="Table editing" hidden></div>
    <section id="document-panel" class="document-scroll" role="tabpanel"><div class="document-overline">THE WORK STARTS HERE</div><div id="editor"></div><div id="source-pane" hidden><pre id="source-highlight" aria-hidden="true"></pre><textarea id="source" spellcheck="false" aria-label="Markdown source" hidden></textarea></div></section>
    <footer><span id="save-status" role="status">${desktop ? 'Ready' : 'Browser preview'}</span><span id="document-metrics">Markdown</span><span>UTF-8 <span class="footer-dot">·</span> Markdown</span></footer>
  </main>
  <dialog id="input-dialog"><form method="dialog"><div class="dialog-label">FOLIO</div><h2 id="dialog-title"></h2><p id="dialog-description"></p><textarea id="dialog-value" rows="5" spellcheck="false" aria-label="Value"></textarea><div class="dialog-actions"><button value="cancel">Cancel</button><button value="apply" class="save-button">Apply</button></div></form></dialog>
  <dialog id="confirm-dialog"><form method="dialog"><div class="dialog-label">UNSAVED DOCUMENT</div><h2>Keep your changes?</h2><p>Save this document before moving on, or discard your changes.</p><div class="dialog-actions"><button value="cancel">Cancel</button><button value="discard">Discard</button><button value="save" class="save-button">Save</button></div></form></dialog>
  <div id="toast" role="alert" hidden></div>
`

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const source = get<HTMLTextAreaElement>('source')
const refreshSourceHighlighting = attachSourceHighlighting(source, get('source-highlight'))
let path: string | null = null
let diskContent: string | null = null
let originalContent = sample
let dirty = false
let revision = 0
type ViewMode = 'write' | 'source' | 'read'
let viewMode: ViewMode = 'write'
interface DocumentTab {
  id: number
  name: string
  path: string | null
  diskContent: string | null
  originalContent: string
  dirty: boolean
  revision: number
  mode: ViewMode
  source: string
  state: EditorState
  scrollTop: number
  sourceScrollTop: number
  sourceSelection: [number, number]
  welcome?: boolean
}
const tabs: DocumentTab[] = []
let nextTabId = 1
let activeTabId = 0
let tabSignature = ''
let workspace: string | null = null
let busy = false
let externalOpensPending = false
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
  const tab = tabs.find(tab => tab.id === activeTabId)
  if (tab) {
    Object.assign(tab, { path, diskContent, originalContent, dirty, revision })
    if (path) tab.name = basename(path)
  }
  const name = tab?.name ?? 'Untitled.md'
  get('document-name').textContent = name
  get('document-location').textContent = path || 'Not saved to disk'
  get('dirty-indicator').hidden = !dirty
  document.title = `${dirty ? '● ' : ''}${name} | Folio`
  renderTabs()
}

function changed() {
  revision += 1
  dirty = true
  updateTitle()
  message('Unsaved changes')
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    const text = viewMode === 'source' ? source.value : editor.getText()
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
const refreshTableControls = attachTableControls(editor, get('table-controls'))
showDocument({ path: 'Welcome.md', content: sample }, false, true)

function stashTab() {
  const tab = tabs.find(tab => tab.id === activeTabId)
  if (!tab) return
  Object.assign(tab, {
    path, diskContent, originalContent, dirty, revision, mode: viewMode,
    source: source.value, state: editor.state,
    scrollTop: get('document-panel').scrollTop,
    sourceScrollTop: source.scrollTop,
    sourceSelection: [source.selectionStart, source.selectionEnd],
  })
}

function renderTabs() {
  const signature = JSON.stringify([activeTabId, tabs.map(tab => [tab.id, tab.name, tab.path, tab.dirty])])
  if (signature === tabSignature) return
  tabSignature = signature
  const strip = get('document-tabs')
  strip.replaceChildren()
  for (const tab of tabs) {
    const item = document.createElement('div')
    item.className = `document-tab${tab.id === activeTabId ? ' active' : ''}`
    item.setAttribute('role', 'presentation')
    const button = document.createElement('button')
    button.id = `tab-${tab.id}`
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-selected', String(tab.id === activeTabId))
    button.setAttribute('aria-controls', 'document-panel')
    button.setAttribute('aria-label', `${tab.name}${tab.dirty ? ', unsaved changes' : ''}`)
    button.tabIndex = tab.id === activeTabId ? 0 : -1
    button.title = tab.path || tab.name
    button.textContent = `${tab.dirty ? '● ' : ''}${tab.name}`
    button.onclick = () => run(() => activateTab(tab.id))
    const close = document.createElement('button')
    close.className = 'close-tab'
    close.textContent = '×'
    close.setAttribute('aria-label', `Close ${tab.name}`)
    close.onclick = () => run(() => closeTab(tab.id))
    item.append(button, close)
    strip.append(item)
  }
  get('document-panel').setAttribute('aria-labelledby', `tab-${activeTabId}`)
}

function activateTab(id: number) {
  if (id === activeTabId) return
  const tab = tabs.find(tab => tab.id === id)
  if (!tab) return
  stashTab()
  clearTimeout(statusTimer)
  activeTabId = id
  path = tab.path
  diskContent = tab.diskContent
  originalContent = tab.originalContent
  dirty = tab.dirty
  revision = tab.revision
  viewMode = tab.mode
  source.value = tab.source
  editor.setEditable(viewMode === 'write', false)
  editor.view.updateState(EditorState.create({ schema: editor.schema, plugins: editor.state.plugins }))
  editor.view.updateState(tab.state)
  applyModeUi()
  if (viewMode === 'source') source.focus({ preventScroll: true })
  else if (viewMode === 'write') editor.view.focus()
  else (document.activeElement as HTMLElement | null)?.blur()
  source.setSelectionRange(...tab.sourceSelection)
  source.scrollTop = tab.sourceScrollTop
  refreshSourceHighlighting()
  get('document-panel').scrollTop = tab.scrollTop
  get('document-metrics').textContent = 'Markdown'
  updateTitle()
  message(dirty ? 'Unsaved changes' : 'Ready')
  document.querySelectorAll<HTMLButtonElement>('.file-row').forEach(row => row.classList.toggle('selected', row.title === path))
  get(`tab-${id}`).scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

async function closeTab(id: number) {
  const index = tabs.findIndex(tab => tab.id === id)
  if (index < 0) return
  const previous = activeTabId
  if (tabs[index].dirty || (id === activeTabId && dirty)) {
    activateTab(id)
    if (!await mayLeave()) return
  }
  const closingActive = id === activeTabId
  tabs.splice(index, 1)
  if (closingActive) {
    activeTabId = 0
    if (tabs.length) activateTab(tabs[Math.min(index, tabs.length - 1)].id)
    else showDocument({ path: '', content: '' }, false)
  } else renderTabs()
  if (previous !== id && tabs.some(tab => tab.id === previous)) activateTab(previous)
}

function markdown(): string {
  if (!dirty) return originalContent
  return viewMode === 'source' ? source.value : editor.getMarkdown()
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

function showDocument(document: DocumentFile, fromDisk = true, welcome = false) {
  const existing = tabs.find(tab => fromDisk ? tab.path === document.path : welcome && tab.welcome)
  if (existing) { activateTab(existing.id); return }
  let doc = editor.schema.nodeFromJSON(editor.markdown!.parse(document.content))
  if (doc.lastChild?.type.name !== 'paragraph') {
    doc = doc.copy(doc.content.append(Fragment.from(editor.schema.nodes.paragraph.create())))
  }
  const state = EditorState.create({
    doc,
    plugins: editor.state.plugins,
  })
  const id = nextTabId++
  tabs.push({
    id, name: document.path ? basename(document.path) : `Untitled ${id}.md`,
    path: fromDisk ? document.path : null,
    diskContent: fromDisk ? document.content : null,
    originalContent: document.content, dirty: false, revision: 0,
    mode: 'write', source: document.content, state,
    scrollTop: 0, sourceScrollTop: 0, sourceSelection: [0, 0], welcome,
  })
  activateTab(id)
}

async function openFile() {
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
      } catch (error) { message(String(error), true) }
    }
    picker.click()
  }
}

async function followDocumentLink(href: string) {
  const link = parseDocumentLink(href)
  if (!link) return
  if (link.file) {
    if (!desktop) throw new Error('Open linked files in the desktop app.')
    if (!path) throw new Error('Save this document first so relative links have a base folder.')
    const document = await invoke<DocumentFile>('open_linked_document', { origin: path, relativePath: link.file })
      .catch(error => { throw new Error(`Could not open ${link.file}: ${String(error)}`) })
    const existing = tabs.some(tab => tab.path === document.path)
    const mode = viewMode
    showDocument(document)
    if (!existing && mode === 'read') setMode('read')
  }
  if (link.fragment) {
    if (viewMode === 'source') setMode('read')
    const used = new Set<string>()
    const heading = [...get('editor').querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')].find(element => {
      const base = headingSlug(element.textContent || '')
      let slug = base
      let index = 1
      while (used.has(slug)) slug = `${base}-${index++}`
      used.add(slug)
      return slug === link.fragment || element.id === link.fragment
    })
    if (!heading) throw new Error(`Heading not found: ${link.fragment}`)
    heading.scrollIntoView?.({ block: 'start' })
  }
}

get('editor').addEventListener('click', event => {
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
  if (!anchor) return
  const href = anchor.getAttribute('href') || ''
  if (!parseDocumentLink(href)) return
  event.preventDefault()
  void run(() => followDocumentLink(href))
}, true)

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
  await showWorkspace(selected)
}

async function showWorkspace(selected: string) {
  workspace = selected
  get('workspace-name').textContent = basename(selected).toUpperCase()
  await renderDirectory(selected, get('file-tree'))
  app.classList.remove('sidebar-hidden')
}

function setMode(mode: ViewMode) {
  if (viewMode === mode) return
  const content = markdown()
  editor.setEditable(mode === 'write', false)
  if (mode === 'source') source.value = content
  else if (viewMode === 'source' || mode === 'read') {
    editor.commands.setContent(content, { contentType: 'markdown', emitUpdate: false })
  }
  viewMode = mode
  applyModeUi()
  if (mode === 'source') source.focus()
  else if (mode === 'write') editor.commands.focus(undefined, { scrollIntoView: false })
  else (document.activeElement as HTMLElement | null)?.blur()
}

function applyModeUi() {
  const mode = viewMode
  get('editor').hidden = mode === 'source'
  source.hidden = mode !== 'source'
  get('source-pane').hidden = mode !== 'source'
  if (mode === 'source') refreshSourceHighlighting()
  app.classList.toggle('read-mode', mode === 'read')
  for (const [action, active] of Object.entries({ visual: mode === 'write', source: mode === 'source', read: mode === 'read' })) {
    const button = document.querySelector(`[data-action="${action}"]`)
    button?.classList.toggle('active', active)
    button?.setAttribute('aria-pressed', String(active))
  }
  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(button => { button.disabled = mode !== 'write' })
  refreshTableControls()
}

async function format(action: string) {
  if (viewMode !== 'write') return
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
  finally {
    busy = false
    if (externalOpensPending) void openRequestedPaths()
  }
}

async function openRequestedPaths() {
  externalOpensPending = true
  if (busy) return
  await run(async () => {
    externalOpensPending = false
    const requests = await invoke<Array<{ Ok: DocumentFile | { directory: string } } | { Err: string }>>('take_open_requests')
    const replaceWelcome = tabs.length === 1 && tabs[0].welcome && !dirty && !tabs[0].dirty
    let opened = false
    for (const request of requests) {
      if ('Err' in request) { message(request.Err, true); continue }
      if ('directory' in request.Ok) { await showWorkspace(request.Ok.directory); continue }
      showDocument(request.Ok)
      opened = true
    }
    if (replaceWelcome && opened) {
      const welcome = tabs.findIndex(tab => tab.welcome)
      if (welcome >= 0) tabs.splice(welcome, 1)
      renderTabs()
    }
  })
}

function setFullWidth(full: boolean) {
  app.classList.toggle('full-width', full)
  const button = document.querySelector<HTMLButtonElement>('[data-action="width"]')!
  button.setAttribute('aria-pressed', String(full))
  button.title = full ? 'Use reading width' : 'Use full width'
}

const actions: Record<string, () => Promise<unknown> | unknown> = {
  'open-file': openFile,
  'open-folder': openFolder,
  save: () => save(),
  new: () => showDocument({ path: '', content: '' }, false),
  sample: () => showDocument({ path: 'Welcome.md', content: sample }, false, true),
  refresh: () => workspace && renderDirectory(workspace, get('file-tree')),
  sidebar: () => app.classList.toggle('sidebar-hidden'),
  width: () => {
    const full = !app.classList.contains('full-width')
    setFullWidth(full)
    localStorage.setItem('folio-width', full ? 'full' : 'reading')
  },
  theme: () => {
    const dark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('folio-theme', dark ? 'dark' : 'light')
  },
  visual: () => setMode('write'),
  source: () => setMode('source'),
  read: () => setMode('read'),
}

app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button')
  if (!button || button.disabled) return
  const action = button.dataset.action
  if (action && actions[action]) void run(actions[action])
  if (button.dataset.format) void run(() => format(button.dataset.format!))
})

get('document-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = tabs.findIndex(tab => tab.id === activeTabId)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  void run(() => { activateTab(tabs[next].id); get(`tab-${activeTabId}`).focus() })
})

source.addEventListener('input', changed)
window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return
  if (event.ctrlKey && event.key === 'Tab') {
    event.preventDefault()
    const index = tabs.findIndex(tab => tab.id === activeTabId)
    void run(() => activateTab(tabs[(index + (event.shiftKey ? -1 : 1) + tabs.length) % tabs.length].id))
    return
  }
  if (!(event.metaKey || event.ctrlKey) || document.querySelector('dialog[open]')) return
  const key = event.key.toLowerCase()
  if (!['s', 'o', 'n', 'w'].includes(key)) return
  event.preventDefault()
  if (key === 's') void run(() => save(event.shiftKey))
  if (key === 'o') void run(event.shiftKey ? openFolder : openFile)
  if (key === 'n') void run(actions.new)
  if (key === 'w') void run(() => closeTab(activeTabId))
})
window.addEventListener('beforeunload', event => {
  if (!desktop && (dirty || tabs.some(tab => tab.dirty))) event.preventDefault()
})

setFullWidth(localStorage.getItem('folio-width') === 'full')
if (localStorage.getItem('folio-theme') === 'dark') document.documentElement.classList.add('dark')
if (desktop) {
  attachZoomShortcuts({
    platform: navigator.platform,
    storage: localStorage,
    apply: async scale => {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview')
      await getCurrentWebview().setZoom(scale)
    },
    error: error => message(`Could not change zoom: ${String(error)}`, true),
  })
  void import('@tauri-apps/api/event').then(async ({ listen }) => {
    await listen('paths-opened', () => { void openRequestedPaths() })
    await openRequestedPaths()
  }).catch(error => message(String(error), true))
  void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
    await getCurrentWindow().onCloseRequested(async event => {
      if (!dirty && !tabs.some(tab => tab.dirty)) return
      event.preventDefault()
      await run(async () => {
        stashTab()
        for (const tab of tabs) {
          if (!tab.dirty) continue
          activateTab(tab.id)
          if (!await mayLeave()) return
        }
        dirty = false
        for (const tab of tabs) tab.dirty = false
        await getCurrentWindow().close()
      })
    })
  }).catch(error => message(String(error), true))
}
