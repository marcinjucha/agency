// ESP (Email Service Provider) abstraction — venture bonus-funnel feature.
//
// Provider-abstraction pattern mirrors features/shop-marketplace/adapters/.
// Error convention: methods return the raw success shape and THROW EspApiError
// (from ./http.server) on provider failure — matching the marketplace adapters'
// non-result-wrapped methods (exchangeCode / getCategories / refreshToken).
// Errors surface via throw so the iter-3 ingest caller can catch and record
// esp_synced=false. No neverthrow here (adapters don't use it; result-helpers
// is for server fns only).

// Single source of truth for provider ids (as const → derived union, NOT a
// hand-maintained string union). Adding a provider = one entry here + one
// *.server.ts + one registry registration.
export const ESP_PROVIDER_IDS = {
  beehiiv: 'beehiiv',
} as const

export type EspProviderId =
  (typeof ESP_PROVIDER_IDS)[keyof typeof ESP_PROVIDER_IDS]

export type UpsertContactInput = {
  // so_campaigns.esp_audience_ref — beehiiv publication_id. beehiiv has no
  // "groups" like MailerLite: the audience IS the publication, so every
  // subscription-scoped call is namespaced by the publication id.
  audienceRef: string
  email: string
  name?: string
  fields?: Record<string, string>
}

export type UpsertContactResult = {
  contactId: string
}

export type TagInput = {
  // Required because beehiiv tag operations are publication-scoped (see below).
  audienceRef: string
  contactId: string
  tag: string
}

export interface EspProvider {
  id: EspProviderId
  name: string

  /**
   * Subscribe/update a contact in the campaign's audience (beehiiv: a
   * subscription to a publication). Idempotent by construction — beehiiv's
   * `reactivate_existing` re-subscribes an existing contact rather than erroring
   * or duplicating. The subscription itself is the delivery trigger where the
   * ESP supports it. Throws EspApiError on non-2xx.
   */
  upsertContact(input: UpsertContactInput): Promise<UpsertContactResult>

  /**
   * Add a tag to an existing contact — 'launch-notify' when consent_launch=true.
   * The consent gating is the ingest caller's job (iter 3), NOT this provider's.
   * Throws EspApiError on non-2xx.
   *
   * DEVIATION from spec §5 sketch (`tag(contactId, tag)`): beehiiv tag operations
   * are publication-scoped — the endpoint path requires the publication id
   * (`/publications/{audienceRef}/subscriptions/{contactId}/tags`). A bare
   * `(contactId, tag)` signature cannot address the endpoint, and stashing the
   * last publication id on the provider would make it stateful/non-concurrent-safe.
   * So `tag` carries `audienceRef` explicitly. Spec §5 is a sketch; correctness wins.
   */
  tag(input: TagInput): Promise<void>
}
