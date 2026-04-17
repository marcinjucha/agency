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
- **Worktree folder names include descriptive slug, not just task ID (2026-04-17)** — Mirror branch naming: `worktree-aaa-t-205-oleg-cookie-privacy` over `worktree-aaa-t-205`. WHY: multiple worktrees in flight → can't tell which is which at a glance; the ID alone is meaningless without looking up Notion.

## Bugs Found

- **supabase gen types prepends "Initialising login role..."** — Corrupts types.ts. Workaround: `grep -v "^Initialising"`. `db:types` uses --local, need --linked when local not running.
- **`inputValidator(zodSchema)` direct form silently fails in TanStack Start** — Must use function wrapper: `.inputValidator((input) => schema.parse(input))`. WHY: RPC layer doesn't invoke `.parse()` on raw schema objects. Recurs across features.
- **Vercel "no output files found" warning with Turborepo + TanStack Start** — Fix: set `"outputs": []` in turbo.json build task. WHY: TanStack Start writes to `/vercel/output` (outside workspace), not `.output/` in workspace — Turbo's default output capture finds nothing and warns. Empty array disables capture.
- **`JSON.stringify(data.description)` migration residue from Next.js Server Actions** — Silently double-encodes Tiptap JSON in TanStack Start, storing a string in JSONB instead of an object. `typeof === 'object'` guard in `toShopProduct` then returns null silently on reload. WHY: Server Actions serialized payloads; createServerFn does not — stringify is now redundant and corrupts data. Audit all server-fn mutations post-migration for leftover stringify calls on JSONB fields.
- **TanStack Start `tsr-split` virtual chunk does NOT invalidate on HMR** — When imports are removed from a route file, the split component chunk is not regenerated until full dev server restart. Symptom: removed component still renders. WHY: component split is a build-time virtual module; HMR only tracks the route file, not the derived chunk.
- **CategoryManager grid view missing CardEditForm render path** — Editing state existed but grid branch had no render for it (only list view had InlineEditRow). WHY: when adding inline edit to one view branch, always verify the other view branch renders edit state too. Pattern: if `editingId === item.id` branches exist in one view mode, they must exist in all view modes.
- **Native `<input type="color">` breaks inside Radix Popover** — OS color dialog steals focus → popover closes mid-pick. Fix: use `react-colorful` `HexAlphaColorPicker` inline. WHY: native picker spawns OS-level modal outside React tree; Radix onInteractOutside treats it as outside click.
- **`.focus()` in Tiptap command chain closes Popover during drag** — `editor.chain().focus().setColor(c).run()` on each react-colorful onChange (fires on mouse drag) steals focus from Popover trigger → popover unmounts mid-drag. Fix: drop `.focus()` from chain — Tiptap preserves selection even without DOM focus. Re-focus only after popover closes.
- **`editor.isActive('mark')` returns stale value without subscription** — Reading in render without subscribing gives value from last render, not current editor state. Fix: use `useEditorState({ editor, selector: ctx => ctx.editor.isActive('mark') })` — Tiptap v3 reactive subscription to editor transactions.
- **Tiptap v3: `Color` + `TextStyle` moved into `@tiptap/extension-text-style`** — Standalone `@tiptap/extension-color` package is obsolete in v3. Import `{ Color, TextStyle }` from `@tiptap/extension-text-style` as named exports. Vite `.vite/deps/` cache does NOT invalidate when import specifier changes (default → named) — manual delete + dev server restart required.
- **Tiptap v3.22 `setContent` API change** — `setContent(content, false)` deprecated → `setContent(content, { emitUpdate: false })` (options-object form). Old form silently no-ops on `emitUpdate`.
- **Adding newer @tiptap/* subpackage upgrades ALL @tiptap peers** — Installing `@tiptap/extension-highlight@3.22.3` alongside existing `^3.20.4` resolves the whole family to 3.22.3, exposing latent type errors in previously-working files. Pin all @tiptap/* to same version explicitly when bumping.
- **pnpm worktree + main share node_modules** — Lockfile install in either checkout affects both. Git worktree's `preview_start` from main's `.claude/launch.json` always spawns vite from main checkout path, not worktree. Start vite manually from worktree directory for worktree-local dev server.
- **Bash `cd` persists pwd across subsequent tool calls (2026-04-17)** — `cd` in one Bash call changes working directory for ALL subsequent Bash calls in the session. Caused accidental commit to `main` instead of the worktree (had to `git reset --soft HEAD^`). WHY: most tools (Read, Edit, Write) are absolute-path so pwd doesn't matter — only Bash carries state. Fix: use absolute paths in every `git`/`pnpm`/etc. invocation (`git -C /path/to/worktree ...`), never rely on an earlier `cd`.
- **`git worktree remove --force` kills live dev servers with SIGABRT/exit 134 (2026-04-17)** — Vite segfaults when its working directory vanishes underneath it. Correct order: kill dev servers first, THEN remove the worktree.
- **`git clean -fd` silently deletes untracked directories with no dry-run prompt (2026-04-17)** — Wiped `apps/shop/jacek/src/` (untracked, never in git history) with zero recovery path. Always run `git clean -fdn` (dry-run) first and read the output.
- **Double-wrapped `inputValidator` schemas create confusing call sites (2026-04-17)** — `z.object({ data: X })` as the inputValidator schema makes the call site read `fn({ data: { data: values } })`, which looks like a triple-wrap bug. Use flat `inputValidator((v: z.infer<X>) => X.parse(v))` + `fn({ data: values })` — eliminates the entire class of confusion.

## Domain Concepts

- **Tenant "Halo Efekt" in production** — email: kontakt@haloefekt.pl, id: 19342448-4e4e-49ba-8bf0-694d5376f953.
- **email_configs table empty in production** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`).
- **notification_email per survey_link, not per tenant** — Each link has own notification address.
- **surveys.status DB column is vestigial** — Status computed from survey_links. Manual enum management is wrong model.
- **Condition evaluator operators** — >=, <=, !=, ==, >, <, contains, in. NO single `=`. No `{{ }}` wrappers on field names.
- **Baikal CalDAV has 2 calendars** — tsdav auto-discovers "Appointments" + "Default calendar". Must filter.
- **Nil UUID fallback for Supabase filters** — `?? '00000000-...'` prevents PostgreSQL UUID parse errors on null values.

## Architecture Decisions

- **Three-layer persistence for conventions (2026-04-17)** — memory.md alone doesn't enforce behavior. Durable conventions require (1) `memory.md` for interactive context, (2) the specific slash-command markdown (e.g. `ag-develop.md` worktree phase) for that flow, AND (3) the relevant skill SKILL.md for all agents loading it. Duplication across layers is a feature — each catches a different invocation path (human chat vs `/command` vs subagent loading a skill).
- **Shop feature porting jacek↔oleg follows a 3-commit shape (2026-04-17)** — AAA-T-205 (oleg legal/cookie) mirrored AAA-T-203 (jacek) as: commit 1 = pre-existing feat carried over, commit 2 = feat(footer privacy link + /produkty redirect), commit 3 = fix(tenant_id filter on legal server fn). Same structure both shops. Rule-of-three trigger: if `apps/shop/tata/` lands with the same port, extract `packages/shop-legal/` with shared CookieBanner + LegalPageContent + getTenantId helper rather than copy-paste a third time.
- **Cross-project update rule** — AAA-P-9 tasks affecting shared tables/packages require updating BOTH PROJECT_SPECs.
- **app_config table for encryption key** — Supabase Cloud blocks ALTER DATABASE SET for custom GUCs. `app_config` table + `get_encryption_key()` SECURITY DEFINER.
- **n8n Orchestrator owns ALL execution** — CMS trigger route = ~70 LOC fire-and-forget. WHY: Vercel serverless timeout can't handle multi-hour workflow delays.
- **Cross-site brand tokens via `color-mix(var(--color-X))` in inline style** — Editor (shared CMS package) emits marks with inline `style="background-color: color-mix(in srgb, var(--color-primary) 30%, transparent)"` rather than class names. Each consuming site (website, shop/jacek, shop/oleg) resolves `--color-primary` to its own brand token. WHY: zero coupling editor ↔ consumers, no Tailwind class allowlist needed, preset swatches stay theme-aware across shops.
- **`useEditorState` is the Tiptap v3 way to subscribe** — For reactive `isActive`/`can()`/mark-attribute reads, wrap in `useEditorState({ editor, selector })`. Don't call `editor.isActive()` directly in render — stale value, no re-render on transactions.
- **react-colorful for inline color pickers (not native `<input type="color">`)** — Inline Popover-friendly, drag events don't trigger OS modal, works inside any portal/overlay. Pairs with preset swatch grid for token-mapped quick picks + custom hex/alpha.
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
- **`text-muted-foreground` reserved for secondary UI, never body copy** — main paragraphs, bio intros, product descriptions MUST use `text-foreground`. `text-muted-foreground` is only for eyebrow labels (e.g. "CENA", "O AUTORZE"), figcaption, footer copyright, tag chips, empty states, and citation/source lines. WHY: classifying body copy as muted on a dark theme makes the whole page read "greyed out" even when contrast ratios pass AA — hierarchy collapses because secondary and primary tiers visually merge. Discovered 2026-04-17 after three rounds of iteration on shop/jacek contrast: the fix wasn't token lightness, it was four components misusing the muted class on main body paragraphs.
- **Reading column width = `max-w-4xl` (896px) across all long-form views** — Public prose (legal, blog article, product description), CMS editors (blog, shop-products, legal-pages), and the entire survey flow (SurveyForm → success → CalendarBooking) all use `max-w-4xl mx-auto`. `.product-prose--editorial` CSS matches at 56rem. WHY: single reading width prevents visible column-width jumps between related screens (survey → booking especially). `max-w-lg` still fine for short inline constraints (e.g., a one-line thank-you paragraph inside a Card). Use Tailwind's scale (`max-w-4xl`) over arbitrary `max-w-[896px]` — consistent with the rest of the codebase and easier to scan.
