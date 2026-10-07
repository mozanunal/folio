import highlight from 'highlight.js/lib/core'
import markdown from 'highlight.js/lib/languages/markdown'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'

const highlighter = highlight.newInstance()
for (const [name, language] of Object.entries({ xml, javascript, typescript, python, rust, json, bash })) {
  highlighter.registerLanguage(name, language)
}
highlighter.registerLanguage('markdown', api => {
  const language = markdown(api)
  const aliases = { javascript: ['javascript', 'js'], typescript: ['typescript', 'ts'], python: ['python', 'py'], rust: ['rust', 'rs'], json: ['json'], bash: ['bash', 'sh', 'shell'] }
  const fences = Object.entries(aliases).flatMap(([name, names]) => ['`', '~'].map(fence => ({
    begin: new RegExp(`^ {0,3}${fence}{3,}[ \\t]*(?:${names.join('|')})[ \\t]*$`),
    end: new RegExp(`^ {0,3}${fence}{3,}[ \\t]*$`),
    subLanguage: name,
    excludeBegin: true,
    excludeEnd: true,
  })))
  language.contains?.unshift(
    ...fences,
    { scope: 'formula', begin: /\$\$/, end: /\$\$/, contains: [api.BACKSLASH_ESCAPE] },
    { scope: 'formula', begin: /\$(?=\S)/, end: /\$/, contains: [api.BACKSLASH_ESCAPE] },
    { scope: 'bullet', match: /\[[ xX]?\]/ },
    { scope: 'punctuation', match: /\|/ },
  )
  return language
})

export function attachSourceHighlighting(source: HTMLTextAreaElement, mirror: HTMLElement) {
  const code = document.createElement('code')
  mirror.replaceChildren(code)
  let previous: string | undefined
  let frame: number | undefined
  const synchronizeScroll = () => {
    mirror.scrollTop = source.scrollTop
    mirror.scrollLeft = source.scrollLeft
  }
  const refresh = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    if (source.value !== previous) {
      code.innerHTML = highlighter.highlight(source.value, { language: 'markdown', ignoreIllegals: true }).value
      if (source.value.endsWith('\n')) code.append(document.createTextNode(' '))
      previous = source.value
    }
    synchronizeScroll()
  }
  source.addEventListener('input', () => { frame ??= requestAnimationFrame(refresh) })
  source.addEventListener('scroll', synchronizeScroll, { passive: true })
  return refresh
}
