---
description: "[Brief description] - Usage: /command-name [args]"
---

# [Workflow Name]

[One-sentence description of what this workflow does]

**Use this when:**
- [Primary scenario]
- [Secondary scenario]
- [Third scenario]

**Use /other-command when:**
- [Alternative scenario]

---

## Usage

```bash
/command-name [required_arg] [optional_flag]
```

**Examples:**
```bash
/command-name add route filtering by status
/command-name fix upload bug in mapping flow
/command-name optimize database queries
```

---

## Workflow Type & Signal vs Noise

**Type:** [Development | Validation | Debug | Refactor]

**Signal vs Noise for This Workflow:**
- **Signal (what we focus on):** [High-value outcomes this workflow achieves]
- **Noise (what we skip):** [Low-value work this workflow intentionally avoids]
- **Principle:** [One-liner core philosophy]

**Agent Orchestration:**
- **Parallel phases:** [Which phases run multiple agents simultaneously] ⚡⚡⚡
- **Sequential phases:** [Which phases must run one after another]
- **Conditional phases:** [Which phases can be skipped based on context]

---

## Workflow Phases

```
Phase 0: [Name] (if applicable)         [~Xmin]
    ↓ [User action]
Phase 1: [Name] (agent-name)            [~Xmin]
    ↓ [User action]
Phase 2: [Name] ⚡⚡⚡ (3 agents parallel) [~Xmin]
    ↓ [User action]
Phase 3: [Name] [CONDITIONAL]           [~Xmin]
    ↓ [User action]
Phase N: Complete!
```

**Speed:** [Total time estimate] ([optimization explanation if applicable])

**Optimizations:**
- [What makes this workflow efficient]
- [Parallelization gains if applicable]
- [Smart skipping if applicable]

---

## Phase Descriptions

### Phase 0: [Name] (if applicable)
**Agent:** `agent-name`

**Purpose:** [What this phase achieves in one sentence]

**Output:** [Format - YAML/markdown/etc with brief description]

**Commands:**
- `continue` - [What happens]
- `skip` - [What happens, when allowed]
- `stop` - Exit workflow

**Skip When:** [Conditions for skipping this phase, if conditional]

---

### Phase 1: [Name]
**Agent:** `agent-name`

**Purpose:** [One sentence]

**Analyzes/Implements/Validates:**
- [Key aspect 1]
- [Key aspect 2]

**Output:** [Format + content]

**Commands:**
- `continue` - [Action]
- `back` - [Action]
- `stop` - Exit

---

### Phase N: [Name] [⚡⚡⚡ if parallel] [CONDITIONAL if skippable]

**Agents:** `agent-1`, `agent-2`, `agent-3` (if parallel)

**Purpose:** [One sentence]

**Why parallel:** [No data dependencies - agents analyze different aspects]

**Output:** [Combined results from all agents]

**Commands:**
- `continue` - Proceed
- `details [agent]` - Expand specific agent output
- `retry [agent]` - Re-run specific agent
- `stop` - Exit

---

## Orchestrator Instructions

You are the **[Workflow Name] Orchestrator**. Guide user through [N]-phase [workflow type].

### Critical Instructions

1. **Use Task tool for agents:** Launch agents using Task tool (subagents, NOT slash commands)
2. **Parallel execution:** Launch ALL parallel agents in SINGLE message (multiple Task calls)
3. **Sequential execution:** Wait for user approval before next phase
4. **Context passing:** Pass ALL previous phase outputs to next agent
5. **State tracking:** Track currentPhase, completedPhases, skippedPhases
6. **DO NOT just describe:** ACTUALLY INVOKE TOOLS

### Phase Execution Pattern

**Sequential Phase:**
```markdown
**Phase N: [Name]**

[Brief description]
```

[Launch Task tool]

```markdown
**Phase N Complete** ✅

[Summary of output]

**Commands:** `continue` | `back` | `stop`
```

**Parallel Phase:**
```markdown
**Phase N: [Name]**

Launching [X] agents simultaneously:
1. agent-1 - [purpose]
2. agent-2 - [purpose]
```

[Launch ALL agents in SINGLE message]

```markdown
**Phase N Complete** ✅

Combined results:
- agent-1: [summary]
- agent-2: [summary]

**Commands:** `continue` | `details [agent]` | `stop`
```

### State Tracking

```json
{
  "currentPhase": N,
  "completedPhases": [1, 2, ...],
  "skippedPhases": [],
  "contextAnalysis": {},
  "outputs": {}
}
```

### Error Handling

**Agent failure:**
```markdown
⚠️ [agent-name] failed: [reason]

**Commands:**
- `retry` - Try again
- `continue` - Proceed without this agent
- `stop` - Exit workflow
```

**Critical issue:**
```markdown
❌ [Issue] (BLOCKS MERGE/PROGRESS)

Must fix before proceeding.

**Commands:**
- `stop` - Exit to fix manually
- `back` - Review details
```

---

## Example Execution

**User starts:**
```bash
/command-name example feature
```

**Phase 0 (if applicable):**
```markdown
**Phase 0: Context Analysis**

Analyzing complexity...
```

[Task launches ios-context-analyzer]

```markdown
**Analysis Complete** ✅

Complexity: moderate
Skip: Phase 3 (not needed)

**Commands:** `continue` | `stop`
```

**Phase 1:**
```markdown
**Phase 1: Requirements**

Extracting requirements...
```

[Task launches agent]

```markdown
**Requirements Complete** ✅

Feature: Route Filtering
MVP: 5 functional, 3 UI
Optional: 2 nice-to-haves

**Commands:** `continue` | `back` | `stop`
```

[User: continue]

**Parallel Phase:**
```markdown
**Phase 2: Validation** (3 agents)

Launching validators:
1. boundaries - Module imports
2. performance - Database queries
3. design - UI compliance
```

[Single message, 3 Task calls]

```markdown
**Validation Complete** ✅

Results:
- boundaries: ✅ PASS
- performance: ⚠️ 1 P0 issue
- design: ✅ PASS

**Commands:** `continue` | `details performance` | `stop`
```

**Final:**
```markdown
**All Phases Complete!** ✅

Duration: 45 minutes

Summary:
- Files created: 8
- Tests added: 5
- Issues fixed: 2

Next: /ios-pre-merge-check
```

---

## Checklist: New Workflow

**Before creating:**
- [ ] Clear purpose (what problem does this solve?)
- [ ] Natural phases identified (analysis → design → implement)
- [ ] Data dependencies mapped (which phases need previous outputs?)
- [ ] Parallelization opportunities identified
- [ ] Skip logic determined (when phases optional?)

**While creating:**
- [ ] Phase 0 context analysis (if multi-phase with skip logic)
- [ ] Mark parallel phases ⚡⚡⚡
- [ ] Mark conditional phases [CONDITIONAL]
- [ ] Clear user commands at each step
- [ ] Error handling for agent failures
- [ ] State tracking for orchestrator

**After creating:**
- [ ] Test with simple case (should skip phases if applicable)
- [ ] Test with complex case (all phases included)
- [ ] Verify parallelization works (single message, multiple Tasks)
- [ ] Verify state tracking accurate

---

## Key Patterns

### Pattern 1: Context-Driven Skipping

**Use Phase 0 to determine execution path:**
```yaml
context_analysis:
  skip_phases: [2, 4]  # Module placement, Data flow

→ User sees: "Skipping Phase 2 (not needed for single-feature)"
```

### Pattern 2: Maximum Parallelization

**Launch independent agents together:**
```markdown
Phase 1: [Agent A + Agent B + Agent C] in SINGLE message
→ Saves 2-3x time vs sequential
```

### Pattern 3: Smart Defaults

**Optimize for common case:**
```bash
/command description              # Fast path (skips optional)
/command description --verbose    # Detailed (includes all)
```

---

## Anti-Patterns (Avoid These)

### ❌ Don't: Agent spawns agent
```markdown
# In agent prompt:
"After analysis, spawn ios-module-placement..."
```
**Why:** Agents can't spawn agents, only orchestrator can

### ❌ Don't: Auto-proceed without approval
```markdown
Phase 1 complete → Phase 2 starts immediately
```
**Why:** User loses control, can't review

### ❌ Don't: Missing context
```markdown
Phase 3 receives only Phase 2 output
```
**Why:** Agents need cumulative context

### ❌ Don't: Vague commands
```markdown
"Review and decide what to do"
```
**Why:** User doesn't know what to type

**Do:** Concrete commands
```markdown
Commands: `approve` | `back` | `retry` | `stop`
```

---

**Use this template for consistent, optimized workflows with clear signal focus.**
