// =============================================================
// Evaluate Switch — N-way branch router
// =============================================================
// CANONICAL SOURCE: apps/cms/features/workflows/engine/condition-evaluator.ts
// Changes to this logic must be mirrored in the CMS TypeScript source.
// =============================================================
// Iterates branches in order. First-match-wins.
// Branch with expression 'default' always matches (used as catch-all, always last).
// Returns outputPayload: { branch: matchedBranchId }
// Computes skippedStepIds: steps only reachable via non-matched branches.
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

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
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
    case '==': return String(fieldValue) === rawValue;
    case '!=': return String(fieldValue) !== rawValue;
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
    case 'contains': return String(fieldValue).includes(rawValue);
    case 'in': {
      const list = rawValue.split(',').map(v => v.trim());
      return list.includes(String(fieldValue));
    }
  }
  return false;
}

function evaluateExpression(expression, context) {
  const parsed = parseExpression(expression);
  if (!parsed) return false;
  let fieldValue = resolveField(parsed.field, context);
  if (fieldValue === undefined) {
    fieldValue = coerceNumeric(parsed.field);
    if (typeof fieldValue === 'string' && fieldValue === parsed.field) {
      fieldValue = parsed.field;
    }
  }
  return compare(fieldValue, parsed.operator, parsed.value);
}

// ---- Main ----

try {
  const item = $input.first().json;
  const { resolvedConfig, variableContext, currentStep: step, edges } = item;

  const branches = (resolvedConfig.branches || []);

  // First-match-wins: iterate branches in order
  let matchedId = null;
  for (const branch of branches) {
    const expr = (branch.expression || '').trim();
    if (expr === 'default') {
      matchedId = branch.id;
      break;
    }
    if (evaluateExpression(expr, variableContext)) {
      matchedId = branch.id;
      break;
    }
  }

  if (!matchedId) {
    // No default branch and no expression matched — fail safely
    return {
      json: {
        ...item,
        stepResult: {
          success: false,
          error: 'Switch: no matching branch and no default branch defined',
        },
      }
    };
  }

  // Skip-propagation: same algorithm as condition handler
  // Non-matched branches → their targets are skip candidates
  const switchEdges = edges.filter(e => e.source_step_id === step.id);
  const nonTakenEdges = switchEdges.filter(
    e => e.condition_branch && e.condition_branch !== matchedId
  );
  const skipTargetIds = new Set();

  for (const edge of nonTakenEdges) {
    const targetId = edge.target_step_id;
    const allIncoming = edges.filter(e => e.target_step_id === targetId);
    const hasAlternatePath = allIncoming.some(e =>
      e.source_step_id !== step.id ||
      e.condition_branch === matchedId ||
      e.condition_branch === null
    );
    if (!hasAlternatePath) {
      skipTargetIds.add(targetId);
    }
  }

  // Recursively propagate skips downstream
  const allSkipped = new Set(skipTargetIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (allSkipped.has(edge.source_step_id) && !allSkipped.has(edge.target_step_id)) {
        const incomingEdges = edges.filter(e => e.target_step_id === edge.target_step_id);
        const allIncomingSkipped = incomingEdges.every(e => allSkipped.has(e.source_step_id));
        if (allIncomingSkipped) {
          allSkipped.add(edge.target_step_id);
          changed = true;
        }
      }
    }
  }

  return {
    json: {
      ...item,
      stepResult: {
        success: true,
        outputPayload: { branch: matchedId },
      },
      skippedStepIds: Array.from(allSkipped),
    }
  };

} catch (err) {
  const item = $input.first().json;
  return {
    json: {
      ...item,
      stepResult: { success: false, error: err.message },
    }
  };
}
