// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: native.invoke, isTauri: () => true, convertFileSrc: (path: string) => path }))
vi.mock('@tauri-apps/api/event', () => ({ listen: async () => () => {} }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onCloseRequested: async () => {} }) }))

async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve() }
async function click(selector: string) { document.querySelector<HTMLElement>(selector)!.click(); await settle() }

it('follows relative links and anchors, keeps read mode, and preserves an existing dirty tab', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  const scroll = vi.fn()
  HTMLElement.prototype.scrollIntoView = scroll
  document.body.innerHTML = '<div id="app"></div>'
  const index = { path: '/docs/index.md', content: '# Development\n\n[Training](guides/Training%20Patterns.md#training-loop)\n\n[Here](#development)\n\n[Missing](missing.md)' }
  const training = { path: '/docs/guides/Training Patterns.md', content: '# Training loop\n\n[Home](../index.md#development)' }
  native.invoke.mockImplementation(async (command: string, arguments_: { relativePath?: string }) => {
    if (command === 'take_open_documents') return [{ Ok: index }]
    if (command === 'open_linked_document') {
      if (arguments_.relativePath === 'guides/Training Patterns.md') return training
      if (arguments_.relativePath === '../index.md') return index
      throw new Error('File not found')
    }
    throw new Error(`Unexpected command: ${command}`)
  })
  await import('./main')
  await vi.dynamicImportSettled()
  await settle()
  await click('[data-action="read"]')
  await click('#editor a[href="#development"]')
  expect(scroll).toHaveBeenCalledWith({ block: 'start' })
  expect(native.invoke).toHaveBeenCalledTimes(1)
  await click('#editor a[href^="guides/"]')
  expect(native.invoke).toHaveBeenLastCalledWith('open_linked_document', { origin: '/docs/index.md', relativePath: 'guides/Training Patterns.md' })
  expect(document.querySelector('#document-name')!.textContent).toBe('Training Patterns.md')
  expect(document.querySelector('#app')!.classList.contains('read-mode')).toBe(true)
  expect(document.querySelectorAll('[role="tab"]')).toHaveLength(2)

  await click('[data-action="source"]')
  const source = document.querySelector<HTMLTextAreaElement>('#source')!
  const draft = '# Training loop\n\nUnsaved training edits.\n\n[Home](../index.md#development)'
  source.value = draft
  source.dispatchEvent(new Event('input', { bubbles: true }))
  await click('[data-action="visual"]')
  await click('#editor a[href^="../"]')
  expect(document.querySelector('#document-name')!.textContent).toBe('index.md')
  expect(document.querySelectorAll('[role="tab"]')).toHaveLength(2)
  await click('#editor a[href^="guides/"]')
  expect(document.querySelector('#editor')!.textContent).toContain('Unsaved training edits.')
  expect(document.querySelector('#dirty-indicator')!.hasAttribute('hidden')).toBe(false)

  await click('[data-action="source"]')
  expect(source.value).toContain('Unsaved training edits.')
  await click('[role="tab"][title="/docs/index.md"]')
  await click('#editor a[href="missing.md"]')
  expect(document.querySelector('#toast')!.textContent).toContain('File not found')
  expect(document.querySelector('#document-name')!.textContent).toBe('index.md')
  expect(document.querySelectorAll('[role="tab"]')).toHaveLength(2)
})
