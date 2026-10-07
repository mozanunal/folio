// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createEditor } from './editor'
import type { Editor } from '@tiptap/core'

let editor: Editor | undefined
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
    unobserve() {}
  })
})
afterEach(() => { editor?.destroy(); document.body.replaceChildren() })

function load(markdown: string) {
  editor?.destroy()
  const element = document.createElement('div')
  document.body.append(element)
  editor = createEditor(element, markdown, { path: () => '/docs/test.md', changed: () => {}, editMath: () => {} })
  return editor
}

describe('Markdown documents', () => {
  it('imports GFM tables, task lists and strikethrough as editable nodes', () => {
    const doc = load('| One | Two |\n| --- | --- |\n| A | B |\n\n- [x] Done\n- [ ] Next\n\n~~Old~~')
    const json = JSON.stringify(doc.getJSON())
    expect(json).toContain('"type":"table"')
    expect(json).toContain('"type":"taskItem"')
    expect(json).toContain('"type":"strike"')
    const saved = doc.getMarkdown()
    const original = doc.getJSON()
    const reopened = load(saved)
    expect(reopened.getJSON()).toEqual(original)
  })

  it('round trips math, SVG paths, and Mermaid source', () => {
    const doc = load('Inline $E=mc^2$.\n\n$$\nx^2 + y^2 = z^2\n$$\n\n![Figure](../figures/a.svg)\n\n```mermaid\nflowchart LR\n A --> B\n```')
    const json = JSON.stringify(doc.getJSON())
    expect(json).toContain('inlineMath')
    expect(json).toContain('blockMath')
    expect(json).toContain('../figures/a.svg')
    const saved = doc.getMarkdown()
    expect(saved).toContain('```mermaid')
    expect(saved).toContain('A --> B')
    expect(saved).toContain('../figures/a.svg')
    expect(saved).toContain('E=mc^2')
  })

  it('renders code highlighting without interpreting code as HTML', () => {
    load('```javascript\nconst value = "<img src=x onerror=alert(1)>"\n```')
    expect(document.querySelector('code')?.textContent).toContain('<img src=x')
    expect(document.querySelector('code img')).toBeNull()
    expect(document.querySelector('.hljs-keyword')).not.toBeNull()
  })
})
