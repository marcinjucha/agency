/**
 * Tests for `validateDownloadableAssets` — the wire-boundary guard that
 * walks Tiptap content and rejects any `downloadableAsset` node whose
 * attrs fail the allowlist (unsafe URL scheme, unknown assetType, etc).
 *
 * Why this layer exists: the createServerFn input schema accepts
 * `z.object({ type: 'doc', content: z.array(z.any()) })` because Tiptap
 * shapes are open-ended. Without this walker, a crafted POST could
 * persist `url: "javascript:alert(1)"` into JSONB and survive until
 * render time.
 */

import { describe, it, expect } from 'vitest'
import { validateDownloadableAssets } from '../validation'

const SAFE_ATTRS = {
  mediaItemId: 'media-uuid-1',
  url: 'https://example.com/files/report.pdf',
  name: 'Annual Report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 524288,
  assetType: 'document',
}

function docWithAsset(attrs: Record<string, unknown>) {
  return {
    type: 'doc',
    content: [{ type: 'downloadableAsset', attrs }],
  }
}

describe('validateDownloadableAssets — happy path', () => {
  it('accepts a doc with a single valid downloadableAsset', () => {
    expect(validateDownloadableAssets(docWithAsset(SAFE_ATTRS))).toEqual({ valid: true })
  })

  it('accepts an empty doc (no nodes to check)', () => {
    expect(validateDownloadableAssets({ type: 'doc', content: [] })).toEqual({ valid: true })
  })

  it('accepts a doc with non-downloadableAsset nodes (paragraph, image, etc.)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
        { type: 'image', attrs: { src: 'https://x.com/y.png' } },
      ],
    }
    expect(validateDownloadableAssets(doc)).toEqual({ valid: true })
  })

  it('walks deeply nested content (asset inside paragraph inside blockquote)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'downloadableAsset', attrs: SAFE_ATTRS }],
            },
          ],
        },
      ],
    }
    expect(validateDownloadableAssets(doc)).toEqual({ valid: true })
  })

  it('accepts sizeBytes: null (unknown size is a valid state)', () => {
    expect(
      validateDownloadableAssets(docWithAsset({ ...SAFE_ATTRS, sizeBytes: null })),
    ).toEqual({ valid: true })
  })

  it('accepts http URLs (not only https)', () => {
    expect(
      validateDownloadableAssets(docWithAsset({ ...SAFE_ATTRS, url: 'http://example.com/x.pdf' })),
    ).toEqual({ valid: true })
  })
})

describe('validateDownloadableAssets — rejects unsafe URL schemes', () => {
  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
  ])('rejects URL scheme: %s', (url) => {
    const result = validateDownloadableAssets(docWithAsset({ ...SAFE_ATTRS, url }))
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toMatch(/url|http|https|scheme/i)
    }
  })

  it('rejects an empty URL', () => {
    const result = validateDownloadableAssets(docWithAsset({ ...SAFE_ATTRS, url: '' }))
    expect(result.valid).toBe(false)
  })

  it('rejects a non-URL string', () => {
    const result = validateDownloadableAssets(docWithAsset({ ...SAFE_ATTRS, url: 'not-a-url' }))
    expect(result.valid).toBe(false)
  })
})

describe('validateDownloadableAssets — rejects out-of-allowlist attrs', () => {
  it('rejects unknown assetType (out of DOWNLOADABLE_ASSET_TYPES)', () => {
    const result = validateDownloadableAssets(
      docWithAsset({ ...SAFE_ATTRS, assetType: 'executable' }),
    )
    expect(result.valid).toBe(false)
  })

  it('rejects negative sizeBytes', () => {
    const result = validateDownloadableAssets(
      docWithAsset({ ...SAFE_ATTRS, sizeBytes: -1 }),
    )
    expect(result.valid).toBe(false)
  })

  it('rejects oversized name (>500 chars — likely injection attempt)', () => {
    const result = validateDownloadableAssets(
      docWithAsset({ ...SAFE_ATTRS, name: 'x'.repeat(501) }),
    )
    expect(result.valid).toBe(false)
  })

  it('rejects oversized mimeType (>200 chars)', () => {
    const result = validateDownloadableAssets(
      docWithAsset({ ...SAFE_ATTRS, mimeType: 'x'.repeat(201) }),
    )
    expect(result.valid).toBe(false)
  })
})

describe('validateDownloadableAssets — fail-fast semantics', () => {
  it('returns the FIRST error encountered (depth-first)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'downloadableAsset', attrs: { ...SAFE_ATTRS, url: 'javascript:alert(1)' } },
        { type: 'downloadableAsset', attrs: { ...SAFE_ATTRS, assetType: 'unknown' } },
      ],
    }
    const result = validateDownloadableAssets(doc)
    expect(result.valid).toBe(false)
    // First error is the unsafe URL — second node is never reached.
    if (!result.valid) {
      expect(result.error).toMatch(/url|http|https|scheme/i)
    }
  })

  it('handles undefined content gracefully (treats as no nodes)', () => {
    expect(validateDownloadableAssets(undefined)).toEqual({ valid: true })
  })

  it('handles null content gracefully', () => {
    expect(validateDownloadableAssets(null)).toEqual({ valid: true })
  })
})
