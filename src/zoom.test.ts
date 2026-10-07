// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { attachZoomShortcuts } from './zoom'

async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve() }

it.each(['MacIntel', 'Win32', 'Linux x86_64'])('uses platform zoom shortcuts without typing into the source editor on %s', async platform => {
  const apply = vi.fn()
  const error = vi.fn()
  const storage = { getItem: () => null, setItem: vi.fn() }
  const detach = attachZoomShortcuts({ platform, storage, apply, error })
  const modifier = platform === 'MacIntel' ? { metaKey: true } : { ctrlKey: true }
  for (const key of ['=', '+', '-', '0']) {
    const event = new KeyboardEvent('keydown', { key, ...modifier, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  }
  await settle()
  expect(apply.mock.calls.map(([scale]) => scale)).toEqual([1.1, 1.2, 1.1, 1])
  expect(storage.setItem).toHaveBeenLastCalledWith('folio-zoom', '100')
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', ...(platform === 'MacIntel' ? { ctrlKey: true } : { metaKey: true }) }))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }))
  await settle()
  expect(apply).toHaveBeenCalledTimes(4)
  expect(error).not.toHaveBeenCalled()
  detach()
})

it('restores zoom and clamps it to the supported range', async () => {
  const apply = vi.fn()
  const detach = attachZoomShortcuts({ platform: 'MacIntel', storage: { getItem: () => '200', setItem: vi.fn() }, apply, error: vi.fn() })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', metaKey: true }))
  await settle()
  expect(apply.mock.calls.map(([scale]) => scale)).toEqual([2, 2])
  detach()
  const detachMinimum = attachZoomShortcuts({ platform: 'Win32', storage: { getItem: () => '50', setItem: vi.fn() }, apply, error: vi.fn() })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', ctrlKey: true }))
  await settle()
  expect(apply.mock.calls.slice(-2).map(([scale]) => scale)).toEqual([0.5, 0.5])
  detachMinimum()
})

it('keeps rapid zoom requests ordered and recovers after a native failure', async () => {
  let finish: (() => void) | undefined
  const apply = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
    .mockRejectedValueOnce(new Error('Native zoom failed')).mockResolvedValue(undefined)
  const error = vi.fn()
  const detach = attachZoomShortcuts({ platform: 'MacIntel', storage: { getItem: () => 'invalid', setItem: vi.fn() }, apply, error })
  for (const key of ['+', '+', '0']) window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: true }))
  await settle()
  expect(apply).toHaveBeenCalledTimes(1)
  finish!()
  await settle()
  expect(apply.mock.calls.map(([scale]) => scale)).toEqual([1.1, 1.2, 1])
  expect(error).toHaveBeenCalledTimes(1)
  detach()
})
