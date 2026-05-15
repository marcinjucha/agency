# Project Memory: Halo Efekt

> Most patterns promoted to skills (`ag-notion-patterns`, `ag-n8n-step-handlers`, `ag-workflow-engine`, `ag-design-patterns`, `ag-dev-workflow`, `ag-coding-practices`, `tanstack-server`, `vps-n8n-patterns`) and CLAUDE.md files (root, `n8n-workflows/`, `apps/cms/features/`, `supabase/`, `packages/calendar/`). Last curated 2026-05-12 after ClickUp→Notion reverse migration.

## Production State

- **Tenant "Halo Efekt":** email `kontakt@haloefekt.pl`, id `19342448-4e4e-49ba-8bf0-694d5376f953`.
- **`email_configs` table empty in production** — n8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`).
- **`notification_email` per `survey_link`, not per tenant** — each link has its own notification address.
- **`surveys.status` DB column is vestigial** — status computed from `survey_links`. Manual enum management is wrong model.
- **`HALOEFEKT_TENANT_ID` is hardcoded in 12+ places — keep hardcoded, do NOT promote to env var.** UUID `19342448-4e4e-49ba-8bf0-694d5376f953` duplicated across migrations, n8n workflows, seed files, production code. Stable non-secret single-tenant identifier → hardcode is correct. Captured to forestall recurring "should this be in env?" debates.

## Active Architecture Debt

- **T-04 (`scheduled` trigger) MUST bundle TRIGGER_REGISTRY refactor — not separate cleanup** (2026-05-11). `trigger_type` duplicated across 10 locations (Zod schemas, switch statements, n8n Trigger Handler subworkflow, type unions, registry lookups, UI label maps). Acceptance criteria: (1) introduce `TRIGGER_REGISTRY` in `packages/database` or shared module, (2) migrate all 10 sites to read from registry, (3) THEN add `scheduled` as first registry-native trigger. Force-multiplier: unlocks S6 (drip emails), B5 (monthly report cron), B8 (speed guarantee SLA monitor) simultaneously.
- **Monthly Partner Report (B5) scope = BOTH HTML email AND PDF, NOT email-only MVP** (2026-05-11). User explicitly rejected "ship email-first, add PDF later" — B5 partners expect downloadable PDF artifact ("dostaję raport jak w korpo"). T-09 must deliver both rendering paths day one.
- **Tenant cascade deletion (T-15) replaces B7 sandbox at low client volume** (2026-05-11). At <10 simultaneous demos, dedicated sandbox is overengineered. Cheaper substitute: `DELETE FROM tenants WHERE id = ?` with ON DELETE CASCADE. Defer real sandbox infra (T-12) to P2.

## Email Templates Architecture (AAA-T-221, 2026-05-12)

- **`lead_scored` trigger is REGISTERED but has NO LIVE DISPATCHER post-AAA-T-63.** It exists in `TRIGGER_REGISTRY` (handler subworkflow, Zod schema, UI selector), but the only historical caller — the `Survey Response AI Analysis` standalone n8n workflow — was deleted in AAA-T-63. The `ai_action` step handler in the workflow engine does NOT dispatch `lead_scored` either (despite the name suggesting it might). Future agents adding docs MUST verify the dispatcher exists in code before attributing "Fired from: X" — wrong attribution silently lies to readers. Correct phrasing during cleanup: "Registered trigger; no live dispatcher (orphan post-AAA-T-63)".
- **Doc cleanup trap: replacing one ghost reference with another ghost reference.** During AAA-T-231 the stale `WORKFLOW_NODES.md` line "Fired from: Survey Response AI Analysis workflow" was rewritten to "Fired from: ai_action step" — which is ALSO false (ai_action doesn't dispatch lead_scored). Validator caught it. Rule for doc cleanup: when removing a stale attribution, GREP THE CODEBASE for the proposed replacement before writing it. If grep returns nothing, the honest answer is "no live dispatcher", not a plausible-sounding substitute.
- **`turbo.json` `globalEnv` accumulates dead entries even after source code cleanup.** Prior tickets removed `fetch()` calls referencing env vars but missed the build config allowlist. `globalEnv` is a SEPARATE cleanup target from `.env.example` / source — grep `globalEnv` array independently when retiring features. Symptom: turbo cache invalidates on env vars no code reads.
- **`Decide Replay Action` guard `prev.id === currentStepExecId` was status-blind — broke retry attempt counter.** In retry mode Orchestrator reuses existing latest-attempt row's ID, so guard fired on EVERY retry routing to `continue` instead of `new_attempt`. Symptom: `attempt_number` stayed at 1 after retry; no new audit row. Fix: narrow guard to `prev.status === 'pending' && prev.id === currentStepExecId`. Status is the only correct discriminator between "first execution" (pending) and "retry" (failed/cancelled). General rule: any guard preventing replay-row duplication MUST check status==='pending' with ID match.
- **`BLOCK_REGISTRY` Open/Closed proved highly effective for email block types** (`packages/email/src/blocks/registry.ts` + `apps/cms/features/email/block-registry.ts`). After refactor, adding 4 new block types (Heading, Image, Spacer, Columns) required ZERO changes to `BlockEditor`/`BlockList`/`EmailRenderer` — only new block files + registry entries. Rule: any NEW switch over `block.type` in this feature is a regression — extend the registry instead.
- **`getSummaryLine` switch survived the BLOCK_REGISTRY refactor — caught by architecture validator.** Rule when refactoring to registry pattern: grep for ALL `switch (block.type)` / `if (block.type === ...)` across the feature, not just the obvious dispatchers. Fix: added `getSummary(block)` field to `CmsBlockRegistryEntry`.
- **ESM module cycle `ColumnsBlock → EmailRenderer → registry → ColumnsBlock` is safe at runtime** because `renderBlock` is a value reference resolved only after all modules load. Don't refactor this cycle "for cleanliness" — it's load-bearing for recursive Columns rendering.
- **`DEFAULT_BLOCKS` was duplicated between `packages/email/src/types.ts` and `packages/email/src/defaults.ts` — silent drift risk.** Second export wins by source order; edits to `types.ts` version were SILENTLY dead. Rule: runtime constants in `types.ts` = code smell → relocate to `defaults.ts` or similar.
- **`createMediaProxyEditor` bridge enables `InsertMediaModal` reuse without a Tiptap `Editor` instance** (`apps/cms/lib/utils/media-proxy.ts`). Rule when an `Editor`-typed prop seems blocking: grep for `createMediaProxyEditor` before designing a parallel media picker.
- **Native `<input type="color">` inside Radix Popover is a P0 anti-pattern** — spawns OS dialog which steals focus and closes the Popover. Replace with `react-colorful` (already a project dep). Rule: any native input that opens an OS-level chooser is forbidden inside Radix Popover/Dialog/Dropdown.
- **`TextBlock` had unsanitized `dangerouslySetInnerHTML` pre-AAA-T-221** — pre-existing XSS. Fix: `sanitize-html` allowlist at renderer boundary. Rule: ALL block content that renders HTML must pass through a centralized sanitizer at the renderer, not at edit time.
- **Migration defensive design for pre-altered local DB columns**: use `ADD COLUMN IF NOT EXISTS` + explicit `UPDATE WHERE IS NULL` backfill. Never assume a clean slate in long-lived local databases (shared with main checkout across worktrees).

## Workflow Preferences (Email Templates session, AAA-T-221)

- **Validation-per-iteration discipline: run Phase 3/3b/3c after EACH iteration, not batched at the end.** This session batched Iter 1-3 and hit an 11-issue combined fix loop. Non-negotiable for M/L/XL tasks.
- **User "idz dalej, na końcu wszystko przetestuje" = Phase 4 manual testing deferred, NOT validation.** Validation (Phase 3/3b/3c) still runs per-iteration regardless. Only honor Phase 4 deferral when user explicitly requests it.
- **n8n `Decide Replay Action`: `cancelled` status routes to `new_attempt`, NOT `continue`.** Continue would overwrite cancelled row's status and destroy audit trail. Same logic for any "replay terminal status" branches — never reuse existing row when prior status is part of audit history.
- **`workflow_snapshot` JSONB may contain webhook auth tokens — sanitize before returning to UI.** `step_config.headers` on webhook steps can hold Authorization/Bearer tokens. `parseWorkflowSnapshot()` helper strips sensitive headers. Any new endpoint returning `workflow_snapshot` (or JSONB with user-supplied step config) MUST route through this helper.
- **`folder` param on `uploadImageToS3(file, folder)` was IGNORED by server entire pre-T-110 history.** Client passed `folder` but server hardcoded `UPLOAD_FOLDER_PREFIX='haloefekt/media'`. Apparent `blog/` vs `media/` S3 split NEVER existed. Future agents seeing param name might try to "restore" wishful-thinking split. Confirm bucket layout via `aws s3 ls` before assuming param-driven routing.
- **CMS NodeView download button: Tailwind `text-primary-foreground` CANNOT override UA `a:link` color inside Tiptap.** Browser UA `a:link { color: -webkit-link }` has equal specificity to class-inherited color through Radix Slot's `<Button asChild>` pattern, falls back to source order, UA wins. Fix: inline `style={{ color: 'hsl(0 0% 100%)' }}` on `<a>` element. Public-site `renderHTML` works because it emits inline style directly. Tailwind classes alone never fix anchor color in Tiptap NodeViews.
- **`/api/upload` route NEVER existed but `routes.api.upload` constant pointed at it for entire feature.** Pre-existing dangling constant. Primary upload (MediaUploadZone) calls `generatePresignedUrlFn` directly bypassing broken indirection. Rule: when adding `routes.*` constant, verify corresponding route file exists OR constant is consumed by something other than `fetch()`. Dangling fetch-target constants silently 404.
- **Old stash from another branch auto-applied during fresh worktree creation.** `pnpm install` in newly-created worktree triggered `git stash pop` (mechanism unclear — possibly stale `.git/hooks/post-checkout`), polluting worktree with regressions. Rule: in fresh worktree, FIRST `git status` BEFORE staging code. Restore unrelated dirty files via `git checkout HEAD -- <file>`. Also check `git stash list` — entries from other branches may pop unexpectedly.

## Workflow Preferences

- **Boy Scout for `useCallback`/`useMemo` is full-file, NOT partial.** Project rule "no manual memoization, React Compiler handles it" means when touching a heavily-memoized file, removing only NEW additions creates inconsistency. User explicit ("fix all"): full-file sweep is right when file is in active state. Safe because dynamic-import boundaries protect heavy renderers.
- **`useState` initializer reads `useSearch()` for deep-link auto-open — avoid `useEffect([], ...)` with eslint-disable.** When deep-linked URL param (`?execution=<id>`) should auto-open a panel on mount, prefer `const [panel, setPanel] = useState(searchParam ? 'history' : 'none')`. Initializer reads URL synchronously on mount → no flash, no eslint-disable.
- **TanStack Router URL writes for transient panel state MUST use `replace: true`.** Default `push` pollutes history when `?execution=<id>` updates as user clicks rows. Reserve `push` for genuine navigation transitions.
- **"Gramy long term" — architecture supports future extension even in MVP.** User-facing feature can be deferred (MVP cut) but architecture MUST NOT force rewrite. Cut UI surface, NOT structural decisions. Applied: T-209 chose Continuation-with-attempts so adding Fork later is purely additive.
- **N8n workflow changes MUST go through `n8n-builder.mjs` — never hand-edit JSON** (2026-05-09). Commands: `create-handler`, `add-route`, `regenerate-helpers`, `lint-helpers`. Edit canonical sources in `scripts/evaluators/*.js`, then `regenerate-helpers` — NEVER find/replace across nodes. Before committing: `npm run n8n:build -- lint-helpers` must exit 0.
- **Git history cleanup before merge: two paths.** Path A (all commits task-related) → `git reset --soft $(git merge-base HEAD main)` + re-commit in 5-7 layered groups. Path B (branch absorbed unrelated commits — sibling-feature merge bubble) → cleanup branch from `origin/main` + `git cherry-pick <unrelated>` + tree-checkout feature + regroup + `git merge --ff-only`. User rule (2026-05-09): "git reset wolno tylko do regrupowania commitów; nigdy do naprawiania zawartości plików."

## TanStack Start Server/Client Boundary

Full pattern in `tanstack-server` skill. Project-specific facts:
- **`.server.ts` strip is per-import-statement, NOT transitive.** Barrel imports with 5+ named imports from `./handlers.server.ts` AND runtime re-exports (`export { x } from './handlers.server'`) BLOCK the strip. Fix: dynamic `await import('./handlers.server')` inside createServerFn handler lambda + async wrapper functions for runtime re-exports. Type-only re-exports stay top-level.
- **Cross-feature `from '@/features/Y/server'` imports propagate transitively.** When diagnosing `node:async_hooks` crashes in feature X, also check whether components of X import cross-feature from `feature Y/server` — Y can be the real offender.
- **Decision tree for new feature server.ts imports:** Direct leaf 1-4 imports → top-level OK. 5+ named imports from `.server.ts` barrel → DYNAMIC import inside lambdas. `export { x } from 'foo.server'` (runtime re-export) → ASYNC WRAPPER function. Type-only → always top-level OK.

## Worktree Gotchas (AAA-T-63 residual)

- **Supabase CLI is keyed off MAIN checkout dir name.** `pnpm db:types` and `pnpm supabase migration up` from worktree fail because local Supabase Docker container is named `supabase_db_<main-dir-name>`. Workaround: `docker exec -i supabase_db_<dir> psql -U postgres -d postgres < <migration>`, regenerate types from main checkout.
- **Cross-worktree `types.ts` mismatch requires `as unknown as` cast bridge.** When worktree migration adds a column, worktree's `node_modules/@agency/database` symlinks to MAIN's `types.ts` (unchanged until merge). Use `as unknown as { newColumn: ... }` cast with `// AAA-T-* bridge until merge` comment.
- **Booking real-flow E2E requires BOTH `pnpm dev:website` AND `pnpm dev:cms` running locally.** Website POSTs to `${CMS_BASE_URL}/api/workflows/trigger` (default `localhost:3001`). If CMS dev server isn't running, dispatch fails with ECONNREFUSED — n8n never reached. Diagnostic is in website dev log, NOT n8n UI. Test mode (CMS UI button) uses different path so "test mode works" does NOT prove "real-flow booking dispatch works".

## n8n Staging Diagnostics

- **n8n staging has a REST API for read verification.** `X-N8N-API-KEY` header against `https://n8n-staging.trustcode.pl/api/v1/workflows/{id}`. Credentials in `n8n-workflows/.env.local`. Useful for diff staging vs local Code-node body, list active workflows, check `updatedAt` timestamps. NOT a replacement for manual UI re-import (credential refs drop on import). PUT writes untested.

## Reverse Migration Notes (2026-05-12)

- **Project migrated back from ClickUp to Notion** — Notion Agency Database is primary tracker again. ClickUp deprecated (2026-05-09 → 2026-05-12). `ag-clickup-patterns` skill deleted. ClickUp references in older entries above are historical.
- **Filesystem bridge mandatory for content-heavy MCP-to-MCP migrations regardless of size.** Even ~3 KB payloads must go through disk file (e.g. `/tmp/<migration>/...md`). Inline-summarizing content in orchestrator prompt is silent information loss only detectable when user reads result. ALWAYS write raw payloads to disk and have writer-subagent read from there.

## Tooling Gotchas

- **Notion MCP `notion-fetch` on `collection://` URLs returns schema/metadata ONLY, not task items; `view://` URLs return 400 (unsupported).** Orchestrator cannot enumerate Notion tasks inline from a collection URL — it gets database schema (properties, IDs) but no rows. To list tasks, either (a) use `notion-search` with text query + filter, or (b) spawn `ag-notion-agent` which knows the correct fetch/search sequence. Burned cycles on AAA-T-231 trying to read AAA-P-* task lists directly via collection URL.

## Workflow Preferences

- **Doc-only / config-only tasks: skip manual test instructions — automated grep + build verification is sufficient.** When a task has no UI surface, no business logic, no runtime behavior change (e.g. removing dead `globalEnv` entries, deleting stale doc references), user explicitly does NOT want a "Phase 4: open the app and click X" checklist. Default to `grep`/`rg` proof that the change took, plus `pnpm build` / `turbo build` exit 0, and call it done. User signal: "sam to zrobc" (do it yourself) when presented with manual test steps for a pure docs/config change.

- **Scope freeze after "ok": execute EXACTLY what was proposed, nothing more.** When the user responds "ok" / "ok lecę" / similar to a multi-step proposal, execute the literal command(s) named. Any of the following require a FRESH explicit ask — they do NOT belong in the same turn as the "ok":
  - **Parameter changes** (different base, different flag, different scope path) — re-confirm even when the change seems trivially safer.
  - **Boy Scout additions** — modifying files outside the literal proposal (especially cross-package: `packages/ui`, `lib/`, `supabase/`) is a separate ticket / separate ask.
  - **Cascading "fix all" interpretations** — preferences like "fix all", "Boy Scout Rule", "no Co-Authored-By" are guidelines for what to PROPOSE next time, not blanket consent to bundle additional scope into the current "ok".

  **Why:** AAA-T-221 final cleanup (2026-05-15) — user said "ok" to `git reset --soft $(git merge-base HEAD main)` + 3-group recommit; I executed with a different base (`f23ecea` instead of merge-base), reverted unrelated `packages/ui/src/components/ui/collapsible-card.tsx` as Boy Scout cleanup, AND pre-committed validator's i18n fixes as a separate commit `488fb64` — all in one turn under a single "ok". User: "dzialasz bez mojej zgody, wtf".

  **How to apply:** before executing each tool call following an "ok", check: does this match the LITERAL text of what I proposed? If any parameter / file path / additional file differs, STOP and re-confirm with a one-line question naming the specific deviation.
