---
name: agent-skill-architecture
description: Use when creating or refactoring agents and their skills. Explains the architectural pattern where agents are routing layers (thin wrappers) and skills contain all domain knowledge (thick patterns). Includes templates, best practices, and real examples from Legal-Mind refactoring.
---

# Agent-Skill Architecture - Self-Contained Guide

## Purpose

Complete guide for agent-skill architecture: agents as Operating Systems (thin routing), skills as Applications (thick patterns). Includes Signal vs Noise filter, quality guidelines (WHY > HOW, quality > line count), templates, and real refactoring examples.

## When to Use

- Creating new agent from scratch
- Refactoring existing agent (too much duplication)
- Converting agent content to skills
- Understanding agent vs skill boundary
- Applying signal-vs-noise to agent/skill content
- Need guide for creating agents in new project

## Core Philosophy

### Anthropic's OS Analogy

**Think of it like a computer system:**

```
Agent = Operating System
├─ Routes requests to applications
├─ Provides consistent interface (workflow, output format)
├─ Manages execution (orchestration)
└─ Lightweight, stable core

Skill = Application
├─ Domain-specific functionality
├─ Self-contained patterns and knowledge
├─ Can be added/updated independently
└─ Feature-rich, specialized
```

**Why this works:**

- OS doesn't contain apps (agent doesn't contain patterns)
- OS routes to apps (agent routes to skills)
- Apps are self-contained (skills are self-contained)
- Add new apps without OS change (add skills without agent change)
- OS provides interface (agent provides workflow + output)

### The Problem We Solved

**Before refactoring:**

- 12 specialized agents (component-developer, route-developer, server-action-developer, etc.)
- Each agent 300-600 lines
- Heavy duplication of patterns between agents
- Hard to update patterns (must update multiple agents)
- Mixed routing logic with domain knowledge
- **Like:** 12 operating systems, each with apps baked in

**After refactoring:**

- 5 consolidated agents (code-developer, database-specialist, analysis-agent, etc.)
- Each agent ~120-150 lines
- Domain knowledge extracted to skills
- Patterns updated once, used by all agents
- Clear separation: agents route, skills provide patterns
- **Like:** 5 operating systems, with installable applications

### The Golden Rule

```
Agent = Operating System (thin routing layer)
├─ When to invoke (description with triggers)
├─ How to execute (workflow steps)
├─ What to output (format specification)
└─ Quality checks (checklist)

Skill = Application (thick pattern library)
├─ What patterns to use (templates, examples)
├─ What to avoid (anti-patterns)
├─ Why it works (explanations)
└─ How to verify (testing, commands)
```

**Agent responsibilities:**

- ✅ Description with triggers (when to invoke)
- ✅ Workflow (3-5 steps)
- ✅ Output format (YAML/JSON structure)
- ✅ Checklist (with skill references)
- ❌ NOT patterns/templates
- ❌ NOT anti-patterns/examples
- ❌ NOT detailed how-to

**Skill responsibilities:**

- ✅ Domain patterns (templates, examples)
- ✅ Anti-patterns (what NOT to do, why)
- ✅ Real project examples (from actual code)
- ✅ Quick reference (commands, checklists)
- ✅ Self-contained (all context needed)
- ❌ NOT workflow steps
- ❌ NOT output formats

---

## Signal vs Noise Integration

### The 3-Question Filter (For Content Quality)

**Before adding ANYTHING to agent or skill, ask:**

1. **Actionable?** Can Claude/user act on this information?
2. **Impactful?** Would lack of this cause bugs or waste time?
3. **Non-obvious?** Is this project-specific (not generic knowledge)?

**Scoring:**

- 3/3 YES → SIGNAL → Include it
- 2/3 YES → Consider (usually include if impactful + non-obvious)
- 1/3 YES → NOISE → Cut it

### Quality Guidelines

**Quality > Line Count**

The 500-line guideline is a TARGET, not a hard limit.

```
Better:
  600 lines of pure signal (every line project-specific)
Than:
  300 lines with 50% noise (generic patterns Claude knows)
```

**From our refactoring:**

- component-patterns: 112 lines (focused signal)
- rls-policies: 355 lines (critical infinite recursion bug needs space)
- database-functions: 444 lines (comprehensive function patterns)

**All high quality** - line count varies based on domain complexity.

### WHY > HOW Focus

**SIGNAL (keep):**

```markdown
## Controller for Checkbox Arrays

**Real bug from Phase 2:** register stored only last value, not array

**Why:** `register` = single value, Controller = array handling
```

**NOISE (cut):**

```markdown
## React Hook Form

React Hook Form is a library for managing forms in React...
[Generic explanation Claude already knows]
```

### Project-Specific Only

**Apply to both agents AND skills:**

**SIGNAL (keep):**

- ADR-005 separation (our architectural decision)
- Controller for checkboxes (we hit this bug)
- TanStack Query CMS-only (our project rule)
- Infinite recursion RLS bug (crashed our production)

**NOISE (cut):**

- How React Hook Form works (Claude knows)
- Generic Next.js routing (Claude knows)
- Standard Zod validation (Claude knows)
- Basic PostgreSQL syntax (Claude knows)

## How Skills Auto-Load

**Key insight:** Agent lists skills in frontmatter, Claude auto-loads skill descriptions, then loads full skill content when needed.

```yaml
# Agent frontmatter
skills:
  - schema-management # Claude sees description
  - rls-policies # Claude sees description
  - database-functions # Claude sees description
```

**What happens:**

1. Agent invoked with task
2. Claude reads agent file
3. Claude sees skill names in frontmatter
4. Claude loads ALL skill descriptions (from `description:` field)
5. Claude decides which skill to consult based on task
6. Claude loads full skill content (SKILL.md body)

**Why this works:**

- Agent doesn't need to explain skills (descriptions already loaded)
- Agent doesn't need "Consult X skill for Y" (Claude figures it out)
- Skills self-document via description field

## Agent Template

### Frontmatter Structure

```yaml
---
name: agent-name
color: red | blue | green | cyan | purple | orange
skills:
  - skill-1
  - skill-2
  - skill-3
description: >
  **Use this agent PROACTIVELY** when [high-level purpose].

  Automatically invoked when detecting:
  - [Scenario 1]
  - [Scenario 2]
  - [Scenario 3]

  Trigger when you hear:
  - "[phrase 1]"
  - "[phrase 2]"
  - "[phrase 3]"

model: sonnet | opus | haiku
---
```

**Description field rules:**

- Start with "Use this agent PROACTIVELY when"
- "Automatically invoked when detecting" - list scenarios
- "Trigger when you hear" - list key phrases user might say
- NO examples (too verbose, not needed)
- NO "Do NOT use for" (orchestrator knows boundaries)

### Body Structure

````markdown
You are a **[Agent Name]** for [domain]. Create [outputs] using patterns from loaded skills ([skill-1], [skill-2]).

---

## WORKFLOW

### Step 1: [Identify/Understand]

[Simple 2-3 line description]

### Step 2: [Apply Patterns]

[Reference to skills where patterns live]

### Step 3: [Output]

[What to produce]

---

## OUTPUT FORMAT

```yaml
# YAML structure expected
```
````

---

## CHECKLIST

Before output:

- [ ] [Check 1 with skill reference]
- [ ] [Check 2 with skill reference]
- [ ] [Check 3]

**Critical checks (from skills):**

- [Critical pattern 1] → [skill-name]
- [Critical pattern 2] → [skill-name]

---

[Optional: One-line closing reminder of most critical rule]

````

**Body size:** Aim for 120-150 lines (thin layer)

**What NOT to include:**
- ❌ Detailed patterns (those go in skills)
- ❌ Code examples (those go in skills)
- ❌ Anti-patterns (those go in skills)
- ❌ "YOUR EXPERTISE" sections (redundant with skills)
- ❌ "CRITICAL LESSONS" (those go in skills)
- ❌ "REFERENCE DOCUMENTATION" lists (skills auto-load)

## Skill Template

### Frontmatter Structure

```yaml
---
name: skill-name
description: Use when [specific trigger]. [What patterns it provides]. [Critical aspect that makes it essential].
---
````

**Description field rules:**

- Start with "Use when" (specific trigger)
- Explain what patterns/knowledge it contains
- Mention critical/unique aspect (why essential)
- Keep to 1-3 sentences
- Third-person ("Use when..." not "I help you...")

### Body Structure

````markdown
# Skill Name - One-Line Summary

## Purpose

[1-2 sentences: What problem does this solve?]

## When to Use

- [Trigger 1]
- [Trigger 2]
- [Trigger 3]

## Core Patterns

### Pattern 1: [Name]

**Use case:** [When to use this pattern]

```[language]
[Code example with comments]
```
````

**Why this works:**

- [Explanation 1]
- [Explanation 2]

### Pattern 2: [Name]

[Continue...]

## Anti-Patterns (Critical Mistakes)

### ❌ Mistake 1: [Name]

**Problem:** [What breaks, real example from project]

```[language]
# ❌ WRONG
[Bad code]

# ✅ CORRECT
[Good code]
```

**Why bad:** [Root cause, what happens]
**Fix:** [What to do instead]

## Quick Reference

**Commands/Checklists/Tables** - scannable format

```bash
# Common commands
command1
command2
```

**Checklist:**

- [ ] Check 1
- [ ] Check 2

## Real Project Examples

### Example 1: [Feature Name]

```[language]
// From Phase X implementation
[Actual code from project]
```

**Result:** [What this achieved]

## Integration with Other Skills

- **[skill-1]** - [How they relate]
- **[skill-2]** - [How they relate]

---

**Key Lesson:** [One sentence summary of most critical takeaway]

````

**Body size:** Aim for 400-600 lines (thick patterns)

**What MUST include:**
- ✅ Real examples from actual project
- ✅ Anti-patterns (mistakes we made, why)
- ✅ WHY explanations (not just HOW)
- ✅ Quick reference (scannable)
- ✅ Self-contained (all context needed)

## Real Example: database-specialist

### Agent File (~120 lines)

```yaml
---
name: database-specialist
skills:
  - schema-management
  - rls-policies
  - database-functions
  - architecture-decisions
description: >
  **Use this agent PROACTIVELY** when database changes are needed.

  Automatically invoked when detecting:
  - Need to create or modify database tables/columns
  - Adding RLS policies
  - Creating PostgreSQL functions

  Trigger when you hear:
  - "create migration"
  - "add RLS policy"
  - "infinite recursion error"
---

You are a **Database Specialist**. Create migrations using patterns from loaded skills.

## WORKFLOW

### Step 1: Identify Change Type

Schema change? → schema-management skill
RLS policy? → rls-policies skill
Function? → database-functions skill

### Step 2: Apply Skill Pattern

Consult loaded skill for exact pattern.

### Step 3: Create Migration + Output

Use skill patterns to create migration.

## OUTPUT FORMAT

[YAML structure]

## CHECKLIST

- [ ] Migration named correctly (schema-management)
- [ ] If RLS: checked rls-policies for recursion
- [ ] If function: GRANT permissions (database-functions)
````

**Notice:**

- No pattern details (in skills)
- No examples (in skills)
- Just routing + format

### Skill Files (400-600 lines each)

**schema-management.md** (432 lines)

- Migration naming conventions
- Type regeneration workflow
- Testing patterns
- Anti-pattern: Multiple migrations for same bug

**rls-policies.md** (545 lines)

- Infinite recursion bug (CRITICAL)
- SECURITY DEFINER pattern
- Multi-tenant isolation
- Testing with SET ROLE

**database-functions.md** (485 lines)

- Function types (atomic, helper, trigger)
- GRANT permission patterns
- Decision tree: function vs application

## Agent-Skill Boundaries

### Decision Tree: What Goes Where?

```
Is this about WHEN to invoke? → Agent description
Is this about WHAT to output? → Agent output format
Is this a WORKFLOW step? → Agent workflow section
Is this a PATTERN/TEMPLATE? → Skill
Is this an ANTI-PATTERN? → Skill
Is this a REAL EXAMPLE? → Skill
Is this a VERIFICATION step? → Skill
```

### Common Mistakes

**❌ Mistake 1: Duplicating Patterns in Agent**

```markdown
# ❌ WRONG: Agent file

## CRITICAL RULES

### Rule 1: NEVER use subqueries in RLS

[300 lines explaining infinite recursion]
```

**Fix:** Move to skill, reference from agent checklist

**❌ Mistake 2: Skills Reference Section in Agent**

```markdown
# ❌ WRONG: Agent file

## SKILLS REFERENCE

- schema-management - Migrations, naming
- rls-policies - RLS patterns
  [Explaining what each skill does]
```

**Fix:** Delete section. Skills auto-load descriptions.

**❌ Mistake 3: "Do NOT use for" in Agent**

```markdown
# ❌ WRONG: Agent description

Do NOT use this agent for:

- Writing queries (use code-developer)
- Creating components (use code-developer)
```

**Fix:** Delete section. Orchestrator knows agent boundaries.

**❌ Mistake 4: Thin Skills**

```markdown
# ❌ WRONG: Skill with 100 lines

Just basic patterns, no anti-patterns, no examples
```

**Fix:** Skills should be 400-600 lines with:

- Multiple patterns
- Anti-patterns from real bugs
- Real project examples
- Quick reference

## Refactoring Existing Agent

### Step-by-Step Process

**From our database-specialist refactoring:**

1. **Identify Patterns to Extract**

Read agent file (300+ lines), identify:

- Sections with "Pattern 1, Pattern 2..."
- Anti-pattern sections
- Example code blocks
- Verification/testing steps

2. **Create Skills for Pattern Groups**

```
Found in agent:
- Migration patterns → schema-management skill
- RLS patterns → rls-policies skill
- Function patterns → database-functions skill
```

3. **Write Skills (400-600 lines each)**

Include:

- Core patterns (templates)
- Anti-patterns (real mistakes)
- Real examples (from actual code)
- Quick reference

4. **Reduce Agent to Routing Layer**

Keep only:

- Description with triggers (30 lines)
- Workflow (3 steps, 20 lines)
- Output format (30 lines)
- Checklist with skill references (20 lines)

**Result:** 300 lines → 120 (agent) + 1400 (3 skills)

5. **Add Skills to Agent Frontmatter**

```yaml
skills:
  - schema-management
  - rls-policies
  - database-functions
```

## Checklist: Creating New Agent

**Agent File:**

- [ ] Description starts with "Use this agent PROACTIVELY"
- [ ] "Automatically invoked when detecting" list
- [ ] "Trigger when you hear" phrases
- [ ] NO examples in description
- [ ] NO "Do NOT use for" section
- [ ] Skills listed in frontmatter
- [ ] Body has 3-section workflow
- [ ] Output format defined (YAML)
- [ ] Checklist references skills
- [ ] Total: 120-150 lines

**Skill Files:**

- [ ] Description: "Use when..." (1-3 sentences)
- [ ] Purpose section (problem solved)
- [ ] Core patterns (3-5 patterns with templates)
- [ ] Anti-patterns (mistakes we made, why)
- [ ] Real project examples
- [ ] Quick reference (commands/checklists)
- [ ] Self-contained (all context)
- [ ] Total: 400-600 lines per skill

**Integration:**

- [ ] Agent frontmatter lists all skills
- [ ] Agent checklist references skills
- [ ] Skills don't reference agent
- [ ] Skills self-contained (no circular deps)

## Using in New Project

### Template Repository Structure

```
new-project/.claude/
├── agents/
│   └── domain-specialist.md    # 120-150 lines
├── skills/
│   ├── pattern-group-1/
│   │   └── SKILL.md             # 400-600 lines
│   ├── pattern-group-2/
│   │   └── SKILL.md
│   └── pattern-group-3/
│       └── SKILL.md
```

### Adaptation Steps

1. **Identify Domain** (e.g., "API Integration Specialist")

2. **List Pattern Groups** (e.g., "authentication", "rate-limiting", "error-handling")

3. **Create Skills First** (easier to see what agent needs)

4. **Create Agent as Router** (reference skills)

5. **Test with Real Task** (does agent route correctly?)

### Example: New Project "E-commerce API"

**Agent:** `payment-specialist`

**Skills:**

- `stripe-integration` - Payment processing patterns
- `payment-security` - PCI compliance, tokenization
- `refund-patterns` - Refund workflows, edge cases

**Agent file (120 lines):**

```yaml
---
name: payment-specialist
skills:
  - stripe-integration
  - payment-security
  - refund-patterns
description: >
  Use when payment processing needed - Stripe integration, refunds, webhooks.

  Trigger when you hear:
  - "process payment"
  - "handle refund"
  - "stripe webhook"
---
Workflow → Output Format → Checklist
```

**Skills (400-600 lines each):** Full patterns, anti-patterns, examples

## Key Insights

**From Legal-Mind Refactoring:**

1. **Agent descriptions auto-propagate** - Orchestrator sees them without agent explaining
2. **Skills self-document** - Description field makes them discoverable
3. **Thin agents scale better** - Adding new patterns = add skill, not modify agent
4. **Pattern reuse** - Same skill used by multiple agents (like shared libraries)
5. **Maintenance simplified** - Update pattern once (skill), all agents benefit
6. **OS analogy holds** - Agents are stable OS, skills are updatable apps

**Critical Numbers:**

- Agent: 120-150 lines (thin OS)
- Skill: 400-600 lines (thick app)
- Skills per agent: 3-4 optimal (like bundled apps)
- Agents in system: 5-7 for monorepo (was 12)

**OS Analogy in Practice:**

```
database-specialist (OS)
├─ loads → schema-management (app)
├─ loads → rls-policies (app)
└─ loads → database-functions (app)

User: "Create migration"
├─ OS (agent) receives request
├─ OS routes to schema-management (app)
└─ App provides pattern/template
```

## References (Tier 3 - Self-Contained)

**This skill includes reference files for offline use:**

- **./signal-vs-noise-reference.md** - Complete Signal vs Noise 3-Question Filter, examples
- **./skills-guide-reference.md** - Official Anthropic skills creation guide, metadata rules
- **./skill-template-reference.md** - Copy-paste templates for quick skill creation

**Use references for:**

- Signal vs Noise → Deep dive on 3-Question Filter, application examples
- Skills Guide → Tier 1/2/3 architecture, official metadata spec
- Templates → Quick-start templates for new skills

**Why included:**

- Self-contained guide (no external dependencies)
- Offline reference for new projects
- Complete context for agent-skill decisions

---

**Key Lesson:** Agents are Operating Systems (thin routing ~120 lines), skills are Applications (thick patterns ~400 lines). Quality > line count. WHY > HOW. Project-specific only.
