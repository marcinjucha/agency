-- ==========================================
-- Venture Bonus Funnel — campaign slug uniqueness: GLOBAL -> PER-CLIENT
-- ==========================================
-- Purpose:
--   1. so_campaigns.slug: replace the GLOBAL UNIQUE(slug) with per-client UNIQUE(client_id, slug).
--   2. so_clients: add a WĄSKA anon SELECT policy + column-level GRANT so the public
--      (ANON) endpoint can resolve a campaign by (client_slug, campaign_slug).
--   3. so_campaigns: extend the anon column GRANT with client_id (needed by the new so_clients
--      policy's EXISTS subquery — see SECTION 2).
--
-- WHY (supersedes 20260705120000 §so_campaigns comment on GLOBAL uniqueness):
--   The original migration made so_campaigns.slug GLOBALLY unique on the reasoning that the
--   public URL `/c/{slug}` carried no tenant context. Decision REVERSED 2026-07-09: the public
--   URL now carries TWO segments `/api/venture/{campaigns,leads}/{client_slug}/{campaign_slug}`,
--   so the client segment supplies the disambiguating context. Global uniqueness would force
--   artificial campaign names (creator A and creator B could not both have a "warsztaty"
--   campaign) once the feature scales to many creators. so_clients.slug already exists and is
--   per-tenant UNIQUE(tenant_id, slug) — scoping campaign slugs under client_id is the free,
--   correct model.
--
-- RLS / recursion safety (mirrors 20260705120000 conventions):
--   The new so_clients anon policy uses EXISTS to the CHILD so_campaigns, terminating on a
--   PLAIN column check (so_campaigns.published = true) under the anon role. so_campaigns' anon
--   SELECT policy is itself a plain `published = true` check (no back-reference to so_clients),
--   so there is NO clients->campaigns->clients cycle => no infinite recursion.
--
-- Client resolution model:
--   Public read (getPublishedCampaignBySlug) runs on the ANON client, which needs to read
--   so_clients.id + so_clients.slug to resolve (client_slug, campaign_slug) -> campaign. Today
--   so_clients has ZERO anon policy (RLS enabled + no policy = deny-all for anon), so this opens
--   it NARROWLY: anon may read ONLY clients that own >=1 published campaign, and ONLY the
--   (id, slug) columns (name/tenant_id/timestamps stay hidden).
--   Ingest (POST .../leads/:client/:slug) runs on the SERVICE-ROLE client, which bypasses RLS,
--   so it needs no new anon policy here.
--
-- Idempotent by construction (defensive migration — see supabase/CLAUDE.md): every DDL is guarded
-- so the file can be re-run against a partially-applied state without erroring.
--
-- Verification (runnable — see bottom of file).

-- ==========================================
-- SECTION 1: so_campaigns slug uniqueness — GLOBAL -> PER-CLIENT
-- ==========================================

-- Drop the global unique constraint (confirmed name on staging: so_campaigns_slug_key = UNIQUE (slug)).
ALTER TABLE so_campaigns DROP CONSTRAINT IF EXISTS so_campaigns_slug_key;

-- Add per-client uniqueness. Two creators may now share a campaign slug (e.g. "warsztaty").
ALTER TABLE so_campaigns DROP CONSTRAINT IF EXISTS so_campaigns_client_id_slug_key;
ALTER TABLE so_campaigns ADD CONSTRAINT so_campaigns_client_id_slug_key UNIQUE (client_id, slug);

-- idx_so_campaigns_slug (from 20260705120000) stays: still useful for the slug leg of the lookup.
-- Not worth a composite index — so_campaigns is a tiny table; the per-client UNIQUE constraint
-- already provides a (client_id, slug) index if a composite lookup ever needs it.

-- ==========================================
-- SECTION 2: so_clients — WĄSKA anon read for public (client_slug, campaign_slug) resolution
-- ==========================================

-- Row scope: anon sees ONLY clients that own at least one PUBLISHED campaign.
-- EXISTS to child so_campaigns terminates on a plain `published = true` column check (acyclic —
-- see recursion note in header). Deny-all remains for every other client.
DROP POLICY IF EXISTS "Anyone can view so_clients with a published campaign" ON so_clients;
CREATE POLICY "Anyone can view so_clients with a published campaign"
  ON so_clients FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM so_campaigns c
      WHERE c.client_id = so_clients.id
        AND c.published = true
    )
  );

-- The policy's EXISTS reads so_campaigns.client_id + so_campaigns.published UNDER THE ANON ROLE.
-- Referenced tables in an RLS policy are still subject to the calling role's column privileges,
-- and 20260705120000 granted anon SELECT only on (id, slug, display_name, brand, published) —
-- NOT client_id. Without this grant, `SELECT ... FROM so_clients` as anon fails with
-- "permission denied for column client_id" while evaluating the policy. client_id is not
-- sensitive: it is the so_clients row id, which anon can now read via so_clients.id anyway.
GRANT SELECT (client_id) ON so_campaigns TO anon;

-- Column scope: RLS restricts ROWS, not COLUMNS. Without a column GRANT, anon would see ALL
-- columns of the matched rows — including name/tenant_id/created_at/updated_at. Restrict the anon
-- SELECT grant to the public-safe resolution columns only (mirror of the so_campaigns hardening
-- in 20260705120000). The GRANT allow-list MUST stay byte-identical to the handler's explicit
-- .select(...) column list, or reads fail-loud with "permission denied for column".
REVOKE SELECT ON so_clients FROM anon;
GRANT SELECT (id, slug) ON so_clients TO anon;

-- ==========================================
-- VERIFICATION (runnable)
-- ==========================================
-- Constraint swap:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid = 'so_campaigns'::regclass AND contype = 'u';
--     -- expect: so_campaigns_client_id_slug_key = UNIQUE (client_id, slug); NO so_campaigns_slug_key
-- Anon row scope — only clients with a published campaign:
--   SET ROLE anon; SELECT id, slug FROM so_clients; RESET ROLE;
--     -- expect: only clients owning >=1 published campaign (e.g. Kacper w/ published "warsztaty")
-- Anon column hardening — hidden columns denied:
--   SET ROLE anon; SELECT name, tenant_id FROM so_clients; RESET ROLE;
--     -- expect ERROR: permission denied for column name
