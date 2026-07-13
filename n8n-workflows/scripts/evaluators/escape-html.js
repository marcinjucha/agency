// =============================================================
// Canonical escapeHtml helper for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for HTML-entity escaping applied when substituting
// resolved binding VALUES into an email HTML body (Send Email Handler's
// "Resolve and Build Payload" node). Inlined into Code nodes via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Code nodes opt in by including the inline markers:
//
//   // @inline escape-html
//   <helper body — replaced by build tool>
//   // @end-inline escape-html
//
// IMPORTANT: edit the helper here, never inline copies — they will
// be regenerated and your edits to the JSON will be overwritten.
// =============================================================
// DUPLICATE BY NECESSITY: this is a byte-parallel copy of the package
// `escapeHtml` in packages/email/src/substitute.ts (5 replacements,
// order `& < > " '`). The n8n Code-node sandbox cannot import the TS
// package, so parity is enforced by the golden test
// scripts/escape-parity.test.mjs (asserts against the SAME golden
// fixture as packages/email/src/__tests__/substitute.test.ts).
// =============================================================
// Behavior:
//   - HTML-entity escape for HTML-body context ONLY (never subjects —
//     subjects are plaintext; escaping them double-encodes).
//   - Order matters: `&` MUST be first so the ampersands introduced by
//     the later replacements are not themselves re-escaped.
// =============================================================

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
