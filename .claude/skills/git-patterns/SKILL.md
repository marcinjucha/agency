---
name: git-patterns
description: Use when creating commits, cleaning git history, or creating pull requests. Project-specific commit conventions (signal-focused messages), history cleanup patterns (rebase, squash), and PR structure. Prevents verbose commits and messy history.
---

# Git Patterns - Commits, History, PRs

## Purpose

Project-specific git workflows: signal-focused commit messages (concise, present tense), history cleanup (rebase/squash), and PR structure. Avoid verbose commits with implementation details.

## When to Use

- Creating commits (need message format)
- Git history messy (need cleanup)
- Creating pull request (need structure)
- Commit messages too verbose (need simplification)

## Critical Pattern: Signal-Focused Commits

**Project convention: Concise, present tense, outcome-focused**

```bash
# ✅ SIGNAL (good commits)
feat: add survey submission with 7 question types
fix: handle expired survey links gracefully
refactor: extract validation to shared function

# ❌ NOISE (verbose commits)
feat: add survey submission feature

This commit adds a survey submission feature using React Hook Form with
zodResolver for validation. Created SurveyForm component that handles 7
different question types using conditional rendering in QuestionField.
Used Controller instead of register for checkbox arrays because register
only stores the last value. Also added dynamic Zod schema generation...
[200 more lines of implementation details]
```

**Why concise:** Git log should be scannable. Details in code, not commits.

**Format:**
```
<type>: <concise description>

[optional body if complex context needed]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructure (no behavior change)
- `docs`: Documentation only
- `test`: Test changes
- `chore`: Build, deps, etc.

## History Cleanup Patterns

**Pattern 1: Squash related commits**

```bash
# Before: Messy history
abc123 fix: typo in survey form
def456 fix: another typo
ghi789 fix: validation message
jkl012 feat: add survey submission

# Clean with interactive rebase
git rebase -i HEAD~4

# In editor:
pick jkl012 feat: add survey submission
fixup abc123 fix: typo in survey form
fixup def456 fix: another typo
fixup ghi789 fix: validation message

# After: Clean history
jkl012 feat: add survey submission
```

**Why:** 4 commits → 1 commit (main work + fixes combined)

**Pattern 2: Reword verbose commits**

```bash
# Before: Verbose commit message (300 lines)
git log --oneline
abc123 feat: add survey submission [+ 300 lines of details]

# Reword with rebase
git rebase -i HEAD~1

# In editor:
reword abc123 feat: add survey submission

# New message:
feat: add survey submission with 7 question types

# After: Concise message (2 lines)
```

**Pattern 3: Split unrelated changes**

```bash
# Before: One commit with multiple concerns
git log
abc123 feat: add survey + fix RLS + update docs

# Split with rebase
git rebase -i HEAD~1

# In editor:
edit abc123

# Then:
git reset HEAD~
git add survey-files
git commit -m "feat: add survey submission"
git add rls-files
git commit -m "fix: resolve RLS infinite recursion"
git add docs
git commit -m "docs: update PROJECT_SPEC with survey"
git rebase --continue
```

## Pull Request Structure

**Pattern: Structured PR with context**

```markdown
## Summary
- Added survey submission feature with 7 question types
- Clients can submit responses via public links
- Validation enforced, edge cases handled

## Changes
- Survey form component with dynamic question rendering
- Validation with Zod (dynamic schema from questions)
- Edge case handling (expired links, max submissions)

## Test Plan
- [ ] Submit valid survey → success
- [ ] Submit with expired link → error message
- [ ] Submit with max reached → error message
- [ ] All 7 question types work correctly

## Screenshots (optional)
[If UI changes]
```

**Critical sections:**
- **Summary** - What was done (outcome-focused)
- **Changes** - Key changes (high-level, not file-by-file)
- **Test Plan** - How to verify (checklist format)

## Quick Reference

**Commit checklist:**
```yaml
- [ ] Type prefix (feat/fix/refactor/docs/test/chore)
- [ ] Present tense ("add" not "added")
- [ ] Concise (1-2 lines, not paragraph)
- [ ] Outcome-focused (what works now, not how)
```

**History cleanup commands:**

```bash
# Interactive rebase (last N commits)
git rebase -i HEAD~N

# Squash all commits in branch
git rebase -i main

# Reword last commit
git commit --amend

# Check history
git log --oneline --graph

# Abort if needed
git rebase --abort
```

**PR creation:**

```bash
# Push branch
git push -u origin feature-name

# Create PR (GitHub CLI)
gh pr create --title "feat: add survey submission" --body "$(cat <<'EOF'
## Summary
- Added survey submission feature

## Test Plan
- [ ] Manual testing complete
EOF
)"
```

## Real Project Example

**Phase 2 Survey Implementation:**

```bash
# Before cleanup (messy history):
6 commits:
- feat: add survey submission
- fix: checkbox register issue
- fix: controller pattern
- fix: validation
- fix: another fix
- fix: typo

# After cleanup (clean history):
1 commit:
- feat: add survey submission with validation

# PR structure:
Title: feat: add public survey submission
Body:
  ## Summary
  - Clients can submit survey responses via public links
  - 7 question types supported with validation

  ## Test Plan
  - [x] All question types tested
  - [x] Edge cases handled (expired, max reached)

  🤖 Generated with Claude Code
```

## Anti-Patterns

### ❌ Verbose Commit Messages

**Problem:** 300-line commit messages with implementation details

```bash
# ❌ NOISE
feat: add survey submission

This commit implements survey submission feature using React Hook Form.
I created a SurveyForm component that handles dynamic questions...
[280 more lines explaining every file, function, decision]

# ✅ SIGNAL
feat: add survey submission with 7 question types
```

**Why wrong:** Git log unreadable. Code already documents implementation.

### ❌ Messy Git History

**Problem:** 10 commits for one feature (all tiny fixes)

```bash
# ❌ WRONG
abc123 feat: add feature
def456 fix: typo
ghi789 fix: forgot import
jkl012 fix: another typo
[6 more fix commits]

# ✅ CORRECT (after squash)
abc123 feat: add feature
```

**Why wrong:** Pollutes history. Fixes should be squashed into main commit.

---

**Key Lesson:** Concise commits (signal-focused), clean history (squash fixes), structured PRs (summary + test plan).
