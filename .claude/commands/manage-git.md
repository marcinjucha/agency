---
name: manage-git
description: Generate intelligent git commit messages from staged changes - Usage: /manage-git
---

# Manage Git - Intelligent Commit Message Generation

Generate high-quality conventional commit messages from staged git changes. Analyzes diff + file contents → generates title + body → user reviews/edits → commits.

## Usage

```bash
/manage-git
```

**Prerequisites:**
- Must have staged changes (`git add` files first)

**Process:**
1. Analyzes staged changes + reads modified files
2. Generates commit message (title + body, NO footer)
3. Shows message for user review
4. User can: accept / edit / regenerate / cancel
5. Commits with final message

**Speed:** 1-2 minutes

---

## Phases

```
0: Context Analysis       (orchestrator - inline, quick status check)
1: Message Generation     (project-manager-agent with git-commit-patterns)
2: Review & Confirmation  (orchestrator - inline, user checkpoint)
3: Execute Commit         (orchestrator - inline, git commit)
```

---

## ⚠️ CRITICAL: YOU MUST INVOKE AGENTS

**You are the orchestrator.** Your job is to **ACTUALLY INVOKE AGENTS using the Task tool**.

**For Phase 1**, invoke project-manager-agent via Task tool - do not describe what it will do, actually invoke it.

---

## Critical Rules

1. **INVOKE Phase 1 with Task tool** - project-manager-agent generates message
2. **Read entire modified files** - Agent needs file contents, not just diff
3. **Phase 2 is only user checkpoint** - User accepts/edits/regenerates here
4. **Abort if nothing staged** - Stop workflow gracefully
5. **Minimal interaction** - Streamlined flow, no unnecessary questions

---

## Phase Details

### Phase 0: Context Analysis (Inline)

**Actions:**

1. Check staged changes:
```bash
git status
git diff --cached --stat
```

2. If nothing staged, stop:
```
No staged changes detected. Please stage files first:
  git add <file>...
  git add -A

Then run /manage-git again.
```

3. If changes staged, continue:
- Categorize change type: feat / fix / refactor / test / docs / chore / perf
- Categorize change complexity: SIMPLE or COMPLEX
  - **SIMPLE:** 1-3 files, single concern, single decision (example: fix typo, add one feature flag, rename variable)
  - **COMPLEX:** 4+ files, multiple concerns, multiple architecture decisions (example: refactor structure, add new agent, enhance workflow)
- Extract ticket from branch: `git branch --show-current`
- Get recent commits for style: `git log --oneline -5`

**Proceed to Phase 1. Pass complexity categorization to agent.**

---

### Phase 1: Message Generation (Agent)

**Agent:** project-manager-agent

**Sufficient context for quality:**

```yaml
Input needed:
  - Git diff output (staged changes: git diff --cached)
  - Modified file contents (read each file entirely)
  - Change categorization (type from Phase 0)
  - Ticket number (extracted from branch, or "none")
  - Recent commit style (git log --oneline -5)

NOT needed:
  - Full git history beyond recent 5 commits
  - Project documentation (focus on THIS change only)
```

**Prompt to agent:**

```
Generate git commit message for staged changes.

STAGED CHANGES:
[git diff --cached output]

MODIFIED FILES:
[Read entire contents of each modified file]

CATEGORIZATION:
- Type: [feat/fix/refactor/...]
- Complexity: [SIMPLE or COMPLEX]
- Ticket: [TICKET-NUM or "none"]

RECENT COMMITS (for style consistency):
[git log --oneline -5]

REQUIREMENTS:

1. Title format: "[TICKET-NUM] type: subject" (max 72 chars including ticket)
   - If no ticket: "type: subject"

2. Body: Natural prose focusing on WHY, not HOW
   - WHY: Business context, reasoning, constraints, decisions
   - NOT HOW: File changes, implementation details, line-by-line diff

   **LENGTH LIMITS (critical):**
   - SIMPLE changes: 1-2 paragraphs (~100-150 words)
   - COMPLEX changes: 2-3 paragraphs (~200-250 words MAX)

   **NOTE:** If more than 3 key decisions → pick TOP 2 most important
   Don't list all decisions. Focus on what matters most.

3. SIGNAL vs NOISE: Only include information that explains the decision
   - ❌ "Added function to filter surveys" (obvious from code)
   - ✅ "Filtering needed because users reported scrolling 300+ items. Chose query-based approach to support offline mode (40% usage time)."
   - ❌ "Modified AuthService.ts and updated imports" (visible in diff)
   - ✅ "OAuth required for third-party integrations. PKCE prevents authorization code interception (CVE-2008-5461)."
   - ❌ "Consolidated 8 agents to 6, added verification-specialist, enhanced implement-phase, improved build verification, added code-validation anti-patterns" (too many details)
   - ✅ "Consolidated agents (8→6) to reduce context bloat. New verification-specialist agent catches implementation bugs before expensive test cycles."

4. NO footer (exception: only BREAKING: footer if breaking change)

Skills: Use git-commit-patterns (WHY-focused messaging, Signal vs Noise)

Output: Full commit message (title + body)
- Focus on OUTCOME not list of changes
- Be direct and concise
- Each paragraph = 1 key decision + business impact
```

**Proceed to Phase 2.**

---

### Phase 2: Review & Confirmation (Inline)

**This is the only user checkpoint.**

1. Display generated message:

```
═══════════════════════════════════════════════
GENERATED COMMIT MESSAGE:
═══════════════════════════════════════════════
[title line]

[body paragraphs]
═══════════════════════════════════════════════
```

2. User options:

```
- Type "accept" → Commit with this message
- Type "edit: [your changes]" → Apply edits and show updated message
- Type "regenerate" → Generate new message (reinvoke agent)
- Type "cancel" → Abort workflow

Your choice?
```

3. Handle user choice:

**If "accept":**
→ Proceed to Phase 3 (commit)

**If "edit: [changes]":**
→ Apply edits to message
→ Show updated message
→ Ask: "Commit with this message? (accept/edit/cancel)"
→ Loop until "accept"

**If "regenerate":**
→ Go back to Phase 1 (invoke agent again)

**If "cancel":**
→ Stop workflow (no commit)

---

### Phase 3: Execute Commit (Inline)

**Actions:**

1. Create commit:

```bash
git commit -m "$(cat <<'EOF'
[approved message from Phase 2]
EOF
)"
```

2. Verify and show result:

```bash
git log -1 --oneline
git show --stat HEAD
```

3. Display result:

```
✅ Commit created successfully!

Commit: [hash] [title]

Next steps:
- Review: git show HEAD
- Push: git push
- Create PR: gh pr create
```

**Workflow complete.**

---

## Commands

- `continue` - Proceed to next phase (Phase 0 → 1 → 2 → 3)
- `back` - Return to previous phase
- `stop` - Exit workflow without committing
- `accept` - (Phase 2 only) Accept message and commit
- `edit: [changes]` - (Phase 2 only) Edit message
- `regenerate` - (Phase 2 only) Regenerate message (reinvoke agent)
- `cancel` - (Phase 2 only) Abort workflow

---

## Sufficient Context Principle

**For Phase 1 agent (project-manager-agent):**

**Provide:**
- ✅ Git diff output (staged changes only)
- ✅ Modified file contents (entire files, not just diff sections)
- ✅ Change categorization (type, ticket number)
- ✅ Recent commits (for style consistency)
- ✅ git-commit-patterns skill (preloaded)

**Do NOT provide:**
- ❌ Full git history (just recent 5 commits)
- ❌ Generic guidelines (agent has skill)
- ❌ Project documentation (agent focuses on THIS change)

**Test question:**
> "Can agent produce HIGH QUALITY commit message with this context alone?"
> - Git diff → shows WHAT changed
> - File contents → shows WHY changed
> - Recent commits → ensures style consistency
>
> Result: **SUFFICIENT** ✅

---

## Workflow Design Decisions

**Why 4 phases (not 5)?**
- Phase 0: Trivial (no agent) → status check
- Phase 1: Complex (needs agent + skills) → message generation
- Phase 2: Interactive (user checkpoint) → review/edit loop
- Phase 3: Trivial (no agent) → commit execution

**Why project-manager-agent?**
- Has git-commit-patterns skill
- Focuses on WHY (business context) not HOW (implementation)
- Perfect for commit messages

**Why read entire files (not just diff)?**
- Diff shows WHAT changed
- File contents show WHY changed
- Commit messages need WHY context

**Why minimal clarifying questions?**
- Streamlined workflow
- User only decides on message (Phase 2)
- Agent/orchestrator handles analysis

**Why no footer by default?**
- Noise reduction (Signal vs Noise)
- No Co-Authored-By (obvious AI-generated commit)
- Exception: BREAKING: footer if breaking change required

---

## Real Example: RIGHT vs WRONG

### ❌ WRONG (5 paragraphs, 450+ words - TOO LONG)

```
chore: consolidate agents and enhance workflow orchestration

Consolidated agent count from 8 to 6 by merging redundant roles with overlapping
responsibilities. Analysis-Agent now owns both strategic planning and code
organization concerns (previous 2-agent split created unnecessary handoff).

Added verification-specialist agent (dedicated quality gate before testing).
Previous workflow mixed validation and testing in single agent. Splitting ensures
implementation correctness verified before expensive test cycles. Reduces feedback
loops: incorrect implementation caught immediately, not after 30-minute test run.
Estimated 40% faster iteration on buggy implementations.

Enhanced implement-phase command with Notion integration and clarifying questions
pattern. Previous implementation required manual task lookups. Auto-searches Notion
for matching tasks (NOTION-FIRST approach). Clarifying questions ensure correct
task selected before execution. Notion sync on completion enables automatic task
status updates without manual tracking.

Improved build verification checkpoints. Separated database migrations, type
generation, and React components into clear sequential phases. Parallel execution
where safe (no shared dependencies). Prevents cascading failures: migration failure
stops before type generation wastes time.

Added code-validation anti-patterns (6 production-validated mistakes documented).
Framework inconsistencies, memory leaks, query performance issues. Integrated with
verification-specialist for automatic detection during code review.

Why these changes matter: Consolidation reduces agent context bloat (6 focused
agents faster than 8 general agents). Verification split catches bugs before
expensive test cycles. Notion integration eliminates manual task tracking.
Build verification ordering prevents wasted compilation time. Anti-patterns
provide instant feedback on common mistakes.
```

**Problem:** 6 paragraphs, 5+ decisions listed, ~450 words. User asked for **concise**!

### ✅ RIGHT (2 paragraphs, 100-150 words - GOOD)

```
chore: consolidate agents and enhance workflow orchestration

Consolidated agents (8→6) to reduce context bloat and clarify boundaries.
New verification-specialist agent separates quality gate from testing,
catching implementation bugs before expensive test cycles (~40% faster iteration).

Enhanced implement-phase with Notion integration (eliminates manual task tracking),
clarifying questions pattern (prevent wrong task selection), and build verification
checkpoints (prevent cascading failures). Added code-validation anti-patterns for
automatic detection during code review.
```

**Why right:**
- 2 paragraphs (within complex change limit of 2-3)
- ~110 words (within 200-250 limit)
- TOP 2 decisions only (consolidation + Notion integration)
- Each paragraph = 1 decision + business impact
- Concise and signal-focused
