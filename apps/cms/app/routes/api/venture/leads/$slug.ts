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
import { sendEmailViaResend } from '@/features/venture/mail/resend.server'

// ---------------------------------------------------------------------------
// POST /api/venture/leads/$slug — Tally lead-ingest webhook (spec §7, iter 3).
//
// Per-campaign webhook secret + slug-in-URL model: the campaign slug travels in
// the URL PATH (not a hidden Tally field), and each campaign carries its own
// so_campaigns.tally_webhook_secret. This module reads NO env for the secret.
//
// server.handlers.POST strips this from the client bundle and lets us return a
// direct HTTP Response. Server-to-server webhook (Tally → CMS) — NO CORS.
//
// Flow (resolve → verify → map → ingest):
//   1. parse $slug from the URL path
//   2. resolve the campaign by slug on the service client (BEFORE the body — we
//      need its secret to verify)
//   3. campaign missing OR secret null/empty → 401 invalid_signature (UNIFORM —
//      no "no such campaign" vs "not configured" vs "bad signature" oracle)
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
// `$slug` route param is parsed from the URL pathname — server.handlers does not
// surface route params directly (mirrors api/venture/campaigns/$slug.ts).
// ---------------------------------------------------------------------------

const SLUG_PATH_REGEX = /^\/api\/venture\/leads\/([^/]+)\/?$/

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Uniform rejection — collapses "unknown campaign", "no secret configured" and
// "bad signature" into one indistinguishable response (no enumeration oracle).
const invalidSignature = (): Response => json({ error: 'invalid_signature' }, 401)

function parseSlug(request: Request): string {
  const match = new URL(request.url).pathname.match(SLUG_PATH_REGEX)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

// Wire the real ingest dependencies over an existing service client (the route
// already created one to resolve the campaign). Kept here (not in the
// orchestrator) so the orchestrator stays pure/testable and this is the single
// composition root.
function buildIngestDeps(supabase: IngestDeps['supabase']): IngestDeps {
  return {
    supabase,
    getProvider: getEspProvider,
    isProviderRegistered: (id: string): id is EspProviderId =>
      isEspProviderRegistered(id as EspProviderId),
    sendEmail: sendEmailViaResend,
  }
}

export const Route = createFileRoute('/api/venture/leads/$slug')({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const slug = parseSlug(request)
        if (!slug) return invalidSignature()

        // Resolve the campaign FIRST — we need its per-campaign secret to verify.
        const supabase = createServiceClient()
        const campaign: CampaignRow | null = await resolveCampaign(supabase, slug)

        // Unknown campaign OR no secret configured → same 401 as a bad signature.
        const secret = campaign?.tally_webhook_secret
        if (!campaign || !secret) return invalidSignature()

        // Verify HMAC over the RAW body BEFORE parsing (do not re-serialize).
        const rawBody = await request.text()
        const signature = request.headers.get('Tally-Signature')
        const check = verifyTallySignature(rawBody, signature, secret)
        if (!check.valid) return invalidSignature()

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
