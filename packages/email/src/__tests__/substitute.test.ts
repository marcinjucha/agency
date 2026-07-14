import { describe, it, expect } from 'vitest'
import { escapeHtml, substituteTokens, substitutePlain, safeUrlValue, sanitizeHtmlUrls } from '../substitute'
import SUBSTITUTE_CASES from './substitute-cases.json'

// ---------------------------------------------------------------------------
// GOLDEN PARITY FIXTURE — single source of truth.
//
// This input->output table is the parity contract for {{token}} substitution.
// It lives in `./substitute-cases.json` and is READ BY BOTH this vitest AND the
// n8n parity script (`n8n-workflows/scripts/escape-parity.test.mjs`) so the two
// escape implementations cannot drift on the fixture. Edit the JSON, not a copy.
// ---------------------------------------------------------------------------

describe('substituteTokens (golden parity fixture)', () => {
  it.each(SUBSTITUTE_CASES)('$name', ({ html, values, expected }) => {
    expect(substituteTokens(html, values)).toBe(expected)
  })
})

describe('substitutePlain (plaintext primitive — subject context, NO escaping)', () => {
  it('resolves tokens WITHOUT HTML-escaping (a subject is not an HTML context)', () => {
    // substituteTokens would double-encode these; substitutePlain must not.
    expect(substitutePlain(`{{brand}}`, { brand: `Ala's & "Co"` })).toBe(`Ala's & "Co"`)
  })

  it('shares the token grammar with substituteTokens (leave-literal + trim + dotted key)', () => {
    expect(substitutePlain('Hi {{ name }}', { name: 'Ada' })).toBe('Hi Ada')
    expect(substitutePlain('Hello {{missing}}!', {})).toBe('Hello {{missing}}!')
    expect(substitutePlain('x {{a.b}} y', { 'a.b': 'Z' })).toBe('x Z y')
  })

  it('is single-pass — a resolved value containing {{x}} is NOT re-substituted', () => {
    expect(substitutePlain('{{outer}}', { outer: '{{x}}', x: 'LEAKED' })).toBe('{{x}}')
  })
})

describe('escapeHtml (promoted, byte-identical to the 3 removed copies)', () => {
  it('applies all 5 replacements in order & < > " \'', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
  })

  it('escapes ampersand FIRST so later entities are not double-escaped', () => {
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

interface UrlCase {
  name: string
  input: string
  expected: string
}

const SAFE_URL_CASES: UrlCase[] = [
  { name: 'https passes', input: 'https://ok', expected: 'https://ok' },
  { name: 'http passes', input: 'http://ok', expected: 'http://ok' },
  { name: 'mailto passes', input: 'mailto:a@b', expected: 'mailto:a@b' },
  // Relative / anchor / scheme-relative (no scheme) → passthrough.
  { name: 'relative path passes', input: '/rel', expected: '/rel' },
  { name: 'anchor passes', input: '#id', expected: '#id' },
  { name: 'scheme-relative passes', input: '//host/x', expected: '//host/x' },
  { name: 'empty is neutralized', input: '   ', expected: '#' },
  // Script / local-file schemes → '#'.
  { name: 'javascript: is neutralized', input: 'javascript:alert(1)', expected: '#' },
  { name: 'embedded TAB in javascript scheme is neutralized (control-char strip)', input: 'java\tscript:alert(1)', expected: '#' },
  { name: 'embedded LF in javascript scheme is neutralized', input: 'java\nscript:alert(1)', expected: '#' },
  { name: 'embedded CR in javascript scheme is neutralized', input: 'java\rscript:alert(1)', expected: '#' },
  { name: 'leading control char before javascript is neutralized', input: '\x01javascript:alert(1)', expected: '#' },
  { name: 'vbscript: is neutralized', input: 'vbscript:x', expected: '#' },
  { name: 'file: is neutralized', input: 'file:///x', expected: '#' },
  // ALLOW-LIST posture (reversed from the old deny-list): non-http schemes —
  // including app-launch intents / deep-links — are now ALL neutralized.
  { name: 'tel: is neutralized (allow-list)', input: 'tel:+48123', expected: '#' },
  { name: 'sms: is neutralized (allow-list)', input: 'sms:+48', expected: '#' },
  { name: 'intent:// is neutralized (allow-list)', input: 'intent://scan', expected: '#' },
  { name: 'android-app:// is neutralized (allow-list)', input: 'android-app://x', expected: '#' },
  // data: — inline base64 image passes; every other data: media type → '#'.
  { name: 'data:image/ inline image passes', input: 'data:image/png;base64,AAA', expected: 'data:image/png;base64,AAA' },
  { name: 'data:text/html is neutralized', input: 'data:text/html,x', expected: '#' },
  // Percent-encoded scheme is NOT a real scheme (no literal colon after a bare
  // scheme token) — returned verbatim/safe, browser never decodes it to run JS.
  { name: 'percent-encoded javascript is returned verbatim (safe)', input: '%6aavascript:alert(1)', expected: '%6aavascript:alert(1)' },
]

describe('safeUrlValue (scheme allow-list for href/src context)', () => {
  it.each(SAFE_URL_CASES)('$name', ({ input, expected }) => {
    expect(safeUrlValue(input)).toBe(expected)
  })
})

describe('sanitizeHtmlUrls (href/src attribute scanner over final HTML)', () => {
  it('neutralizes a javascript: href (double-quoted) to #', () => {
    expect(sanitizeHtmlUrls('<a href="javascript:alert(1)">x</a>')).toBe('<a href="#">x</a>')
  })

  it('leaves a safe https href unchanged', () => {
    expect(sanitizeHtmlUrls('<a href="https://ok">x</a>')).toBe('<a href="https://ok">x</a>')
  })

  it('leaves a data:image/ src (inline base64 image) unchanged (F2)', () => {
    expect(sanitizeHtmlUrls('<img src="data:image/png;base64,AAA">')).toBe(
      '<img src="data:image/png;base64,AAA">',
    )
  })

  it('neutralizes an intent:// href to # (allow-list) (F1)', () => {
    expect(sanitizeHtmlUrls('<a href="intent://x">y</a>')).toBe('<a href="#">y</a>')
  })

  it('does NOT touch data-href (attribute-name anchoring) (F3)', () => {
    expect(sanitizeHtmlUrls('<div data-href="javascript:x">y</div>')).toBe(
      '<div data-href="javascript:x">y</div>',
    )
  })

  it('does NOT touch xlink:href substring (attribute-name anchoring) (F3)', () => {
    expect(sanitizeHtmlUrls('<use xlink:href="javascript:x" />')).toBe(
      '<use xlink:href="javascript:x" />',
    )
  })

  it('neutralizes an UNQUOTED javascript: href to # (F4)', () => {
    expect(sanitizeHtmlUrls('<a href=javascript:alert(1)>y</a>')).toBe('<a href=#>y</a>')
  })

  it('neutralizes a single-quoted javascript: href to #', () => {
    expect(sanitizeHtmlUrls("<a href='javascript:x'>y</a>")).toBe("<a href='#'>y</a>")
  })

  it('leaves a "javascript:" occurrence in visible text (not an attribute) alone', () => {
    expect(sanitizeHtmlUrls('<p>type javascript: to run</p>')).toBe('<p>type javascript: to run</p>')
  })

  it('sanitizes multiple attributes in one string independently', () => {
    expect(
      sanitizeHtmlUrls('<a href="javascript:x">a</a> <a href="https://ok">b</a>'),
    ).toBe('<a href="#">a</a> <a href="https://ok">b</a>')
  })
})
