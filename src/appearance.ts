export const colorSchemes = [
  { id: 'light', name: 'Paper', color: '#9c927f' },
  { id: 'sepia', name: 'Sepia', color: '#b88750' },
  { id: 'ocean', name: 'Ocean', color: '#4287ad' },
  { id: 'forest', name: 'Forest', color: '#65876b' },
  { id: 'nord', name: 'Nord', color: '#88b7c7' },
  { id: 'graphite', name: 'Graphite', color: '#aaa298' },
] as const

export function attachAppearanceControls(modeButton: HTMLButtonElement, schemeButton: HTMLButtonElement, panel: HTMLElement) {
  const legacy = localStorage.getItem('folio-theme') ?? 'light'
  const savedScheme = localStorage.getItem('folio-scheme') ?? (legacy === 'dark' ? 'forest' : legacy)
  let scheme = colorSchemes.find(scheme => scheme.id === savedScheme) ?? colorSchemes[0]
  let dark = (localStorage.getItem('folio-appearance') ?? (['dark', 'nord', 'graphite'].includes(legacy) ? 'dark' : 'light')) === 'dark'
  const apply = () => {
    document.documentElement.dataset.theme = scheme.id
    document.documentElement.classList.toggle('dark', dark)
    modeButton.textContent = dark ? '☾ Dark' : '☀ Light'
    modeButton.setAttribute('aria-pressed', String(dark))
    modeButton.title = `Switch to ${dark ? 'light' : 'dark'} mode`
    schemeButton.textContent = scheme.name
    for (const button of panel.querySelectorAll<HTMLButtonElement>('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.scheme === scheme.id))
    }
  }
  const close = () => {
    panel.hidden = true
    schemeButton.setAttribute('aria-expanded', 'false')
  }
  for (const option of colorSchemes) {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.scheme = option.id
    const swatch = document.createElement('span')
    swatch.className = 'scheme-swatch'
    swatch.style.background = option.color
    swatch.setAttribute('aria-hidden', 'true')
    button.append(swatch, option.name)
    button.addEventListener('click', () => {
      scheme = option
      localStorage.setItem('folio-scheme', scheme.id)
      apply()
      close()
      schemeButton.focus()
    })
    panel.append(button)
  }
  modeButton.addEventListener('click', () => {
    dark = !dark
    localStorage.setItem('folio-appearance', dark ? 'dark' : 'light')
    apply()
  })
  schemeButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden
    schemeButton.setAttribute('aria-expanded', String(!panel.hidden))
    if (!panel.hidden) panel.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
  })
  document.addEventListener('click', event => {
    if (!panel.contains(event.target as Node) && !schemeButton.contains(event.target as Node)) close()
  })
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    close()
    schemeButton.focus()
  })
  apply()
}

export function attachSidebarResize(app: HTMLElement, handle: HTMLElement) {
  const minimum = 200
  const defaultWidth = 244
  let width = Number(localStorage.getItem('folio-sidebar-width')) || defaultWidth
  let activePointer: number | null = null
  const maximum = () => Math.max(minimum, Math.min(640, window.innerWidth - 400))
  const update = (next: number) => {
    width = Math.round(Math.max(minimum, Math.min(maximum(), next)))
    app.style.setProperty('--sidebar-width', `${width}px`)
    handle.setAttribute('aria-valuenow', String(width))
    handle.setAttribute('aria-valuemin', String(minimum))
    handle.setAttribute('aria-valuemax', String(maximum()))
  }
  const persist = () => localStorage.setItem('folio-sidebar-width', String(width))
  update(width)
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    event.preventDefault()
    activePointer = event.pointerId
    handle.setPointerCapture(event.pointerId)
    app.classList.add('resizing-sidebar')
  })
  handle.addEventListener('pointermove', event => {
    if (activePointer !== event.pointerId) return
    update(event.clientX - app.getBoundingClientRect().left)
  })
  const finish = () => {
    if (activePointer === null) return
    activePointer = null
    app.classList.remove('resizing-sidebar')
    persist()
  }
  handle.addEventListener('pointerup', finish)
  handle.addEventListener('pointercancel', finish)
  handle.addEventListener('lostpointercapture', finish)
  handle.addEventListener('dblclick', () => { update(defaultWidth); persist() })
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    update(event.key === 'Home' ? minimum : event.key === 'End' ? maximum()
      : width + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 40 : 10))
    persist()
  })
  window.addEventListener('resize', () => update(width))
}
