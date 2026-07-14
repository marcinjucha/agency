# Email Template · Variable · Theming Architecture — Target Design

> Design output of a 5-member design council + 3-reviewer cross-review (2026-07-13). Status: **design ratified; implementation phased (see Phasing).** Companion to [`THEMING_DESIGN.md`](./THEMING_DESIGN.md) (the theme/token layer) — this doc covers how email **templates**, **variables**, and **theme selection** fit together as the agency moves OFF the n8n workflow engine (→ Claude API + MCP).
>
> This is the reference. It names the full long-term target AND the deferred roadmap so implementation stays forward-compatible. Nothing here is built yet unless a Phase marks it done.

## Why this exists

The agency is retiring the workflow engine. Today's email system was shaped around that engine, and it shows:

1. **Variables are defined for the workflow, not the template.** The authoritative variable catalog is keyed per *trigger type*, and `{{token}}` substitution happens **inside n8n**, not in this repo.
2. **Two render entry points diverge.** CMS templates (`email_templates`) are consumed only via workflow → n8n; the venture bonus email bypasses the editor entirely (hardcoded blocks in code, sent from the app).
3. **Theme in a template is tenant-only.** You cannot pick a theme per template; it inherits the tenant's global theme.

The user's asks: (1) **select a theme in an email template** and get its colors; (2) **rethink variable definition** post-workflow; (3) design a template as a **reusable container** and plug context data (campaign bonuses, survey fields) into it. This design answers all three while respecting that the substitution mechanism (n8n) is being deprecated — so we do NOT invest in deepening the n8n-coupled path.

> **Ask #3 — clarified by the user (2026-07-13): MANUAL fixed variable slots, not automatic collections.** The "reusable container" is a template authored with a **fixed set of named variable slots** — e.g. `{{bonus_1_title}}`, `{{bonus_1_url}}`, `{{bonus_2_title}}` — that are filled per send. It is explicitly **NOT** an auto-iterating list over a dynamic collection. "Simple, even if more manual work up front." This is a deliberate simplicity choice and it **collapses most of the complexity**: no `repeater` block, no `expandTemplate`, no render-at-send template class needed. A container is just a **flat** template + variable substitution (Layer 4). Auto-collection/repeater returns only as a far-future "only-if" (see Deep-deferred).

> **Process — per-phase `/council` (user, 2026-07-13):** before implementing ANY phase below, run `/council` on that phase to refine the implementation details. The design here is the target; each phase gets its own deliberation before code.

## Current state (verified in code, 2026-07-13)

| Concern | Where | Fact |
|---|---|---|
| Variable catalog (authoritative) | `apps/cms/lib/trigger-schemas.ts:84` | `TRIGGER_VARIABLE_SCHEMAS`, keyed **per trigger type**; built "for workflow"; `satisfies keyof Payload` compile bridge at `:57`. n8n does **not** import it. |
| Variable list (per-template) | `email_templates.template_variables` JSONB · `features/email/components/VariablesEditor.tsx` | Free-text, user-managed, `source:'manual'`. Does NOT read the catalog. No resolvability guarantee. |
| Substitution | `n8n-workflows/scripts/evaluators/resolve-variables.js:39` | Happens **in n8n**, on the baked `html_body`. Unresolved `{{key}}` → left as literal in the delivered email. **No HTML escaping** — attacker-supplied survey answers flow into HTML unescaped (live gap). |
| Template consumption | `features/workflows/handlers.server.ts:178` | `email_templates` consumed **only** via workflow → n8n (`getEmailTemplatesWithBodyHandler`). |
| Bonus email | `features/venture/mail/bonus-email.ts` · `features/venture/ingest.server.ts` | **Bypasses templates.** Hardcoded 6-block array, PL copy in code, its own `escapeHtml` at `:43`, renders fresh per send via `renderEmailBlocks`, sent from the **app** (service-role, not n8n). |
| Theme in templates | `features/email/utils/resolve-tenant-theme.server.ts:28` | **Tenant-scoped only.** `resolveTenantThemeMap` reads `tenants.theme_id/theme`; already resolves `theme_id → so_themes.tokens` via `lib/theme/fetch.server.ts`. No per-template theme column/picker. |
| Theme bake | `features/email/server.ts:267-270`, `:326-327` | `html_body` is baked with resolved hex **at SAVE**; `{{tokens}}` left literal for n8n. |
| Resolver | `lib/theme/resolve.ts:121` | `resolveClientTheme({tenantTheme, clientTheme, campaignTheme?})` — pure, never-throws, precedence campaign→client→tenant→{} + backfill; WCAG header-pair guard at `:168` (header pair guarded; body/CTA not). |
| Grants | migrations `20260311000000` vs `…130000/140000/150000` | `email_templates` has a **table-level** authenticated grant (NOT the column-scoped allow-list that `so_clients`/`so_campaigns` use) → a bare `ADD COLUMN` is auto-visible, no re-assert. Not anon-readable. |
| Repeater/loop block | `packages/email` | **Does not exist.** Container precedent: `ColumnsBlock` recurses via `renderBlock` (`ColumnsBlock.tsx:29,75,85`). |

## The load-bearing decomposition: two orthogonal axes

Everything flows from separating two axes that must **never invert**:

- **THEME axis — static, save-time-safe, literal hex.** A template's theme is known when the template is authored/saved. It can be baked into `html_body` at save.
- **VARIABLE axis — dynamic, send-time, per-recipient.** Values (`{{clientName}}`, a bonus list) are only known at send. They are substituted into the baked HTML at send.

Colors are literal hex in the string **before** any variable is touched; a `{{token}}` must never resolve to a color. Disjoint namespaces, sequenced: **bake theme at save → substitute variables at send.**

## Target architecture — five layers

```
Storage      email_templates.theme_id → so_themes ; blocks JSONB (may hold repeater markers) ; template_variables JSONB ; (later) bound_contexts
   │
Resolver     resolveClientTheme(...) — PURE, UNCHANGED. Caller swaps the read: template.theme_id ?? tenant.theme_id → so_themes.tokens
   │
Render       renderEmailBlocks(blocks, themeMap) — UNCHANGED. Two template CLASSES:
             • flat        → bake html_body at SAVE (hex + literal {{tokens}})
             • structural  → render at SEND (html_body = preview-only, NEVER sent); expandTemplate(blocks, data) first
   │
Substitution substituteTokens(html, values) — PURE, in @agency/email, MANDATORY HTML-escape. Applied at SEND on baked html_body
   │
Send         gated createServerFn: resolve context values → substitute → send (Resend/Gmail). n8n keeps its own substitution for live triggers
```

### Layer 1 — Storage

- **Per-template theme = one nullable FK.** `email_templates.theme_id uuid REFERENCES so_themes(id) ON DELETE SET NULL`. NULL = inherit from send context (tenant, and later campaign/client). This **mirrors** `tenants/so_clients/so_campaigns` exactly.
  - **NO inline `theme` JSONB on the template, NO "source mode" enum.** Those would be a *second source of default-truth* that drifts from the resolver — explicitly forbidden by migration `20260711130000`'s reasoning. One truth: the resolver owns fallback; `theme_id` present = pin, NULL = inherit.
  - **NO grant re-assert.** `email_templates` uses a table-level authenticated grant, so `ADD COLUMN theme_id` is auto-visible. (This is the `tenants` case, NOT the `so_clients` column-scoped allow-list trap.) `so_themes` is authenticated-only; a template's `theme_id` never leaks a theme to anon.
- **Container = manual variable slots, NO new storage (chosen).** Per Ask #3's clarification, a "container" template holds fixed named variable slots (`{{bonus_1_title}}`, `{{bonus_1_url}}`, …) authored directly into normal blocks. These are just variables — nothing special persists; the flat-template path (bake theme at save, substitute at send) covers it entirely. *(Feasible once Layer 4 substitution exists.)*
- **~~Auto-collection marker~~ — DEEP-DEFERRED (only if auto-listing is ever needed).** The repeater form `{ type: 'repeater', source, itemChildren, emptyChildren }` in `blocks` JSONB (zero schema change, reuses the `ColumnsBlock` recursion precedent) is the shape IF a template ever needs to iterate a dynamic-length collection instead of manual slots. Not on the near/mid roadmap given the manual-slot decision.
- **NO context-binding column.** Binding a template to a campaign/survey is a per-**send** fact, not a template attribute — a persisted `campaign_id` would make a template 1:1 with a campaign and kill reusability, the opposite of ask #3.
- **`bound_contexts: ContextKey[]`** (in `template_variables` JSONB or a sibling column) — declares which usage-contexts a template may be sent from, so the editor can compute the resolvable-variable union. *(Phase 3, part of the variable-registry work.)*

### Layer 2 — Resolver (pure, unchanged)

`resolveClientTheme` / `resolveTenantThemeMap` stay pure/never-throws. **Only the caller changes:** resolve `template.theme_id ?? tenant.theme_id` → `so_themes.tokens` via the existing `lib/theme/fetch.server.ts` (never-throws, inline fallback), then feed the resulting hex `themeMap` to the renderer.

> **Rejected:** extending the resolver signature with a `templateTheme` parameter (it would stop being "pure/unchanged"). The template tier is resolved at the **caller** by choosing which id to fetch, keeping the resolver identical to what client-theming shipped.

### Layer 3 — Render: two template classes

Given the manual-slot decision for Ask #3, **the flat class covers everything on the near/mid roadmap** — including the "container" (fixed variable slots) and per-template theme. The structural class is retained in the design only as a deep-deferred option.

- **Flat class (today's model, keep — the ONLY class we build now):** static theme, fixed variable slots, no runtime collection. Bake `html_body` at SAVE with resolved hex + literal `{{tokens}}`; substitute variables at SEND. Preview == stored == sent. Covers every current CMS template, the new per-template-theme feature, AND the manual-slot container.
- **~~Structural class~~ — DEEP-DEFERRED (only with an auto-collection need):** contains a `repeater`, so it depends on send-time collection data. `html_body` becomes **preview-only and NEVER sent**; the send path runs a pure `expandTemplate(blocks, data): Block[]` (resolves the collection `source`, clones `itemChildren` per item with item-scoped `{{item.*}}`, recurses — mirroring `ColumnsBlock`) then hands concrete blocks to the **unchanged** `renderEmailBlocks`. Not built unless auto-listing is genuinely required.

`renderEmailBlocks(blocks)` with no data passed stays byte-identical → client-theming's guarantees hold.

### Layer 4 — Substitution (pure, one util, escape mandatory)

- **`substituteTokens(html: string, values: Record<string,string>): string`** — pure, zero-dep, in `packages/email`. Importable from vitest AND from the n8n evaluator JS. **HTML-escaping is non-optional inside it.**
- Promote `bonus-email.ts:43 escapeHtml` into `@agency/email` and make it the mandatory escape inside `substituteTokens`. This closes the verified live gap (n8n injects `String(value)` with no escaping).
- **Flat class:** applied at SEND on the baked `html_body` string — byte-for-byte what n8n does today, so the `html_body` contract is unchanged.
- **Structural class:** `{{item.*}}` resolved during `expandTemplate`; scalar `{{tokens}}` via the same util on the rendered output.
- **Missing-token behavior must match n8n exactly** (leave-literal) so app-sent and n8n-sent renders are identical during transition. Pin with a golden test. Single-pass, escape-first (so a value containing `{{...}}` is not re-processed).

### Layer 5 — Send

- A **gated** `createServerFn` (new app-owned send path): resolve context values from the send context → `substituteTokens` → send via the existing Resend/Gmail path (`features/venture/mail/resolve.server.ts`).
- **The send fn MUST have its own `hasPermission` gate** (`requireAuthContextFull()` + `hasPermission(...)`). Route-map gating does NOT protect `createServerFn` endpoints (recurring project gotcha; see `memory.md` Authz).
- **n8n is NOT ripped out.** Live triggers keep reading the same baked `html_body` and n8n keeps substituting with identical (now shared-escape) semantics. Retire n8n **per trigger**, never big-bang. Back-port the shared escape into `scripts/evaluators/resolve-variables.js`.

## Variables — target model (Phase 3, gated)

Ratified target, built only when the Claude-API+MCP executor is designed (it defines where values come from post-n8n):

- **Source of truth = typed `CONTEXT_PROVIDERS` registry keyed per usage-CONTEXT** (`campaign`, `survey`, `booking`, `client`, `manual`), each declaring its typed variable set via the `satisfies keyof Payload` pattern already proven in `trigger-schemas.ts:57`. Per-*trigger-type* was the wrong axis — the same data (`clientName`, `companyName`) recurs across triggers; per-*context* deduplicates and matches how the agency now thinks.
- **Resolvability contract:** a template declares `bound_contexts`; the union of those contexts' typed keys is the allowed variable set; an unknown key is a **save-time warning in the editor**, while the runtime keeps literal-fallback as the safety net. The editor becomes the design-time gate.
- **User-defined variables = the `manual` provider** (genuine free-text escape hatch), value from a stored `defaultValue?` on the variable OR injected by the calling context at send. The Claude-API/MCP caller becomes just another context provider supplying a typed `values` object — same contract as a trigger, no special-casing.
- **n8n stays working during migration** because it reads a flat context **by key name** and does not import the catalog — so the CMS registry can be restructured freely as long as emitted key names stay identical; `getTriggerVariables()` becomes a thin adapter mapping legacy trigger types onto the new context providers.
- **Cheap slice takeable earlier (executor-agnostic):** a save-time "unknown variable" warning + `defaultValue?`, since they mitigate the literal-leak independently of the executor.

## Theme selection UX (Phase 1)

- **Reuse the existing `features/themes` `ThemePicker`** (controlled, multi-level inherit/own, searchable swatch combobox, inline "+ new theme", always-visible "effective theme" chip). Add it as a **template-settings** section (not per-block): `theme_id` NULL = inherit tenant, else a named `so_theme`.
- **Coexists with the per-block `ThemeTokenSelect`:** the template picker chooses WHICH theme map feeds everything; the per-block control picks a token slot within that map. The seam is `useResolvedEmailTheme` — repointed from tenant-only to `template.theme_id ?? tenant`. Swatches + live preview re-render off the picked theme automatically.
- **Contrast:** header pair is already WCAG-guarded in the resolver; surface a body/CTA contrast **warning** in the theme authoring surface (`features/themes` ThemeEditor) + a preview-time badge. Email can't rely on `prefers-color-scheme`, so baked hex must be self-sufficiently legible.

## Feature-interaction map

| Feature | Current send path | Target |
|---|---|---|
| Venture campaign **bonus** | app-owned, hardcoded blocks, `resolveClientTheme` (`ingest.server.ts` → `bonus-email.ts`) | **Keep app-owned.** Shares the escape util (Phase 2). Phase 3: may become a **flat** CMS template with manual bonus slots (no repeater) — editable, themed, filled from the campaign at send. |
| Surveys/intake **form_confirmation** | fires trigger → n8n reads `html_body`, substitutes, sends | n8n for now; gets per-template theme for free (app bakes `html_body`). Candidate for app-owned send after the executor spike. |
| **booking_confirmation** | n8n template path | Same as form_confirmation. |
| **booking_reminder** | n8n, uses Wait/delay node | **Stays on n8n permanently** — delayed send needs the Wait node; Vercel's ~10s timeout kills app-side delay. |
| **lead_scored** | internal trigger; rarely an email | Not an email-template consumer by default. |

## Phasing

> **Every phase runs `/council` first** (user directive, 2026-07-13) to refine implementation details before any code is written.

- **Phase 0 — permissions i18n for themes (tiny, independent, NOW).** `design.themes` logic + server-gate already exist; add `messages.permissions.design` + `design.themes` labels and ensure the `design` group appears in `PermissionPicker` (it currently renders the raw key / may be omitted). This is the "forgot themes in permissions" item. Separate branch/commit.
- **Phase 1 — per-template theme selection (Ask #1, urgent).** After client-theming merges untouched, on a new branch: `email_templates.theme_id` FK (additive migration, `ON DELETE SET NULL`, no grant re-assert) + caller-side `template.theme_id ?? tenant.theme_id` wiring + reuse `ThemePicker` at template level. Keep baking `html_body` at save. Delete-guard on `so_themes` already exists.
- **Phase 2 — substitution engine + escaping (real security fix, executor-agnostic).** `substituteTokens` + promoted `escapeHtml` pure exports in `@agency/email`, mandatory escape, golden test byte-identical to n8n's replace. Bonus email adopts the shared escape util immediately. New app-send `createServerFn` gets its own `hasPermission` gate. Back-port shared escape to the n8n evaluator. n8n NOT removed.
- **Phase 3 — manual-slot container + bonus as a flat CMS template (feasible after Phase 2, no repeater).**
  - Author the bonus email as a **flat** `email_templates` row with fixed named bonus slots (`{{bonus_1_title}}`, `{{bonus_1_url}}`, …) filled at send from the campaign context. Editable in CMS, themed via `theme_id`, no repeater/render-at-send. This delivers Ask #3 the way the user wants it (manual, simple).
  - Migration of the current hardcoded bonus onto this flat template: preserve the byte-identical regression test (retarget to seed-render fidelity); note it changes behavior from "auto-list all published bonuses" to "N manual slots" — confirm that product change in the phase's council.
- **Deep-deferred — ratified target, no trigger yet.**
  - `CONTEXT_PROVIDERS` registry + `bound_contexts` + save-time unknown-variable warning (gated on the Claude-API+MCP executor design spike; the cheap warning slice may land earlier).
  - Render-at-send template CLASS + `repeater` block + pure `expandTemplate` — ONLY if an auto-iterating dynamic-length collection is ever genuinely needed (the manual-slot decision removes this from the near/mid roadmap).

## Open gaps to track (raised in cross-review; none block Phase 1–2)

1. **Theme-edit invalidation.** Editing a `so_themes` row does not re-bake the `html_body` of flat templates that consume it → stale colors. (This already exists today for the tenant theme; low-frequency, single-tenant.) Mitigation deferred: a "re-bake consumers on theme edit" fan-out job, or move flat-class render to send-time. Document as a known limitation until then.
2. **Send-time failure handling.** Moving render/substitution to send adds throw sites (`expandTemplate`, `substituteTokens`, `fetch.server`). Define: silent-drop vs dead-letter vs retry, and **idempotency** (Vercel retry ⇒ double-send). Bonus email's existing try/catch (error logged, request not failed) is the current precedent.
3. **Send-path authorization.** Escaping stops HTML injection, not content abuse. The new send `createServerFn` needs its own server-side permission gate (route map is not enough).
4. **Multi-theme demand reality check.** The whole `so_themes`-library apparatus serves ONE tenant today. Confirm the library is actually exercised before deepening it.
5. **Locale/i18n axis.** Theme/template/variable resolution all assume a single language. No locale dimension — a latent rewrite if a second language appears.
6. **Preview ≠ inbox fidelity.** Browser preview ≠ mail-client rendering (Outlook/Gmail CSS quirks). Add golden/snapshot HTML tests to protect the baked-hex contract across changes — the one guardrail nobody has.

## Rejected / not-doing

- Extending the resolver signature for the template tier (caller-side id selection instead — keeps the resolver identical to client-theming).
- Inline `theme` JSONB or a "theme source mode" enum on `email_templates` (second source of default-truth).
- Persisted context-binding column (kills template reusability).
- Big-bang removal of n8n substitution (retire per-trigger).
- Building the full `CONTEXT_PROVIDERS` registry against the to-be-retired n8n executor (YAGNI; gated on the new executor design).
- **Auto-iterating collections / the `repeater` block / render-at-send class** — deep-deferred. Ask #3 is delivered by **manual fixed variable slots** on a flat template (user's explicit "keep it simple" choice); the repeater returns only if dynamic-length auto-listing is ever genuinely required.

## Email sending model — surface-and-defer (council 2026-07-14)

Follow-on design (4-member council) answering "is a unified email control worth it?" for the felt heaviness of choosing/using emails. **Verdict: NO unified control (overengineering at this scale) — surface the connections, defer the model.** The send-time wiring is already sound and centralized: `sendBonusEmail` / `CampaignRow` (`features/venture/ingest.server.ts`) is a de-facto "sending context" that resolves template + sender + theme + values. The pain is that these 5 surfaces are authored across 4 unconnected nav destinations with no cross-references — a **surfacing** gap, not a re-architecture.

**Sending context = a resolution chain across tiers** (each concern owned at a different tier): template → tenant (`email_templates` `(tenant_id,type)`); sender → client (`resolveMailSender(so_clients.mail_provider)`); theme → campaign→client→tenant (`resolveClientTheme`); values → code by template slug (`APP_SENT_VARIABLE_SOURCES`).

**BUILD NOW (read-only, zero schema):** a `CollapsibleCard` "Ten launch wysyła" on the campaign editor —
- **Effective sender** computed via the SAME `resolveMailSender` (not reimplemented), behind its own `createServerFn` `hasPermission` gate; **amber note when it silently falls back to the shared agency account** (`noreply@haloefekt.pl`) — the one invisible hazard.
- **Effective theme** chip (resolver exists) + **read-only "wysyła szablon: `venture_bonus`" label + deep-link** to the template editor. Chips/labels, NOT editors (editing stays at source: template in `/admin/email-templates`, sender in `VentureClientEditor`).
- **Sample-data preview** toggle in the email editor: fill only code-known tokens (`app`: companyName; `structural`: bonus_list → sample block); leave `workflow`/`unresolvable` tokens BRACKETED (never fabricate values — the honest "won't be filled" signal must survive).

**ALREADY SHIPPED (bank as the answer to "variables confusing"):** per-variable provenance badge + unresolvable warning (`resolve-variable-source.ts`, commit 8176f8f).

**LOCKED DIRECTION, DEFERRED build:** campaign→template link = **context→template, many:1, slug (not FK)** (a nullable `so_campaigns.template_type` + campaign picker) → **Phase 3** (only when >1 bonus template genuinely exists; a picker now fabricates a selection model that doesn't exist). Reuse is preserved (many contexts → one template).

**DEFERRED (unchanged):** `CONTEXT_PROVIDERS` typed registry (gated on the Claude-API+MCP executor; `APP_SENT_VARIABLE_SOURCES` is its already-laid seed → additive later, not a rewrite); no `bound_contexts`/persisted binding on the template; no unified email hub page; no provider/ESP registry over 3 enum values; repeater/render-at-send.

**Rejected (overengineering now):** a unified "email control" / builder / aggregating dashboard — it becomes a 4th place to look, duplicates the existing editors, and pre-designs against the retiring n8n path. "The cure is a chip, not a control plane."

---

**Cross-references:** [`THEMING_DESIGN.md`](./THEMING_DESIGN.md) (theme/token layer, locked hex + anon-secret invariants), [`THEME_MANAGER_DESIGN.md`](./THEME_MANAGER_DESIGN.md) (`so_themes` library + `/admin/themes`). Theme domain: `apps/cms/lib/theme/`. Email domain: `apps/cms/features/email/`, `packages/email/`. Variable catalog: `apps/cms/lib/trigger-schemas.ts`. n8n substitution: `n8n-workflows/scripts/evaluators/resolve-variables.js`.
