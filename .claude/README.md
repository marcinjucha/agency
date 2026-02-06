# AI Agency Claude Automation

> **TL;DR:** Smart workflow system that implements planned features automatically using 8 specialized agents. Run `/implement-phase Phase 2` to execute implementation plan with dependency management, parallelization, and testing.

---

## Quick Start

```bash
# Interactive mode (asks approval after each phase)
/implement-phase Phase 2

# Automated mode (only asks on critical decisions)
/implement-phase Phase 2 --auto
```

**What it does:**
1. Analyzes your plan
2. Creates database migrations with RLS policies
3. Generates types, queries, and validation (parallel where safe)
4. Builds React components with proper dependencies
5. Writes Server Actions with revalidation
6. Creates Next.js routes following ADR-005
7. Runs manual tests with P0/P1/P2 severity classification
8. Updates documentation and creates signal-focused commits

**Time:** ~45-60 minutes for medium complexity feature

---

## 🤖 The 6 Specialized Agents

Each agent is an expert in their domain, following signal vs noise principles.

### 1. analysis-agent (Purple, Strategy Specialist)

**Purpose:** Analyzes implementation plans and creates optimized execution strategy

**What it does:**
- Reads plan from `~/.claude/plans/` or user message
- Applies plan-analysis skill to extract dependencies
- Applies development-practices skill for execution approach
- Outputs structured execution plan with phases and parallelization opportunities

**Key expertise:**
- Planning and execution strategy (not validation or testing)
- Dependency analysis (file imports, sequential logic)
- Parallelization detection (independent work)
- Critical path determination

**Critical rule:** Focus on PLANNING only - dependency extraction, parallelization opportunities, execution order

**Output:** YAML execution plan with dependencies graph, phases, critical path, time estimates

---

### 2. database-specialist (Red, Database Infrastructure)

**Purpose:** Handles all database schema changes - migrations, RLS policies, PostgreSQL functions

**What it does:**
- Creates migration files (`supabase/migrations/*.sql`)
- Writes RLS policies (avoiding infinite recursion with helper functions!)
- Creates PostgreSQL functions with GRANT permissions
- Regenerates TypeScript types (`npm run db:types`)
- Tests migrations locally before push

**Key expertise:**
- PostgreSQL schema changes (schema-management skill)
- RLS policies with `public.current_user_tenant_id()` helper (rls-policies skill)
- Database functions with SECURITY DEFINER (database-functions skill)
- Multi-tenant isolation patterns

**Critical rule:** NEVER use subqueries in RLS policies - always use SECURITY DEFINER helper function to avoid infinite recursion (P0 crash risk)

**Output:** Migration file created, types regenerated, verification steps completed, risks documented

---

### 3. code-developer (Cyan, Application Developer)

**Purpose:** Creates all application code - React components, Next.js routes, Server Actions, foundation files (types/queries/validation), n8n workflows

**What it does:**
- Creates components with React Hook Form (Controller for checkbox arrays!)
- Creates Next.js routes following ADR-005 (minimal routes, logic in features/)
- Creates Server Actions with structured returns and revalidatePath
- Creates foundation files (types.ts, queries.ts, validation.ts)
- Configures n8n workflows (webhooks, AI integrations)
- Makes AI model selection decisions

**Key expertise:**
- 9 loaded skills covering all patterns (component-patterns, route-patterns, server-action-patterns, foundation-patterns, code-patterns, architecture-decisions, design-system, n8n-workflow-patterns, ai-model-selection)
- Supabase client selection decision tree (3 clients: createAnonClient for public, createClient for browser, await createClient for server)
- React Hook Form Controller vs register decision (Controller for checkbox arrays, register for simple inputs)
- TanStack Query CMS-only (NOT website)

**Critical rule:**
- Checkbox arrays → Controller (register breaks, data loss)
- Server Actions → Structured return + revalidatePath + Server client (await createClient())
- Routes → ADR-005 compliant (import from features/, minimal logic)
- Foundation → Correct client selection (see 3-client decision tree)

**Output:** YAML with files created, dependencies, next steps. All code following skill patterns.

---

### 4. ui-ux-designer (Cyan, Design Quality Specialist)

**Purpose:** Reviews and improves UI/UX design - design system compliance, accessibility, visual quality

**What it does:**
- Audits components for design system compliance (no arbitrary colors, on-scale spacing)
- Checks accessibility (labels, keyboard nav, contrast 4.5:1)
- Reviews visual design (responsive, typography hierarchy, interactive states)
- Classifies issues by severity (P0/P1/P2)
- Provides fixes referencing skills

**Key expertise:**
- shadcn/ui design system enforcement (component-design skill)
- Accessibility patterns (htmlFor, aria-required, focus rings - accessibility skill)
- Visual design (spacing scale 4px base, typography, responsive - visual-design skill)
- Theme tokens (bg-primary, text-foreground, border)

**Critical rule:**
- P0 issues break accessibility or core UX (keyboard trap, contrast fail) - MUST fix
- Use shadcn/ui components (no custom buttons)
- All interactive elements need hover/focus/disabled states

**Output:** YAML review report with severity-classified issues (P0/P1/P2), fixes with skill references, overall rating

---

### 5. verification-specialist (Purple, Code Quality Validator)

**Purpose:** Pre-testing validation of implementations - catch bugs before manual testing to save time

**What it does:**
- Reads changed files via git diff
- Verifies requirements coverage from plan
- Checks common bugs (Controller for checkboxes, revalidatePath, structured returns, correct client)
- Validates architectural compliance (ADR-005, RLS patterns, client selection)
- Checks code quality (UI states, explicit types, error handling)
- Reports violations with risk levels (CRITICAL/HIGH/MEDIUM/LOW)

**Key expertise:**
- 9 preloaded verification skills (code-validation, component-patterns, server-action-patterns, route-patterns, supabase-patterns, rls-policies, architecture-decisions, code-patterns, testing-strategies)
- Read-only validation (uses disallowedTools: Write, Edit)
- Risk-based bug classification
- Actionable feedback with file:line locations

**Critical rule:**
- Focus on changed files only (git diff analysis)
- Flag CRITICAL/HIGH before manual testing (prevents wasted testing time)
- Provide fix suggestions with skill references
- Read-only verification (no code modifications)

**Output:** YAML verification report with requirements coverage, plan alignment, common bugs check, architecture compliance, code quality, blocking issues, warnings, pass/fail decision

---

### 6. project-manager-agent (Blue, Documentation & Coordination)

**Purpose:** Updates documentation, creates commits, syncs with Notion, maintains skills

**What it does:**
- Updates PROJECT_ROADMAP.md, PROJECT_SPEC.yaml, CLAUDE.md (content only, not structure)
- Creates git commits with signal-focused messages (WHY > HOW, natural prose)
- Syncs task status to Notion (case-sensitive properties!)
- Cleans git history (squash WIP commits)
- Creates pull requests with summary + test plan
- Refines skills when bugs found (adds anti-patterns)

**Key expertise:**
- Documentation patterns (outcome-focused, skip implementation details - documentation-patterns skill)
- Git commit patterns (multi-factor separation, Signal vs Noise - git-commit-patterns skill)
- Notion workflows (case-sensitive "Status", "Completion Date" - notion-workflows skill)
- Skill fine-tuning (add anti-patterns, refine patterns - skill-fine-tuning skill)
- CLAUDE.md maintenance (structure updates - claude-md skill)

**Critical rule:**
- Documentation: outcomes-focused (what user can do), NOT implementation details
- Commits: WHY > HOW, natural prose, Co-Authored-By line
- Notion properties: exact case match ("Status" not "status", "Done" not "done")
- Skills: add anti-patterns after bugs, refine imprecise patterns

**Output:** YAML with documentation updates, git operations, Notion sync status, next steps

---

## 🔄 Workflow: /implement-phase

**What it does:** Orchestrates the 6 agents in optimal sequence with parallelization and Notion integration

**Phases:**

```
Phase 1: Notion Discovery [AUTOMATIC]   → orchestrator (searches Notion tasks)
Phase 2: Plan Analysis                  → analysis-agent
Phase 3: Database [CRITICAL]            → database-specialist
Phase 4a: Foundation - Types            → code-developer
Phase 4b: Foundation ⚡⚡⚡                  → 2x code-developer (queries + validation parallel)
Phase 5a: Components - Base             → code-developer
Phase 5b: Components - Composite        → code-developer
Phase 5c: UI/UX Review                  → ui-ux-designer
Phase 6: Server Actions / API Routes    → code-developer
Phase 7: Routes                         → code-developer
Phase 8: Implementation Verification    → verification-specialist
Phase 9: Manual Testing [REQUIRED]      → user tests manually
Phase 10: Documentation                 → project-manager-agent
Phase 10a: CLAUDE.md Quality Review     → orchestrator + claude-md skill
Phase 10b: Skills Update Review         → orchestrator + skill-creator skill
Phase 11: Git Operations                → project-manager-agent
Phase 12: Complete!
```

**Key features:**
- ✅ Notion-first workflow (searches and syncs tasks automatically)
- ✅ Smart dependency detection (types first, build verification after each phase)
- ✅ Parallelization where safe (queries + validation simultaneously)
- ✅ Pre-testing verification (verification-specialist catches bugs before manual testing)
- ✅ Two modes: Interactive (asks after each) vs Automated (--auto)
- ✅ Build verification at critical points (npm run build:cms, npm run build)
- ✅ P0/P1/P2 risk levels with blocking issues flagged

**When to use:**
- ✅ Have a completed plan ready
- ✅ Want systematic, efficient implementation
- ✅ Multiple files to create with dependencies

**When NOT to use:**
- ❌ Don't have a plan yet (use /plan first)
- ❌ Simple one-file change (just do it)
- ❌ Exploration/research task (use explore agent)

---

## 🎯 Decision Points

### Interactive Mode (default)

**User decides after EVERY phase:**
- Continue to next phase?
- Retry failed agent?
- See details?
- Stop workflow?

**Control:** Maximum (user approves each step)
**Time:** Slower (waiting for approvals)

### Automated Mode (--auto)

**User decides ONLY on critical issues:**
- ✋ P0 test failures - "Fix now or stop?"
- ✋ Database migration failed (after retry) - "Skip or stop?"
- ✋ Agent failed twice - "Continue or stop?"
- ✋ Push to remote - "Push? (yes/no)"

**Auto-handled (no questions):**
- ✅ Continue between phases
- ✅ First agent retry
- ✅ Skip optional phases
- ✅ File creation decisions (per plan)

**Control:** Minimal (only critical decisions)
**Time:** Faster (no waiting between phases)

---

## 📐 Dependency Rules

The workflow understands TypeScript import dependencies:

```typescript
// types.ts → NO dependencies
export type Question = { ... }

// queries.ts → DEPENDS ON types.ts
import type { Question } from './types'  // ← Import!

// validation.ts → DEPENDS ON types.ts
import type { Question } from './types'  // ← Import!

// SurveyForm.tsx → DEPENDS ON QuestionField.tsx
import { QuestionField } from './QuestionField'  // ← Import!
```

**Execution order:**
1. types.ts (first - no deps)
2. queries.ts + validation.ts (parallel - both need types, independent of each other)
3. QuestionField.tsx (uses types)
4. SurveyForm.tsx (uses QuestionField - must wait)

**Rule:** If file A imports from file B in same feature → B must be created FIRST

---

## 🚨 Critical Rules Reference

### Supabase Clients

**code-developer knows:**
- Public forms (website) → Anonymous client (`createAnonClient()` - NO await, bypasses RLS)
- CMS client components + TanStack Query → Browser client (`createClient()` - NO await)
- Server Actions/Components → Server client (`await createClient()` - AWAIT required!)

### RLS Policies

**database-specialist knows:**
- ❌ NEVER: `USING (tenant_id = (SELECT ... FROM users))` → infinite recursion crash!
- ✅ ALWAYS: `USING (tenant_id = public.current_user_tenant_id())` → SECURITY DEFINER helper function

### React Hook Form

**code-developer knows:**
- ❌ NEVER: `{...register('field')}` for checkbox arrays → silent data loss
- ✅ ALWAYS: `<Controller>` for checkbox arrays → captures array values correctly

### ADR-005

**code-developer knows:**
- ❌ NEVER: Business logic in `app/` routes
- ✅ ALWAYS: Import from `features/`, minimal routing logic only

---

## 📚 Documentation Structure

```
.claude/
├── README.md                    # ← You are here (overview)
├── agents/                      # 6 specialized agents
│   ├── analysis-agent.md        # Planning & execution strategy
│   ├── database-specialist.md   # Database migrations, RLS, functions
│   ├── code-developer.md        # Components, routes, actions, foundation files
│   ├── ui-ux-designer.md        # Design system compliance, accessibility
│   ├── verification-specialist.md # Pre-testing validation, bug detection
│   └── project-manager-agent.md # Documentation, commits, Notion sync, skills
└── commands/
    ├── implement-phase.md       # Workflow orchestrator (12 phases)
    └── manage-git.md            # Intelligent commit message generation

docs/
├── PROJECT_ROADMAP.md           # What to build (phases, tasks)
├── CODE_PATTERNS.md             # How to build (concrete examples)
└── ARCHITECTURE.md              # Why (decisions, rationale)
```

---

## 🎓 Example Workflow Run

```bash
$ /implement-phase Phase 2 --auto
```

**Console output:**

```
Phase 0: Plan Analysis

Analyzing plan from ~/.claude/plans/abundant-waddling-rossum.md...

Analysis Complete ✅
- Complexity: medium
- Duration: ~50min
- Database: RLS policy needed
- Parallel phases: 2b (queries+validation)

Auto-proceeding to Phase 1...

---

Phase 1: Database Setup [CRITICAL]

Creating migration for public survey access...

Database Setup Complete ✅
- Migration: 20251210120000_add_public_survey_policy.sql
- Types regenerated: ✅
- RLS policy active

Auto-proceeding to Phase 2a...

---

Phase 2a: Foundation - Types

Creating types.ts...

Types Complete ✅
- Created: apps/website/features/survey/types.ts

Auto-proceeding to Phase 2b...

---

Phase 2b: Foundation - Queries & Validation ⚡⚡⚡

Launching 2 agents simultaneously:
1. queries.ts (server client for Website app)
2. validation.ts (dynamic Zod schemas)

Foundation Complete ✅
- Created: queries.ts
- Created: validation.ts

Auto-proceeding to Phase 3a...

---

[Phases 3-5 continue automatically...]

---

Phase 6: Testing

Running manual tests...

Testing Complete ✅
- Passed: 15/15 tests
- P0 issues: 0
- P1 issues: 0

Auto-proceeding to Phase 7...

---

Phase 7: Documentation

Updating PROJECT_ROADMAP.md...

Documentation Complete ✅
- Marked Phase 2 tasks complete [x]
- Updated progress: 0% → 100%
- Added milestone: "Phase 2 Complete"
- Commit created: "feat: add client survey form with 7 question types"

Commit created locally.

Would you like me to push to remote? (yes/no)
```

---

## 🛠️ Utility Workflows

### /manage-git - Intelligent Commit Message Generation

**Purpose:** Automatically generate high-quality conventional commit messages from staged changes

**What it does:**
1. Analyzes staged git changes + reads modified files
2. Categorizes change type (feat, fix, refactor, etc.)
3. Generates title + body focusing on WHY (not HOW)
4. Shows message for user review (accept/edit/regenerate)
5. Creates commit with approved message

**Key features:**
- ✅ Signal vs Noise (WHY > HOW, no implementation details)
- ✅ Conventional commits format with ticket support
- ✅ User checkpoint before committing (edit/regenerate loop)
- ✅ Reads entire modified files for business context
- ✅ Auto-decides body format (bullets vs paragraphs based on complexity)
- ✅ NO footer by default (exception: BREAKING: for breaking changes)

**When to use:**
- ✅ Making commits and want message quality
- ✅ Want WHY-focused messages (not file-by-file lists)
- ✅ Need conventional commits format with business context

**Quick start:**
```bash
git add <files>
/manage-git
# Review message → accept/edit/regenerate → commit
```

---

## 🎯 When to Use What

| Scenario | Command | Mode |
|----------|---------|------|
| Start implementing Phase 2, want to review each step | `/implement-phase Phase 2` | Interactive |
| Implement Phase 2, trust the automation | `/implement-phase Phase 2 --auto` | Automated |
| Make a commit with smart message generation | `/manage-git` | Interactive (user reviews message) |
| Just want to analyze plan without executing | Use analysis-agent directly | N/A |
| Need to create single file (not full phase) | Use specific agent directly (code-developer, database-specialist) | N/A |

---

## 🔧 Agent Color Convention

- **Purple** - Strategy & Quality (analysis-agent, verification-specialist)
- **Red** - Infrastructure/Database (database-specialist)
- **Cyan** - Development & Design (code-developer, ui-ux-designer)
- **Blue** - Coordination (project-manager-agent)

---

## 📖 Further Reading

- **How to use agents:** `@.claude/agents/{agent-name}.md` - Detailed agent documentation
- **Workflow specs:**
  - `@.claude/commands/implement-phase.md` - Feature implementation orchestrator
  - `@.claude/commands/manage-git.md` - Intelligent commit message generation
- **Code patterns:** `@docs/CODE_PATTERNS.md` - Implementation examples
- **Project roadmap:** `@docs/PROJECT_ROADMAP.md` - What to build next
- **Architecture:** `@docs/ARCHITECTURE.md` - Why decisions were made

---

## ⚡ Performance

**Parallelization savings:**
- Foundation (queries + validation): ~5 minutes saved
- Components (if independent): ~5-10 minutes saved
- Total: ~10-15 minutes faster than pure sequential

**Trade-offs:**
- Interactive mode: More control, slower
- Automated mode: Less control, faster, only stops on critical issues

---

## 🚀 Best Practices

1. **Always have a plan first** - Workflow needs plan to analyze
2. **Use --auto for trust** - If you trust the plan, automated mode is faster
3. **Review P0 issues immediately** - They block functionality
4. **Let agents handle their domain** - Don't micromanage, they're experts
5. **Check docs after** - PROJECT_ROADMAP.md shows what was accomplished

---

**Ready to implement?** Run `/implement-phase Phase 2` to start!
