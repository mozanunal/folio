// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { attachSidebarResize, attachThemePicker } from './appearance'

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value) },
  })
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
  document.body.innerHTML = '<div id="app"><div id="handle"></div></div><select></select>'
})

it('restores legacy themes and persists named palettes with the right dark appearance', () => {
  localStorage.setItem('folio-theme', 'dark')
  const picker = document.querySelector('select')!
  attachThemePicker(picker)
  expect(picker.options.length).toBe(6)
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  for (const [id, dark] of [['sepia', false], ['nord', true], ['ocean', false], ['graphite', true]] as const) {
    picker.value = id
    picker.dispatchEvent(new Event('change'))
    expect(document.documentElement.dataset.theme).toBe(id)
    expect(document.documentElement.classList.contains('dark')).toBe(dark)
    expect(localStorage.getItem('folio-theme')).toBe(id)
  }
})

it('falls back to Paper for an unknown saved theme', () => {
  localStorage.setItem('folio-theme', 'unknown')
  attachThemePicker(document.querySelector('select')!)
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('restores sidebar width, supports keyboard bounds, and resets on double-click', () => {
  localStorage.setItem('folio-sidebar-width', '350')
  const app = document.getElementById('app')!
  const handle = document.getElementById('handle')!
  attachSidebarResize(app, handle)
  expect(app.style.getPropertyValue('--sidebar-width')).toBe('350px')
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }))
  expect(localStorage.getItem('folio-sidebar-width')).toBe('390')
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }))
  expect(handle.getAttribute('aria-valuenow')).toBe('200')
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
  expect(handle.getAttribute('aria-valuenow')).toBe('200')
  handle.dispatchEvent(new MouseEvent('dblclick'))
  expect(localStorage.getItem('folio-sidebar-width')).toBe('244')
})

it('drags the sidebar without selecting text and persists when capture ends', () => {
  const app = document.getElementById('app')!
  const handle = document.getElementById('handle')!
  handle.setPointerCapture = vi.fn()
  attachSidebarResize(app, handle)
  const pointer = (type: string, clientX: number) => {
    const event = new MouseEvent(type, { clientX, button: 0 })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    handle.dispatchEvent(event)
  }
  pointer('pointerdown', 244)
  pointer('pointermove', 450)
  expect(app.style.getPropertyValue('--sidebar-width')).toBe('450px')
  expect(app.classList.contains('resizing-sidebar')).toBe(true)
  pointer('lostpointercapture', 450)
  expect(app.classList.contains('resizing-sidebar')).toBe(false)
  expect(localStorage.getItem('folio-sidebar-width')).toBe('450')
})
