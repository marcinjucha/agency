/** Regex to detect a Markdown-fenced JSON block (e.g. ```json\n{...}\n```) */
const FENCED_JSON_RE = /^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/

export type ResolvedValue =
  | { kind: 'object'; data: Record<string, unknown> }
  | { kind: 'text'; text: string }

/**
 * Resolve a workflow output payload value for display:
 * - Plain objects → kind: 'object'
 * - Strings with fenced JSON → parse inner JSON; on success kind: 'object', on failure kind: 'text' (stripped)
 * - All other scalars → kind: 'text'
 */
export function resolveOutputValue(value: unknown): ResolvedValue {
  if (typeof value === 'object' && value !== null) {
    return { kind: 'object', data: value as Record<string, unknown> }
  }

  if (typeof value === 'string') {
    const match = value.match(FENCED_JSON_RE)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (typeof parsed === 'object' && parsed !== null) {
          return { kind: 'object', data: parsed as Record<string, unknown> }
        }
        return { kind: 'text', text: String(parsed) }
      } catch {
        // Strip fences but show the inner text as plain
        return { kind: 'text', text: match[1] }
      }
    }
    return { kind: 'text', text: value }
  }

  return { kind: 'text', text: String(value) }
}
