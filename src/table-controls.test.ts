// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'
import { createEditor } from './editor'
import { attachTableControls } from './table-controls'

let editor: Editor
let controls: HTMLDivElement
let refresh: () => void

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
  const element = document.createElement('div')
  controls = document.createElement('div')
  document.body.append(element, controls)
  editor = createEditor(element, '| Name | Value |\n| --- | --- |\n| Alpha | One |\n| Beta | Two |\n\nAfter table.', {
    path: () => null, changed: () => {}, editMath: () => {},
  })
  refresh = attachTableControls(editor, controls)
})

afterEach(() => { editor.destroy(); document.body.replaceChildren() })

function selectCell(index: number) {
  const positions: number[] = []
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') positions.push(position + 2)
  })
  editor.commands.setTextSelection(positions[index])
}

function click(action: string) {
  controls.querySelector<HTMLButtonElement>(`[data-table="${action}"]`)!.click()
}

it('shows contextual controls and preserves the cell selection on mouse down', () => {
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  expect(controls.hidden).toBe(true)
  selectCell(2)
  expect(controls.hidden).toBe(false)
  expect(controls.querySelector('.table-size')?.textContent).toBe('3 rows × 2 columns')
  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  controls.querySelector('[data-table="row-below"]')!.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
})

it.each(['row-above', 'row-below'])('inserts a row using %s and preserves contents through Markdown', action => {
  selectCell(2)
  click(action)
  expect(document.querySelector('table')!.rows.length).toBe(4)
  const saved = editor.getMarkdown()
  expect(saved).toContain('Alpha')
  expect(saved).toContain('Beta')
  editor.commands.setContent(saved, { contentType: 'markdown' })
  expect(document.querySelector('table')!.rows.length).toBe(4)
})

it.each(['column-left', 'column-right'])('inserts a column using %s and preserves contents through Markdown', action => {
  selectCell(2)
  click(action)
  expect(document.querySelector('table')!.rows[0].cells.length).toBe(3)
  const saved = editor.getMarkdown()
  expect(saved).toContain('Alpha')
  expect(saved).toContain('One')
  editor.commands.setContent(saved, { contentType: 'markdown' })
  expect(document.querySelector('table')!.rows[0].cells.length).toBe(3)
})

it('removes the selected row, column, and table with undo available', () => {
  selectCell(2)
  click('remove-row')
  expect(editor.getMarkdown()).not.toContain('Alpha')
  expect(editor.getMarkdown()).toContain('Beta')
  editor.commands.undo()
  expect(editor.getMarkdown()).toContain('Alpha')
  selectCell(3)
  click('remove-column')
  expect(editor.getMarkdown()).toContain('Alpha')
  expect(editor.getMarkdown()).not.toContain('One')
  selectCell(1)
  click('delete-table')
  expect(document.querySelector('table')).toBeNull()
  expect(editor.getText()).toContain('After table.')
  expect(controls.hidden).toBe(true)
})

it('hides and blocks table editing in Read mode', () => {
  selectCell(2)
  editor.setEditable(false, false)
  refresh()
  expect(controls.hidden).toBe(true)
  const original = editor.getMarkdown()
  click('row-below')
  expect(editor.getMarkdown()).toBe(original)
})
