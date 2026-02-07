---
name: plan-analysis
description: Use when analyzing implementation plans to identify dependencies, parallelization opportunities, and execution order. Extracts critical paths, detects blockers, and creates optimized task sequences. Essential for efficient multi-agent orchestration.
---

# Plan Analysis - Dependencies & Parallelization

## Purpose

Analyze implementation plans to identify dependencies between tasks, find parallelization opportunities, and create optimal execution sequences. Prevents sequential execution when parallel is possible.

**Note:** Consider deprecating this skill - Claude already understands dependency analysis and parallelization. Most content is AI-known (task graphs, critical paths). Only project-specific pattern: foundation files (types + validation parallel, queries sequential).

## When to Use

- Plan ready to implement (need execution strategy)
- Multiple tasks (need dependency analysis)
- Want parallel execution (optimize time)
- Unclear execution order

## Critical Patterns

### Dependency Detection

**Pattern: Independent vs Dependent Tasks**

```yaml
# Analysis:
Group A (parallel): types.ts, validation.ts (no dependencies)
Group B (sequential): queries.ts (after types.ts)
```

**Why matters:** Parallel execution optimizes time

### Parallelization Opportunities

**Project pattern: Foundation files**

Parallel: types.ts, validation.ts
Sequential: queries.ts (needs types)
Parallel: components, actions (after queries)

### Critical Path Identification

**Pattern:** Longest dependency chain (types → queries → components → routes)

**Why identify:** Focus on critical path tasks first

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

**Phase 2 Survey:** Parallelized foundation (types + validation) and data layer (queries + actions), then sequential UI and routes

**Optimization:** 4 parallel tasks instead of 7 sequential

