#!/usr/bin/env node
// =============================================================
// Golden parity test — n8n HTML escape ↔ package substituteTokens.
// =============================================================
// Pins TS↔n8n parity so the two escape implementations cannot drift.
//
// WHY a standalone node script (not vitest): n8n-workflows has no test
// runner / package.json. The escape logic ships as JS-as-string inside a
// Code node, so this test extracts the ACTUAL deployed functions
// (escapeHtml + substituteBindingsHtml) from
//   workflows/Workflows/Step - Send Email Handler.json
// and asserts them against the SAME golden fixture used by
//   packages/email/src/__tests__/substitute.test.ts
// (SUBSTITUTE_CASES). Because that vitest asserts substituteTokens ==
// expected and this script asserts n8n == expected against the same
// table, n8n == substituteTokens transitively on every pinned case.
//
// Run:  node n8n-workflows/scripts/escape-parity.test.mjs
// Exits non-zero on any mismatch (CI / pre-commit guard).
// =============================================================

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDLER_FILE = resolve(
  __dirname,
  '../workflows/Workflows/Step - Send Email Handler.json',
);

// ---------------------------------------------------------------------------
// GOLDEN FIXTURE — copied verbatim from
// packages/email/src/__tests__/substitute.test.ts (SUBSTITUTE_CASES).
// `values` == n8n `resolvedBindings` (both flat Record<string,string>).
// Keep this table in sync with the TS fixture — it IS the parity contract.
// ---------------------------------------------------------------------------
const GOLDEN_CASES = [
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
    // Dotted key: guards that n8n's substituteBindingsHtml regex accepts the dot
    // grammar (`[\w.]`) exactly like the TS substituteTokens primitive. Before
    // alignment, n8n's `[\w]` regex left `{{a.b}}` literal while TS resolved it.
    // Keep in sync with packages/email/src/__tests__/substitute.test.ts.
    name: 'dotted key matches the dot grammar and resolves (TS↔n8n parity)',
    html: 'x {{a.b}} y',
    values: { 'a.b': 'Z' },
    expected: 'x Z y',
  },
];

// ---------------------------------------------------------------------------
// Extract the ACTUAL deployed escapeHtml + substituteBindingsHtml from the
// handler JSON, so this test pins the real inlined code (not a re-copy).
// ---------------------------------------------------------------------------
function extractDeployedFns() {
  const wf = JSON.parse(readFileSync(HANDLER_FILE, 'utf8'));
  const node = (wf.nodes ?? []).find((n) => n.name === 'Resolve and Build Payload');
  if (!node) throw new Error('Resolve and Build Payload node not found');
  const js = node.parameters?.jsCode;
  if (typeof js !== 'string') throw new Error('jsCode missing on node');

  // escapeHtml — the @inline escape-html block body.
  const escapeMatch = js.match(
    /\/\/ @inline escape-html\s*\n([\s\S]*?)\n\s*\/\/ @end-inline escape-html/,
  );
  if (!escapeMatch) throw new Error('escape-html inline block not found in node');

  // sanitizeHtmlUrls (+ safeUrlValue) — the @inline sanitize-html-urls block body.
  const sanitizeMatch = js.match(
    /\/\/ @inline sanitize-html-urls\s*\n([\s\S]*?)\n\s*\/\/ @end-inline sanitize-html-urls/,
  );
  if (!sanitizeMatch) throw new Error('sanitize-html-urls inline block not found in node');

  // substituteBindingsHtml — the full function declaration.
  const subMatch = js.match(
    /function substituteBindingsHtml\(template, bindings\) \{[\s\S]*?\n {2}\}/,
  );
  if (!subMatch) throw new Error('substituteBindingsHtml function not found in node');

  // eval the declarations into this scope and return the callables.
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    `${escapeMatch[1]}\n${sanitizeMatch[1]}\n${subMatch[0]}\nreturn { substituteBindingsHtml, sanitizeHtmlUrls };`,
  );
  return factory();
}

// ---------------------------------------------------------------------------
// URL-sanitization parity fixture — the deployed n8n `sanitizeHtmlUrls` and the
// TS `sanitizeHtmlUrls` (packages/email/src/substitute.ts) MUST agree: a
// javascript:/data: href → '#', an https:// href unchanged. Guards the [2]
// finding (n8n-side href/src scheme guard) against drift from the TS copy.
// ---------------------------------------------------------------------------
const URL_SANITIZE_CASES = [
  {
    name: 'javascript: href neutralized to #',
    html: '<a href="javascript:alert(1)">x</a>',
    expected: '<a href="#">x</a>',
  },
  {
    name: 'data: src (single-quoted) neutralized to #',
    html: `<img src='data:text/html,x' />`,
    expected: `<img src='#' />`,
  },
  {
    name: 'https:// href unchanged',
    html: '<a href="https://ok">x</a>',
    expected: '<a href="https://ok">x</a>',
  },
];

// ---------------------------------------------------------------------------
function run() {
  const { substituteBindingsHtml, sanitizeHtmlUrls } = extractDeployedFns();
  const failures = [];
  for (const c of GOLDEN_CASES) {
    const actual = substituteBindingsHtml(c.html, c.values);
    if (actual !== c.expected) {
      failures.push({ name: `escape: ${c.name}`, expected: c.expected, actual });
    }
  }
  for (const c of URL_SANITIZE_CASES) {
    const actual = sanitizeHtmlUrls(c.html);
    if (actual !== c.expected) {
      failures.push({ name: `url: ${c.name}`, expected: c.expected, actual });
    }
  }

  const total = GOLDEN_CASES.length + URL_SANITIZE_CASES.length;
  if (failures.length > 0) {
    console.error(`❌  n8n↔package parity BROKEN — ${failures.length}/${total} case(s) failed:\n`);
    for (const f of failures) {
      console.error(`  case: ${f.name}`);
      console.error(`    expected: ${JSON.stringify(f.expected)}`);
      console.error(`    actual:   ${JSON.stringify(f.actual)}\n`);
    }
    process.exit(1);
  }

  console.log(`✅  n8n↔package parity OK — ${total}/${total} cases match (${GOLDEN_CASES.length} escape + ${URL_SANITIZE_CASES.length} url-sanitize).`);
  process.exit(0);
}

run();
