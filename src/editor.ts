import { Editor, InputRule } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import { convertFileSrc, isTauri } from '@tauri-apps/api/core'
import { resolveImagePath } from './files'
import { MarkdownTyping } from './markdown-typing'

const lowlight = createLowlight({ javascript, typescript, python, rust, json, bash })
const KeyboardTaskItem = TaskItem.extend({
  addNodeView() {
    const renderTask = this.parent!()!
    return options => {
      const view = renderTask(options)
      const checkbox = (view.dom as HTMLElement).querySelector<HTMLInputElement>('input[type="checkbox"]')
      if (checkbox) checkbox.tabIndex = -1
      return view
    }
  },
})
const MarkdownInlineMath = InlineMath.extend({
  addInputRules() {
    return [new InputRule({
      find: text => {
        const match = /(^|[^\\$])\$((?:\\[^\n]|[^\\$\n])+)\$$/.exec(text)
        if (!match || match[2].trim() !== match[2]) return null
        return { index: match.index + match[1].length, text: match[0].slice(match[1].length), data: { latex: match[2] } }
      },
      handler: ({ state, range, match }) => {
        state.tr.replaceWith(range.from, range.to, this.type.create({ latex: match.data?.latex }))
      },
    })]
  },
})
const diagramCache = new Map<string, string>()
let diagramSerial = 0
let diagramQueue = Promise.resolve()
let mermaidModule: Promise<typeof import('mermaid')> | undefined

async function drawDiagram(source: string): Promise<string> {
  const dark = document.documentElement.classList.contains('dark')
  const cacheKey = `${dark ? 'dark' : 'light'}\n${source}`
  const cached = diagramCache.get(cacheKey)
  if (cached) return cached
  mermaidModule ??= import('mermaid')
  const { default: mermaid } = await mermaidModule
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'neutral',
    themeVariables: { darkMode: dark },
    suppressErrorRendering: true,
  })
  const { svg } = await mermaid.render(`folio-diagram-${++diagramSerial}`, source)
  if (diagramCache.size >= 64) diagramCache.delete(diagramCache.keys().next().value!)
  diagramCache.set(cacheKey, svg)
  return svg
}

export interface EditorOptions {
  path: () => string | null
  changed: () => void
  editMath: (latex: string, block: boolean, position: number) => void
}

export function createEditor(element: HTMLElement, content: string, options: EditorOptions): Editor {
  const diagramRenderers = new Set<() => void>()
  let dark = document.documentElement.classList.contains('dark')
  const themeObserver = new MutationObserver(() => {
    const nextDark = document.documentElement.classList.contains('dark')
    if (nextDark === dark) return
    dark = nextDark
    for (const render of diagramRenderers) render()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  const LocalImage = Image.extend({
    addNodeView() {
      return ({ node }) => {
        const image = document.createElement('img')
        const update = (next: typeof node) => {
          if (next.type.name !== 'image') return false
          const path = resolveImagePath(next.attrs.src || '', options.path())
          image.src = !options.path() && path === 'demo.svg' ? '/demo.svg' : path && isTauri() && !/^(https?:|data:|blob:|asset:)/i.test(path) ? convertFileSrc(path) : path
          image.alt = next.attrs.alt || ''
          image.title = next.attrs.title || ''
          image.loading = 'lazy'
          return true
        }
        update(node)
        return { dom: image, update }
      }
    },
  })

  const DiagramCode = CodeBlockLowlight.extend({
    addNodeView() {
      return ({ node: initialNode, editor, getPos }) => {
        let node = initialNode
        let disposed = false
        let visible = false
        let editingDiagram = false
        let generation = 0
        let timer: ReturnType<typeof setTimeout> | undefined
        let copyTimer: ReturnType<typeof setTimeout> | undefined
        const dom = document.createElement('section')
        dom.className = 'code-block'
        const controls = document.createElement('div')
        controls.className = 'code-controls'
        controls.contentEditable = 'false'
        const language = document.createElement('select')
        language.setAttribute('aria-label', 'Code language')
        for (const id of ['', 'javascript', 'typescript', 'python', 'rust', 'json', 'bash', 'mermaid']) {
          const option = document.createElement('option')
          option.value = id
          option.textContent = id || 'Plain text'
          language.append(option)
        }
        if (node.attrs.language && !Array.from(language.options).some(option => option.value === node.attrs.language)) {
          const option = document.createElement('option')
          option.value = node.attrs.language
          option.textContent = node.attrs.language
          language.append(option)
        }
        language.value = node.attrs.language || ''
        language.onchange = () => {
          if (!editor.isEditable) return
          const position = getPos()
          if (typeof position === 'number') editor.chain().setNodeSelection(position).updateAttributes('codeBlock', { language: language.value || null }).run()
        }
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.textContent = 'Edit diagram'
        toggle.setAttribute('aria-expanded', 'false')
        const copy = document.createElement('button')
        copy.type = 'button'
        copy.textContent = 'Copy'
        copy.setAttribute('aria-label', 'Copy code')
        copy.onclick = async () => {
          clearTimeout(copyTimer)
          try {
            await navigator.clipboard.writeText(node.textContent)
            if (disposed) return
            copy.textContent = 'Copied'
          } catch {
            if (disposed) return
            copy.textContent = 'Copy failed'
          }
          copyTimer = setTimeout(() => { copy.textContent = 'Copy' }, 2000)
        }
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        pre.append(code)
        const preview = document.createElement('div')
        preview.className = 'diagram-preview'
        preview.contentEditable = 'false'
        toggle.onclick = () => {
          if (!editor.isEditable) return
          editingDiagram = !editingDiagram
          pre.hidden = !editingDiagram
          dom.classList.toggle('editing-diagram', editingDiagram)
          toggle.textContent = editingDiagram ? 'Done' : 'Edit diagram'
          toggle.setAttribute('aria-expanded', String(editingDiagram))
          if (editingDiagram) {
            const position = getPos()
            if (typeof position === 'number') editor.chain().focus().setTextSelection(position + 1).run()
          }
        }
        const buttons = document.createElement('div')
        buttons.append(toggle, copy)
        controls.append(language, buttons)
        dom.append(controls, pre, preview)
        const render = () => {
          const version = ++generation
          clearTimeout(timer)
          const diagram = node.attrs.language === 'mermaid'
          dom.classList.toggle('is-diagram', diagram)
          dom.classList.toggle('editing-diagram', diagram && editingDiagram)
          pre.hidden = diagram && !editingDiagram
          preview.hidden = !diagram
          toggle.hidden = !diagram
          if (!diagram) { pre.hidden = false; return }
          if (!visible) return
          const source = node.textContent
          timer = setTimeout(() => {
            diagramQueue = diagramQueue.then(async () => {
              if (disposed || version !== generation) return
              try {
                const svg = await drawDiagram(source)
                if (!disposed && version === generation) preview.innerHTML = svg
              } catch (error) {
                if (!disposed && version === generation) preview.textContent = `Diagram error: ${String(error)}`
              }
            })
          }, 250)
        }
        diagramRenderers.add(render)
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting)
          if (visible) render()
        }, { rootMargin: '240px' })
        observer.observe(dom)
        render()
        return {
          dom,
          contentDOM: code,
          update(next) {
            if (next.type.name !== 'codeBlock') return false
            if (next.attrs.language !== node.attrs.language) {
              editingDiagram = false
              toggle.textContent = 'Edit diagram'
              toggle.setAttribute('aria-expanded', 'false')
            }
            const changed = next.textContent !== node.textContent || next.attrs.language !== node.attrs.language
            node = next
            language.value = next.attrs.language || ''
            if (changed) render()
            return true
          },
          stopEvent: event => controls.contains(event.target as globalThis.Node),
          ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target),
          destroy() { disposed = true; clearTimeout(timer); clearTimeout(copyTimer); observer.disconnect(); diagramRenderers.delete(render) },
        }
      }
    },
  })

  const thisEditor = new Editor({
    element,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: { openOnClick: false } }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      MarkdownTyping,
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      KeyboardTaskItem.configure({ nested: true, HTMLAttributes: { 'data-type': 'taskItem' } }),
      LocalImage,
      DiagramCode.configure({ lowlight }),
      MarkdownInlineMath.configure({
        katexOptions: { throwOnError: false, trust: false },
        onClick: (node, position) => { if (thisEditor.isEditable) options.editMath(node.attrs.latex, false, position) },
      }),
      BlockMath.configure({
        katexOptions: { throwOnError: false, trust: false },
        onClick: (node, position) => { if (thisEditor.isEditable) options.editMath(node.attrs.latex, true, position) },
      }),
    ],
    content,
    contentType: 'markdown',
    editorProps: { attributes: { 'aria-label': 'Markdown document', spellcheck: 'true' } },
    onUpdate: options.changed,
    onDestroy: () => themeObserver.disconnect(),
  })
  return thisEditor
}
