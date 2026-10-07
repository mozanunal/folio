# Folio feature check

A document with **bold**, *italic*, ~~strikethrough~~, and https://example.org.

- [x] GFM tasks
- [ ] Edit this checkbox

| Feature | Status |
| --- | --- |
| Tables | Editable |
| Files | Local |

Inline mathematics: $E=mc^2$.

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

![Local SVG](demo.svg)

```mermaid
flowchart LR
    File[Markdown file] --> Editor[Visual editing]
    Editor --> Save[Save to disk]
```

```python
def gaussian(x, sigma):
    return exp(-x ** 2 / (2 * sigma ** 2))
```
