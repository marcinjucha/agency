/**
 * Whether an `email_templates.blocks` value is USABLE as a bonus-email template.
 * `blocks` is JSONB → a non-array or empty-array blob is treated as UNUSABLE (the
 * template must fall through to the next tier / builder, never render broken copy).
 *
 * Single source of truth for the "blocks-usability degrade" rule shared by the
 * send path (`ingest.server.ts` `coerceBonusTemplateRow`) and the read-only
 * effective-send card resolver (`admin-handlers.server.ts`) so the card can never
 * name a template the send would actually skip.
 *
 * Pure + client-safe (no imports).
 */
export function isUsableTemplateBlocks(blocks: unknown): boolean {
  return Array.isArray(blocks) && blocks.length > 0
}
