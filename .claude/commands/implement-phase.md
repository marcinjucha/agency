---
description: "Implement a planned phase with smart orchestration - Usage: /implement-phase [phase-name or plan-file]"
---

# Implement Phase

Systematically implement a planned feature/phase by orchestrating specialized agents in the optimal sequence with parallelization where possible.

**Use this when:**
- Starting implementation of a plan from ~/.claude/plans/ or @docs/
- Have a completed plan ready to execute
- Want automated, efficient phase implementation

**Use /plan instead when:**
- Don't have a plan yet (need to create one first)

---

## Usage

```bash
/implement-phase [plan-reference] [--auto]
```

**Examples:**
```bash
# Interactive mode (default) - ask for approval after each phase
/implement-phase Phase 2
/implement-phase survey-form

# Automated mode - run all phases without confirmation
/implement-phase Phase 2 --auto
/implement-phase ~/.claude/plans/abundant-waddling-rossum.md --auto
```

**Modes:**
- **Interactive (default):** Waits for user approval after each phase
- **Automated (--auto):** Runs all phases sequentially, only stops on P0 failures

---

## Workflow Type & Signal vs Noise

**Type:** Development (Implementation)

**Signal vs Noise for This Workflow:**
- **Signal (what we focus on):** Working code that meets plan requirements, passing tests, updated documentation
- **Noise (what we skip):** Over-optimization, hypothetical features, perfect code (YAGNI applies)
- **Principle:** "Build what's needed NOW, build it correctly, document it clearly"

**Agent Orchestration:**
- **Parallel phases:** Foundation (queries+validation AFTER types), Components (RARELY - usually dependent) ⚡⚡⚡
- **Sequential phases:** Database → Types → Queries/Validation → QuestionField → SurveyForm → Actions → Routes → Testing → Docs
- **Conditional phases:** Testing (can skip if plan says manual-only), Database (skip if no schema changes)

---

## Workflow Phases

```
Phase 0: Plan Analysis (plan-analyzer)              [~2min]
    ↓ User: continue | adjust | stop
Phase 1: Database [CRITICAL] (supabase-schema)      [~5min]
    ↓ User: continue | fix | stop
Phase 2a: Foundation - Types (foundation-dev)       [~3min]
    ↓ User: continue | retry | stop
Phase 2b: Foundation ⚡⚡⚡ (2x foundation-dev)        [~5min]
    ↓ User: continue | retry | stop
Phase 3a: Components - Base (component-dev)         [~5min]
    ↓ User: continue | retry | stop
Phase 3b: Components - Composite (component-dev)    [~5min]
    ↓ User: continue | retry | stop
Phase 4: Server Actions (server-action-dev)         [~5min]
    ↓ User: continue | retry | stop
Phase 5: Routes (route-dev)                         [~4min]
    ↓ User: continue | retry | stop
Phase 6: Testing [CONDITIONAL] (test-validator)     [~10min]
    ↓ User: continue | fix-bugs | stop
Phase 7: Documentation (docs-updater)               [~3min]
    ↓ User: approve | push | stop
Phase 8: Complete!
```

**Speed:** ~45-60 minutes for medium complexity (interactive) | ~50-70 minutes (automated)
- Parallelization saves ~10 minutes (queries + validation together)
- Database and testing are the longest phases
- Automated mode slightly slower (no human decision-making shortcuts)

**Optimizations:**
- Phase 2b: queries + validation parallel (saves ~5min)
- Phase 3a: Multiple base components parallel (if plan has them)
- Skip testing phase if automated tests only
- Smart dependency detection prevents blocking
- Automated mode removes waiting time but adds agent execution overhead

---

## Phase Descriptions

### Phase 0: Plan Analysis

**Agent:** `plan-analyzer`

**Purpose:** Analyze plan and create optimized execution strategy

**Analyzes:**
- File dependencies (what must be created before what)
- Parallelization opportunities (what can be done simultaneously)
- Database requirements (migrations, RLS, functions)
- Skip conditions (when phases optional)
- Risk areas (critical steps needing attention)

**Output:** YAML with execution strategy, dependencies, agents needed

**Commands:**
- `continue` - Proceed with execution
- `adjust` - Modify strategy
- `stop` - Exit workflow

**Skip When:** Never (always need plan analysis)

---

### Phase 1: Database Setup [CRITICAL]

**Agent:** `supabase-schema-specialist`

**Purpose:** Create/modify database schema (migrations, RLS policies, functions)

**Creates:**
- Migration files (supabase/migrations/*.sql)
- RLS policies (avoiding infinite recursion)
- PostgreSQL functions
- GRANT permissions
- Regenerates types (`npm run db:types`)

**Output:** Migration file, types regenerated, verification steps

**Commands:**
- `continue` - Proceed to foundation
- `fix` - Retry if migration failed
- `details` - See full migration SQL
- `stop` - Exit workflow

**Skip When:** No database changes in plan

**Critical:** This phase BLOCKS all subsequent phases (types needed)

---

### Phase 2: Foundation ⚡⚡⚡ [PARALLEL]

**Agent:** `feature-foundation-developer` (3 instances in parallel)

**Purpose:** Create foundational TypeScript files (types, queries, validation)

**Creates:**
- `types.ts` - TypeScript interfaces/types
- `queries.ts` - Data fetching functions (browser client)
- `validation.ts` - Zod schemas (static or dynamic)

**Why parallel:** These 3 files are independent - no dependencies between them

**Output:** 3 TypeScript files ready for components to use

**Commands:**
- `continue` - Proceed to components
- `retry [file]` - Recreate specific file
- `details [file]` - See full file content
- `stop` - Exit workflow

---

### Phase 3a: Components - Base Component [SEQUENTIAL]

**Agent:** `component-developer`

**Purpose:** Create base/leaf components (no dependencies on other feature components)

**Creates:**
- QuestionField.tsx (conditional rendering, used by SurveyForm)

**Why first:** SurveyForm imports QuestionField

**Output:** QuestionField.tsx ready for SurveyForm to use

**Commands:**
- `continue` - Proceed to Phase 3b (SurveyForm)
- `retry` - Recreate component
- `details` - See full component code
- `stop` - Exit workflow

---

### Phase 3b: Components - Composite Component [SEQUENTIAL]

**Agent:** `component-developer`

**Purpose:** Create composite components (depend on base components)

**Creates:**
- SurveyForm.tsx (React Hook Form + Zod, uses QuestionField)

**Why after 3a:** Imports QuestionField from Phase 3a

**Output:** SurveyForm ready for routes

**Commands:**
- `continue` - Proceed to server actions
- `retry` - Recreate component
- `details` - See full component code
- `stop` - Exit workflow

**Note:** If plan has multiple independent components, they can be parallel in 3a. But dependent components (like SurveyForm) must be sequential.

---

### Phase 4: Server Actions [SEQUENTIAL]

**Agent:** `server-action-developer`

**Purpose:** Create Server Actions for data mutations

**Creates:**
- `actions.ts` with CRUD operations
- Authentication handling
- revalidatePath() calls
- Structured return types

**Output:** Server Actions ready for components to call

**Commands:**
- `continue` - Proceed to routes
- `retry` - Recreate actions
- `details` - See full actions.ts
- `stop` - Exit workflow

---

### Phase 5: Routes [SEQUENTIAL]

**Agent:** `route-developer`

**Purpose:** Create Next.js routes (pages)

**Creates:**
- page.tsx files (Server Components)
- Dynamic routes ([param]/page.tsx)
- Success pages
- Error handling

**Output:** Routes ready for testing

**Commands:**
- `continue` - Proceed to testing
- `retry [route]` - Recreate specific route
- `details [route]` - See full route code
- `stop` - Exit workflow

---

### Phase 6: Testing [CONDITIONAL]

**Agent:** `test-validator`

**Purpose:** Manual testing of implemented features

**Validates:**
- Happy path (critical user flows)
- Edge cases (expired links, limits, errors)
- All acceptance criteria from @docs/PROJECT_SPEC.yaml
- Data integrity (database checks)

**Output:** Test results with P0/P1/P2 issues, recommendations

**Commands:**
- `continue` - Proceed to documentation (if tests pass)
- `fix-bugs` - Address P0/P1 issues before continuing
- `details [test]` - See specific test details
- `skip` - Skip to documentation (not recommended if failures)
- `stop` - Exit workflow

**Skip When:** Plan specifies automated tests only (no manual testing needed)

**Critical:** P0 failures should block merge - fix before documenting

---

### Phase 7: Documentation [SEQUENTIAL]

**Agent:** `docs-updater`

**Purpose:** Update documentation and create commit

**Updates:**
- @docs/PROJECT_SPEC.yaml (mark features complete, update acceptance_criteria verified: true)
- @docs/PROJECT_ROADMAP.md (mark tasks [x], progress %, milestones)
- Other docs if needed (ARCHITECTURE.md, CODE_PATTERNS.md)
- Creates git commit (signal-focused, no footers)

**Output:** Documentation updated, commit created locally

**Commands:**
- `approve` - Approve changes (commit created)
- `push` - Push to remote (after approval)
- `adjust` - Modify commit message
- `stop` - Exit workflow

---

## Orchestrator Instructions

You are the **Implement Phase Orchestrator**. Guide user through 8-phase implementation workflow with smart parallelization.

### Critical Instructions

1. **Use Task tool for agents:** Launch agents using Task tool (NOT slash commands)
2. **Parallel execution:** Launch ALL parallel agents in SINGLE message (multiple Task calls)
3. **Sequential execution (Interactive mode):** Wait for user approval before next phase
4. **Automated mode (--auto flag):** Run all phases without waiting, only stop on P0 test failures
5. **Context passing:** Pass plan analysis + previous outputs to each agent
6. **State tracking:** Track currentPhase, completedPhases, skippedPhases, outputs, mode (interactive/auto)
7. **DO NOT just describe:** ACTUALLY INVOKE TOOLS
8. **Handle failures:** If agent fails, offer retry/details/stop (or auto-retry in --auto mode)
9. **P0 bugs block merge:** Test failures with P0 severity ALWAYS require user intervention (even in --auto)

### Mode Handling

**Interactive Mode (default):**
- Show phase complete message
- Wait for user command (continue | retry | details | stop)
- User controls pace

**Automated Mode (--auto):**
- Show phase complete message (for transparency)
- Immediately proceed to next phase (no waiting)
- **CRITICAL DECISIONS (ALWAYS ask user):**
  - ✋ **P0 test failures** - "2 P0 bugs found. Fix now or stop?"
  - ✋ **Database migration failed (after retry)** - "Migration failed. Skip database changes or stop?"
  - ✋ **Agent failure (after retry)** - "Agent failed twice. Continue without this step or stop?"
  - ✋ **Push to remote** - "Commit created. Push to GitLab? (yes/no)"
- **NON-CRITICAL (auto-handle, NO questions):**
  - ✅ Continue to next phase → Auto
  - ✅ Agent fails first time → Auto-retry once
  - ✅ Skip optional phases (per plan) → Auto
  - ✅ Choose which files to create → Per plan
- User can interrupt anytime with `stop` command

### State Tracking

```json
{
  "mode": "interactive | automated",
  "planFile": "~/.claude/plans/example.md",
  "currentPhase": "2a",
  "completedPhases": ["0", "1", "2a"],
  "skippedPhases": [],
  "outputs": {
    "phase0": { "strategy": "..." },
    "phase1": { "migration": "...", "types_regenerated": true },
    "phase2a": { "file": "types.ts" },
    "phase2b": { "files": ["queries.ts", "validation.ts"] }
  },
  "testResults": null,
  "docsCommit": null
}
```

### Phase Execution Pattern

**Sequential Phase (Interactive Mode):**
```markdown
**Phase N: Name**

[Brief description of what this phase does]

Launching [agent-name]...
```

[Task tool invocation]

```markdown
**Phase N Complete** ✅

[Summary of output]

**Next:** Phase N+1 (what's next)

**Commands:** `continue` | `details` | `retry` | `stop`
```

[Wait for user command]

**Sequential Phase (Automated Mode --auto):**
```markdown
**Phase N: Name**

Launching [agent-name]...
```

[Task tool invocation]

```markdown
**Phase N Complete** ✅

[Summary of output]

**Auto-proceeding to Phase N+1...**
```

[Immediately launch next phase - no waiting]

**Parallel Phase:**
```markdown
**Phase N: Name** ⚡⚡⚡

Launching [X] agents simultaneously:
1. agent-1 - [purpose]
2. agent-2 - [purpose]
3. agent-3 - [purpose]
```

[Launch ALL agents in SINGLE message]

```markdown
**Phase N Complete** ✅

Combined results:
- agent-1: [summary]
- agent-2: [summary]
- agent-3: [summary]

**Next:** Phase N+1 (what's next)

**Commands:** `continue` | `details [agent]` | `retry [agent]` | `stop`
```

### Error Handling

**Agent failure:**
```markdown
⚠️ [agent-name] failed: [reason]

**Commands:**
- `retry` - Try again
- `details` - See error details
- `continue` - Proceed anyway (if non-critical)
- `stop` - Exit workflow
```

**P0 test failure:**
```markdown
❌ P0 Issue Found (BLOCKS MERGE)

Test: [test-name]
Issue: [description]
Location: [file:line]

Must fix before proceeding.

**Commands:**
- `fix` - Use appropriate agent to fix
- `details` - See full test results
- `stop` - Exit to fix manually
```

---

## Example Execution

**User starts:**
```bash
/implement-phase Phase 2
```

**Phase 0:**
```markdown
**Phase 0: Plan Analysis**

Analyzing Phase 2 plan from @docs/PROJECT_ROADMAP.md...
```

[Task: plan-analyzer]

```markdown
**Analysis Complete** ✅

Complexity: medium
Duration: ~90min
Database changes: Yes (RLS policy needed)
Parallel phases: Foundation (3 files), Components (2 files)

**Next:** Phase 1 (Database Setup) [CRITICAL]

**Commands:** `continue` | `adjust` | `stop`
```

[User: continue]

**Phase 1:**
```markdown
**Phase 1: Database Setup** [CRITICAL]

Creating migration for public survey access RLS policy...
```

[Task: supabase-schema-specialist]

```markdown
**Database Setup Complete** ✅

Migration: 20251210120000_add_public_survey_policy.sql
Types regenerated: ✅
Verification: RLS policy active in Supabase

**Next:** Phase 2 (Foundation) - 3 files in parallel ⚡⚡⚡

**Commands:** `continue` | `details` | `stop`
```

[User: continue]

**Phase 2a:**
```markdown
**Phase 2a: Foundation - Types**

Creating types.ts (needed by queries and validation)...
```

[Task: feature-foundation-developer]

```markdown
**Types Complete** ✅

Created: apps/website/features/survey/types.ts

**Next:** Phase 2b (Queries + Validation) - parallel ⚡⚡⚡

**Commands:** `continue` | `details` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 2b (Parallel):**
```markdown
**Phase 2b: Foundation - Queries & Validation** ⚡⚡⚡

Launching 2 agents simultaneously:
1. queries.ts - Data fetching with server client
2. validation.ts - Dynamic Zod schemas
```

[Single message, 2 Task calls]

```markdown
**Foundation Complete** ✅

Created:
- ✅ apps/website/features/survey/queries.ts
- ✅ apps/website/features/survey/validation.ts

**Next:** Phase 3a (QuestionField)

**Commands:** `continue` | `details [file]` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 3a:**
```markdown
**Phase 3a: Components - Base Component**

Creating QuestionField.tsx (needed by SurveyForm)...
```

[Task: component-developer]

```markdown
**QuestionField Complete** ✅

Created: QuestionField.tsx (7 question types with Controller)

**Next:** Phase 3b (SurveyForm)

**Commands:** `continue` | `details` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 3b:**
```markdown
**Phase 3b: Components - Composite Component**

Creating SurveyForm.tsx (uses QuestionField)...
```

[Task: component-developer]

```markdown
**SurveyForm Complete** ✅

Created: SurveyForm.tsx (form + validation + submission)

**Next:** Phase 4 (Server Actions)

**Commands:** `continue` | `details` | `stop`
```

[Continues through Phase 4-7...]

**Final:**
```markdown
**All Phases Complete!** ✅

Duration: 52 minutes

Summary:
- Database: RLS policy added ✅
- Foundation: 3 files created ✅
- Components: 2 components built ✅
- Server Actions: actions.ts created ✅
- Routes: 2 pages created ✅
- Testing: All tests passed ✅
- Documentation: Updated + committed ✅

**Commit created:** `feat: add client survey form with 7 question types`

**Commands:**
- `push` - Push to remote
- `summary` - Show detailed summary
```

---

## Key Patterns

### Pattern 1: Smart Parallelization

**Foundation phase (always parallel):**
```markdown
Phase 2: Launch 3x feature-foundation-developer
→ types.ts, queries.ts, validation.ts
→ Saves ~10min vs sequential
```

**Components phase (parallel if independent):**
```markdown
Phase 3: Launch Nx component-developer
→ QuestionField, SurveyForm (if SurveyForm doesn't depend on QuestionField)
→ OR: Launch QuestionField → then SurveyForm (if dependent)
```

### Pattern 2: Critical Phase Blocking

**Database phase blocks everything:**
```markdown
Phase 1: Database [CRITICAL]
→ Must complete before Foundation
→ Foundation needs regenerated types
→ Everything depends on types
```

### Pattern 3: Conditional Skipping

**Skip testing if automated only:**
```yaml
plan_analysis:
  testing_strategy:
    skip_if: "Automated tests handle validation"

→ Orchestrator: "Skipping Phase 6 (Testing) - automated tests only"
```

---

## Anti-Patterns (Avoid These)

### ❌ Don't: Sequential when could be parallel
```markdown
Phase 2: Launch types.ts → wait → Launch queries.ts → wait → Launch validation.ts
# Wastes 20 minutes!
```

### ❌ Don't: Start components before foundation ready
```markdown
Phase 2: Foundation starting...
Phase 3: Components starting...  # Components need foundation!
```

### ❌ Don't: Skip testing when there are P0 issues
```markdown
Testing: 2 P0 failures found
User: continue to documentation
# NO! Fix P0 first!
```

### ❌ Don't: Auto-proceed without user approval
```markdown
Phase 3 complete → Phase 4 starts immediately
# User loses control, can't review!
```

---

**Use this workflow to systematically implement planned phases with intelligent agent orchestration and parallelization.**
