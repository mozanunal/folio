export const themes = [
  { id: 'light', name: 'Paper', dark: false },
  { id: 'sepia', name: 'Sepia', dark: false },
  { id: 'ocean', name: 'Ocean', dark: false },
  { id: 'dark', name: 'Forest', dark: true },
  { id: 'nord', name: 'Nord', dark: true },
  { id: 'graphite', name: 'Graphite', dark: true },
] as const

export function attachThemePicker(picker: HTMLSelectElement) {
  for (const theme of themes) picker.add(new Option(theme.name, theme.id))
  const apply = (id: string) => {
    const theme = themes.find(theme => theme.id === id) ?? themes[0]
    document.documentElement.dataset.theme = theme.id
    document.documentElement.classList.toggle('dark', theme.dark)
    picker.value = theme.id
  }
  apply(localStorage.getItem('folio-theme') ?? 'light')
  picker.addEventListener('change', () => {
    apply(picker.value)
    localStorage.setItem('folio-theme', picker.value)
  })
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
