// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'

type Request = { Ok: { path: string; content: string } } | { Err: string }
const native = vi.hoisted(() => ({
  pending: [] as Request[], opened: undefined as undefined | (() => void),
  invoke: vi.fn(), save: undefined as undefined | ((path: string) => void),
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: native.invoke, isTauri: () => true, convertFileSrc: (path: string) => path }))
vi.mock('@tauri-apps/api/event', () => ({ listen: async (_name: string, callback: () => void) => { native.opened = callback; return () => {} } }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onCloseRequested: async () => {} }) }))

async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve() }
async function click(selector: string) { document.querySelector<HTMLButtonElement>(selector)!.click(); await settle() }

it('opens startup and later native requests, preserves dirty tabs, and waits for in-progress saves', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  document.body.innerHTML = '<div id="app"></div>'
  native.pending = [{ Ok: { path: '/docs/first.md', content: '# First file' } }]
  native.invoke.mockImplementation(async (command: string) => {
    if (command === 'take_open_documents') return native.pending.splice(0)
    if (command === 'save_document') return new Promise<string>(resolve => { native.save = resolve })
    throw new Error(`Unexpected command: ${command}`)
  })
  await import('./main')
  await vi.dynamicImportSettled()
  await settle()
  expect(document.querySelector('#document-name')?.textContent).toBe('first.md')
  expect(document.querySelectorAll('[role="tab"]').length).toBe(1)
  await click('[data-action="source"]')
  const source = document.querySelector<HTMLTextAreaElement>('#source')!
  expect(source.value).toBe('# First file')
  source.value = '# First file, edited'
  source.dispatchEvent(new Event('input', { bubbles: true }))

  native.pending.push({ Err: 'Cannot read missing.md' }, { Ok: { path: '/docs/second.md', content: '# Second file' } })
  native.opened!()
  await settle()
  expect(document.querySelector('#document-name')?.textContent).toBe('second.md')
  expect(document.querySelectorAll('[role="tab"]').length).toBe(2)
  expect(document.querySelector('#toast')?.textContent).toContain('missing.md')

  native.pending.push({ Ok: { path: '/docs/first.md', content: '# First file on disk' } })
  native.opened!()
  await settle()
  expect(document.querySelectorAll('[role="tab"]').length).toBe(2)
  expect(source.hidden).toBe(false)
  expect(source.value).toBe('# First file, edited')
  await click('[data-action="save"]')
  native.pending.push({ Ok: { path: '/docs/third.md', content: '# Third file' } })
  native.opened!()
  await settle()
  expect(document.querySelector('#document-name')?.textContent).toBe('first.md')
  native.save!('/docs/first.md')
  await settle()
  expect(document.querySelector('#document-name')?.textContent).toBe('third.md')
  expect(document.querySelectorAll('[role="tab"]').length).toBe(3)
})
