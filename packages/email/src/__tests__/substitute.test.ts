import { describe, it, expect } from 'vitest'
import { escapeHtml, substituteTokens, safeUrlValue } from '../substitute'

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
]

describe('substituteTokens (golden parity fixture)', () => {
  it.each(SUBSTITUTE_CASES)('$name', ({ html, values, expected }) => {
    expect(substituteTokens(html, values)).toBe(expected)
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
  { name: 'relative path passes', input: '/bonuses/1', expected: '/bonuses/1' },
  { name: 'anchor passes', input: '#section', expected: '#section' },
  { name: 'empty is neutralized', input: '   ', expected: '#' },
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

describe('safeUrlValue (scheme allow-list for href/src context)', () => {
  it.each(SAFE_URL_CASES)('$name', ({ input, expected }) => {
    expect(safeUrlValue(input)).toBe(expected)
  })
})
