/**
 * Tests for the DownloadableAssetExtension Tiptap node.
 *
 * Two layers of behavior under test:
 *  1. The extension itself — `generateHTML` (the marker output) and
 *     `generateJSON` (parseHTML round-trip via @tiptap/html).
 *  2. The blog post-processor in `features/blog/utils.ts` — verifies the
 *     marker emitted by renderHTML is swapped for the full inline-styled
 *     card produced by `renderDownloadableAssetHtml`.
 *
 * The post-processor tests are the security regression check: if a future
 * change to the extension switches from inline styles to Tailwind classes,
 * these tests fail loudly — the public site renders html_body without
 * Tailwind context, so class-based styling silently breaks.
 */

import { describe, it, expect } from 'vitest'
import { generateHTML, generateJSON } from '@tiptap/html'
import { editorExtensions } from '../index'
import { generateHtmlFromContent } from '../../utils'
import { isSafeUrl, renderDownloadableAssetHtml } from '../downloadable-asset-html'

const FIXTURE_ATTRS = {
  mediaItemId: 'media-uuid-123',
  url: 'https://example.com/files/report.pdf',
  name: 'Annual Report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 524288,
  assetType: 'document' as const,
}

function buildDoc(attrs: typeof FIXTURE_ATTRS) {
  return {
    type: 'doc',
    content: [
      {
        type: 'downloadableAsset',
        attrs,
      },
    ],
  }
}

describe('DownloadableAssetExtension — renderHTML marker', () => {
  it('emits a marker div carrying every attribute as data-* on the wrapper', () => {
    const html = generateHTML(buildDoc(FIXTURE_ATTRS), editorExtensions)

    expect(html).toContain('data-downloadable-asset="true"')
    expect(html).toContain('data-media-item-id="media-uuid-123"')
    expect(html).toContain('data-url="https://example.com/files/report.pdf"')
    expect(html).toContain('data-name="Annual Report.pdf"')
    expect(html).toContain('data-mime-type="application/pdf"')
    expect(html).toContain('data-size-bytes="524288"')
    expect(html).toContain('data-asset-type="document"')
  })

  it('omits data-size-bytes when sizeBytes is null', () => {
    const html = generateHTML(buildDoc({ ...FIXTURE_ATTRS, sizeBytes: null }), editorExtensions)
    // Should not contain an empty `data-size-bytes=""` attribute.
    expect(html).not.toMatch(/data-size-bytes/)
    // But still emits the marker + other attrs.
    expect(html).toContain('data-downloadable-asset="true"')
    expect(html).toContain('data-name="Annual Report.pdf"')
  })
})

describe('DownloadableAssetExtension — parseHTML round-trip', () => {
  it('recovers all attrs from a marker div', () => {
    const inputHtml =
      '<div data-downloadable-asset="true" data-media-item-id="media-uuid-456" ' +
      'data-url="https://example.com/x.mp3" data-name="Track 1.mp3" ' +
      'data-mime-type="audio/mpeg" data-size-bytes="1048576" ' +
      'data-asset-type="audio"></div>'

    const json = generateJSON(inputHtml, editorExtensions)
    const node = (json.content as Array<{ type: string; attrs: Record<string, unknown> }>)[0]

    expect(node.type).toBe('downloadableAsset')
    expect(node.attrs).toMatchObject({
      mediaItemId: 'media-uuid-456',
      url: 'https://example.com/x.mp3',
      name: 'Track 1.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 1048576,
      assetType: 'audio',
    })
  })

  it('falls back to assetType="document" when data-asset-type is missing or invalid', () => {
    const inputHtml =
      '<div data-downloadable-asset="true" data-media-item-id="x" ' +
      'data-url="https://example.com/x" data-name="x" data-mime-type="application/octet-stream"></div>'

    const json = generateJSON(inputHtml, editorExtensions)
    const node = (json.content as Array<{ type: string; attrs: Record<string, unknown> }>)[0]

    expect(node.attrs.assetType).toBe('document')
  })

  it('treats missing data-size-bytes as null', () => {
    const inputHtml =
      '<div data-downloadable-asset="true" data-media-item-id="x" ' +
      'data-url="https://example.com/x" data-name="x" data-mime-type="application/pdf" ' +
      'data-asset-type="document"></div>'

    const json = generateJSON(inputHtml, editorExtensions)
    const node = (json.content as Array<{ type: string; attrs: Record<string, unknown> }>)[0]

    expect(node.attrs.sizeBytes).toBeNull()
  })
})

describe('generateHtmlFromContent — public html_body post-processing', () => {
  it('swaps the marker for the full inline-styled card', () => {
    const html = generateHtmlFromContent(buildDoc(FIXTURE_ATTRS))

    // Inline-style hallmarks of `renderDownloadableAssetHtml` output:
    expect(html).toContain('style="')
    expect(html).toContain('background-color:#ffffff')
    expect(html).toContain('background-color:#f97316') // download button orange
    expect(html).toContain('Pobierz') // download button label (Polish)
    expect(html).toContain('Annual Report.pdf') // filename
    expect(html).toContain('PDF') // derived type label
    expect(html).toContain('aria-label="Pobierz plik Annual Report.pdf"')
    // The hover/focus polish style block is appended by the renderer:
    expect(html).toContain('[data-downloadable-asset-button]:hover')
  })

  it('does NOT contain Tailwind class names (security regression check)', () => {
    const html = generateHtmlFromContent(buildDoc(FIXTURE_ATTRS))

    // None of these CMS-editor-only classes should leak into the public HTML.
    expect(html).not.toMatch(/class="[^"]*not-prose/)
    expect(html).not.toMatch(/class="[^"]*bg-card/)
    expect(html).not.toMatch(/class="[^"]*text-foreground/)
    expect(html).not.toMatch(/class="[^"]*text-muted-foreground/)
    expect(html).not.toMatch(/class="[^"]*bg-primary/)
    // The post-processed card uses inline styles only — no `class=` attribute
    // whatsoever should appear inside the swapped fragment.
    const cardSection = html.match(/<div[^>]*data-downloadable-asset-card[\s\S]*?<\/style>/)
    expect(cardSection).not.toBeNull()
    expect(cardSection?.[0]).not.toContain('class=')
  })

  it('escapes user-controlled name + url to prevent attribute injection', () => {
    const html = generateHtmlFromContent(
      buildDoc({
        ...FIXTURE_ATTRS,
        name: 'evil"<script>alert(1)</script>.pdf',
        url: 'https://example.com/evil"path',
      }),
    )

    // Quotes must be escaped inside attribute values.
    expect(html).not.toContain('"<script>')
    expect(html).toContain('&quot;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('renders correctly when sizeBytes is null (omits size, keeps type chip)', () => {
    const html = generateHtmlFromContent(buildDoc({ ...FIXTURE_ATTRS, sizeBytes: null }))

    expect(html).toContain('Annual Report.pdf')
    expect(html).toContain('PDF')
    // No "KB" or "MB" should appear in the size chip area.
    expect(html).not.toMatch(/\d+(\.\d+)?\s*(KB|MB)/)
  })
})

describe('renderDownloadableAssetHtml — URL scheme allowlist (XSS guard)', () => {
  it.each([
    ['javascript:alert(1)'],
    ['JavaScript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
    ['about:blank'],
    [''],
    ['not-a-url-at-all'],
  ])('returns null for unsafe URL: %s', (url) => {
    expect(renderDownloadableAssetHtml({ ...FIXTURE_ATTRS, url })).toBeNull()
  })

  it.each([
    ['http://example.com/file.pdf'],
    ['https://example.com/file.pdf'],
    ['https://cdn.example.com/path/to/Annual%20Report.pdf'],
  ])('renders normally for safe URL: %s', (url) => {
    const html = renderDownloadableAssetHtml({ ...FIXTURE_ATTRS, url })
    expect(html).not.toBeNull()
    expect(html).toContain(`href="${url}"`)
  })

  it('isSafeUrl returns false for non-http(s) schemes', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('data:text/html,xxx')).toBe(false)
    expect(isSafeUrl('https://example.com')).toBe(true)
    expect(isSafeUrl('http://example.com')).toBe(true)
  })
})

describe('generateHtmlFromContent — unsafe URL marker stays intact', () => {
  it('leaves the marker intact (no <a href="javascript:...">) for javascript: URL', () => {
    const html = generateHtmlFromContent(
      buildDoc({ ...FIXTURE_ATTRS, url: 'javascript:alert(document.cookie)' }),
    )

    // The dangerous href must NOT appear in any form (raw or escaped via the
    // post-processor, which short-circuits before emitting the card).
    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).not.toContain('Pobierz') // no card rendered
    // The marker div is preserved verbatim — invisible in the public site
    // because there's no `<style>` block emitted for an inert marker.
    expect(html).toContain('data-downloadable-asset="true"')
  })

  it('leaves the marker intact for data: URL', () => {
    const html = generateHtmlFromContent(
      buildDoc({ ...FIXTURE_ATTRS, url: 'data:text/html,<script>alert(1)</script>' }),
    )
    expect(html).not.toMatch(/href="data:/i)
    expect(html).not.toContain('Pobierz')
  })
})

describe('DownloadableAssetExtension — atomic node behavior', () => {
  it('two consecutive nodes serialize as two independent markers', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'downloadableAsset', attrs: FIXTURE_ATTRS },
        {
          type: 'downloadableAsset',
          attrs: { ...FIXTURE_ATTRS, mediaItemId: 'media-uuid-second', name: 'Second.pdf' },
        },
      ],
    }
    const html = generateHTML(doc, editorExtensions)

    const matches = html.match(/data-downloadable-asset="true"/g)
    expect(matches?.length).toBe(2)
    expect(html).toContain('data-media-item-id="media-uuid-123"')
    expect(html).toContain('data-media-item-id="media-uuid-second"')
  })
})
