/**
 * Naming for duplicated entities — "<base> (kopia)" for human labels,
 * "<base>_kopia" / "<base>-kopia" for slugs.
 *
 * Extracted from `features/themes/server.ts` when the email-template and venture
 * campaign duplicate flows became the 2nd and 3rd callers (earned abstraction —
 * three usages, one loop).
 *
 * The candidate is made unique PROACTIVELY so the INSERT never trips a unique
 * index on the common re-duplicate case. Matching is case-insensitive, which
 * mirrors the DB index for `so_themes.name` and `so_campaigns.slug`. It does NOT
 * mirror an index for `email_templates.label` or `so_campaigns.display_name` —
 * those carry no uniqueness constraint at all, so numbering there is purely
 * cosmetic and may skip numbers. Do not read this as "keeps the index happy".
 */

/** Builds one candidate. `n === null` = the first, unnumbered candidate. */
type CopyFormat = (base: string, n: number | null) => string

/**
 * Trim the BASE so the WHOLE candidate (base + suffix + counter) fits the limit.
 * Trimming the base to `maxLength` and then appending the suffix would overflow —
 * that is the bug this exists to prevent.
 */
function fitToLength(
  base: string,
  n: number | null,
  format: CopyFormat,
  maxLength: number | undefined,
): string {
  const full = format(base, n)
  if (maxLength === undefined || full.length <= maxLength) return full

  const overflow = full.length - maxLength
  const trimmed = base.slice(0, Math.max(1, base.length - overflow)).replace(/[\s\-_]+$/, '')
  // A suffix longer than the whole budget cannot be fitted — return the best
  // effort rather than looping forever. Unreachable with the real limits (50/100).
  return format(trimmed || base.slice(0, 1), n)
}

function uniqueCopy(
  base: string,
  existing: string[],
  format: CopyFormat,
  maxLength: number | undefined,
): string {
  const taken = new Set(existing.map((value) => value.toLowerCase()))
  const first = fitToLength(base, null, format, maxLength)
  if (!taken.has(first.toLowerCase())) return first
  for (let n = 2; ; n += 1) {
    const candidate = fitToLength(base, n, format, maxLength)
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

const nameFormat: CopyFormat = (base, n) => (n === null ? `${base} (kopia)` : `${base} (kopia ${n})`)

/**
 * Build `"<base> (kopia)"`, then `"(kopia 2)"`, `"(kopia 3)"`… until it doesn't
 * collide with an existing name (case-insensitive).
 *
 * `maxLength` clamps the FULL result — pass it wherever the column has a zod
 * `.max()`, or the copy can land in a state its own editor refuses to save.
 * Pure — unit-tested.
 */
export function uniqueCopyName(base: string, existing: string[], maxLength?: number): string {
  return uniqueCopy(base, existing, nameFormat, maxLength)
}

/**
 * Slug flavour of {@link uniqueCopyName}: `"<base><sep>kopia"`, then
 * `"<base><sep>kopia<sep>2"`… Separator is the one the target column's slug
 * grammar allows (`_` for `email_templates.type`, `-` for `so_campaigns.slug`).
 * Pure — unit-tested.
 */
export function uniqueCopySlug(
  base: string,
  existing: string[],
  opts: { sep: '-' | '_'; maxLength?: number },
): string {
  const format: CopyFormat = (value, n) =>
    n === null ? `${value}${opts.sep}kopia` : `${value}${opts.sep}kopia${opts.sep}${n}`
  return uniqueCopy(base, existing, format, opts.maxLength)
}
