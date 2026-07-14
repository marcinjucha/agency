import { describe, it, expect } from 'vitest'
import { escapeHtml, substituteTokens, substitutePlain, safeUrlValue, sanitizeHtmlUrls } from '../substitute'

// ---------------------------------------------------------------------------
// GOLDEN PARITY FIXTURE.
//
// This input->output table is the parity contract for {{token}} substitution.
// The n8n back-port (next iteration) MUST assert its `resolveVariables` against
// the SAME table (with escaping applied) so app-sent == n8n-sent. Keep the
// table exported-shape (a plain array of cases) so it can be lifted wholesale.
// ---------------------------------------------------------------------------

interface SubCase {
  name: string
  html: string
  values: Record<string, string>
  expected: string
}

const SUBSTITUTE_CASES: SubCase[] = [
  {
    name: 'missing key is left LITERAL (leave-literal parity with n8n)',
    html: 'Hello {{missing}}!',
    values: {},
    expected: 'Hello {{missing}}!',
  },
  {
    name: 'padded key has whitespace trimmed and resolves',
    html: 'Hi {{ name }}',
    values: { name: 'Ada' },
    expected: 'Hi Ada',
  },
  {
    name: 'escape order via "<a&b>" -> &lt;a&amp;b&gt;',
    html: '{{v}}',
    values: { v: '<a&b>' },
    expected: '&lt;a&amp;b&gt;',
  },
  {
    name: 'value containing {{x}} is NOT re-substituted (single-pass proof)',
    html: '{{outer}}',
    // Even though `x` has a value, the literal `{{x}}` produced by resolving
    // `outer` must survive verbatim (after escaping) — no second pass.
    values: { outer: 'literal {{x}} here', x: 'LEAKED' },
    expected: 'literal {{x}} here',
  },
  {
    name: 'both double-quote and single-quote are escaped',
    html: '{{q}}',
    values: { q: `"quote" 'apos'` },
    expected: '&quot;quote&quot; &#39;apos&#39;',
  },
  {
    name: 'multiple tokens in one string, mixed present/missing',
    html: '{{a}}-{{b}}-{{a}}',
    values: { a: 'X' },
    expected: 'X-{{b}}-X',
  },
  {
    // Dotted key: the `[\w.]` grammar MUST match `{{a.b}}` and resolve it from a
    // flat record keyed 'a.b'. Guards the TS↔n8n divergence — before the n8n
    // substituteBindingsHtml regex was aligned to `[\w.]`, n8n left `{{a.b}}`
    // literal while TS substituted it. Keep in sync with escape-parity.test.mjs.
    name: 'dotted key matches the dot grammar and resolves (TS↔n8n parity)',
    html: 'x {{a.b}} y',
    values: { 'a.b': 'Z' },
    expected: 'x Z y',
  },
]

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
  { name: 'https passes', input: 'https://x', expected: 'https://x' },
  { name: 'http passes', input: 'http://x', expected: 'http://x' },
  { name: 'mailto passes', input: 'mailto:a@b.com', expected: 'mailto:a@b.com' },
  { name: 'javascript: is neutralized', input: 'javascript:alert(1)', expected: '#' },
  { name: 'data: is neutralized', input: 'data:text/html,<script>', expected: '#' },
  { name: 'vbscript: is neutralized', input: 'vbscript:msgbox(1)', expected: '#' },
  { name: 'file: is neutralized', input: 'file:///etc/passwd', expected: '#' },
  { name: 'relative path passes', input: '/bonuses/1', expected: '/bonuses/1' },
  { name: 'anchor passes', input: '#section', expected: '#section' },
  { name: 'empty is neutralized', input: '   ', expected: '#' },
  // Denylist posture (was allow-list): benign non-http schemes are ADMIN-authored
  // deep-links and MUST pass unchanged — the old allow-list silently killed them.
  { name: 'tel: passes (denylist, not allow-list)', input: 'tel:+48123456789', expected: 'tel:+48123456789' },
  { name: 'ftp: passes', input: 'ftp://host/file', expected: 'ftp://host/file' },
  { name: 's3:// passes', input: 's3://bucket/x', expected: 's3://bucket/x' },
  { name: 'custom deep-link scheme passes', input: 'myapp://open/x', expected: 'myapp://open/x' },
  // Browser-strips-first bypass class: control chars the URL parser removes
  // BEFORE resolving the scheme. `.trim()` alone misses interior chars, so the
  // scheme test must run on a CLEANED copy (see safeUrlValue). All must
  // neutralize to '#'.
  { name: 'embedded TAB in javascript scheme is neutralized', input: 'java\tscript:alert(1)', expected: '#' },
  { name: 'embedded LF in javascript scheme is neutralized', input: 'java\nscript:alert(1)', expected: '#' },
  { name: 'embedded CR in javascript scheme is neutralized', input: 'java\rscript:alert(1)', expected: '#' },
  { name: 'leading NUL control char before javascript is neutralized', input: '\x00javascript:alert(1)', expected: '#' },
  { name: 'leading SOH control char before javascript is neutralized', input: '\x01javascript:alert(1)', expected: '#' },
  { name: 'leading space before javascript is neutralized', input: ' javascript:alert(1)', expected: '#' },
  { name: 'multiple leading spaces before javascript are neutralized', input: '  javascript:alert(1)', expected: '#' },
  // Percent-encoded scheme is NOT a real scheme (no literal colon after a bare
  // scheme token) — returned verbatim/safe, browser never decodes it to run JS.
  { name: 'percent-encoded javascript is returned verbatim (safe)', input: '%6aavascript:alert(1)', expected: '%6aavascript:alert(1)' },
]

describe('safeUrlValue (scheme deny-list for href/src context)', () => {
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

  it('neutralizes a data: src (single-quoted) to #', () => {
    expect(sanitizeHtmlUrls(`<img src='data:text/html,<script>' />`)).toBe(`<img src='#' />`)
  })

  it('leaves a "javascript:" occurrence in visible text (not an attribute) alone', () => {
    expect(sanitizeHtmlUrls('<p>type javascript: to run</p>')).toBe('<p>type javascript: to run</p>')
  })

  it('passes a benign non-http href (tel:) through unchanged', () => {
    expect(sanitizeHtmlUrls('<a href="tel:+48123">call</a>')).toBe('<a href="tel:+48123">call</a>')
  })

  it('sanitizes multiple attributes in one string independently', () => {
    expect(
      sanitizeHtmlUrls('<a href="javascript:x">a</a><a href="https://ok">b</a>'),
    ).toBe('<a href="#">a</a><a href="https://ok">b</a>')
  })
})
