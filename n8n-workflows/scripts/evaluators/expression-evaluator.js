// =============================================================
// Canonical expression-evaluator bundle for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for the 5-function expression toolkit used by
// the condition and switch handlers:
//
//   coerceNumeric, escapeRegex, parseExpression, resolveField, compare
//
// Mirrors apps/cms/features/workflows/engine/condition-evaluator.ts.
// Changes to this logic must be mirrored in the CMS TypeScript source.
//
// Inlined into Code nodes via:
//
//   npm run n8n:build -- regenerate-helpers
//
// Code nodes opt in by including the inline markers:
//
//   // @inline expression-evaluator
//   <helper body — replaced by build tool>
//   // @end-inline expression-evaluator
//
// Note: depends on `getNestedValue` being available in scope (use
// the get-nested-value helper alongside this one).
//
// `compare` is the multi-line variant from the Condition Handler —
// preserved as canonical because of better readability. The Switch
// Handler's older single-line version was equivalent (whitespace-only
// drift) and is normalized by regenerate-helpers.
// =============================================================

const OPERATORS = ['>=', '<=', '!=', '==', '>', '<', 'contains', 'in'];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseExpression(expression) {
  const trimmed = expression.trim();
  for (const op of OPERATORS) {
    const pattern = (op === 'contains' || op === 'in')
      ? new RegExp(`^(.+?)\\s+${op}\\s+(.+)$`)
      : new RegExp(`^(.+?)\\s*${escapeRegex(op)}\\s*(.+)$`);
    const match = trimmed.match(pattern);
    if (match) {
      return { field: match[1].trim(), operator: op, value: match[2].trim() };
    }
  }
  return null;
}

function resolveField(field, context) {
  const cleanField = field.replace(/^\{\{|\}\}$/g, '').trim();
  return getNestedValue(context, cleanField);
}

function coerceNumeric(value) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

function compare(fieldValue, operator, rawValue) {
  switch (operator) {
    case '==':
      return String(fieldValue) === rawValue;
    case '!=':
      return String(fieldValue) !== rawValue;
    case '>': case '<': case '>=': case '<=': {
      const left = typeof fieldValue === 'number' ? fieldValue : Number(fieldValue);
      const right = coerceNumeric(rawValue);
      if (typeof right !== 'number' || Number.isNaN(left)) return false;
      if (operator === '>') return left > right;
      if (operator === '<') return left < right;
      if (operator === '>=') return left >= right;
      if (operator === '<=') return left <= right;
      return false;
    }
    case 'contains':
      return String(fieldValue).includes(rawValue);
    case 'in': {
      const list = rawValue.split(',').map(v => v.trim());
      return list.includes(String(fieldValue));
    }
  }
  return false;
}
