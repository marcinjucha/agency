import { err, errAsync, ok, okAsync, ResultAsync, type Result } from 'neverthrow'
import { isUnscopedActor, type AuthContextFull } from '@/lib/server-auth.server'
import type { PermissionKey } from '@/lib/permissions'
import { messages } from '@/lib/messages'
import {
  type DbErrorShape,
  type MutationResult,
  type VoidResult,
  dbError,
  fromSupabaseSafe,
  fromSupabaseVoidSafe,
  gated,
  mapDbError,
  resolveEffectiveTenantId,
  tbl,
  toMutation,
  toVoid,
} from './handler-base.server'
import type { AdminCampaign, AdminClient, Bonus } from './types'
import {
  describeEffectiveSender,
  type EffectiveSender,
} from './mail/effective-sender.server'
import {
  evaluatePublishGate,
  sanitizeLeadSourceConfig,
} from './lead-sources/specs'
import type {
  CreateBonusInput,
  CreateCampaignInput,
  CreateClientInput,
  ReorderBonusesInput,
  UpdateBonusInput,
  UpdateCampaignInput,
  UpdateClientInput,
} from './validation'
import type { Json } from '@agency/database'
import {
  buildBonusEmailBody,
  coerceBonusTemplateRow,
  resolveVentureSendTheme,
  type BonusTemplateRow,
} from './mail/render-bonus-email.server'
import { isUsableTemplateBlocks } from './utils/template-blocks'
import { coerceStringRecord } from './utils/template-values'
import type { Block } from '@agency/email'
import { parseTemplateVariables } from '@/features/email/utils/parse-template-variables'
import {
  resolveTemplateVariableFields,
  type TemplateVariableField,
} from '@/features/email/utils/resolve-template-variables'

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

/**
 * Verify a theme belongs to the tenant BEFORE it is persisted onto a client.
 * NULL theme_id ("inherit the organization theme") is always allowed and skips
 * the check. A non-null id is rejected (standard no-permission) when it does NOT
 * resolve under the caller's tenant — the FK alone accepts ANY tenant's
 * so_themes.id, RLS governs reads not writes, and the bonus-email path reads
 * so_themes via the SERVICE-ROLE client (bypasses RLS), so a client pointed at
 * another tenant's theme would render that tenant's tokens/logo. Reject the
 * write (never silently null it), mirroring assertClientOwned.
 */
function assertThemeOwnedIfPresent(
  auth: AuthContextFull,
  themeId: string | null | undefined,
): ResultAsync<undefined, string> {
  if (!themeId) return okAsync(undefined)
  return ResultAsync.fromPromise(
    tbl(auth, 'so_themes')
      .select('id')
      .eq('id', themeId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string } | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'assertThemeOwned'))
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
  'id, tenant_id, name, slug, mail_provider, resend_from_email, gmail_address, sender_name, theme_id, created_at, updated_at, has_resend_api_key, has_gmail_app_password'

/**
 * List the tenant's venture clients. `tenantId` is honored ONLY for a super_admin
 * (the CMS Scope Bar — listing another organization's clients while editing one
 * of its users); a non-super caller is pinned to their own tenant by
 * resolveEffectiveTenantId, so passing tenantId=<other> can never read another
 * tenant's client list.
 */
export function listClientsHandler(
  tenantId?: string,
): Promise<MutationResult<AdminClient[]>> {
  return toMutation(
    gated(PERM.clients, (auth) =>
      ResultAsync.fromPromise(
        tbl(auth, 'so_clients')
          .select(ADMIN_CLIENT_COLUMNS)
          .eq('tenant_id', resolveEffectiveTenantId(auth, tenantId))
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
      // Client creation is UNSCOPED-only (app-layer mirror of the so_clients INSERT
      // WITH CHECK gate in 20260709120000). A scoped member is rejected cleanly here
      // BEFORE any DB call rather than hitting an opaque RLS error.
      isUnscopedActor(auth)
        ? // A non-null theme_id must belong to the caller's tenant (cross-tenant
          // theme write guard) BEFORE the insert.
          assertThemeOwnedIfPresent(auth, input.theme_id)
            .andThen(() =>
              // INSERT WITHOUT `.select()` (no RETURNING), then read the row back in a
              // SEPARATE statement below. WHY: the so_clients SELECT RLS policy calls
              // the self-referential can_access_so_client(id), which runs its OWN
              // `SELECT … FROM so_clients WHERE id = <the new id>`. During an
              // `INSERT … RETURNING` that sub-select runs under the insert's snapshot
              // and cannot see the row being inserted, so it returns false and blocks
              // RETURNING → 42501 for every NON-super creator (super_admin escapes only
              // because is_super_admin() short-circuits can_access without reading the
              // row). Reading the row back once it is committed (a fresh snapshot) lets
              // can_access_so_client resolve true.
              ResultAsync.fromPromise(
                tbl(auth, 'so_clients').insert({
                  name: input.name,
                  slug: input.slug,
                  tenant_id: auth.tenantId,
                  mail_provider: input.mail_provider ?? 'resend_shared',
                  resend_api_key: input.resend_api_key ?? null,
                  resend_from_email: input.resend_from_email ?? null,
                  gmail_address: input.gmail_address ?? null,
                  gmail_app_password: input.gmail_app_password ?? null,
                  sender_name: input.sender_name ?? null,
                  // NULL = inherit the organization's theme (design § Assignment UX).
                  theme_id: input.theme_id ?? null,
                }),
                dbError,
              )
                // Still maps 23505 unique_violation → slugTaken (other DB errors →
                // generic); the error now surfaces on the INSERT, not the read-back.
                .andThen(fromSupabaseVoidSafe('createClient')),
            )
            .andThen(() =>
              // slug is GLOBALLY unique (20260709180000), so (tenant_id, slug)
              // uniquely identifies the just-committed row.
              ResultAsync.fromPromise(
                tbl(auth, 'so_clients')
                  .select(ADMIN_CLIENT_COLUMNS)
                  .eq('tenant_id', auth.tenantId)
                  .eq('slug', input.slug)
                  .single(),
                dbError,
              ).andThen(fromSupabaseSafe<AdminClient>('createClient')),
            )
        : errAsync<AdminClient, string>(messages.common.noPermission),
    ),
  )
}

export function updateClientHandler(
  id: string,
  input: UpdateClientInput,
): Promise<MutationResult<AdminClient>> {
  return toMutation(
    gated(PERM.clients, (auth) =>
      // A non-null theme_id must belong to the caller's tenant (cross-tenant
      // theme write guard) BEFORE the update. Null/absent skips the check.
      assertThemeOwnedIfPresent(auth, input.theme_id).andThen(() =>
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
    ),
  )
}

export function deleteClientHandler(id: string): Promise<VoidResult> {
  return toVoid(
    gated(PERM.clients, (auth) =>
      // Defense-in-depth over the so_clients DELETE gate in 20260709120000:
      // client deletion is UNSCOPED-only (cascades to campaigns/bonuses/leads →
      // admin-only). An assigned scoped member may VIEW + UPDATE their client
      // (they enter the sensitive config) but must NOT delete it — reject cleanly
      // here BEFORE any DB call, mirroring createClientHandler. A scoped member's
      // DELETE would otherwise fail with an opaque RLS "0 rows" instead of a clear
      // no-permission message.
      isUnscopedActor(auth)
        ? ResultAsync.fromPromise(
            tbl(auth, 'so_clients').delete().eq('id', id).eq('tenant_id', auth.tenantId),
            dbError,
          ).andThen(fromSupabaseVoidSafe('deleteClient'))
        : errAsync<undefined, string>(messages.common.noPermission),
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
  'id, client_id, slug, display_name, brand, theme_id, email_template_id, esp_provider, esp_audience_ref, esp_tag_launch, published, created_at, updated_at, has_webhook_secret, lead_source_provider, lead_source_config'

// ---------------------------------------------------------------------------
// Publish gate (iter 2b backend). A campaign may go published=true ONLY when a
// lead-source provider is selected AND its required config is satisfied (for
// Tally: the webhook secret must be set). A draft (published=false/omitted) may
// have a NULL provider + incomplete config. The rule itself lives in the
// client-safe `evaluatePublishGate` (single source of truth — the editor gates
// the button with the same fn); the handlers enforce it server-side (defense).
// ---------------------------------------------------------------------------

function publishGateMessage(reason: 'no_provider' | 'incomplete_config'): string {
  return reason === 'no_provider'
    ? messages.venture.publishRequiresLeadSource
    : messages.venture.publishRequiresLeadSourceConfig
}

/**
 * Current lead-source + publish state of an EXISTING campaign. `published` is
 * included so an update that OMITS `published` can be re-gated against the
 * RESULTING published state (an already-published campaign whose lead source is
 * being cleared must not silently become invalid). The plaintext
 * tally_webhook_secret is NEVER selected — only the generated
 * has_webhook_secret boolean (same defense-in-depth as ADMIN_CAMPAIGN_COLUMNS).
 */
interface CampaignPublishState {
  lead_source_provider: string | null
  lead_source_config: Record<string, unknown> | null
  has_webhook_secret: boolean
  published: boolean
}

/**
 * Fetch the current publish state for an EXISTING campaign — needed on an UPDATE
 * that must re-gate the resulting state (publish toggle or lead-source change)
 * OR sanitize a config-only edit against the current provider. Projects an
 * EXPLICIT column list that EXCLUDES the plaintext tally_webhook_secret.
 */
function fetchCampaignPublishState(
  auth: AuthContextFull,
  id: string,
): ResultAsync<CampaignPublishState, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_campaigns')
      .select('lead_source_provider, lead_source_config, has_webhook_secret, published')
      .eq('id', id)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: CampaignPublishState | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'fetchCampaignPublishState'))
    if (!r.data) return err(messages.common.noPermission)
    return ok(r.data)
  })
}

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
      assertClientOwned(auth, input.client_id)
        // A non-null theme_id must belong to the caller's tenant (cross-tenant
        // theme write guard, same as the client theme) BEFORE the insert.
        .andThen(() => assertThemeOwnedIfPresent(auth, input.theme_id))
        // Publish gate: to CREATE already-published, a provider + its required
        // config must be set. A draft (published=false/omitted) skips the gate.
        // On create, all state comes from the input — no DB read needed.
        .andThen(() => createCampaignPublishGate(input))
        .andThen(() =>
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
      assertCampaignOwned(auth, id)
        // A non-null theme_id must belong to the caller's tenant (cross-tenant
        // theme write guard) BEFORE the update. Null/absent skips the check.
        .andThen(() => assertThemeOwnedIfPresent(auth, input.theme_id))
        // Read the current row ONCE when the update could either (a) change the
        // resulting publish validity or (b) need the current provider to
        // sanitize a config-only edit. Otherwise `null` (no DB read).
        .andThen(() => fetchCurrentForUpdate(auth, id, input))
        .andThen((current) =>
          // Publish gate over the RESULTING state (input merged over `current`):
          // if the row will be published, its provider + config must satisfy the
          // provider's publish requirements. Drafts pass.
          enforceUpdatePublishGate(input, current).asyncAndThen(() =>
            ResultAsync.fromPromise(
              tbl(auth, 'so_campaigns')
                // Config ALWAYS sanitized against the effective provider (input
                // when present, else the current DB provider) — the raw wire
                // object never reaches the JSONB column.
                .update(buildCampaignPatch(input, effectiveLeadSourceProvider(input, current)))
                .eq('id', id)
                .select(ADMIN_CAMPAIGN_COLUMNS)
                .single(),
              dbError,
            ).andThen(fromSupabaseSafe<AdminCampaign>('updateCampaign')),
          ),
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
// Effective send (READ-ONLY surface — "Ten launch wysyła" card)
// ===========================================================================

// The bonus-email template state a send would use, mirrored on the read-only
// "Ten launch wysyła" card. A discriminated union — the card must NOT drift from
// the send path (ingest.server.ts `sendBonusEmail`):
//   - 'none'     : the campaign has NO template selected → NO email is sent
//                  (product decision 2026-07-15). There is NO implicit default.
//   - 'template' : the selected, tenant-owned, usable template (name + type slug
//                  → powers the "Edytuj szablon" deep-link)
//   - 'builtin'  : a template IS selected but broken/deleted/unusable → the send
//                  falls back to the hardcoded builder (selected-but-broken)
export type EffectiveTemplateState =
  | { kind: 'none' }
  | { kind: 'template'; id: string; name: string; type: string }
  | { kind: 'builtin' }

// What the campaign editor's read-only "Ten launch wysyła" card consumes. The
// sender fields come from the SAME resolveMailSender the send path uses (via
// describeEffectiveSender); `template` mirrors WHICH template the send resolves.
export interface CampaignEffectiveSend extends EffectiveSender {
  template: EffectiveTemplateState
}

/**
 * Resolve the campaign fields the effective-send card needs: the owning client
 * id (existence hidden behind no-permission) AND the explicitly-assigned
 * template id (so_campaigns.email_template_id, NULL when none → NO email is sent).
 */
function fetchCampaignForEffectiveSend(
  auth: AuthContextFull,
  campaignId: string,
): ResultAsync<{ clientId: string; campaignTemplateId: string | null }, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_campaigns')
      .select('client_id, email_template_id')
      .eq('id', campaignId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: { client_id: string; email_template_id: string | null } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'fetchCampaignForEffectiveSend'))
    if (!r.data) return err(messages.common.noPermission)
    return ok({ clientId: r.data.client_id, campaignTemplateId: r.data.email_template_id })
  })
}

// Non-secret mail config + secret-presence booleans for a tenant-owned client.
// NEVER selects the plaintext resend_api_key/gmail_app_password (GRANT revoked
// for `authenticated`) — the has_* generated booleans stand in for presence.
interface ClientMailDescribeRow {
  mail_provider: string
  resend_from_email: string | null
  gmail_address: string | null
  sender_name: string | null
  has_resend_api_key: boolean
  has_gmail_app_password: boolean
}

function fetchClientMailForDescribe(
  auth: AuthContextFull,
  clientId: string,
): ResultAsync<ClientMailDescribeRow, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_clients')
      .select(
        'mail_provider, resend_from_email, gmail_address, sender_name, has_resend_api_key, has_gmail_app_password',
      )
      .eq('id', clientId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: ClientMailDescribeRow | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'fetchClientMailForDescribe'))
    if (!r.data) return err(messages.common.noPermission)
    return ok(r.data)
  })
}

// A template row for the effective-send card: enough to name it (label) and
// identify it (id). NEVER selects blocks/secrets — the card only needs to mirror
// WHICH template ingest would pick, not render it.
interface VentureTemplateChoice {
  id: string
  label: string
  // The type slug — needed by the effective-send card to build the type-keyed
  // editor deep-link (routes.admin.emailTemplate(type)).
  type: string
}

// The raw row the resolution reads select — adds `blocks` so the card can apply
// the SAME blocks-usability degrade as ingest (`coerceBonusTemplateRow`). A row
// whose `blocks` is non-array/empty is what the send path SKIPS, so the card must
// treat it as ABSENT too — otherwise the card would name a template the send
// silently falls through.
type VentureTemplateChoiceRow = VentureTemplateChoice & { blocks: unknown }

/** Trim the DB row to the card shape once blocks-usability is confirmed. */
function toTemplateChoice(row: VentureTemplateChoiceRow): VentureTemplateChoice {
  return { id: row.id, label: row.label, type: row.type }
}

/**
 * Read the campaign's EXPLICITLY-assigned template by id, SCOPED to the caller's
 * tenant (F5 parity with ingest's F3 — the id must resolve under this tenant or
 * it is treated as absent). Model B: a campaign may assign ANY tenant-owned
 * template by id, so this read does NOT filter on `type`. A row whose `blocks` is
 * non-array/empty is treated as ABSENT (mirrors ingest's `coerceBonusTemplateRow`
 * so the card can never name a template the send would skip). Null when not found
 * OR unusable.
 */
function readVentureTemplateChoiceById(
  auth: AuthContextFull,
  templateId: string,
): ResultAsync<VentureTemplateChoice | null, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'email_templates')
      .select('id, label, type, blocks')
      .eq('id', templateId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: VentureTemplateChoiceRow | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'readVentureTemplateChoiceById'))
    if (!r.data || !isUsableTemplateBlocks(r.data.blocks)) return ok(null)
    return ok(toTemplateChoice(r.data))
  })
}

/**
 * Resolve the template STATE a send would ACTUALLY use for the card — mirroring
 * ingest's `sendBonusEmail` exactly (product decision 2026-07-15, no default tier):
 *   - no selection (`campaignTemplateId === null`) → 'none' (NO email is sent)
 *   - selected + resolves usable under the tenant → 'template' (name + type)
 *   - selected but broken/deleted/unusable → 'builtin' (hardcoded builder)
 * The by-id read runs ONLY when a template is assigned.
 */
function resolveEffectiveTemplateState(
  auth: AuthContextFull,
  campaignTemplateId: string | null,
): ResultAsync<EffectiveTemplateState, string> {
  if (campaignTemplateId === null) return okAsync<EffectiveTemplateState, string>({ kind: 'none' })
  return readVentureTemplateChoiceById(auth, campaignTemplateId).map((choice) =>
    choice
      ? { kind: 'template', id: choice.id, name: choice.label, type: choice.type }
      : { kind: 'builtin' },
  )
}

/**
 * Describe the effective send for a campaign — the sender a real bonus email would
 * use (via the SAME resolveMailSender) AND the template STATE the send would pick
 * (mirrors ingest exactly: no selection → no send; selected → that template;
 * selected-but-broken → hardcoded builder). Gated on `bonus_funnel.campaigns` (the
 * route map does NOT gate createServerFn — this is the server-side gate). Tenant-
 * scoped: the campaign → client chain is verified owned before any mail config is read.
 */
export function getCampaignEffectiveSendHandler(
  campaignId: string,
): Promise<MutationResult<CampaignEffectiveSend>> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      fetchCampaignForEffectiveSend(auth, campaignId).andThen(({ clientId, campaignTemplateId }) =>
        assertClientOwned(auth, clientId).andThen(() =>
          fetchClientMailForDescribe(auth, clientId).andThen((mail) =>
            resolveEffectiveTemplateState(auth, campaignTemplateId).map((template) => {
              const sender = describeEffectiveSender({
                mailProvider: mail.mail_provider,
                resendFromEmail: mail.resend_from_email,
                gmailAddress: mail.gmail_address,
                senderName: mail.sender_name,
                hasResendApiKey: mail.has_resend_api_key,
                hasGmailAppPassword: mail.has_gmail_app_password,
                // Agency-shared "From" — the address a fallback send originates from.
                sharedFromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@haloefekt.pl',
              })
              return { ...sender, template }
            }),
          ),
        ),
      ),
    ),
  )
}

// ===========================================================================
// Bonus email preview (real render — "Podgląd e-mail" tab)
//
// The campaign editor's "Wygląd kampanii" card must show the REAL bonus email a
// send would deliver, NOT a generic theme swatch mock (the mock coloured the
// header from the `headerBackground` role, while a selected template's header can
// be TOKEN-BOUND to `primary` — the mock lied). This handler renders BYTE-
// IDENTICALLY to the send path by reusing the SHARED render mechanism
// (resolveVentureSendTheme + buildBonusEmailBody) and reading the SAME selected
// template by id (no default tier) — so the preview cannot drift from ingest.
//
// AUTHENTICATED/owned path (NOT the public service client): gated on
// bonus_funnel.campaigns + assertCampaignOwned (campaign → client → tenant walk =
// the tenant boundary; so_campaigns has no tenant_id). Every read is tenant-
// scoped. Never throws to the client (toMutation maps the error channel).
// ===========================================================================

// What the "Podgląd e-mail" tab consumes — a discriminated result mirroring the
// send (product decision 2026-07-15):
//   - 'no-template' : the campaign has NO template selected → NO email is sent, so
//                     there is nothing to preview
//   - 'render'      : the byte-identical HTML a real send would deliver (a selected
//                     template, or the hardcoded builder when it is broken/deleted)
export type CampaignBonusEmailPreview =
  | { kind: 'no-template' }
  | { kind: 'render'; html: string }

// The campaign fields the preview needs: owning client (for the client theme tier
// + ownership), the display name (→ {{companyName}}), the campaign theme tier
// (theme_id / brand), and the explicitly-assigned template id.
interface CampaignPreviewRow {
  clientId: string
  displayName: string | null
  campaignThemeId: string | null
  campaignBrand: Json | null
  campaignTemplateId: string | null
  // Iter 3c: per-campaign literal variable values, coerced to a flat string map.
  // Passed to buildBonusEmailBody so the preview substitutes the SAME values the
  // send does (preview == send parity).
  templateValues: Record<string, string>
}

function fetchCampaignPreviewRow(
  auth: AuthContextFull,
  campaignId: string,
): ResultAsync<CampaignPreviewRow, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_campaigns')
      .select('client_id, display_name, theme_id, brand, email_template_id, template_variable_values')
      .eq('id', campaignId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: {
        client_id: string
        display_name: string | null
        theme_id: string | null
        brand: Json | null
        email_template_id: string | null
        template_variable_values: unknown
      } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'fetchCampaignPreviewRow'))
    if (!r.data) return err(messages.common.noPermission)
    return ok<CampaignPreviewRow, string>({
      clientId: r.data.client_id,
      displayName: r.data.display_name,
      campaignThemeId: r.data.theme_id,
      campaignBrand: r.data.brand,
      campaignTemplateId: r.data.email_template_id,
      templateValues: coerceStringRecord(r.data.template_variable_values),
    })
  })
}

// (named-theme FK + inline JSONB fallback) for one brand tier.
interface ThemeTierRead {
  themeId: string | null
  inline: Json | null
}

/** Read the owning client's theme tier, tenant-scoped (defense over the FK walk). */
function fetchClientThemeTier(
  auth: AuthContextFull,
  clientId: string,
): ResultAsync<ThemeTierRead, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_clients')
      .select('theme_id, theme')
      .eq('id', clientId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: { theme_id: string | null; theme: Json | null } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'fetchClientThemeTier'))
    if (!r.data) return err(messages.common.noPermission)
    return ok<ThemeTierRead, string>({ themeId: r.data.theme_id, inline: r.data.theme })
  })
}

/**
 * Read the tenant (agency) theme tier — the neutral fallback under the client's
 * brand. Degrades to {null, null} on a missing row AND on a transient read error
 * (never blocks the preview), mirroring ingest's fetchTenantTheme no-drop
 * behaviour. Parity matters: the preview must reflect what a real send produces,
 * and a send degrades the tenant tier to the neutral default rather than aborting
 * on a tenant read error (client brand still wins). The client- and campaign-tier
 * reads deliberately do NOT degrade here — ingest propagates their read errors
 * too (resolveClientRow/resolveCampaign → db_error abort).
 */
function fetchTenantThemeTier(auth: AuthContextFull): ResultAsync<ThemeTierRead, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'tenants').select('theme_id, theme').eq('id', auth.tenantId).maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: { theme_id: string | null; theme: Json | null } | null
      error: DbErrorShape
    }
    if (r.error) {
      // Degrade to the neutral default instead of erroring (mirrors ingest's
      // fetchTenantTheme) so the preview still renders what a send would produce.
      console.error('[venture-preview] tenant theme lookup failed:', mapDbError(r.error, 'fetchTenantThemeTier'))
      return ok<ThemeTierRead, string>({ themeId: null, inline: null })
    }
    return ok<ThemeTierRead, string>({
      themeId: r.data?.theme_id ?? null,
      inline: r.data?.theme ?? null,
    })
  })
}

/** Published bonuses in send order — the SAME set + order the send splices in. */
function fetchPublishedBonusesForPreview(
  auth: AuthContextFull,
  campaignId: string,
): ResultAsync<Array<{ title: string | null; url: string | null }>, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_bonuses')
      .select('title, url')
      .eq('campaign_id', campaignId)
      .eq('published', true)
      .order('sort_order', { ascending: true }),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: Array<{ title: string | null; url: string | null }> | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'fetchPublishedBonusesForPreview'))
    return ok(r.data ?? [])
  })
}

/** Read a template row (blocks + subject) by id, tenant-scoped, coerced to usable-or-null. */
function readBonusTemplateRowById(
  auth: AuthContextFull,
  templateId: string,
): ResultAsync<BonusTemplateRow | null, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'email_templates')
      .select('blocks, subject')
      .eq('id', templateId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: unknown; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'readBonusTemplateRowById'))
    return ok(coerceBonusTemplateRow(r.data))
  })
}

/**
 * Render the preview HTML — the FINAL step, reusing the SHARED send mechanism so
 * it is byte-identical to a real send: per-tier theme resolution then the hybrid
 * copy-template / hardcoded-builder body. Never throws (each dep degrades). Called
 * ONLY when a template IS selected — a broken/deleted row (`template === null`)
 * renders the hardcoded builder, exactly as the send's safety net.
 */
async function renderBonusPreviewHtml(args: {
  supabase: AuthContextFull['supabase']
  displayName: string | null
  tenant: ThemeTierRead
  client: ThemeTierRead
  campaignThemeId: string | null
  campaignBrand: Json | null
  bonuses: Array<{ title: string | null; url: string | null }>
  template: BonusTemplateRow | null
  templateValues: Record<string, string>
}): Promise<string> {
  const theme = await resolveVentureSendTheme(args.supabase, {
    tenantThemeId: args.tenant.themeId,
    tenantTheme: args.tenant.inline,
    clientThemeId: args.client.themeId,
    clientTheme: args.client.inline,
    campaignThemeId: args.campaignThemeId,
    campaignBrand: args.campaignBrand,
  })
  // Pass the SAME per-campaign values the send substitutes (preview == send).
  const { html } = await buildBonusEmailBody(
    args.template,
    args.displayName,
    args.bonuses,
    theme,
    args.templateValues,
  )
  return html
}

/**
 * Render the REAL bonus email a send would deliver for a campaign — for the
 * campaign editor's "Podgląd e-mail" tab. Gated on bonus_funnel.campaigns (the
 * route map does NOT protect createServerFn); tenant-scoped via assertCampaignOwned
 * + explicit tenant filters. Reuses the send path's shared theme + body mechanism
 * so the preview cannot drift from ingest. When NO template is selected the
 * campaign sends NO email (product decision 2026-07-15) → returns `no-template`
 * WITHOUT any theme/bonus/render work; when one IS selected it renders that
 * template (or the hardcoded builder when it is broken/deleted).
 */
export function renderCampaignBonusEmailPreviewHandler(
  campaignId: string,
): Promise<MutationResult<CampaignBonusEmailPreview>> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      assertCampaignOwned(auth, campaignId).andThen(() =>
        fetchCampaignPreviewRow(auth, campaignId).andThen((campaign) => {
          const templateId = campaign.campaignTemplateId
          // No selection → NO email is sent → nothing to preview (skip all reads).
          if (templateId === null) {
            return okAsync<CampaignBonusEmailPreview, string>({ kind: 'no-template' })
          }
          return fetchClientThemeTier(auth, campaign.clientId).andThen((client) =>
            fetchTenantThemeTier(auth).andThen((tenant) =>
              ResultAsync.combine([
                fetchPublishedBonusesForPreview(auth, campaignId),
                // Selected id → read by id; a broken/deleted row degrades to null →
                // the render below uses the hardcoded builder (selected-but-broken).
                readBonusTemplateRowById(auth, templateId),
              ]).andThen(([bonuses, template]) =>
                ResultAsync.fromPromise(
                  renderBonusPreviewHtml({
                    supabase: auth.supabase,
                    displayName: campaign.displayName,
                    tenant,
                    client,
                    campaignThemeId: campaign.campaignThemeId,
                    campaignBrand: campaign.campaignBrand,
                    bonuses,
                    template,
                    templateValues: campaign.templateValues,
                  }),
                  dbError,
                ).map((html) => ({ kind: 'render', html }) as CampaignBonusEmailPreview),
              ),
            ),
          )
        }),
      ),
    ),
  )
}

// ===========================================================================
// Bonus-capable email templates (Phase 4, model B)
//
// The template-selection surface: list the tenant's BONUS-CAPABLE templates for
// the campaign dropdown and assign/clear a campaign's explicit template (campaign
// edit authority + F5 cross-tenant forged-id guard). Creation/edit/delete of
// templates uses the EXISTING generic email-templates CRUD — no venture-specific
// create path exists (model B).
// ===========================================================================

/** One bonus-capable template option for the campaign dropdown. */
export interface BonusTemplateOption {
  id: string
  label: string
  // The type slug — lets the picker build the type-keyed editor deep-link for the
  // currently-selected option (routes.admin.emailTemplate(type)).
  type: string
}

/**
 * List ALL the caller-tenant's email templates for the campaign dropdown
 * (model B: a campaign may select ANY tenant-owned template). We no longer
 * filter on the `{{bonus_list}}` marker — bonus links are moving to per-campaign
 * template variables, so restricting the dropdown to marker-bearing templates
 * would hide most of a tenant's templates. Only `workflow_custom` is excluded
 * (internal n8n templates, and the ONE non-unique-per-tenant type — see below).
 * Gated on `bonus_funnel.campaigns` (the reader is the campaign editor; the
 * route map does NOT gate createServerFn). Tenant-scoped via the RLS/cookie
 * client + explicit tenant_id filter.
 */
export function listBonusTemplatesHandler(): Promise<
  MutationResult<BonusTemplateOption[]>
> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      ResultAsync.fromPromise(
        tbl(auth, 'email_templates')
          .select('id, label, type')
          .eq('tenant_id', auth.tenantId)
          // EXCLUDE workflow_custom — it is the ONE non-unique-per-tenant type, but
          // the picker's "Edytuj szablon" deep-link is TYPE-keyed
          // (routes.admin.emailTemplate(type) → editor .eq('type',…).maybeSingle()),
          // which ERRORS on multiple rows. Every remaining type is unique per
          // tenant, so the type-keyed link is sound. (workflow_custom = n8n workflow
          // templates, never bonus templates.)
          .neq('type', 'workflow_custom'),
        dbError,
      ).andThen((res) => {
        const r = res as {
          data: Array<{
            id: string
            label: string | null
            type: string
          }> | null
          error: DbErrorShape
        }
        if (r.error) return err(mapDbError(r.error, 'listBonusTemplates'))
        return ok(
          (r.data ?? []).map((t) => ({
            id: t.id,
            label: t.label ?? t.type,
            type: t.type,
          })),
        )
      }),
    ),
  )
}

/**
 * Verify a template belongs to the caller's tenant BEFORE it is assigned to a
 * campaign (F5). NULL templateId ("clear → use default") is always allowed and
 * skips the check. Model B: a campaign may assign ANY tenant-owned template — the
 * check is tenant-ownership ONLY (no `type` constraint); bonus-capability is a UI
 * warning, not a hard gate. A non-null id that does NOT resolve under the caller's
 * tenant is REJECTED (standard no-permission) — never silently nulled — so a
 * forged/cross-tenant id can never be assigned. Mirrors assertThemeOwnedIfPresent.
 */
function assertVentureTemplateOwnedIfPresent(
  auth: AuthContextFull,
  templateId: string | null,
): ResultAsync<undefined, string> {
  if (!templateId) return okAsync(undefined)
  return ResultAsync.fromPromise(
    tbl(auth, 'email_templates')
      .select('id')
      .eq('id', templateId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as { data: { id: string } | null; error: DbErrorShape }
    if (r.error) return err(mapDbError(r.error, 'assertVentureTemplateOwned'))
    // Missing OR another tenant's → indistinguishable, both forbidden.
    if (!r.data) return err(messages.common.noPermission)
    return ok(undefined)
  })
}

/**
 * Assign (or clear) a campaign's explicit venture_bonus template. Gated on
 * `bonus_funnel.campaigns` (assigning is a campaign edit). F5 defense:
 *   (a) assertCampaignOwned — the campaign must belong to the caller's tenant
 *       (walks campaign → client → tenant; so_campaigns has NO tenant_id column,
 *       so this FK-chain walk IS the tenant scope);
 *   (b) a non-null templateId is verified owned under the caller's tenant (ANY
 *       type — model B allows any template) — rejected, NOT silently nulled,
 *       when foreign/absent;
 *   (c) then UPDATE so_campaigns.email_template_id scoped by campaign id.
 * A cross-tenant forged campaign id OR template id is therefore impossible to
 * assign — independent of the send path's own F3 guard. NULL clears the selection
 * → the campaign then sends NO bonus email (product decision 2026-07-15).
 */
export function selectTemplateForCampaignHandler(
  campaignId: string,
  templateId: string | null,
): Promise<VoidResult> {
  return toVoid(
    gated(PERM.campaigns, (auth) =>
      assertCampaignOwned(auth, campaignId)
        .andThen(() => assertVentureTemplateOwnedIfPresent(auth, templateId))
        .andThen(() =>
          ResultAsync.fromPromise(
            tbl(auth, 'so_campaigns')
              .update({ email_template_id: templateId })
              .eq('id', campaignId),
            dbError,
          ).andThen(fromSupabaseVoidSafe('selectTemplateForCampaign')),
        ),
    ),
  )
}

// ===========================================================================
// Per-campaign template variable values (Iter 3b)
//
// Below the campaign's email-template picker the operator fills a literal value
// per template variable, saved per campaign in so_campaigns.template_variable_values
// (JSONB, flat { templateTokenKey: literalValue }). The FILLABLE fields are derived
// from the SELECTED template (so_campaigns.email_template_id). With NO template
// selected NO email is sent (product decision 2026-07-15) → there are no fillable
// fields; a template selected but broken/deleted also yields no fields (the send's
// hardcoded-builder safety net has no user variables). Any previously-saved values
// are still returned in every case.
// ===========================================================================

/** What the campaign template-variable editor consumes: the fillable fields + saved values. */
export interface CampaignTemplateVariables {
  fields: TemplateVariableField[]
  /** The campaign's persisted { templateTokenKey: literalValue } map (default {}). */
  values: Record<string, string>
}

/** The campaign fields the variable editor needs: owning client, effective template id, saved values. */
interface CampaignVariablesRow {
  clientId: string
  campaignTemplateId: string | null
  savedValues: Record<string, string>
}

function fetchCampaignForVariables(
  auth: AuthContextFull,
  campaignId: string,
): ResultAsync<CampaignVariablesRow, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'so_campaigns')
      .select('client_id, email_template_id, template_variable_values')
      .eq('id', campaignId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: {
        client_id: string
        email_template_id: string | null
        template_variable_values: unknown
      } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'fetchCampaignForVariables'))
    if (!r.data) return err(messages.common.noPermission)
    return ok<CampaignVariablesRow, string>({
      clientId: r.data.client_id,
      campaignTemplateId: r.data.email_template_id,
      savedValues: coerceStringRecord(r.data.template_variable_values),
    })
  })
}

// The effective template's variable SOURCE — declared variables + the body the
// extraction fallback scans. Tenant-scoped by id (the id already came from the
// tenant-scoped resolution, this read is defence-in-depth). Null when the row
// vanished between resolution and read (treated as "no fields").
interface TemplateVariableSource {
  subject: string
  blocks: Block[]
  templateVariables: unknown
}

function readTemplateVariableSource(
  auth: AuthContextFull,
  templateId: string,
): ResultAsync<TemplateVariableSource | null, string> {
  return ResultAsync.fromPromise(
    tbl(auth, 'email_templates')
      .select('subject, blocks, template_variables')
      .eq('id', templateId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    dbError,
  ).andThen((res) => {
    const r = res as {
      data: { subject: string | null; blocks: unknown; template_variables: unknown } | null
      error: DbErrorShape
    }
    if (r.error) return err(mapDbError(r.error, 'readTemplateVariableSource'))
    if (!r.data) return ok<TemplateVariableSource | null, string>(null)
    return ok<TemplateVariableSource | null, string>({
      subject: r.data.subject ?? '',
      blocks: Array.isArray(r.data.blocks) ? (r.data.blocks as Block[]) : [],
      templateVariables: r.data.template_variables,
    })
  })
}

/**
 * Resolve the fillable variable fields for a campaign's EFFECTIVE template plus
 * the campaign's currently-saved values. Gated on `bonus_funnel.campaigns` (the
 * route map does NOT protect createServerFn — this is the server-side gate).
 * Tenant-scoped: the campaign → client chain is verified owned before any read.
 */
export function getCampaignTemplateVariablesHandler(
  campaignId: string,
): Promise<MutationResult<CampaignTemplateVariables>> {
  return toMutation(
    gated(PERM.campaigns, (auth) =>
      fetchCampaignForVariables(auth, campaignId).andThen(
        ({ clientId, campaignTemplateId, savedValues }) =>
          assertClientOwned(auth, clientId).andThen(() =>
            // No template selected → NO email is sent → no fillable fields (product
            // decision 2026-07-15). Saved values are still returned. When a template
            // IS selected, read it by id; a broken/deleted row (choice === null)
            // yields no fields too — the hardcoded-builder safety net has no user
            // variables, matching the send path.
            campaignTemplateId === null
              ? okAsync<CampaignTemplateVariables, string>({ fields: [], values: savedValues })
              : readVentureTemplateChoiceById(auth, campaignTemplateId).andThen((resolved) =>
                  resolved
                    ? readTemplateVariableSource(auth, resolved.id).map((src) => ({
                        fields: src
                          ? resolveTemplateVariableFields({
                              templateVariables: parseTemplateVariables(src.templateVariables),
                              subject: src.subject,
                              blocks: src.blocks,
                            })
                          : [],
                        values: savedValues,
                      }))
                    : okAsync<CampaignTemplateVariables, string>({ fields: [], values: savedValues }),
                ),
          ),
      ),
    ),
  )
}

/**
 * Persist a campaign's per-variable literal values (Iter 3b). Gated on
 * `bonus_funnel.campaigns` + assertCampaignOwned (campaign → client → tenant walk;
 * so_campaigns has no tenant_id, so the FK-chain walk IS the tenant scope —
 * mirrors selectTemplateForCampaignHandler). `values` is a flat string map; the
 * JSONB column is written directly (the `tbl` accessor is untyped, so no inline
 * `as Json` cast is needed at the call site — the centralised untyped boundary).
 */
export function saveCampaignTemplateVariablesHandler(
  campaignId: string,
  values: Record<string, string>,
): Promise<VoidResult> {
  return toVoid(
    gated(PERM.campaigns, (auth) =>
      assertCampaignOwned(auth, campaignId).andThen(() =>
        ResultAsync.fromPromise(
          tbl(auth, 'so_campaigns')
            .update({ template_variable_values: values })
            .eq('id', campaignId),
          dbError,
        ).andThen(fromSupabaseVoidSafe('saveCampaignTemplateVariables')),
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
  if (input.sender_name !== undefined) patch.sender_name = input.sender_name
  // Absent = leave the existing secret untouched (the editor omits the key on
  // a rotate-skip, same pattern as so_campaigns.tally_webhook_secret in
  // buildCampaignPatch above). A present value rotates it.
  if (input.resend_api_key !== undefined) patch.resend_api_key = input.resend_api_key
  if (input.gmail_app_password !== undefined)
    patch.gmail_app_password = input.gmail_app_password
  // Present = reassign (uuid) or clear to inherit (null); absent = leave untouched.
  if (input.theme_id !== undefined) patch.theme_id = input.theme_id
  return patch
}

// Publish gate for CREATE — all state comes from the input (no existing row).
// Only fires when the create asks for published=true; a draft passes through.
function createCampaignPublishGate(
  input: CreateCampaignInput,
): ResultAsync<undefined, string> {
  if (input.published !== true) return okAsync(undefined)
  const gate = evaluatePublishGate({
    provider: input.lead_source_provider,
    hasSecret: !!input.tally_webhook_secret,
    config: (input.lead_source_config ?? {}) as Record<string, unknown>,
  })
  return gate.ok ? okAsync(undefined) : errAsync(publishGateMessage(gate.reason))
}

// True when the update writes any lead-source field (provider / secret / config).
function touchesLeadSource(input: UpdateCampaignInput): boolean {
  return (
    input.lead_source_provider !== undefined ||
    input.tally_webhook_secret !== undefined ||
    input.lead_source_config !== undefined
  )
}

// Whether this update could invalidate the publish gate. An explicit draft save
// (published=false) never can. When `published` is omitted, only a lead-source
// change can — a published campaign whose provider/secret/config is altered must
// be re-gated against its (still-published) resulting state.
function touchesPublishValidity(input: UpdateCampaignInput): boolean {
  if (input.published === false) return false
  if (input.published === true) return true
  return touchesLeadSource(input)
}

// Whether the current DB row must be read before writing: to re-gate the
// resulting publish state, OR to sanitize a config-only edit (config present but
// provider omitted) against the current provider.
function updateNeedsCurrentRow(input: UpdateCampaignInput): boolean {
  return (
    touchesPublishValidity(input) ||
    (input.lead_source_config !== undefined && input.lead_source_provider === undefined)
  )
}

function fetchCurrentForUpdate(
  auth: AuthContextFull,
  id: string,
  input: UpdateCampaignInput,
): ResultAsync<CampaignPublishState | null, string> {
  return updateNeedsCurrentRow(input)
    ? fetchCampaignPublishState(auth, id).map((state) => state as CampaignPublishState | null)
    : okAsync(null)
}

// The provider the config is sanitized against: the input provider when the
// update sets one, otherwise the current DB provider (config-only edit). A
// null/unknown provider → sanitizeLeadSourceConfig strips to {}.
function effectiveLeadSourceProvider(
  input: UpdateCampaignInput,
  current: CampaignPublishState | null,
): string | null | undefined {
  if (input.lead_source_provider !== undefined) return input.lead_source_provider
  return current?.lead_source_provider ?? null
}

// Publish gate for UPDATE — the resulting state is the input merged over the
// current DB row. Rejects only when the row WILL be published (published=true,
// or published omitted while the DB row is already published) AND the merged
// provider/secret/config fails the provider's publish requirements. Drafts pass.
// `current` is null only when no lead-source/publish field is affected → nothing
// to gate.
function enforceUpdatePublishGate(
  input: UpdateCampaignInput,
  current: CampaignPublishState | null,
): Result<undefined, string> {
  if (!current || !touchesPublishValidity(input)) return ok(undefined)
  const willBePublished =
    input.published === true || (input.published === undefined && current.published)
  if (!willBePublished) return ok(undefined)
  const provider =
    input.lead_source_provider !== undefined
      ? input.lead_source_provider
      : current.lead_source_provider
  // Distinguish undefined (field omitted → keep the existing secret) from an
  // explicit null/'' (operator clearing it → resulting state has NO secret).
  // Falling back to has_webhook_secret on an explicit clear would let a campaign
  // publish with a secret it just removed → every ingest 401s.
  const hasSecret =
    input.tally_webhook_secret === undefined
      ? current.has_webhook_secret
      : !!input.tally_webhook_secret
  const config =
    (input.lead_source_config !== undefined
      ? input.lead_source_config
      : current.lead_source_config) ?? {}
  const gate = evaluatePublishGate({
    provider,
    hasSecret,
    config: config as Record<string, unknown>,
  })
  return gate.ok ? ok(undefined) : err(publishGateMessage(gate.reason))
}

function buildCampaignInsert(input: CreateCampaignInput): Record<string, unknown> {
  return {
    client_id: input.client_id,
    slug: input.slug,
    display_name: input.display_name ?? null,
    brand: input.brand ?? null,
    // NULL = inherit from the client, then the tenant (design § Campaign tier).
    theme_id: input.theme_id ?? null,
    esp_provider: input.esp_provider,
    esp_audience_ref: input.esp_audience_ref ?? null,
    esp_tag_launch: input.esp_tag_launch,
    // SECRET config field → its OWN column (never lead_source_config JSONB).
    tally_webhook_secret: input.tally_webhook_secret ?? null,
    // Provider selection. NULL = draft (no lead source yet).
    lead_source_provider: input.lead_source_provider ?? null,
    // NON-SECRET config → JSONB, stripped to the provider's non-secret shape so
    // a secret can never leak into it (secrets live in dedicated columns).
    lead_source_config: sanitizeLeadSourceConfig(
      input.lead_source_provider,
      input.lead_source_config,
    ),
    published: input.published,
  }
}

function buildCampaignPatch(
  input: UpdateCampaignInput,
  effectiveProvider: string | null | undefined,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.slug !== undefined) patch.slug = input.slug
  if (input.display_name !== undefined) patch.display_name = input.display_name
  if (input.brand !== undefined) patch.brand = input.brand
  // Present = reassign (uuid) or clear to inherit (null); absent = leave untouched.
  if (input.theme_id !== undefined) patch.theme_id = input.theme_id
  if (input.esp_provider !== undefined) patch.esp_provider = input.esp_provider
  if (input.esp_audience_ref !== undefined) patch.esp_audience_ref = input.esp_audience_ref
  if (input.esp_tag_launch !== undefined) patch.esp_tag_launch = input.esp_tag_launch
  // Absent = leave the existing secret untouched (the editor omits the key on a
  // rotate-skip). A present value rotates it. SECRET → dedicated column only.
  if (input.tally_webhook_secret !== undefined)
    patch.tally_webhook_secret = input.tally_webhook_secret
  if (input.lead_source_provider !== undefined)
    patch.lead_source_provider = input.lead_source_provider
  // NON-SECRET config → JSONB, ALWAYS sanitized against the EFFECTIVE provider
  // (input provider when present, else the current DB provider on a config-only
  // edit). Never write the raw wire object — a smuggled `secret` would otherwise
  // land in this authenticated-readable column. A null/unknown effective
  // provider → {} (sanitizeLeadSourceConfig strips everything).
  if (input.lead_source_config !== undefined) {
    patch.lead_source_config = sanitizeLeadSourceConfig(
      effectiveProvider,
      input.lead_source_config,
    )
  }
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
