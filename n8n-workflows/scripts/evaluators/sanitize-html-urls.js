// =============================================================
// Canonical sanitizeHtmlUrls helper for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for scheme-guarding href/src ATTRIBUTE values in the
// FINAL, fully-substituted email HTML body (Send Email Handler's
// "Resolve and Build Payload" node, applied AFTER substituteBindingsHtml).
// Inlined into Code nodes via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Code nodes opt in by including the inline markers:
//
//   // @inline sanitize-html-urls
//   <helper body — replaced by build tool>
//   // @end-inline sanitize-html-urls
//
// IMPORTANT: edit the helper here, never inline copies — they will
// be regenerated and your edits to the JSON will be overwritten.
// =============================================================
// DUPLICATE BY NECESSITY: byte-parallel copy of `safeUrlValue` +
// `sanitizeHtmlUrls` in packages/email/src/substitute.ts. The n8n
// Code-node sandbox cannot import the TS package, so parity is
// enforced by scripts/escape-parity.test.mjs (asserts the deployed
// n8n copy against the same fixture as the TS vitest).
// =============================================================
// Behavior (DENY-list, regex-only, no URL constructor):
//   - href/src attribute values (double- AND single-quoted) whose
//     scheme is javascript:/data:/vbscript:/file: (case-insensitive,
//     after stripping \x00-\x20 control chars) → neutralized to '#'.
//   - every other scheme + relative/anchor/scheme-relative → passes.
//   - a "javascript:" occurrence in visible TEXT (not an attribute) is
//     left untouched — it is inert text, not a live link.
// =============================================================

function safeUrlValue(value) {
  const trimmed = String(value).trim();
  const cleaned = trimmed.replace(/[\x00-\x20]/g, '');
  if (cleaned === '') return '#';
  const schemeMatch = cleaned.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!schemeMatch) return trimmed;
  const scheme = schemeMatch[1].toLowerCase() + ':';
  const DANGEROUS = ['javascript:', 'data:', 'vbscript:', 'file:'];
  return DANGEROUS.indexOf(scheme) !== -1 ? '#' : trimmed;
}

function sanitizeHtmlUrls(html) {
  return String(html)
    .replace(/(href|src)\s*=\s*"([^"]*)"/gi, (_m, attr, val) => `${attr}="${safeUrlValue(val)}"`)
    .replace(/(href|src)\s*=\s*'([^']*)'/gi, (_m, attr, val) => `${attr}='${safeUrlValue(val)}'`);
}
