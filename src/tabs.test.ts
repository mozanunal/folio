// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'

const native = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue([]), close: vi.fn(), closeRequested: undefined as undefined | ((event: { preventDefault: () => void }) => Promise<void>),
  editor: undefined as Editor | undefined,
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: native.invoke, isTauri: () => true, convertFileSrc: (path: string) => path }))
vi.mock('@tauri-apps/api/event', () => ({ listen: async () => () => {} }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({
  close: native.close,
  onCloseRequested: async (callback: typeof native.closeRequested) => { native.closeRequested = callback },
}) }))
vi.mock('./editor', async importOriginal => {
  const original = await importOriginal<typeof import('./editor')>()
  return { createEditor: (...args: Parameters<typeof original.createEditor>) => {
    native.editor = original.createEditor(...args)
    return native.editor
  } }
})

async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve() }

async function click(selector: string) {
  document.querySelector<HTMLButtonElement>(selector)!.click()
  await settle()
}

function editSource(text: string) {
  const source = document.querySelector<HTMLTextAreaElement>('#source')!
  source.value = text
  source.dispatchEvent(new Event('input', { bubbles: true }))
}

async function answerPrompt(decision: string) {
  const dialog = document.querySelector<HTMLDialogElement>('#confirm-dialog')!
  expect(dialog.open).toBe(true)
  dialog.returnValue = decision
  dialog.removeAttribute('open')
  dialog.dispatchEvent(new Event('close'))
  await settle()
}

it('keeps documents, changes, modes, history and close prompts separate across tabs', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  document.body.innerHTML = '<div id="app"></div>'
  await import('./main')
  await vi.dynamicImportSettled()
  const tabCount = () => document.querySelectorAll('[role="tab"]').length
  const tab = (path: string) => `[role="tab"][title="${path}"]`
  const source = document.querySelector<HTMLTextAreaElement>('#source')!
  const panel = document.querySelector<HTMLElement>('#document-panel')!
  const editor = native.editor!
  expect(tabCount()).toBe(1)

  native.invoke.mockResolvedValueOnce({ path: '/docs/one.md', content: 'One original.' })
  await click('[data-action="open-file"]')
  await click('[data-action="source"]')
  editSource('One edited.')
  panel.scrollTop = 210
  expect(document.querySelector(tab('/docs/one.md'))!.textContent).toContain('●')

  native.invoke.mockResolvedValueOnce({ path: '/docs/two.md', content: 'Two original.' })
  await click('[data-action="open-file"]')
  expect(tabCount()).toBe(3)
  expect(source.hidden).toBe(true)
  expect(editor.getText()).toContain('Two original.')
  editor.commands.insertContent('Changed ')
  await click('[data-action="read"]')
  expect(editor.isEditable).toBe(false)

  await click(tab('/docs/one.md'))
  expect(source.hidden).toBe(false)
  expect(source.value).toBe('One edited.')
  expect(panel.scrollTop).toBe(210)
  native.invoke.mockResolvedValueOnce({ path: '/docs/one.md', content: 'One original.' })
  await click('[data-action="open-file"]')
  expect(tabCount()).toBe(3)
  expect(source.value).toBe('One edited.')
  native.invoke.mockResolvedValueOnce('/docs/one.md')
  await click('[data-action="save"]')
  expect(native.invoke).toHaveBeenLastCalledWith('save_document', { path: '/docs/one.md', content: 'One edited.', expected: 'One original.' })
  expect(document.querySelector(tab('/docs/one.md'))!.textContent).not.toContain('●')

  await click(tab('/docs/two.md'))
  expect(editor.isEditable).toBe(false)
  await click('[data-action="visual"]')
  editor.commands.undo()
  expect(editor.getText()).toContain('Two original.')
  expect(editor.getText()).not.toContain('One')

  await click('[data-action="source"]')
  editSource('Two unsaved.')
  await click('[aria-label="Close two.md"]')
  await answerPrompt('cancel')
  expect(tabCount()).toBe(3)
  expect(source.value).toBe('Two unsaved.')
  await click('[aria-label="Close two.md"]')
  await answerPrompt('discard')
  expect(tabCount()).toBe(2)
  expect(source.value).toBe('One edited.')

  await click('[data-action="new"]')
  expect(tabCount()).toBe(3)
  expect(editor.getText()).toBe('')
  await click('[data-action="source"]')
  editSource('Unfinished new document.')
  await click(tab('/docs/one.md'))
  const preventDefault = vi.fn()
  const closing = native.closeRequested!({ preventDefault })
  await settle()
  expect(preventDefault).toHaveBeenCalled()
  expect(source.value).toBe('Unfinished new document.')
  await answerPrompt('cancel')
  await closing
  expect(native.close).not.toHaveBeenCalled()
  editor.destroy()
})
