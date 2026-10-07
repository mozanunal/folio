import { Extension, InputRule } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'

export const MarkdownTyping = Extension.create({
  name: 'markdownTyping',
  priority: 1100,
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*(?:[-+*]\s+)?\[([ xX]?)\]$/,
        handler: ({ range, match, chain }) => {
          const commands = chain().deleteRange(range)
          if (!this.editor.isActive('taskList')) commands.toggleTaskList()
          if (!commands.updateAttributes('taskItem', { checked: match[1].toLowerCase() === 'x' }).run()) return null
        },
      }),
      new InputRule({
        find: /^---$/,
        undoable: false,
        handler: ({ state, range, match }) => {
          const paragraph = state.doc.resolve(range.from)
          const index = paragraph.index(-1)
          if (paragraph.parent.type.name !== 'paragraph' || !index) return null
          const previous = paragraph.node(-1).child(index - 1)
          if (previous.type.name !== 'paragraph' || !previous.textContent.includes('|')) return null
          state.tr.insertText(match[0], range.from, range.to)
        },
      }),
      new InputRule({
        find: /^\$\$((?:\\[^\n]|[^\\$\n])+)\$\$(?:\n)?$/,
        handler: ({ state, range, match }) => {
          const paragraph = state.doc.resolve(range.from)
          if (paragraph.parent.type.name !== 'paragraph' || range.to !== paragraph.end()) return null
          const latex = match[1].trim()
          if (!latex) return null
          const formula = state.schema.nodes.blockMath.create({ latex })
          const nextParagraph = state.schema.nodes.paragraph.create()
          const replacement = Fragment.fromArray([formula, nextParagraph])
          if (!paragraph.node(-1).canReplace(paragraph.index(-1), paragraph.indexAfter(-1), replacement)) return null
          const start = paragraph.before()
          state.tr.replaceWith(start, paragraph.after(), replacement)
          state.tr.setSelection(TextSelection.create(state.tr.doc, start + formula.nodeSize + 1))
        },
      }),
      new InputRule({
        find: text => {
          const separator = text.replace(/\n$/, '')
          if (!text.endsWith('\n') && !separator.trimEnd().endsWith('|')) return null
          if (!/^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(separator)) return null
          return { index: 0, text, data: { separator } }
        },
        handler: ({ state, range, match }) => {
          const paragraph = state.doc.resolve(range.from)
          if (paragraph.parent.type.name !== 'paragraph' || range.to !== paragraph.end()) return null
          const index = paragraph.index(-1)
          if (!index) return null
          const header = paragraph.node(-1).child(index - 1)
          if (header.type.name !== 'paragraph' || !header.textContent.includes('|')) return null
          const separator = String(match.data?.separator).replace(/-{2,}/g, '---')
          const headerMarkdown = this.editor.markdown?.serialize({ type: 'doc', content: [header.toJSON()] })
          const parsed = this.editor.markdown?.parse(`${headerMarkdown}\n${separator}`)
          if (parsed?.content?.length !== 1 || parsed.content[0].type !== 'table') return null
          const table = state.schema.nodeFromJSON(parsed.content[0])
          const cells = Array.from({ length: table.firstChild!.childCount }, () => state.schema.nodes.tableCell.createAndFill()!)
          const body = state.schema.nodes.tableRow.create(null, cells)
          const replacement = table.copy(table.content.append(Fragment.from(body)))
          const nodes = index + 1 === paragraph.node(-1).childCount
            ? Fragment.fromArray([replacement, state.schema.nodes.paragraph.create()])
            : Fragment.from(replacement)
          const start = paragraph.before() - header.nodeSize
          if (!paragraph.node(-1).canReplace(index - 1, index + 1, nodes)) return null
          state.tr.replaceWith(start, paragraph.after(), nodes)
          state.tr.setSelection(TextSelection.create(state.tr.doc, start + table.firstChild!.nodeSize + 4))
        },
      }),
    ]
  },
})
