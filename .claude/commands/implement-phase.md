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
    ↓ BUILD VERIFICATION: npm run build:cms
    ↓ MANUAL TEST CHECKPOINT (if testable)
    ↓ User: continue | fix | stop
Phase 2a: Foundation - Types (foundation-dev)       [~3min]
    ↓ User: continue | retry | stop
Phase 2b: Foundation ⚡⚡⚡ (2x foundation-dev)        [~5min]
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 3a: Components - Base (component-dev)         [~5min]
    ↓ User: continue | retry | stop
Phase 3b: Components - Composite (component-dev)    [~5min]
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 4: Server Actions / API Routes               [~5min]
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 5: Routes (route-dev)                        [~4min]
    ↓ BUILD VERIFICATION: npm run build ← BOTH APPS MUST PASS
    ↓ User: continue | retry | stop
Phase 6: Implementation Verification              [~2-3min]
    ↓ (implementation-validator)
    ↓ STATIC CODE ANALYSIS - verify correctness, patterns, bugs
    ↓ User: pass | fix | details | stop
Phase 7: Manual Testing [REQUIRED]                 [user-driven]
    ↓ User tests complete feature manually
    ↓ User: pass | fix-and-retry | stop
Phase 8: Documentation (docs-updater)              [~3min]
    ↓ User: approve | push | stop
Phase 9: Complete!
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
- **Ambiguities and missing details** (asks user for clarification)

**Critical:** Agent MUST identify and ask about:
- Unclear requirements (vague features)
- Missing implementation details (how should X work?)
- Ambiguous architecture decisions (which approach to use?)
- Undefined edge cases (what happens when...?)

**Output:** YAML with execution strategy, dependencies, agents needed

**Commands:**
- `continue` - Proceed with execution (after clarifying ambiguities)
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
- `continue` - Proceed to implementation verification
- `retry [route]` - Recreate specific route
- `details [route]` - See full route code
- `stop` - Exit workflow

---

### Phase 6: Implementation Verification

**Agent:** `implementation-validator`

**Purpose:** Verify implementation correctness before manual testing

**Analyzes:**
- Business logic correctness (does code match requirements?)
- Plan alignment (all planned features implemented?)
- Code quality (follows CODE_PATTERNS.md?)
- Bug detection (potential errors, missing error handling, edge cases)
- Completeness (all required files created?)
- Security (RLS, auth, tenant_id correct?)

**Creates:**
- YAML verification report with P0/P1/P2 issues
- Suggestions for which agent to use for fixes

**Output:** Verification report with implementation status

**Commands:**
- `pass` - Verification passed, proceed to manual testing
- `fix` - Issues found, need to fix (agent will suggest which implementation agent to use)
- `details` - Show full verification report
- `stop` - Exit workflow

**Skip When:** Never (always verify implementation)

**Critical:** This phase catches code-level issues before manual testing saves time. Agent performs static analysis - no execution required.

---

### Phase 7: Manual Testing [REQUIRED]

**Purpose:** User manually tests implemented features before documentation

**This is NOT automated** - the orchestrator pauses here and instructs user to test manually.

**Orchestrator provides:**
1. **Test instructions** based on acceptance criteria from plan
2. **What to test** (specific user flows)
3. **How to test** (step-by-step commands/clicks)
4. **What to verify** (expected results)
5. **Debug logging setup** (CRITICAL for troubleshooting)

**User performs:**
1. Manual testing following instructions
2. Verifies feature works end-to-end
3. Reports back: `pass` | `fix-and-retry` | `stop`

---

### Debug Logging for Manual Tests [CRITICAL]

**ALWAYS add debug logging before manual testing** - this accelerates debugging by 10x when issues occur.

**Step 1: Add console.log to API endpoints/Server Actions**

Before starting dev servers, add logging to all new/modified API routes:

```typescript
// Example: API Route logging pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API_NAME] Received body:', JSON.stringify(body, null, 2))

    const validatedData = schema.parse(body)
    console.log('[API_NAME] Validation passed')

    // ... business logic ...

    const result = await someOperation()
    console.log('[API_NAME] Result:', result)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[API_NAME] Validation failed:', error.errors)
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    console.error('[API_NAME] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Key logging points:**
- ✅ Request body received (before validation)
- ✅ Validation passed/failed (with Zod errors)
- ✅ Database query results
- ✅ External API responses
- ✅ All errors (with context)

**Step 2: Start dev servers in background with log capture**

```bash
# Kill any existing processes
pkill -9 node; pkill -9 next

# Start website with log capture
npm run dev:website > /tmp/dev-website.log 2>&1 &

# Start CMS with log capture (if needed)
npm run dev:cms > /tmp/dev-cms.log 2>&1 &

# Wait for servers to start
sleep 8

# Verify servers are running
curl -s http://localhost:3000 > /dev/null && echo "✅ Website ready"
curl -s http://localhost:3001 > /dev/null && echo "✅ CMS ready"
```

**Step 3: Monitor logs during testing**

While user tests, you can check logs on demand:

```bash
# Check recent website logs
tail -50 /tmp/dev-website.log

# Check recent CMS logs
tail -50 /tmp/dev-cms.log

# Follow logs in real-time (if needed)
tail -f /tmp/dev-website.log

# Search for specific API calls
grep -A 10 "API_NAME" /tmp/dev-website.log

# Search for errors
grep -i "error\|failed\|invalid" /tmp/dev-website.log
```

**Step 4: User reports result, you check logs**

```markdown
User: "I see error: Invalid request body"

Assistant checks:
tail -100 /tmp/dev-website.log | grep -A 15 "API_NAME"

Log shows:
[API_NAME] Received body: { "field": "value" }
[API_NAME] Validation failed: [{ path: "field", message: "..." }]

→ Immediately see exact problem and fix it
```

---

**Example test instructions with logging:**
```
📋 Manual Testing - Survey Submission

**Setup (Assistant does this):**
1. Add debug logging to API endpoints:
   - apps/website/app/api/survey/submit/route.ts
   - Add console.log for: body received, validation, database results

2. Start dev servers in background:
   pkill -9 node
   npm run dev:website > /tmp/dev-website.log 2>&1 &
   npm run dev:cms > /tmp/dev-cms.log 2>&1 &
   sleep 8

3. Verify servers ready:
   ✅ http://localhost:3000
   ✅ http://localhost:3001

**User Testing:**
1. Generate survey link (CMS):
   - Login at http://localhost:3001/login
   - Go to Surveys → Open survey → Generate Link
   - Copy link to clipboard

2. Submit survey (Website):
   - Open link in incognito tab
   - Fill out all required fields
   - Click Submit

3. Verify success:
   ✅ Redirect to success page
   ✅ Check Supabase: responses table has new row
   ✅ Check tenant_id is populated

**If error occurs:**
- User reports the error message
- Assistant checks: tail -100 /tmp/dev-website.log
- Logs show exact problem (request body, validation error, database error)
- Fix immediately with context

Report: pass | check (see logs) | stop
```

**Commands:**
- `pass` - Tests passed, proceed to documentation
- `check` - User saw error, check logs to debug
- `fix-and-retry` - Found bugs, fix them and test again
- `stop` - Exit workflow (fix bugs manually later)

**Critical:**
- NEVER proceed to documentation without passing manual tests
- ALWAYS add debug logging before starting manual tests
- ALWAYS capture logs to /tmp/ for easy inspection

---

### Phase 8: Documentation [SEQUENTIAL]

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

You are the **Implement Phase Orchestrator**. Guide user through 9-phase implementation workflow with smart parallelization (Phase 0-9).

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
10. **Manual test checkpoints:** After phases with testable output, PAUSE and provide test instructions to user
11. **Build verification:** After each code-generating phase, verify the build succeeds - catch TypeScript errors early
12. **Implementation verification:** After Phase 5 (Routes), ALWAYS run Phase 6 (implementation-validator) to catch code issues before manual testing
13. **NEVER skip Phase 7:** Phase 7 (Manual Testing) is REQUIRED - user must test before docs

### Build Verification Checkpoints

**CRITICAL:** After every code-generating phase, run a build test to catch errors early.

**When to build:**
- **After Phase 2b (Foundation):** `npm run build:cms` - Verify types/queries compile
- **After Phase 3b (Components):** `npm run build:cms` - Verify components compile
- **After Phase 4 (Server Actions):** `npm run build:cms` - Verify actions compile
- **After Phase 5 (Routes):** `npm run build` - Build BOTH apps (cms + website)

**Why build after each phase:**
- ✅ Catch TypeScript errors immediately (not at end)
- ✅ Identify missing imports, type mismatches early
- ✅ Prevent cascading failures in dependent code
- ✅ Quick feedback loop for agents to fix issues
- ✅ Avoid massive refactor at the end

**How to verify build:**

```bash
# Build CMS only (fastest - for phases affecting CMS)
npm run build:cms

# Build Website only (for phases affecting Website)
npm run build:website

# Build both apps (complete verification)
npm run build
```

**Expected output on success:**
```
✓ Compiled successfully
Running TypeScript...
✓ Generating static pages
[No errors]
```

**If build fails:**
1. Read the error message carefully (line number, what's wrong)
2. Report error to the next agent or user
3. Agent fixes the issue
4. Rebuild to verify fix
5. Continue only after build succeeds

**Example build error handling:**

```markdown
❌ Build Failed After Phase 3

Error: Property 'label' does not exist on type 'Question'
Location: apps/cms/features/responses/components/ResponseDetail.tsx:178

Fix: Change `pair.question.label` to `pair.question.question`

Retrying build...
✅ Build now succeeds
```

---

### Manual Test Checkpoints

**When to pause for manual testing:**
- **After Phase 1 (Database):** If migration creates testable database changes
- **After Phase 5 (Routes):** Always - routes make feature accessible for testing
- **Phase 7 (Manual Testing):** Always required before documentation

**How to provide test instructions:**
1. Identify what's testable (based on completed phases)
2. Write step-by-step test instructions
3. Include what to verify (expected results)
4. Provide SQL queries if database verification needed
5. Wait for user response: `pass` | `fix-and-retry` | `stop`

**Example checkpoint after Phase 1:**
```markdown
🧪 **Manual Test Checkpoint - Database Migration**

The migration has been applied. Test the changes:

1. Go to Supabase Dashboard → SQL Editor
2. Run: SELECT * FROM pg_policies WHERE tablename = 'responses';
3. Verify: Policy "Anyone can create responses" exists with TO anon

4. Test RLS policy:
   SET ROLE anon;
   INSERT INTO responses (survey_link_id, tenant_id, answers, status)
   VALUES ('[link-id]', '[tenant-id]', '{"test": "data"}'::jsonb, 'new');
   -- Should succeed

Report: pass | fix | stop
```

**Example checkpoint after Phase 5:**
```markdown
🧪 **Manual Test Checkpoint - Feature Complete**

All code is written. Test the complete feature:

1. Start apps: npm run dev:cms && npm run dev:website
2. [Step-by-step user flow based on acceptance criteria]
3. Verify: [Expected outcomes]

Report: pass | fix-and-retry | stop
```

### Mode Handling

**Interactive Mode (default):**
- Show phase complete message
- PAUSE at manual test checkpoints
- Wait for user command (continue | retry | details | stop | pass)
- User controls pace

**Automated Mode (--auto):**
- Show phase complete message (for transparency)
- Immediately proceed to next phase (no waiting)
- **CRITICAL DECISIONS (ALWAYS pause and ask user):**
  - ✋ **Manual test checkpoints** - "Phase 1/5/6 complete. Please test manually."
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

**Key principle:** Even in --auto mode, NEVER skip manual testing checkpoints

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

**Phase with Manual Test Checkpoint:**
```markdown
**Phase N Complete** ✅

[Summary of output]

---

🧪 **Manual Test Checkpoint**

[Test instructions - what to test, how to test, what to verify]

**After testing, report:**
- `pass` - Tests passed, continue to next phase
- `fix` - Found issues, need fixes
- `stop` - Exit workflow
```

[Wait for user testing and response]

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

[Continues through Phase 4-5...]

**Phase 6:**
```markdown
**Phase 6: Implementation Verification**

Analyzing implementation against plan and CODE_PATTERNS...
```

[Task: implementation-validator]

```markdown
**Implementation Verification Complete** ✅

Summary:
- Business Logic: ✅ Correct (all features implemented correctly)
- Plan Alignment: ✅ Complete (all planned features present)
- Code Quality: ✅ Good (follows CODE_PATTERNS.md)
- Bug Detection: ⚠️ Minor issues (1 P1 issue found)
- Completeness: ✅ All files created
- Security: ✅ Secure (RLS, auth, tenant_id correct)

Issues Found: 1 P1

**P1 Issues:**
- Missing error handling in queries.ts:23
  Fix: Add null check before returning data

**Next:** Fix P1 issue or proceed to manual testing?

**Commands:** `fix` | `pass` | `details` | `stop`
```

[User: pass - issue non-blocking, can test manually]

[Continues through Phase 7-8...]

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
- Implementation Verification: Code analyzed, 1 P1 issue (non-blocking) ✅
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

→ Orchestrator: "Skipping Phase 7 (Testing) - automated tests only"
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

### ❌ Don't: Skip build verification
```markdown
Phase 2b complete → Immediately launch Phase 3
# NO! Must verify build succeeds first!
```

✅ **Correct:**
```markdown
Phase 2b complete → npm run build:cms → Verify succeeds → Phase 3 starts
```

### ❌ Don't: Skip manual testing checkpoints
```markdown
Phase 5 complete → Immediately launch docs-updater
# NO! User must test first!
```

✅ **Correct:**
```markdown
Phase 5 complete → npm run build (both apps) → Phase 6 (implementation-validator) → Manual test checkpoint → User tests → Reports pass → Launch docs-updater
```

### ❌ Don't: Skip implementation verification
```markdown
Phase 5 complete → Build succeeds → Immediately launch test-validator
# NO! Must verify code correctness first!
```

✅ **Correct:**
```markdown
Phase 5 complete → Build succeeds → Launch implementation-validator → Analyze code → Fix P0 issues → Launch test-validator
```

### ❌ Don't: Accumulate build errors
```markdown
Phase 2b: Build fails - ignore it
Phase 3: Build fails - continue anyway
Phase 4: Build fails - deal with it later
# NO! Now have 10+ errors to fix!
```

✅ **Correct:**
```markdown
Phase 2b: Build fails → Agent fixes immediately → Rebuild verifies fix → Continue to Phase 3
Phase 3: Build succeeds → Continue to Phase 4
Phase 4: Build succeeds → Continue to Phase 5
# Clean builds all the way!
```

---

**Use this workflow to systematically implement planned phases with intelligent agent orchestration, parallelization, and mandatory manual testing checkpoints.**
