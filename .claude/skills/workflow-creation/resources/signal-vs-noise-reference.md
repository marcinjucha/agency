# Signal vs Noise - Decision Filter for Skill Updates

**Purpose:** Filter skill updates to focus on what matters. Apply this before updating any skill content.

---

## The 3-Question Filter

**Before including ANY update in a skill, ask:**

1. **Actionable?** Can Claude/user act on this information?
2. **Impactful?** Would lack of this cause problems?
3. **Non-Obvious?** Is this insight non-trivial (not something Claude already knows)?

**If ANY answer is NO → It's NOISE → Skip the update.**

---

## SIGNAL (Update Immediately)

Updates that provide critical, project-specific value:

- **Pattern changed** - Code implementation differs from skill (file moved, approach changed)
- **Production bug** - Incident happened, not documented in anti-patterns
- **Missing WHY** - Pattern stated without context/rationale (future devs won't understand importance)
- **File paths wrong** - Refactoring moved files, skill points to old locations
- **Numbers changed** - Thresholds/timeouts adjusted (15cm → 20cm, 35% → 30%, 15s → 30s)
- **Impact measurable** - Production incidents with numbers (200MB leak, 40% error rate, $150/week cost)

---

## NOISE (Skip Update)

Updates that don't provide value:

- **Cosmetic rewording** - Same meaning, different words (no new information)
- **Generic explanations** - Architecture 101, language basics, framework fundamentals (Claude knows)
- **Obvious clarifications** - Already clear to reader, just more verbose
- **Time-sensitive info** - Version numbers, dates, "current implementation"
- **HOW without WHY** - Explaining syntax without context (Claude knows language syntax)

---

## Application: Skill Maintenance

### SIGNAL Examples (Update These)

**Pattern Implementation Changed:**
```markdown
❌ OLD SKILL (outdated):
Resource owned by RootStore

✅ UPDATE (current implementation):
Resource owned by LeafComponent (leaf feature, not root)
**Why changed:** Root leaked resources per navigation (didn't know navigation direction)
```

**Production Bug Not Documented:**
```markdown
✅ ADD TO ANTI-PATTERNS:
### ❌ No Data Deduplication

**Problem:** Same entity appeared 300 times (8 physical entities)
**Why bad:** System noise ±5% + frequent polling = duplicate entries
**Fix:** Proximity-based deduplication tolerance
**Production incident:** v2.0 - user complaints, laggy UI
```

**File Paths Wrong:**
```markdown
❌ OLD SKILL:
File: stores/RootStore.ts:line 45

✅ UPDATE:
File: components/features/LeafComponent.tsx:line 23
(Moved from RootStore in v2.1.5)
```

**Numbers/Thresholds Changed:**
```markdown
❌ OLD SKILL:
Upload timeout: 15 seconds

✅ UPDATE:
Upload timeout: 30 seconds
**Why changed:** Server processing time increased (measured 18-25s in production)
```

### NOISE Examples (Skip These)

**Generic Explanations:**
```markdown
❌ DON'T ADD:
## What is a Repository?
A repository is a design pattern that encapsulates data access logic...
[Claude already knows repository pattern]

✅ KEEP ONLY PROJECT-SPECIFIC:
## Repository Rules (This Project)
- NEVER depend on another repository (creates cycles)
- Use Service to combine 3+ repositories
- Example: CombinedDataService prevents DataRepo→HistoryRepo cycle
```

**Cosmetic Rewording:**
```markdown
❌ DON'T CHANGE (no new info):
OLD: "Use 15cm tolerance for deduplication"
NEW: "Apply a spatial tolerance of 15 centimeters for deduplication purposes"

✅ DO CHANGE (adds WHY):
OLD: "Use 5% tolerance for deduplication"
NEW: "Use 5% tolerance for deduplication (compensates for system noise)"
```

**Obvious Clarifications:**
```markdown
❌ DON'T ADD:
// Set loading state to true
state.isLoading = true

✅ DO ADD (non-obvious):
// Critical: Use publisher value, not repository property
// Repository property may be stale during emission
guard let storeId = newStoreId else { return }
```

---

## Quick Test

**Before updating skill, ask:**

1. **"Is this something Claude already knows?"**
   - YES → Skip update (noise)
   - NO → Update (signal)

2. **"Would lack of this cause production bugs?"**
   - YES → Update immediately (critical signal)
   - NO → Consider skipping

3. **"Does this explain WHY, not just HOW?"**
   - HOW only → Skip or add WHY first
   - WHY included → Update (signal)

---

## Application: Skill Updates Decision Tree

```
Pattern changed in code?
├─ YES → Update skill (SIGNAL)
└─ NO
   └─ Production bug happened?
      ├─ YES → Add anti-pattern (SIGNAL)
      └─ NO
         └─ File moved/renamed?
            ├─ YES → Update paths (SIGNAL)
            └─ NO
               └─ Numbers/thresholds adjusted?
                  ├─ YES → Update values (SIGNAL)
                  └─ NO
                     └─ Just cosmetic rewording?
                        └─ YES → Skip update (NOISE)
```

---

## Impact Examples (SIGNAL)

**Include production impact numbers:**

- Memory leak: "200MB leak per navigation (app crashed after 3 navigations)"
- Error rate: "25% error rate in production (wrong data captured)"
- Performance: "40% slower list load (3 parallel database queries)"
- Cost: "$150/week in duplicate operations (double-tap guard missing)"
- User complaints: "30% of support tickets about 'lost data' (false negatives)"
- Time savings: "Saves 200 actions per workflow (60% faster)"

---

## Remember

**Signal-focused content:**
- 600 lines of project-specific content > 300 lines with 50% generic explanations
- Quality matters more than brevity
- Every update should answer: "Would Claude know this without the skill?"
- Production context is ALWAYS signal (incidents, bugs, user complaints)

**When in doubt:**
- Generic pattern? → Skip (Claude knows)
- Project-specific weird stuff? → Update (signal)
- Production bug/impact? → Update immediately (critical signal)
