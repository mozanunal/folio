import { describe, expect, it } from 'vitest'
import { renderAsync } from 'pele/lazy'

const diagrams = [
  ['flowchart', 'flowchart LR\n A[Draft] --> B[Published]'],
  ['sequence', 'sequenceDiagram\n Alice->>Bob: Hello\n Bob-->>Alice: Hi'],
  ['class', 'classDiagram\n Animal <|-- Duck\n Animal : +eat()'],
  ['state', 'stateDiagram-v2\n [*] --> Draft\n Draft --> Published'],
  ['entity relationship', 'erDiagram\n AUTHOR ||--o{ BOOK : writes'],
  ['pie', 'pie title Notes\n "Draft" : 3\n "Done" : 7'],
  ['gantt', 'gantt\n dateFormat YYYY-MM-DD\n section Writing\n Draft :a1, 2026-10-01, 3d'],
  ['mindmap', 'mindmap\n root((Notes))\n  Research\n  Writing'],
  ['timeline', 'timeline\n 2026 : Draft : Publish'],
  ['XY chart', 'xychart-beta\n x-axis [Jan, Feb, Mar]\n y-axis "Count" 0 --> 10\n bar [2, 5, 8]'],
] as const

const options = { links: false, images: false, autoDirection: false }

describe('Pele rendering of Mermaid documents', () => {
  it.each(diagrams)('renders %s with the real renderer', async (_name, source) => {
    const { svg, width, height } = await renderAsync(source, options)
    expect(svg).toContain('<svg')
    expect(svg).toContain('--pele-')
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  it('keeps HTML-like labels from becoming executable markup', async () => {
    const { svg } = await renderAsync('flowchart LR\n A["<script>alert(1)</script>"]', options)
    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('<foreignObject')
  })

  it('disables diagram links even when their source supplies a URL', async () => {
    const { svg } = await renderAsync('flowchart LR\n A[Link]\n click A "https://example.com"', options)
    expect(svg).not.toMatch(/<a[\s>]/)
    expect(svg).not.toContain('href="https://example.com"')
  })

  it('rejects malformed diagrams and enforces a source limit', async () => {
    await expect(renderAsync('not a diagram', options)).rejects.toThrow()
    await expect(renderAsync(diagrams[0][1], { ...options, limit: 10 })).rejects.toThrow()
  })
})
