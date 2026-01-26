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
/implement-phase [plan-reference] [--auto] [--notion-task-id=<task-id>]
```

**Examples:**
```bash
# NOTION-FIRST (recommended) - searches Notion automatically
/implement-phase calendar integration
/implement-phase google calendar fix

# With specific Notion task ID - skip search, use directly
/implement-phase --notion-task-id=2ed84f14-76e0-80c0-8da7-d574cdf2a4fe

# Skip Notion, use local file only
/implement-phase Phase 2 --skip-notion
/implement-phase ~/.claude/plans/plan.md --skip-notion

# Automated mode with Notion
/implement-phase calendar integration --auto

# Automated mode with specific Notion task
/implement-phase --notion-task-id=2ed84f14-76e0-80c0-8da7-d574cdf2a4fe --auto
```

**Parameters:**
- `plan-reference` - Search term for Notion OR path to local file (e.g., "calendar integration", "~/.claude/plans/plan.md")
- `--auto` - Run all phases without manual approval (except manual testing)
- `--notion-task-id=<task-id>` - Use specific Notion task (skips search)
- `--skip-notion` - Skip Notion search, use only local files

**Modes:**
- **Interactive (default):** Waits for user approval after each phase
- **Automated (--auto):** Runs all phases sequentially, only stops on P0 failures
- **Notion-First (default):** Searches Notion for tasks matching plan-reference, lets user select
- **Direct Task (--notion-task-id):** Skip search, use specific Notion task directly
- **Local Only (--skip-notion):** Skip Notion entirely, use local files only

**Behavior (NOTION-FIRST):**
- **ALWAYS start by searching Notion** for relevant tasks (unless `--skip-notion` flag provided)
- If Notion task found: Use it as primary source, sync status after Phase 8
- If `--notion-task-id` provided: Skip search, fetch specific task directly
- If plan file provided AND Notion empty: Use local file as fallback
- Falls back to local if Notion unavailable

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

## Reference Documentation

**Skills (loaded automatically via agent skills: field):**
- `supabase-patterns` - Database patterns (RLS, clients, migrations)
- `code-patterns` - Application patterns (Server Actions, types, TanStack Query)
- `architecture-decisions` - Monorepo structure, app/features separation
- `notion-integration` - Notion MCP patterns (if --notion-task-id used)
- `design-system` - UI/UX patterns for components
- `signal-vs-noise` - Decision filter for documentation and commits
- `claude-md-guidelines` - Guidelines for writing feature CLAUDE.md files

**Agents automatically load relevant skills based on their skills: field.**

**Note:** Skills are domain knowledge loaded on-demand. Commands orchestrate workflow. Agents execute specialized tasks.

---

## Workflow Phases

```
Phase 1: Notion Discovery [AUTOMATIC] (orchestrator)
    ↓ Search Notion for tasks matching plan-reference
    ↓ Filter out Skills Projects (Type = 🎓 Learning)
    ↓ Present Agency tasks to user for selection
    ↓ User: select task | use-local | stop
Phase 2: Plan Analysis (analysis-agent)
    ↓ User: continue | adjust | stop
Phase 3: Database [CRITICAL] (database-specialist)
    ↓ BUILD VERIFICATION: npm run build:cms
    ↓ MANUAL TEST CHECKPOINT (if testable)
    ↓ User: continue | fix | stop
Phase 4a: Foundation - Types (code-developer)
    ↓ User: continue | retry | stop
Phase 4b: Foundation ⚡⚡⚡ (2x code-developer)
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 5a: Components - Base (code-developer)
    ↓ User: continue | retry | stop
Phase 5b: Components - Composite (code-developer)
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 5c: UI/UX Review (ui-ux-designer)
    ↓ BUILD VERIFICATION: npm run build:cms (if changes made)
    ↓ User: continue | fix | stop
Phase 6: Server Actions / API Routes (code-developer)
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 7: Routes (code-developer)
    ↓ BUILD VERIFICATION: npm run build ← BOTH APPS MUST PASS
    ↓ User: continue | retry | stop
Phase 8: Implementation Verification (analysis-agent)
    ↓ STATIC CODE ANALYSIS - verify correctness, patterns, bugs
    ↓ User: pass | fix | details | stop
Phase 9: Manual Testing [REQUIRED]
    ↓ User tests complete feature manually
    ↓ User: pass | fix-and-retry | stop
Phase 10: Documentation (project-manager-agent)
    ↓ Updates PROJECT_ROADMAP.md + PROJECT_SPEC.yaml + CLAUDE.md (content)
    ↓ Syncs Notion task status (if applicable)
    ↓ User: approve | adjust | stop
Phase 10a: CLAUDE.md Quality Review [MANDATORY]
    ↓ (orchestrator + claude-md-guidelines skill + signal-vs-noise skill)
    ↓ REVIEW: Content quality, signal vs noise, project-specificity
    ↓ User: approve | refine | skip | stop
Phase 10b: Skills Update Review [CONDITIONAL]
    ↓ (orchestrator + skill-creator skill)
    ↓ CHECK: New patterns discovered? Skills need updates?
    ↓ User: approve | update [skill] | skip | stop
Phase 11: Git Operations (project-manager-agent)
    ↓ Creates commit, optionally pushes
    ↓ User: commit | push | pr | skip | stop
Phase 12: Complete!
```

**Optimizations:**
- Phase 4b: queries + validation parallel
- Phase 5a: Multiple base components parallel (if plan has them)
- Skip testing phase if automated tests only
- Smart dependency detection prevents blocking

---

## NOTION INTEGRATION WORKFLOW

**Reference:** See notion-integration skill for complete MCP examples and patterns

### Overview

When Notion task is used, the workflow integrates with Notion:
- **Phase 1:** Searches and presents Notion tasks (unless --notion-task-id provided)
- **Phase 2:** Analyzes selected task (Name, Notes, Projects context)
- **Phases 3-9:** Execute normally (using Notes as plan content)
- **Phase 10:** project-manager-agent syncs status to "Done" and adds completion notes
- **Phase 11:** project-manager-agent creates commit

### Phase 1-2: Reading from Notion (orchestrator + analysis-agent)

**When Notion task selected:**

1. **Extract plan from task:**
   - Plan content: Notes property
   - Task name: Name property
   - Context: Priority, Deadline, Projects

2. **Skills Projects already filtered** in Phase 1

3. **Pass to analysis-agent:**
   - Task name + plan content + notion context
   - Agent analyzes as normal

**Status Values (IMPORTANT):**
- Notion statuses are **case-sensitive with spaces**
- ✅ Correct: `"In Progress"`, `"Done"`
- ❌ Wrong: `"in_progress"`, `"done"`, `"in-progress"`

**Fallback Strategy:**
```yaml
If Notion API unavailable:
  - Log warning: "Notion API unavailable, falling back to local plan"
  - Read from local plan file (if provided)
  - Continue execution with available data
  - Phase 10 skips Notion sync (sync_status: "failed")
```

### Phase 10: Syncing to Notion (project-manager-agent)

**When Notion task used:**

**Orchestrator passes:**
```yaml
notion_context:
  task_id: "29284f14-76e0-8012-8708-abc123"
  task_url: "https://notion.so/29284f14-76e0-8012-8708-abc123"
  sync_required: true
```

**Agent updates:**
1. Task Status: "In Progress" → "Done"
2. Add completion notes to task Notes
3. Optionally create doc page (complex features)

See `notion-integration` skill for MCP tool examples.

### State Tracking with Notion

```json
{
  "mode": "interactive | automated",
  "planFile": "~/.claude/plans/example.md | null",
  "notion_task_id": "29284f14-76e0-8012-8708-abc123",
  "notion_task_url": "https://notion.so/29284f14-76e0-8012-8708-abc123",
  "notion_sync_status": "pending | synced | failed",
  "currentPhase": "2a",
  "completedPhases": ["0", "1", "2a"],
  "outputs": {
    "phase0": {
      "strategy": "...",
      "notion_context": {
        "task_id": "abc123",
        "task_name": "Implement Redis caching",
        "project": "Legal-Mind MVP",
        "priority": "🔴 Urgent"
      }
    }
  }
}
```

### Error Handling

**Notion API Unavailable:**
```markdown
⚠️ Notion API unavailable

Falling back to local plan file (if provided)

Phase 0-7: Execute using local data
Phase 8: Skip Notion sync (status: failed)

Output includes: notion_sync_status: "failed"
```

**Task Not Found:**
```markdown
❌ Notion task not found

Task ID: 29284f14-76e0-8012-abc123

Verify:
- Task ID is correct (UUID format)
- Task exists in Agency Tasks database
- Notion MCP connection is active

**Commands:** `retry` | `use-local` | `stop`
```

**Skills Project Detected:**
```markdown
⚠️ Skills Project detected

This task is linked to a Skills Project (Type: 🎓 Learning).
Agency implementation workflows only process agency work.

**Reason:** Personal learning projects should not trigger automated agents.

**Commands:** `select-different-task` | `stop`
```

---

## Phase Descriptions

### Phase 1: Notion Discovery [AUTOMATIC]

**Orchestrator:** Direct (no agent)

**Purpose:** Find relevant Notion tasks before starting implementation

**When to run:**
- ALWAYS (unless `--skip-notion` or `--notion-task-id` provided)
- Runs automatically at workflow start

**Process:**

1. **Search Notion using MCP tool** for tasks matching plan-reference query
   ```typescript
   mcp__notion__notion-search({
     query: plan-reference,  // e.g., "Google Calendar integration"
     query_type: "internal"
   })
   ```
   **CRITICAL:** Use `mcp__notion__notion-search` MCP tool, NOT Notion CLI or bash commands.

2. **Fetch and filter** each result:
   - Extract: Name, Status, Priority, Projects, Notes
   - **Filter OUT Skills Projects:**
     - Project Type = "🎓 Learning"
     - Project has "📚 Skills Projects" relation

3. **Present Agency tasks** to user with:
   - Task ID, Name, Priority, Status
   - Project name
   - Notes preview (first 2 lines)
   - Mark filtered tasks as [FILTERED - Skills Project]

4. **User selects** task number OR `use-local` OR `stop`

**Commands:**
- `1`, `2`, etc. - Select task by number
- `use-local` - Skip Notion, use local file
- `stop` - Exit workflow

**Skip When:**
- `--skip-notion` flag provided
- `--notion-task-id` provided (skip search, use direct ID)

**Output:** `notion_task_id` (if selected) OR fallback to local

---

### Phase 2: Plan Analysis

**Agent:** `analysis-agent` (uses plan-analysis skill)

**Purpose:** Analyze plan and create optimized execution strategy

**Input Sources (from Phase 1):**
1. **Notion task** (if selected in Phase 1) - **PRIMARY**
2. **Local plan file** (if `use-local` chosen) - **FALLBACK**

**When Notion task selected:**
- Task already fetched in Phase 1
- Extract: Name (title), Notes (plan content), Projects (context)
- Already filtered Skills Projects in Phase 1
- Pass to analysis-agent: "Analyze this Notion task: [Name]\n\n[Notes]"

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

**Output:** YAML with execution strategy, dependencies, agents needed, **notion_context** (if Notion task)

**Commands:**
- `continue` - Proceed with execution (after clarifying ambiguities)
- `adjust` - Modify strategy
- `stop` - Exit workflow

**Skip When:** Never (always need plan analysis)

---

### Phase 3: Database Setup [CRITICAL]

**Agent:** `database-specialist` (uses schema-management, rls-policies, database-functions skills)

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

### Phase 4: Foundation ⚡⚡⚡ [PARALLEL]

**Agent:** `code-developer` (uses foundation-patterns skill, 3 instances in parallel)

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

### Phase 5a: Components - Base Component [SEQUENTIAL]

**Agent:** `code-developer` (uses component-patterns skill)

**Purpose:** Create base/leaf components (no dependencies on other feature components)

**Creates:**
- QuestionField.tsx (conditional rendering, used by SurveyForm)

**Why first:** SurveyForm imports QuestionField

**Output:** QuestionField.tsx ready for SurveyForm to use

**Commands:**
- `continue` - Proceed to Phase 5b (SurveyForm)
- `retry` - Recreate component
- `details` - See full component code
- `stop` - Exit workflow

---

### Phase 5b: Components - Composite Component [SEQUENTIAL]

**Agent:** `code-developer` (uses component-patterns skill)

**Purpose:** Create composite components (depend on base components)

**Creates:**
- SurveyForm.tsx (React Hook Form + Zod, uses QuestionField)

**Why after 5a:** Imports QuestionField from Phase 5a

**Output:** SurveyForm ready for routes

**Commands:**
- `continue` - Proceed to server actions
- `retry` - Recreate component
- `details` - See full component code
- `stop` - Exit workflow

**Note:** If plan has multiple independent components, they can be parallel in 5a. But dependent components (like SurveyForm) must be sequential.

---

### Phase 5c: UI/UX Review [SEQUENTIAL]

**Agent:** `ui-ux-designer`

**Purpose:** Review components for design excellence, accessibility, and visual polish

**Reviews:**
- shadcn/ui component usage and design system compliance
- Tailwind spacing consistency (4px scale)
- Visual hierarchy and typography
- Accessibility (WCAG 2.1 AA compliance)
- Responsive design patterns (mobile-first)
- UI states (loading, error, empty, disabled)

**Why after 5b:** Components are functionally complete, ready for design review

**Output:** YAML report with P0/P1/P2 design issues and concrete recommendations

**Commands:**
- `continue` - Design approved, proceed to server actions
- `fix` - Design issues found, code-developer fixes them
- `details` - See full UI/UX review report
- `stop` - Exit workflow

**Skip When:** Components are purely functional with no UI (rare)

**Note:** If P0 or P1 design issues found, code-developer should fix before Phase 6.

---

### Phase 6: Server Actions [SEQUENTIAL]

**Agent:** `code-developer` (uses server-action-patterns skill)

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

### Phase 7: Routes [SEQUENTIAL]

**Agent:** `code-developer` (uses route-patterns skill)

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

### Phase 8: Implementation Verification

**Agent:** `analysis-agent` (uses code-validation skill)

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

### Phase 9: Manual Testing [REQUIRED]

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

### Phase 10: Documentation [SEQUENTIAL]

**Agent:** `project-manager-agent` (uses documentation-patterns, notion-workflows, skill-maintenance skills)

**Purpose:** Update documentation with progress and results

**Input:**
- Test results from Phase 9
- **Notion task_id** (if Notion workflow) - **CRITICAL: Pass this to agent**

**Updates:**
- @docs/PROJECT_SPEC.yaml (mark features complete, update acceptance_criteria verified: true)
- **Notion task** (if task_id present):
  - Update Status: "In Progress" → "Done"
  - Add completion notes to task Notes
  - Optionally create doc page in Documentation database
- **CLAUDE.md files** (if new feature or significant changes):
  - Create/update feature CLAUDE.md using `claude-md-guidelines` skill
  - Focus on project-specific oddities and WHY
  - Document critical mistakes made during implementation
- Creates YAML summary for project-manager-agent

**Orchestrator must pass:**
```yaml
notion_context:
  task_id: "29284f14-76e0-8012-8708-abc123"  # From Phase 1
  task_url: "https://notion.so/29284f14-76e0-8012-8708-abc123"
  sync_required: true
```

**CLAUDE.md Update Guidelines:**

When to create/update CLAUDE.md:
- ✅ New feature implemented (create feature CLAUDE.md)
- ✅ Significant architectural changes (update existing CLAUDE.md)
- ✅ Critical mistakes discovered during implementation
- ❌ Trivial bug fixes (no CLAUDE.md needed)
- ❌ Generic patterns Claude already knows

**What to include in CLAUDE.md:**
```markdown
# [Feature Name] - Quick Orientation

[1-2 sentence description]

## The Weird Parts

### [Project-Specific Oddity]
**Why**: [Real problem we hit]
[Minimal code example if needed]

## Critical Mistakes We Made

### [Thing We Tried That Failed]
**Problem**: [What broke]
**Fix**: [What we do now]

## Quick Reference
- [5-10 critical facts in bullet form]
```

**Reference:** See `claude-md-guidelines` skill for complete writing guidelines.

**Output:** Documentation updated (local + Notion + CLAUDE.md), summary ready for project-manager-agent

**Commands:**
- `approve` - Approve documentation updates
- `adjust` - Modify documentation
- `stop` - Exit workflow

---

### Phase 10a: CLAUDE.md Quality Review [MANDATORY]

**Orchestrator:** Direct (no agent)
**Skills Used:** claude-md-guidelines, signal-vs-noise

**Purpose:** Ensure CLAUDE.md documents are signal-focused, project-specific, and high-quality before commit

**When Applicable:**
- CLAUDE.md files were created/updated in Phase 10
- Always run if new feature documentation added

**Process:**

1. **Load Guidelines**
   - Invoke `/claude-md-guidelines` skill
   - Invoke `/signal-vs-noise` skill
   - Review content quality criteria

2. **Review Each CLAUDE.md File**
   - Read file created/updated in Phase 10
   - Extract sections: Weird Parts, Critical Mistakes, Quick Reference
   - Check for impact numbers (bug frequencies, performance metrics)

3. **Apply Signal-vs-Noise Filter**

   **3-Question Test:**
   - ✅ Actionable? (Can reader use this info to avoid bugs/save time?)
   - ✅ Impactful? (Prevents significant problems?)
   - ✅ Non-obvious? (Not generic patterns Claude already knows?)

   **Remove Noise:**
   - ❌ CUT: Generic Clean Architecture explanations
   - ❌ CUT: Obvious framework usage (what a Server Action is)
   - ❌ CUT: HOW explanations without WHY
   - ❌ CUT: "Best practices" without project-specific context

   **Keep Signal:**
   - ✅ KEEP: Project-specific oddities + WHY we do them
   - ✅ KEEP: Real mistakes made during implementation + context
   - ✅ KEEP: Impact numbers (40% error rate, 200MB leak)
   - ✅ KEEP: Non-obvious patterns specific to this codebase

4. **Verify Assumptions**
   - Did implementation match documented WHY explanations?
   - Are there new weird parts discovered during implementation?
   - Are critical mistakes documented with enough context?

5. **Discuss with User**
   - Present quality assessment
   - Highlight sections that need refinement
   - Confirm understanding of WHY patterns exist

6. **Update if Needed**
   - Apply recommendations using Edit tool
   - Remove noise, enhance signal
   - Ensure content quality > line count

**Output:** Quality-reviewed CLAUDE.md files ready for commit

**Commands:**
- `approve` - Quality approved, proceed to Phase 10b
- `refine` - Apply recommendations and re-review
- `skip` - Skip review (NOT recommended - bypasses quality gate)
- `stop` - Exit workflow

**Skip When:** No CLAUDE.md files were created/updated in Phase 10

**Critical:** This phase is MANDATORY if CLAUDE.md files exist. Generic content wastes Claude's attention and violates signal-vs-noise philosophy.

---

### Phase 10b: Skills Update Review [CONDITIONAL]

**Orchestrator:** Direct (no agent)
**Skill Used:** skill-creator

**Purpose:** Check if implementation revealed patterns worth documenting in skills

**When Applicable:**
- Implementation revealed project-specific patterns
- Mistakes made that should be documented
- Current skills missing critical information

**Process:**

1. **Load Skill Framework**
   - Invoke `/skill-creator` skill
   - Review decision framework and 3-Question Filter

2. **Review Implementation Outputs**
   - Analyze Phases 3-9 results
   - Identify patterns discovered:
     - Database: RLS anti-patterns, migration gotchas
     - Foundation: Type patterns, query patterns
     - Components: UI patterns, form handling
     - Server Actions: Error handling patterns
     - Routes: Data fetching patterns
   - Note mistakes made and lessons learned

3. **Apply skill-creator 3-Question Filter**

   For each potential pattern:
   - ✅ **Project-specific?** (Not generic framework knowledge)
   - ✅ **Timeless?** (Will be relevant 6+ months from now)
   - ✅ **Helps decisions?** (Prevents bugs, saves time, resolves ambiguity)

   **If NO to any:** Don't create/update skill (noise)
   **If YES to all:** Proceed with update

4. **Identify Affected Skills**

   Which skill should be updated?
   - `supabase-patterns` - RLS, migrations, type patterns
   - `code-patterns` - Server Actions, queries, components
   - `architecture-decisions` - Cross-app patterns, shared types
   - `development-practices` - Testing, performance
   - `design-system` - UI components, accessibility

5. **Propose Updates**
   - Present findings to user
   - Explain rationale for each update
   - Show specific sections to add/modify
   - Highlight impact (how this prevents future bugs)

6. **Update Skills if Approved**
   - Use Edit tool to update skill files
   - Follow skill-creator template format
   - Maintain signal-vs-noise quality
   - Ensure content is project-specific + timeless

**Output:** Updated skill files (if applicable)

**Commands:**
- `approve` - Skills updates approved, proceed to Phase 11
- `update [skill-name]` - Update specific skill
- `skip` - No skills updates needed (most common - only update when significant patterns found)
- `stop` - Exit workflow

**Skip When:**
- No new patterns discovered (most implementations)
- Patterns already documented in existing skills
- User explicitly skips review

**Critical:** Don't create skill noise. Only update skills when implementation revealed truly project-specific, timeless, decision-helpful patterns.

**Example Scenarios:**

**Update Needed:**
- Discovered RLS infinite recursion pattern → Update `supabase-patterns`
- Found critical bug in Server Action error handling → Update `code-patterns`
- Made mistake with shared types → Update `architecture-decisions`

**No Update Needed:**
- Generic React patterns → Claude already knows
- Standard Next.js routing → Not project-specific
- Obvious validation logic → Not helpful

---

### Phase 11: Git Operations [SEQUENTIAL]

**Agent:** `project-manager-agent` (uses git-patterns skill)

**Purpose:** Create commit for documentation changes, optionally clean history and push

**Depends on:** Phase 10 (Documentation updated)

**Creates:**
- Git commit with signal-focused message
- (Optional) Cleaned git history via interactive rebase
- (Optional) Pull request
- (Optional) Push to remote

**Workflow:**
1. Review staged changes (git status, git diff --staged)
2. Analyze what was updated (from project-manager-agent summary)
3. Create commit with high-level message
4. (Optional) Clean pending commits if issues found
5. Ask user about push

**Output:** Commit created locally, optionally pushed to remote

**Commands:**
- `commit` - Create commit and stop (default)
- `clean` - Clean pending commits first, then commit
- `push` - Create commit and push to remote (asks confirmation)
- `pr` - Create commit, push, and open pull request
- `skip` - Skip git operations entirely (user will commit manually)
- `stop` - Exit workflow

**Skip When:** User wants to commit manually later (optional phase)

**Critical:**
- Always ask before push (never auto-push)
- Signal-focused commit messages (no footers, present tense)
- User can skip this phase entirely
- Build should already pass (verified in Phase 8)

---

## Orchestrator Instructions

You are the **Implement Phase Orchestrator**. Guide user through 12-phase implementation workflow with smart parallelization (Phase 1-12).

### Agent Mapping - MUST USE Task Tool

**CRITICAL:** For EVERY phase, you MUST use the Task tool with the exact `subagent_type` specified below.

**⚠️ ISOLATED CONTEXT:** Agents have NO access to previous conversation. You MUST pass ALL required information in the prompt:
- Plan content or requirements
- Previous phase outputs (file paths, decisions made)
- Context from Phase 0 analysis
- Any dependencies or constraints
- Expected output format

| Phase | Agent (subagent_type) | Tool Call Required |
|-------|----------------------|-------------------|
| **Phase 1** | N/A (orchestrator direct) | ❌ NO AGENT (Notion search) |
| **Phase 2** | `analysis-agent` | ✅ REQUIRED |
| **Phase 3** | `database-specialist` | ✅ REQUIRED |
| **Phase 4a** | `code-developer` | ✅ REQUIRED (types.ts) |
| **Phase 4b** | `code-developer` | ✅ REQUIRED (queries.ts + validation.ts - 2x parallel) |
| **Phase 5a** | `code-developer` | ✅ REQUIRED (base components) |
| **Phase 5b** | `code-developer` | ✅ REQUIRED (composite components) |
| **Phase 5c** | `ui-ux-designer` | ✅ REQUIRED (UI/UX review) |
| **Phase 6** | `code-developer` | ✅ REQUIRED |
| **Phase 7** | `code-developer` | ✅ REQUIRED |
| **Phase 8** | `analysis-agent` | ✅ REQUIRED |
| **Phase 9** | N/A (manual testing by user) | ❌ NO AGENT |
| **Phase 10** | `project-manager-agent` | ✅ REQUIRED |
| **Phase 10a** | N/A (orchestrator direct + skills) | ✅ REQUIRED (CLAUDE.md quality) |
| **Phase 10b** | N/A (orchestrator direct + skill-creator) | ⚠️ CONDITIONAL (skills update) |
| **Phase 11** | `project-manager-agent` | ✅ REQUIRED |

**Example Task tool calls with FULL CONTEXT:**
```typescript
// Phase 2 - Pass COMPLETE plan
Task(
  subagent_type="analysis-agent",
  description="Analyze implementation plan",
  prompt=`Analyze this implementation plan and create execution strategy:

PLAN CONTENT:
${planContent}

TASK: Identify dependencies, parallelization opportunities, critical path, and execution order.
OUTPUT: YAML with execution strategy.`
)

// Phase 3 - Pass plan + Phase 2 analysis
Task(
  subagent_type="database-specialist",
  description="Create database migration",
  prompt=`Create database migration based on plan requirements:

PLAN REQUIREMENTS:
- Add public RLS policy for survey_links
- Allow anon users to SELECT active links
- No infinite recursion (use helper function)

EXECUTION STRATEGY FROM PHASE 2:
${phase2Output.strategy}

DATABASE CONTEXT:
- Table: survey_links
- Columns: id, survey_id, token, is_active, expires_at
- Need: Public access policy for anon role

TASK: Create migration file with RLS policy.
OUTPUT: YAML with migration file path, verification steps, type regeneration commands.`
)

// Phase 4a - Pass plan + database context
Task(
  subagent_type="code-developer",
  description="Create types.ts",
  prompt=`Create TypeScript types for survey feature:

PLAN REQUIREMENTS:
- Survey with dynamic questions (7 types)
- Questions: id, type, label, required, options
- Survey link validation (expired, max submissions)

DATABASE SCHEMA (from Phase 3):
- surveys table: id, title, description, questions (JSONB), status
- survey_links table: id, survey_id, token, expires_at, max_submissions, submission_count

TASK: Create types.ts with:
- Question type (7 question types enum)
- SurveyData type
- SurveyAnswers type
- LinkValidation type

OUTPUT: YAML with file path and exports.`
)

// Phase 4b (PARALLEL - single message, 2 Task calls with FULL CONTEXT)
Task(
  subagent_type="code-developer",
  description="Create queries.ts",
  prompt=`Create data fetching queries for survey feature:

TYPES CREATED IN PHASE 2a:
${phase2aOutput.exports}

PLAN REQUIREMENTS:
- Fetch survey by token with validation
- Check: expired, max submissions, survey status

APP CONTEXT:
- App: apps/website (Website app)
- Use: Server Supabase client (await createClient())
- Query: survey_links with join to surveys

TASK: Create queries.ts with getSurveyByToken(token) function.
OUTPUT: YAML with file path, client_type, exports.`
)
Task(
  subagent_type="code-developer",
  description="Create validation.ts",
  prompt=`Create Zod validation schemas for survey:

TYPES CREATED IN PHASE 2a:
${phase2aOutput.exports}

PLAN REQUIREMENTS:
- Dynamic schema based on questions array
- Validation per question type (email, tel, checkbox array)
- Optional vs required fields

TASK: Create validation.ts with generateSurveySchema(questions) function.
OUTPUT: YAML with file path, exports.`
)

// Phase 5a - Pass foundation context
Task(
  subagent_type="code-developer",
  description="Create QuestionField",
  prompt=`Create QuestionField component:

FOUNDATION FILES CREATED:
- types.ts: ${phase4aOutput.exports}
- queries.ts: ${phase4bOutput.exports}
- validation.ts: ${phase4bOutput.exports}

PLAN REQUIREMENTS:
- Render 7 question types (text, email, tel, textarea, select, radio, checkbox)
- Use Controller for checkbox arrays (NOT register)
- Display validation errors
- Accessibility: labels, aria-required

TASK: Create QuestionField.tsx component.
OUTPUT: YAML with file path, uses_controller.`
)

// Phase 5b - Pass component dependencies
Task(
  subagent_type="code-developer",
  description="Create SurveyForm",
  prompt=`Create SurveyForm component:

DEPENDENCIES CREATED:
- QuestionField component: ${phase5aOutput.file}
- Types: ${phase4aOutput.exports}
- Queries: ${phase4bOutput.exports}
- Validation: ${phase4bOutput.exports}

PLAN REQUIREMENTS:
- React Hook Form with dynamic Zod schema
- Map questions array to QuestionField components
- Submit via Server Action
- Loading/error states
- Success redirect

TASK: Create SurveyForm.tsx component.
OUTPUT: YAML with file path, dependencies.`
)

// Phase 5c - Pass component files to review
Task(
  subagent_type="ui-ux-designer",
  description="Review component UI/UX",
  prompt=`Review components for design system compliance and accessibility:

COMPONENTS TO REVIEW:
- ${phase5aOutput.file}
- ${phase5bOutput.file}

REVIEW CRITERIA:
- shadcn/ui component usage (no custom buttons)
- Theme tokens (no arbitrary colors)
- Spacing scale (4px: 2, 4, 6, 8...)
- WCAG 2.1 AA compliance
- Mobile-first responsive
- Interactive feedback (hover, focus)

TASK: Audit components and classify issues (P0/P1/P2).
OUTPUT: YAML with issues and fixes.`
)

// Phase 6 - Pass all foundation + component context
Task(
  subagent_type="code-developer",
  description="Create Server Actions",
  prompt=`Create Server Actions for survey submission:

FOUNDATION CREATED:
- Types: ${phase4aOutput.exports}
- Queries: ${phase4bOutput.exports}
- Validation: ${phase4bOutput.exports}

COMPONENTS CREATED:
- SurveyForm: ${phase5bOutput.file}

PLAN REQUIREMENTS:
- Server Action: submitSurveyResponse
- Validate submission
- Insert response to database
- Increment submission_count (atomic function)
- Structured return { success, error }

TASK: Create actions.ts with submitSurveyResponse function.
OUTPUT: YAML with file path, structured_return: true, revalidates_paths.`
)

// Phase 7 - Pass all previous outputs
Task(
  subagent_type="code-developer",
  description="Create page routes",
  prompt=`Create Next.js routes for survey feature:

ALL CREATED FILES:
- Types: ${phase4aOutput.file}
- Queries: ${phase4bOutput.file}
- Components: ${phase5bOutput.file}
- Actions: ${phase6Output.file}

PLAN REQUIREMENTS:
- Route: /survey/[token]
- Server Component fetches survey by token
- Render SurveyForm with data
- Error handling (expired, not found)
- Success page after submission

TASK: Create app/survey/[token]/page.tsx (ADR-005 compliant - minimal route).
OUTPUT: YAML with route paths, adr_005_compliant: true.`
)

// Phase 8 - Pass ALL implementation files
Task(
  subagent_type="analysis-agent",
  description="Verify implementation",
  prompt=`Verify implementation correctness before manual testing:

PLAN REQUIREMENTS:
${planContent}

FILES CREATED:
- Database: ${phase3Output.migration_file}
- Foundation: ${phase4Output.files}
- Components: ${phase5Output.files}
- Actions: ${phase6Output.file}
- Routes: ${phase7Output.files}

TASK: Analyze code for:
- Business logic correctness (matches plan)
- Common bugs (Controller for arrays, revalidatePath, structured returns)
- Code quality (UI states, ADR-005, types)
- Completeness

OUTPUT: YAML with validation results, issues (P0/P1/P2), readiness status.`
)

// Phase 10 - Pass test results + context
Task(
  subagent_type="project-manager-agent",
  description="Update documentation",
  prompt=`Update documentation with implementation results:

PLAN COMPLETED:
${planContent}

TEST RESULTS FROM PHASE 9:
${phase9TestResults}

FILES CREATED:
${allFilesCreated}

NOTION CONTEXT (if applicable):
${notionContext}

TASK: Update PROJECT_SPEC.yaml (mark complete, verify criteria), sync Notion (if task_id), update CLAUDE.md.
OUTPUT: YAML with files updated, notion_synced status.`
)

// Phase 11 - Pass documentation changes
Task(
  subagent_type="project-manager-agent",
  description="Create git commit",
  prompt=`Create git commit for implementation:

DOCUMENTATION UPDATES FROM PHASE 10:
${phase10Output.summary}

FILES CHANGED:
${gitStatus}

TASK: Create signal-focused commit message (concise, present tense, outcome-focused).
OUTPUT: YAML with commit message, files staged.`
)
```

### Context Passing Pattern (CRITICAL)

**Agents have isolated context** - they see ONLY what you pass in the prompt.

**Pattern: Build context object, pass relevant parts to each agent**

```typescript
// Orchestrator maintains context object
const context = {
  plan: {
    content: planContent,
    requirements: extractedRequirements
  },
  phase1: {
    notion_task_id: "2ed84f14-76e0-80c0-8da7-d574cdf2a4fe",
    selected_task: {...}
  },
  phase2: {
    strategy: "...",
    dependencies: {...},
    parallelization: {...}
  },
  phase3: {
    migration_file: "supabase/migrations/...",
    tables_modified: ["surveys", "survey_links"],
    types_regenerated: true
  },
  phase4a: {
    file: "apps/website/features/survey/types.ts",
    exports: ["Question", "SurveyData", "LinkValidation"]
  },
  phase4b: {
    files: ["queries.ts", "validation.ts"],
    exports: {
      queries: ["getSurveyByToken"],
      validation: ["generateSurveySchema"]
    }
  },
  // ... accumulate ALL phase outputs
}

// Phase 5a: Pass ONLY relevant context
Task(
  subagent_type="code-developer",
  prompt=`Create QuestionField component:

TYPES AVAILABLE (from Phase 4a):
${context.phase4a.exports.join(", ")}

VALIDATION AVAILABLE (from Phase 4b):
${context.phase4b.exports.validation}

PLAN REQUIREMENTS:
${context.plan.requirements.questionField}

TASK: Create QuestionField.tsx
OUTPUT: YAML`
)
```

**Why critical:** Agent sees NOTHING from conversation. No context = agent fails or hallucinates.

### Critical Instructions

0. **🔴 NOTION-FIRST (NEW):** ALWAYS start with Phase 1 (Notion Discovery) unless:
   - `--skip-notion` flag provided
   - `--notion-task-id` provided (skip search, use directly)
   - **Use `mcp__notion__notion-search` MCP tool** to search Notion for tasks matching plan-reference
   - Filter out Skills Projects (Type = 🎓 Learning)
   - Let user select from Agency tasks
   - Only fall back to local files if user chooses `use-local`

1. **⚠️ ISOLATED CONTEXT:** Agents have NO access to conversation history. MUST pass ALL context in prompt:
   - Plan content (full text or requirements extract)
   - Previous phase outputs (file paths, exports, decisions)
   - Database schema (if relevant)
   - Dependencies (what files agent can import)
   - Expected output format (YAML structure)

2. **Use Task tool for agents:** Launch agents using Task tool with correct `subagent_type` from Agent Mapping table

3. **Parallel execution:** Launch ALL parallel agents in SINGLE message (multiple Task calls with full context each)

4. **Sequential execution (Interactive mode):** Wait for user approval before next phase

5. **Automated mode (--auto flag):** Run all phases without waiting, only stop on P0 test failures

6. **State tracking:** Track currentPhase, completedPhases, outputs (store for context passing), notion_task_id, notion_sync_status

7. **DO NOT just describe:** ACTUALLY INVOKE TOOLS - use Task tool with correct subagent_type

8. **Context accumulation:** Build context object with all phase outputs, pass relevant parts to each agent

9. **Handle failures:** If agent fails, offer retry/details/stop (or auto-retry in --auto mode)

10. **P0 bugs block merge:** Test failures with P0 severity ALWAYS require user intervention (even in --auto)

11. **Build verification:** After each code-generating phase, verify build succeeds - catch TypeScript errors early

12. **Implementation verification:** After Phase 7 (Routes), ALWAYS run Phase 8 (analysis-agent) to catch code issues before manual testing

13. **NEVER skip Phase 9:** Phase 9 (Manual Testing) is REQUIRED - user must test before docs

14. **Phase 10a mandatory** - Always review CLAUDE.md quality using claude-md-guidelines + signal-vs-noise skills

15. **Phase 10b conditional** - Only update skills when significant project-specific patterns discovered

16. **ALWAYS use correct agent:** Reference Agent Mapping table - never guess or use wrong subagent_type

17. **Notion Integration:**
    - **ALWAYS run Phase 1 (Notion Discovery) first** - this is NEW and CRITICAL
    - **Use `mcp__notion__notion-search` MCP tool** - NOT Notion CLI or bash commands
    - Search Notion before using local files
    - Filter out Skills Projects in Phase 1 (Type = 🎓 Learning, "📚 Skills Projects" relation)
    - NEVER proceed with Skills Projects tasks
    - ALWAYS pass notion_task_id to project-manager-agent if present (Phase 10)
    - ALWAYS fall back to local plan if Notion unavailable or user chooses `use-local`
    - Use exact status values: `"In Progress"`, `"Done"` (case-sensitive with spaces)

### Build Verification Checkpoints

**CRITICAL:** After every code-generating phase, run a build test to catch errors early.

**When to build:**
- **After Phase 4b (Foundation):** `npm run build:cms` - Verify types/queries compile
- **After Phase 5b (Components):** `npm run build:cms` - Verify components compile
- **After Phase 5c (UI/UX Review):** `npm run build:cms` (if design changes made) - Verify fixes compile
- **After Phase 6 (Server Actions):** `npm run build:cms` - Verify actions compile
- **After Phase 7 (Routes):** `npm run build` - Build BOTH apps (cms + website)

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
❌ Build Failed After Phase 5

Error: Property 'label' does not exist on type 'Question'
Location: apps/cms/features/responses/components/ResponseDetail.tsx:178

Fix: Change `pair.question.label` to `pair.question.question`

Retrying build...
✅ Build now succeeds
```

---

### Manual Test Checkpoints

**When to pause for manual testing:**
- **After Phase 3 (Database):** If migration creates testable database changes
- **After Phase 7 (Routes):** Always - routes make feature accessible for testing
- **Phase 9 (Manual Testing):** Always required before documentation

**How to provide test instructions:**
1. Identify what's testable (based on completed phases)
2. Write step-by-step test instructions
3. Include what to verify (expected results)
4. Provide SQL queries if database verification needed
5. Wait for user response: `pass` | `fix-and-retry` | `stop`

**Example checkpoint after Phase 3:**
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

**Example checkpoint after Phase 7:**
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
  - ✋ **Manual test checkpoints** - "Phase 3/7/8 complete. Please test manually."
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
  "planFile": "~/.claude/plans/example.md | null",
  "notion_task_id": "2ed84f14-76e0-80c0-8da7-d574cdf2a4fe",
  "notion_task_url": "https://notion.so/2ed84f14-76e0-80c0-8da7-d574cdf2a4fe",
  "notion_sync_status": "pending | synced | failed",
  "currentPhase": "10b",
  "completedPhases": ["1", "2", "3", "4a", "4b", "5a", "5b", "5c", "6", "7", "8", "9", "10", "10a"],
  "skippedPhases": [],
  "outputs": {
    "phase1": {
      "notion_task_id": "2ed84f14-76e0-80c0-8da7-d574cdf2a4fe",
      "selected_task": {...}
    },
    "phase2": {
      "strategy": "...",
      "notion_context": {
        "task_id": "2ed84f14-76e0-80c0-8da7-d574cdf2a4fe",
        "task_name": "Calendar integration",
        "project": "Legal Hub MVP",
        "priority": "🔴 Urgent",
        "deadline": "2026-01-25"
      }
    },
    "phase3": { "migration": "...", "types_regenerated": true },
    "phase4a": { "file": "types.ts" },
    "phase4b": { "files": ["queries.ts", "validation.ts"] },
    "phase10": {
      "claude_md_files": ["apps/cms/features/calendar/CLAUDE.md"],
      "project_spec_updated": true,
      "notion_synced": true
    },
    "phase10a": {
      "quality_review_complete": true,
      "issues_found": 2,
      "issues_resolved": 2,
      "files_refined": ["apps/cms/features/calendar/CLAUDE.md"]
    },
    "phase10b": {
      "skills_reviewed": true,
      "patterns_found": 1,
      "skills_updated": ["supabase-patterns"]
    }
  },
  "testResults": null,
  "docsCommit": null
}
```

### Phase Execution Pattern

**CRITICAL:** Every phase MUST use Task tool with correct subagent_type from Agent Mapping table.

**Sequential Phase (Interactive Mode):**
```markdown
**Phase N: Name**

[Brief description of what this phase does]

Launching [agent-name]...
```

[Task tool invocation - REQUIRED, use correct subagent_type from Agent Mapping table]

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

[Launch ALL agents in SINGLE message - multiple Task tool calls with correct subagent_type]

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
/implement-phase survey form
```

**Phase 1:**
```markdown
**Phase 1: Notion Discovery**

Searching Notion for: "survey form"

Found 2 tasks:

1. [AAA-T-12] Survey Form Implementation (🔴 Urgent, In Progress)
   Project: Legal Hub MVP

2. [AAA-P-3] Phase 2 - Survey Form & Response Management (Not Started)
   Project: Legal Hub MVP

Select task: 1 | 2 | use-local | stop
```

[User: 1]

**Phase 2:**
```markdown
**Phase 2: Plan Analysis**

Analyzing task AAA-T-12 from Notion...
```

[Task tool call with subagent_type="analysis-agent"]

```markdown
**Analysis Complete** ✅

Complexity: medium
Database changes: Yes (RLS policy needed)
Parallel phases: Foundation (3 files), Components (2 files)

**Next:** Phase 3 (Database Setup) [CRITICAL]

**Commands:** `continue` | `adjust` | `stop`
```

[User: continue]

**Phase 3:**
```markdown
**Phase 3: Database Setup** [CRITICAL]

Creating migration for public survey access RLS policy...
```

[Task tool call with subagent_type="database-specialist"]

```markdown
**Database Setup Complete** ✅

Migration: 20251210120000_add_public_survey_policy.sql
Types regenerated: ✅
Verification: RLS policy active in Supabase

**Next:** Phase 4 (Foundation) - 3 files in parallel ⚡⚡⚡

**Commands:** `continue` | `details` | `stop`
```

[User: continue]

**Phase 4a:**
```markdown
**Phase 4a: Foundation - Types**

Creating types.ts (needed by queries and validation)...
```

[Task tool call with subagent_type="code-developer"]

```markdown
**Types Complete** ✅

Created: apps/website/features/survey/types.ts

**Next:** Phase 4b (Queries + Validation) - parallel ⚡⚡⚡

**Commands:** `continue` | `details` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 4b (Parallel):**
```markdown
**Phase 4b: Foundation - Queries & Validation** ⚡⚡⚡

Launching 2 agents simultaneously:
1. queries.ts - Data fetching with server client
2. validation.ts - Dynamic Zod schemas
```

[Single message, 2 Task tool calls with subagent_type="code-developer"]

```markdown
**Foundation Complete** ✅

Created:
- ✅ apps/website/features/survey/queries.ts
- ✅ apps/website/features/survey/validation.ts

**Next:** Phase 5a (QuestionField)

**Commands:** `continue` | `details [file]` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 5a:**
```markdown
**Phase 5a: Components - Base Component**

Creating QuestionField.tsx (needed by SurveyForm)...
```

[Task tool call with subagent_type="code-developer"]

```markdown
**QuestionField Complete** ✅

Created: QuestionField.tsx (7 question types with Controller)

**Next:** Phase 5b (SurveyForm)

**Commands:** `continue` | `details` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 5b:**
```markdown
**Phase 5b: Components - Composite Component**

Creating SurveyForm.tsx (uses QuestionField)...
```

[Task tool call with subagent_type="code-developer"]

```markdown
**SurveyForm Complete** ✅

Created: SurveyForm.tsx (form + validation + submission)

**Next:** Phase 5c (UI/UX Review)

**Commands:** `continue` | `details` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 5c:**
```markdown
**Phase 5c: UI/UX Review**

Reviewing component design and accessibility...
```

[Task tool call with subagent_type="ui-ux-designer"]

```markdown
**UI/UX Review Complete** ✅

Overall Rating: Good
Issues Found: 2 P1 (spacing inconsistencies, missing focus states)

**P1 Issues:**
- Inconsistent spacing: Use gap-6 instead of gap-5
- Missing focus states: Add focus:ring-2 to interactive elements

Recommendations:
- Follow Tailwind spacing scale consistently
- Ensure all interactive elements have visible focus indicators

**Next:** Fix P1 issues or proceed to Phase 6 (Server Actions)?

**Commands:** `fix` | `continue` | `details` | `stop`
```

[User: continue - issues are minor OR auto-proceed in --auto mode]

[Continues through Phase 6-7...]

**Phase 8:**
```markdown
**Phase 8: Implementation Verification**

Analyzing implementation against plan and CODE_PATTERNS...
```

[Task tool call with subagent_type="analysis-agent"]

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

**Phase 9:**
```markdown
**Phase 9: Manual Testing** [REQUIRED]

Please test the implementation manually:

**Test Checklist:**
- [ ] Navigate to /survey/[token] with valid token
- [ ] Form renders with all questions from survey JSON
- [ ] Submit valid form - response saves to database
- [ ] Submit invalid form - validation errors appear
- [ ] All 7 question types work correctly
- [ ] Loading states appear during submission
- [ ] Success message after submission

**Commands:** `pass` | `fail` | `details` | `stop`
```

[User: pass - all tests successful]

**Phase 10:**
```markdown
**Phase 10: Documentation**

Updating documentation with implementation results...
```

[Task tool call with subagent_type="project-manager-agent"]

```markdown
**Documentation Updated** ✅

Files modified:
- docs/PROJECT_SPEC.yaml: Marked Phase 2 features complete, verified acceptance criteria
- docs/PROJECT_ROADMAP.md: Updated progress to 100%, added milestone

Summary:
Phase 2 Complete: Client survey form with 7 question types
Clients can now receive survey links and submit responses with validation.

**Next:** Phase 10a (CLAUDE.md Quality Review)

**Commands:** `continue` | `adjust` | `stop`
```

[User: continue]

**Phase 10a:**
```markdown
**Phase 10a: CLAUDE.md Quality Review** [MANDATORY]

Loading quality review guidelines...
- ✅ Loaded claude-md-guidelines skill
- ✅ Loaded signal-vs-noise skill

**Reviewing:** apps/cms/features/survey/CLAUDE.md

**Analysis:**
- Sections found: Weird Parts (2), Critical Mistakes (1), Quick Reference (8 items)
- Impact numbers: 1 (40% validation errors before fix)

**Signal-vs-Noise Check:**
✅ Weird Part #1: Dynamic Zod schema generation (project-specific + WHY explained)
✅ Weird Part #2: Split Query Pattern for RLS (project-specific + WHY explained)
⚠️ Critical Mistake: Generic explanation about React Hook Form (Claude knows this)

**Recommendations:**
1. Remove generic React Hook Form explanation (lines 34-42)
2. Enhance "40% validation errors" with context (what caused it?)

**Commands:** `approve` | `refine` | `skip` | `stop`
```

[User: refine]

```markdown
**Refining CLAUDE.md...**

- ❌ Removed lines 34-42 (generic React Hook Form explanation)
- ✅ Enhanced validation error section with root cause context

**Quality Review Complete** ✅

CLAUDE.md now meets signal-vs-noise standards.

**Next:** Phase 10b (Skills Update Review)

**Commands:** `continue` | `stop`
```

[User: continue]

**Phase 10b:**
```markdown
**Phase 10b: Skills Update Review** [CONDITIONAL]

Loading skill decision framework...
- ✅ Loaded skill-creator skill

**Reviewing implementation for new patterns...**

**Patterns Discovered:**
1. RLS infinite recursion when using subqueries in policies (supabase-patterns)
   - Project-specific? ✅ (specific to our multi-tenant setup)
   - Timeless? ✅ (PostgreSQL RLS limitation)
   - Helps decisions? ✅ (prevents production bugs)

2. React Hook Form with dynamic fields (code-patterns)
   - Project-specific? ❌ (generic pattern)
   - SKIP: Not adding to skills

**Recommendation:**
Update `supabase-patterns` skill with RLS recursion anti-pattern discovered in Phase 3.

**Proposed Addition:**
```yaml
## RLS Anti-Pattern: Subqueries in Policies

**Problem:** Using subqueries in RLS policies causes infinite recursion
**Impact:** 100% of SELECT queries fail with "infinite recursion" error
**Solution:** Use Split Query Pattern (fetch in application, filter in memory)

[Example code showing anti-pattern and fix]
```

**Commands:** `approve` | `update supabase-patterns` | `skip` | `stop`
```

[User: approve]

```markdown
**Updating supabase-patterns skill...**

- ✅ Added RLS Anti-Pattern section (lines 98-112)
- ✅ Included example from actual bug fix
- ✅ Signal-vs-noise validated (project-specific + timeless)

**Skills Update Complete** ✅

Updated: supabase-patterns

**Next:** Phase 11 (Git Operations)

**Commands:** `continue` | `stop`
```

[User: continue]

**Phase 11:**
```markdown
**Phase 11: Git Operations**

Creating commit for documentation changes...
```

[Task tool call with subagent_type="project-manager-agent"]

```markdown
**Commit Created** ✅

Commit message:
feat: add client survey form with 7 question types

Clients can now receive survey links and submit responses.
Form validates inputs (email, phone, required fields) and
saves to database with multi-tenant isolation.

**Next:** Would you like to push to remote?

**Commands:** `push` | `pr` | `skip` | `stop`
```

[User: push]

```markdown
**Pushing to remote...**

✅ Pushed to origin/main

**All Phases Complete!** ✅
```

**Final:**
```markdown
**All Phases Complete!** ✅

Summary:
- Database: RLS policy added ✅
- Foundation: 3 files created ✅
- Components: 2 components built ✅
- Server Actions: actions.ts created ✅
- Routes: 2 pages created ✅
- Implementation Verification: Code analyzed, 1 P1 issue (non-blocking) ✅
- Testing: All tests passed ✅
- Documentation: PROJECT_ROADMAP.md + PROJECT_SPEC.yaml updated ✅
- Git: Committed + pushed to remote ✅

**Commit:** `feat: add client survey form with 7 question types`
**Branch:** main (pushed)

**Commands:**
- `summary` - Show detailed summary
- `pr` - Create pull request (if needed)
```

---

## Key Patterns

### Pattern 1: Smart Parallelization

**Foundation phase (always parallel):**
```markdown
Phase 4: Launch 3x code-developer
→ types.ts, queries.ts, validation.ts
→ Parallel execution for efficiency
```

**Components phase (parallel if independent):**
```markdown
Phase 5: Launch Nx code-developer
→ QuestionField, SurveyForm (if SurveyForm doesn't depend on QuestionField)
→ OR: Launch QuestionField → then SurveyForm (if dependent)
```

### Pattern 2: Critical Phase Blocking

**Database phase blocks everything:**
```markdown
Phase 3: Database [CRITICAL]
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

→ Orchestrator: "Skipping Phase 9 (Testing) - automated tests only"
```

---

## Anti-Patterns (Avoid These)

### ❌ Don't: Sequential when could be parallel
```markdown
Phase 4: Launch types.ts → wait → Launch queries.ts → wait → Launch validation.ts
# Inefficient! Should be parallel!
```

### ❌ Don't: Start components before foundation ready
```markdown
Phase 4: Foundation starting...
Phase 5: Components starting...  # Components need foundation!
```

### ❌ Don't: Skip testing when there are P0 issues
```markdown
Testing: 2 P0 failures found
User: continue to documentation
# NO! Fix P0 first!
```

### ❌ Don't: Auto-proceed without user approval
```markdown
Phase 5 complete → Phase 6 starts immediately
# User loses control, can't review!
```

### ❌ Don't: Skip build verification
```markdown
Phase 4b complete → Immediately launch Phase 5
# NO! Must verify build succeeds first!
```

✅ **Correct:**
```markdown
Phase 4b complete → npm run build:cms → Verify succeeds → Phase 5 starts
```

### ❌ Don't: Skip manual testing checkpoints
```markdown
Phase 7 complete → Immediately launch project-manager-agent
# NO! User must test first!
```

✅ **Correct:**
```markdown
Phase 7 complete → npm run build (both apps) → Phase 8 (analysis-agent) → Manual test checkpoint → User tests → Reports pass → Launch project-manager-agent
```

### ❌ Don't: Skip CLAUDE.md quality review
```markdown
Phase 10 complete → Immediately launch project-manager-agent
# NO! Must review CLAUDE.md quality first (Phase 10a)!
```

✅ **Correct:**
```markdown
Phase 10 complete → Phase 10a (CLAUDE.md quality review) → Apply signal-vs-noise → Phase 11 (Git)
```

### ❌ Don't: Update skills without decision framework
```markdown
Phase 10b: "Let me add this pattern to code-patterns"
# NO! Apply 3-Question Filter first: Project-specific? Timeless? Helps decisions?
```

✅ **Correct:**
```markdown
Phase 10b: Invoke skill-creator → Apply 3-Question Filter → Update only if YES to all 3
```

### ❌ Don't: Skip implementation verification
```markdown
Phase 7 complete → Build succeeds → Immediately launch test-validator
# NO! Must verify code correctness first!
```

✅ **Correct:**
```markdown
Phase 7 complete → Build succeeds → Launch analysis-agent → Analyze code → Fix P0 issues → Launch test-validator
```

### ❌ Don't: Accumulate build errors
```markdown
Phase 4b: Build fails - ignore it
Phase 5: Build fails - continue anyway
Phase 6: Build fails - deal with it later
# NO! Now have 10+ errors to fix!
```

✅ **Correct:**
```markdown
Phase 4b: Build fails → Agent fixes immediately → Rebuild verifies fix → Continue to Phase 5
Phase 5: Build succeeds → Continue to Phase 6
Phase 6: Build succeeds → Continue to Phase 7
# Clean builds all the way!
```

### ❌ Don't: Use wrong agent or skip Task tool
```markdown
Phase 4a: "Let me create types.ts manually"
# NO! Must use Task tool with subagent_type="code-developer"

Phase 6: "Launching general-purpose agent..."
# NO! Must use Task tool with subagent_type="code-developer"

Phase 8: "I'll verify the code myself..."
# NO! Must use Task tool with subagent_type="analysis-agent"
```

✅ **Correct:**
```markdown
Phase 4a: Task(subagent_type="code-developer", description="Create types.ts", prompt="...")
Phase 6: Task(subagent_type="code-developer", description="Create actions.ts", prompt="...")
Phase 8: Task(subagent_type="analysis-agent", description="Verify implementation", prompt="...")
```

---

## Workflow Insights (Lessons from Real Implementation)

### ✅ What Works Well

**Parallel Agent Execution:**
- Create queries.ts + validation.ts simultaneously
- Foundation agents (code-developer) can run in parallel for independent files
- Saves ~15 minutes vs sequential execution
- Example: Phase 4b can parallelize types.ts creation, but queries/validation depend on types

**Specialized Agents:**
- Each agent focused on one responsibility (types, queries, components, routes)
- Clear boundaries prevent scope creep
- Type-first approach: Create types.ts before implementation
- Agents know their domain patterns (no generic explanations needed)

**Browser DevTools for Debugging:**
- Console reveals exact error messages (RLS errors, validation failures)
- Faster than adding/removing debug logs in code
- Network tab shows API request/response details
- Use console.error in Server Actions for production debugging

### 🚨 Critical Anti-Patterns to Avoid

**Field Name Mismatches Between Apps:**
- Problem: CMS uses `label`, Website expects `question` → blank forms
- Solution: Create shared types in `packages/shared-types/` for cross-app domain objects
- Check: Does this type exist in both CMS and Website? → If yes, extract to shared package

**Debug Logs in Production Code:**
- Problem: 11+ `console.log` statements left after debugging
- Solution: Use browser DevTools instead, only keep `console.error` in Server Actions
- Review code before commit to remove debug statements

**Multiple Migrations for Same Bugfix:**
- Problem: 6 migrations created while debugging single RLS issue
- Solution: Test migrations locally first with `SET ROLE anon`, squash if fixing same issue
- Use migration repair to mark old migrations as reverted

**No UI Validation Before Merge:**
- Problem: Styling changes merged without checklist verification
- Solution: Add UI review checklist to Phase 8 (analysis-agent)
- Check: shadcn/ui components, theme tokens, spacing scale, accessibility (WCAG 2.1 AA)

---

**Use this workflow to systematically implement planned phases with intelligent agent orchestration, parallelization, and mandatory manual testing checkpoints.**
