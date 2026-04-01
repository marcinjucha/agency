import type { VariableContext } from './types'
import { getNestedValue } from './utils'

/**
 * Supported comparison operators for condition expressions.
 *
 * Order matters: multi-char operators (>=, <=, !=, ==) must be checked
 * before single-char (>, <) to avoid partial matches.
 */
const OPERATORS = ['>=', '<=', '!=', '==', '>', '<', 'contains', 'in'] as const
type Operator = (typeof OPERATORS)[number]

type ParsedExpression = {
  field: string
  operator: Operator
  value: string
}

/**
 * Parses an expression string into field, operator, and value.
 *
 * Expression format: "field operator value"
 * Examples:
 *   "overallScore >= 10"
 *   "recommendation == QUALIFIED"
 *   "tags contains automation"
 *   "status in new,qualified"
 *
 * Returns null if expression cannot be parsed.
 */
function parseExpression(expression: string): ParsedExpression | null {
  const trimmed = expression.trim()

  for (const op of OPERATORS) {
    // For word operators (contains, in), require whitespace boundaries
    const pattern =
      op === 'contains' || op === 'in'
        ? new RegExp(`^(.+?)\\s+${op}\\s+(.+)$`)
        : new RegExp(`^(.+?)\\s*${escapeRegex(op)}\\s*(.+)$`)

    const match = trimmed.match(pattern)
    if (match) {
      return {
        field: match[1].trim(),
        operator: op,
        value: match[2].trim(),
      }
    }
  }

  return null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Resolves a field name to its value from the variable context. */
function resolveField(field: string, context: VariableContext): unknown {
  // Strip {{ }} wrapping so both {{lead_score}} and lead_score work in expressions
  const cleanField = field.replace(/^\{\{|\}\}$/g, '').trim()
  return getNestedValue(context, cleanField)
}

/**
 * Coerces a string value to a number if possible.
 * Returns the original string if coercion fails.
 */
function coerceNumeric(value: string): number | string {
  const num = Number(value)
  return Number.isNaN(num) ? value : num
}

/**
 * Evaluates a condition expression against a variable context.
 *
 * Returns 'true' or 'false' as strings — matching condition_branch values
 * on workflow_edges.
 *
 * NO eval() — parses expression string manually.
 *
 * If the expression cannot be parsed or the field is missing from context,
 * returns 'false' (fail-closed).
 */
export function evaluateCondition(
  expression: string,
  context: VariableContext
): 'true' | 'false' {
  const parsed = parseExpression(expression)
  if (!parsed) {
    console.warn(`[condition-evaluator] Cannot parse expression: "${expression}"`)
    return 'false'
  }

  const fieldValue = resolveField(parsed.field, context)
  if (fieldValue === undefined) {
    console.warn(
      `[condition-evaluator] Field "${parsed.field}" not found in context`
    )
    return 'false'
  }

  const result = compare(fieldValue, parsed.operator, parsed.value)
  return result ? 'true' : 'false'
}

/**
 * Compares two numeric values with the given operator.
 * Returns false if either value is not a valid number.
 */
function compareNumeric(
  left: number,
  right: number | string,
  operator: '>' | '<' | '>=' | '<='
): boolean {
  if (typeof right !== 'number' || Number.isNaN(left)) {
    return false
  }

  switch (operator) {
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
  }
}

/**
 * Performs the actual comparison between a resolved field value and the
 * expression's right-hand value.
 */
function compare(
  fieldValue: unknown,
  operator: Operator,
  rawValue: string
): boolean {
  switch (operator) {
    case '==':
      return String(fieldValue) === rawValue

    case '!=':
      return String(fieldValue) !== rawValue

    case '>':
    case '<':
    case '>=':
    case '<=': {
      const left = typeof fieldValue === 'number' ? fieldValue : Number(fieldValue)
      const right = coerceNumeric(rawValue)
      return compareNumeric(left, right, operator)
    }

    case 'contains':
      return String(fieldValue).includes(rawValue)

    case 'in': {
      const list = rawValue.split(',').map((v) => v.trim())
      return list.includes(String(fieldValue))
    }
  }

  return false
}
