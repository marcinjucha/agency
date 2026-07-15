import type { Block } from '@agency/email'
import { VENTURE_BONUS_MARKER_KEY } from '@/lib/app-sent-variables'
import { extractTemplateVariableKeys } from './extract-variable-keys'
import type { TemplateVariable } from '../types'

// ---------------------------------------------------------------------------
// resolveTemplateVariableFields — the ONE decision for "which user-fillable
// variable fields does this template have?" (Iter 3b).
//
// Precedence (DECLARED-FIRST):
//   1. If the template has declared `template_variables` (user-curated in the
//      email editor), those are the source of truth — they carry the edited
//      label/description. Extraction is NOT consulted (a declared set is a
//      deliberate curation; a body token the user chose not to declare is not a
//      field).
//   2. Otherwise fall back to scanning the subject + blocks for {{key}} tokens
//      (fields with just `key` — no human label available).
//
// In BOTH paths the structural `{{bonus_list}}` marker is excluded: it is
// replaced by a programmatically-built block at send time, never a scalar the
// user types (see lib/app-sent-variables.ts). Result is deduped by key with
// first-seen order preserved.
//
// Pure — no hooks, no JSX, no data access. TDD:
// features/email/__tests__/resolve-template-variables.test.ts
// ---------------------------------------------------------------------------

/** A single user-fillable template variable field (rendered as one labelled input). */
export interface TemplateVariableField {
  key: string
  label?: string
  description?: string
}

interface ResolveTemplateVariableFieldsInput {
  /** The template's curated variables (email editor). Non-empty → the source of truth. */
  templateVariables: TemplateVariable[] | null | undefined
  subject: string
  blocks: Block[]
}

export function resolveTemplateVariableFields({
  templateVariables,
  subject,
  blocks,
}: ResolveTemplateVariableFieldsInput): TemplateVariableField[] {
  const fields =
    templateVariables && templateVariables.length > 0
      ? templateVariables.map(fromDeclared)
      : extractTemplateVariableKeys(subject, blocks).map(fromKey)

  return dedupeByKey(fields).filter((f) => f.key !== VENTURE_BONUS_MARKER_KEY)
}

function fromDeclared(variable: TemplateVariable): TemplateVariableField {
  return { key: variable.key, label: variable.label, description: variable.description }
}

function fromKey(key: string): TemplateVariableField {
  return { key }
}

function dedupeByKey(fields: TemplateVariableField[]): TemplateVariableField[] {
  const seen = new Set<string>()
  return fields.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)))
}
