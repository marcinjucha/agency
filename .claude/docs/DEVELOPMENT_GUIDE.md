# Development Guide - Digital Shelf iOS

**For:** Human developers building features in this codebase

**Core Philosophy:** Signal over Noise - Focus on high-value work

**Related:** See `.claude/SIGNAL_VS_NOISE_PHILOSOPHY.md` for universal concept

---

## 🎯 Signal vs Noise in Development

### The Core Idea

**Signal** = Work with real impact (users, business, code quality)
**Noise** = Work that feels productive but doesn't improve outcomes

**Before any work, ask:** "What's the measurable value?"
- Can't articulate → Likely noise
- Can point to benefit → Signal

**Remember:** 1 hour of signal work > 10 hours of noise work

---

## 🧪 Testing Best Practices

### The 3-Question Rule (Before Every Test)

**Ask:**
1. ❓ Does test verify **business outcome** (not implementation)?
2. ❓ Would lack of test increase **production risk**?
3. ❓ Is logic **non-trivial** (>3 conditions OR caused bugs before)?

**If ANY answer is NO → Skip the test**

### Examples

**✅ Write These:**
```swift
// Complete user journey (passes all 3 questions)
func testUserCompletesRouteCaptureAndUploadSucceeds() async {
    await sut.send(.onAppear)
    await sut.receive(\.routesLoaded)
    await sut.send(.routeTapped(routeId))
    await sut.receive(\.navigateToDetails)
    await sut.send(.captureCompleted(image))
    await sut.receive(\.uploadCompleted)

    XCTAssertEqual(analytics.captureCompletedCount, 1)
}

// Error handling (passes all 3)
func testUploadFailureShowsRetryOption() async {
    await sut.send(.uploadButtonTapped)
    useCase.stubbedUploadResult.send(.failure(NetworkError.offline))

    await sut.receive(\.uploadFailed) {
        $0.showRetryButton = true
    }
}
```

**❌ Skip These:**
```swift
// Obvious computed property (fails Q2, Q3)
func testIsButtonEnabledWhenInputNotEmpty() {
    state.input = "text"
    XCTAssertTrue(state.isButtonEnabled)
}

// Implementation detail (fails Q1)
func testOnAppearCallsUseCaseInitialize() async {
    await sut.send(.onAppear)
    XCTAssertEqual(useCase.initializeCallCount, 1)
}
```

### Testing ROI

**Comprehensive approach:**
- 20 tests, 95% coverage
- 3 catch real bugs, 17 test obvious code
- Time: 150 min (write + maintain)

**Signal-first approach:**
- 5 tests, 65% coverage
- 5 catch real bugs, 0 test obvious code
- Time: 50 min

**Result:** Catch MORE bugs in LESS time (3x better ROI)

---

## 🏛️ Architecture Best Practices

### YAGNI - You Aren't Gonna Need It

**Write code needed NOW, not code MIGHT need later**

### Simple Feature = Simple Architecture

**Match complexity to actual need:**

**User profile screen:**
```
✅ Right-sized (3 layers):
Model → Repository → Use Case → TCA + View

❌ Over-engineered (5 layers):
User + UserProfile + UserSettings models
→ UserRepository + ProfileRepository
→ UserProfileService + ValidationService
→ LoadUseCase + UpdateUseCase
→ Coordinator + TCA + View
```

**Why simpler wins:**
- Half the files (6 vs 12+)
- Faster to build (3h vs 6h)
- Easier to change
- No unused code

**Add complexity when second use appears**

### Service vs Use Case Decision

**Simple rule:**

**Create Service when:**
- ✅ Combining 2+ repositories (prevents cycles)
- ✅ Complex algorithm (calculations, data merging)

**Use Case enough when:**
- ✅ Simple orchestration (delegates to repo)
- ✅ No complex logic

**Example:**

```swift
// ✅ Service needed (combines 5 repos)
final class RouteWithHistoryService {
    @Dependency(\.routeData) var routeData
    @Dependency(\.history) var history
    @Dependency(\.uploads) var uploads
    @Dependency(\.aisles) var aisles
    @Dependency(\.network) var network

    // Complex merging logic
}

// ✅ Use Case enough (thin delegation)
final class ProfileUseCase {
    @Dependency(\.userRepository) var userRepo

    var userPublisher: AnyPublisher<User, Never> {
        userRepo.currentUserPublisher
    }
}
```

### Never: Repository→Repository

```swift
// ❌ NEVER
final class RouteRepository {
    @Dependency(\.uploadRepository) var uploadRepo  // Cycle risk!
}

// ✅ INSTEAD - Service
final class RouteWithUploadService {
    @Dependency(\.routeRepository) var routeRepo
    @Dependency(\.uploadRepository) var uploadRepo
    // Service combines both
}
```

### Abstractions: Wait for 2+ Uses

**Don't abstract until concrete second use:**

```swift
// Feature 1: Route filtering
// ❌ DON'T create generic FilterService<T>
// (Don't know pattern yet)

// Feature 2: Module filtering
// ✅ NOW create FilterService<T>
// (Pattern is clear)
```

**Remember:** Duplication sometimes better than wrong abstraction

---

## ⚡ Performance Best Practices

### Weighted Priority (Fix Critical First)

**P0 - Production Blockers (70% time):**

**Database N+1 queries (30%):**
```swift
// ❌ P0 ISSUE - 100 queries
for route in routes {
    let modules = try RouteModule
        .filter(Column("routeId") == route.id)
        .fetchAll(db)  // Separate query per route!
}
// Impact: 1s → 10s

// ✅ FIX - 1 query
let routesWithModules = try Route
    .including(all: Route.modules)
    .fetchAll(db)
// Impact: 10s → 100ms (100x faster)
```

**Image batch processing (30%):**
```swift
// ❌ P0 ISSUE - UI freeze
for image in images {  // 300 images sync!
    let data = exportOptions.data(from: image)
    upload(data)
}
// Impact: UI frozen 30+ seconds

// ✅ FIX - Async with limit
await withThrowingTaskGroup { group in
    for image in images {
        group.addTask {
            await autoreleasepool {
                let data = await exportOptions.dataAsync(from: image)
                try await upload(data)
            }
        }
    }
}
// Impact: UI responsive
```

**Missing .share() (10%):**
```swift
// ❌ P0 ISSUE - Memory leak
var publisher: AnyPublisher<[Route], Never> {
    routeRepo.publisher  // Each subscription = new DB connection!
}

// ✅ FIX
private lazy var sharedPublisher = routeRepo.publisher
    .share()
    .eraseToAnyPublisher()
```

**P1 - Engineering Quality (20% time):**
- Main thread blocking
- Unnecessary stored state

**P2 - Nice to Have (10% or skip):**
- Minor optimizations
- Cold path improvements

**Rule:** Fix P0 first, P1 if time, skip P2

---

## 💬 Comments Best Practices

### Only Comment WHY (Never WHAT)

**Code explains WHAT, comments explain WHY**

### Good Comments

**Non-obvious decisions:**
```swift
// ✅ GOOD - Explains race condition
// Critical: Use publisher value directly, not repository property
// Repository property may be stale during publisher emission
guard let storeId = newStoreId else { return }
```

**Timing dependencies:**
```swift
// ✅ GOOD - Documents timing
// 50ms delay prevents race condition where
// storeChangeLoadingState(false) arrives before updateRoutes
DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
    useCase.stubbedLoadingState.send(false)
}
```

**Business constraints:**
```swift
// ✅ GOOD - Documents business rule
// Group by 15-second windows to prevent duplicate processing
// of rapid successive uploads in same session
let timeWindow: TimeInterval = 15
```

### Bad Comments

**Obvious code:**
```swift
// ❌ BAD
// Send onAppear action
await sut.send(.onAppear)

// ❌ BAD
// Set loading to true
state.isLoading = true

// ❌ BAD
// Loop through routes
for route in routes {
    if route.isComplete {
        completed.append(route)
    }
}
```

**Better - no comments, clear names:**
```swift
await sut.send(.onAppear)
state.isLoading = true
let completedRoutes = routes.filter { $0.isComplete }
```

### Checklist

- [ ] Does comment explain WHY (decision, constraint)?
- [ ] Is reason non-obvious from code?
- [ ] Would developer make mistake without this?

**All YES → Write comment**
**Any NO → Delete, improve naming instead**

---

## 📊 Logging Best Practices

### Log Errors + Milestones Only

**Good logging:**
```swift
// ✅ SIGNAL - Helps production debugging
logger.info("Upload started: sessionId=\(id), imageCount=\(count)")
logger.error("Upload failed: sessionId=\(id), error=\(error), retry=\(attempt)")
logger.info("Upload completed: sessionId=\(id), duration=\(duration)s")
```

**Why good:** 3 logs per upload, complete picture, useful context

**Bad logging:**
```swift
// ❌ NOISE - 1000 logs/min
logger.debug("Entering loadRoutes()")
logger.debug("Fetching from repository")
logger.debug("x = \(x), y = \(y)")
logger.debug("Exiting loadRoutes()")
```

**Why bad:** Buries errors in noise, obvious from execution

### Checklist

- [ ] Helps debug production issues?
- [ ] ERROR or important MILESTONE?
- [ ] Concise with useful context?

**All YES → Add log**
**Any NO → Use debugger instead**

---

## 🎯 Decision Frameworks

### Should I Write This Test?

```
Q1: Business outcome? ──NO→ SKIP
    ↓ YES
Q2: Production risk? ──NO→ SKIP
    ↓ YES
Q3: Non-trivial logic? ──NO→ SKIP
    ↓ YES
WRITE TEST
```

### Which Layers Does Feature Need?

```
How many data sources?
├─ 1 → Repository + Use Case
└─ 2+ → Repository + Service + Use Case

Complex algorithm?
├─ YES → Add Service
└─ NO → Use Case enough

Result: 3-5 layers (not always 5)
```

### Should I Optimize This?

```
Measure impact
    ↓
P0 (database, images, memory)? ──YES→ FIX NOW
    ↓ NO
P1 (main thread, state)? ──YES→ FIX IF TIME
    ↓ NO
P2 (minor tweaks)? ──YES→ SKIP
```

### Where Should Code Live?

```
Used by 2+ features NOW?
├─ YES → Module (Core/Model/CommonUI)
│         public, add DependencyKey
└─ NO → App layer (feature folder)
          internal, use makeWithDeps

When 2nd use appears → Move to Module
```

---

## 🚀 Workflows & Commands

### Build New Feature

**Fast workflow (4 phases):**
```bash
/ios-feature-lite "add route filtering by status"
```

**Phases:**
- Phase 0: Context analysis (determines what to skip)
- Phase 1: Requirements (MVP + optional)
- Phase 2: Architecture + Data Flow
- Phase 3: Implementation (all layers)
- Phase 4: Testing (signal tests only)

**Result:** 3-5 hours for moderate feature

**Detailed workflow (6-9 phases):**
```bash
/ios-feature-workflow "complex multi-feature integration"
```

**Phases:**
- Phase 0: Context analysis (smart skipping)
- Phase 1: Requirements
- Phase 2: Module Placement (conditional - skipped if single feature)
- Phase 3: Architecture
- Phase 4: Data Flow (conditional - skipped if simple logic)
- Phase 5: Layer Implementation
- Phase 6: TCA Store
- Phase 7: SwiftUI View
- Phase 8A: Business Tests (starts after Phase 5)
- Phase 8B: Presentation Tests (starts after Phase 7)

**Result:** Typical 6-7 phases (skips 2-3), 60-75 min

### Debug Issue

```bash
/ios-debug "route list not updating after upload"
```

**Phases:**
- Phase 1: Parallel analysis (3 agents: problem, data flow, layer isolation)
- Phase 2: Root cause identification
- Phase 3: Parallel implementation (fix + test)
- Phase 4: Verification

**Result:** 60-90 min

### Performance Check

```bash
/ios-performance-check                    # Changed files
/ios-performance-check DigitalShelf/Screens/Routes/
/ios-performance-check --all
```

**Checks:**
- P0 (70%): Database (30%), Images (30%), Publishers (10%)
- P1 (20%): State (10%), Background (10%)
- P2 (10%): UI (5%), Other (5%)

**Result:** 20 seconds, prioritized issue list

### Pre-Merge Validation

```bash
/ios-pre-merge-check
/ios-pre-merge-check --fast              # Skip performance
/ios-pre-merge-check --skip-commits      # Skip commit prep
```

**Phases:**
- Phase 1: SwiftLint auto-fix
- Phase 2: 5 validators parallel (boundaries, architecture, TCA, performance, design)
- Phase 3: Consolidated report
- Phase 4: Commit preparation (optional)

**Result:** 2.7-3.7 min, comprehensive validation

---

## 📊 Agent Categories (When Using Which)

### Foundation Agents (Comprehensive = Signal)

**When to use:** Output feeds into other agents' decisions

**ios-requirements-analyst:**
- Extracts MVP + optional features
- Asks questions for ambiguities
- Output: YAML requirements

**ios-architect:**
- Designs essential layers (not all possible)
- YAGNI - layers needed NOW
- Output: Architecture design

**ios-data-flow-tracer:**
- Traces ALL paths (including edge cases)
- Publisher chains, race conditions
- Output: Complete flow (comprehensive = signal here!)

**ios-debug-analyst:**
- Multiple pattern-based hypotheses
- Observable symptoms only
- Output: Structured problem analysis

**ios-root-cause-finder:**
- Deep dive into THE root cause
- Detailed WHY explanation
- Output: Fix strategy step-by-step

**ios-layer-isolator:**
- Tests ALL 4 layers systematically
- Evidence from bug symptoms
- Output: Which layer is faulty

**ios-module-boundary-validator:**
- Checks ALL module boundaries
- Finds ALL violations (can't miss any)
- Output: Violation list

**Characteristic:** Thorough analysis, used by other agents

---

### Implementation Agents (Focused = Signal)

**When to use:** Generate code/deliverables

**ios-layer-developer:**
- Code needed NOW (no boilerplate)
- YAGNI - no unused helpers
- Output: Models → Repos → Services → Use Cases

**ios-tca-developer:**
- Minimal state (derive, don't store)
- Meaningful actions (not granular)
- Output: TCA Store

**ios-swiftui-designer:**
- Functional & consistent (not pixel-perfect)
- Design system compliance
- Output: SwiftUI View

**ios-feature-developer:**
- MVP fast (not comprehensive slow)
- Essential layers only
- Output: Complete working feature

**Characteristic:** YAGNI principle, ship MVP

---

### Validation Agents (Prioritized = Signal)

**When to use:** Find issues to fix

**ios-testing-specialist:**
- 3-Question Rule for every test
- Signal tests > noise tests
- Output: High-value test suite

**ios-performance-analyzer:**
- Weighted: P0 (70%), P1 (20%), P2 (10%)
- Fix P0 first, skip P2
- Output: Prioritized issue list

**Characteristic:** Focus on critical issues

---

### Decision Agents (Clear Choice = Signal)

**When to use:** Need recommendation

**ios-module-placement:**
- Binary: Module or App
- Based on CURRENT usage (not "might be")
- Output: Clear placement decisions

**ios-git-commit-squasher:**
- Algorithmic: factors met or not
- Single recommendation (not alternatives)
- Output: Squash command ready

**ios-context-analyzer:**
- Determines workflow phases
- Eager: include when doubt
- Output: Skip decisions

**Characteristic:** Make decision, not explore options

---

## 🔧 Practical Workflows

### Building Feature (Step-by-Step)

**1. Start workflow (choose one):**
```bash
/ios-feature-lite "description"      # Fast (4-5 phases)
/ios-feature-workflow "description"  # Detailed (6-9 phases)
```

**2. Phase 0 - Context Analysis:**
- Reviews complexity
- Determines which phases to skip
- Recommends workflow
- **Action:** Review, proceed

**3. Phase 1 - Requirements:**
- Extracts MVP + optional
- Asks clarifying questions
- **Action:** Answer questions, approve

**4. Phase 2 - Architecture:**
- Essential layers only (YAGNI)
- Module placement (if cross-cutting)
- Data flow (if not simple)
- **Action:** Approve design

**5. Phase 3+ - Implementation:**
- Bottom-up: Models → Data → Business → Presentation
- Code needed NOW
- **Action:** Review code, approve writes

**6. Testing:**
- Signal tests only (3-Question Rule)
- **Action:** Review, approve

**7. Validation:**
```bash
/ios-performance-check    # P0 issues
/ios-pre-merge-check      # Full validation
```
- Fix P0 (blocks merge)
- Accept P1/P2 warnings
- **Action:** Fix critical, create PR

**Total time:** 3-5 hours typical feature

---

### Debugging (Step-by-Step)

**1. Start debug:**
```bash
/ios-debug "route list not updating after upload"
```

**2. Phase 1 - Analysis (3 agents parallel):**
- ios-debug-analyst: Pattern-based hypotheses
- ios-data-flow-tracer: Trace publisher chain
- ios-layer-isolator: Test all 4 layers
- **Action:** Review combined analysis

**3. Phase 2 - Root Cause:**
- Reads suspected files
- Identifies exact issue
- Designs fix strategy
- **Action:** Approve fix approach

**4. Phase 3 - Implementation (2 agents parallel):**
- ios-layer-developer: Generate fix
- ios-testing-specialist: Regression test
- **Action:** Review code, approve writes

**5. Phase 4 - Verification:**
- Test execution analysis
- Manual steps
- **Action:** Verify fix works

**Total time:** 60-90 min

---

## ✅ Code Review Checklist

### P0 - Must Fix (Blocks Merge)

**Architecture:**
- [ ] No Repository→Repository dependencies?
- [ ] Service created if combining repos?
- [ ] No Core→App imports?
- [ ] Use Case doesn't have DependencyKey?

**TCA Critical:**
- [ ] No @Dependency in TaskGroup?
- [ ] @ObservableState on State structs?
- [ ] BindingReducer() first in reducer?
- [ ] Publishers cancelled in onDisappear?

**Performance:**
- [ ] No N+1 queries?
- [ ] Image processing async?
- [ ] Publishers have .share() where needed?

**Tests:**
- [ ] Critical user journeys tested?
- [ ] Error handling tested?

**Verdict:** Any P0 failed → Request changes

### P1 - Should Fix (Comment)

- [ ] Tests follow 3-Question Rule?
- [ ] No tests of obvious code?
- [ ] Comments explain WHY (not WHAT)?
- [ ] Colors from enum?
- [ ] L10n constants?

**Verdict:** All P0 passed → Approve (comment on P1)

---

## 📐 Measuring Success

### Weekly Self-Audit

**Track signal vs noise:**

**Signal work:**
- Tests catching bugs: ___ hours
- Features users need: ___ hours
- P0 performance fixes: ___ hours
- Architecture preventing issues: ___ hours

**Noise work:**
- Tests of obvious code: ___ hours
- Over-engineering: ___ hours
- Micro-optimizations: ___ hours
- Perfect architecture debates: ___ hours

**Signal ratio = signal / (signal + noise)**

**Goal:** >80%

### Expected Outcomes

**With signal-first approach:**
- ⏱️ 40% faster development
- 🐛 Same or better bug detection
- 🔧 70% easier maintenance
- 📊 Higher code clarity

**Measured by:**
- Features shipped per week
- Time from start to production
- Tests catching real bugs (not coverage %)
- Refactor frequency (unused code = high refactors)

---

## 🎯 Quick Reference Cheat Sheet

| Area | Signal | Noise | Question |
|------|--------|-------|----------|
| **Testing** | User journeys, errors, complex logic | Obvious properties, framework code | "What bug does this catch?" |
| **Architecture** | Layers needed NOW | Future-proofing, 1-use abstractions | "Needed NOW or maybe later?" |
| **Performance** | P0 (70%): DB, images, memory | P2 (10%): Cold paths, minor tweaks | "What's measured impact?" |
| **Comments** | WHY (race, business rules) | WHAT (obvious from code) | "Is this non-obvious?" |
| **Logging** | Errors, milestones | Function entry/exit, variables | "Helps debug production?" |
| **UI** | Functional, consistent | Pixel-perfect, premature polish | "Affects completing task?" |
| **Module** | Used 2+ places NOW | Might be reused later | "Reused NOW or maybe?" |

---

## 💡 Common Pitfalls

### 1. "Comprehensive Coverage"

**Mistake:** "Need 90% test coverage!"

**Reality:** Coverage % ≠ test quality

**Solution:** Track "bugs caught per test" not "%"

### 2. "Perfect Architecture"

**Mistake:** "Design for all future scenarios"

**Reality:** Future is uncertain, perfect = wrong

**Solution:** YAGNI - add when needed

### 3. "Best Practices Everywhere"

**Mistake:** "Every repo needs full error handling"

**Reality:** Validate at boundaries only

**Solution:** Handle real errors, not theoretical

### 4. "Optimize Everything"

**Mistake:** "Found issue, must fix"

**Reality:** P2 cold path ≠ P0 hot path

**Solution:** Weighted priority, fix P0

---

## 🌟 Success Pattern

**High-performing developers:**
1. Ask "What's the value?" before work
2. Use decision frameworks (3-Question, YAGNI, Weighted)
3. Ship working code fast (MVP > perfect)
4. Add complexity when concrete need
5. Measure signal ratio (>80%)

**Result:**
- 40% faster shipping
- Same/better quality
- 70% less maintenance
- Higher satisfaction (meaningful work)

---

**Remember:** Signal vs Noise is discipline. Practice asking "What's the value?" until automatic. Be rigorous about signal, ruthless about noise.
