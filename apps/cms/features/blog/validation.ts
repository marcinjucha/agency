import { z } from 'zod'
import { messages } from '@/lib/messages'
import { DOWNLOADABLE_ASSET_TYPES, isSafeUrl } from './extensions/downloadable-asset-html'

// --- Downloadable asset attrs (defense-in-depth at the wire boundary) ---
//
// Tiptap content lands in `blog_posts.content` (JSONB) without per-node attr
// validation by default — `z.array(z.any())` on the doc root accepts any
// shape. A malicious POST that crafts a downloadableAsset node with
// `url: "javascript:alert(1)"` would slip past the schema and only be
// caught at render time. This schema enforces the same allowlist as
// renderDownloadableAssetHtml/parseDownloadableAssetMarkerAttrs at the
// FIRST boundary — the createServerFn input validator. Walks the doc tree
// and validates every downloadableAsset node's attrs.
const downloadableAssetAttrsSchema = z.object({
  mediaItemId: z.string().min(1).optional().nullable(),
  url: z
    .string()
    .url()
    .refine((u) => isSafeUrl(u), {
      message: 'URL must use http or https scheme',
    }),
  // Reasonable upper bounds — anything beyond is almost certainly an
  // injection attempt rather than a real filename / mime type.
  name: z.string().max(500),
  mimeType: z.string().max(200),
  sizeBytes: z.number().int().nonnegative().nullable(),
  assetType: z.enum(DOWNLOADABLE_ASSET_TYPES),
})

/**
 * Walks a Tiptap doc tree and validates every `downloadableAsset` node's
 * attrs against the allowlist schema. Returns `{ valid: true }` or the
 * first error message encountered (depth-first, fail-fast).
 *
 * Why depth-first fail-fast: a single bad node is enough to reject the
 * whole save — there's no partial-save semantics for a blog post, and
 * scanning the whole tree to collect every error wastes cycles.
 */
export function validateDownloadableAssets(content: unknown): { valid: true } | { valid: false; error: string } {
  const visit = (node: unknown): string | null => {
    if (typeof node !== 'object' || node === null) return null
    const n = node as { type?: unknown; attrs?: unknown; content?: unknown }

    if (n.type === 'downloadableAsset') {
      const result = downloadableAssetAttrsSchema.safeParse(n.attrs ?? {})
      if (!result.success) {
        return result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      }
    }

    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        const err = visit(child)
        if (err) return err
      }
    }

    return null
  }

  const err = visit(content)
  return err ? { valid: false, error: err } : { valid: true }
}

// --- SEO metadata schema ---

export const seoMetadataSchema = z.object({
  title: z.string().max(70, messages.validation.seoTitleMax).optional(),
  description: z
    .string()
    .max(160, messages.validation.seoDescriptionMax)
    .optional(),
  ogImage: z.string().url(messages.validation.invalidOgImageUrl).optional().or(z.literal('')),
  keywords: z.array(z.string()).optional(),
})

// --- Blog post schema ---

export const blogPostSchema = z.object({
  title: z.string().min(1, messages.validation.titleRequired),
  slug: z
    .string()
    .min(1, messages.validation.slugRequired)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      messages.validation.slugFormat
    ),
  excerpt: z
    .string()
    .max(300, messages.validation.excerptMax)
    .optional(),
  // Accepted risk: html_body is generated server-side from Tiptap JSON, not user-supplied HTML.
  // Structural validation blocks arbitrary JSON — must be Tiptap doc format.
  content: z.object({ type: z.literal('doc'), content: z.array(z.any()) }).optional(),
  html_body: z.string().optional(),
  cover_image_url: z
    .string()
    .url(messages.validation.invalidImageUrl)
    .refine((url) => url.startsWith('https://'), messages.validation.imageMustBeHttps)
    .optional()
    .or(z.literal('')),
  category: z.string().optional(),
  author_name: z.string().optional(),
  seo_metadata: seoMetadataSchema.optional(),
  published_at: z.string().nullable().optional(),
  is_published: z.boolean().default(false),
  estimated_reading_time: z
    .number()
    .int(messages.validation.readingTimeMustBeInteger)
    .positive(messages.validation.readingTimeMustBePositive)
    .optional(),
})

// --- Inferred types ---

export type BlogPostFormData = z.infer<typeof blogPostSchema>
export type SeoMetadataFormData = z.infer<typeof seoMetadataSchema>
