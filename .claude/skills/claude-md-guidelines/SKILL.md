---
name: claude-md-guidelines
description: Guidelines for writing CLAUDE.md files. Use when creating or updating feature documentation in CLAUDE.md files.
---

# CLAUDE.md Writing Guidelines

**Purpose:** Create focused, actionable documentation that Claude actually follows.

**Priority:** Content Quality > Line Count. Project-specific weird stuff + WHY > brevity.

---

## Core Principle

**Every section must answer:** "Is this something Claude already knows?"
- YES → Cut it
- NO → Keep it (with WHY)

---

## What to INCLUDE

### Project-Specific Oddities
```markdown
## The 15-Second Upload Window
RouteWithHistoryService filters upload history with 15-second window.
**Why**: Server takes up to 15s to process. Without window, UI shows
"not captured" even when upload succeeded. Users complained.
```

### Real Problems You Hit
```markdown
## Camera Lifecycle (Memory Leak Fix)
Camera owned by MappingCaptureFeature, NOT MappingFlowStore.
**Why**: Previous approach leaked 200MB when navigating back.
Happened in production, caused app kills on iPhone 8.
```

### Critical Mistakes Made
```markdown
### Putting Models in App Layer First
**Problem**: Had to move 8 files when second feature needed them
**Solution**: If model has potential for reuse → Model module immediately
```

---

## What to EXCLUDE

### Generic Patterns (Claude Knows)
```markdown
❌ DON'T INCLUDE:

## TCA Reducer Pattern
var body: some ReducerOf<Self> { ... }

## Repository Layer
Repositories handle data access...

## Clean Architecture Layers
Presentation → Business → Data → Models
```

---

## Writing Style

**Voice:** Direct, concise. Notes to future you with amnesia.

```markdown
GOOD:
Camera owned by CaptureFeature. Previous approach leaked 200MB.

BAD:
The camera view model is owned and managed by the MappingCaptureFeature
class. This is an important architectural decision that was made after...
```

**Format:** Bullets + Bold WHY

```markdown
GOOD:
## Sequential Capture
After upload → move to next module automatically.
**Why**: Users complained about repetitive navigation (5 taps per module).
```

---

## Template

```markdown
# [Feature] - Quick Orientation

[1-2 sentence description]

## The Weird Parts

### [Weird Thing #1]
**Why**: [Real problem we hit]
[Minimal code example if needed]

## Critical Mistakes We Made

### [Thing We Tried That Failed]
**Problem**: [What broke]
**Fix**: [What we do now]

## Quick Reference
- [5-10 critical facts in bullet form]
```

---

## Self-Check

Before committing CLAUDE.md:

1. **Obviousness**: Would Claude know this already? → Cut
2. **Specificity**: Is this project-specific? → Keep
3. **WHY included**: Do I explain WHY? → Required
4. **Actionability**: Would this help me in 6 months? → Keep

---

**Remember:** Good CLAUDE.md = Notes to future you with amnesia, not documentation.
