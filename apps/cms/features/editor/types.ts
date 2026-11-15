// --- Tiptap ProseMirror JSON structure ---

import type { Json } from '@agency/database'

// attrs are JSON (stored in jsonb). Typed as Json, not unknown: Start type-checks that server fn
// results are serializable, and `unknown` fails that check (same fix as course-platform).
type TiptapAttrs = { [key: string]: Json | undefined }

export type TiptapMark = {
  type: string
  attrs?: TiptapAttrs
}

export type TiptapNode = {
  type: string
  content?: TiptapNode[]
  attrs?: TiptapAttrs
  marks?: TiptapMark[]
  text?: string
}

export type TiptapContent = {
  type: 'doc'
  content: TiptapNode[]
}
