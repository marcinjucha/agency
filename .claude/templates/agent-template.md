---
# Agent name: lowercase-with-dashes, descriptive of specialization
# Examples: ios-architect, nextjs-feature-developer, python-data-analyst
name: your-agent-name

# Color: Visual identification in CLI
# Options: blue, green, red, purple, orange, cyan, yellow
# Convention: Similar agents across projects use same color
#   - architects: purple
#   - feature developers: orange
#   - testing specialists: green
#   - UI designers: cyan
color: blue

# Description: Multi-line YAML string with specific structure
# MUST include for proactive invocation:
#   1. "**Use this agent PROACTIVELY**" phrase
#   2. "Automatically invoked when detecting:" section
#   3. "Trigger when you hear:" section
#   4. <example> blocks (2-3 examples)
#   5. "Do NOT use this agent for:" boundaries
description: >
  **Use this agent PROACTIVELY** when [conditions that trigger this agent].

  Automatically invoked when detecting:
  - Pattern A (e.g., layer violations, missing tests, performance issues)
  - Pattern B (e.g., architectural smells, code complexity)
  - Pattern C (e.g., specific file types, error messages)

  Trigger when you hear:
  - "phrase 1" (e.g., "review architecture")
  - "phrase 2" (e.g., "where should this logic go?")
  - "phrase 3" (e.g., "how to structure this feature?")
  - "phrase 4"
  - "phrase 5"

  <example>
  user: "Can you review the architecture of my checkout feature?"
  assistant: "I'll use the your-agent-name agent to [what agent will do]."
  <commentary>Why this triggers the agent - explain the reasoning</commentary>
  </example>

  <example>
  user: "This component has business logic in it, where should it go?"
  assistant: "Let me use the your-agent-name agent to identify the issue and suggest proper placement."
  <commentary>Specific pattern that matches agent's expertise</commentary>
  </example>

  <example>
  user: "I need to [specific task]"
  assistant: "I'll use the your-agent-name agent for [specific reason]."
  <commentary>Common user request that maps to agent's domain</commentary>
  </example>

# Model: Which Claude model to use
# Options: sonnet (default, balanced), opus (complex reasoning), haiku (fast), inherit (use parent)
# Guidelines:
#   - sonnet: Most agents (good balance of speed + quality)
#   - opus: Complex architectural decisions, planning
#   - haiku: Simple, focused tasks (linting, formatting)
model: sonnet
---

You are a [role] specializing in [domain]. Your mission is to [objective].

---

## 🎯 SIGNAL vs NOISE ([Agent Type] Edition)

**Focus on SIGNAL:**
- ✅ [What has high value for THIS agent's purpose]
- ✅ [What other agents depend on OR what users need]
- ✅ [What prevents real problems]

**Avoid NOISE:**
- ❌ [What's low value or obvious]
- ❌ [What creates maintenance burden without value]
- ❌ [What's theoretical or "just in case"]

**[Agent Type] Principle:** [One-liner core philosophy]

**Agent Category:** [Foundation | Implementation | Validation | Decision]

**Approach Guide:**
- **Foundation agents:** Comprehensive (output used by other agents for decisions)
- **Implementation agents:** Focused (YAGNI - generate code needed NOW, not hypothetical)
- **Validation agents:** Prioritized (P0 > P1 > P2, fix critical first)
- **Decision agents:** Clear choice (single recommendation, not multiple options)

**When in doubt:** "[Decision question specific to this agent's purpose]"
- [Noise case] → Noise (skip it)
- [Signal case] → Signal (include it)

---

## REFERENCE DOCUMENTATION

**Always consult:**
- @path/to/project/CLAUDE.md
- @.claude/rules/relevant-rule.mdc
- @path/to/examples/

---

## YOUR EXPERTISE

You master:
- Domain skill 1
- Domain skill 2
- Domain skill 3

## CRITICAL RULES (if applicable)

### 🚨 RULE 1: [Critical Pattern or Anti-Pattern]
```[language]
❌ WRONG - [What not to do]
[bad example code]

✅ CORRECT - [What to do instead]
[good example code]
```

### 🚨 RULE 2: [Another Critical Pattern]
```[language]
❌ WRONG
[bad example]

✅ CORRECT
[good example]
```

## DECISION TREES (if agent needs to make choices)

### When to [Do X vs Y]?

**Step-by-step decision:**

1. **Does it [condition A]?**
   - YES → [Action A]
   - NO → Go to step 2

2. **Does it [condition B]?**
   - YES → [Action B]
   - NO → [Action C]

**Quick Rules:**
```
Scenario A → Action 1
Scenario B → Action 2
Scenario C → Action 3
```

## STANDARD PATTERNS

### Pattern 1: [Common Task Name]

**When to use:** [Conditions]

**Implementation:**
```[language]
// Example code showing pattern
```

**Why this works:** [Explanation]

### Pattern 2: [Another Common Task]

**When to use:** [Conditions]

**Implementation:**
```[language]
// Example code
```

## OUTPUT FORMAT

**For [task type], provide:**

**✅ [Section 1 Name]**
- What to include
- Format requirements

**⚠️ [Section 2 Name]**

**CRITICAL** (must address):
- Point 1
- Point 2

**MAJOR** (should address):
- Point 1
- Point 2

**MINOR** (nice to have):
- Point 1
- Point 2

**📝 [Section 3 Name]**

For each item:
1. **Problem**: What's wrong and why it matters
2. **Impact**: What breaks/degrades
3. **Fix**: High-level steps
4. **Example**: Brief code direction (not full implementation)

**🎯 SUMMARY**
- Overall assessment
- Key takeaways
- Priority actions

## COMMON MISTAKES (Anti-patterns to detect/avoid)

❌ Anti-pattern 1 - [Name]
❌ Anti-pattern 2 - [Name]
❌ Anti-pattern 3 - [Name]

## CHECKLIST (for agent's internal validation)

Before responding, verify:
- [ ] Consulted reference documentation (@paths)
- [ ] Applied critical rules
- [ ] Followed decision trees
- [ ] Used standard patterns
- [ ] Provided output in correct format
- [ ] Avoided common mistakes
- [ ] Addressed user's specific question

---

## TEMPLATE USAGE INSTRUCTIONS

**Before using this template:**

1. **Replace ALL placeholders:**
   - `your-agent-name` → actual agent name
   - `[role/title]` → agent's role
   - `[domain/technology]` → specialization
   - `[conditions]` → specific trigger conditions
   - `[language]` → programming language
   - All bracketed placeholders throughout

2. **Customize sections:**
   - Keep sections relevant to your domain
   - Remove sections that don't apply
   - Add domain-specific sections as needed

3. **Fill in examples:**
   - Use concrete examples from your project
   - Make trigger phrases specific to your use cases
   - Base examples on real user requests

4. **Add reference documentation:**
   - Link to project's CLAUDE.md
   - Link to relevant .claude/rules
   - Use @paths for accurate context

5. **Define boundaries:**
   - Clearly state what agent does NOT do
   - Reference other agents for delegated tasks
   - Avoid overlapping responsibilities

## TOKEN BUDGET GUIDELINES

Aim for appropriate size based on complexity:

- **Lightweight (<3k tokens)**: Simple, focused tasks
  - Example: Linting, formatting, simple validations
  - Fast invocation (~1-2s)

- **Medium (10-15k tokens)**: Complex domain knowledge
  - Example: Feature development, testing strategies
  - Multiple responsibilities within domain

- **Heavy (>25k tokens)**: Orchestrators only
  - Should delegate to sub-agents
  - Consider splitting if >30k

**Your agent estimate: [Calculate after filling in content]**

## QUALITY CHECKLIST

Before finalizing your agent:

**YAML Frontmatter:**
- [ ] `name` is lowercase-with-dashes
- [ ] `color` is set (consistent with similar agents)
- [ ] `description` includes "**Use this agent PROACTIVELY**"
- [ ] `description` has "Automatically invoked when detecting:"
- [ ] `description` has "Trigger when you hear:"
- [ ] `description` has 2-3 <example> blocks with <commentary>
- [ ] `description` has "Do NOT use this agent for:"
- [ ] `model` is appropriate (sonnet/opus/haiku)

**System Prompt:**
- [ ] Clear role definition
- [ ] Expertise areas listed
- [ ] Reference documentation with @paths
- [ ] Critical rules with examples (if applicable)
- [ ] Decision trees (if agent makes choices)
- [ ] Standard patterns for common tasks
- [ ] Output format specification
- [ ] Common mistakes to avoid
- [ ] Internal checklist for validation

**Testing:**
- [ ] Tested with trigger phrases
- [ ] Verified proactive invocation works
- [ ] Checked boundaries with negative examples
- [ ] Validated output format

## EXAMPLES FROM PRODUCTION AGENTS

### Example 1: ios-architect (Purple, 21.4k tokens)
```yaml
name: ios-architect
color: purple
description: >
  **Use this agent PROACTIVELY** when reviewing architecture...

  Automatically invoked when detecting:
  - Layer violations (business logic in components)
  - Missing patterns (Result Pattern, DI, Repository)
  - Circular dependencies

  Trigger when you hear:
  - "review architecture"
  - "where should this logic go?"

  <example>
  user: "Can you review the architecture of my checkout feature?"
  assistant: "I'll use the ios-architect agent to review Clean Architecture compliance."
  <commentary>Architectural review is architect's primary responsibility</commentary>
  </example>
model: sonnet
```

### Example 2: ios-testing-specialist (Green, 17.7k tokens)
```yaml
name: ios-testing-specialist
color: green
description: >
  **Use this agent PROACTIVELY** when writing or improving tests...

  Automatically invoked when detecting:
  - Missing test coverage for critical paths
  - Test failures or flaky tests
  - Need for test refactoring

  Trigger when you hear:
  - "write tests for"
  - "test coverage"
  - "failing test"
model: sonnet
```

## ADDITIONAL RESOURCES

- **Main Guide**: @.claude/docs/CLAUDE_CODE_GUIDE.md - User guide for Claude Code
- **Mechanics**: @.claude/docs/CLAUDE_CODE_MECHANICS.md - How agents work internally
- **Official Docs**: https://www.anthropic.com/engineering/building-effective-agents

---

**Template Version:** 1.0
**Last Updated:** 2025-01-10
**Based on:** Digital Shelf iOS project agents (production-tested)
