import { err, ok, Result, ResultAsync } from 'neverthrow'
import {
  requireAuthContextFull,
  type AuthContextFull,
} from '@/lib/server-auth.server'
import { hasPermission, type PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import type { AdminCampaign, AdminClient, Bonus } from './types'
import type {
  CreateBonusInput,
  CreateCampaignInput,
  CreateClientInput,
  ReorderBonusesInput,
  UpdateBonusInput,
  UpdateCampaignInput,
  UpdateClientInput,
} from './validation'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — ADMIN CRUD handlers (iter 5a). AUTHENTICATED layer.
//
// Enforcement pattern (mirrors features/docforge-licenses/handlers.server.ts +
// features/shop-categories/server.ts):
//   requireAuthContextFull() → hasPermission(bonus_funnel.*) → tenant-scope.
//
// Uses the RLS/cookie-scoped client from the auth context (auth.supabase) — NEVER
// the anon client (that is the public read layer in server.ts) and NEVER the
// service-role client (would bypass tenant isolation).
//
// Hierarchy: tenants → so_clients(tenant_id) → so_campaigns(client_id) →
// so_bonuses(campaign_id). Only so_clients has a tenant_id column; campaigns and
// bonuses are scoped via the FK chain. Every nested write VERIFIES the parent
// belongs to the caller's tenant BEFORE inserting — the FK id from input is
// never trusted on its own (prevents cross-tenant writes via a forged parent id).
//
// Pure handlers (no createServerFn wrapper) so they are unit-testable without
// driving the RPC pipeline — same split as docforge-licenses.
// ---------------------------------------------------------------------------

const PERM = {
  clients: 'bonus_funnel.clients',
  campaigns: 'bonus_funnel.campaigns',
  bonuses: 'bonus_funnel.bonuses',
} as const satisfies Record<string, PermissionKey>

type MutationResult<T> = { success: boolean; data?: T; error?: string }
type VoidResult = { success: boolean; error?: string }

// Raw Supabase/Postgres error shape (has `code` at runtime — `message` at type level).
type DbErrorShape = { message?: string; code?: string } | null

/**
 * Translate a raw Supabase/Postgres error into a generic, client-safe, localized
 * message. The RAW error (constraint/schema names, RLS policy text like
 * "new row violates row-level security policy …") is logged for developers via
 * console.error and NEVER returned to the client. 23505 (unique_violation) →
 * friendly slug message. Mirrors features/email/server.ts (23505 handling).
 */
function mapDbError(error: DbErrorShape, context: string): string {
  // Developer-facing, English — full raw error preserved for debugging.
  console.error(`[venture] ${context} failed:`, error)
  if (error?.code === '23505') return messages.venture.slugTaken
  return messages.venture.operationFailed
}

// Reject handler for ResultAsync.fromPromise (thrown/network errors — Supabase
// resolves with `{ error }` rather than throwing, so this is the rare path).
// Never surfaces the raw thrown message to the client.
const dbError = (e: unknown): string => {
  console.error('[venture] unexpected DB error:', e)
  return messages.venture.operationFailed
}

/**
 * Local, error-mapping variant of `fromSupabase` — routes the raw DB error
 * through mapDbError instead of leaking `res.error.message` to the client.
 * (The shared @/lib/result-helpers versions propagate the raw string.)
 */
const fromSupabaseSafe =
  <T>(context: string) =>
  (response: unknown): Result<T, string> => {
    const res = response as { data: T | null; error: DbErrorShape }
    if (res.error) return err(mapDbError(res.error, context))
    if (!res.data) return err(messages.venture.operationFailed)
    return ok(res.data)
  }

/** Local, error-mapping variant of `fromSupabaseVoid` (delete/void mutations). */
const fromSupabaseVoidSafe =
  (context: string) =>
  (response: unknown): Result<undefined, string> => {
    const res = response as { error: DbErrorShape }
    if (res.error) return err(mapDbError(res.error, context))
    return ok(undefined)
  }

// so_* insert/update types resolve to `never` in this Supabase JS version
// (same incompatibility documented in shop-categories). Route table access
// through an untyped accessor; reads stay correct at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (auth: AuthContextFull, name: string) => (auth.supabase as any).from(name)

/** Gate a handler on a bonus_funnel.* permission, then run the body. */
function gated<T>(
  permission: PermissionKey,
  body: (auth: AuthContextFull) => ResultAsync<T, string>,
): ResultAsync<T, string> {
  return requireAuthContextFull().andThen((auth) =>
    hasPermission(permission, auth.permissions)
      ? body(auth)
      : err<T, string>(messages.common.noPermission),
  )
}

const toMutation = <T>(r: ResultAsync<T, string>): Promise<MutationResult<T>> =>
  r.match(
    (data) => ({ success: true as const, data }),
    (error) => ({ success: false as const, error }),
  )

const toVoid = (r: ResultAsync<unknown, string>): Promise<VoidResult> =>
  r.match(
    () => ({ success: true as const }),
    (error) => ({ success: false as const, error }),
  )

// ---------------------------------------------------------------------------
// Parent-ownership verification (FK chain → so_clients.tenant_id)
// ---------------------------------------------------------------------------

/** Resolve a client that belongs to the tenant, or a forbidden error. */
function assertClientOwned(
  auth: AuthContextFull,
  clientId: string,
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string } | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'assertClientOwned'))
    // Missing OR belongs to another tenant → indistinguishable, both forbidden.
    if (!r.data) return err(messages.common.noPermission)
    return ok(undefined)
  })
}

/** Verify a campaign belongs to the tenant by walking campaign → client. */
function assertCampaignOwned(
  auth: AuthContextFull,
  campaignId: string,
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_campaigns').select('client_id').eq('id', campaignId).maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: { client_id: string } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'assertCampaignOwned'))
    if (!r.data) return err(messages.common.noPermission)
    return assertClientOwned(auth, r.data.client_id)
  })
}

/** Verify a bonus belongs to the tenant by walking bonus → campaign → client. */
function assertBonusOwned(
  auth: AuthContextFull,
  bonusId: string,
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_bonuses').select('campaign_id').eq('id', bonusId).maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: { campaign_id: string } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'assertBonusOwned'))
    if (!r.data) return err(messages.common.noPermission)
    return assertCampaignOwned(auth, r.data.campaign_id)
  })
}

// ===========================================================================
// Clients
// ===========================================================================

// Explicit column projection for ALL admin client reads/writes. Deliberately
// EXCLUDES the plaintext `resend_api_key`/`gmail_app_password`: SELECT on those
// columns is revoked from the `authenticated` role at the DB layer (same
// REVOKE+GRANT hardening as so_campaigns.tally_webhook_secret — see
// ADMIN_CAMPAIGN_COLUMNS above), so a bare `select('*')` here would hit
// "permission denied for column". Existence is exposed via the generated
// columns `has_resend_api_key` / `has_gmail_app_password`, which the
// authenticated role CAN read. Bare `.select()` after insert/update defaults
// to '*' → also uses this list. The mail-sender resolution path (MailSender /
// resolveMailSender, features/venture/mail/) reads the real secrets via a
// separate select on the service-role or auth-context client.
const ADMIN_CLIENT_COLUMNS =
  'id, tenant_id, name, slug, mail_provider, resend_from_email, gmail_address, created_at, updated_at, has_resend_api_key, has_gmail_app_password'

export function listClientsHandler(): Promise<MutationResult<AdminClient[]>> {
  return toMutation(
    gated(PERM.clients, (auth) =>
      ResultAsync.fromPromise(
        tbl(auth, 'so_clients')
          .select(ADMIN_CLIENT_COLUMNS)
          .eq('tenant_id', auth.tenantId)
          .order('name', { ascending: true }),
        dbError,
      ).andThen((res) => {
        const r = res as { data: AdminClient[] | null; error: DbErrorShape }
        if (r.error) return err(mapDbError(r.error, 'listClients'))
        return ok(r.data ?? [])
      }),
    ),
  )
}

export function createClientHandler(
  input: CreateClientInput,
): Promise<MutationResult<AdminClient>> {
  return toMutation(
    gated(PERM.clients, (auth) =>
      ResultAsync.fromPromise(
        tbl(auth, 'so_clients')
          .insert({
            name: input.name,
            slug: input.slug,
            tenant_id: auth.tenantId,
            mail_provider: input.mail_provider ?? 'resend_shared',
            resend_api_key: input.resend_api_key ?? null,
            resend_from_email: input.resend_from_email ?? null,
            gmail_address: input.gmail_address ?? null,
            gmail_app_password: input.gmail_app_password ?? null,
          })
          .select(ADMIN_CLIENT_COLUMNS)
          .single(),
        dbError,
      ).andThen(fromSupabaseSafe<AdminClient>('createClient')),
    ),
  )
}

export function updateClientHandler(
  id: string,
  input: UpdateClientInput,
): Promise<MutationResult<AdminClient>> {
  return toMutation(
    gated(PERM.clients, (auth) =>
      ResultAsync.fromPromise(
        tbl(auth, 'so_clients')
          .update(buildClientPatch(input))
          // Double scope: id AND tenant_id — a foreign id updates zero rows.
          .eq('id', id)
          .eq('tenant_id', auth.tenantId)
          .select(ADMIN_CLIENT_COLUMNS)
          .single(),
        dbError,
      ).andThen(fromSupabaseSafe<AdminClient>('updateClient')),
    ),
  )
}

export function deleteClientHandler(id: string): Promise<VoidResult> {
  return toVoid(
    gated(PERM.clients, (auth) =>
      ResultAsync.fromPromise(
        tbl(auth, 'so_clients').delete().eq('id', id).eq('tenant_id', auth.tenantId),
        dbError,
      ).andThen(fromSupabaseVoidSafe('deleteClient')),
    ),
  )
}

// ===========================================================================
// Campaigns
// ===========================================================================

// Explicit column projection for ALL admin campaign reads/writes. Deliberately
// EXCLUDES the plaintext `tally_webhook_secret`: SELECT on that column is revoked
// from the `authenticated` role at the DB layer, so the authenticated (cookie)
// client used here would get "permission denied for column tally_webhook_secret"
// on a `select('*')` — the strip must happen at the SELECT, not in JS. Existence
// is exposed via the generated column `has_webhook_secret` (tally_webhook_secret
// IS NOT NULL), which the authenticated role CAN read. Bare `.select()` after
// insert/update defaults to '*' → also uses this list. The route/webhook verify
// path (ingest.server.ts) reads the real secret via a separate select.
const ADMIN_CAMPAIGN_COLUMNS =
  'id, client_id, slug, display_name, brand, esp_provider, esp_audience_ref, esp_tag_launch, published, created_at, updated_at, has_webhook_secret'

export function listCampaignsHandler(
  clientId?: string,
): Promise<MutationResult<AdminCampaign[]>> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      // Resolve the tenant's client ids first, then scope campaigns to them.
      // This keeps tenant isolation at the app layer (campaigns have no
      // tenant_id column) without relying on a nested embedded filter.
      tenantClientIds(auth).andThen((ids) => {
        const scoped = clientId
          ? ids.includes(clientId)
            ? [clientId]
            : []
          : ids
        if (scoped.length === 0) return ok<AdminCampaign[], string>([])
        return ResultAsync.fromPromise(
          tbl(auth, 'so_campaigns')
            .select(ADMIN_CAMPAIGN_COLUMNS)
            .in('client_id', scoped)
            .order('created_at', { ascending: false }),
          dbError,
        ).andThen((res) => {
          const r = res as { data: AdminCampaign[] | null; error: DbErrorShape }
          if (r.error) return err(mapDbError(r.error, 'listCampaigns'))
          return ok(r.data ?? [])
        })
      }),
    ),
  )
}

export function createCampaignHandler(
  input: CreateCampaignInput,
): Promise<MutationResult<AdminCampaign>> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      // Verify the parent client belongs to the tenant BEFORE inserting.
      assertClientOwned(auth, input.client_id).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_campaigns')
            .insert(buildCampaignInsert(input))
            .select(ADMIN_CAMPAIGN_COLUMNS)
            .single(),
          dbError,
        ).andThen(fromSupabaseSafe<AdminCampaign>('createCampaign')),
      ),
    ),
  )
}

export function updateCampaignHandler(
  id: string,
  input: UpdateCampaignInput,
): Promise<MutationResult<AdminCampaign>> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      assertCampaignOwned(auth, id).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_campaigns')
            .update(buildCampaignPatch(input))
            .eq('id', id)
            .select(ADMIN_CAMPAIGN_COLUMNS)
            .single(),
          dbError,
        ).andThen(fromSupabaseSafe<AdminCampaign>('updateCampaign')),
      ),
    ),
  )
}

export function deleteCampaignHandler(id: string): Promise<VoidResult> {
  return toVoid(
    gated(PERM.campaigns, (auth) =>
      assertCampaignOwned(auth, id).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_campaigns').delete().eq('id', id),
          dbError,
        ).andThen(fromSupabaseVoidSafe('deleteCampaign')),
      ),
    ),
  )
}

// ===========================================================================
// Bonuses
// ===========================================================================

export function listBonusesHandler(
  campaignId: string,
): Promise<MutationResult<Bonus[]>> {
  return toMutation(
    gated(PERM.bonuses, (auth) =>
      assertCampaignOwned(auth, campaignId).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_bonuses')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('sort_order', { ascending: true }),
          dbError,
        ).andThen((res) => {
          const r = res as { data: Bonus[] | null; error: DbErrorShape }
          if (r.error) return err(mapDbError(r.error, 'listBonuses'))
          return ok(r.data ?? [])
        }),
      ),
    ),
  )
}

export function createBonusHandler(
  input: CreateBonusInput,
): Promise<MutationResult<Bonus>> {
  return toMutation(
    gated(PERM.bonuses, (auth) =>
      // Verify the parent campaign (→ client → tenant) BEFORE inserting.
      assertCampaignOwned(auth, input.campaign_id).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_bonuses').insert(buildBonusInsert(input)).select().single(),
          dbError,
        ).andThen(fromSupabaseSafe<Bonus>('createBonus')),
      ),
    ),
  )
}

export function updateBonusHandler(
  id: string,
  input: UpdateBonusInput,
): Promise<MutationResult<Bonus>> {
  return toMutation(
    gated(PERM.bonuses, (auth) =>
      assertBonusOwned(auth, id).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_bonuses')
            .update(buildBonusPatch(input))
            .eq('id', id)
            .select()
            .single(),
          dbError,
        ).andThen(fromSupabaseSafe<Bonus>('updateBonus')),
      ),
    ),
  )
}

export function deleteBonusHandler(id: string): Promise<VoidResult> {
  return toVoid(
    gated(PERM.bonuses, (auth) =>
      assertBonusOwned(auth, id).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_bonuses').delete().eq('id', id),
          dbError,
        ).andThen(fromSupabaseVoidSafe('deleteBonus')),
      ),
    ),
  )
}

export function reorderBonusesHandler(
  input: ReorderBonusesInput,
): Promise<VoidResult> {
  return toVoid(
    gated(PERM.bonuses, (auth) =>
      // 1. Parent campaign must belong to the tenant.
      assertCampaignOwned(auth, input.campaign_id)
        // 2. Every item id must be a bonus of THAT campaign (no smuggling a
        //    foreign bonus id into the set).
        .andThen(() => assertBonusesInCampaign(auth, input))
        // 3. Apply the new sort_order per item, still scoped to the campaign.
        .andThen(() => applyReorder(auth, input)),
    ),
  )
}

// ---------------------------------------------------------------------------
// Reorder internals
// ---------------------------------------------------------------------------

function assertBonusesInCampaign(
  auth: AuthContextFull,
  input: ReorderBonusesInput,
): ResultAsync<undefined, string> {
  const ids = input.items.map((i) => i.id)
  return ResultAsync.fromPromise(
    tbl(auth, 'so_bonuses')
      .select('id')
      .eq('campaign_id', input.campaign_id)
      .in('id', ids),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string }[] | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'assertBonusesInCampaign'))
    if ((r.data ?? []).length !== ids.length) return err(messages.common.noPermission)
    return ok(undefined)
  })
}

function applyReorder(
  auth: AuthContextFull,
  input: ReorderBonusesInput,
): ResultAsync<undefined, string> {
  return ResultAsync.fromPromise(
    Promise.all(
      input.items.map((item) =>
        tbl(auth, 'so_bonuses')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
          .eq('campaign_id', input.campaign_id),
      ),
    ),
    dbError,
  ).andThen((responses) => {
    const failed = (responses as { error: DbErrorShape }[]).find((x) => x.error)
    if (failed?.error) return err(mapDbError(failed.error, 'reorderBonuses'))
    return ok(undefined)
  })
}

// ---------------------------------------------------------------------------
// Payload builders — explicit column projection (never spread raw input).
// Update builders send only present keys (absent = leave untouched).
// ---------------------------------------------------------------------------

function tenantClientIds(auth: AuthContextFull): ResultAsync<string[], string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_clients').select('id').eq('tenant_id', auth.tenantId),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string }[] | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'tenantClientIds'))
    return ok((r.data ?? []).map((c) => c.id))
  })
}

function buildClientPatch(input: UpdateClientInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.slug !== undefined) patch.slug = input.slug
  if (input.mail_provider !== undefined) patch.mail_provider = input.mail_provider
  if (input.resend_from_email !== undefined) patch.resend_from_email = input.resend_from_email
  if (input.gmail_address !== undefined) patch.gmail_address = input.gmail_address
  // Absent = leave the existing secret untouched (the editor omits the key on
  // a rotate-skip, same pattern as so_campaigns.tally_webhook_secret in
  // buildCampaignPatch above). A present value rotates it.
  if (input.resend_api_key !== undefined) patch.resend_api_key = input.resend_api_key
  if (input.gmail_app_password !== undefined)
    patch.gmail_app_password = input.gmail_app_password
  return patch
}

function buildCampaignInsert(input: CreateCampaignInput): Record<string, unknown> {
  return {
    client_id: input.client_id,
    slug: input.slug,
    display_name: input.display_name ?? null,
    brand: input.brand ?? null,
    esp_provider: input.esp_provider,
    esp_audience_ref: input.esp_audience_ref ?? null,
    esp_tag_launch: input.esp_tag_launch,
    tally_webhook_secret: input.tally_webhook_secret ?? null,
    published: input.published,
  }
}

function buildCampaignPatch(input: UpdateCampaignInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.slug !== undefined) patch.slug = input.slug
  if (input.display_name !== undefined) patch.display_name = input.display_name
  if (input.brand !== undefined) patch.brand = input.brand
  if (input.esp_provider !== undefined) patch.esp_provider = input.esp_provider
  if (input.esp_audience_ref !== undefined) patch.esp_audience_ref = input.esp_audience_ref
  if (input.esp_tag_launch !== undefined) patch.esp_tag_launch = input.esp_tag_launch
  // Absent = leave the existing secret untouched (the editor omits the key on a
  // rotate-skip). A present value rotates it.
  if (input.tally_webhook_secret !== undefined)
    patch.tally_webhook_secret = input.tally_webhook_secret
  if (input.published !== undefined) patch.published = input.published
  return patch
}

function buildBonusInsert(input: CreateBonusInput): Record<string, unknown> {
  return {
    campaign_id: input.campaign_id,
    title: input.title,
    description: input.description ?? null,
    type: input.type,
    url: input.url ?? null,
    media_asset_id: input.media_asset_id ?? null,
    sort_order: input.sort_order,
    published: input.published,
  }
}

function buildBonusPatch(input: UpdateBonusInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.description !== undefined) patch.description = input.description
  if (input.type !== undefined) patch.type = input.type
  if (input.url !== undefined) patch.url = input.url
  if (input.media_asset_id !== undefined) patch.media_asset_id = input.media_asset_id
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order
  if (input.published !== undefined) patch.published = input.published
  return patch
}
