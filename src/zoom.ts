interface ZoomOptions {
  platform: string
  storage: Pick<Storage, 'getItem' | 'setItem'>
  apply: (scale: number) => Promise<void> | void
  error: (error: unknown) => void
}

export function attachZoomShortcuts(options: ZoomOptions): () => void {
  const saved = Number(options.storage.getItem('folio-zoom') ?? 100)
  let percentage = Number.isFinite(saved) && saved > 0 ? Math.max(50, Math.min(200, Math.round(saved / 10) * 10)) : 100
  let pending = Promise.resolve()
  const apply = (value: number) => {
    pending = pending.then(() => options.apply(value / 100))
      .then(() => { options.storage.setItem('folio-zoom', String(value)) })
      .catch(options.error)
  }
  if (percentage !== 100) apply(percentage)

  const onKeyDown = (event: KeyboardEvent) => {
    const modifier = /Mac|iPhone|iPad/i.test(options.platform) ? event.metaKey : event.ctrlKey
    if (!modifier || event.altKey || event.defaultPrevented) return
    const key = event.key
    if (!['+', '=', '-', '0'].includes(key)) return
    event.preventDefault()
    percentage = key === '0' ? 100 : Math.max(50, Math.min(200, percentage + (key === '-' ? -10 : 10)))
    apply(percentage)
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}
