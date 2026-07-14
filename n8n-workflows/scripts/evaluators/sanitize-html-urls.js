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
// Behavior (ALLOW-list, regex-only, no URL constructor):
//   - href/src attribute values (double-quoted, single-quoted, AND
//     unquoted) whose scheme is NOT http:/https:/mailto: (case-
//     insensitive, after stripping \x00-\x20 control chars) →
//     neutralized to '#'. `data:image/…` is additionally allowed
//     (inline base64 images, matches the CMS image validator).
//   - relative/anchor/scheme-relative (no scheme) → passes.
//   - EVERY other scheme (javascript:/vbscript:/file:/data: non-image/
//     tel:/sms:/intent:/android-app:/custom deep-links) → '#'.
//   - the attribute name is anchored with (^|\s) so href/src match only
//     as a WHOLE attribute name — data-href / xlink:href / data-src are
//     NOT touched.
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
  const SAFE = ['http:', 'https:', 'mailto:'];
  if (SAFE.indexOf(scheme) !== -1) return trimmed;
  if (cleaned.toLowerCase().indexOf('data:image/') === 0) return trimmed;
  return '#';
}

function sanitizeHtmlUrls(html) {
  return String(html)
    .replace(/(^|\s)(href|src)\s*=\s*"([^"]*)"/gi, (_m, pre, attr, val) => `${pre}${attr}="${safeUrlValue(val)}"`)
    .replace(/(^|\s)(href|src)\s*=\s*'([^']*)'/gi, (_m, pre, attr, val) => `${pre}${attr}='${safeUrlValue(val)}'`)
    .replace(/(^|\s)(href|src)\s*=\s*([^\s"'>]+)/gi, (_m, pre, attr, val) => `${pre}${attr}=${safeUrlValue(val)}`);
}
