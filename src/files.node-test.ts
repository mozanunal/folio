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
