---
name: testing-strategies
description: Use when manual testing implementation. Covers P0/P1/P2 severity classification, edge case identification, and testing checklists. Focuses on holistic coverage of business paths, skipping trivial cases (signal vs noise approach).
---

# Testing Strategies - Manual Testing & Edge Cases

## Purpose

Manual testing strategy: P0/P1/P2 severity classification, edge case patterns, holistic coverage. Skip trivial cases, focus on business-critical paths and real user scenarios.

## When to Use

- Implementation complete (ready to test)
- Need testing checklist (what to verify)
- Severity classification (P0 vs P1 vs P2)
- Edge case identification (what can break)

## Critical Patterns

### P0/P1/P2 Severity Classification

**Project standard:**

```yaml
P0 (Critical - blocks core functionality):
  - Feature completely broken
  - Data loss or corruption
  - Security vulnerability
  - Crashes entire app
  Example: Survey submission fails → users can't submit

P1 (Important - degrades UX significantly):
  - Feature partially broken
  - Major UX degradation
  - Error messages unclear
  Example: Checkbox arrays store only last value → data incomplete

P2 (Minor - cosmetic or edge case):
  - Visual inconsistency
  - Minor UX improvement
  - Rare edge case
  Example: Loading spinner color slightly off
```

**Why classification matters:** Prioritize fixes (P0 first, P2 optional)

### Edge Case Patterns

**Common edge cases to test:**

```yaml
Validation:
  - Empty input (required fields)
  - Max length exceeded
  - Invalid format (email, phone)
  - Special characters

State:
  - Loading state
  - Error state
  - Empty state (no data)
  - Success state

Time:
  - Expired links
  - Future dates
  - Past dates
  - Timezone edge cases

Limits:
  - Max submissions reached
  - Rate limiting
  - Database constraints

Permissions:
  - Unauthenticated access
  - Wrong tenant access
  - Public vs private data
```

**From Phase 2 Survey:**
- Expired survey links ✅ Tested
- Max submissions reached ✅ Tested
- Invalid question types ✅ Tested
- Empty question arrays ⚠️ Missed (caused P1 bug)

### Holistic Testing Approach

**Signal vs Noise in testing:**

```yaml
✅ SIGNAL (test these):
  - Core business paths (happy path)
  - Critical edge cases (expired, max reached)
  - Data validation (required fields, formats)
  - Error handling (API failures)
  - Multi-tenant isolation (wrong tenant data)

❌ NOISE (skip these):
  - Trivial happy paths (input field accepts text)
  - Obvious validations (email field validates email)
  - Framework behavior (Next.js routing works)
  - UI cosmetics (button color correct)
```

**Why skip noise:** Focus testing time on impactful scenarios

## Quick Reference

**Testing checklist template:**

```yaml
Feature: [Name]

P0 Tests (Critical):
  - [ ] Core functionality works (happy path)
  - [ ] Required validations enforced
  - [ ] Error handling graceful
  - [ ] Multi-tenant isolation verified

P1 Tests (Important):
  - [ ] Edge cases handled (expired, max limits)
  - [ ] All UI states present (loading, error, empty)
  - [ ] Error messages user-friendly

P2 Tests (Optional):
  - [ ] Visual polish
  - [ ] Performance acceptable
  - [ ] Accessibility features
```

**Severity decision tree:**

```
Does failure block core functionality? → P0
Does failure significantly degrade UX? → P1
Is it cosmetic or rare edge case? → P2
```

**Commands:**

```bash
# Run manual test (browser)
npm run dev
# Navigate to feature, test scenarios

# Check console for errors
# Open DevTools → Console

# Test edge case: expired link
# Modify database: UPDATE survey_links SET expires_at = '2020-01-01'

# Test permissions: different user
# Login as different tenant, verify isolation
```

## Real Project Examples

**Phase 2 Survey Testing:**

```yaml
P0 Tests:
  ✅ Survey submission works
  ✅ Validation prevents invalid data
  ✅ Multi-tenant isolation (lawyer A can't see lawyer B's surveys)

P1 Tests:
  ✅ Expired links show error message
  ✅ Max submissions enforced
  ✅ Checkbox arrays store multiple values
  ⚠️ Empty questions array (missed - caused P1 bug)

P2 Tests:
  ✅ Loading states present
  ⚠️ Empty state design (skipped - acceptable)

Result: 90% P0/P1 coverage, caught critical bugs before production
```

**Bug caught:** Checkbox register (P1) - would've been data loss in production

## Anti-Patterns

### ❌ Testing Trivial Cases

**Problem:** Wasting time on obvious scenarios

```yaml
# ❌ NOISE: Testing obvious behavior
- Test: Input field accepts text
- Test: Button is clickable
- Test: Text displays correctly

# ✅ SIGNAL: Testing business logic
- Test: Expired link shows error
- Test: Max submissions enforced
- Test: Multi-tenant data isolated
```

**Why wrong:** Time wasted on trivial cases instead of edge cases

### ❌ Missing Edge Cases

**Problem:** Only testing happy path

```yaml
# ❌ WRONG: Only happy path
Test 1: Submit valid survey → Success ✅
[End of testing]

# ✅ CORRECT: Happy + edge cases
Test 1: Submit valid survey → Success ✅
Test 2: Submit with expired link → Error message ✅
Test 3: Submit when max reached → Error message ✅
Test 4: Submit without required fields → Validation error ✅
Test 5: Submit as wrong tenant → 403 error ✅
```

**Why wrong:** Edge cases cause P0/P1 bugs in production

### ❌ No Severity Classification

**Problem:** Fixing P2 bugs before P0

```yaml
# ❌ WRONG: No priority
Bug 1: Button color off → Fixed first
Bug 2: Survey submission broken → Fixed later (P0!)

# ✅ CORRECT: Severity-based
Bug 1: Survey submission broken (P0) → Fix immediately
Bug 2: Button color off (P2) → Fix later or skip
```

**Why wrong:** P0 bugs block users, must be fixed first

---

**Key Lesson:** Classify severity (P0 > P1 > P2), test edge cases, skip trivial scenarios (signal vs noise).
