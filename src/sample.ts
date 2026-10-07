export const sample = String.raw`# A little room to think

Good tools get out of the way. **Folio** is a place for your words, your equations, and the ideas between them.

## Write naturally

Edit this document directly. Select text to format it, or use the toolbar. Your work stays in ordinary Markdown files.

- [x] Open a single document
- [x] Keep equations beside your ideas
- [ ] Make something worth sharing

## Give ideas a shape

The energy of a photon is $E = h\nu$. A Gaussian takes a little more room:

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}}\exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
$$

| A good editor | A better day |
| :--- | :--- |
| Plain files | Yours to keep |
| A quiet interface | Space to focus |
| Fast feedback | Stay in the flow |

## Connect the dots

\`\`\`mermaid
flowchart LR
    A[An idea] --> B[A few words]
    B --> C[Something clear]
\`\`\`

## Keep the details

\`\`\`rust
fn main() {
    let thought = "Make room for the work.";
    println!("{thought}");
}
\`\`\`

> Simplicity is what remains when everything earns its place.

![A small landscape](demo.svg)
`.replaceAll('\\`', '`')
