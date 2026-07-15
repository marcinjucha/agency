import type { TemplateVariable } from '../types'

/**
 * Parses raw JSONB template_variables from DB into typed TemplateVariable[].
 * Returns empty array for null / malformed data.
 *
 * `source` zwężamy do unii `'trigger' | 'manual' | undefined` — w DB mogą być
 * inne stringi (legacy / błędne wpisy), traktujemy je jak brak `source`.
 *
 * Pure — no hooks, no data access. Lives in utils/ (not server.ts) so both the
 * email editor (client) and server-side readers (e.g. the venture campaign
 * template-variable handler) can import it WITHOUT dragging the server module
 * (createServerFn + React Email render) into their bundle. Re-exported from
 * `../server` for the existing `EmailTemplateEditor` import site.
 */
export function parseTemplateVariables(raw: unknown): TemplateVariable[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object' && typeof item.key === 'string')
    .map((item) => ({
      key: item.key as string,
      label: typeof item.label === 'string' ? item.label : (item.key as string),
      description: typeof item.description === 'string' ? item.description : undefined,
      source:
        item.source === 'manual'
          ? ('manual' as const)
          : item.source === 'trigger'
            ? ('trigger' as const)
            : undefined,
    }))
}
