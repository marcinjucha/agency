---
name: plan-analysis
description: Use when analyzing implementation plans to identify dependencies, parallelization opportunities, and execution order. Extracts critical paths, detects blockers, and creates optimized task sequences. Essential for efficient multi-agent orchestration.
---

# Plan Analysis - Dependencies & Parallelization

## Purpose

Analyze implementation plans to identify dependencies between tasks, find parallelization opportunities, and create optimal execution sequences. Prevents sequential execution when parallel is possible.

## When to Use

- Plan ready to implement (need execution strategy)
- Multiple tasks (need dependency analysis)
- Want parallel execution (optimize time)
- Unclear execution order

## Critical Patterns

### Dependency Detection

**Pattern: Independent vs Dependent Tasks**

```yaml
# Independent (parallel execution):
Task 1: Create types.ts → No dependencies
Task 2: Create queries.ts → Depends on types.ts
Task 3: Create validation.ts → No dependencies

# Analysis:
Group A (parallel): types.ts, validation.ts
Group B (sequential): queries.ts (after types.ts)

# Execution:
Step 1: Create types.ts + validation.ts (PARALLEL)
Step 2: Create queries.ts (SEQUENTIAL, after Step 1)
```

**Why matters:** Parallel = 50% time saved

### Parallelization Opportunities

**Project pattern: Foundation files**

```yaml
# Example: Survey feature foundation

Parallel Group 1 (no dependencies):
  - types.ts (domain types)
  - validation.ts (Zod schemas)

Sequential after Group 1:
  - queries.ts (needs types.ts imports)

Parallel Group 2 (after queries):
  - components (need types + queries)
  - actions (need types + validation)
```

**Real Phase 2:** Foundation files created sequentially → wasted time. Could parallelize types + validation.

### Critical Path Identification

**Pattern: Longest dependency chain**

```yaml
Feature: Survey Submission

Task graph:
  types.ts (5min)
    ↓
  queries.ts (10min) → CRITICAL PATH
    ↓
  components (15min)
    ↓
  routes (5min)

Parallel branch:
  validation.ts (5min)
    ↓
  actions.ts (10min)

Critical path: types → queries → components → routes = 35min
Parallel: types + validation → queries + actions → components → routes = 35min
  (validation + actions parallel to critical path, no time added)
```

**Why identify:** Focus on critical path tasks first (biggest impact)

## Quick Reference

**Dependency types:**

| Type | Example | Parallelizable? |
|------|---------|-----------------|
| File import | queries.ts imports types.ts | NO |
| Feature isolation | types.ts for feature A, types.ts for feature B | YES |
| Sequential logic | create → test → deploy | NO |
| Independent concerns | types + validation (no imports) | YES |

**Execution patterns:**

```yaml
# Pattern 1: Foundation (types → queries → components)
Parallel: types.ts, validation.ts
Sequential: queries.ts (after types)
Parallel: components, actions (after queries)

# Pattern 2: Full feature (foundation → UI → routes)
Parallel Group 1: types, validation
Parallel Group 2: queries, actions (after Group 1)
Parallel Group 3: components (after Group 2)
Sequential: routes (import components, after Group 3)

# Pattern 3: Database + Code (independent)
Parallel: database migration, foundation files
Sequential: code using new schema (after migration applied)
```

**Commands:**

```bash
# Analyze plan file
cat ~/.claude/plans/feature-name.md

# Identify dependencies (grep for imports)
grep "import.*from" plan-file.md

# Check parallelization (look for "can be done in parallel")
grep -i "parallel" plan-file.md
```

## Real Project Pattern

**Phase 2 Survey Implementation:**

```yaml
Plan analysis identified:

Parallel Group 1 (foundation):
  - types.ts (Question type)
  - validation.ts (generateSurveySchema)
  Result: Both created simultaneously

Parallel Group 2 (data layer):
  - queries.ts (getSurveyByToken)
  - actions.ts (submitSurveyResponse)
  Result: Both created simultaneously

Sequential (UI):
  - SurveyForm component (needs queries + actions)
  - QuestionField component (needs types)

Sequential (routes):
  - page.tsx (imports SurveyForm)

Optimization: 4 parallel tasks instead of 7 sequential
Time saved: ~60% (estimated)
```

## Anti-Patterns

### ❌ Sequential Execution of Independent Tasks

**Problem:** Creating files one-by-one when could parallelize

```yaml
# ❌ WRONG: Sequential
1. Create types.ts (wait)
2. Create validation.ts (wait)
3. Create queries.ts (wait)

# ✅ CORRECT: Parallel groups
Group 1 (parallel): types.ts, validation.ts
Group 2 (sequential): queries.ts (after Group 1)
```

**Why wrong:** Wasted time, no technical reason for sequential

### ❌ Missing Critical Path

**Problem:** Working on non-critical tasks first

```yaml
# ❌ WRONG: Start with validation
1. validation.ts (5min)
2. types.ts (5min)
3. queries.ts (10min) ← CRITICAL, should be prioritized
4. components (15min) ← CRITICAL

# ✅ CORRECT: Critical path first
1. types.ts (5min) ← Critical path start
2. queries.ts (10min) ← Critical
3. components (15min) ← Critical
Parallel: validation.ts, actions.ts (while doing above)
```

**Why wrong:** Critical path delayed = entire feature delayed

---

**Key Lesson:** Identify dependencies, parallelize independent tasks, focus on critical path.
