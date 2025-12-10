# Legal-Mind Claude Automation

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

## 🤖 The 8 Specialized Agents

Each agent is an expert in their domain, following signal vs noise principles.

### 1. plan-analyzer (Purple, Architect)

**Purpose:** Analyzes implementation plans and creates optimized execution strategy

**What it does:**
- Reads plan from `~/.claude/plans/*.md` or `@docs/`
- Builds dependency graph (what imports what)
- Detects parallelization opportunities
- Identifies critical steps (database, types)
- Determines skip conditions
- Outputs YAML execution strategy

**Key expertise:**
- TypeScript import dependency analysis
- Parallel vs sequential determination
- Risk assessment

**Output:** YAML with phases, dependencies, agents needed, risks

---

### 2. supabase-schema-specialist (Red, Infrastructure)

**Purpose:** Handles all database schema changes

**What it does:**
- Creates migration files (`supabase/migrations/*.sql`)
- Writes RLS policies (avoiding infinite recursion!)
- Creates PostgreSQL functions with GRANT permissions
- Regenerates TypeScript types (`npm run db:types`)
- Verifies migrations work

**Key expertise:**
- PostgreSQL SQL syntax
- RLS policies using `public.current_user_tenant_id()` (no subqueries!)
- Multi-tenant isolation
- Database functions (PL/pgSQL)

**Critical rule:** NEVER use subqueries in RLS - always use helper function to avoid infinite recursion

**Output:** Migration file created, types regenerated, verification steps

---

### 3. feature-foundation-developer (Orange, Feature Developer)

**Purpose:** Creates foundational TypeScript files (types, queries, validation)

**What it does:**
- Creates `features/{feature}/types.ts` - TypeScript interfaces
- Creates `features/{feature}/queries.ts` - Data fetching functions
- Creates `features/{feature}/validation.ts` - Zod schemas (static or dynamic)

**Key expertise:**
- Choosing correct Supabase client (server vs browser - has decision tree!)
- Explicit TypeScript return types
- Dynamic Zod schema generation
- Error handling (throw vs return)

**Critical rule:**
- CMS app → browser client (TanStack Query)
- Website app → server client (Server Components)

**Can work in parallel:** queries.ts + validation.ts (after types.ts exists)

**Output:** 3 TypeScript files ready for components

---

### 4. component-developer (Cyan, UI Specialist)

**Purpose:** Builds React components with forms and state management

**What it does:**
- Creates React components in `features/{feature}/components/`
- Integrates React Hook Form + Zod resolver
- Uses TanStack Query (CMS only, NOT website)
- Handles all UI states (loading, error, empty, success)
- Implements accessibility (labels, aria-*)

**Key expertise:**
- React Hook Form with Controller (for checkbox arrays!)
- TanStack Query patterns (CMS only)
- Conditional rendering
- shadcn/ui components from @legal-mind/ui

**Critical rule:** Checkbox arrays MUST use Controller, NOT register

**Output:** React components ready for routes

---

### 5. server-action-developer (Orange, Feature Developer)

**Purpose:** Creates Server Actions for database mutations

**What it does:**
- Creates `features/{feature}/actions.ts`
- Writes Server Actions with `'use server'`
- Handles authentication (getUser when needed)
- Implements revalidatePath after mutations
- Returns structured results `{ success, data?, error? }`

**Key expertise:**
- Server Supabase client (await createClient())
- CRUD operations (INSERT, UPDATE, DELETE)
- Cache revalidation
- User-friendly error messages

**Critical rule:** Always server client (NEVER browser), always revalidate

**Output:** Server Actions ready for components to call

---

### 6. route-developer (Orange, Feature Developer)

**Purpose:** Creates Next.js routes (pages) following ADR-005

**What it does:**
- Creates route files in `app/{route}/page.tsx`
- Implements Server Components with minimal logic
- Handles Next.js 15 async params
- Imports components from features/
- Renders error states

**Key expertise:**
- Next.js App Router
- ADR-005 pattern (routing only, logic in features/)
- Dynamic routes ([param])
- Error handling (notFound, custom UI)

**Critical rule:** NO business logic in routes, NO TanStack Query (use direct await)

**Output:** Route pages ready for testing

---

### 7. test-validator (Green, Testing Specialist)

**Purpose:** Manual testing with systematic validation and bug reporting

**What it does:**
- Executes manual testing checklist from plan
- Tests end-to-end user flows
- Validates edge cases (expired links, limits, errors)
- Classifies bugs by severity (P0/P1/P2)
- Verifies data in database
- Provides fix direction for failures

**Key expertise:**
- End-to-end flow testing
- Bug severity classification
- Database inspection
- User experience evaluation

**Critical rule:** P0 failures BLOCK merge - must fix before continuing

**Output:** YAML test results with severity, location, fix direction

---

### 8. docs-updater (Blue, Documentation)

**Purpose:** Updates documentation and creates signal-focused commits

**What it does:**
- Updates `@docs/PROJECT_ROADMAP.md` (marks tasks [x], progress %)
- Adds milestones to "Recent Milestones"
- Creates git commits (concise, high-level, NO footers)
- Uses conventional format (feat:, fix:, docs:)
- Asks about push to remote

**Key expertise:**
- Signal vs noise filtering for commits
- Markdown documentation
- Progress tracking
- High-level summarization

**Critical rule:** Commits are outcome-focused (what user can do), NOT implementation details. NO footers.

**Output:** Documentation updated, commit created locally

---

## 🔄 Workflow: /implement-phase

**What it does:** Orchestrates the 8 agents in optimal sequence with parallelization

**Phases:**

```
0. Plan Analysis         → plan-analyzer
1. Database [CRITICAL]   → supabase-schema-specialist
2a. Types                → feature-foundation-developer
2b. Queries + Validation ⚡⚡⚡ → 2x feature-foundation-developer (parallel)
3a. Base Components      → component-developer
3b. Composite Components → component-developer
4. Server Actions        → server-action-developer
5. Routes                → route-developer
6. Testing [CONDITIONAL] → test-validator
7. Documentation         → docs-updater
```

**Key features:**
- ✅ Smart dependency detection (types must be first, etc.)
- ✅ Parallelization where safe (queries + validation simultaneously)
- ✅ Two modes: Interactive (asks after each) vs Automated (only critical decisions)
- ✅ Handles failures (auto-retry once, then ask user)
- ✅ P0 bugs always stop for user decision
- ✅ Signal-focused commits (no footers, concise, high-level)

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

**feature-foundation-developer knows:**
- CMS app + TanStack Query → Browser client (`createClient()` - NO await)
- Website app + Server Component → Server client (`await createClient()`)

### RLS Policies

**supabase-schema-specialist knows:**
- ❌ NEVER: `USING (tenant_id = (SELECT ... FROM users))` → infinite recursion!
- ✅ ALWAYS: `USING (tenant_id = public.current_user_tenant_id())`

### React Hook Form

**component-developer knows:**
- ❌ NEVER: `{...register('field')}` for checkbox arrays
- ✅ ALWAYS: `<Controller>` for checkbox arrays

### ADR-005

**route-developer knows:**
- ❌ NEVER: Business logic in `app/` folder
- ✅ ALWAYS: Import from `features/`, minimal routing logic

---

## 📚 Documentation Structure

```
.claude/
├── README.md                    # ← You are here (overview)
├── agents/                      # 8 specialized agents
│   ├── plan-analyzer.md
│   ├── supabase-schema-specialist.md
│   ├── feature-foundation-developer.md
│   ├── component-developer.md
│   ├── server-action-developer.md
│   ├── route-developer.md
│   ├── test-validator.md
│   └── docs-updater.md
└── commands/
    └── implement-phase.md       # Workflow orchestrator

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

## 🎯 When to Use What

| Scenario | Command | Mode |
|----------|---------|------|
| Start implementing Phase 2, want to review each step | `/implement-phase Phase 2` | Interactive |
| Implement Phase 2, trust the automation | `/implement-phase Phase 2 --auto` | Automated |
| Just want to analyze plan without executing | Use plan-analyzer agent directly | N/A |
| Need to create single file (not full phase) | Use specific agent directly | N/A |

---

## 🔧 Agent Color Convention

- **Purple** - Architects/Planners (plan-analyzer)
- **Red** - Infrastructure/Database (supabase-schema-specialist)
- **Orange** - Feature Developers (foundation, server-action, route)
- **Cyan** - UI Specialists (component-developer)
- **Green** - Testing (test-validator)
- **Blue** - Documentation (docs-updater)

---

## 📖 Further Reading

- **How to use agents:** `@.claude/agents/{agent-name}.md` - Detailed agent documentation
- **Workflow details:** `@.claude/commands/implement-phase.md` - Full workflow specification
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
