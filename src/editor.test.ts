// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createEditor } from './editor'
import type { Editor } from '@tiptap/core'

let editor: Editor | undefined
const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async (_id: string, source: string) => ({ svg: `<svg><text>${source}</text></svg>` })),
}))
vi.mock('mermaid', () => ({ default: mermaid }))
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) { this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
    disconnect() {}
    unobserve() {}
  })
})
afterEach(() => {
  editor?.destroy()
  document.body.replaceChildren()
  document.documentElement.classList.remove('dark')
  vi.useRealTimers()
  vi.clearAllMocks()
})

function load(markdown: string) {
  editor?.destroy()
  const element = document.createElement('div')
  document.body.append(element)
  editor = createEditor(element, markdown, { path: () => '/docs/test.md', changed: () => {}, editMath: () => {} })
  return editor
}

function typeText(doc: Editor, text: string) {
  for (const character of text) {
    const { from, to } = doc.state.selection
    const handled = doc.view.someProp('handleTextInput', handler => handler(doc.view, from, to, character))
    if (!handled) doc.view.dispatch(doc.state.tr.insertText(character, from, to))
  }
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

  it('renders single-dollar math as you type and supports undoing the conversion', () => {
    const doc = load('')
    doc.commands.insertContent('moz $m/a')
    const { from, to } = doc.state.selection
    const handled = doc.view.someProp('handleTextInput', handler => handler(doc.view, from, to, '$'))
    expect(handled).toBe(true)
    expect(doc.getJSON().content?.[0].content).toEqual([
      { type: 'text', text: 'moz ' },
      { type: 'inlineMath', attrs: { latex: 'm/a' } },
    ])
    expect(document.querySelector('[data-type="inline-math"] .katex')).not.toBeNull()
    expect(doc.getMarkdown()).toContain('$m/a$')
    doc.commands.undoInputRule()
    expect(doc.getText()).toBe('moz $m/a$')
  })

  it.each(['cost \\$5', '$$x', '$ x', '$x ', 'price $5 and '])('leaves literal or display delimiters alone: %s', text => {
    const doc = load('')
    doc.commands.insertContent(text)
    const { from, to } = doc.state.selection
    const handled = doc.view.someProp('handleTextInput', handler => handler(doc.view, from, to, '$'))
    expect(handled).toBeFalsy()
    expect(JSON.stringify(doc.getJSON())).not.toContain('inlineMath')
  })

  it('does not convert math delimiters inside code blocks', () => {
    const doc = load('```text\n$m/a\n```')
    doc.commands.setTextSelection(5)
    const { from, to } = doc.state.selection
    expect(doc.view.someProp('handleTextInput', handler => handler(doc.view, from, to, '$'))).toBeFalsy()
    expect(JSON.stringify(doc.getJSON())).not.toContain('inlineMath')
  })

  it('turns typed double-dollar equations into display math and leaves room to continue typing', () => {
    const doc = load('')
    typeText(doc, '$$A/B$$')
    expect(doc.getJSON().content?.[0]).toEqual({ type: 'blockMath', attrs: { latex: 'A/B' } })
    expect(document.querySelector('[data-type="block-math"] .katex')).not.toBeNull()
    typeText(doc, 'Next thought')
    expect(doc.getJSON().content?.[1].content?.[0].text).toBe('Next thought')
    const saved = doc.getMarkdown()
    expect(saved).toContain('A/B')
    expect(load(saved).getJSON().content?.[0].type).toBe('blockMath')
  })

  it('converts a typed pipe header and separator into a table', () => {
    const doc = load('')
    typeText(doc, '|asd| asa|')
    doc.view.someProp('handleKeyDown', handler => handler(doc.view, new KeyboardEvent('keydown', { key: 'Enter' })))
    typeText(doc, '|--|--|')
    expect(doc.getJSON().content?.[0].type).toBe('table')
    const table = document.querySelector('table')!
    expect(table.rows.length).toBe(2)
    expect(table.rows[0].cells[0].textContent).toBe('asd')
    expect(table.rows[0].cells[1].textContent).toBe('asa')
    typeText(doc, 'First cell')
    expect(table.rows[1].cells[0].textContent).toBe('First cell')
    expect(load(doc.getMarkdown()).getJSON().content?.[0].type).toBe('table')
  })

  it('converts separators without outer pipes on Enter and supports undo', () => {
    const doc = load('')
    typeText(doc, 'One | Two')
    doc.view.someProp('handleKeyDown', handler => handler(doc.view, new KeyboardEvent('keydown', { key: 'Enter' })))
    typeText(doc, '--- | ---')
    doc.view.someProp('handleKeyDown', handler => handler(doc.view, new KeyboardEvent('keydown', { key: 'Enter' })))
    expect(document.querySelector('table')).not.toBeNull()
    doc.commands.undoInputRule()
    expect(document.querySelector('table')).toBeNull()
    expect(doc.getText()).toContain('One | Two')
  })

  it('keeps pipe text and dollar delimiters literal inside code', () => {
    const doc = load('```text\n\n```')
    doc.commands.setTextSelection(1)
    typeText(doc, '$$A/B$$')
    expect(doc.getJSON().content?.[0].type).toBe('codeBlock')
    expect(doc.getJSON().content?.[0].content?.[0].text).toBe('$$A/B$$')
  })

  it('refreshes Mermaid previews on theme changes and reuses the matching cached render', async () => {
    vi.useFakeTimers()
    const doc = load('```mermaid\nflowchart LR\n Light --> Dark\n```')
    const original = doc.getMarkdown()
    await vi.advanceTimersByTimeAsync(250)
    await vi.dynamicImportSettled()
    expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'neutral' }))
    expect(document.querySelector('.diagram-preview svg')).not.toBeNull()

    document.documentElement.classList.add('dark')
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(250)
    expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }))
    expect(mermaid.render).toHaveBeenCalledTimes(2)

    document.documentElement.classList.remove('dark')
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(250)
    expect(mermaid.render).toHaveBeenCalledTimes(2)
    expect(doc.getMarkdown()).toBe(original)
  })

  it('shows Mermaid as a diagram and exposes its source only while editing', () => {
    const doc = load('```mermaid\nflowchart LR\n A --> B\n```\n\nAfter diagram.')
    const original = doc.getMarkdown()
    const diagram = document.querySelector<HTMLElement>('.is-diagram')!
    const source = diagram.querySelector('pre')!
    const toggle = diagram.querySelector<HTMLButtonElement>('button[aria-expanded]')!
    expect(source.hidden).toBe(true)
    expect(diagram.classList.contains('editing-diagram')).toBe(false)
    toggle.click()
    expect(source.hidden).toBe(false)
    expect(diagram.classList.contains('editing-diagram')).toBe(true)
    expect(toggle.textContent).toBe('Done')
    toggle.click()
    expect(source.hidden).toBe(true)
    expect(diagram.classList.contains('editing-diagram')).toBe(false)
    expect(doc.getMarkdown()).toBe(original)
    doc.setEditable(false, false)
    toggle.click()
    expect(source.hidden).toBe(true)
  })

  it.each(['[]', '[ ]', '- [ ]', '* [ ]', '+ [ ]'])('turns %s into an unchecked task as soon as the bracket closes', text => {
    const doc = load('')
    typeText(doc, text)
    const task = document.querySelector<HTMLLIElement>('li[data-type="taskItem"]')!
    expect(task).not.toBeNull()
    expect(task.querySelector<HTMLInputElement>('input')!.checked).toBe(false)
    expect(doc.getJSON().content?.[0].type).toBe('taskList')
    typeText(doc, 'Next task')
    expect(task.querySelector('div')!.textContent).toBe('Next task')
  })

  it.each(['[x]', '[X]', '- [x]'])('recognizes checked tasks from %s', text => {
    const doc = load('')
    typeText(doc, text)
    expect(document.querySelector<HTMLInputElement>('li[data-type="taskItem"] input')?.checked).toBe(true)
  })

  it('converts an existing bullet item without losing sibling items', () => {
    const doc = load('- Existing\n- Replace')
    let lastParagraph = 0
    doc.state.doc.descendants((node, position) => { if (node.type.name === 'paragraph') lastParagraph = position + 1 })
    doc.commands.setTextSelection({ from: lastParagraph, to: lastParagraph + 'Replace'.length })
    doc.commands.deleteSelection()
    typeText(doc, '[ ]')
    expect(doc.getJSON().content?.some(node => node.type === 'taskList')).toBe(true)
    expect(doc.getText()).toContain('Existing')
    expect(document.querySelectorAll('li[data-type="taskItem"]').length).toBe(1)
  })

  it('copies the current code source and reports clipboard failures', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const doc = load('```javascript\nconst value = 42\n```')
    const copy = document.querySelector<HTMLButtonElement>('[aria-label="Copy code"]')!
    copy.click()
    await Promise.resolve()
    expect(writeText).toHaveBeenLastCalledWith('const value = 42')
    expect(copy.textContent).toBe('Copied')
    await vi.advanceTimersByTimeAsync(2000)
    expect(copy.textContent).toBe('Copy')

    doc.commands.setContent('```mermaid\nflowchart LR\n A --> B\n```', { contentType: 'markdown' })
    writeText.mockRejectedValueOnce(new Error('Denied'))
    const diagramCopy = document.querySelector<HTMLButtonElement>('[aria-label="Copy code"]')!
    diagramCopy.click()
    await Promise.resolve()
    expect(writeText).toHaveBeenLastCalledWith('flowchart LR\n A --> B')
    expect(diagramCopy.textContent).toBe('Copy failed')
  })
})
