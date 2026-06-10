/**
 * Source-level INP guard for editor images.
 *
 * The base `Image` extension is configured with `loading="lazy"` +
 * `decoding="async"` so that every `<img>` produced at the SOURCE — once, via
 * Tiptap `generateHTML` into `html_body` — carries the browser hints that keep
 * Interaction-to-Next-Paint low. Because blog, legal pages, and shop products
 * all build their extension list on top of `baseExtensions`, configuring the
 * base `Image` covers ALL content surfaces from one place.
 *
 * Env note: the CMS vitest config runs under the global `jsdom` environment,
 * which provides the DOM `@tiptap/html` needs for SSR-style `generateHTML`.
 * No per-file environment override is required (this mirrors the existing
 * DownloadableAssetExtension test, which also calls `generateHtmlFromContent`
 * under the same global env).
 */

import { describe, it, expect } from 'vitest'
import { generateHtmlFromContent } from '../utils'
import { baseExtensions } from '../extensions'
import { editorExtensions } from '../../blog/extensions'

const imageDoc = {
  type: 'doc',
  content: [{ type: 'image', attrs: { src: 'https://example.com/x.png' } }],
} as const

const linkDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'external',
          marks: [{ type: 'link', attrs: { href: 'https://example.com/page' } }],
        },
      ],
    },
  ],
} as const

describe('base Image extension — loading hints in generated html_body', () => {
  it('emits loading="lazy" and decoding="async" on generated <img> (base extensions)', () => {
    const html = generateHtmlFromContent(imageDoc, baseExtensions)

    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/x.png"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
  })

  it('inherits the hints through blog editorExtensions (built on baseExtensions)', () => {
    // Blog/legal/shop all spread baseExtensions, so the base Image config is
    // inherited. Asserting through the blog list proves the coverage claim.
    const html = generateHtmlFromContent(imageDoc, editorExtensions)

    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
  })

  it('defaults to baseExtensions when no extensions are passed', () => {
    const html = generateHtmlFromContent(imageDoc)

    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
  })
})

describe('base Link extension — rel/target hardening in generated html_body', () => {
  it('emits rel="noopener noreferrer" and target="_blank" on generated <a> (base extensions)', () => {
    const html = generateHtmlFromContent(linkDoc, baseExtensions)

    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com/page"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })

  it('inherits link hardening through blog editorExtensions (built on baseExtensions)', () => {
    const html = generateHtmlFromContent(linkDoc, editorExtensions)

    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })
})
