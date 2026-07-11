# AI Agency Project Overview

> **Always load @memory.md at the start of every session.** It contains project-specific feedback, domain concepts, and preferences extracted from previous conversations that are essential for correct behavior.

> **Check for `SESSION.md` at the worktree root at session start.** If it exists, load it — it's the ephemeral working memory of the in-flight feature in this worktree. If absent and real work begins this session, create it. See "Session Working Memory" below.

> **CRITICAL: Update `SESSION.md` after every commit and every significant decision.** Not at the end of the session — continuously, as work happens. The user will explicitly call this out if you skip it. A commit without a SESSION.md update is an incomplete step.

## Session Working Memory (`SESSION.md`)

Ephemeral, worktree-scoped notes — the conversation's scratch pad. Distinct from `memory.md` (durable cross-session learnings) and `CLAUDE.md` (project rules).

**Why this exists:** Long sessions hit context limits and need to be split. Without a handoff file, the new conversation starts blind. `SESSION.md` is the bridge — paste it (or its path) into a fresh thread and the new conversation picks up exactly where the old one left off. Also a sanity check inside one session: "what did we decide an hour ago?"

**Lifecycle:**
- **Location:** `SESSION.md` at the worktree root (same level as `CLAUDE.md`, `memory.md`). One per worktree — matches the one-feature-per-worktree convention.
- **Gitignored** — never committed. The file is ephemeral by design; if a learning matures into a durable convention, promote it to `memory.md` or a skill via `/ai-extract-memory`.
- **Create** when real work starts (first non-trivial decision or implementation). Skip for pure Q&A or one-shot answers.
- **Update continuously** — after EVERY commit, EVERY architectural decision, EVERY bug found. Not at the end of the session. If you just made a commit and SESSION.md doesn't reflect it, you are behind. Update it now.
- **Reference at session start** — load it if present, so the conversation already has full context.
- **Delete on merge** — when the feature merges to `main` and the worktree is torn down, `SESSION.md` goes with it. The lasting parts should already have been promoted to `memory.md` / skills / `PROJECT_SPEC.yaml`.

**What to record (loose structure — it's working memory, not a report):**
- **Done so far** — implementations completed, decisions made (with WHY)
- **Files touched** — short list of paths modified (helps a fresh conversation jump in)
- **Open questions** — anything unresolved or needing user input
- **Next steps** — the immediate next action when work resumes
- **Bridge context** — anything a new conversation must know that isn't already in `memory.md` / `CLAUDE.md` / `PROJECT_SPEC.yaml`

**Suggested skeleton (keep it short — bullets, not prose):**

```markdown
# Session: [slug, e.g. booking-confirmation-email]

## Done
- [decision/implementation 1] — WHY: [...]
- [decision/implementation 2] — WHY: [...]

## Files touched
- apps/cms/features/.../foo.ts
- supabase/migrations/2026..._bar.sql

## Open questions
- [unresolved item]

## Next
- [immediate next action]
```

**Don't:**
- Don't duplicate `memory.md` content here — link/reference it instead.
- Don't write end-of-session prose summaries. Bullets only. The point is fast handoff, not narrative.
- Don't commit it. Verify `SESSION.md` is in `.gitignore` before working in a new worktree.

---

## n8n Infrastructure

### n8n-vps (Infrastructure)

**Location:** `infra/n8n-vps/` (symbolic link to `../../n8n-vps`)

**Repository:** `git@github.com:marcinjucha/n8n-vps.git`

**Purpose:** VPS infrastructure configuration for n8n deployment

**Contents:**

- Docker Compose setup
- Traefik reverse proxy configuration
- Monitoring setup
- Deployment scripts

**Usage:**

- Reference for understanding n8n deployment architecture
- AI can read this to help build workflows in n8n
- Rarely modified during agency development
- Changes typically made through n8n web UI, not in this repo

**Key Files:**

- `docker-compose.yml` - n8n service configuration
- `traefik/` - Reverse proxy setup
- `monitoring/` - Observability configuration

---

### n8n-workflows (Workflow Definitions)

**Location:** `n8n-workflows/` (in agency root)

**Purpose:** Exported n8n workflow definitions used by agency

**Pattern:** See `.claude/skills/n8n-patterns/SKILL.md` for workflow integration patterns

**Tooling — always use `n8n-workflows/scripts/` for n8n JSON changes:** `n8n-builder.mjs` (workspace command `npm run n8n:build -- <command>`) provides `create-handler` (new step-handler subworkflow), `add-route` (Process Step Switch wiring), `regenerate-helpers` (re-inline canonical evaluator JS into all opted-in Code nodes via `// @inline <name>` markers), and `lint-helpers` (audit drift). Add shared JS as `scripts/evaluators/<name>.js`. Direct hand-editing of `workflows/*.json` is the fallback only — first ask whether the change fits one of these commands. Full inventory + WHY in `n8n-workflows/CLAUDE.md` `Tooling` section.

**Reference:** Background processing decisions and patterns documented in project docs

---

## Repository Structure

```
agency/
├── infra/
│   └── n8n-vps/          # Symlink to n8n infrastructure repo
├── n8n-workflows/         # Workflow definitions for background processing
├── apps/
│   ├── cms/              # CMS application (serves Halo Efekt + Shop management)
│   └── website/          # Public website (Halo Efekt marketing)
├── packages/             # Shared packages (ui, database, validators, calendar, email)
├── supabase/            # Database migrations and config (19 tables, 28 migrations)
└── docs/
    ├── PROJECT_SPEC.yaml       # Halo Efekt Core CMS (AAA-P-4)
    └── SHOP_PROJECT_SPEC.yaml  # Platforma Sklepowa (AAA-P-9)
```

Note: `apps/shop/jacek/` and `apps/shop/oleg/` migrated from Next.js 16 to TanStack Start v1.167 + Vite 8 (2026-04-15). `apps/shop/tata/` planned but not yet created. Shop CMS features exist in `apps/cms/features/shop-*/`.

---

## PROJECT_SPEC Files (Dual-Project Monorepo)

This monorepo contains two Notion projects with separate PROJECT_SPEC files:

| File | Notion Projects | Scope |
|------|----------------|-------|
| `docs/PROJECT_SPEC.yaml` | AAA-P-11 Email + AAA-P-12 Workflow Engine + AAA-P-13 Intake + AAA-P-14 Blog & Media + AAA-P-15 Tech + AAA-P-16 Metoda Halo Filter + legacy AAA-P-4 Core CMS | Agency platform: surveys, intake, calendar, email, blog, landing pages, SEO |
| `docs/SHOP_PROJECT_SPEC.yaml` | AAA-P-9 Platforma Sklepowa | E-commerce: product catalog, shop frontends, CMS shop features |

**Routing rule for `/develop` command:**
- Tasks under AAA-P-11 Email / AAA-P-12 Workflow Engine / AAA-P-13 Intake / AAA-P-14 Blog & Media / AAA-P-15 Tech / AAA-P-16 Metoda Halo Filter / legacy AAA-P-4 Core CMS → `docs/PROJECT_SPEC.yaml`
- Tasks under AAA-P-9 Platforma Sklepowa → `docs/SHOP_PROJECT_SPEC.yaml`

**Shared infrastructure:** Both projects share the same Supabase DB (shop tables use `shop_` prefix), the same CMS app (shop features in `features/shop-*/`), and the same packages. Only the public frontends will be separate (`apps/website/` vs future `apps/shop/*/`).

**Cross-project updates:** When working on AAA-P-9 (Shop) tasks, always check if changes affect Core CMS (AAA-P-4). If a shop task modifies shared tables (e.g., `media_items`), shared packages, CMS sidebar, or `lib/` files — update BOTH PROJECT_SPECs. Shop extends CMS, so many shop tasks have core CMS side effects.

---

## Command Quality Standards (Feb 2026)

**Audit Findings:** Commands audited for structure compliance and content quality (signal vs noise).

### Critical Issues Fixed

**implement-phase command:**

- ❌ **Invented metrics removed** (confirmed by user as fabricated):
  - "40% → 8% rework rate" - NO SOURCE
  - "20 minutes average time savings" - NO SOURCE
  - "Saves ~15 minutes vs sequential" - NO SOURCE
  - **Action taken:** Deleted entirely (user preference)
- ❌ **AI-known content reduced:** "Sufficient Context Principle" section 83 lines → 15 lines (82% reduction)
  - Removed: Generic explanations of agent isolation (Claude already knows)
  - Kept: Test question, signal/noise filter, project-specific guidance

**manage-git command:**

- ⚠️ **Structure issues identified** (not yet fixed):
  - Missing "Clarifying Questions Pattern" section (completely absent)
  - Phase 0 not inline (performs agent-like complexity analysis)
  - Commands offered without confirmation loops
  - Missing Phase Execution Pattern section

### Quality Standards Applied

**Signal vs Noise for Commands:**

1. **NO invented metrics** - If no real data exists, don't fabricate statistics
2. **Minimal AI-known content** - Claude understands agent isolation, framework basics
3. **Project-specific focus** - Document project decisions, not generic patterns
4. **WHY over HOW** - Include production context for critical decisions

**Compliance Scoring:**

- `implement-phase`: 7/9 structure compliance → CRITICAL content issues fixed ✅
- `manage-git`: 3/9 structure compliance → Needs refactoring ⚠️

**Next Actions:**

- Fix manage-git structure (45 min CRITICAL work remaining)
- Add production WHY context (requires user input - real incidents)

---

## Notion Integration

**This project uses the Notion Agency Database as the primary task tracker.**

- **Projects collection:** `collection://29284f14-76e0-802f-a1de-000b357345a9` (database `29284f14-76e0-8065-ae11-ebe3685f4c02`)
- **Tasks collection:** `collection://29284f14-76e0-8062-a18d-000bfce0cf23` (database `29284f14-76e0-8012-8708-f1c5d3a78386`)

| Notion Project | Project UUID | Scope |
|---|---|---|
| AAA-P-11 Email | `35e84f14-76e0-8198-a73c-e02066ed90aa` | Email notifications, templates, provider config (new 2026-05-12) |
| AAA-P-12 Workflow Engine | `35e84f14-76e0-81a8-bf14-d11966986d82` | Visual builder, n8n, retry, triggers (new 2026-05-12) |
| AAA-P-13 Intake | `35e84f14-76e0-8131-89f5-c9af874dc516` | Surveys, booking, calendar, confirmations (new 2026-05-12) |
| AAA-P-14 Blog & Media | `35e84f14-76e0-810b-aef8-d2718ebad9cf` | Blog editor, media library, social embeds (new 2026-05-12) |
| AAA-P-15 Tech | `35e84f14-76e0-81fe-a6d6-ed0633ed1a9e` | Staging, auth, code review, cross-cutting (new 2026-05-12) |
| AAA-P-16 Metoda Halo Filter | `35e84f14-76e0-8175-b607-f7f3681c098d` | Offer roadmap tracker (S1/S2/S6/S8/B1-B8/MRR/UP positions + T-* dev subtasks) (new 2026-05-12) |
| AAA-P-7 Halo Efekt - Website & Content | (existing) | Marketing site content, copy, landing pages |
| AAA-P-10 Marketing i Social Media | (existing) | Marketing campaigns, social media work |
| AAA-P-9 Platforma Sklepowa | `33284f14-76e0-816c-943a-c80f812a6f10` | Shop platform |
| AAA-P-8 Halo Efekt - VPS Infrastructure | `32984f14-76e0-8134-81cc-f44104e84db0` | Hetzner VPS, Docker stacks |
| AAA-P-6 DocForge - Desktop App | `31a84f14-76e0-814a-a30c-d3d210ad3862` | Desktop app |
| AAA-P-4 Halo Efekt - Core CMS (archived) | `2e384f14-76e0-8034-8530-f530c28e6641` | Pre-2026-05-12 archive — 0 active tasks, all reparented to AAA-P-11 through AAA-P-15 |

**Agency Clients (unified CRM):** UUID `29284f14-76e0-8046-9c53-e09ac8084aa2`. Extended 2026-05-12 to cover full lifecycle: `Ready to contact` → `Contacted` → `Replied` → `Meeting booked` → `Proposal` → `Negotiation` → `Active` → `Retained` → `Paused` → `Lost`. Adds 10 outreach properties (Outcome, Priorytet, ICP priority, Branża, Tagi, Hook użyty, Następny follow-up, Liczba follow-upów, Czy odpisał?, Źródło renamed from Lead Source). See `.claude/skills/ag-notion-patterns/SKILL.md` for property schemas.

**Task naming:** Notion auto-generates `AAA-T-N` IDs on the Tasks database. Newly created tasks MUST have the title prefixed `[AAA-T-N] <title>` — workflow: `notion-create-pages` → fetch page → read `ID` → `notion-update-page` setting title with prefix.

**Status values (CASE-SENSITIVE):** `Inbox` | `To Do` | `In Progress` | `On Hold` | `Done` | `Cancelled`. Wrong case = silent property mismatch.

**Priority values:** `🔴 Urgent` | `🟠 High` | `🟡 Medium` | `🟢 Low`.

**XL features:** Create separate tasks per iteration with a shared slug prefix (e.g. `booking-flow: iter 1 ...`, `booking-flow: iter 2 ...`) for easy filtering. Single-task-with-checklist for S/M tasks.

---

## Skills Reference

| Skill                    | Path                                           | When to use                                                                                                                                                   |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **architecture**         | `.claude/skills/architecture/SKILL.md`         | Monorepo structure, app/features separation (ADR-006 §3), import rules, CMS↔Website communication, N8n vs TanStack Start server routes                           |
| **database-patterns**    | `.claude/skills/database-patterns/SKILL.md`    | Supabase RLS policies, PostgreSQL functions, migrations, type regeneration, client selection (server vs browser), fromSupabaseVoid for void operations, is_super_admin() for global tables. Avoids RLS infinite recursion |
| **development-workflow** | `.claude/skills/development-workflow/SKILL.md` | Testing decisions (3-Question Rule), severity classification (P0/P1/P2), implementation validation, PROJECT_SPEC.yaml updates, validate after each iteration   |
| **n8n-patterns**         | `.claude/skills/n8n-patterns/SKILL.md`         | N8n background processing — fire-and-forget webhooks, ai_qualification JSONB, credential selection, Sentry Init subworkflow pattern                           |
| **notion-patterns**      | `.claude/skills/ag-notion-patterns/SKILL.md`   | Notion MCP tools — task status updates, project tracking. Properties are CASE-SENSITIVE. Contains Agency database IDs, filter rules, and reusable Features Overview / Change Log subpage schemas. **Primary tracker skill** |
| **design-patterns**      | `.claude/skills/ag-ui-components/SKILL.md`     | React components, shadcn/ui design system, WCAG 2.1 AA accessibility, responsive design, visual design decisions (dark/moody tonality, layout/spacing/typography choices, quality gates), edit pattern decisions (RHF form vs inline, DatePicker vs native). Controller for checkbox arrays, TanStack Query CMS-only, 4 UI states |
| **validation-patterns**  | `.claude/skills/validation-patterns/SKILL.md`  | Two-pass validation (functional + architecture), YAML report formats, severity classification, 8-point architecture checklist. Loaded by validator-agent      |
| **iterative-planning**   | `.claude/skills/iterative-planning/SKILL.md`   | Task size assessment (S/M/L/XL), iterative breakdown for M/L/XL tasks, dependency graph patterns (sequential/parallel/convergent), iteration sizing, parallelization identification. Used by analyst-agent in /develop Phase 2 |
| **tanstack-setup**       | `.claude/skills/tanstack-setup/SKILL.md`       | TanStack Start project setup — vite.config.ts, entry points (router/ssr/client), Tailwind v4 vite plugin, @fontsource fonts, Vite 8 requirement, monorepo npm overrides |
| **tanstack-routing**     | `.claude/skills/tanstack-routing/SKILL.md`     | TanStack Start routing — file conventions (__root, $param, [.ext]), createFileRoute (loader, head, headers, validateSearch), ISR via Cache-Control, HeadContent/Scripts, @unpic/react images |
| **tanstack-server**      | `.claude/skills/tanstack-server/SKILL.md`      | TanStack Start server — createServerFn (CRITICAL for server-only code), server routes (server.handlers), middleware (createMiddleware, global via start.ts), isomorphic execution model |
| **workflow-engine**      | `.claude/skills/ag-workflow-engine/SKILL.md`   | Workflow execution engine — n8n Orchestrator + Process Step subworkflow (two-workflow architecture), $getWorkflowStaticData state management (per workflow ID, not per execution), state[executionId] concurrent isolation, condition branching (literal fallback), variable context (trigger hydration), SSRF protection, service role client, test mode, adding new step/trigger types |
| **n8n-step-handlers**   | `.claude/skills/ag-n8n-step-handlers/SKILL.md` | N8n step handler subworkflows — handler contract (input/output, context preservation), supabaseRequest() boilerplate, payload flattening, alreadyPersisted flag, trigger handler (data hydration), executeWorkflow config (autoMapInputData), anti-patterns (convertFieldsToString, SplitInBatches state loss) |
| **agency-knowledge**     | `.claude/skills/agency-knowledge/SKILL.md`     | Halo Efekt positioning, ICP, pricing, brand voice, competitive framing, sales playbook, product portfolio (DocForge). Dual positioning (narrow vs broad), copy decisions, marketing angles. Updated by agents after strategy sessions |

**Additional reference:** `docs/TANSTACK_START_PATTERNS.md` — TanStack Start migration patterns and decisions (complements tanstack-* skills above).

---

## Quick Reference

**When working with Notion (primary task tracker):**

1. ALWAYS use TitleCase status values: `To Do`, `In Progress`, `Done`, `Cancelled`, `On Hold`, `Inbox` — wrong case = silent property mismatch
2. Property names are CASE-SENSITIVE (e.g. `📊 Projects`, `Status`, `Priority`/`Priorytety` — verify against schema before bulk operations)
3. Newly created tasks must get the `[AAA-T-N]` title prefix: `notion-create-pages` → fetch new page → read auto-generated `ID` → `notion-update-page` setting title to `[AAA-T-N] <title>`
4. See `.claude/skills/ag-notion-patterns/SKILL.md` for database IDs, filter rules, and reusable Features Overview / Change Log subpage schemas

**When working with n8n:**

1. Infrastructure questions → Check `infra/n8n-vps/`
2. Workflow patterns → Check `.claude/skills/n8n-patterns/SKILL.md`
3. Background processing → n8n handles async AI operations (see docs)
4. Workflow engine = backbone → all future features (multi-channel, follow-up, social media) become "add trigger + action blocks" on the workflow engine, not standalone implementations

**When auditing commands:**

1. Check for invented metrics (require source attribution)
2. Apply signal-vs-noise filter (remove AI-known content)
3. Verify structure compliance (9 required sections from command-creation skill)
4. Add production WHY context (not just WHAT)

**Production State:**

- **Tenant "Halo Efekt"** — email: kontakt@haloefekt.pl, id: `19342448-4e4e-49ba-8bf0-694d5376f953`
- **email_configs table empty** — N8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`)

**When committing:**

- **No Co-Authored-By in commits** — Never add AI attribution footer ("Co-Authored-By: Claude" or similar) to commit messages.
- **Always use feature branches** — Never commit directly to main. Create `feature/{slug}` branch, implement, test, then merge with `--no-ff`.
- **All docs commits before merge** — memory.md, PROJECT_SPEC.yaml updates go on the feature branch BEFORE merging to main.
- **Commit before side-quests** — When user requests work outside current task scope (skill updates, visual audit), commit current progress first.
- **Worktree needs .env.local** — Git worktrees don't include .env.local (gitignored). Symlink from main (stays in sync): `ln -s $(pwd)/apps/cms/.env.local ./worktree-pnpm/apps/cms/.env.local` (repeat for website, shop/jacek, shop/oleg). Copy (`cp`) also works for one-off setups.
- **Stage agent-created files explicitly** — The Write tool creates files on disk but does NOT `git add` them. After any file creation step, verify the file appears in `git status` and stage it before committing. WHY: production incident — `docs/polityka-prywatnosci.md` was created by Write but never staged, lost on branch switch.
- **`chore/` branch prefix for tech-debt without a Notion task** — Use `chore/{slug}` branch naming for internal cleanup/refactoring work that doesn't correspond to a tracked Notion task. Mirrors npm semver convention. Example: `chore/plugin-arch-cleanup`.
- **Clean git history before merge** — Before merging any feature branch, squash/reorganize commits into logical groups using `git reset --soft <base>` + re-commit. WHY: user explicitly confirmed this pattern — prevents WIP/fix commit noise in main history. **File-disjoint pre-flight check (2026-05-15):** `git reset --soft <base>` + group-add cleanup only works if commit groups are FILE-DISJOINT. Before promising N groups to the user, run `git log --name-only` per intended group to verify zero file overlap. If two groups touch the same file, after `git reset --soft` the working tree is merged and you cannot split that file's changes between commits without `git add -p` (interactive, often unavailable). Solution when overlap detected: collapse groups by PATH-PREFIX into 2-3 file-disjoint groups (e.g. `apps/cms/**` + `packages/email/**` + `packages/ui/**` = one commit; `n8n-workflows/**` = another). Also: promising 6 groups and delivering 2 = violation of "scope freeze after ok" rule below.
- **Bash `cd` persists across tool calls — use absolute paths in git/pnpm/npm commands** — `cd` in one Bash call changes pwd for ALL subsequent Bash calls in the session. Caused accidental commits to wrong branch. Most tools (Read, Edit, Write) are absolute-path so pwd doesn't matter — only Bash carries state. Fix: use `git -C /path/to/worktree ...`, `pnpm -F @agency/cms ...` — never rely on an earlier `cd`.
- **`git clean -fd` silently deletes untracked directories — always `-fdn` (dry-run) first** — Wiped `apps/shop/jacek/src/` (untracked, never in git history) with zero recovery path. Always run `git clean -fdn` first, read the output carefully, then `-fd`.
- **`git add <explicit-path>` + `git commit` still commits everything already staged in the INDEX from prior sessions** — specifying paths in `git add` only ADDS; it does NOT limit the commit to those paths. The commit's scope is the entire index. Before staging new work, run `git status` to see what's ALREADY staged, and `git restore --staged <path>` to drop pre-staged entries that don't belong to this commit. WHY: a commit accidentally swept in 4 unrelated `docs/sessions/*.md` deletions sitting in the index from a previous session.
- **Any `package.json` dependency change MUST be followed by a lockfile update before push, or Vercel CI install fails** — run `pnpm install --lockfile-only` at repo ROOT to reconcile `pnpm-lock.yaml`, then commit it on the feature branch. WHY: removing a dep WITHOUT updating the lockfile PASSES the local build (even `npm run build -- --force`) because the main checkout's `node_modules` is a stale superset on disk — but FAILS on Vercel with `ERR_PNPM_OUTDATED_LOCKFILE` (CI installs with `--frozen-lockfile`). A green local build is NOT proof the install reproduces.
- **Verify the Vercel PREVIEW deploy (status Ready + serves real data) BEFORE merging to prod** — a local `--force` build going green is NOT sufficient proof for a dependency change or data-layer change; the preview's clean `pnpm install` reproduces CI conditions the warm local `node_modules` hides. WHY: a red preview (`ERR_PNPM_OUTDATED_LOCKFILE`) was caught at the preview stage instead of becoming a prod outage.

**When working with worktrees:**

- **Kill dev servers BEFORE `git worktree remove`** — `git worktree remove --force` kills live Vite dev servers with SIGABRT/exit 134; Vite segfaults when its working directory vanishes underneath it. Correct order: kill dev servers first, THEN remove the worktree.
- **pnpm worktree + main share `node_modules`** — Lockfile install in either checkout affects both. Git worktree's `preview_start` from main's `.claude/launch.json` always spawns vite from main checkout path, NOT worktree. Start vite manually from worktree directory for worktree-local dev server.
- **`preview_start` reuses the port, not the checkout** — If a Vite dev server is already bound to the target port from a DIFFERENT checkout (main vs worktree), preview tools attach to the stale server and serve wrong code. Symptom: edits in worktree don't show up in preview. Fix: kill port occupant before `preview_start` in a worktree.
- **A fresh worktree can auto-apply an old stash from another branch during creation** — `pnpm install` in a newly-created worktree has triggered `git stash pop` (mechanism unclear, possibly a stale `.git/hooks/post-checkout`), polluting it with regressions from another feature. In a fresh worktree, run `git status` (and check `git stash list`) BEFORE staging any code; restore unrelated dirty files via `git checkout HEAD -- <file>`. WHY: a stash from another branch popped unexpectedly and polluted a clean worktree.

**When working with skills, commands, and memory:**

- **Three-layer persistence for durable conventions** — `memory.md` alone doesn't enforce behavior. A durable convention must land in (1) `memory.md` for interactive context, (2) the specific slash-command markdown (e.g. `ag-develop.md`) for that flow, AND (3) the relevant skill SKILL.md for all agents loading it. Duplication across the three layers is a feature — each catches a different invocation path (human chat vs `/command` vs subagent loading a skill). Single-layer entries silently fail.

**Workflow preferences:**

- **"fix all - nie zostawiaj niczego" applies to validator findings** — When a validator reports CRITICAL/HIGH/MEDIUM/LOW findings, the default is fix-now in the current commit, not defer to follow-up tickets. Generalizes prior "fix all" / "do all now" preferences (P2 items, MEDIUM severity). Defer is the exception requiring explicit justification (heroic effort, unscoped architecture work). Do NOT propose deferral as a default option in validator summaries.

**When writing code:**

- **Always use defined agents for code changes** — Use code-developer-agent, design-agent etc. via Agent tool for ALL feature-level code changes. Direct edits only for trivial string changes (3 href values, 1 className).
- **Visual decisions → design-agent** — Embed heights, widths, spacing, layout dimensions, typography sizes, card styling are design decisions. Use design-agent (not code-developer-agent) for visual tuning. Code-developer-agent for CSS implementation only.
- **~~Turbopack barrel re-export bug~~** — Historical (Next.js era, no longer relevant). Removed with TanStack Start migration.
- **Functional patterns: `remeda` + `neverthrow`** — Project adopts `remeda` for `pipe()`/functional composition and `neverthrow` for typed `Result<T, E>` error handling. **New server functions** use `ok().andThen().asyncAndThen().match()` instead of `try/catch`. Key patterns: `pipe()` for data transformations, `Result`/`ResultAsync` for error handling, `andThen` chaining with final `.match()`, `fromThrowable`/`ResultAsync.fromPromise` for wrapping unsafe code. **Not Effect.js** — lightweight (~5KB neverthrow + tree-shakeable remeda).
- **Boy Scout Rule** — Always leave code better than you found it. When touching a file: migrate try/catch → Result types, imperative loops → `pipe()`, fix naming, add missing types. Only in files you're already changing — don't refactor untouched code proactively.
- **React Compiler enabled (cms, website)** — `reactCompiler: true` in cms and website `next.config.ts`. Shop apps (jacek, oleg) use TanStack Start + Vite 8 with `babel-plugin-react-compiler` in `vite.config.ts`. Auto-memoizes — don't add `useCallback`/`useMemo` to new code. Boy Scout Rule: remove manual memoization when touching files.
- **Type-safe domain modeling** — Never pass plain `string` where a domain type exists. Derive typed unions from `as const` objects (single source of truth), validate at DB boundary with a validator function. Applied in RBAC (`PermissionKey`), should extend to all enum-like domain values (workflow step types, blog statuses, etc.). See `ag-coding-practices` skill for full pattern.

---

## Workflow Preferences (User Rules)

These are durable user-preference rules promoted from `memory.md`. Each has WHY context explaining the production incident or pattern that motivated it.

- **Staging-first workflow — never auto-apply to prod, queue prod actions in `SESSION.md`** — Default scope of every action (DB migrations, deploys, destructive ops, schema changes, n8n imports) is **staging**. Apply to **prod** ONLY after (a) tests pass and (b) user explicitly says "merge to prod" / "robimy merge'a na produkcję" / equivalent. Anything that needs to happen on prod gets QUEUED in `SESSION.md` under a clear "Pending prod actions" section — never executed inline alongside the staging step. **WHY:** AAA-T-63 Iter 3 (2026-05-09) — orchestrator applied `ALTER TABLE appointments DROP COLUMN ...` + `DELETE FROM appointments WHERE response_id IS NULL` to BOTH staging AND prod in a single inline flow, asking confirmation only about the legacy row. User pushed back AFTER prod was already touched. Production is irreversible; staging-first is the only safe default. Applies to deploys, infra changes, n8n workflow imports, anything touching a live customer-facing system.

- **Sequential agent → review → commit per feature for multi-feature refactors** — Parallel agent dispatch (7 at once) creates inconsistent state when scopes overlap. Default to sequential for any refactor touching shared file types across features. Parallel only when: (a) each scope fully isolated (no shared files), (b) each agent's work committed before next dispatch, (c) orchestrator verifies claimed result with `git status` (agent reports unreliable — they say "DELETED" while file still on disk). **WHY:** Earlier parallel dispatch of 7 agents created mixed state — 5/7 only added orphan `handlers.server.ts` without updating `server.ts` or removing `queries.ts`. Reaffirmed 2026-05-01: 24 atomic commits in single session via sequential dispatch worked cleanly, each independently testable/revertable.

- **Validator agent with `tool_uses: 0` produces hallucinated reports** — ALWAYS check `tool_uses` count before trusting validator verdicts (regardless of PASS or CRITICAL). Zero tool uses = agent didn't read files = hallucinated review. Companion to "validator produces confident false-positive CRITICAL findings" rule — same root cause, opposite sign. **WHY:** Pass 3 security validator returned `tool_uses: 0` and a detailed YAML referencing file paths that DO NOT EXIST in the codebase (e.g. `apps/website/features/blog/lib/downloadable-assets.ts`). Verdict was "PASS" but evidence was fabricated. Static-only validators also produce false-positive CRITICALs by flagging missing `tenant_id` filters on handlers that actually have them — treat any validator finding without verified tool use as a hypothesis until confirmed by direct file inspection.

- **Scope freeze after "ok" — execute EXACTLY what was proposed, nothing more** — When the user responds "ok" / "ok lecę" / similar to a multi-step proposal, execute the literal command(s) named. Any of the following require a FRESH explicit ask — they do NOT belong in the same turn as the "ok":
  - **Parameter changes** (different base, different flag, different scope path) — re-confirm even when the change seems trivially safer.
  - **Boy Scout additions** — modifying files outside the literal proposal (especially cross-package: `packages/ui`, `lib/`, `supabase/`) is a separate ticket / separate ask.
  - **Cascading "fix all" interpretations** — preferences like "fix all", "Boy Scout Rule", "no Co-Authored-By" are guidelines for what to PROPOSE next time, not blanket consent to bundle additional scope into the current "ok".

  **Why:** AAA-T-221 final cleanup (2026-05-15) — user said "ok" to `git reset --soft $(git merge-base HEAD main)` + 3-group recommit; I executed with a different base (`f23ecea` instead of merge-base), reverted unrelated `packages/ui/src/components/ui/collapsible-card.tsx` as Boy Scout cleanup, AND pre-committed validator's i18n fixes as a separate commit `488fb64` — all in one turn under a single "ok". User: "dzialasz bez mojej zgody, wtf".

  **How to apply:** before executing each tool call following an "ok", check: does this match the LITERAL text of what I proposed? If any parameter / file path / additional file differs, STOP and re-confirm with a one-line question naming the specific deviation.

- **Validation-per-iteration discipline — run Phase 3/3b/3c after EACH iteration, not batched** — **Why:** AAA-T-221 batched Iter 1-3 and hit an 11-issue combined fix loop. Non-negotiable for M/L/XL tasks. **How to apply:** After each iteration, run validation passes (functional, architecture, security) BEFORE starting the next iteration. Companion rule: "idz dalej, na końcu wszystko przetestuje" = Phase 4 manual testing deferred ONLY, NOT validation. Validation always runs per-iter; only manual testing may be deferred when user explicitly requests it.

- **Doc-only / config-only tasks: skip manual test instructions** — **Why:** When a task has no UI surface, no business logic, no runtime behaviour change (e.g. removing dead `globalEnv` entries, deleting stale doc references), user explicitly does NOT want a "Phase 4: open the app and click X" checklist. User signal: "sam to zrobc" (do it yourself) when presented with manual test steps for a pure docs/config change. **How to apply:** For docs-only / config-only changes, default to `grep` / `rg` proof that the change took, plus `pnpm build` / `turbo build` exit 0. Call it done. No "open the app and verify" checklist.

- **Filesystem bridge mandatory for content-heavy MCP-to-MCP migrations** — **Why:** Even ~3 KB payloads have produced silent information loss when summarised inline by the orchestrator. Detection only when user reads the result. **How to apply:** ALWAYS write raw payloads to disk (e.g. `/tmp/<migration>/...md`) and have the writer-subagent read from there. Never inline-summarise content between MCP tool boundaries.

- **Doc cleanup trap — grep before writing the replacement attribution** — **Why:** During AAA-T-231 the stale `WORKFLOW_NODES.md` line "Fired from: Survey Response AI Analysis workflow" was rewritten to "Fired from: ai_action step" — which is ALSO false (ai_action doesn't dispatch lead_scored). Validator caught it. **How to apply:** When removing a stale attribution from any doc/comment ("Fired from X", "Called by Y", "Used in Z"), GREP THE CODEBASE for the proposed replacement BEFORE writing it. If grep returns nothing, the honest answer is "no live dispatcher" / "no caller" / "orphan", not a plausible-sounding substitute.

- **`turbo.json` globalEnv accumulates dead entries even after source-code cleanup** — **Why:** Prior tickets removed `fetch()` calls referencing env vars but missed the build-config allowlist. Symptom: turbo cache invalidates on env vars no code reads. **How to apply:** When retiring a feature, `globalEnv` is a SEPARATE cleanup target from `.env.example` / source. Grep the `globalEnv` array independently.

- **Gramy long term — architecture supports extension, cut UI not structure** — **Why:** User-facing feature can be deferred (MVP cut), but architecture MUST NOT force a rewrite later. Phrase coined by user. **How to apply:** When deciding what to defer for MVP, cut UI surface, not structural decisions. Example: T-209 chose Continuation-with-attempts so adding Fork later is purely additive.

---

## Project CLAUDE.md Files

Index of all CLAUDE.md files and their scope:
- `./CLAUDE.md` — Root project overview, skills reference, Notion integration
- `./.claude/CLAUDE.md` — Claude-dev artifact repo (agents, skills, commands)
- `./apps/CLAUDE.md` — Apps directory (CMS vs Website separation, shared patterns)
- `./apps/cms/CLAUDE.md` — CMS admin panel (auth, routes, TanStack Query)
- `./apps/cms/features/CLAUDE.md` — CMS features pattern (ADR-006 §3, queries naming)
- `./apps/website/CLAUDE.md` — Public website (survey flow, marketing pages)
- `./apps/website/features/CLAUDE.md` — Website features (createAnonClient, cache(), survey submission, booking flow)
- `./packages/CLAUDE.md` — Shared packages (ui, database, validators)
- `./packages/calendar/CLAUDE.md` — Google Calendar integration
- `./supabase/CLAUDE.md` — Database config and migrations
- `./n8n-workflows/CLAUDE.md` — N8n AI survey analysis workflows
