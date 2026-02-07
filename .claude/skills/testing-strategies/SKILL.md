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

```yaml
P0 (Critical): Feature broken, data loss, crashes
P1 (Important): Partial breakage, major UX degradation
P2 (Minor): Cosmetic, rare edge case
```

### Edge Case Patterns

**Common edge cases:**
- Validation: Empty input, max length, invalid format
- State: Loading, error, empty, success
- Time: Expired links, future/past dates
- Limits: Max reached, rate limiting
- Permissions: Wrong tenant, public vs private

**Phase 2 example:** Empty question arrays ⚠️ Missed (caused P1 bug)

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
- ✅ P0: Submission works, validation, multi-tenant isolation
- ✅ P1: Expired links, max submissions, checkbox arrays
- ⚠️ Missed: Empty questions array (caused P1 bug)

