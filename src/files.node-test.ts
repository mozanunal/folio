import assert from 'node:assert/strict'
import test from 'node:test'
import { basename, resolveImagePath, safeExternalLink } from './files.ts'

test('local SVG references resolve relative to the document on both platforms', () => {
  assert.equal(resolveImagePath('../figures/a.svg', '/work/docs/note.md'), '/work/figures/a.svg')
  assert.equal(resolveImagePath('assets/a.svg', 'C:\\work\\note.md'), 'C:/work/assets/a.svg')
  assert.equal(resolveImagePath('figure%20one.svg', '/work/note.md'), '/work/figure one.svg')
  assert.equal(basename('C:\\work\\note.md'), 'note.md')
})

test('remote images survive and executable schemes are rejected', () => {
  assert.equal(resolveImagePath('https://example.org/a.svg', '/work/note.md'), 'https://example.org/a.svg')
  assert.equal(resolveImagePath('javascript:alert(1)', '/work/note.md'), '')
  assert.equal(safeExternalLink('javascript:alert(1)'), false)
  assert.equal(safeExternalLink('https://example.org'), true)
})

test('document links decode paths and fragments without allowing URL schemes or absolute paths', async () => {
  const { parseDocumentLink, headingSlug } = await import('./files.ts')
  assert.deepEqual(parseDocumentLink('../guides/Training%20Patterns.md#training-loop'), { file: '../guides/Training Patterns.md', fragment: 'training-loop' })
  assert.deepEqual(parseDocumentLink('#medical-data-handling'), { file: '', fragment: 'medical-data-handling' })
  assert.deepEqual(parseDocumentLink('note.markdown?view=1#formula%20one'), { file: 'note.markdown', fragment: 'formula one' })
  for (const href of ['https://example.org/doc.md', 'javascript:doc.md', 'file:///tmp/doc.md', '/tmp/doc.md', 'C:\\doc.md', '%2fetc/note.md', '//server/doc.md', 'image.svg', 'bad%ZZ.md', '']) {
    assert.equal(parseDocumentLink(href), null, href)
  }
  assert.equal(headingSlug('Medical Data Handling: Splits & Metrics'), 'medical-data-handling-splits--metrics')
  assert.equal(headingSlug('Ölçüm 方法'), 'ölçüm-方法')
})
