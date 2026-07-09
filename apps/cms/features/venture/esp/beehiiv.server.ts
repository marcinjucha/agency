import type {
  EspProvider,
  TagInput,
  UpsertContactInput,
  UpsertContactResult,
} from './types'
import { espJson } from './http.server'

// beehiiv API v2 (https://developers.beehiiv.com/api-reference).
// Key is a SINGLE GLOBAL key (not per-tenant) → read lazily from plain server
// env (server-only, never VITE_). Auth is Bearer per beehiiv docs.
//
// VERIFIED against beehiiv docs (2026-07-05):
//   - Create subscription: POST /v2/publications/{publicationId}/subscriptions,
//     body accepts `email` (only required), `reactivate_existing` (bool) and
//     `custom_fields` (ARRAY of { name, value }); response id is at `data.id`.
//   - All subscription-scoped endpoints require the publication id in the path
//     (`^pub_...`), so tagging is publication-scoped too.
// [do potwierdzenia] The exact subscription-tags endpoint shape below
//   (POST .../subscriptions/{id}/tags with { tags: [...] }) could NOT be loaded
//   from the docs page (404 at fetch time). Implemented per the documented
//   publication-scoped, subscription-nested pattern; confirm the method/path/body
//   against a live key before iter 6/7 E2E. Mocked in tests until then.
const BEEHIIV_API_BASE = 'https://api.beehiiv.com/v2'

function getApiKey(): string {
  const key = process.env.BEEHIIV_API_KEY
  if (!key) throw new Error('Missing BEEHIIV_API_KEY environment variable')
  return key
}

function beehiivHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

// beehiiv custom_fields is an array of { name, value } (NOT a plain map).
// `name` (if given) has no native beehiiv field, so it rides along as a custom
// field alongside the caller's `fields`. Custom fields must already exist on the
// publication or beehiiv discards them.
function toCustomFields(
  input: UpsertContactInput
): Array<{ name: string; value: string }> {
  const nameField = input.name ? [{ name: 'name', value: input.name }] : []
  const extraFields = Object.entries(input.fields ?? {}).map(
    ([name, value]) => ({ name, value })
  )
  return [...nameField, ...extraFields]
}

export const beehiivProvider: EspProvider = {
  id: 'beehiiv',
  name: 'beehiiv',

  async upsertContact(
    input: UpsertContactInput
  ): Promise<UpsertContactResult> {
    const customFields = toCustomFields(input)
    const body: Record<string, unknown> = {
      email: input.email,
      // Idempotent by construction: re-posting the same email reactivates the
      // existing subscription instead of erroring or duplicating.
      reactivate_existing: true,
    }
    if (customFields.length > 0) body.custom_fields = customFields

    const data = await espJson<{ data: { id: string } }>(
      `${BEEHIIV_API_BASE}/publications/${encodeURIComponent(input.audienceRef)}/subscriptions`,
      {
        method: 'POST',
        headers: beehiivHeaders(),
        body: JSON.stringify(body),
      }
    )

    return { contactId: String(data.data.id) }
  },

  async tag({ audienceRef, contactId, tag }: TagInput): Promise<void> {
    await espJson(
      `${BEEHIIV_API_BASE}/publications/${encodeURIComponent(audienceRef)}/subscriptions/${encodeURIComponent(contactId)}/tags`,
      {
        method: 'POST',
        headers: beehiivHeaders(),
        body: JSON.stringify({ tags: [tag] }),
      }
    )
  },
}
