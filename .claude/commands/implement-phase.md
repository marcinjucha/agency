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
# Interactive mode (default) - ask for approval after each phase
/implement-phase Phase 2
/implement-phase survey-form

# With Notion task (NEW) - reads task from Notion, syncs status to "Done"
/implement-phase --notion-task-id=29284f14-76e0-8012-abc123

# Automated mode - run all phases without confirmation
/implement-phase Phase 2 --auto
/implement-phase ~/.claude/plans/abundant-waddling-rossum.md --auto

# Notion task + automated mode
/implement-phase --notion-task-id=29284f14-76e0-8012-abc123 --auto
```

**Parameters:**
- `plan-reference` - Phase name or path to plan file (e.g., "Phase 2", "~/.claude/plans/plan.md")
- `--auto` - Run all phases without manual approval (except manual testing)
- `--notion-task-id=<task-id>` - Use Notion task as source, sync status when complete

**Modes:**
- **Interactive (default):** Waits for user approval after each phase
- **Automated (--auto):** Runs all phases sequentially, only stops on P0 failures
- **Notion Integration:** If `--notion-task-id` provided, reads from Notion and syncs status to "Done" after completion

**Behavior:**
- If `--notion-task-id` provided: Fetch task from Notion, use task Notes as plan, sync status after Phase 8
- If plan file provided: Traditional workflow (read local file)
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
Phase 0: Plan Analysis (plan-analyzer)
    ↓ User: continue | adjust | stop
Phase 1: Database [CRITICAL] (supabase-schema)
    ↓ BUILD VERIFICATION: npm run build:cms
    ↓ MANUAL TEST CHECKPOINT (if testable)
    ↓ User: continue | fix | stop
Phase 2a: Foundation - Types (foundation-dev)
    ↓ User: continue | retry | stop
Phase 2b: Foundation ⚡⚡⚡ (2x foundation-dev)
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 3a: Components - Base (component-dev)
    ↓ User: continue | retry | stop
Phase 3b: Components - Composite (component-dev)
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 3c: UI/UX Review (ui-ux-designer)
    ↓ BUILD VERIFICATION: npm run build:cms (if changes made)
    ↓ User: continue | fix | stop
Phase 4: Server Actions / API Routes
    ↓ BUILD VERIFICATION: npm run build:cms ← MUST PASS
    ↓ User: continue | retry | stop
Phase 5: Routes (route-dev)
    ↓ BUILD VERIFICATION: npm run build ← BOTH APPS MUST PASS
    ↓ User: continue | retry | stop
Phase 6: Implementation Verification
    ↓ (implementation-validator)
    ↓ STATIC CODE ANALYSIS - verify correctness, patterns, bugs
    ↓ User: pass | fix | details | stop
Phase 7: Manual Testing [REQUIRED]
    ↓ User tests complete feature manually
    ↓ User: pass | fix-and-retry | stop
Phase 8: Documentation (docs-updater)
    ↓ Updates PROJECT_ROADMAP.md + PROJECT_SPEC.yaml + CLAUDE.md (content)
    ↓ Syncs Notion task status (if applicable)
    ↓ User: approve | adjust | stop
Phase 8a: CLAUDE.md Quality Review [MANDATORY]
    ↓ (orchestrator + claude-md-guidelines skill + signal-vs-noise skill)
    ↓ REVIEW: Content quality, signal vs noise, project-specificity
    ↓ User: approve | refine | skip | stop
Phase 8b: Skills Update Review [CONDITIONAL]
    ↓ (orchestrator + skill-creator skill)
    ↓ CHECK: New patterns discovered? Skills need updates?
    ↓ User: approve | update [skill] | skip | stop
Phase 9: Git Operations (git-specialist)
    ↓ Creates commit, optionally pushes
    ↓ User: commit | push | pr | skip | stop
Phase 10: Complete!
```

**Optimizations:**
- Phase 2b: queries + validation parallel
- Phase 3a: Multiple base components parallel (if plan has them)
- Skip testing phase if automated tests only
- Smart dependency detection prevents blocking

---

## NOTION INTEGRATION WORKFLOW

**Reference:** See notion-integration skill for complete MCP examples and patterns

### Overview

When `--notion-task-id` is provided, the workflow integrates with Notion:
- **Phase 0:** Reads task from Notion (Name, Notes, Projects context)
- **Phases 1-7:** Execute normally (using Notes as plan content)
- **Phase 8:** docs-updater syncs status to "Done" and adds completion notes
- **Phase 9:** git-specialist creates commit

### Phase 0: Reading from Notion (plan-analyzer)

**When Notion task provided:**

```typescript
// Step 1: Fetch task details
const task = await mcp__notion__notion-fetch({
  id: notionTaskId
});

// Step 2: Extract plan from task
const planContent = task.properties.Notes;  // Task description
const taskName = task.properties.Name;      // Task title
const priority = task.properties.Priority;  // Optional context
const deadline = task.properties.Deadline;  // Optional context

// Step 3: Check for Skills Projects (FILTER OUT)
const projectRelation = task.properties["📊 Projects"];
if (projectRelation) {
  const project = await mcp__notion__notion-fetch({ id: projectId });

  // Method 1: Check Type property (PRIMARY)
  const projectType = project.properties["Type"]?.select?.name;
  if (projectType === "🎓 Learning") {
    // ABORT - This is personal learning, not agency work
    throw new Error("Skills Project detected - use agency tasks only");
  }

  // Method 2: Check Skills Projects relation (FALLBACK)
  if (project.properties["📚 Skills Projects"]?.length > 0) {
    // ABORT - This is a Skills Project
    throw new Error("Skills Project detected - use agency tasks only");
  }
}

// Step 4: Pass to plan-analyzer
const planAnalysis = await planAnalyzer({
  taskName: taskName,
  planContent: planContent,
  notionContext: {
    task_id: notionTaskId,
    project_id: projectId,
    priority: priority,
    deadline: deadline
  }
});
```

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
  - Phase 8 skips Notion sync (sync_status: "failed")
```

### Phase 8: Syncing to Notion (docs-updater)

**When Notion task provided:**

docs-updater receives `notion_task_id` from orchestrator and:

```typescript
// 1. Update task status in Notion
await mcp__notion__notion-update-page({
  data: {
    page_id: notionTaskId,
    command: "update_properties",
    properties: {
      "Status": "Done"  // Change from "In Progress" to "Done"
    }
  }
});

// 2. Add completion notes to task
await mcp__notion__notion-update-page({
  data: {
    page_id: notionTaskId,
    command: "insert_content_after",
    selection_with_ellipsis: "## Notes...",
    new_str: "\n\n## Completion Summary\n- Implementation complete\n- All acceptance criteria met\n- Build verified successfully"
  }
});

// 3. Optionally create documentation page (complex features only)
// See notion-integration skill for examples
```

**Orchestrator passes to docs-updater:**
```yaml
notion_context:
  task_id: "29284f14-76e0-8012-8708-abc123"
  task_url: "https://notion.so/29284f14-76e0-8012-8708-abc123"
  sync_required: true
```

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

### Phase 0: Plan Analysis

**Agent:** `plan-analyzer`

**Purpose:** Analyze plan and create optimized execution strategy

**Input Sources (priority order):**
1. **Notion task** (if `--notion-task-id` provided) - **PRIMARY**
2. **Local plan file** (if path provided) - **FALLBACK**

**When Notion task provided:**
- Fetch task with `mcp__notion__notion-fetch`
- Extract: Name (title), Notes (plan content), Projects (context)
- Check project for Skills Projects relation → filter out if present
- Pass to plan-analyzer: "Analyze this Notion task: [Name]\n\n[Notes]"

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

### Phase 3c: UI/UX Review [SEQUENTIAL]

**Agent:** `ui-ux-designer`

**Purpose:** Review components for design excellence, accessibility, and visual polish

**Reviews:**
- shadcn/ui component usage and design system compliance
- Tailwind spacing consistency (4px scale)
- Visual hierarchy and typography
- Accessibility (WCAG 2.1 AA compliance)
- Responsive design patterns (mobile-first)
- UI states (loading, error, empty, disabled)

**Why after 3b:** Components are functionally complete, ready for design review

**Output:** YAML report with P0/P1/P2 design issues and concrete recommendations

**Commands:**
- `continue` - Design approved, proceed to server actions
- `fix` - Design issues found, component-developer fixes them
- `details` - See full UI/UX review report
- `stop` - Exit workflow

**Skip When:** Components are purely functional with no UI (rare)

**Note:** If P0 or P1 design issues found, component-developer should fix before Phase 4.

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

**Purpose:** Update documentation with progress and results

**Input:**
- Test results from Phase 7
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
- Creates YAML summary for git-specialist

**Orchestrator must pass:**
```yaml
notion_context:
  task_id: "29284f14-76e0-8012-8708-abc123"  # From Phase 0
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

**Output:** Documentation updated (local + Notion + CLAUDE.md), summary ready for git-specialist

**Commands:**
- `approve` - Approve documentation updates
- `adjust` - Modify documentation
- `stop` - Exit workflow

---

### Phase 8a: CLAUDE.md Quality Review [MANDATORY]

**Orchestrator:** Direct (no agent)
**Skills Used:** claude-md-guidelines, signal-vs-noise

**Purpose:** Ensure CLAUDE.md documents are signal-focused, project-specific, and high-quality before commit

**When Applicable:**
- CLAUDE.md files were created/updated in Phase 8
- Always run if new feature documentation added

**Process:**

1. **Load Guidelines**
   - Invoke `/claude-md-guidelines` skill
   - Invoke `/signal-vs-noise` skill
   - Review content quality criteria

2. **Review Each CLAUDE.md File**
   - Read file created/updated in Phase 8
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
- `approve` - Quality approved, proceed to Phase 8b
- `refine` - Apply recommendations and re-review
- `skip` - Skip review (NOT recommended - bypasses quality gate)
- `stop` - Exit workflow

**Skip When:** No CLAUDE.md files were created/updated in Phase 8

**Critical:** This phase is MANDATORY if CLAUDE.md files exist. Generic content wastes Claude's attention and violates signal-vs-noise philosophy.

---

### Phase 8b: Skills Update Review [CONDITIONAL]

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
   - Analyze Phases 1-7 results
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
- `approve` - Skills updates approved, proceed to Phase 9
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

### Phase 9: Git Operations [SEQUENTIAL]

**Agent:** `git-specialist`

**Purpose:** Create commit for documentation changes, optionally clean history and push

**Depends on:** Phase 8 (Documentation updated)

**Creates:**
- Git commit with signal-focused message
- (Optional) Cleaned git history via interactive rebase
- (Optional) Pull request
- (Optional) Push to remote

**Workflow:**
1. Review staged changes (git status, git diff --staged)
2. Analyze what was updated (from docs-updater summary)
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
- Build should already pass (verified in Phase 6)

---

## Orchestrator Instructions

You are the **Implement Phase Orchestrator**. Guide user through 10-phase implementation workflow with smart parallelization (Phase 0-10).

### Agent Mapping - MUST USE Task Tool

**CRITICAL:** For EVERY phase, you MUST use the Task tool with the exact `subagent_type` specified below.

| Phase | Agent (subagent_type) | Tool Call Required |
|-------|----------------------|-------------------|
| **Phase 0** | `plan-analyzer` | ✅ REQUIRED |
| **Phase 1** | `supabase-schema-specialist` | ✅ REQUIRED |
| **Phase 2a** | `feature-foundation-developer` | ✅ REQUIRED (types.ts) |
| **Phase 2b** | `feature-foundation-developer` | ✅ REQUIRED (queries.ts + validation.ts - 2x parallel) |
| **Phase 3a** | `component-developer` | ✅ REQUIRED (base components) |
| **Phase 3b** | `component-developer` | ✅ REQUIRED (composite components) |
| **Phase 3c** | `ui-ux-designer` | ✅ REQUIRED (UI/UX review) |
| **Phase 4** | `server-action-developer` | ✅ REQUIRED |
| **Phase 5** | `route-developer` | ✅ REQUIRED |
| **Phase 6** | `implementation-validator` | ✅ REQUIRED |
| **Phase 7** | N/A (manual testing by user) | ❌ NO AGENT |
| **Phase 8** | `docs-updater` | ✅ REQUIRED |
| **Phase 8a** | N/A (orchestrator direct + skills) | ✅ REQUIRED (CLAUDE.md quality) |
| **Phase 8b** | N/A (orchestrator direct + skill-creator) | ⚠️ CONDITIONAL (skills update) |
| **Phase 9** | `git-specialist` | ✅ REQUIRED |

**Example Task tool calls:**
```typescript
// Phase 0
Task(subagent_type="plan-analyzer", description="Analyze Phase 2 plan", prompt="...")

// Phase 1
Task(subagent_type="supabase-schema-specialist", description="Create database migration", prompt="...")

// Phase 2a
Task(subagent_type="feature-foundation-developer", description="Create types.ts", prompt="...")

// Phase 2b (PARALLEL - single message, 2 Task calls)
Task(subagent_type="feature-foundation-developer", description="Create queries.ts", prompt="...")
Task(subagent_type="feature-foundation-developer", description="Create validation.ts", prompt="...")

// Phase 3a
Task(subagent_type="component-developer", description="Create QuestionField component", prompt="...")

// Phase 3b
Task(subagent_type="component-developer", description="Create SurveyForm component", prompt="...")

// Phase 3c
Task(subagent_type="ui-ux-designer", description="Review component UI/UX", prompt="...")

// Phase 4
Task(subagent_type="server-action-developer", description="Create Server Actions", prompt="...")

// Phase 5
Task(subagent_type="route-developer", description="Create page routes", prompt="...")

// Phase 6
Task(subagent_type="implementation-validator", description="Verify implementation", prompt="...")

// Phase 8
Task(subagent_type="docs-updater", description="Update documentation", prompt="...")

// Phase 9
Task(subagent_type="git-specialist", description="Create git commit", prompt="...")
```

### Critical Instructions

1. **Use Task tool for agents:** Launch agents using Task tool (NOT slash commands) - see Agent Mapping table above
2. **Parallel execution:** Launch ALL parallel agents in SINGLE message (multiple Task calls)
3. **Sequential execution (Interactive mode):** Wait for user approval before next phase
4. **Automated mode (--auto flag):** Run all phases without waiting, only stop on P0 test failures
5. **Context passing:** Pass plan analysis + previous outputs to each agent
6. **State tracking:** Track currentPhase, completedPhases, skippedPhases, outputs, mode (interactive/auto), **notion_task_id**, **notion_sync_status**
7. **DO NOT just describe:** ACTUALLY INVOKE TOOLS - use Task tool with correct subagent_type
8. **Handle failures:** If agent fails, offer retry/details/stop (or auto-retry in --auto mode)
9. **P0 bugs block merge:** Test failures with P0 severity ALWAYS require user intervention (even in --auto)
10. **Manual test checkpoints:** After phases with testable output, PAUSE and provide test instructions to user
11. **Build verification:** After each code-generating phase, verify the build succeeds - catch TypeScript errors early
12. **Implementation verification:** After Phase 5 (Routes), ALWAYS run Phase 6 (implementation-validator) to catch code issues before manual testing
13. **NEVER skip Phase 7:** Phase 7 (Manual Testing) is REQUIRED - user must test before docs
14. **Phase 8a mandatory** - Always review CLAUDE.md quality using claude-md-guidelines + signal-vs-noise skills
15. **Phase 8b conditional** - Only update skills when significant project-specific patterns discovered
16. **Content quality > line count** - Remove noise, keep signal (applies to both CLAUDE.md and skills)
17. **Skill invocation pattern** - Use Skill tool or @skill-name syntax to invoke skills in orchestrator
18. **ALWAYS use correct agent:** Reference Agent Mapping table - never guess or use wrong subagent_type
19. **Notion Integration:**
    - ALWAYS pass notion_task_id to docs-updater if present (Phase 8)
    - ALWAYS check for Skills Projects in Phase 0 (filter out if present)
    - NEVER proceed with Skills Projects tasks (Type = 🎓 Learning)
    - ALWAYS fall back to local plan if Notion unavailable
16. **Notion Status Values:** Use exact values: `"In Progress"`, `"Done"` (case-sensitive with spaces)
17. **Notion MCP Reference:** See notion-integration skill for complete MCP patterns and examples
18. **Skills Projects Filtering:** If project Type = "🎓 Learning" OR has `📚 Skills Projects` relation → ABORT with error message

### Build Verification Checkpoints

**CRITICAL:** After every code-generating phase, run a build test to catch errors early.

**When to build:**
- **After Phase 2b (Foundation):** `npm run build:cms` - Verify types/queries compile
- **After Phase 3b (Components):** `npm run build:cms` - Verify components compile
- **After Phase 3c (UI/UX Review):** `npm run build:cms` (if design changes made) - Verify fixes compile
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
  "planFile": "~/.claude/plans/example.md | null",
  "notion_task_id": "29284f14-76e0-8012-8708-abc123",
  "notion_task_url": "https://notion.so/29284f14-76e0-8012-8708-abc123",
  "notion_sync_status": "pending | synced | failed",
  "currentPhase": "8b",
  "completedPhases": ["0", "1", "2a", "2b", "3a", "3b", "3c", "4", "5", "6", "7", "8", "8a"],
  "skippedPhases": [],
  "outputs": {
    "phase0": {
      "strategy": "...",
      "notion_context": {
        "task_id": "abc123",
        "task_name": "Implement Redis caching",
        "project": "Legal-Mind MVP",
        "priority": "🔴 Urgent",
        "deadline": "2026-01-25"
      }
    },
    "phase1": { "migration": "...", "types_regenerated": true },
    "phase2a": { "file": "types.ts" },
    "phase2b": { "files": ["queries.ts", "validation.ts"] },
    "phase8": {
      "claude_md_files": ["apps/cms/features/survey/CLAUDE.md"],
      "project_spec_updated": true,
      "notion_synced": true
    },
    "phase8a": {
      "quality_review_complete": true,
      "issues_found": 2,
      "issues_resolved": 2,
      "files_refined": ["apps/cms/features/survey/CLAUDE.md"]
    },
    "phase8b": {
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
/implement-phase Phase 2
```

**Phase 0:**
```markdown
**Phase 0: Plan Analysis**

Analyzing Phase 2 plan from ~/.claude/plans/feature.md...
```

[Task tool call with subagent_type="plan-analyzer"]

```markdown
**Analysis Complete** ✅

Complexity: medium
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

[Task tool call with subagent_type="supabase-schema-specialist"]

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

[Task tool call with subagent_type="feature-foundation-developer"]

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

[Single message, 2 Task tool calls with subagent_type="feature-foundation-developer"]

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

[Task tool call with subagent_type="component-developer"]

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

[Task tool call with subagent_type="component-developer"]

```markdown
**SurveyForm Complete** ✅

Created: SurveyForm.tsx (form + validation + submission)

**Next:** Phase 3c (UI/UX Review)

**Commands:** `continue` | `details` | `stop`
```

[User: continue OR auto-proceed in --auto mode]

**Phase 3c:**
```markdown
**Phase 3c: UI/UX Review**

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

**Next:** Fix P1 issues or proceed to Phase 4 (Server Actions)?

**Commands:** `fix` | `continue` | `details` | `stop`
```

[User: continue - issues are minor OR auto-proceed in --auto mode]

[Continues through Phase 4-5...]

**Phase 6:**
```markdown
**Phase 6: Implementation Verification**

Analyzing implementation against plan and CODE_PATTERNS...
```

[Task tool call with subagent_type="implementation-validator"]

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

**Phase 7:**
```markdown
**Phase 7: Manual Testing** [REQUIRED]

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

**Phase 8:**
```markdown
**Phase 8: Documentation**

Updating documentation with implementation results...
```

[Task tool call with subagent_type="docs-updater"]

```markdown
**Documentation Updated** ✅

Files modified:
- docs/PROJECT_SPEC.yaml: Marked Phase 2 features complete, verified acceptance criteria
- docs/PROJECT_ROADMAP.md: Updated progress to 100%, added milestone

Summary:
Phase 2 Complete: Client survey form with 7 question types
Clients can now receive survey links and submit responses with validation.

**Next:** Phase 8a (CLAUDE.md Quality Review)

**Commands:** `continue` | `adjust` | `stop`
```

[User: continue]

**Phase 8a:**
```markdown
**Phase 8a: CLAUDE.md Quality Review** [MANDATORY]

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

**Next:** Phase 8b (Skills Update Review)

**Commands:** `continue` | `stop`
```

[User: continue]

**Phase 8b:**
```markdown
**Phase 8b: Skills Update Review** [CONDITIONAL]

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
Update `supabase-patterns` skill with RLS recursion anti-pattern discovered in Phase 1.

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

**Next:** Phase 9 (Git Operations)

**Commands:** `continue` | `stop`
```

[User: continue]

**Phase 9:**
```markdown
**Phase 9: Git Operations**

Creating commit for documentation changes...
```

[Task tool call with subagent_type="git-specialist"]

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
Phase 2: Launch 3x feature-foundation-developer
→ types.ts, queries.ts, validation.ts
→ Parallel execution for efficiency
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
# Inefficient! Should be parallel!
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

### ❌ Don't: Skip CLAUDE.md quality review
```markdown
Phase 8 complete → Immediately launch git-specialist
# NO! Must review CLAUDE.md quality first (Phase 8a)!
```

✅ **Correct:**
```markdown
Phase 8 complete → Phase 8a (CLAUDE.md quality review) → Apply signal-vs-noise → Phase 9 (Git)
```

### ❌ Don't: Update skills without decision framework
```markdown
Phase 8b: "Let me add this pattern to code-patterns"
# NO! Apply 3-Question Filter first: Project-specific? Timeless? Helps decisions?
```

✅ **Correct:**
```markdown
Phase 8b: Invoke skill-creator → Apply 3-Question Filter → Update only if YES to all 3
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

### ❌ Don't: Use wrong agent or skip Task tool
```markdown
Phase 2a: "Let me create types.ts manually"
# NO! Must use Task tool with subagent_type="feature-foundation-developer"

Phase 4: "Launching general-purpose agent..."
# NO! Must use Task tool with subagent_type="server-action-developer"

Phase 6: "I'll verify the code myself..."
# NO! Must use Task tool with subagent_type="implementation-validator"
```

✅ **Correct:**
```markdown
Phase 2a: Task(subagent_type="feature-foundation-developer", description="Create types.ts", prompt="...")
Phase 4: Task(subagent_type="server-action-developer", description="Create actions.ts", prompt="...")
Phase 6: Task(subagent_type="implementation-validator", description="Verify implementation", prompt="...")
```

---

## Workflow Insights (Lessons from Real Implementation)

### ✅ What Works Well

**Parallel Agent Execution:**
- Create queries.ts + validation.ts simultaneously
- Foundation agents (feature-foundation-developer) can run in parallel for independent files
- Saves ~15 minutes vs sequential execution
- Example: Phase 2b can parallelize types.ts creation, but queries/validation depend on types

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
- Solution: Add UI review checklist to Phase 6 (implementation-validator)
- Check: shadcn/ui components, theme tokens, spacing scale, accessibility (WCAG 2.1 AA)

---

**Use this workflow to systematically implement planned phases with intelligent agent orchestration, parallelization, and mandatory manual testing checkpoints.**
