import { createFileRoute } from '@tanstack/react-router'
import { createServiceClient } from '@/lib/supabase/service'
import { getEspProvider, isEspProviderRegistered } from '@/features/venture/esp/index.server'
import type { EspProviderId } from '@/features/venture/esp/types'
import { resolveLeadSource } from '@/features/venture/lead-sources/index.server'
import {
  ingestLead,
  ingestOutcomeStatus,
  resolveCampaign,
  type IngestDeps,
} from '@/features/venture/ingest.server'

// ---------------------------------------------------------------------------
// POST /api/venture/leads/$client/$slug — Tally lead-ingest webhook (spec §7,
// iter 3 + client-scoped-slug pivot).
//
// Per-campaign webhook secret + slug-in-URL model: the campaign slug travels in
// the URL PATH (not a hidden Tally field), and each campaign carries its own
// so_campaigns.tally_webhook_secret. This module reads NO env for the secret.
//
// Client-scoped slugs: campaign slugs are unique per client (so_campaigns
// UNIQUE(client_id, slug)), not globally — the URL now carries BOTH the
// client slug and the campaign slug. resolveCampaign resolves the client
// first, then the campaign scoped to that client's id.
//
// server.handlers.POST strips this from the client bundle and lets us return a
// direct HTTP Response. Server-to-server webhook (Tally → CMS) — NO CORS.
//
// Lead source is PLUGGABLE via the lead-sources registry (iter 2): each campaign
// DECLARES its provider in so_campaigns.lead_source_provider, and the route
// delegates verify + parse to the resolved LeadSourceProvider (Tally today).
// resolveLeadSource(campaign.lead_source_provider) maps a NULL/absent provider (a
// DRAFT campaign — nothing to ingest) AND any unregistered value → null → uniform
// 401 (NO tally-fallback). A registered provider → verify + parse. Adding a
// provider = one ./types id + one *.server.ts + one registry registration; this
// route is unchanged.
//
// Flow (resolve → verify → map → ingest):
//   1. parse $client/$slug from the URL path
//   2. resolve the campaign by client slug + campaign slug on the service
//      client (BEFORE the body — we need its secret to verify)
//   3. campaign missing OR secret null/empty → 401 invalid_signature (UNIFORM —
//      no "no such client" vs "no such campaign" vs "not configured" vs "bad
//      signature" oracle)
//   4. resolve the lead-source provider, then provider.verify over the RAW body
//      with THAT campaign's secret → 401 on invalid
//   5. provider.parse the body → missing submissionId → 400 bad_request
//   6. ingest (idempotent on campaign_id + submission id):
//        - ingested / duplicate → 200 { ok: true } (lead persisted, by us or a
//          concurrent winner; ESP/mail failures stay 200 — no-lead-drop, and 200
//          stops Tally retry-storming on side-effect failures)
//        - insert_error (genuine, non-23505 lead-WRITE failure) → 500 so Tally
//          RETRIES — returning 200 here would silently DROP the lead
//        - unexpected THROW → 500 (a valid lead must be retryable, not 200'd)
//
// Contract nuance: "never 500 a valid lead" means never 500 on ESP/mail failure
// (those have their own try/catch inside ingest and stay 200). A LEAD-WRITE
// failure SHOULD 500 — that is the one thing Tally must retry.
//
// No secret / provider error body ever leaks into the response.
//
// `$client`/`$slug` route params are parsed from the URL pathname —
// server.handlers does not surface route params directly (mirrors
// api/venture/campaigns/$client/$slug.ts).
// ---------------------------------------------------------------------------

const SLUG_PATH_REGEX = /^\/api\/venture\/leads\/([^/]+)\/([^/]+)\/?$/

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uniform rejection — collapses "unknown client", "unknown campaign", "no
// secret configured" and "bad signature" into one indistinguishable response
// (no enumeration oracle).
const invalidSignature = (): Response => json({ error: 'invalid_signature' }, 401)

function parseClientAndSlug(request: Request): { clientSlug: string; slug: string } {
  const match = new URL(request.url).pathname.match(SLUG_PATH_REGEX)
  return {
    clientSlug: match?.[1] ? decodeURIComponent(match[1]) : '',
    slug: match?.[2] ? decodeURIComponent(match[2]) : '',
  }
}

// Wire the real ingest dependencies over an existing service client (the route
// already created one to resolve the campaign). Kept here (not in the
// orchestrator) so the orchestrator stays pure/testable and this is the single
// composition root. `resolveMailSender` is intentionally OMITTED here —
// ingest.server.ts defaults to the real `resolveMailSender` (per-client
// provider selection) when the caller doesn't inject one; only tests inject a
// fake.
function buildIngestDeps(supabase: IngestDeps['supabase']): IngestDeps {
  return {
    supabase,
    getProvider: getEspProvider,
    isProviderRegistered: (id: string): id is EspProviderId =>
      isEspProviderRegistered(id as EspProviderId),
  }
}

export const Route = createFileRoute('/api/venture/leads/$client/$slug')({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { clientSlug, slug } = parseClientAndSlug(request)
        // Diagnostic trace only (prefix `[venture-webhook]`) — NONE of these logs
        // change the HTTP response; they exist so Vercel logs disambiguate the
        // deliberately-uniform 401. Only SAFE discriminators are ever logged:
        // path params (already in the URL), resolution outcomes, secret
        // PRESENCE/length (never its value), the provider id, and the signature
        // HEADER presence + verify RESULT (never the header value, the secret, or
        // the computed HMAC).
        console.log('[venture-webhook] request received', { client: clientSlug, slug })
        if (!clientSlug || !slug) {
          // Server-log only — never surfaced in the HTTP response, so
          // distinguishing the reason here does not create an enumeration
          // oracle for the caller (that oracle is about response content).
          console.error(
            '[venture-webhook] rejected: malformed URL (missing client/slug) -> 401',
            { client: clientSlug, slug },
          )
          return invalidSignature()
        }

        // Resolve the campaign FIRST — we need its per-campaign secret to verify.
        const supabase = createServiceClient()
        const resolveResult = await resolveCampaign(supabase, clientSlug, slug)

        // A transient DB error during resolve is NOT "unknown campaign" — it
        // must be retryable (500), not collapsed into the uniform 401 (Tally
        // does not retry 401s, so conflating the two would silently drop a
        // validly-signed lead forever on a mere connection blip).
        if (resolveResult.kind === 'db_error') {
          // resolveCampaign already logged WHICH lookup failed (client vs
          // campaign); this records the route's mapping to a retryable 500.
          console.error('[venture-webhook] rejected: db_error resolving campaign -> 500', {
            client: clientSlug,
            slug,
          })
          return json({ error: 'internal_error' }, 500)
        }

        // Unknown client, unknown campaign, OR no secret configured → same
        // 401 as a bad signature (no enumeration oracle). resolveCampaign logs
        // the client-vs-campaign discriminator; the route sees only the uniform
        // not_found (that distinction never reaches the response).
        if (resolveResult.kind === 'not_found') {
          console.error('[venture-webhook] rejected: campaign not_found -> 401', {
            client: clientSlug,
            slug,
          })
          return invalidSignature()
        }

        const campaign = resolveResult.campaign

        // Resolve the campaign's lead-source provider from the DB column
        // (iter 2). `resolveLeadSource` NEVER throws — it maps both a NULL/absent
        // provider (a DRAFT campaign with no lead source → nothing to ingest)
        // AND an unregistered/unknown non-null value to `null` → uniform 401
        // (no throw, no enumeration oracle). This is the iter-1 LOW fix: the old
        // `getLeadSource(toLeadSourceId(...))` was called outside try/catch and
        // could throw on an unknown id; the tally-fallback would also have
        // wrongly resolved a genuine draft (NULL) to 'tally'.
        const provider = resolveLeadSource(campaign.lead_source_provider)
        if (!provider) {
          console.error(
            '[venture-webhook] rejected: unresolved lead-source provider (draft/unregistered) -> 401',
            { client: clientSlug, slug, campaignId: campaign.id, provider: null },
          )
          return invalidSignature()
        }
        // Safe: `lead_source_provider` is a registry id (e.g. "tally"), not a secret.
        console.log('[venture-webhook] lead-source provider resolved', {
          client: clientSlug,
          slug,
          campaignId: campaign.id,
          provider: campaign.lead_source_provider,
        })

        const secret = campaign.tally_webhook_secret
        if (!secret) {
          console.error(
            '[venture-webhook] rejected: no webhook secret configured -> 401',
            { client: clientSlug, slug, campaignId: campaign.id, secretPresent: false },
          )
          return invalidSignature()
        }
        // Presence + length ONLY — never the secret value.
        console.log('[venture-webhook] webhook secret present', {
          client: clientSlug,
          slug,
          campaignId: campaign.id,
          secretPresent: true,
          secretLen: secret.length,
        })

        // Verify over the RAW body BEFORE parsing (do not re-serialize). The
        // provider reads its own signature header internally (header-agnostic).
        const rawBody = await request.text()
        // Presence BOOLEAN of the Tally signature header — never its value. (The
        // provider reads the header internally; this diagnostic mirror is for the
        // log line only and does not affect verification.)
        const signatureHeaderPresent = request.headers.has('Tally-Signature')
        const check = provider.verify({ rawBody, headers: request.headers, secret })
        if (!check.valid) {
          // `check.reason` is a provider-neutral discriminator string
          // (missing_secret | missing_signature | invalid_signature) — NOT the
          // header value, the secret, or the computed HMAC.
          console.error('[venture-webhook] rejected: signature verification failed -> 401', {
            client: clientSlug,
            slug,
            campaignId: campaign.id,
            signatureHeaderPresent,
            verifyResult: 'invalid',
            reason: check.reason,
          })
          return invalidSignature()
        }
        console.log('[venture-webhook] signature verified', {
          client: clientSlug,
          slug,
          campaignId: campaign.id,
          signatureHeaderPresent,
          verifyResult: 'valid',
        })

        let parsed: unknown
        try {
          parsed = JSON.parse(rawBody)
        } catch {
          console.error('[venture-webhook] rejected: body is not valid JSON -> 400', {
            client: clientSlug,
            slug,
            campaignId: campaign.id,
          })
          return json({ error: 'bad_request' }, 400)
        }

        const mapped = provider.parse(parsed)
        if (mapped.isErr()) {
          // `mapped.error` is a static TallyMapError union string (e.g. missing
          // submissionId) — no PII / no payload content.
          console.error('[venture-webhook] rejected: unmappable payload -> 400', {
            client: clientSlug,
            slug,
            campaignId: campaign.id,
            reason: mapped.error,
          })
          return json({ error: 'bad_request' }, 400)
        }
        // submissionId (idempotency key) + email PRESENCE only — never the full
        // lead payload.
        console.log('[venture-webhook] payload mapped', {
          client: clientSlug,
          slug,
          campaignId: campaign.id,
          submissionId: mapped.value.submissionId,
          emailPresent: mapped.value.email !== null,
        })

        // Post-validation. ESP/mail failures stay 200 (handled inside ingest),
        // but a genuine lead-WRITE failure (insert_error) → 500 so Tally retries.
        // Ingest never throws, yet guard the composition root so an unexpected
        // error also becomes a retryable 500, not a silent 200 that drops a lead.
        try {
          const outcome = await ingestLead(
            buildIngestDeps(supabase),
            campaign,
            mapped.value,
          )
          const httpStatus = ingestOutcomeStatus(outcome)
          if (httpStatus !== 200) {
            console.error('[venture-webhook] rejected: lead not persisted (retryable) -> 500', {
              client: clientSlug,
              slug,
              campaignId: campaign.id,
              reason: outcome.status,
            })
            return json({ error: 'ingest_failed' }, httpStatus)
          }
          if (outcome.status === 'ingested') {
            console.log('[venture-webhook] ingested', {
              client: clientSlug,
              slug,
              campaignId: campaign.id,
              status: outcome.status,
              leadId: outcome.leadId,
              espSynced: outcome.espSynced,
              emailSent: outcome.emailSent,
            })
          } else {
            console.log('[venture-webhook] duplicate', {
              client: clientSlug,
              slug,
              campaignId: campaign.id,
              status: outcome.status,
            })
          }
          return json({ ok: true }, 200)
        } catch (error) {
          console.error('[venture-webhook] rejected: unexpected ingest error -> 500', {
            client: clientSlug,
            slug,
            campaignId: campaign.id,
            error: error instanceof Error ? error.message : String(error),
          })
          return json({ error: 'ingest_failed' }, 500)
        }
      },
    },
  },
})
