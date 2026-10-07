export interface DocumentFile { path: string; content: string }
export interface DirectoryEntry { path: string; name: string; directory: boolean }

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

export function resolveImagePath(source: string, documentPath: string | null): string {
  if (/^(https?:|data:|blob:|asset:)/i.test(source)) return source
  if (/^[a-z][a-z\d+.-]*:/i.test(source) && !/^[a-z]:[\\/]/i.test(source)) return ''
  let decoded: string
  try { decoded = decodeURIComponent(source) } catch { decoded = source }
  if (/^(\/|[a-z]:[\\/]|\\\\)/i.test(decoded)) return decoded
  if (!documentPath) return decoded
  const normalized = documentPath.replaceAll('\\', '/')
  const directory = normalized.slice(0, normalized.lastIndexOf('/'))
  const segments = `${directory}/${decoded}`.split('/')
  const result: string[] = []
  for (const segment of segments) {
    if (segment === '..') { if (result.length > 1) result.pop() }
    else if (segment !== '.') result.push(segment)
  }
  return result.join('/')
}

export function safeExternalLink(url: string): boolean {
  return /^(https?:|mailto:)/i.test(url)
}

export function parseDocumentLink(href: string): { file: string; fragment: string } | null {
  const hash = href.indexOf('#')
  try {
    const file = decodeURIComponent((hash < 0 ? href : href.slice(0, hash)).split('?')[0])
    const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1))
    if (/^[\\/]|^[a-z][a-z\d+.-]*:|[\u0000-\u001f]/i.test(file)) return null
    if (file && !/\.(md|markdown|txt)$/i.test(file)) return null
    if (!file && !fragment) return null
    return { file, fragment }
  } catch { return null }
}

export function headingSlug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\s-]/gu, '').replace(/\s/g, '-')
}
