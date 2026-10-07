// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { attachSidebarResize, attachAppearanceControls } from './appearance'

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value) },
  })
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
  document.body.innerHTML = '<div id="app"><div id="handle"></div></div><button id="mode"></button><button id="scheme"></button><div id="schemes" hidden></div>'
})

it('migrates the saved theme and changes mode independently of the color scheme', () => {
  localStorage.setItem('folio-theme', 'dark')
  const mode = document.querySelector<HTMLButtonElement>('#mode')!
  const scheme = document.querySelector<HTMLButtonElement>('#scheme')!
  const panel = document.getElementById('schemes')!
  attachAppearanceControls(mode, scheme, panel)
  expect(panel.querySelectorAll('button').length).toBe(6)
  expect(document.documentElement.dataset.theme).toBe('forest')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  scheme.click()
  expect(panel.hidden).toBe(false)
  panel.querySelector<HTMLButtonElement>('[data-scheme="ocean"]')!.click()
  expect(document.documentElement.dataset.theme).toBe('ocean')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(panel.hidden).toBe(true)
  mode.click()
  expect(document.documentElement.dataset.theme).toBe('ocean')
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(localStorage.getItem('folio-appearance')).toBe('light')
  expect(localStorage.getItem('folio-scheme')).toBe('ocean')
  scheme.click()
  panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(panel.hidden).toBe(true)
  expect(document.activeElement).toBe(scheme)
})

it('restores separate appearance preferences and falls back for an unknown scheme', () => {
  localStorage.setItem('folio-scheme', 'unknown')
  localStorage.setItem('folio-appearance', 'dark')
  attachAppearanceControls(document.querySelector('#mode')!, document.querySelector('#scheme')!, document.getElementById('schemes')!)
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
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
