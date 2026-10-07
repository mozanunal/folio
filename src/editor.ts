import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import Mathematics from '@tiptap/extension-mathematics'
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

const lowlight = createLowlight({ javascript, typescript, python, rust, json, bash })
const diagramCache = new Map<string, string>()
let diagramSerial = 0
let diagramQueue = Promise.resolve()
let mermaidModule: Promise<typeof import('mermaid')> | undefined

async function drawDiagram(source: string): Promise<string> {
  const cached = diagramCache.get(source)
  if (cached) return cached
  mermaidModule ??= import('mermaid').then(module => {
    module.default.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', suppressErrorRendering: true })
    return module
  })
  const { default: mermaid } = await mermaidModule
  const { svg } = await mermaid.render(`folio-diagram-${++diagramSerial}`, source)
  if (diagramCache.size >= 64) diagramCache.delete(diagramCache.keys().next().value!)
  diagramCache.set(source, svg)
  return svg
}

export interface EditorOptions {
  path: () => string | null
  changed: () => void
  editMath: (latex: string, block: boolean, position: number) => void
}

export function createEditor(element: HTMLElement, content: string, options: EditorOptions): Editor {
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
        let generation = 0
        let timer: ReturnType<typeof setTimeout> | undefined
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
          const position = getPos()
          if (typeof position === 'number') editor.chain().setNodeSelection(position).updateAttributes('codeBlock', { language: language.value || null }).run()
        }
        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.textContent = 'Edit diagram'
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        pre.append(code)
        const preview = document.createElement('div')
        preview.className = 'diagram-preview'
        preview.contentEditable = 'false'
        toggle.onclick = () => {
          pre.hidden = !pre.hidden
          toggle.textContent = pre.hidden ? 'Edit diagram' : 'Hide source'
          if (!pre.hidden) {
            const position = getPos()
            if (typeof position === 'number') editor.chain().focus().setTextSelection(position + 1).run()
          }
        }
        controls.append(language, toggle)
        dom.append(controls, pre, preview)
        const render = () => {
          const diagram = node.attrs.language === 'mermaid'
          preview.hidden = !diagram
          toggle.hidden = !diagram
          if (!diagram) { pre.hidden = false; return }
          if (!visible) return
          const source = node.textContent
          const version = ++generation
          clearTimeout(timer)
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
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting)
          if (visible) render()
        }, { rootMargin: '240px' })
        observer.observe(dom)
        if (node.attrs.language === 'mermaid') pre.hidden = true
        render()
        return {
          dom,
          contentDOM: code,
          update(next) {
            if (next.type.name !== 'codeBlock') return false
            const changed = next.textContent !== node.textContent || next.attrs.language !== node.attrs.language
            node = next
            language.value = next.attrs.language || ''
            if (changed) render()
            return true
          },
          stopEvent: event => controls.contains(event.target as globalThis.Node),
          ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target),
          destroy() { disposed = true; clearTimeout(timer); observer.disconnect() },
        }
      }
    },
  })

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: { openOnClick: false } }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      LocalImage,
      DiagramCode.configure({ lowlight }),
      Mathematics.configure({
        katexOptions: { throwOnError: false, trust: false },
        inlineOptions: { onClick: (node, position) => options.editMath(node.attrs.latex, false, position) },
        blockOptions: { onClick: (node, position) => options.editMath(node.attrs.latex, true, position) },
      }),
    ],
    content,
    contentType: 'markdown',
    editorProps: { attributes: { 'aria-label': 'Markdown document', spellcheck: 'true' } },
    onUpdate: options.changed,
  })
}
