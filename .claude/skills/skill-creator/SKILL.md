---
name: skill-creator
description: Use when creating new Agent Skills for this project. Provides decision framework (signal vs noise), creation process, templates, and verification checklist.
---

# Skill Creator - Meta Skill for Creating Skills

## Purpose

Guide the creation of high-quality Agent Skills that are concise, signal-focused, and project-specific. Ensures consistency with Legal-Mind architecture (Skills for domain knowledge, Commands for workflows, Agents for specialized tasks).

## When to Use

- **Creating new skill** - Have domain knowledge to extract from docs or codebase
- **Evaluating if skill needed** - Unsure whether to create skill vs command vs agent
- **Refactoring existing docs** - Converting documentation to skill format
- **Reviewing skill quality** - Verifying skill follows best practices

## Core Philosophy

**Content Quality > Line Count**

The 500-line guideline is a target, not a hard limit. If high-quality, signal-focused content requires more space, use it. Better to have 600 lines of pure signal than 300 lines that omit critical information.

**What matters:**
- ✅ Every line provides project-specific value
- ✅ No generic explanations Claude knows
- ✅ Critical mistakes documented with WHY
- ✅ Scannable structure (easy to find what you need)
- ❌ NOT arbitrary line count compliance

**Trade-off:** More comprehensive content (600 lines) vs splitting to Tier 3 files (300 + 300)
- **Keep together** if content is interconnected and needs context
- **Split to Tier 3** if content is modular and self-contained

**See:** `./signal-vs-noise-reference.md` for the complete 3-question filter and application examples.

## Decision Framework

### Should You Create a Skill?

**Ask these 3 questions (Signal vs Noise):**

1. **Is this project-specific?**
   - ✅ YES → Legal-Mind RLS patterns (infinite recursion bug)
   - ❌ NO → Generic React patterns (Claude knows)

2. **Is this timeless?**
   - ✅ YES → Architecture decisions (monorepo structure)
   - ❌ NO → "As of January 2025..." (outdated quickly)

3. **Does this help make decisions?**
   - ✅ YES → When to use Server vs Browser client (decision table)
   - ❌ NO → "Supabase is a backend service..." (noise)

**If 3/3 YES → Create skill**
**If 2/3 YES → Consider creating skill**
**If 1/3 YES → Don't create skill**

### Skill vs Command vs Agent?

| Type | Purpose | When to Create | Example |
|------|---------|----------------|---------|
| **Skill** | Domain knowledge | Project-specific patterns, rules, decisions | `supabase-patterns`, `code-patterns` |
| **Command** | Workflow orchestration | Multi-phase processes with multiple agents | `/implement-phase`, `/debug` |
| **Agent** | Specialized task execution | Need specific tools, loaded by commands | `plan-analyzer`, `docs-updater` |

**Quick Decision:**
- Need to **reference patterns**? → Skill
- Need to **orchestrate workflow**? → Command
- Need to **execute specific task**? → Agent

---

## Creation Process

### Step 1: Analyze Source Material

**Identify what to extract:**

```yaml
Source: docs/CODE_PATTERNS.md (950 lines)

Extract to skills:
  - supabase-patterns:
      - RLS infinite recursion bug (CRITICAL)
      - Server vs Browser client selection
      - Split Query Pattern
      - Type regeneration commands

  - code-patterns:
      - Server Action return types
      - React Hook Form patterns
      - TanStack Query rules (CMS only)
      - Type safety pattern

Signal: 40% (project-specific)
Noise: 60% (generic React/Supabase)

Result: Create 2 skills, keep only signal
```

**Red flags (don't extract):**
- ❌ Generic explanations ("What is a Server Action?")
- ❌ Basic syntax ("How to use React Hook Form")
- ❌ Framework docs ("TanStack Query API reference")
- ❌ Common patterns Claude knows ("useState for local state")

**Extract (project-specific):**
- ✅ Critical mistakes we made ("RLS infinite recursion crash")
- ✅ Project decisions ("Why we use Controller not register")
- ✅ Architecture rules ("app/ vs features/ separation")
- ✅ Multi-tenant isolation rules ("Never tenant_id from user input")

### Step 2: Design Skill Structure

**Decide Tier 2 vs Tier 3 split:**

```yaml
SKILL.md (Tier 2): Aim for ~500 lines (quality > count)
  - Core principles (what, when, why)
  - Quick reference tables
  - Anti-patterns (critical mistakes)
  - Complete if interconnected, reference Tier 3 if modular

Tier 3 files: Optional detailed examples
  - rls-policies.md - Full RLS policy examples
  - client-selection.md - Server vs browser client guide
  - testing-rls.md - RLS testing commands
```

**Decision guide:**
- **Keep in SKILL.md** if interconnected (needs context from other sections)
- **Split to Tier 3** if modular (self-contained, can be read independently)
- **Quality first:** Better 600 lines of signal than 300 incomplete
- **Typical range:** 150-600 lines depending on domain complexity

### Step 3: Write SKILL.md

**Use this structure:**

```markdown
---
name: skill-name
description: When to use (third-person, <1024 chars)
---

# Skill Name - One-Line Description

## Purpose
[1-2 sentences: What problem does this solve?]

## When to Use
- Trigger 1
- Trigger 2
- Trigger 3

## Core Principles (or Patterns)

### Principle 1: Name
**What:** [Brief explanation]
**Why:** [Real problem we hit]
**Example:** [Minimal code if needed]

### Principle 2: Name
[Continue...]

## Quick Reference
[Tables, checklists, commands - scannable format]

## Anti-Patterns (Critical Mistakes We Made)

### ❌ Mistake 1
**Problem:** [What broke]
**Why it failed:** [Root cause]
**Fix:** [What we do now]

## References
- @tier3-file-1.md - Description
- @tier3-file-2.md - Description
```

**Writing tips:**
- **Signal-focused** - Only project-specific, skip generic (most important)
- **Quality > brevity** - Include everything critical, even if longer
- **WHY included** - Always explain WHY decisions made (critical for context)
- **Scannable** - Use tables, bullets, headers for quick reference
- **Third-person** - "Use when..." not "I can help..."
- **Complete** - Better comprehensive than artificially short

### Step 4: Create Tier 3 Files (Optional)

**When to create Tier 3:**
- Detailed code examples (>50 lines)
- Multiple related patterns (5+ examples)
- Deep-dive guides (comprehensive explanation)

**Structure for Tier 3 files:**

```markdown
# Tier 3 File Name

[Self-contained content - no references to other files]

## Pattern 1
[Full example with code]

## Pattern 2
[Full example with code]

## Common Issues
[Troubleshooting specific to this pattern]
```

**Keep Tier 3 self-contained** - no nested references.

### Step 5: Update Agent/Command References

**If skill should be loaded by agents:**

```yaml
# .claude/agents/server-action-developer.md
---
name: server-action-developer
skills:
  - code-patterns        # NEW
  - supabase-patterns    # NEW
---
```

**If skill should be referenced in commands:**

```markdown
# .claude/commands/implement-phase.md

## Reference Documentation

**Skills (loaded automatically via agent skills: field):**
- `supabase-patterns` - Database patterns (RLS, clients, migrations)
- `code-patterns` - Application patterns (Server Actions, types)
```

### Step 6: Verify Quality

**Run through checklist:**

- [ ] Name: lowercase + hyphens, max 64 chars
- [ ] Description: third-person, describes WHEN to use, <1024 chars
- [ ] Body: <500 lines (ideally 150-300)
- [ ] References: One level deep only
- [ ] Signal: Only project-specific (no generic explanations)
- [ ] Third-person: "Use when..." not "I help..."
- [ ] WHY included: Explains rationale for decisions
- [ ] Anti-patterns: Documents critical mistakes made
- [ ] Scannable: Tables, bullets, headers for quick lookup
- [ ] Self-check: Would this help future me with amnesia?

**Token budget check:**
```bash
wc -l .claude/skills/skill-name/SKILL.md
# Should be: <500 lines (ideally 150-300)
```

---

## Templates

### Basic SKILL.md Template

See `@skill-template.md` for copy-paste ready template.

**Minimal viable skill:**

```yaml
---
name: my-skill-name
description: Use when [specific trigger]. Provides [what it provides].
---

# Skill Name - Purpose

## When to Use
- Trigger 1
- Trigger 2

## Core Pattern
**What:** [Brief explanation]
**Why:** [Problem it solves]

## Quick Reference
- Key fact 1
- Key fact 2

## Anti-Patterns
### ❌ Common Mistake
**Fix:** [What to do instead]
```

**Expand as needed** - start minimal, add sections as patterns emerge.

---

## Skill Types (This Project)

### Type 1: Technical Patterns (Database, Code)

**Examples:** `supabase-patterns`, `code-patterns`

**Focus:**
- Technical decisions with rationale
- Critical bugs we hit (with fixes)
- Architecture constraints
- Quick reference commands/tables

**Structure:**
```markdown
## Pattern Name
**Rule:** [What to do/avoid]
**Why:** [Real problem we hit]
**Example:** [Minimal code]
```

### Type 2: Architectural Decisions (Structure, Organization)

**Examples:** `architecture-decisions`, `design-system`

**Focus:**
- Why architecture chosen
- Import rules and boundaries
- Change impact mapping
- Module placement rules

**Structure:**
```markdown
## Decision: [Name]
**Context:** [What problem we were solving]
**Decision:** [What we chose]
**Consequences:** [Trade-offs, constraints]
```

### Type 3: Process & Philosophy (Workflows, Principles)

**Examples:** `signal-vs-noise`, `claude-md-guidelines`

**Focus:**
- Decision frameworks (3-question filter)
- Writing guidelines (what to include/exclude)
- Quality criteria (when something is good enough)

**Structure:**
```markdown
## The [Framework/Filter/Process]

**Purpose:** [What it helps decide]

**Questions:**
1. Question 1?
2. Question 2?
3. Question 3?

**Examples:**
- ✅ Good example
- ❌ Bad example
```

### Type 4: Integration & Tools (APIs, Services)

**Examples:** `notion-integration`

**Focus:**
- API patterns (MCP tool calls)
- Configuration (database IDs, status values)
- Error handling (graceful fallbacks)
- Critical gotchas (case-sensitive values)

**Structure:**
```markdown
## Tool Pattern: [Name]

**Purpose:** [When to use]
**Critical:** [Gotcha that caused bugs]

**Example:**
```typescript
// Correct usage
```

**Common mistakes:**
- ❌ Wrong approach → ✅ Correct approach
```

---

## Anti-Patterns (Common Mistakes)

### ❌ Too Much Noise (Generic Content)

**Problem:** SKILL.md is 1,200 lines but 70% is generic explanations.

**Fix:**
1. Remove generic explanations Claude knows
2. Keep project-specific content even if longer
3. Quality matters more than line count

**Example:**
```markdown
❌ Before (noise - 300 lines):
## What is a Server Action?
Server Actions are functions that run on the server...
[300 words explaining React Server Components basics]

✅ After (signal - 50 lines):
## Server Action Pattern
Return type: { success: boolean, data?: T, error?: string }
**Why:** Type-safe error handling, no thrown exceptions
**We hit this:** Throwing errors in actions crashed Next.js middleware

[Project-specific examples with actual code]
```

**Key insight:** 600 lines of pure signal > 300 lines with 50% noise

### ❌ Generic Content (Not Project-Specific)

**Problem:** Skill explains React basics Claude already knows.

**Fix:** Only include project-specific decisions and critical mistakes.

**Self-check:** "Would Claude know this without the skill?"
- YES → Remove it (noise)
- NO → Keep it (signal)

### ❌ First-Person Description

**Problem:** `description: "I help you debug Supabase issues"`

**Fix:** `description: "Use when debugging Supabase RLS policies or client selection issues."`

**Rule:** Third-person, describes WHEN not HOW.

### ❌ Missing WHY

**Problem:** States rules without explaining rationale.

```markdown
❌ Without WHY:
## RLS Policy Rule
Never query same table in RLS policy.

✅ With WHY:
## RLS Policy Rule
Never query same table in RLS policy.
**Why:** Causes infinite recursion, crashes PostgreSQL with stack overflow.
**We hit this:** survey_links table RLS checking survey_links.active crashed prod.
```

### ❌ Nested References (Too Deep)

**Problem:** SKILL.md → guide.md → examples.md → details.md

**Fix:** Keep references one level deep. Make Tier 3 files self-contained.

```markdown
✅ Correct:
SKILL.md references:
  - @rls-policies.md (self-contained examples)
  - @client-selection.md (self-contained guide)

❌ Wrong:
SKILL.md references:
  - @guide.md which references @examples.md which references @details.md
```

### ❌ Windows Paths

**Problem:** Examples use `C:\Users\...` in cross-platform project.

**Fix:** Use Unix paths (`~/`, `/path/to/`) or relative paths.

### ❌ Time-Sensitive Information

**Problem:** "As of January 2025, Supabase version 2.5..."

**Fix:** "Check Supabase version in package.json"

### ❌ Generic Skill Names

**Problem:** `patterns`, `helper`, `utils`

**Fix:** Domain-specific: `supabase-patterns`, `code-patterns`, `design-system`

---

## Verification Checklist

Before finalizing skill, verify:

### Structure
- [ ] Directory created: `.claude/skills/skill-name/`
- [ ] SKILL.md exists with YAML frontmatter
- [ ] Tier 3 files (if needed) are self-contained
- [ ] No nested references (one level deep only)

### Metadata
- [ ] Name: lowercase, hyphens, max 64 chars
- [ ] Description: third-person, <1024 chars, describes WHEN
- [ ] No XML tags in description
- [ ] Domain-specific name (not generic)

### Content Quality (Priority: Signal > Brevity)
- [ ] Signal-focused (only project-specific) - MOST IMPORTANT
- [ ] No generic explanations Claude knows - CRITICAL
- [ ] WHY included for all decisions/rules - ESSENTIAL
- [ ] Anti-patterns documented (critical mistakes)
- [ ] Complete (includes all critical information)
- [ ] Scannable format (tables, bullets, headers)
- [ ] Line count: Aim ~500, accept more if quality demands it

### Integration
- [ ] Added to relevant agent `skills:` field (if applicable)
- [ ] Referenced in commands (if applicable)
- [ ] Tested: Claude can invoke it correctly

### Self-Check Questions (Quality Filter)
- [ ] Is this obvious to Claude without the skill? → If YES, remove (noise)
- [ ] Is this project-specific? → If NO, remove (generic)
- [ ] Would this help future me with amnesia? → If NO, remove (not useful)
- [ ] Does every section provide actionable information? → If NO, refactor
- [ ] Did I cut content to meet line count? → If YES, restore it (quality > count)
- [ ] Is every line signal (no filler)? → If NO, remove filler (not to reduce length)

---

## Quick Start Template

**Fastest way to create a skill:**

```bash
# 1. Create directory
mkdir -p .claude/skills/my-skill-name

# 2. Copy template
cp .claude/skills/skill-creator/skill-template.md \
   .claude/skills/my-skill-name/SKILL.md

# 3. Edit SKILL.md
# - Update YAML frontmatter (name, description)
# - Fill in sections with project-specific content
# - Remove unused sections
# - Keep <500 lines

# 4. Verify line count
wc -l .claude/skills/my-skill-name/SKILL.md

# 5. Test invocation
# Ask Claude: "Use @my-skill-name to help with..."
```

---

## Examples from This Project

### High-Quality Skills (Follow These)

**supabase-patterns (132 lines)**
- ✅ Project-specific (RLS infinite recursion bug)
- ✅ WHY included (explains why patterns exist)
- ✅ Critical mistakes documented
- ✅ Quick reference tables (server vs browser client)
- ✅ Concise (<500 lines)

**signal-vs-noise (112 lines)**
- ✅ Decision framework (3 questions)
- ✅ Examples show good vs bad
- ✅ Actionable (helps decide what to include)
- ✅ Philosophy skill (no code, pure decision-making)

**claude-md-guidelines (127 lines)**
- ✅ Writing guidelines (what to include/exclude)
- ✅ Self-check questions
- ✅ Examples of good vs bad docs
- ✅ Meta-documentation (how to document)

### Skills to Reference

- **supabase-patterns** - Technical pattern skill (database, RLS)
- **code-patterns** - Application pattern skill (React, TypeScript)
- **architecture-decisions** - Architectural skill (structure, rules)
- **notion-integration** - Integration skill (API, MCP tools)
- **design-system** - Design skill (UI, accessibility)
- **signal-vs-noise** - Philosophy skill (decision framework)
- **claude-md-guidelines** - Process skill (documentation guidelines)

---

## Resources

### Internal (Tier 3 Resources)
- `@signal-vs-noise-reference.md` - Signal vs Noise philosophy (3-question filter, what to include/exclude)
- `@skills-guide.md` - Complete official guide to creating skills (moved from .claude/)
- `@skill-template.md` - Copy-paste ready templates for all skill types
- **Existing skills** - `.claude/skills/` directory for working examples

### External
- **Anthropic Best Practices** - https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- **Skill Creation Guide** - https://support.claude.com/en/articles/12512198
- **Agent Skills Spec** - agentskills.io

---

## Key Principles

**Concise is key** - Context window is a public good. Every token counts.

**Signal vs Noise** - Only project-specific content. Skip what Claude knows.

**Third-person** - Describe WHEN to use, not HOW you help.

**WHY included** - Always explain rationale for decisions and patterns.

**One level deep** - SKILL.md → Tier 3 files (self-contained). No nesting.

**Scannable** - Use tables, bullets, headers. Quick lookup, not essays.

**Anti-patterns** - Document critical mistakes. "Here's what we tried that failed."

---

**Key Lesson:** The best skills are 150-300 lines, highly specific to the project, and document the weird parts and critical mistakes. If Claude already knows it, don't include it.
