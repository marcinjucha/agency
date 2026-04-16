# Project Memory: Halo Efekt

## Active Work

**Shop Platform (AAA-P-9):** Iter 1-8 done + kolega done. Remaining: iter 9 (feature flags) + iter 10 (polish/deploy). Both shops migrated to TanStack Start v1.167.
**Marketplace Integration (AAA-P-9):** Iter 1-10 done. Manual testing remaining. 4 standalone n8n workflows.
**CMS TanStack Start migration:** Full migration DONE (AAA-T-192..198, 2026-04-16). Next.js fully removed from CMS. All features migrated to createServerFn Pattern A. See `docs/TANSTACK_START_PATTERNS.md`.

## Feedback & Corrections

- **"dawaj auto"/"auto" = switch to auto mode** — All phases without confirmation. Always stop at Phase 5 (manual testing).
- **No backward compatibility (pre-launch only)** — No clients yet. Once clients onboard, backward compat required.
- **"do all now" = don't defer P2 items** — When design agent recommends deferring, user overrides.
- **Commit per change, test later** — Individual commits, deferred manual testing.
- **Don't commit fixes without testing them first (2026-04-16)** — Verify the fix actually works before creating a commit.

## Bugs Found

- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. `db:types` uses --local, need --linked when local not running.
- **`inputValidator(zodSchema)` direct form silently fails in TanStack Start** — Must use function wrapper: `.inputValidator((input) => schema.parse(input))`. WHY: RPC layer doesn't invoke `.parse()` on raw schema objects. Recurs across features.

## Domain Concepts

- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953.
- **email_configs table empty in production** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`).
- **notification_email per survey_link, not per tenant** — Each link has own notification address.
- **surveys.status DB column is vestigial** — Status computed from survey_links. Manual enum management is wrong model.
- **Condition evaluator operators** — >=, <=, !=, ==, >, <, contains, in. NO single `=`. No `{{ }}` wrappers on field names.
- **Baikal CalDAV has 2 calendars** — tsdav auto-discovers "Appointments" + "Default calendar". Must filter.
- **Nil UUID fallback for Supabase filters** — `?? '00000000-...'` prevents PostgreSQL UUID parse errors on null values.

## Architecture Decisions

- **Cross-project update rule** — AAA-P-9 tasks affecting shared tables/packages require updating BOTH PROJECT_SPECs.
- **app_config table for encryption key** — Supabase Cloud blocks ALTER DATABASE SET for custom GUCs. `app_config` table + `get_encryption_key()` SECURITY DEFINER.
- **n8n Orchestrator owns ALL execution** — CMS trigger route = ~70 LOC fire-and-forget. WHY: Vercel serverless timeout can't handle multi-hour workflow delays.

## Preferences

- **Notion tasks: single task with checklist, not subtasks** — Flexibility to partially complete and pause.
- **/develop: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merging to main.
- **Multi-field detail panel = RHF form + Save button** — NOT pencil-per-field inline editing. Single-field list items = inline OK.
- **Native input type="date" rejected** — Always use shadcn/ui DatePicker (Popover + Calendar).
- **Always test with local database** — Never point dev to production Supabase.
- **Always design bidirectional state transitions** — If deactivate exists, activate must too.
- **Collapsible panels: close button inside panel** — Not only external toggle.
