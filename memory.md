# Project Memory: Halo Efekt

## Active Work

**Shop Platform (AAA-P-9):** Iter 1-8 done + oleg done (renamed from kolega 2026-04-17). Remaining: iter 9 (feature flags) + iter 10 (polish/deploy). Both shops migrated to TanStack Start v1.167.
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
- **Vercel "no output files found" warning with Turborepo + TanStack Start** — Fix: set `"outputs": []` in turbo.json build task. WHY: TanStack Start writes to `/vercel/output` (outside workspace), not `.output/` in workspace — Turbo's default output capture finds nothing and warns. Empty array disables capture.
- **`JSON.stringify(data.description)` migration residue from Next.js Server Actions** — Silently double-encodes Tiptap JSON in TanStack Start, storing a string in JSONB instead of an object. `typeof === 'object'` guard in `toShopProduct` then returns null silently on reload. WHY: Server Actions serialized payloads; createServerFn does not — stringify is now redundant and corrupts data. Audit all server-fn mutations post-migration for leftover stringify calls on JSONB fields.
- **TanStack Start `tsr-split` virtual chunk does NOT invalidate on HMR** — When imports are removed from a route file, the split component chunk is not regenerated until full dev server restart. Symptom: removed component still renders. WHY: component split is a build-time virtual module; HMR only tracks the route file, not the derived chunk.
- **CategoryManager grid view missing CardEditForm render path** — Editing state existed but grid branch had no render for it (only list view had InlineEditRow). WHY: when adding inline edit to one view branch, always verify the other view branch renders edit state too. Pattern: if `editingId === item.id` branches exist in one view mode, they must exist in all view modes.

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
- **pnpm v10 migration essentials** — (1) `onlyBuiltDependencies: ["esbuild"]` in root package.json — pnpm v10 blocks postinstall scripts by default, esbuild needs it to download its binary. (2) Move top-level `overrides` → `pnpm.overrides` (npm key rejected). (3) `@agency/*` workspace deps: `"*"` → `"workspace:*"`. (4) Root `.npmrc` with `shamefully-hoist=true` for Next.js/TanStack compatibility. (5) Delete `package-lock.json` before `pnpm install`.

## Preferences

- **Notion tasks: single task with checklist, not subtasks** — Flexibility to partially complete and pause.
- **/develop: docs before merge** — Notion + PROJECT_SPEC + /extract-memory before merging to main.
- **Multi-field detail panel = RHF form + Save button** — NOT pencil-per-field inline editing. Single-field list items = inline OK.
- **Native input type="date" rejected** — Always use shadcn/ui DatePicker (Popover + Calendar).
- **Always test with local database** — Never point dev to production Supabase.
- **Always design bidirectional state transitions** — If deactivate exists, activate must too.
- **Collapsible panels: close button inside panel** — Not only external toggle.
- **Don't speculate future product layout needs** — Merged `gallery` + `editorial` product layouts into one (gallery). `display_layout` field kept in DB but LayoutSelector removed from CMS. WHY: second layout was speculative — add layout variants only when a concrete use case arrives, not to "leave room".
