---
name: signal-vs-noise
description: Signal vs Noise philosophy for filtering information and making decisions. Use when evaluating what to include in documentation, tests, code comments, or any content creation.
---

# Signal vs Noise - Decision Filter

**Purpose:** Filter information to focus on what matters. Apply to documentation, tests, code comments, feature decisions.

---

## The 3-Question Filter

**Before including ANY information, ask:**

1. **Actionable?** Can Claude/user act on this?
2. **Impactful?** Would lack of this cause problems?
3. **Non-Obvious?** Is this insight non-trivial?

**If ANY answer is NO → It's NOISE → Cut it.**

---

## SIGNAL (Keep)

- Project-specific weird stuff + WHY explanation
- Critical crashes/bugs prevention
- Non-obvious patterns with context
- Real mistakes made + fix
- Impact numbers (200MB leak, 40% error rate, $150/week)

## NOISE (Cut)

- Generic patterns Claude already knows (TCA, Clean Architecture, Swift)
- HOW explanations without WHY
- Standard syntax examples
- Architecture 101 explanations
- Obvious comments ("Set loading to true")

---

## Application: Documentation

**SIGNAL:**
```markdown
## Camera Lifecycle (Memory Leak Fix)
Camera owned by CaptureFeature, NOT FlowStore.
**Why**: Previous approach leaked 200MB per navigation. iPhone 8 crashed.
```

**NOISE:**
```markdown
## Repository Pattern
Repositories handle data access. They can be DataRepository or NetworkRepository...
[Claude already knows this]
```

---

## Application: Code Comments

**SIGNAL:**
```swift
// Critical: Use publisher value directly, not repository property
// Repository property may be stale during publisher emission
guard let storeId = newStoreId else { return }
```

**NOISE:**
```swift
// Set loading state to true
state.isLoading = true
```

---

## Application: Tests

**SIGNAL:** Complete user journey with business outcome
```swift
func testUserCompletesRouteCaptureAndUploadSucceeds()
```

**NOISE:** Trivial verification
```swift
func testButtonTapSendsAction()
```

---

## Application: CLAUDE.md Files

**SIGNAL:** Project-specific decisions with WHY
- "15-second upload window prevents false 'not captured' (95% fewer tickets)"
- "Camera in CaptureFeature, not FlowStore (200MB leak fixed)"

**NOISE:** Generic patterns
- "Use @ObservableState for TCA state" (Claude knows)
- "Clean Architecture has 4 layers" (Claude knows)

---

## Quick Test

**Before writing anything, ask:**
"Is this something Claude already knows?"
- YES → Cut it
- NO → Keep it (with WHY)

---

**Remember:** 100 lines of project-specific content > 50 lines of generic patterns.
