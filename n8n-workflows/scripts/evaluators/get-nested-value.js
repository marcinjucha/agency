// =============================================================
// Canonical getNestedValue helper for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for safe nested-path access used by condition,
// switch, send-email, and process-step nodes. Inlined into Code
// nodes via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Code nodes opt in by including the inline markers:
//
//   // @inline get-nested-value
//   <helper body — replaced by build tool>
//   // @end-inline get-nested-value
//
// IMPORTANT: edit the helper here, never inline copies — they will
// be regenerated and your edits to the JSON will be overwritten.
// =============================================================
// Behavior:
//   - Splits dotted path ("a.b.c") and walks the object
//   - Returns undefined for any non-object encountered along the path
//   - Returns undefined for null/undefined intermediate values
// =============================================================

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}
