import { generateHTML } from '@tiptap/html'
import type { Extensions } from '@tiptap/core'
import type { TiptapContent } from './types'
import { baseExtensions } from './extensions'

// --- Content parsing (for Server Action JSON.stringify round-trip) ---

export function parseContent(content: unknown): unknown {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content)
    } catch {
      return content
    }
  }
  return content
}

/**
 * Generates HTML from Tiptap JSON content.
 * Pass blog's `editorExtensions` when rendering blog content (includes media nodes).
 * Defaults to `baseExtensions` for non-media content (legal pages, etc.).
 */
export function generateHtmlFromContent(content: TiptapContent, extensions?: Extensions): string {
  return generateHTML(content, extensions ?? baseExtensions)
}
