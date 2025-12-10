# Claude Code - Practical User Guide

How to effectively use Claude Code as a terminal tool for the Digital Shelf iOS project.

---

## Table of Contents

1. [CLI - Terminal Commands](#1-cli---terminal-commands)
2. [Custom Agents - Your Specialists](#2-custom-agents---your-specialists)
3. [Slash Commands - Quick Actions](#3-slash-commands---quick-actions)
4. [Prompting - Effective Communication](#4-prompting---effective-communication)
5. [Context Management - Long Sessions](#5-context-management---long-sessions)
6. [Workflows - Work Patterns](#6-workflows---work-patterns)
7. [Advanced Patterns](#7-advanced-patterns)

---

## 1. CLI - Terminal Commands

### Basic Usage

```bash
# Interactive mode (REPL)
claude

# With initial prompt
claude "analyze project structure"

# Continue last session
claude --continue

# Print mode (no REPL, just output)
claude -p "find all TODOs"

# With pipe (Unix style)
git diff | claude -p "summarize changes"
cat error.log | claude -p "find root cause"
```

### Important Flags

**Model Selection:**
```bash
claude --model sonnet        # Faster, cheaper (default)
claude --model opus          # Deeper reasoning
claude --model haiku         # Fastest, simplest tasks
```

**Context Control:**
```bash
# Additional directories
claude --add-dir /path/to/another/project

# Custom system prompt
claude --system-prompt "You are an iOS expert. Always use English."
claude --append-system-prompt "Additionally: always check TCA patterns"

# From file
claude -p "task" --system-prompt-file custom-prompt.txt
```

**Tools Control:**
```bash
# Pre-approve tools (no permission prompts)
claude --allowedTools "Read,Write,Edit,Bash"

# Block tools
claude --disallowedTools "Bash(rm:*),Bash(git push:*)"

# Limit agent iterations
claude --max-turns 5
```

**Output Format:**
```bash
claude -p "query" --output-format json
claude -p "query" --output-format text
claude -p "query" --output-format stream-json
```

**Debug:**
```bash
# Verbose mode - detailed logs
claude --verbose

# See each agent turn
claude -p "complex task" --verbose --max-turns 10
```

### Sessions Management

```bash
# Reopen specific session
claude -r "<session-id>" "continue work"

# Update Claude Code
claude update

# MCP servers setup
claude mcp
```

---

## 2. Custom Agents - Your Specialists

### What Are Agents?

Custom agents are **specialized assistants** with:
- Their own system prompt
- Focus on a specific task
- Automatic invocation when you need their expertise
- Isolated context (don't clutter main conversation)

### Agents in Your Project

```
.claude/agents/
├── ios-tca-developer.md         # TCA patterns, state management
├── ios-feature-developer.md     # Full-stack feature creation
├── ios-swiftui-designer.md      # UI components, design system
├── ios-testing-specialist.md    # Test generation
└── ios-architect.md             # Architecture review
```

### Agent File Structure

```yaml
---
name: agent-name
color: blue
description: >
  **Use this agent PROACTIVELY** when working on X.

  Automatically invoked when detecting:
  - Pattern A
  - Pattern B

  Trigger this agent when you hear:
  - "user says this"
  - "user asks that"

model: sonnet  # or opus, haiku, inherit
---

# Agent System Prompt

You are a specialist in X...

## REFERENCE DOCUMENTATION
@path/to/reference.md

## YOUR EXPERTISE
- Skill 1
- Skill 2

## CRITICAL RULES
...
```

### Automatic vs Manual Invocation

**Automatic (Proactive):**
```
User: "check if this TCA feature is ok"
Claude: (automatically uses ios-tca-developer agent)
```

**Manual (Explicit):**
```bash
# In Claude session
"use ios-architect agent to review architecture"
```

### When Agent vs Main Agent?

**Use Custom Agent when:**
- ✅ Specialized knowledge (TCA, SwiftUI, Testing)
- ✅ Repeating task
- ✅ Need focused expertise
- ✅ Complex validation (architecture review)
- ✅ Isolated context (doesn't clutter main session)

**Use Main Agent when:**
- ✅ General questions
- ✅ Quick file edits
- ✅ Simple debugging
- ✅ Exploratory work
- ✅ Ad-hoc tasks

### Creating Your Own Agent

**Step 1: Create file `.claude/agents/my-agent.md`**

```yaml
---
name: my-agent
color: green
description: >
  **Use this agent PROACTIVELY** when user needs X.

  Trigger phrases:
  - "check API integration"
  - "review networking code"
model: sonnet
---

You are an expert in API integration for iOS apps...

## REFERENCE
@DigitalShelf/Services/DigitalShelfAPI/CLAUDE.md

## CRITICAL CHECKS
1. Proper error handling
2. Retry logic
3. Token refresh
```

**Step 2: Test**
```bash
claude
> "check API integration in this project"
# Agent should automatically trigger
```

### Best Practices for Agents

**DO:**
- ✅ Single responsibility - one agent = one task
- ✅ Clear trigger phrases in description
- ✅ "Use this agent PROACTIVELY" for auto-invoke
- ✅ Reference documentation with @paths
- ✅ Concrete examples in prompts
- ✅ Keep lightweight (<15k tokens)

**DON'T:**
- ❌ Multi-purpose "do everything" agents
- ❌ Duplicate knowledge between agents
- ❌ Heavy agents (>25k tokens) without reason
- ❌ Agents for trivial tasks (use slash commands)

---

## 3. Slash Commands - Quick Actions

### What Are Slash Commands?

They're **shortcuts to common workflows** - you type `/command`, Claude executes a predefined task.

### Commands in Your Project

```
.claude/commands/
├── ios-feature.md       # /feature - Create/extend features
├── ios-test.md          # /test - Generate tests
├── ios-debug.md         # /debug - Debug issues
├── ios-lint.md          # /lint - Quality check
├── ios-review-pr.md     # /review-pr - PR readiness
├── ios-refactor.md      # /refactor - Refactor code
├── ios-optimize.md      # /optimize - Performance
├── ios-migration.md     # /migration - Migrate to TCA
├── ios-explain.md       # /explain - Explain code
└── ios-trace.md         # /trace - Trace data flow
```

### Command File Structure

```markdown
---
description: "Short description - Usage: /command [args]"
---

# Command Title

**Usage:** `/command [arg1] [arg2]`

**Agent:** Which agent to use (optional)

Command description and instructions...

## Parameters
- arg1: description
- arg2: description

## Examples
```
/command example1
/command example2
```
```

### Most Common Commands

**Development Workflow:**
```bash
# Create new feature
/feature ProductDetail standard

# Add tests
/test ProductDetailStore.swift

# Check quality
/lint ProductDetailStore.swift

# Final check before PR
/review-pr DigitalShelf/Screens/ProductDetail/
```

**Debugging:**
```bash
# Debug specific issue
/debug HomeStore.swift "state not updating"

# Trace data flow
/trace RouteListView.swift "route data"

# Explain complex code
/explain MappingCaptureFeature.swift
```

**Refactoring:**
```bash
# Refactor to improve structure
/refactor HomeStore.swift "extract use case"

# Optimize performance
/optimize RouteListView.swift

# Migrate legacy code
/migration OldViewModel.swift "to TCA"
```

### Creating Your Own Command

**Step 1: Create file `.claude/commands/my-command.md`**

```markdown
---
description: "Check API endpoints - Usage: /api-check [service_name]"
---

# Check API Endpoints

**Usage:** `/api-check [service_name]`

Verify API endpoints are properly configured.

## Parameters
- service_name: Name of service to check (optional)

## Steps
1. Find all endpoint definitions
2. Verify HTTP methods
3. Check error handling
4. Validate request/response types

## Examples
```
/api-check RoutesService
/api-check
```
```

**Step 2: Test**
```bash
claude
> /api-check
```

### Commands vs Agents - When to Use Which?

**Commands for:**
- ✅ Repeatable workflows
- ✅ Quick actions
- ✅ Predefined steps
- ✅ User explicitly asks for action

**Agents for:**
- ✅ Complex analysis
- ✅ Specialized expertise
- ✅ Judgment calls
- ✅ Automatic invocation based on context

---

## 4. Prompting - Effective Communication

### Principles of Effective Prompting

**Anthropic's Core Principles:**

1. **Simplicity** - Clear, simple instructions
2. **Transparency** - Explain what you expect
3. **Context** - Provide enough context

### Good vs Bad Prompts

**❌ Bad:**
```
"fix this code"
"make it better"
"add tests"
```

**✅ Good:**
```
"in RouteListFeature.swift fix bug where publisher is not cancelled in onDisappear - use .cancellable(id:) pattern"

"refactor HomeStore.swift - extract business logic to HomeUseCase, keep only TCA state management in Store"

"add tests for RouteListFeature.swift - Presentation tests with mocked UseCase, check: onAppear, updateRoutes, navigation"
```

### Effective Prompt Patterns

**Pattern 1: Explicit Instructions**
```
"Create new TCA feature ProductDetail:
1. State with product: Product, isLoading: Bool
2. Actions: onAppear, productLoaded, productFailed
3. Use Case for fetching from API
4. View with loading spinner and error handling
5. Navigation from ProductList
6. Use @DigitalShelf/Screens/RouteList/ as reference"
```

**Pattern 2: Context + Task + Constraints**
```
"Context: MappingCaptureFeature has memory leak
Task: Find and fix
Constraints:
- Use weakSink for publishers
- Cancel everything in onDisappear
- Check if camera is properly disposed
Reference: @.claude/rules/critical-patterns.mdc"
```

**Pattern 3: Example-Driven**
```
"Implement filtering in RouteListFeature similar to:
@DigitalShelf/Screens/Home/HomeView.swift

Add:
- searchQuery: String in State
- filtering logic in reducer
- SearchBar in View
- Tests for filtering"
```

**Pattern 4: With Validation Criteria**
```
"Review HomeStore.swift for TCA compliance:

Check:
- @ObservableState present?
- BindingReducer() first in body?
- All publishers have unique CancelID?
- Publishers cancelled in onDisappear?
- @Dependency captured before TaskGroup?
- Navigation uses proper pattern?

Reference: @.claude/rules/tca-essentials.mdc"
```

### Multi-Step Prompts

**DO:**
```bash
# Step 1
"Analyze RouteListFeature structure - what are its dependencies and publishers?"

# Claude responds

# Step 2
"Now add filtering by status - use .filter() on routes publisher"

# Claude implements

# Step 3
"Add tests for new filtering logic"
```

**DON'T:**
```bash
# Too much at once
"Analyze RouteListFeature and add filtering and sorting and search and infinite scroll and tests for everything"
```

### Reference Documentation Pattern

```
"Implement publisher subscription pattern.

Reference:
@.claude/rules/tca-essentials.mdc - Publisher Pattern section
@DigitalShelf/Screens/RouteList/RouteListFeature.swift:50-80 - Working example

Match exactly:
- .cancellable(id: CancelID.x)
- .cancel(id:) in onDisappear
- Merge multiple publishers"
```

---

## 5. Context Management - Long Sessions

### Token Limit: 200,000 tokens

**Monitoring:**
```
Claude shows in status bar:
"Token usage: 85,000/200,000; 115,000 remaining"
```

### Context Management Strategies

**1. Chunking - Split Large Tasks**

**❌ Bad:**
```
"Implement complete Routes feature:
- RouteList
- RouteDetails
- AislePreview
- Capture
- Upload
- Tests
- Documentation"
```

**✅ Good:**
```bash
# Session 1
"Implement RouteList with basic UI and state"

# Session 2 (fresh start)
"Now add RouteDetails with navigation from RouteList"

# Session 3 (fresh start)
"Add AislePreview with camera integration"
```

**2. Context Editing (Automatic)**

Claude automatically:
- Removes old tool results
- Removes outdated file reads
- Preserves important conversation parts
- Reduces usage by ~84% in long sessions

**You don't need to do anything** - it works automatically.

**3. Memory Tool (/memory)**

```bash
# In Claude session
> /memory

# Opens project memory file
# You can add/edit key decisions
```

**Example memory notes:**
```markdown
# Digital Shelf iOS - Memory

## Key Decisions
- Use TCA for all new features (not MVVM)
- Publishers over TaskGroups in TCA
- Service = 3+ repositories combined
- Use Case = orchestration only

## Critical Patterns
- ALWAYS capture @Dependency before TaskGroup
- ALWAYS cancel publishers in onDisappear
- NEVER Write on existing file (use Edit)

## Recent Context
Working on Routes feature - RouteList completed, now on RouteDetails
```

**4. Strategic Session Breaks**

**When to start new session:**
- 60%+ token usage and planning complex work
- 80%+ token usage (last 20%)
- Sense of "context pollution" (Claude confused)
- Natural breakpoint (feature completed)
- Before major refactoring

**Before ending session:**
```
"Summarize what we did and save key decisions to /memory"
```

**Starting new session:**
```bash
claude --continue
# or
claude "continue work on RouteDetails - check /memory"
```

### Performance Tips

**DO:**
- ✅ Use `claude --continue` for continuation
- ✅ Keep sessions focused (1-2 features max)
- ✅ Start fresh for complex refactoring
- ✅ Use /memory for key decisions
- ✅ Let automatic context editing work

**DON'T:**
- ❌ Marathon sessions (8+ hours without break)
- ❌ Push to final 20% for complex work
- ❌ Ignore "context pollution" feeling
- ❌ Try to fit everything in one session

---

## 6. Workflows - Work Patterns

### Workflow 1: New Feature Development

```bash
# 1. Planning
"Plan ProductDetail feature implementation:
- State design
- Actions
- Dependencies
- Navigation
- Tests

Reference: @.claude/rules/tca-essentials.mdc"

# 2. Implementation
/feature ProductDetail standard

# 3. Testing
/test ProductDetailStore.swift

# 4. Quality Check
/lint ProductDetailStore.swift
/review-pr DigitalShelf/Screens/ProductDetail/

# 5. Commit
"Prepare commit message for this change"
git commit -m "Add ProductDetail feature with TCA

..."
```

### Workflow 2: Bug Fixing

```bash
# 1. Reproduce
"I have bug: Routes don't refresh after upload.
Steps to reproduce:
1. Open RouteList
2. Upload module
3. Routes don't update

Logs:
[paste logs]"

# 2. Debug
/debug RouteListFeature.swift "routes not refreshing after upload"

# 3. Trace
/trace RouteListFeature.swift "upload to refresh flow"

# 4. Fix
"Implement fix - add publisher subscription on uploadStatusChanged"

# 5. Verify
/test RouteListFeature.swift "upload refresh scenario"

# 6. Check
/lint RouteListFeature.swift
```

### Workflow 3: Refactoring

```bash
# 1. Analysis
/trace HomeStore.swift
"Identify what should be extracted to Use Case"

# 2. Plan
"Plan refactoring:
- Extract business logic → HomeUseCase
- Keep TCA state management in Store
- Maintain all existing behavior
- Update tests"

# 3. Execute
/refactor HomeStore.swift "extract use case"

# 4. Verify
/test HomeStore.swift
/test HomeUseCase.swift

# 5. Validate
/review-pr DigitalShelf/Screens/Home/
```

### Workflow 4: Code Review

```bash
# 1. Quality Check
/lint RouteDetailsFeature.swift

# 2. Architecture Review
"Review architecture compliance:
@.claude/rules/architecture-essentials.mdc"

# 3. TCA Patterns
"Check TCA patterns:
@.claude/rules/tca-essentials.mdc"

# 4. Critical Rules
"Verify critical patterns:
@.claude/rules/critical-patterns.mdc
- TaskGroup + @Dependency?
- Publishers cancelled?
- Memory leaks?"

# 5. Final Check
/review-pr RouteDetailsFeature.swift
```

### Workflow 5: Learning Codebase

```bash
# 1. High-level overview
"Explain Routes feature architecture:
@DigitalShelf/Screens/ShelfScan/Routes/CLAUDE.md"

# 2. Deep dive
/explain RouteListFeature.swift

# 3. Trace data flow
/trace RouteListView.swift "route data from API to UI"

# 4. Check patterns
"Show me all publishers usage in this feature"
grep -r "publisher" DigitalShelf/Screens/ShelfScan/Routes/

# 5. Compare implementations
"Compare RouteListFeature with HomeFeature - what are the pattern differences?"
```

---

## 7. Advanced Patterns

### Pattern 1: Orchestrator-Workers

**Use case:** Complex multi-step task

```bash
# Main agent (orchestrator)
"Implement complete user onboarding flow:

Use agents:
1. ios-feature-developer - create OnboardingStore
2. ios-swiftui-designer - design 3 screens
3. ios-testing-specialist - add tests
4. ios-architect - review architecture

Coordinate the whole process."
```

### Pattern 2: Evaluator-Optimizer

**Use case:** Iterative refinement

```bash
# Iteration 1
"Implement RouteList filtering"
# Claude implements

# Evaluate
/lint RouteListFeature.swift
# Issues found

# Optimize
"Fix found issues and optimize performance"
# Claude refines

# Re-evaluate
/review-pr RouteListFeature.swift
```

### Pattern 3: Parallel Sub-tasks

**Use case:** Independent work items

```bash
"Execute in parallel:
1. Add tests for RouteListFeature
2. Update documentation for Routes module
3. Fix all TODOs in RouteDetails
4. Generate CHANGELOG for Routes changes

Use Task tool with parallelization."
```

### Pattern 4: Chain of Agents

**Use case:** Specialized pipeline

```bash
# 1. ios-feature-developer
"Create ProductDetail feature"

# 2. ios-testing-specialist
"Add comprehensive tests"

# 3. ios-swiftui-designer
"Polish UI - design system compliance"

# 4. ios-architect
"Final architecture review"

# 5. Main agent
"Commit changes with descriptive message"
```

### Pattern 5: Context Switching

**Use case:** Working on multiple features

```bash
# Session 1: Feature A
"Work on RouteList filtering"
# ... implementation ...
"Save progress to /memory: RouteList filtering 80% done, remaining: tests"

# Start new session
claude

# Session 2: Feature B
"Work on MappingFlow camera lifecycle"
# ... implementation ...

# Back to Feature A
claude --continue
"Continue RouteList filtering - check /memory for progress"
```

---

## Summary - Quick Reference

### Most Important Commands

```bash
# Start/Continue
claude
claude --continue
claude -p "quick task"

# Model selection
claude --model opus          # Deep thinking
claude --model sonnet        # Balanced (default)
claude --model haiku         # Fast

# Context
claude --add-dir /path
claude --append-system-prompt "extra instruction"
claude --max-turns 10

# Debug
claude --verbose
```

### Most Common Slash Commands

```bash
/feature [name] [level]      # Create feature
/test [file]                 # Add tests
/debug [file] "issue"        # Debug
/lint [file]                 # Quick quality check
/review-pr [path]            # Comprehensive check
/refactor [file] "goal"      # Refactor
/explain [file]              # Understand
```

### Custom Agents (Auto-invoke)

- `ios-tca-developer` - TCA patterns, state
- `ios-feature-developer` - Full-stack features
- `ios-swiftui-designer` - UI components
- `ios-testing-specialist` - Tests
- `ios-architect` - Architecture review

### Effective Prompts Formula

```
Context: [what's the situation]
Task: [what you want]
Constraints: [limits, requirements]
Reference: [@documentation @examples]
Validation: [how to verify success]
```

### Session Management

**Start fresh when:**
- 60%+ tokens + complex work ahead
- 80%+ tokens (danger zone)
- Context feels polluted
- Natural feature breakpoint

**Before ending:**
```
"Save key decisions to /memory"
```

**When continuing:**
```bash
claude --continue
"Check /memory and continue [task]"
```

---

## Resources

**Official:**
- https://code.claude.com/docs - Official documentation
- https://www.anthropic.com/engineering/building-effective-agents - Agent patterns
- https://claude.com/blog/context-management - Context optimization

**Project-Specific:**
- `.claude/agents/` - Custom agents
- `.claude/commands/` - Slash commands
- `.claude/rules/` - Architectural patterns
- `CLAUDE.md` files - Project memory

---

**Version:** 1.0 for Digital Shelf iOS
**Last Updated:** 2025-01-10
**Author:** Based on official Anthropic docs + project setup
