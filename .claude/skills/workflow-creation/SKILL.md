---
name: workflow-creation
description: Use when creating or refactoring workflow commands (multi-phase agent orchestration). Provides workflow file structure pattern, sufficient context principle (isolated context + quality test), section templates, and anti-patterns from real mistakes. Critical for workflows where agents have isolated context and need exactly the right information for quality output.
---

# Workflow Creation - Multi-Agent Orchestration Pattern

## Purpose

Guide for creating workflow command files that orchestrate multiple agents across phases. Focus on **workflow structure pattern**, **sufficient context principle** (agents have isolated context), and **anti-patterns from real mistakes**.

## When to Use

- Creating new workflow command (multi-phase orchestration)
- Refactoring existing workflow (structure inconsistent)
- Understanding workflow file conventions
- Deciding what context to pass to agents
- Fixing workflows where agents produce low-quality output

---

## Workflow File Structure Pattern

**Standard workflow file structure** (our convention):

```markdown
---
description: "[one-line description] - Usage: /command-name [args]"
---

# Title - Purpose

Brief explanation (1-2 sentences).

## Usage
[bash command, arguments, examples]

## Phases
[Phase overview with inline/agent markers]

## Orchestrator Instructions

### ⚠️ CRITICAL: YOU MUST INVOKE AGENTS
[Force actual Task tool invocation]

### Critical Rules
[3-5 rules, numbered]

### Phase Execution Pattern
[Markdown template for presenting phases]

## Phase Details

### Phase N: Name
**Agent**: agent-name

**Sufficient context for quality**: [CRITICAL SECTION]
```yaml
Input needed:
  - [decisions from previous phases]
NOT needed:
  - [generic knowledge, noise]
```

**Prompt to agent**: [template with placeholders]

**After agent**: [how to present results]

## Commands
[continue, skip, back, status, stop]

## Sufficient Context Principle
[Test question, signal/noise examples]
```

**Why this structure:**
- **Phases overview** - orchestrator sees full workflow before starting
- **Orchestrator Instructions** - forces actual Task invocation (anti-pattern: just describing)
- **Phase Details** - includes "Sufficient context for quality" section (CRITICAL)
- **Sufficient Context Principle** - always at end (test question for context filtering)

---

## Section Templates

### 1. Description (Frontmatter)

```yaml
---
description: "[Tool name] - [One-line purpose] - Usage: /command [args]"
---
```

**Pattern:**
- Start with tool name
- One-line purpose (not essay)
- Include usage with command syntax
- Max 200 chars

### 2. Phases Overview

```markdown
## Phases

```
0: Context Analysis      (orchestrator - inline assessment)
1: Requirements          (agent-name)
2: Architecture          (agent-name with skill-name skill)
3: Implementation        (agent-name)
```

**Speed**: X-Y min
```

**Pattern:**
- Phase 0 always inline (orchestrator assessment)
- Mark which agent for each phase
- Mention key skills if relevant
- Estimated duration

**WHY Phase 0 inline:** Orchestrator does quick categorization before launching agents. Avoids wasting agent invocation on trivial assessment (complexity check, file categorization).

### 3. Orchestrator Instructions

**CRITICAL SECTION** - Forces actual agent invocation:

```markdown
## Orchestrator Instructions

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
Phase 1/5: Requirements
Launching requirements-analyst...
```
[IMMEDIATELY invoke Task tool NOW with subagent_type="agent-name"]

### Critical Rules

1. **INVOKE with Task tool** - Every phase requires actual Task tool call
2. **Sufficient context** - Each agent gets ONLY what it needs for quality
3. **User checkpoints** - Get approval after each phase
4. **Track phase** - Remember current position

### Phase Execution Pattern

```
═══════════════════════════════════════════════
Phase N/5: [Name]
═══════════════════════════════════════════════

Launching [agent]...
```

[Invoke Task tool]

```
**Phase N Complete** ✅
[Summary]

Ready to proceed? (continue/skip/back/stop)
```
```

**WHY this section:**
- **Anti-pattern prevention**: Orchestrator describing instead of invoking (happened 30% of time without this section)
- **Force behavior**: Explicit DO/DON'T forces actual Task tool use
- **User checkpoints**: Prevents wasting phases if direction wrong

### 4. Phase Details - Sufficient Context Section

**MOST CRITICAL SECTION** - What context to pass to agent:

```markdown
### Phase N: Name
**Agent**: agent-name

**Sufficient context for quality**:
```yaml
Input needed:
  - Critical decisions (from Phase M: architecture chosen, file locations)
  - Constraints (performance requirements, offline-first, business rules)
  - Existing patterns (repository names, service names to match)
  - Project-specific rules (NO Repo→Repo, DependencyKey rules)

NOT needed:
  - Full previous YAML outputs (extract decisions only)
  - Detailed user stories (agent needs requirements, not stories)
  - Generic explanations (Claude knows language/framework basics)
  - Intermediate analysis (agent needs conclusions, not process)
```

**Prompt to agent**:
```
[Task description]

[Critical context from previous phases - EXTRACTED, not full output]

Use skills:
- skill-name (what it provides)

[Specific instructions]

Output: [format]
```
```

**WHY this matters:**
- Agents have **isolated context** - can't see previous conversation
- Need **sufficient connected quality** - not everything, just what's critical
- **Test question**: "Can agent produce HIGH QUALITY output with this context alone?"

### 5. Commands Section

```markdown
## Commands

- `continue` - Next phase
- `skip` - Skip current phase
- `back` - Previous phase
- `status` - Show progress
- `stop` - Exit workflow
```

**Standard across all workflows.**

### 6. Sufficient Context Principle (End Section)

**Always include at workflow end:**

```markdown
## Sufficient Context Principle

**For each agent, provide:**
- ✅ Critical decisions (architecture, locations, module placement)
- ✅ Constraints (performance, business rules)
- ✅ Existing patterns (follow these)
- ✅ Project-specific rules

**Do NOT provide:**
- ❌ Full previous YAML outputs
- ❌ Detailed user stories
- ❌ Generic explanations
- ❌ Intermediate analysis

**Test question**:
> "Can agent produce HIGH QUALITY output with this context alone?"
> If YES → sufficient
> If NO → add missing critical info (not everything)
```

---

## Sufficient Context Principle

**CORE PHILOSOPHY** - Agents have isolated context, need exactly right information.

### Why This Matters

**Agents don't see previous conversation.** Each agent invocation starts fresh. Must provide sufficient context for HIGH QUALITY output, but not noise.

**The Problem:**
- Too much context → Waste tokens, slow processing, 80% unused
- Too little context → Generic output, multiple rounds needed, wasted time

**The Solution:** Test question for every context decision.

### The Test Question

**Before passing ANY context to agent, ask:**

```
"Can this agent produce HIGH QUALITY output with this context alone?"

If YES → Context is sufficient
If NO → Add missing CRITICAL information (not everything, just what's missing)
```

**HIGH QUALITY means:**
- Project-specific (not generic)
- Follows existing patterns (knows what to match)
- Meets constraints (knows performance/business rules)
- Correct layer placement (knows architecture decisions)

### Signal vs Noise Filter

**SIGNAL (Include):**
- ✅ **Critical decisions** from previous phases
  - Example: "Architecture Phase decided: Use Service pattern (combines 3 repos), files in Core module"
- ✅ **Constraints** that affect implementation
  - Example: "Offline-first required, query-based filtering (300 routes), max 2s response"
- ✅ **Existing patterns** to follow
  - Example: "Repository naming: RouteDataRepository, RouteNetworkRepository (match this pattern)"
- ✅ **Project-specific rules**
  - Example: "NO Repository→Repository dependencies, DependencyKey: Core YES / App NO"

**NOISE (Exclude):**
- ❌ **Full previous YAML outputs** (too verbose, extract decisions only)
  - Example: Don't pass 500-line requirements.yaml → Extract 50 lines of critical requirements
- ❌ **Detailed user stories** (agent doesn't need full context)
  - Example: "As a warehouse worker..." → "Must work offline, 40% warehouse time offline"
- ❌ **Generic explanations** (Claude knows this)
  - Example: "Architecture pattern is..." → Just say which pattern to use
- ❌ **Intermediate analysis** (agent needs conclusions, not process)
  - Example: "We considered 3 options..." → Just say which option was chosen + WHY

### Real Examples

**Example 1: Architect Phase (Architecture Design)**

**✅ SUFFICIENT (50 lines):**
```
INTENT: Add data filtering by status and date
CONSTRAINTS:
  - Offline-first capability required
  - Query-based filtering (large dataset, can't load all)
  - Max 2s response time
COMPLEXITY: Simple (single feature, existing patterns)
```

**❌ TOO MUCH (500 lines):**
```
[Full requirements.yaml with:]
- Complete user stories ("As a user...")
- Acceptance criteria (15 items)
- Edge cases documentation
- UI mockups descriptions
- [80% of this is noise for architecture decisions]
```

**Result:** Agent produced same quality architecture with 50 lines vs 500 lines. 90% token savings.

**Example 2: Developer Phase (Implementation)**

**✅ SUFFICIENT (80 lines):**
```
ARCHITECTURE (from Phase 2):
  Layers: Data Access, Business Logic, Presentation
  Files:
    - core/data/FilterRepository
    - app/business/FilterService
    - app/components/FilterPanel
  Module: Data layer in core/, rest in app/

CONSTRAINTS:
  - Offline-first: query-based filtering
  - Performance: max 2s response

EXISTING PATTERNS:
  - Repositories: DataRepository, NetworkRepository
  - Services: DataService, ValidationService
  - Components: ListPanel, DetailView

PROJECT RULES:
  - NO circular dependencies (use Service layer if needed)
  - Dependency injection pattern required
  - Constants file for strings (never hardcoded)
```

**❌ TOO LITTLE (20 lines):**
```
Implement data filtering feature.
Use repository, service, and component patterns.
```

**Result:** With too little context, agent produced generic implementation, didn't follow project patterns, required rework.

### Application Pattern

**For EVERY agent invocation:**

1. **Extract decisions** from previous phases (not full output)
2. **List constraints** that affect this agent's work
3. **Identify patterns** agent must follow
4. **Include project rules** that apply
5. **Apply test question**: Can agent produce HIGH QUALITY with this?
6. **If NO**: Add missing critical info (not everything)

---

## Phase Design Patterns

### When to Run Phases in Parallel

**Pattern:** Multiple independent validations, no dependencies.

**Example:** Pre-merge check - Phase 1 (Performance) + Phase 2 (Boundaries)
- Performance analyzes changed files for N+1 queries, .share() missing
- Boundaries check imports for module violations
- **NO dependency** between them

**How to implement:**
```markdown
### Phase 1+2: Parallel Validation

Launching:
1. quality-specialist (performance)
2. architect (module boundaries)

Running in parallel... ⏳
```

[Invoke BOTH Task calls in SINGLE message]

**When NOT parallel:** Phase N needs output from Phase M (sequential dependency).

### Phase 0 Always Inline

**Pattern:** Phase 0 = orchestrator does quick assessment, no agent.

**Why:**
- Quick categorization (complexity, affected files, bug type)
- Avoids wasting agent invocation on trivial task
- Orchestrator already has context (user request)

**Example:**
```markdown
### Phase 0: Context Analysis (Inline)
**You do this - no agent**

Quick assessment:
- **Type:** [categorize request]
- **Complexity:** [simple/moderate/complex]
- **Files affected:** [from git diff or description]

Output: Brief note
Decision: Continue workflow or suggest alternative
```

### User Checkpoints After Each Phase

**Pattern:** Get user approval before proceeding.

**Why:** Prevents wasting phases if direction wrong. User can adjust mid-workflow.

**Implementation:**
```markdown
**Phase N Complete** ✅
[Summary of what agent produced]

Ready to proceed? (continue/skip/back/stop)
```

**Real mistake:** Ran all 8 phases without approval. Phase 3 architecture wrong, but all implementation done. Had to rerun entire workflow.

---

## Anti-Patterns (Critical Mistakes We Made)

### ❌ Mistake 1: Too Much Context (Noise Overload)

**Problem:** Passed full 500-line requirements.yaml to developer agent. Agent took 3x longer, output quality same.

**Why bad:**
- Wasted tokens (400 lines unused)
- Slower processing (agent must parse everything)
- Not signal (80% generic user stories, not implementation details)

**Real example:** Feature implementation workflow Phase 3 - originally passed full requirements.yaml (500 lines). Reduced to 50-line architecture summary (decisions + constraints + existing patterns). Output quality identical, 90% token savings.

**Fix:** Extract only critical decisions/constraints. Apply test question: "Does agent need this to produce quality output?"

**Before (500 lines):**
```yaml
requirements:
  user_stories:
    - As a user, I want to filter data by status...
    - [20 user stories with acceptance criteria]
  edge_cases:
    - [15 edge cases documented]
  ui_mockups:
    - [Descriptions of UI screens]
  [Full user stories, acceptance criteria, etc.]
```

**After (50 lines):**
```yaml
ARCHITECTURE:
  Layers: Data Access, Business Logic, Presentation
  Files: [paths]
  Module: Core vs App placement

CONSTRAINTS:
  - Offline-first capability
  - Query-based (large dataset)
  - Max 2s response

EXISTING PATTERNS:
  - DataRepository, NetworkRepository
  - Follow naming conventions

PROJECT RULES:
  - NO circular dependencies
  - Dependency injection required
```

### ❌ Mistake 2: Too Little Context (Insufficient Quality)

**Problem:** Architect agent received just "Add filtering" without constraints. Produced generic solution, needed rework.

**Why bad:**
- Agent output generic (no project-specific context)
- Multiple rounds needed (back-and-forth clarification)
- Wasted time (2 invocations instead of 1)

**Real example:** Feature workflow Phase 2 - architect received "Add data filtering" without offline-first constraint. Designed in-memory filtering (loaded all data). But requirement: offline capability + large dataset. Had to redesign for query-based approach. Wasted 1 phase.

**Fix:** Apply test question. If agent can't produce QUALITY output, add missing CRITICAL info.

**Before (20 lines - insufficient):**
```
Add data filtering feature.
Use repository, service, and component patterns.
```

**After (80 lines - sufficient):**
```
INTENT: Data filtering by status and date
CONSTRAINTS:
  - Offline-first capability required
  - Query-based filtering (large dataset, can't load all)
  - Max 2s response
COMPLEXITY: Simple
EXISTING: DataRepository (database), FilterService
PROJECT RULES: Query-based for large datasets
```

### ❌ Mistake 3: Not Invoking Task Tool (Just Describing)

**Problem:** Orchestrator said "I will now launch ios-developer agent..." but didn't invoke Task tool. Workflow stopped.

**Why bad:**
- Workflow stops (no agent actually runs)
- User confused (thinks agent is running)
- Manual intervention needed (user has to remind)

**Real example:** Before adding "⚠️ CRITICAL: YOU MUST INVOKE AGENTS" section, 30% of workflow runs had orchestrator describe phase instead of invoking. User had to say "actually run it."

**Fix:** "⚠️ CRITICAL" section in every workflow. Forces actual Task tool invocation.

**Wrong behavior:**
```
Phase 2: Architecture Design

I will now launch the architect agent to design the architecture.
The agent will analyze the requirements and produce...

[NO Task tool invocation - workflow stops]
```

**Correct behavior:**
```
Phase 2: Architecture Design

Launching architect...

[IMMEDIATELY invokes Task tool with subagent_type="architect"]
```

### ❌ Mistake 4: No User Checkpoints

**Problem:** Ran all 8 phases without approval. Phase 3 architecture wrong, but all implementation done (Phase 4-8 wasted).

**Why bad:**
- Wasted 5 phases (architecture decision wrong)
- User couldn't adjust mid-workflow
- Had to rerun entire workflow

**Real example:** Feature implementation workflow - user wanted combined service pattern (multiple data sources), but architect chose simpler pattern. User only saw this after Phase 8 (all implementation done). Had to rerun workflow from Phase 3.

**Fix:** Get user approval after EACH phase. Commands: continue, skip, back, stop.

**Pattern:**
```markdown
**Phase N Complete** ✅
[Summary of agent output]

Ready to proceed? (continue/skip/back/stop)
```

**Why this works:** User can catch wrong direction early, adjust, and continue from correct point.

---

## Quick Reference

### Workflow Creation Checklist

**Structure:**
- [ ] Description in frontmatter (<200 chars, includes usage)
- [ ] Phases overview (with inline/agent markers)
- [ ] "⚠️ CRITICAL: YOU MUST INVOKE AGENTS" section
- [ ] Critical Rules (3-5 rules)
- [ ] Phase Execution Pattern (markdown template)
- [ ] Each phase has "Sufficient context for quality" section
- [ ] Commands section (continue, skip, back, status, stop)
- [ ] "Sufficient Context Principle" at end

**Content Quality:**
- [ ] Phase 0 inline (orchestrator assessment)
- [ ] "Sufficient context" section for EVERY agent phase
- [ ] Test question applied to context decisions
- [ ] User checkpoints after each phase
- [ ] No full YAML outputs passed (extract decisions)
- [ ] Project-specific rules included
- [ ] Existing patterns listed

**Anti-Pattern Prevention:**
- [ ] Force Task invocation (⚠️ CRITICAL section)
- [ ] Context filtered (signal only, no noise)
- [ ] User checkpoints (prevent wasted phases)
- [ ] Test question documented (for future maintainers)

### Decision Tree: How Many Phases?

```
Simple workflow (1 task, 1 agent):
  → 3 phases: Phase 0 (inline) + Phase 1 (agent) + Phase 2 (verification inline)
  → Example: debug-workflow (70% faster than multi-agent)

Standard workflow (feature development):
  → 5-6 phases: Phase 0 + Requirements + Architecture + Implementation + Testing + Review
  → Example: feature-lite (5 phases)

Complex workflow (granular control):
  → 8+ phases: Separate phases for each layer + multiple reviews
  → Example: feature-workflow (8 phases)

Validation workflow (parallel checks):
  → 4 phases: Phase 0 + Phase 1+2 (parallel) + Phase 3 (merge results)
  → Example: pre-merge-check (3 agents, parallel)
```

### Context Extraction Pattern

**For every agent invocation:**

1. **Read previous phase output** (full YAML)
2. **Extract decisions** (20% of content)
3. **List constraints** (from requirements/architecture)
4. **Identify patterns** (existing code to match)
5. **Include project rules** (that apply to this agent)
6. **Test question**: Can agent produce HIGH QUALITY with this?
7. **If NO**: Add missing critical info (not everything)

**Result:** 50-80 lines of pure signal, not 500 lines with 80% noise.

---

## Key Principles

**Workflow Structure:** Standard sections (our convention), Phase 0 inline, user checkpoints

**Sufficient Context:** Test question ("Can agent produce HIGH QUALITY?"), signal/noise filter, extract decisions (not full outputs)

**Force Invocation:** "⚠️ CRITICAL" section prevents describing instead of invoking

**WHY Explanations:** Phase 0 inline (WHY: avoids wasting agent), User checkpoints (WHY: prevents wasted phases)

**Anti-Patterns:** Document real mistakes (too much context, too little, no invocation, no checkpoints)

---

## Resources (Tier 3 - Philosophy)

**This skill includes philosophy reference files:**

- `@resources/signal-vs-noise-reference.md` - 3-question filter for deciding what to include in workflows
- `@resources/why-over-how-reference.md` - Content quality philosophy (WHY > HOW, production context)
- `@resources/skill-structure-reference.md` - Standard structure and best practices (adaptable to workflow structure)

**Use references for:**

- Signal vs Noise → Filter what context to provide agents (sufficient, not excessive)
- Why over How → Include rationale for workflow structure decisions (why phases, why checkpoints)
- Structure → Consistent workflow organization (phase structure, section patterns)

**Why included:**

- Consistent philosophy across all meta skills (skills, agents, workflows)
- Decision framework for workflow content (what to include, what to skip)
- Quality guidelines (completeness > brevity, WHY explanations mandatory)

---

**Key Lesson:** Workflows need standard structure + sufficient context principle + forced invocation. Agents have isolated context - must provide exactly right information (test question). User checkpoints prevent wasted phases.
