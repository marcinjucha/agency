---
name: skill-maintenance
description: Use when skills need refinement based on development feedback. Covers updating skills when patterns prove incomplete, adding anti-patterns from real bugs, and maintaining CLAUDE.md feature documentation. Essential for keeping skills accurate and current.
---

# Skill Maintenance - Refining Skills & CLAUDE.md

## Purpose

Maintain skill quality: update skills when development reveals gaps, add anti-patterns from real bugs, update CLAUDE.md feature docs. Keep skills accurate based on real-world usage.

## When to Use

- Development reveals skill pattern incomplete (need update)
- Real bug found (add to anti-patterns)
- Feature-specific CLAUDE.md needs update
- Skill pattern proved wrong (need correction)

## Critical Pattern: Learning from Development

**When to update skill:**

```yaml
Scenario: Development hits bug not covered in skill

Example:
  Skill: component-patterns
  Developer: Used register for checkbox
  Result: Only last value stored (BUG!)
  Skill status: Missing this anti-pattern

Action: Update skill
  ✅ Add anti-pattern section
  ✅ Explain WHY register fails (single value)
  ✅ Show Controller solution
  ✅ Mark as "Real bug from Phase X"

Updated skill:
  ## Anti-Patterns
  ### ❌ Using register for Checkbox Arrays
  **Real bug from Phase 2:** register stored only last value
  **Why:** register = single value, Controller = array handling
  **Fix:** [Controller pattern]
```

**Why critical:** Skills improve from real usage, not theory.

## Skill Update Patterns

### Pattern 1: Add Anti-Pattern from Real Bug

**Trigger:** Bug found during development

```markdown
# Skill update steps:

1. Identify which skill covers this domain
   Bug: Checkbox arrays broken
   Skill: component-patterns

2. Add anti-pattern section
   ### ❌ Using register for Checkbox Arrays
   **Real bug from Phase 2:** [description]
   **Why it failed:** [root cause]
   **Fix:** [correct pattern]

3. Update description if major pattern
   description: "...Critical patterns - Controller for checkbox arrays..."

4. Keep skill concise (remove less critical content if needed)
```

### Pattern 2: Clarify Incomplete Pattern

**Trigger:** Pattern worked but needed clarification

```markdown
# Before (vague):
## Pattern: Use correct client

Use browser client in CMS, server client in Website.

# After (clarified from development):
## Pattern: Browser vs Server Client Decision

**Context matters:**
- CMS app + TanStack Query → Browser client (NO await)
- Website app + Server Component → Server client (AWAIT required)

**Why context matters:** [explanation from real issue]

**Decision tree:** [added based on confusion]
```

### Pattern 3: Update CLAUDE.md (Feature Docs)

**Location:** `apps/{app}/features/{feature}/CLAUDE.md`

**Pattern: Feature-specific documentation**

```markdown
# features/survey/CLAUDE.md

## Overview
Survey feature for client data collection.

## Components
- SurveyForm - Main form with dynamic questions
- QuestionField - Renders question based on type

## Critical Patterns (from skills)
**Controller for checkboxes:** Use Controller, NOT register
  Why: register stores only last value (real bug from Phase 2)

**Validation:** Dynamic Zod schema from questions array
  See: foundation-patterns skill

## Known Issues
- Empty questions array causes crash (P1 - needs fix)
- Long survey titles overflow on mobile (P2 - acceptable)

## Related Skills
- component-patterns - Controller for arrays
- foundation-patterns - Dynamic Zod schemas
```

**When to update:**
- Feature implementation complete
- Real bug found (add to Known Issues)
- Pattern clarification needed
- New developer onboarding to feature

## Quick Reference

**Skill maintenance checklist:**

```yaml
- [ ] Bug found → Add to anti-patterns section
- [ ] Pattern unclear → Add decision tree/examples
- [ ] Major pattern → Update skill description
- [ ] Keep concise (remove less critical if adding)
- [ ] Mark real bugs: "Real bug from Phase X"
- [ ] Explain WHY (root cause, not just HOW to fix)
```

**CLAUDE.md template:**

```markdown
# features/{feature}/CLAUDE.md

## Overview
[1-2 sentences: What this feature does]

## Architecture
[Key decisions, ADR references]

## Critical Patterns
[Link to relevant skills, explain WHY important]

## Known Issues
[P0/P1/P2 bugs, with status]

## Related Skills
- skill-name - [What it provides]
```

## Real Project Examples

**Phase 2 Skill Updates:**

```yaml
Scenario 1: Controller bug
  Before: component-patterns had no checkbox guidance
  Bug: register used for checkboxes → data loss
  After: Added "Controller for Checkbox Arrays" pattern
  Result: Skill now prevents this bug

Scenario 2: TanStack Query confusion
  Before: No clear rule about CMS vs Website
  Confusion: Developer used TanStack Query in Website
  After: Added "TanStack Query CMS-only" rule with WHY
  Result: Clear project-specific convention

Scenario 3: RLS infinite recursion
  Before: rls-policies had basic RLS info
  Bug: Subquery in policy crashed PostgreSQL
  After: Made infinite recursion THE critical pattern
  Result: 355 lines dedicated to this bug (worth it!)
```

## Anti-Patterns

### ❌ Not Updating Skills After Bugs

**Problem:** Bug found but skill not updated

```yaml
# ❌ WRONG
Bug: Checkbox register issue
Fix: Changed to Controller
Skill: Not updated (bug will happen again!)

# ✅ CORRECT
Bug: Checkbox register issue
Fix: Changed to Controller
Skill: Updated with anti-pattern
Result: Future development avoids this bug
```

**Why wrong:** Skills don't learn from mistakes, bugs repeat.

### ❌ Over-Detailed CLAUDE.md

**Problem:** CLAUDE.md becomes mini-skill

```markdown
# ❌ WRONG: Duplicating skill content
## Patterns
[500 lines explaining React Hook Form, Zod, etc]

# ✅ CORRECT: Reference skills
## Critical Patterns
**Controller for arrays:** See component-patterns skill
**Why important:** We hit this bug in Phase 2, data loss risk
```

**Why wrong:** CLAUDE.md should reference skills, not duplicate them.

### ❌ Ignoring Development Feedback

**Problem:** Pattern proved incomplete but skill not updated

```yaml
# ❌ WRONG
Developer: "Skill said use browser client, but needed server client"
Response: "Just use server client then"
[Skill not updated]

# ✅ CORRECT
Developer: "Skill said use browser client, but needed server client"
Response: "Let me update skill with decision tree"
[Skill updated with context-based decision]
```

**Why wrong:** Next developer hits same confusion.

---

**Key Lesson:** Skills improve from real development. Add anti-patterns from bugs, clarify from confusion, keep accurate.
