import type { Editor } from '@tiptap/core'

export function attachTableControls(editor: Editor, container: HTMLElement) {
  const commands = {
    'row-above': () => editor.chain().focus(undefined, { scrollIntoView: false }).addRowBefore().run(),
    'row-below': () => editor.chain().focus(undefined, { scrollIntoView: false }).addRowAfter().run(),
    'remove-row': () => editor.chain().focus(undefined, { scrollIntoView: false }).deleteRow().run(),
    'column-left': () => editor.chain().focus(undefined, { scrollIntoView: false }).addColumnBefore().run(),
    'column-right': () => editor.chain().focus(undefined, { scrollIntoView: false }).addColumnAfter().run(),
    'remove-column': () => editor.chain().focus(undefined, { scrollIntoView: false }).deleteColumn().run(),
    'delete-table': () => editor.chain().focus(undefined, { scrollIntoView: false }).deleteTable().run(),
  }

  container.innerHTML = `
    <span class="table-size" aria-live="polite"></span>
    <div class="table-control-group" role="group" aria-label="Table rows">
      <span>Row</span>
      <button type="button" data-table="row-above" title="Insert row above">↑ Above</button>
      <button type="button" data-table="row-below" title="Insert row below">↓ Below</button>
      <button type="button" data-table="remove-row" title="Remove selected row">Remove</button>
    </div>
    <div class="table-control-group" role="group" aria-label="Table columns">
      <span>Column</span>
      <button type="button" data-table="column-left" title="Insert column to the left">← Left</button>
      <button type="button" data-table="column-right" title="Insert column to the right">→ Right</button>
      <button type="button" data-table="remove-column" title="Remove selected column">Remove</button>
    </div>
    <button type="button" data-table="delete-table" class="delete-table" title="Delete the entire table">Delete table</button>
  `

  const refresh = () => {
    container.hidden = !editor.isEditable || !editor.isActive('table')
    if (container.hidden) return
    const { $from } = editor.state.selection
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth)
      if (node.type.name !== 'table') continue
      container.querySelector('.table-size')!.textContent = `${node.childCount} rows × ${node.firstChild?.childCount ?? 0} columns`
      break
    }
  }

  container.addEventListener('mousedown', event => {
    if ((event.target as HTMLElement).closest('button')) event.preventDefault()
  })
  container.addEventListener('click', event => {
    if (!editor.isEditable || !editor.isActive('table')) return
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-table]')?.dataset.table
    if (action && Object.hasOwn(commands, action)) commands[action as keyof typeof commands]()
  })
  editor.on('transaction', refresh)
  refresh()
  return refresh
}
