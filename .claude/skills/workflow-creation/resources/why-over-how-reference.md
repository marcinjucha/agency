# Why Over How - Content Quality Philosophy

**Purpose:** Ensure skill updates include context and rationale, not just implementation details. Every pattern needs WHY.

---

## Core Principle

**Priority:** WHY explanation > HOW implementation

Code syntax (HOW) is obvious to Claude. Context (WHY) is not.

**Without WHY:** Future developers don't understand importance → might remove or change pattern → reintroduce bugs

**With WHY:** Pattern becomes maintainable → developers understand consequences → pattern persists

---

## What is WHY?

**WHY includes:**

1. **Problem it solves** - What breaks without this pattern?
2. **Why approach chosen** - What alternatives were considered? Why rejected?
3. **Production impact** - Real incident, user complaint, measured numbers
4. **Consequences** - What happens if violated? (crash, memory leak, wrong data)

**WHY does NOT include:**

- Generic explanations (Claude knows)
- Syntax details (obvious)
- Architecture 101 (Claude knows)
- Time-sensitive info (version numbers, dates)

---

## Philosophy: Quality > Line Count

**Wrong approach:** Cut content to meet line count target

**Right approach:** Keep all critical WHY context, even if longer

**Example:**
- 600 lines with complete WHY context > 300 lines missing critical information
- Signal-focused content matters more than brevity
- Line count is a guideline, not a constraint

---

## Pattern Transformation Examples

### Example 1: Resource Ownership

**❌ Without WHY (HOW only):**
```markdown
## Pattern: Resource in Feature

Resource owned by LeafFeature:

\`\`\`typescript
class LeafFeature {
    private resource: ResourceController | null = null;
}
\`\`\`
```

**What's missing:** Why feature? Why not root? What happens if wrong?

---

**✅ With WHY (Context + Impact):**
```markdown
## Pattern: Resource in Feature (Not Root)

**Purpose:** Prevent memory leaks through proper ownership

**Why feature ownership:**
- Leaf feature knows navigation direction (forward vs back)
- Can detect actual navigation context for conditional cleanup
- Root store can't distinguish navigation direction → always preserves resource

**Why NOT root:**
- Root store persists across entire flow
- Back navigation from child doesn't signal root to cleanup
- Result: Resource instance leaks on every back navigation

**Production impact:**
- Before fix: Large memory leak per back navigation
- Symptom: App crashed after 3 navigations
- Root cause: Root store didn't know when to cleanup

**Implementation:**
\`\`\`typescript
class LeafFeature {
    private resource: ResourceController | null = null;

    onNavigateForward() {
        this.resource?.pause();  // Forward nav → preserve
    }

    onNavigateBack() {
        this.resource?.dispose();  // Back nav → cleanup
        this.resource = null;      // Release memory
    }
}
\`\`\`

**Alternative considered:** WeakReference in root
**Why rejected:** Framework doesn't provide reliable weak references to resources
```

**Value added by WHY:**
- Developer understands memory leak risk
- Developer won't move resource back to root (knows consequences)
- Alternative approach documented (rejected with reason)
- Production incident provides urgency

---

### Example 2: Service vs Repository

**❌ Without WHY (HOW only):**
```markdown
## Service Pattern

Use Service when combining multiple repositories.

**Example:**
\`\`\`typescript
class DataWithHistoryService {
    dataRepo: DataRepository;
    historyRepo: HistoryRepository;
}
\`\`\`
```

**What's missing:** Why combine? Why not simpler approach? What breaks if wrong?

---

**✅ With WHY (Context + Impact):**
```markdown
## Service Pattern: Combining Repositories

**Purpose:** Break circular dependencies between repositories

**Why Service (not simple repository):**
- Single repository CAN'T directly depend on 3+ other repositories (architecture rule)
- Repositories CAN'T depend on other repositories (creates cycles)
- Service CAN combine any repositories (designed for multi-repo coordination)

**Problem it solves:**
DataRepository needs upload history → must depend on HistoryRepository
HistoryRepository needs data context → must depend on DataRepository
→ Circular dependency → initialization crash

**Why circular dependency crashes:**
Module systems require all dependencies resolved before use
Circular dependency = infinite loop during initialization
App crashes at startup (100% crash rate in production)

**Solution:**
Service combines both repositories (breaks cycle):

\`\`\`typescript
class DataWithHistoryService {
    constructor(
        private dataRepo: DataRepository,
        private historyRepo: HistoryRepository
    ) {}

    // Combines data from both (no circular dependency)
    async getDataWithHistory(id: string) {
        const [data, history] = await Promise.all([
            this.dataRepo.getData(id),
            this.historyRepo.getHistory(id)
        ]);

        return {
            data,
            uploadStatus: history.status
        };
    }
}
\`\`\`

**Production incident:**
- DataRepository → HistoryRepository dependency added
- App crashed at startup (100% crash rate)
- Root cause: Circular dependency during initialization
- Fix: Created DataWithHistoryService to break cycle
- Result: 0% crash rate after fix

**Alternative considered:** Repository events/notifications
**Why rejected:** Complex, harder to test, same data needs async pattern
```

**Value added by WHY:**
- Developer understands circular dependency risk
- Developer knows when to create Service (3+ repos, prevent cycles)
- Production incident shows real consequences
- Alternative documented with rejection reason

---

### Example 3: Deduplication Tolerance

**❌ Without WHY (HOW only):**
```markdown
## Data Deduplication

Use 5% tolerance for deduplication.

\`\`\`typescript
const tolerance = 0.05;  // 5%
\`\`\`
```

**What's missing:** Why 5%? What happens if too small? Too large?

---

**✅ With WHY (Context + Impact):**
```markdown
## Data Deduplication (5% Tolerance)

**Purpose:** Prevent same physical entity from creating multiple entries

**Why 5% tolerance:**
- System has ±2% noise per measurement
- Same entity detected at slightly different values each poll
- Without tolerance: Same entity creates 20-50 entries (noise causes duplicates)
- Too small (< 2%): Noise alone creates duplicates
- Too large (> 10%): Different entities merged incorrectly

**Why 5% specifically:**
- 5% = 2.5× system noise (±2%) → compensates for measurement variance
- Allows slight variation between measurements
- Tested range: 2%-10%
- 2%: Still showed duplicates (2-3 per entity)
- 5%: Correct deduplication (8 unique from 8 physical)
- 10%: Merged different entities (5 unique from 8 physical)

**Production validation:**
- Without deduplication: 300 entries from 8 physical entities
- With 5% tolerance: 8 unique entries (correct!)
- User complaints: "hundreds of duplicates" → resolved

**Implementation:**
\`\`\`typescript
// Check if measurement is near existing entry
function isNear(value: number, existing: number, tolerance: number = 0.05): boolean {
    const difference = Math.abs(value - existing) / existing;
    return difference < tolerance;  // 5% tolerance
}

// Deduplicate during ingestion
if (const existing = findExisting(measurement, tolerance)) {
    existing.values.push(measurement);  // Update existing
} else {
    entries.push(measurement);  // Truly new entity
}
\`\`\`

**Performance impact:**
- Without: 300 entries → UI laggy (300 items rendered)
- With: 8 entries → UI smooth (8 items rendered)
- Response time: Improved from 1.5s to 0.3s

**Tuning guide:**
- High precision data (< 1% variance): 2-3% tolerance
- Standard data (2-5% variance): 5% tolerance (default)
- Low precision data (> 5% variance): 7-10% tolerance

**Alternative considered:** Kalman filtering for value stability
**Why rejected:** Complexity not justified (5% tolerance sufficient for requirements)
```

**Value added by WHY:**
- Developer understands why 5% (not arbitrary)
- Developer knows testing was done (2%-10% range)
- Production incident shows real user complaints
- Performance impact measured
- Tuning guide for different scenarios
- Alternative documented with rejection reason

---

## When to Include WHY

**Always include WHY for:**

1. **Non-obvious patterns** - Anything that might seem arbitrary or unusual
2. **Production bugs** - Every anti-pattern needs incident context
3. **Thresholds/numbers** - Why this specific value? What happens if different?
4. **Design decisions** - Why this approach over alternatives?
5. **Architecture rules** - Why this layer? Why not another?

**Example triggers:**
- "Why is resource in feature, not root?"
- "Why 5% tolerance specifically?"
- "Why Service instead of simple repository?"
- "Why shared subscription pattern?"
- "Why 15-second timeout?"

---

## Structure Template

**Standard WHY structure for patterns:**

```markdown
## Pattern: [Name]

**Purpose:** [One sentence - what problem does this solve?]

**Why [approach]:**
- [Reason 1 - technical constraint]
- [Reason 2 - architecture rule]
- [Reason 3 - production requirement]

**Why NOT [alternative]:**
- [Why alternative A fails]
- [Why alternative B inadequate]

**Production impact:**
- Before fix: [Symptom, numbers, user complaints]
- After fix: [Improvement, metrics]
- Root cause: [Technical explanation]

**Implementation:**
\`\`\`typescript
[Code example with inline comments explaining critical parts]
\`\`\`

**Alternative considered:** [Other approach]
**Why rejected:** [Reason]
```

---

## Anti-Pattern: Missing WHY

**Common mistake:** Pattern documented without context

**Example:**
```markdown
❌ BAD (no WHY):
## Memory Management
Use weak references instead of strong.

✅ GOOD (includes WHY):
## Memory Management: Weak Reference Pattern

**Purpose:** Prevent retain cycles in event subscriptions

**Why weak references:**
Strong references capture object strongly → retain cycle if subscription stored in object
→ Memory leak (objects never deallocated)

**Production impact:**
- Strong references caused significant leak per session
- Memory grew continuously during operation
- App ran out of memory after 10 minutes

**Implementation:**
\`\`\`typescript
// ❌ WRONG - Strong capture
subscriber.on('event', function() {
    this.handle(value);  // 'this' retained by closure, closure retained by 'this' → cycle
});

// ✅ CORRECT - Weak capture
const weakThis = new WeakRef(this);
subscriber.on('event', function() {
    const strongThis = weakThis.deref();
    strongThis?.handle(value);  // weak→strong conversion, breaks cycle
});
\`\`\`

**Alternative considered:** Manual cleanup on destroy
**Why rejected:** Easy to forget cleanup, weak reference enforces pattern
```

---

## Quick Checklist

**Before finalizing skill update, verify:**

- [ ] Every pattern includes **Purpose** (what problem solved)
- [ ] Non-obvious choices include **Why [approach]** (reason for design)
- [ ] Alternatives documented with **Why rejected** (show thinking)
- [ ] Production incidents include **Impact** (numbers, symptoms, complaints)
- [ ] Numbers/thresholds include **Why this value** (testing range, reasoning)
- [ ] Anti-patterns include **Production context** (when it happened, how fixed)

---

## Remember

**Signal = WHY-focused content**
- Claude knows HOW to write code
- Claude doesn't know WHY your project chose specific patterns
- Production context is ALWAYS valuable (incidents, bugs, complaints)
- Complete WHY context > brevity

**Quality First:**
- 600 lines with complete WHY > 300 lines missing context
- Better to include full explanation than cut for line count
- Every "Why not?" is valuable (shows alternatives considered)

**Future-proof:**
- Pattern with WHY survives refactoring (devs understand importance)
- Pattern without WHY gets removed (seems arbitrary)
- Production context prevents regression (nobody wants to reintroduce bug)
