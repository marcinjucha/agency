import { createFileRoute } from '@tanstack/react-router'
import { createServiceClient } from '@/lib/supabase/service'
import { getEspProvider, isEspProviderRegistered } from '@/features/venture/esp/index.server'
import type { EspProviderId } from '@/features/venture/esp/types'
import { verifyTallySignature } from '@/features/venture/tally-signature.server'
import { mapTallyPayload } from '@/features/venture/tally'
import {
  ingestLead,
  ingestOutcomeStatus,
  resolveCampaign,
  type CampaignRow,
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
// Flow (resolve → verify → map → ingest):
//   1. parse $client/$slug from the URL path
//   2. resolve the campaign by client slug + campaign slug on the service
//      client (BEFORE the body — we need its secret to verify)
//   3. campaign missing OR secret null/empty → 401 invalid_signature (UNIFORM —
//      no "no such client" vs "no such campaign" vs "not configured" vs "bad
//      signature" oracle)
//   4. verify HMAC over the RAW body with THAT campaign's secret → 401 on invalid
//   5. parse + map body → missing email/submissionId → 400 bad_request
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
        if (!clientSlug || !slug) {
          // Server-log only — never surfaced in the HTTP response, so
          // distinguishing the reason here does not create an enumeration
          // oracle for the caller (that oracle is about response content).
          console.warn(
            '[venture-ingest] rejected: malformed request (missing clientSlug/slug in URL)',
            { clientSlug, slug },
          )
          return invalidSignature()
        }

        // Resolve the campaign FIRST — we need its per-campaign secret to verify.
        const supabase = createServiceClient()
        const campaign: CampaignRow | null = await resolveCampaign(
          supabase,
          clientSlug,
          slug,
        )

        // Unknown client, unknown campaign, OR no secret configured → same
        // 401 as a bad signature.
        const secret = campaign?.tally_webhook_secret
        if (!campaign || !secret) {
          console.warn(
            '[venture-ingest] rejected: unknown client/campaign or no webhook secret configured',
            { clientSlug, slug },
          )
          return invalidSignature()
        }

        // Verify HMAC over the RAW body BEFORE parsing (do not re-serialize).
        const rawBody = await request.text()
        const signature = request.headers.get('Tally-Signature')
        const check = verifyTallySignature(rawBody, signature, secret)
        if (!check.valid) {
          console.warn('[venture-ingest] rejected: invalid HMAC signature', {
            clientSlug,
            slug,
          })
          return invalidSignature()
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(rawBody)
        } catch {
          return json({ error: 'bad_request' }, 400)
        }

        const mapped = mapTallyPayload(parsed)
        if (mapped.isErr()) {
          console.warn('[venture-ingest] unmappable Tally payload:', mapped.error)
          return json({ error: 'bad_request' }, 400)
        }

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
            console.warn('[venture-ingest] lead not persisted (retryable):', outcome.status)
            return json({ error: 'ingest_failed' }, httpStatus)
          }
          if (outcome.status === 'ingested') {
            console.log('[venture-ingest] lead ingested:', {
              clientSlug,
              slug,
              status: outcome.status,
              leadId: outcome.leadId,
              espSynced: outcome.espSynced,
              emailSent: outcome.emailSent,
            })
          } else {
            console.log('[venture-ingest] lead ingest outcome:', {
              clientSlug,
              slug,
              status: outcome.status,
            })
          }
          return json({ ok: true }, 200)
        } catch (error) {
          console.error(
            '[venture-ingest] unexpected ingest error:',
            error instanceof Error ? error.message : String(error),
          )
          return json({ error: 'ingest_failed' }, 500)
        }
      },
    },
  },
})
