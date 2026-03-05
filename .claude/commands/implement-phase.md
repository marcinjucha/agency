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
- **Signal:** Working code that meets plan requirements, passing tests, updated documentation
- **Noise:** Over-optimization, hypothetical features, perfect code (YAGNI applies)
- **Principle:** "Build what's needed NOW, build it correctly, document it clearly"

---

## Reference Documentation

**Skills loaded automatically** via each agent's `skills:` field. Domain knowledge lives in skills, not in this command.

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
Phase 8: Implementation Verification (verification-specialist)
    ↓ Verifies implementation against plan and loaded skills
    ↓ Output: YAML verification report with risk levels
    ↓ User: pass | fix-blocking | fix-warnings | details | stop
Phase 9: Manual Testing [REQUIRED]
    ↓ User tests complete feature manually
    ↓ User: pass | fix-and-retry | stop
Phase 10: Documentation (project-manager-agent)
    ↓ Updates PROJECT_ROADMAP.md + PROJECT_SPEC.yaml + CLAUDE.md (content)
    ↓ Syncs Notion task status (if applicable)
    ↓ User: approve | adjust | stop
Phase 10a: CLAUDE.md Quality Review [MANDATORY]
    ↓ (orchestrator + claude-md skill + signal-vs-noise skill)
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

**Reference:** Agent loads Notion MCP patterns via skill keywords in prompt

### Overview

When Notion task is used:
- **Phase 1:** Searches and presents Notion tasks (unless --notion-task-id provided)
- **Phase 2:** Analyzes selected task (Name, Notes, Projects context)
- **Phases 3-9:** Execute normally (using Notes as plan content)
- **Phase 10:** project-manager-agent syncs status to "Done" and adds completion notes

### Phase 1-2: Reading from Notion (orchestrator + analysis-agent)

**Extract plan from task:**
- Plan content: Notes property
- Task name: Name property
- Context: Priority, Deadline, Projects

**Skills Projects already filtered** in Phase 1

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

Agent handles Notion MCP operations using loaded skill patterns.

### Error Handling

**Notion API Unavailable:**
- Fall back to local plan file (if provided)
- Phase 10: Skip Notion sync (status: failed)
- Output includes: notion_sync_status: "failed"

**Task Not Found:**
- Verify: Task ID is correct (UUID format), Task exists in Agency Tasks database
- Commands: `retry` | `use-local` | `stop`

**Skills Project Detected:**
- Warning: This task is linked to a Skills Project (Type: 🎓 Learning)
- Agency implementation workflows only process agency work
- Commands: `select-different-task` | `stop`

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

**Agent:** `analysis-agent`

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

**Agent:** `database-specialist`

**Purpose:** Create/modify database schema (migrations, RLS policies, functions)

**Creates:** Database schema artifacts (migrations, policies, functions) using loaded skills.

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

**Agent:** `code-developer` (3 instances in parallel)

**Purpose:** Create foundational TypeScript files (types, queries, validation)

**Creates:** Foundation TypeScript files (types, queries, validation) using loaded skills.

**Why parallel:** These 3 files are independent - no dependencies between them

**Output:** Foundation files ready for components to use

**Commands:**
- `continue` - Proceed to components
- `retry [file]` - Recreate specific file
- `details [file]` - See full file content
- `stop` - Exit workflow

---

### Phase 5a: Components - Base Component [SEQUENTIAL]

**Agent:** `code-developer`

**Purpose:** Create base/leaf components (no dependencies on other feature components)

**Creates:** Base/leaf components (no dependencies on other feature components)

**Why first:** Composite components import base components

**Output:** Base components ready for composite components to use

**Commands:**
- `continue` - Proceed to Phase 5b (composite components)
- `retry` - Recreate component
- `details` - See full component code
- `stop` - Exit workflow

---

### Phase 5b: Components - Composite Component [SEQUENTIAL]

**Agent:** `code-developer`

**Purpose:** Create composite components (depend on base components)

**Creates:** Composite components (depend on base components from Phase 5a)

**Why after 5a:** Imports base components from Phase 5a

**Output:** Composite components ready for routes

**Commands:**
- `continue` - Proceed to server actions
- `retry` - Recreate component
- `details` - See full component code
- `stop` - Exit workflow

**Note:** If plan has multiple independent components, they can be parallel in 5a. But dependent components must be sequential.

---

### Phase 5c: UI/UX Review [SEQUENTIAL]

**Agent:** `ui-ux-designer`

**Purpose:** Review components for design excellence, accessibility, and visual polish

**Reviews:** Design quality, accessibility, and visual polish using loaded skills.

**Why after 5b:** Components are functionally complete, ready for design review

**Output:** YAML report with design issues by severity and concrete recommendations

**Commands:**
- `continue` - Design approved, proceed to server actions
- `fix` - Design issues found, code-developer fixes them
- `details` - See full UI/UX review report
- `stop` - Exit workflow

**Skip When:** Components are purely functional with no UI (rare)

**Note:** If critical design issues found, code-developer should fix before Phase 6.

---

### Phase 6: Server Actions [SEQUENTIAL]

**Agent:** `code-developer`

**Purpose:** Create Server Actions for data mutations

**Creates:** Server Actions for data mutations using loaded skills.

**Output:** Server Actions ready for components to call

**Commands:**
- `continue` - Proceed to routes
- `retry` - Recreate actions
- `details` - See full actions.ts
- `stop` - Exit workflow

---

### Phase 7: Routes [SEQUENTIAL]

**Agent:** `code-developer`

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

### Phase 8: Implementation Verification [MANDATORY]

**Agent**: `verification-specialist`

**Purpose**: Verify implementation correctness before manual testing (catches bugs early, saves testing time)

**When to invoke**: After Phase 7 (Routes) completes, before Phase 9 (Manual Testing)

**Sufficient context for quality**:
```yaml
Input needed:
  - Plan content (requirements to verify against)
  - Implementation scope (files changed - from git diff)
  - Phase outputs (what was implemented in Phases 3-7)

NOT needed:
  - Generic pattern explanations (agent has skills loaded)
  - Full previous YAML outputs (just list files created)
  - User stories details (agent needs requirements, not stories)
```

**Prompt to agent**:
```
Verify implementation against plan requirements.

PLAN REQUIREMENTS:
[Extract functional requirements from plan - what should be implemented]

IMPLEMENTATION SCOPE:
[List files created/modified from Phases 3-7]
- Database: [migration files - check RLS policies, migrations, Supabase client selection]
- Foundation: [types, queries, validation - check structured Server Action returns, async params]
- Components: [components - check React components, accessibility, Controller patterns, UI states]
- Actions: [Server Actions - check app/features separation, import rules]
- Routes: [routes - check monorepo structure, ADR-005 compliance]

Check for: severity classification, Phase 2 bugs, testing decisions.

Output: YAML verification report with risk levels
```

**After agent**:
```markdown
**Phase 8 Complete** ✅

Verification report:
- Requirements Coverage: [X/Y implemented]
- Common Bugs: [N issues found]
- Architectural Compliance: [status]
- Code Quality: [status]

Blocking issues (CRITICAL/HIGH): [count]
Warnings (MEDIUM): [count]

[Show summary of blocking issues if any]

───────────────────────────────────────────────
Let me verify my understanding:
[2-3 sentence paraphrase of verification findings]

Clarifying questions (4-5 for complex verification phase):
1. Are all blocking issues critical, or can some be deferred to post-merge?
2. Should I fix MEDIUM warnings now, or proceed with blocking issues only?
3. For [specific issue] - is the suggested fix correct for your use case?
4. Are there additional patterns I should check that weren't in the plan?
5. Should verification include [specific concern user mentioned]?

Does this match what you expected? If not, what should I adjust?
───────────────────────────────────────────────

[Wait for confirmation]

**Next**: Fix issues or proceed to Phase 9 (Manual Testing)

**Commands**: `pass` | `fix-blocking` | `fix-warnings` | `details` | `stop`
```

**Output**: YAML verification report with findings categorized by risk level

**Commands**:
- `pass` - No blocking issues, proceed to manual testing
- `fix-blocking` - Fix CRITICAL/HIGH issues (recommended if present)
- `fix-warnings` - Fix MEDIUM issues (optional quality improvement)
- `details` - Show full verification report with code snippets
- `stop` - Exit workflow

**Skip When**: Never (always verify before manual testing)

**Why mandatory**: Catches implementation bugs before manual testing. Prevents wasting testing time on broken code.

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

**ALWAYS add debug logging before manual testing** — accelerates debugging when issues occur.

1. Add `console.log` to API endpoints/Server Actions (request body, validation, results, errors)
2. Start dev servers with log capture to `/tmp/`
3. Monitor logs during testing (`tail -f`, `grep` for errors)
4. When user reports error → check logs → fix

**Commands:**
- `pass` - Tests passed, proceed to documentation
- `check` - User saw error, check logs to debug
- `fix-and-retry` - Found bugs, fix them and test again
- `stop` - Exit workflow

**Critical:**
- NEVER proceed to documentation without passing manual tests
- ALWAYS add debug logging before starting manual tests

---

### Phase 10: Documentation [SEQUENTIAL]

**Agent:** `project-manager-agent`

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
  - Create/update feature CLAUDE.md (project-specific oddities, critical mistakes, WHY context)
- Creates YAML summary for project-manager-agent

**Orchestrator must pass:**
```yaml
notion_context:
  task_id: "29284f14-76e0-8012-8708-abc123"  # From Phase 1
  task_url: "https://notion.so/29284f14-76e0-8012-8708-abc123"
  sync_required: true
```

**CLAUDE.md Updates:** Create/update for new features or significant changes; skip for trivial fixes.

**Output:** Documentation updated (local + Notion + CLAUDE.md), summary ready for project-manager-agent

**Commands:**
- `approve` - Approve documentation updates
- `adjust` - Modify documentation
- `stop` - Exit workflow

---

### Phase 10a: CLAUDE.md Quality Review [MANDATORY]

**Orchestrator:** Direct (no agent)
**Skills Used:** claude-md, signal-vs-noise

**Purpose:** Ensure CLAUDE.md documents are signal-focused, project-specific, and high-quality before commit

**When Applicable:**
- CLAUDE.md files were created/updated in Phase 10
- Always run if new feature documentation added

**Process:**

1. **Load skills** — claude-md and signal-vs-noise for quality criteria
2. **Review each CLAUDE.md** created/updated in Phase 10
3. **Apply signal-vs-noise filter** from loaded skill
4. **Discuss with user** — present assessment, confirm understanding
5. **Update if needed** — remove noise, enhance signal

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

1. **Load skill-creator** — review decision framework and 3-Question Filter
2. **Review implementation outputs** from Phases 3-9 for new patterns
3. **Apply 3-Question Filter** — project-specific? timeless? helps decisions?
4. **Propose updates** to affected skills with rationale
5. **Update if approved** — follow skill-creator template format

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

---

### Phase 11: Git Operations [SEQUENTIAL]

**Agent:** `project-manager-agent`

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

### ⚠️ CRITICAL: YOU MUST INVOKE AGENTS

**You are the orchestrator.** Your job is to **ACTUALLY INVOKE AGENTS using the Task tool**.

**DO NOT**:
- ❌ Say "I will launch agent-name"
- ❌ Describe what the agent will do
- ❌ Explain the phase without invoking

**DO**:
- ✅ Immediately invoke Task tool with agent
- ✅ Use subagent_type, description, prompt parameters
- ✅ Wait for agent completion
- ✅ Show results to user

**Example**:
```
Phase 2/12: Plan Analysis
Launching analysis-agent...
```
[IMMEDIATELY invoke Task tool NOW with subagent_type="analysis-agent"]

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
| **Phase 8** | `verification-specialist` | ✅ REQUIRED |
| **Phase 9** | N/A (manual testing by user) | ❌ NO AGENT |
| **Phase 10** | `project-manager-agent` | ✅ REQUIRED |
| **Phase 10a** | N/A (orchestrator direct + skills) | ✅ REQUIRED (CLAUDE.md quality) |
| **Phase 10b** | N/A (orchestrator direct + skill-creator) | ⚠️ CONDITIONAL (skills update) |
| **Phase 11** | `project-manager-agent` | ✅ REQUIRED |

**Example Task tool call with FULL CONTEXT:**
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
```

**Parallel agents:** Single message with multiple Task calls (e.g., Phase 4b: queries.ts + validation.ts simultaneously)

### Context Passing Pattern (CRITICAL)

**Agents have isolated context** - they see ONLY what you pass in the prompt.

**Pattern:** Build context object, accumulate ALL phase outputs, pass relevant parts to each agent.

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

12. **Implementation verification:** After Phase 7 (Routes), ALWAYS run Phase 8 (verification-specialist) to catch code issues before manual testing

13. **NEVER skip Phase 9:** Phase 9 (Manual Testing) is REQUIRED - user must test before docs

14. **Phase 10a mandatory** - Always review CLAUDE.md quality using claude-md + signal-vs-noise skills

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

18. **Clarifying questions mandatory:**
    - After EVERY phase (except Phase 1 automatic, Phase 12 complete)
    - Paraphrase understanding (2-3 sentences)
    - Ask 3-5 questions depending on phase complexity:
      - Simple phases (Notion Discovery, Manual Testing, Reviews): 3 questions
      - Standard phases (Plan Analysis, Database, Documentation, Git): 3-4 questions
      - Complex phases (Foundation, Components, Actions, Routes, Verification): 4-5 questions
    - Wait for confirmation ("dokładnie to co chcę")
    - ONLY after confirmation: offer commands (continue/skip/back/stop)

### Clarifying Questions Pattern (MANDATORY)

**After EVERY phase (except Phase 1 automatic and Phase 12 complete), you MUST:**

```
Let me verify my understanding:
[2-3 sentence paraphrase of what was produced/decided in this phase]

Clarifying questions (3-5 depending on phase complexity):
1. [Question about scope/constraint from this phase]
2. [Question about edge case/requirement]
3. [Question about priority/approach]
[4. [Question about integration point - if complex phase]]
[5. [Question about validation criteria - if complex phase]]

Does this match exactly what you want to achieve? If not, what should I adjust?
```

**Wait for user response.** If user says corrections needed:
- Apply corrections
- Paraphrase updated understanding
- Ask 3-5 NEW clarifying questions about updated version (depending on complexity)
- Repeat until user confirms "dokładnie to co chcę" / "exactly what I want"

**Only after confirmation**, proceed with: "Ready to proceed? (continue/skip/popraw/back/stop)"

**Question count guidance for implement-phase:**

**Simple phases (3 questions):**
- Phase 1: Notion Discovery (straightforward task selection)
- Phase 9: Manual Testing (clear test/pass/fail)
- Phase 10a: CLAUDE.md Quality Review (apply standards)
- Phase 10b: Skills Update Review (apply filter)

**Standard phases (3-4 questions):**
- Phase 2: Plan Analysis (complexity assessment, dependencies)
- Phase 3: Database Setup (migration requirements, RLS patterns)
- Phase 10: Documentation (what to update, Notion sync)
- Phase 11: Git Operations (commit scope, message)

**Complex phases (4-5 questions):**
- Phase 4: Foundation (types + queries + validation dependencies)
- Phase 5: Components (base/composite dependencies, UI/UX integration)
- Phase 6: Server Actions (action patterns, error handling, revalidation)
- Phase 7: Routes (route structure, data fetching, architectural compliance)
- Phase 8: Implementation Verification (verification-specialist - requirements, bugs, architecture, quality)

**Principle**: Ask enough questions to uncover hidden constraints, not more. Quality over quantity.

**Why mandatory:**
- Clarifying questions catch wrong direction early (Phase N, not Phase N+3)
- Prevents ambiguous requirements → agent assumptions → output mismatch → wasted phases

**When to apply:**
- ✅ After Phase 2-11 (agent phases or significant decisions)
- ❌ NOT after Phase 1 (automatic Notion search)
- ❌ NOT after Phase 12 (workflow complete)

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

**Checkpoint format:** Derive test instructions from plan's acceptance criteria. Include what to test, how to test, what to verify. Orchestrator composes these per-plan — no hardcoded examples.

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
        "project": "Halo Efekt MVP",
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
      "skills_updated": ["database-patterns"]
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

───────────────────────────────────────────────
Let me verify my understanding:
[2-3 sentence paraphrase of what was produced/decided]

Clarifying questions ([3-5 depending on phase complexity - see guidance above]):
1. [Specific question about scope/constraint]
2. [Specific question about edge case/requirement]
3. [Specific question about priority/approach]
[4. [Specific question about integration - if complex]]
[5. [Specific question about validation - if complex]]

Does this match exactly what you want? If not, what should I adjust?
───────────────────────────────────────────────

[Wait for user confirmation]

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
   Project: Halo Efekt MVP

2. [AAA-P-3] Phase 2 - Survey Form & Response Management (Not Started)
   Project: Halo Efekt MVP

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

**Phase 3-7:** [Condensed - follow same pattern as Phase 2 for sequential execution]

**Phase 4b (Parallel):**
```markdown
**Phase 4b: Foundation - Queries & Validation** ⚡⚡⚡

Launching 2 agents simultaneously:
1. queries.ts - Data fetching with server client
2. validation.ts - Validation schemas
```

[Single message, 2 Task tool calls with subagent_type="code-developer"]

```markdown
**Foundation Complete** ✅

Created:
- ✅ apps/website/features/survey/queries.ts
- ✅ apps/website/features/survey/validation.ts

**Next:** Phase 5a (Base Components)

**Commands:** `continue` | `details [file]` | `stop`
```

[User: continue OR auto-proceed in --auto mode]


**Phase 8:**
```markdown
**Phase 8: Implementation Verification**

Analyzing implementation for requirements, bugs, architecture, quality...
```

[Task tool call with subagent_type="verification-specialist"]

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

**Phase 9:** [Manual testing checkpoint - same pattern as Phase 8]

**Phase 10:** [Documentation update - project-manager-agent updates PROJECT_SPEC.yaml, Notion task]

**Phase 10a:** [CLAUDE.md quality review - orchestrator applies claude-md + signal-vs-noise skills directly]

**Phase 10b:** [Skills update review - orchestrator applies skill-creator decision framework]

**Phase 11:** [Git operations - project-manager-agent creates commit, optional push]

**Phase 12: Complete**

---

## Sufficient Context Principle

**Test question before passing context to agents:**

```
"Can this agent produce HIGH QUALITY output with this context alone?"

If YES → Context is sufficient
If NO → Add missing CRITICAL information (not everything)
```

**SIGNAL (Include):**
- ✅ Critical decisions from previous phases (architecture choices, file locations)
- ✅ Constraints affecting implementation (security, isolation requirements)
- ✅ Keywords matching relevant skill descriptions (triggers correct skill loading)

**NOISE (Exclude):**
- ❌ Full previous YAML outputs (extract decisions only: 500 lines → 50 lines)
- ❌ Generic explanations (Claude knows framework basics)
- ❌ Explicit skill names (use descriptive keywords instead — skills load via keyword matching)

---

## Key Patterns

### Pattern 1: Smart Parallelization

**Foundation phase (always parallel):**
- Phase 4: Launch types.ts, queries.ts, validation.ts simultaneously

**Components phase (parallel if independent):**
- Phase 5: Launch base components first, then dependent composites

### Pattern 2: Critical Phase Blocking

**Database phase blocks everything:**
- Phase 3 must complete before Foundation
- Foundation needs regenerated types
- Everything depends on types

### Pattern 3: Conditional Skipping

**Skip testing if automated only:**
- If plan specifies automated tests only, skip Phase 9

---

## Anti-Patterns (Avoid These)

### ❌ Skip clarifying questions
**Problem:** Present output → immediately offer commands → user confirms without understanding verified
**Fix:** Always paraphrase + ask 3-5 questions + wait for confirmation before offering commands

### ❌ Skip build verification
**Problem:** Phase 4b complete → Immediately launch Phase 5
**Fix:** Phase 4b complete → npm run build:cms → Verify succeeds → Phase 5 starts

### ❌ Skip testing with P0 issues
**Problem:** Testing: 2 P0 failures found → User: continue to documentation
**Fix:** Fix P0 first, never proceed with blocking issues


---

**Use this workflow to systematically implement planned phases with intelligent agent orchestration, parallelization, and mandatory manual testing checkpoints.**
