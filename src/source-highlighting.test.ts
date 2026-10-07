// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { attachSourceHighlighting } from './source-highlighting'

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers() })

function sourceEditor(text: string) {
  const source = document.createElement('textarea')
  const mirror = document.createElement('pre')
  document.body.append(mirror, source)
  const refresh = attachSourceHighlighting(source, mirror)
  source.value = text
  refresh()
  return { source, mirror, refresh }
}

it('highlights Markdown, formulas, and fenced code without changing the source or interpreting HTML', () => {
  const text = '# Heading\n\n**Bold** and $x^2$.\n\n- [ ] Task\n\n```javascript\nconst value = "<img src=x onerror=alert(1)>"\n```\n\n![SVG](diagram.svg)'
  const { source, mirror, refresh } = sourceEditor(text)
  expect(mirror.querySelector('.hljs-section')).not.toBeNull()
  expect(mirror.querySelector('.hljs-strong')).not.toBeNull()
  expect(mirror.querySelector('.hljs-formula')?.textContent).toBe('$x^2$')
  expect(mirror.querySelector('.hljs-keyword')?.textContent).toBe('const')
  expect(mirror.querySelector('img')).toBeNull()
  expect(mirror.textContent).toBe(text)
  source.setSelectionRange(3, 8)
  refresh()
  expect(source.value).toBe(text)
  expect([source.selectionStart, source.selectionEnd]).toEqual([3, 8])
})

it('synchronizes scrolling and batches highlighting while typing', async () => {
  vi.useFakeTimers()
  const { source, mirror } = sourceEditor('Plain text')
  source.value = '# New heading'
  source.dispatchEvent(new Event('input'))
  source.value = '# Latest heading'
  source.dispatchEvent(new Event('input'))
  await vi.advanceTimersByTimeAsync(20)
  expect(mirror.querySelector('.hljs-section')?.textContent).toBe('# Latest heading')
  source.scrollTop = 120
  source.scrollLeft = 40
  source.dispatchEvent(new Event('scroll'))
  expect(mirror.scrollTop).toBe(120)
  expect(mirror.scrollLeft).toBe(40)
})

it('keeps the last empty line visible after a trailing newline', () => {
  const { source, mirror } = sourceEditor('Last line\n')
  expect(source.value).toBe('Last line\n')
  expect(mirror.textContent).toBe('Last line\n ')
})
