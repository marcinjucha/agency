// --- Tiptap ProseMirror JSON structure ---

export type TiptapMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type TiptapNode = {
  type: string
  content?: TiptapNode[]
  attrs?: Record<string, unknown>
  marks?: TiptapMark[]
  text?: string
}

export type TiptapContent = {
  type: 'doc'
  content: TiptapNode[]
}
