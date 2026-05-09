// =============================================================
// Canonical resolveVariables helper for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for {{variable}} substitution used by Process
// Step's Prepare Current Step and Send Email Handler's Resolve and
// Build Payload. Inlined into Code nodes via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Code nodes opt in by including the inline markers:
//
//   // @inline resolve-variables
//   <helper body — replaced by build tool>
//   // @end-inline resolve-variables
//
// Note: depends on `getNestedValue` being available in scope (use
// the get-nested-value helper alongside this one).
//
// `resolveDeep` (recursive deep-walk used by Process Step) is NOT
// part of this helper — it remains an unmarked local function in
// Workflow Process Step.json's "Prepare Current Step" node. WHY:
// resolveDeep depends on resolveVariables AND is only used by one
// node, so pulling it into the canonical helper would force every
// caller (including Send Email) to inline dead weight. Keeping it
// inline-local in Process Step is the smaller blast radius.
// =============================================================
// Behavior:
//   - resolveVariables: substitutes `{{key}}` / `{{a.b.c}}` placeholders
//     in a string against a context object. Unresolved placeholders
//     are left in place (preserves original `{{var}}` literal so the
//     caller can detect mis-bindings).
// =============================================================

function resolveVariables(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    const value = getNestedValue(context, key);
    return (value !== undefined && value !== null) ? String(value) : `{{${key}}}`;
  });
}
