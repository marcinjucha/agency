# Skills Creation Guide

Complete guide for creating effective Agent Skills in Claude Code.

## TL;DR - Quick Start

**Skill Template:**
```yaml
---
name: skill-name           # max 64 chars, lowercase + numbers + hyphens
description: When to use   # max 1024 chars, third person, no XML tags
---
# Skill Content (markdown body, <500 lines)
```

**Key Principle:** Quality > Line Count. Signal-focused content matters more than brevity - Claude already knows generic stuff, so keep only project-specific content even if longer.

**This Project:**
- **Skills** → Domain knowledge (TCA patterns, Clean Architecture rules)
- **Commands** → Workflow orchestration (multi-phase processes)
- **Agents** → Specialized subagents (in `.claude/agents/`)

---

## What Skills Are

**Agent Skills** = Organized directories containing `SKILL.md` + instructions, scripts, and resources.

### Progressive Disclosure Architecture (3 Tiers)

| Tier | File | When Loaded | Quality Guideline |
|------|------|-------------|-------------------|
| 1 | SKILL.md metadata (YAML) | Always in context | ~100 tokens |
| 2 | SKILL.md body (Markdown) | When skill triggered | Aim ~500 lines (quality > count) |
| 3+ | Bundled files | As-needed by Claude | As needed for completeness |

**How it works:**
1. Claude sees all skill metadata (Tier 1) → knows what skills exist
2. User says "use this skill" → Claude loads SKILL.md body (Tier 2)
3. Claude requests additional files → Loaded on-demand (Tier 3)

**Example from this project:**
```
.claude/skills/tca-patterns/
├── SKILL.md                      # Tier 1 + 2
├── publisher-patterns.md         # Tier 3 (loaded on-demand)
├── reducer-composition.md        # Tier 3
└── testing-patterns.md           # Tier 3
```

---

## SKILL.md Structure

### Required Metadata

```yaml
---
name: skill-name
description: Third-person description of when to use this skill
---
```

**Name Rules:**
- Max 64 characters
- Lowercase letters, numbers, hyphens only
- **Recommended:** Gerund form (`processing-pdfs`, `analyzing-spreadsheets`)
- **Acceptable:** Noun/verb form (`pdf-processing`, `process-pdfs`)
- **Avoid:** `helper`, `utils`, `tools`, reserved words (`anthropic`, `claude`)

**Description Rules:**
- Max 1,024 characters
- Third person ("Processes PDFs" NOT "I can help you")
- No XML tags
- Describe WHEN to use, not HOW to use
- Should answer: "When does Claude invoke this skill?"

**Example:**
```yaml
---
name: tca-patterns
description: TCA state management patterns specific to Digital Shelf iOS. Use when implementing TCA features, designing state, handling actions, working with publishers, or integrating with SwiftUI.
---
```

### Body Content Guidelines

**Quality > Line Count:** Aim for ~500 lines, but prioritize completeness over brevity. Better to have 600 lines of pure signal than 300 lines missing critical information. Move detailed content to Tier 3 files only if modular and self-contained.

**Structure:**
1. **Purpose** - What problem does this solve?
2. **When to Use** - Specific triggers
3. **Core Concepts** - Key principles (concise)
4. **Patterns** - Common solutions with examples
5. **Anti-patterns** - What to avoid
6. **References** - Links to Tier 3 files (one level deep)

**Example from signal-vs-noise skill:**
```markdown
# Signal vs Noise - 3-Question Filter

## Purpose
Distinguish essential information (signal) from clutter (noise).

## When to Use
- Creating documentation
- Writing tests
- Adding comments
- Deciding what to include

## The Filter
1. Is this obvious to someone familiar with the domain?
2. Will this be outdated quickly?
3. Does this help make decisions?

## Patterns
[Include concise examples]

## References
- @examples/signal-vs-noise-examples.md
```

---

## Best Practices (Quality-First Philosophy)

### 1. Signal-Focused is Key
Content quality matters more than line count. Every line should provide project-specific value.

❌ **Don't:** Explain generic concepts Claude already knows
```markdown
## What is a Repository?
A repository is a design pattern that encapsulates data access logic...
[500 words explaining repositories]
```

✅ **Do:** Focus on project-specific patterns
```markdown
## Repository Rules
- NEVER depend on another repository (creates cycles)
- Use Service to combine 3+ repositories
- See @examples/repository-cycle.md
```

### 2. Degrees of Freedom

Different tasks need different levels of specificity:

| Freedom | Content Type | When to Use |
|---------|-------------|-------------|
| **High** | Text instructions | Multiple valid approaches, context-dependent |
| **Medium** | Pseudocode, parameters | Preferred pattern exists, some variation OK |
| **Low** | Exact scripts | Fragile operations, consistency critical |

**Example - High Freedom:**
```markdown
## Naming Conventions
Choose descriptive names that reveal intent. Feature files should end with `Feature.swift`.
```

**Example - Low Freedom:**
```markdown
## Pre-commit Hook Installation
Run exactly:
```bash
pip3 install pre-commit
pre-commit install
```
```

### 3. Third-Person Descriptions

❌ **Don't:** "I can help you debug TCA issues"
✅ **Do:** "Debugs TCA state management issues"

### 4. No Time-Sensitive Information

❌ **Don't:** "As of January 2025, TCA version 1.15..."
✅ **Do:** "Check TCA version in Package.swift"

### 5. Consistent Terminology

Pick ONE term per concept. Don't mix: "repository" / "repo" / "data layer".

### 6. One Level Deep References

✅ **SKILL.md** → references `examples/pattern.md`
✅ **examples/pattern.md** → self-contained

❌ **SKILL.md** → `guide.md` → `examples.md` → `details.md` (too deep)

---

## Patterns

### Pattern 1: High-Level Guide with References

**Structure:** SKILL.md contains principles, references contain examples.

```markdown
<!-- SKILL.md -->
## Testing Strategy
- **Presentation (TCA):** Mock ALL dependencies
- **Business (UseCases):** Mock ONLY external deps

See @examples/tca-test-example.md and @examples/usecase-test-example.md
```

**When to use:** Complex topics with many examples (testing, architecture)

### Pattern 2: Domain-Specific Organization

Group related skills by domain, not by type.

✅ **Good:**
```
.claude/skills/
├── tca-patterns/          # TCA domain
├── clean-architecture/    # Architecture domain
└── data-layer/            # Persistence domain
```

❌ **Bad:**
```
.claude/skills/
├── patterns/              # Too generic
├── rules/
└── examples/
```

### Pattern 3: Conditional Details

Use conditional text for project-specific situations:

```markdown
## Service vs Use Case

**Service:** Combines 3+ repositories (prevents cycles)
**Use Case:** General business logic orchestration

**When to create a Service:**
- RouteWithHistoryService - combines route + history + local aisles (5 repos)
- HomeModeService - combines mode config + routes + mapping (3 repos)
```

### Pattern 4: Workflows with Checklists

For multi-step processes:

```markdown
## Feature Implementation Workflow

### Phase 1: Models
- [ ] Create domain model in `Models/`
- [ ] Add `.sample()` factory in `TestSamples+Models.swift`

### Phase 2: Repository
- [ ] Protocol in `Repositories/`
- [ ] Implementation with `@Dependency`
- [ ] Add mock in `DigitalShelfTests/Mocks/`

[Continue with clear steps]
```

### Pattern 5: Examples Pattern

Format: Problem → Why it failed → Fix

```markdown
## Critical Mistakes We Made

### ❌ TaskGroup + @Dependency (Crash)

**Problem:** Accessing `@Dependency` inside `withThrowingTaskGroup` crashes.

**Why it failed:** TaskGroup captures context, @Dependency not thread-safe.

**Fix:** Capture dependency before TaskGroup:
```swift
let dep = self.dependency
withThrowingTaskGroup { try await dep.fetch() }
```
```

---

## Anti-Patterns

### ❌ Too Much Noise (Generic Content)

**Problem:** SKILL.md is 2,000 lines but 70% is generic explanations.
**Fix:** Remove generic content Claude knows. Keep project-specific content complete, even if longer. 600 lines of pure signal > 300 lines with 50% noise.

### ❌ Windows Paths in Examples

**Problem:** `C:\Users\...` paths in cross-platform project.
**Fix:** Use Unix paths or `~/` notation.

### ❌ Too Many Options

**Problem:** "You can use approach A, B, C, D, or E..."
**Fix:** Show the recommended approach. Mention alternatives only if critical.

### ❌ Deeply Nested References

**Problem:** SKILL.md → guide.md → examples.md → details.md
**Fix:** Keep references one level deep. Make Tier 3 files self-contained.

### ❌ Generic Skill Names

**Problem:** `helper`, `utils`, `patterns`
**Fix:** Specific names: `tca-patterns`, `clean-architecture`, `data-layer`

### ❌ First-Person Descriptions

**Problem:** "I help you debug TCA issues"
**Fix:** "Debugs TCA state management issues" (third person)

---

## Project-Specific: Skills vs Commands vs Agents

This project uses **three types** of executable units:

### Skills (`.claude/skills/`)

**What:** Domain knowledge and patterns
**When:** Need to reference project-specific rules
**Examples:**
- `tca-patterns` - TCA state management patterns
- `clean-architecture` - Module placement, Service vs UseCase
- `signal-vs-noise` - Information filtering philosophy
- `localization` - L10n naming conventions

**Structure:**
```yaml
---
name: domain-patterns
description: When to use this domain knowledge
---
# Pattern descriptions, examples, anti-patterns
```

### Commands (`.claude/commands/`)

**What:** Multi-phase workflow orchestration
**When:** Need to execute complex processes with multiple steps
**Examples:**
- `ios-debug.md` - Systematic bug resolution (5 phases)
- `ios-pre-merge-check.md` - Pre-merge validation (5 phases)
- `ios-feature-lite.md` - Fast feature development (5 phases)

**Structure:**
```markdown
# Command Name

## Usage
/command-name [args]

## Overview
What this command does

## Workflow

### Phase 1: [Name]
**Goal:** What to achieve
**Actions:**
- Step 1
- Step 2

### Phase 2: [Name]
[Continue with phases]
```

**Key difference from Skills:** Commands orchestrate AGENTS, Skills provide KNOWLEDGE.

### Agents (`.claude/agents/`)

**What:** Specialized subagents invoked by commands
**When:** Need to delegate specific work with specialized tools
**Examples:**
- `ios-requirements-analyst` - Extract structured requirements
- `ios-debug-analyst` - Debug iOS bugs
- `ios-layer-developer` - Implement Clean Architecture layers

**Defined in:** `agent_tool_config.yaml`

**Usage in Commands:**
```markdown
### Phase 2: Debug Analysis
Launch `ios-debug-analyst` agent to:
- Analyze problem
- Generate hypotheses
- Isolate layer (Presentation/Business/Data)
```

### Quick Decision Tree

**Need to reference project patterns?**
→ Create a **Skill**

**Need to orchestrate multi-step process?**
→ Create a **Command**

**Need specialized subagent with specific tools?**
→ Create an **Agent** (in `agent_tool_config.yaml`)

---

## Checklist

Use this checklist before finalizing a skill:

### Core Quality (Priority: Signal > Brevity)
- [ ] Name: lowercase + numbers + hyphens, max 64 chars
- [ ] Description: third person, max 1024 chars, describes WHEN to use
- [ ] Signal-focused: Only project-specific content (MOST IMPORTANT)
- [ ] Complete: Includes all critical information (don't cut for line count)
- [ ] Body: Aim ~500 lines, accept more if quality demands it
- [ ] References: One level deep only
- [ ] No generic: Remove explanations Claude already knows (CRITICAL)
- [ ] Examples: Show project-specific patterns with WHY
- [ ] Anti-patterns: Include "Critical Mistakes We Made" if applicable

### Code and Scripts
- [ ] Scripts: Use Unix paths (`~/` or `/path/to/`) not Windows paths
- [ ] Degrees of freedom: High for general guidance, low for fragile operations
- [ ] Tested: Verify scripts work on target platform

### Testing
- [ ] Test with Haiku: Does it understand with fewer tokens?
- [ ] Test with Sonnet: Does it execute correctly?
- [ ] Test with Opus: Does it provide deep insights?
- [ ] Invocation: Does Claude invoke this skill at the right time?

### Signal vs Noise (Quality Filter)
- [ ] Essential only: Can I remove this without losing critical information?
- [ ] Timeless: Will this be outdated quickly?
- [ ] Actionable: Does this help make decisions?
- [ ] Project-specific: Would Claude know this without the skill? (If YES, remove)
- [ ] Complete: Did I cut content just to meet line count? (If YES, restore it)

---

## Resources

### Official Documentation
- **Best Practices:** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- **Skill Creation Guide:** https://support.claude.com/en/articles/12512198-how-to-create-custom-skills
- **Conversational Creation:** https://support.claude.com/en/articles/12599426-how-to-create-a-skill-with-claude-through-conversation
- **Engineering Blog:** https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

### Project Resources
- **Skills Directory:** `.claude/skills/`
- **Commands Directory:** `.claude/commands/`
- **Agents Config:** `.claude/agents/agent_tool_config.yaml`
- **Main README:** `.claude/README.md`

### Example Skills in This Project
- **tca-patterns** - TCA state management patterns
- **clean-architecture** - Module placement, Service vs UseCase
- **signal-vs-noise** - 3-Question Filter for information
- **localization** - L10n naming conventions
- **data-layer** - GRDB, repositories, offline-first
- **testing-strategy** - TCA + Clean Architecture testing

### Skill Specification
- **agentskills.io** - Official Agent Skills specification

---

## Next Steps

1. **Create your first skill:**
   - Pick a domain with project-specific knowledge
   - Write SKILL.md with YAML frontmatter
   - Keep it under 500 lines
   - Test with `/skill-name` command

2. **Iterate:**
   - Get feedback from usage
   - Refine based on how Claude interprets it
   - Move detailed examples to Tier 3 files

3. **Maintain:**
   - Update when patterns change
   - Remove outdated information
   - Keep signal-to-noise ratio high

---

**Key Lesson:** The best skills are signal-focused, complete, and project-specific. Quality matters more than brevity - better to have comprehensive content (600 lines of pure signal) than incomplete content (300 lines missing critical information). Focus on what Claude can't infer from the codebase alone.
