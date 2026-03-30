import { parseContent as _parseContent, generateHtmlFromContent as _generateHtml } from '../editor/utils'
import { editorExtensions } from './extensions'
import type { TiptapContent } from '../editor/types'
import { routes } from '@/lib/routes'

export { _parseContent as parseContent }

/** Blog-specific wrapper — always includes media extensions for HTML generation */
export function generateHtmlFromContent(content: TiptapContent): string {
  return _generateHtml(content, editorExtensions)
}

// --- S3 upload helper (shared by cover image + inline image upload) ---

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadImageToS3(file: File, folder = 'haloefekt/blog'): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('Plik jest za duzy. Maksymalny rozmiar to 5MB.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Dozwolone sa tylko pliki graficzne.')
  }

  const res = await fetch(routes.api.upload, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
  })
  if (!res.ok) throw new Error('Nie udalo sie wygenerowac URL do uploadu')
  const { uploadUrl, fileUrl } = await res.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('Upload nie powiodl sie')

  return fileUrl
}

export function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '')
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

import { generateSlug as _generateSlug } from '@/lib/utils/slug'
export const generateSlug = _generateSlug
