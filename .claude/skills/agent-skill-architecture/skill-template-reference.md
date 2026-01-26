# Skill Template - Copy-Paste Ready

Use this template to quickly create new skills. Replace placeholders with your content.

---

## Basic Template (Minimal)

```yaml
---
name: my-skill-name
description: Use when [specific trigger]. Provides [what it provides - be specific about project context].
---

# Skill Name - One-Line Purpose

## Purpose
[1-2 sentences: What problem does this solve? Why does this skill exist?]

## When to Use
- Trigger 1 (be specific)
- Trigger 2
- Trigger 3

## Core Pattern (or Key Principle)

**What:** [Brief explanation]
**Why:** [Real problem we hit]
**Example:** [Minimal code if needed]

## Quick Reference
- Key fact 1
- Key fact 2
- Key fact 3

## Anti-Patterns (Critical Mistakes)

### ❌ Common Mistake Name
**Problem:** [What broke]
**Why it failed:** [Root cause]
**Fix:** [What we do now]
```

---

## Full Template (Comprehensive)

```yaml
---
name: domain-specific-name
description: Use when [trigger 1], [trigger 2], or [trigger 3]. Provides [specific domain knowledge] for [project context].
---

# Skill Name - One-Line Purpose

## Purpose

[2-3 sentences explaining:]
- What problem this skill solves
- Why this knowledge is needed
- What makes it project-specific (not generic)

## When to Use

**Automatic triggers (agent skills: field):**
- Agent X loads this when doing Y
- Agent Z references patterns during phase N

**Manual triggers (user invocation):**
- "Use @skill-name to..."
- When working on [specific feature/area]
- Before making [type of decision]

## Core Principles (or Patterns)

### Principle 1: Name
**What:** [Clear explanation of the principle]
**Why:** [Real problem that led to this principle]
**Context:** [When/where this applies]

**Example:**
```[language]
// Good example showing the principle
```

### Principle 2: Name
[Continue with 2-5 core principles]

## Quick Reference

**[Category 1]:**
- Fact 1
- Fact 2
- Fact 3

**[Category 2]:**
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value    | Value    | Value    |

**[Category 3: Commands/Scripts]:**
```bash
# Quick command
command --flag value
```

## Pattern: [Common Task]

**When:** [Specific situation]
**Steps:**
1. Step 1
2. Step 2
3. Step 3

**Output:** [What you get]

## Anti-Patterns (Critical Mistakes We Made)

### ❌ Mistake 1: Descriptive Name
**Problem:** [What broke - be specific]
**Why it failed:** [Root cause we discovered]
**When we hit this:** [Specific incident if memorable]
**Fix:** [What we do now]

**Example:**
```[language]
// ❌ Wrong approach (what we tried)
badCode()

// ✅ Correct approach (what works)
goodCode()
```

### ❌ Mistake 2: Descriptive Name
[Continue with 2-5 critical mistakes]

## Decision Framework (optional - for philosophy/process skills)

**Use this when deciding [specific decision type]:**

1. **Question 1?**
   - ✅ YES → [Outcome]
   - ❌ NO → [Alternative]

2. **Question 2?**
   - ✅ YES → [Outcome]
   - ❌ NO → [Alternative]

3. **Question 3?**
   - ✅ YES → [Outcome]
   - ❌ NO → [Alternative]

**Examples:**
- ✅ Good: [Specific example with reasoning]
- ❌ Bad: [Counter-example with why it's wrong]

## References (Tier 3 Files)

- `@detailed-examples.md` - [What this contains]
- `@advanced-patterns.md` - [What this contains]
- `@troubleshooting.md` - [What this contains]

**Note:** Keep references one level deep. Tier 3 files should be self-contained.

---

**Key Lesson:** [One sentence summarizing the most important insight from this skill]
```

---

## Section Templates

### For Technical Pattern Skills

```markdown
## Pattern: [Pattern Name]

**Rule:** [What to do/avoid - imperative]
**Why:** [Real problem this solves]
**When:** [Situations where this applies]

**Example:**
```[language]
// Correct usage showing the pattern
```

**Common mistakes:**
- ❌ [Wrong approach] → ✅ [Correct approach]
```

### For Architectural Decision Skills

```markdown
## Decision: [Decision Name]

**Context:** [Problem we were solving]
**Decision:** [What we chose]
**Alternatives considered:**
- Alternative 1 (rejected because...)
- Alternative 2 (rejected because...)

**Consequences:**
- ✅ Benefit 1
- ✅ Benefit 2
- ⚠️ Trade-off 1
- ⚠️ Trade-off 2

**Rules enforced:**
1. Rule 1
2. Rule 2
```

### For Process/Philosophy Skills

```markdown
## The [Framework/Filter/Process]

**Purpose:** [What decisions this helps make]

**The [Number]-Question Filter:**
1. Question 1?
2. Question 2?
3. Question 3?

**Scoring:**
- 3/3 YES → [Strong action]
- 2/3 YES → [Consider action]
- 1/3 YES → [Don't do action]

**Examples:**
- ✅ 3/3 YES: [Example] because [reasons]
- ❌ 1/3 YES: [Example] because [reasons]
```

### For Integration/Tool Skills

```markdown
## Tool Pattern: [Tool/API Name]

**Purpose:** [When to use this tool]
**Critical:** [Gotcha that caused us bugs]

**Configuration:**
```[format]
# Required config
key: value
```

**Usage Pattern:**
```[language]
// Standard pattern we use
const result = await tool.call({
  param1: value1,
  param2: value2  // IMPORTANT: [critical note]
})
```

**Error Handling:**
```[language]
// Graceful fallback pattern
try {
  await tool.call()
} catch (error) {
  // Fallback strategy
}
```

**Common Issues:**
- ❌ Issue 1: [What breaks] → ✅ Fix: [How to solve]
- ❌ Issue 2: [What breaks] → ✅ Fix: [How to solve]
```

---

## Checklist Before Finalizing

Copy this checklist and verify before creating the skill:

```markdown
### Structure
- [ ] Directory: `.claude/skills/skill-name/`
- [ ] SKILL.md with YAML frontmatter
- [ ] Tier 3 files self-contained (if needed)
- [ ] No nested references (one level only)

### Metadata
- [ ] name: lowercase-with-hyphens (max 64 chars)
- [ ] description: third-person, <1024 chars
- [ ] Description describes WHEN not HOW
- [ ] Domain-specific name (not generic)

### Content
- [ ] <500 lines (ideally 150-300)
- [ ] Only project-specific content
- [ ] No generic explanations
- [ ] WHY included for decisions
- [ ] Anti-patterns documented
- [ ] Scannable format (tables/bullets)

### Quality
- [ ] Would help future me with amnesia?
- [ ] Is this obvious to Claude? (if yes, remove)
- [ ] Is this project-specific? (if no, remove)
- [ ] Every section actionable?

### Integration
- [ ] Added to agent skills: field (if needed)
- [ ] Referenced in commands (if needed)
- [ ] Tested invocation
```

---

## Example: Converting Documentation to Skill

**Source:** `docs/SUPABASE_PATTERNS.md` (800 lines)

**Step 1: Extract signal**
```yaml
Signal (keep):
  - RLS infinite recursion bug (line 45-78)
  - Server vs Browser client table (line 120-145)
  - Split Query Pattern (line 200-230)
  - Type regeneration command (line 650)

Noise (remove):
  - "What is Supabase?" (line 1-30)
  - "How to install Supabase" (line 80-110)
  - Basic CRUD examples (line 300-500)
  - Generic RLS explanation (line 550-620)
```

**Step 2: Create SKILL.md (180 lines)**
```markdown
---
name: supabase-patterns
description: Use when working with Supabase RLS policies, client selection, or database migrations. Documents critical bugs and project-specific patterns.
---

# Supabase Patterns

## Purpose
Documents Legal-Mind specific Supabase patterns and critical mistakes.

## RLS Policy Rule (CRITICAL)

**Rule:** NEVER query the same table in its RLS policy.
**Why:** Causes infinite recursion, PostgreSQL stack overflow crash.
**We hit this:** survey_links RLS checking survey_links.active → prod crash.

**Fix: Split Query Pattern**
[Minimal example]

## Server vs Browser Client

[Table showing when to use which]

## Quick Reference
```bash
# Type regeneration
npm run db:types
```
```

**Step 3: Create Tier 3 (optional)**
```markdown
# rls-policies.md

[Full RLS policy examples with detailed code]
```

**Result:**
- Before: 800 lines (60% noise)
- After: 180 lines SKILL.md + 150 lines Tier 3 (100% signal)
- Reduction: 60% token savings

---

## Tips

**Start minimal** - Create basic template, expand as patterns emerge.

**Focus on WHY** - Every rule should explain the problem it solves.

**Document mistakes** - "Critical Mistakes We Made" is the most valuable section.

**Use tables** - Quick reference tables are highly scannable.

**Keep it under 500 lines** - If over 500, split to Tier 3 files.

**Test with "Would Claude know this?"** - If yes, it's noise.

---

**Quick Copy-Paste:**

```yaml
---
name:
description:
---

#

## Purpose

## When to Use

## Core Pattern

## Quick Reference

## Anti-Patterns
```
