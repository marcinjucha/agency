# AI Agency Project Overview

> **Always load @memory.md at the start of every session.** It contains project-specific feedback, domain concepts, and preferences extracted from previous conversations that are essential for correct behavior.

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

Note: `apps/shop/tata/` and `apps/shop/kolega/` are PLANNED (AAA-T-138+) but not yet created. Shop CMS features already exist in `apps/cms/features/shop-*/`.

---

## PROJECT_SPEC Files (Dual-Project Monorepo)

This monorepo contains two Notion projects with separate PROJECT_SPEC files:

| File | Notion Project | Scope |
|------|---------------|-------|
| `docs/PROJECT_SPEC.yaml` | AAA-P-4 — Halo Efekt Core CMS | Agency platform: surveys, intake, calendar, email, blog, landing pages, SEO |
| `docs/SHOP_PROJECT_SPEC.yaml` | AAA-P-9 — Platforma Sklepowa | E-commerce: product catalog, shop frontends, CMS shop features |

**Routing rule for `/develop` command:**
- Check task's `📊 Projects` relation in Notion to determine which PROJECT_SPEC
- AAA-P-4 tasks → `docs/PROJECT_SPEC.yaml`
- AAA-P-9 tasks → `docs/SHOP_PROJECT_SPEC.yaml`

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

**This project uses Agency Database (NOT Private Dashboard).**

- Agency Projects: `collection://29284f14-76e0-802f-a1de-000b357345a9`
- Agency Tasks: `collection://29284f14-76e0-8062-a18d-000bfce0cf23`

**Notion task naming for XL features:** When a feature has 10+ iterations with dependency graph, create separate tasks per iteration with shared prefix (e.g., "Workflow:") for easy filtering. Single-task-with-checklist pattern still applies to S/M tasks.

---

## Skills Reference

| Skill                    | Path                                           | When to use                                                                                                                                                   |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **architecture**         | `.claude/skills/architecture/SKILL.md`         | Monorepo structure, app/features separation (ADR-005), import rules, CMS↔Website communication, N8n vs Next.js API routes                                     |
| **database-patterns**    | `.claude/skills/database-patterns/SKILL.md`    | Supabase RLS policies, PostgreSQL functions, migrations, type regeneration, client selection (server vs browser). Avoids RLS infinite recursion               |
| **development-workflow** | `.claude/skills/development-workflow/SKILL.md` | Testing decisions (3-Question Rule), severity classification (P0/P1/P2), implementation validation, PROJECT_SPEC.yaml updates                                 |
| **n8n-patterns**         | `.claude/skills/n8n-patterns/SKILL.md`         | N8n background processing — fire-and-forget webhooks, ai_qualification JSONB, credential selection, Sentry Init subworkflow pattern                           |
| **nextjs-patterns**      | `.claude/skills/nextjs-patterns/SKILL.md`      | Next.js routes, Server Actions (structured returns, no throws), foundation files (types/queries/validation), async params, correct Supabase client            |
| **notion-patterns**      | `.claude/skills/notion-patterns/SKILL.md`      | Notion MCP tools — task status updates, project tracking. Properties are CASE-SENSITIVE. Contains Agency database IDs and filter rules                        |
| **ui-components**        | `.claude/skills/ui-components/SKILL.md`        | React components, shadcn/ui design system, WCAG 2.1 AA accessibility, responsive design, visual design decisions (dark/moody tonality, layout/spacing/typography choices, quality gates). Controller for checkbox arrays, TanStack Query CMS-only, 4 UI states |
| **validation-patterns**  | `.claude/skills/validation-patterns/SKILL.md`  | Two-pass validation (functional + architecture), YAML report formats, severity classification, 8-point architecture checklist. Loaded by validator-agent      |
| **iterative-planning**   | `.claude/skills/iterative-planning/SKILL.md`   | Task size assessment (S/M/L/XL), iterative breakdown for M/L/XL tasks, dependency graph patterns (sequential/parallel/convergent), iteration sizing, parallelization identification. Used by analyst-agent in /develop Phase 2 |
| **workflow-engine**      | `.claude/skills/ag-workflow-engine/SKILL.md`   | Workflow execution engine — trigger matching, step sequencing, condition branching, async/sync step split, n8n dispatch + callback, SSRF protection, service role client, adding new step/trigger types |
| **agency-knowledge**     | `.claude/skills/agency-knowledge/SKILL.md`     | Halo Efekt positioning, ICP, pricing, brand voice, competitive framing, sales playbook. Dual positioning (narrow vs broad), copy decisions, marketing angles. Updated by agents after strategy sessions |

---

## Quick Reference

**When working with Notion:**

1. ALWAYS use Agency Database for this project
2. Properties are CASE-SENSITIVE (silent failure if wrong case)
3. See `.claude/skills/notion-patterns/SKILL.md` for patterns

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

**When committing:**

- **No Co-Authored-By in commits** — Never add AI attribution footer ("Co-Authored-By: Claude" or similar) to commit messages.
- **Always use feature branches** — Never commit directly to main. Create `feature/aaa-t-{id}-{slug}` branch, implement, test, then merge with `--no-ff`.
- **All docs commits before merge** — memory.md, PROJECT_SPEC.yaml updates go on the feature branch BEFORE merging to main.
- **Commit before side-quests** — When user requests work outside current task scope (skill updates, visual audit), commit current progress first.
- **Worktree needs .env.local** — Git worktrees don't include .env.local (gitignored). Copy from main: `cp apps/cms/.env.local worktree/apps/cms/.env.local` (same for website).
- **Stage agent-created files explicitly** — The Write tool creates files on disk but does NOT `git add` them. After any file creation step, verify the file appears in `git status` and stage it before committing. WHY: docs/polityka-prywatnosci.md was created during AAA-T-162 but never staged — untracked files are lost on branch switch.

**When writing code:**

- **Always use defined agents for code changes** — Use code-developer-agent, design-agent etc. via Agent tool for ALL feature-level code changes. Direct edits only for trivial string changes (3 href values, 1 className).
- **Visual decisions → design-agent** — Embed heights, widths, spacing, layout dimensions, typography sizes, card styling are design decisions. Use design-agent (not code-developer-agent) for visual tuning. Code-developer-agent for CSS implementation only.
- **Turbopack barrel re-export bug** — `export { X } from 'module'` in files used by Server Actions causes "Expected export to be in eval context". Fix: `import { X } from 'module'; export const Y = X`.
- **Functional patterns: `remeda` + `neverthrow`** — Project adopts `remeda` for `pipe()`/functional composition and `neverthrow` for typed `Result<T, E>` error handling. **New Server Actions** use `ok().andThen().asyncAndThen().match()` instead of `try/catch`. Key patterns: `pipe()` for data transformations, `Result`/`ResultAsync` for error handling, `andThen` chaining with final `.match()`, `fromThrowable`/`ResultAsync.fromPromise` for wrapping unsafe code. **Not Effect.js** — lightweight (~5KB neverthrow + tree-shakeable remeda).
- **Boy Scout Rule** — Always leave code better than you found it. When touching a file: migrate try/catch → Result types, imperative loops → `pipe()`, fix naming, add missing types. Only in files you're already changing — don't refactor untouched code proactively.
- **Type-safe domain modeling** — Never pass plain `string` where a domain type exists. Derive typed unions from `as const` objects (single source of truth), validate at DB boundary with a validator function. Applied in RBAC (`PermissionKey`), should extend to all enum-like domain values (workflow step types, blog statuses, etc.). See `ag-coding-practices` skill for full pattern.

---

## Project CLAUDE.md Files

Index of all CLAUDE.md files and their scope:
- `./CLAUDE.md` — Root project overview, skills reference, Notion integration
- `./.claude/CLAUDE.md` — Claude-dev artifact repo (agents, skills, commands)
- `./apps/CLAUDE.md` — Apps directory (CMS vs Website separation, shared patterns)
- `./apps/cms/CLAUDE.md` — CMS admin panel (auth, routes, TanStack Query)
- `./apps/cms/features/CLAUDE.md` — CMS features pattern (ADR-005, queries naming)
- `./apps/website/CLAUDE.md` — Public website (survey flow, marketing pages)
- `./apps/website/features/CLAUDE.md` — Website features (createAnonClient, cache(), survey submission, booking flow)
- `./packages/CLAUDE.md` — Shared packages (ui, database, validators)
- `./packages/calendar/CLAUDE.md` — Google Calendar integration
- `./supabase/CLAUDE.md` — Database config and migrations
- `./n8n-workflows/CLAUDE.md` — N8n AI survey analysis workflows
