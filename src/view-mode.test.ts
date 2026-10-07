// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'

it('renders source in Read mode, prevents edits, and restores Write mode', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
  document.body.innerHTML = '<div id="app"></div>'
  await import('./main')
  const click = async (action: string) => {
    document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click()
    await Promise.resolve()
    await Promise.resolve()
  }
  await click('source')
  const source = document.querySelector<HTMLTextAreaElement>('#source')!
  source.value = 'Energy $E=mc^2$.\n\n- [ ] Task\n\n```javascript\nconst n = 1\n```'
  source.dispatchEvent(new Event('input', { bubbles: true }))
  await click('read')
  expect(source.hidden).toBe(true)
  expect(document.querySelector('#app')?.classList.contains('read-mode')).toBe(true)
  expect(document.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('false')
  expect(document.querySelector('.katex')).not.toBeNull()
  const format = document.querySelector<HTMLButtonElement>('[data-format="bold"]')!
  expect(format.disabled).toBe(true)
  const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  const task = checkbox.closest('li')!
  expect(task.dataset.type).toBe('taskItem')
  expect(task.querySelector(':scope > div')?.textContent).toBe('Task')
  checkbox.click()
  expect(checkbox.checked).toBe(false)
  document.querySelector<HTMLElement>('[data-type="inline-math"]')!.click()
  expect(document.querySelector<HTMLDialogElement>('#input-dialog')!.open).toBe(false)
  expect(document.querySelector('[aria-label="Copy code"]')).not.toBeNull()
  await click('source')
  expect(source.value).toContain('$E=mc^2$')
  expect(source.value).toContain('- [ ] Task')
  await click('visual')
  expect(document.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('true')
  expect(format.disabled).toBe(false)
})
