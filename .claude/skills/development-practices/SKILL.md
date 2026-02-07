---
name: development-practices
description: AI Agency development practices and decision frameworks. Use when making testing decisions, architecture choices, or performance optimizations.
---

# Development Practices

## Purpose

Project-specific development practices and decision frameworks for AI Agency.

---

## Testing: 3-Question Rule

**Before writing ANY test, ask:**

1. ❓ Does test verify **business outcome** (not implementation)?
2. ❓ Would lack of test increase **production risk**?
3. ❓ Is logic **non-trivial** (>3 conditions OR caused bugs before)?

**If ANY answer is NO → Skip the test**

### ✅ Write These Tests

```typescript
// Complete user journey (passes all 3 questions)
test('lawyer creates survey, generates link, client submits form', async () => {
  const survey = await createSurvey({ title: 'Client Intake' })
  const link = await generateSurveyLink(survey.id)
  const response = await submitSurveyResponse(link.token, { answers: {...} })
  const responses = await getResponses()
  expect(responses).toHaveLength(1)
})

// Error handling (passes all 3)
test('expired survey link shows error to client', async () => {
  const expiredLink = await createExpiredLink()
  const result = await submitSurveyResponse(expiredLink.token, { answers: {...} })
  expect(result.error).toBe('Link expired')
})
```


---

## Performance: Weighted Priority

**Fix critical issues first, skip micro-optimizations.**

### P0 - Production Blockers (70% of time)

**Database N+1 Queries (30%):**

Avoid separate queries per item. Use joins to fetch related data in one query.

**Large Data Serialization (30%):**

Select only needed fields, not `SELECT *`. Reduces payload size and improves load time.

**Missing TanStack Query Cache (10%):**

Use TanStack Query in CMS app for automatic caching and request deduplication.

### P1 - Engineering Quality (20% of time)
- Unnecessary re-renders
- Client-side data fetching (should be RSC)
- Missing error boundaries

### P2 - Nice to Have (10% or skip)
- Minor bundle size optimizations
- Image format optimizations
- Cold path improvements

**Rule:** Fix P0 first, P1 if time, skip P2.

---

## Architecture: Decision Frameworks

### Simple Feature = Simple Architecture

**Match complexity to actual need:**

```
User profile screen (3 layers):
✅ Types → Queries/Actions → Component

❌ Over-engineered (5 layers):
User + UserProfile + UserSettings types
→ UserRepository + ProfileRepository
→ UserProfileService + ValidationService
→ LoadUseCase + UpdateUseCase
→ Multiple components
```

**Why simpler wins:**
- Half the files (3 vs 10+)
- Faster to build (2h vs 4h)
- Easier to change
- No unused code

**Add complexity when second use appears.**

### Shared Package Decision

**Create shared package when:**
- ✅ Used by 2+ apps NOW (CMS + Website)
- ✅ Type definitions (database types)
- ✅ UI components (forms, buttons)

**Keep in app when:**
- ✅ Single app usage
- ✅ Feature-specific logic
- ✅ Not yet reused

**Example:**

```typescript
// ✅ Shared package needed (used by both apps)
packages/ui/src/components/Button.tsx
packages/database/src/types.ts
packages/validators/src/survey.ts

// ✅ App-specific (only CMS uses)
apps/cms/features/surveys/actions.ts
apps/cms/features/responses/queries.ts
```

### External Service Integration (Fire-and-Forget)

**Pattern:** Don't block user requests for long-running external operations.

**When to use fire-and-forget:**
- ✅ Operation takes >2s (AI, external API)
- ✅ User doesn't need immediate result
- ✅ Retry logic needed (network failures)

**Implementation (Survey AI Analysis):**

```typescript
// apps/website/app/api/survey/submit/route.ts

// 1. Save to database (fast, user needs confirmation)
const response = await supabase.from('responses').insert({...})

// 2. Trigger background processing (fire-and-forget)
if (process.env.N8N_WEBHOOK_URL) {
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ responseId: response.id, ... })
  }).catch(err => console.error('[N8N]:', err))
  // NO await - user doesn't wait for AI (5-8s)
}

// 3. Return immediately
return Response.json({ success: true })
```

**Why fire-and-forget:**
- User gets instant feedback (200ms vs 5-8s)
- Resilient (n8n retries on failure)
- Scalable (n8n handles queue)

**See:** `n8n-workflows` skill for full pattern.

---

## Monorepo Structure (ADR-005)

**Rule:** `app/` = Routing ONLY, `features/` = Logic

```
apps/cms/features/surveys/
├── components/          # UI
├── actions.ts          # Server Actions
└── queries.ts          # Data fetching
```

**Why:** Enables code reuse, prevents mixing concerns

---

## Code Review Checklist

### P0 - Must Fix (Blocks Merge)

**Architecture:**
- [ ] Features in `features/` folder (not `app/`)?
- [ ] Server Actions use server client?
- [ ] Queries use browser client?
- [ ] No sensitive data in client components?

**Next.js Critical:**
- [ ] `'use server'` in Server Actions?
- [ ] `'use client'` in Client Components?
- [ ] `revalidatePath()` after mutations?
- [ ] No `await` on browser client?

**Performance:**
- [ ] No N+1 queries?
- [ ] Select only needed fields?
- [ ] TanStack Query for CMS data fetching?

**Security:**
- [ ] RLS policies enforce tenant isolation?
- [ ] No service role key in client code?
- [ ] User authentication checked in Server Actions?

**Verdict:** Any P0 failed → Request changes

### P1 - Should Fix (Comment)

- [ ] Tests follow 3-Question Rule?
- [ ] No tests of obvious code?
- [ ] Comments explain WHY (not WHAT)?
- [ ] Error states handled?
- [ ] Loading states shown?

**Verdict:** All P0 passed → Approve (comment on P1)

---

## Quick Reference

| Area | Decision | Framework |
|------|----------|-----------|
| **Testing** | Write or skip? | 3-Question Rule (business outcome, risk, non-trivial) |
| **Performance** | Optimize now? | Weighted Priority (P0 70%, P1 20%, P2 skip) |
| **Architecture** | How many layers? | Simple Feature = Simple Architecture (2-4 layers) |
| **Shared Package** | Create or not? | Used by 2+ apps NOW? |
| **Abstraction** | Create or wait? | Wait for 2+ concrete uses |
| **Comments** | Add or skip? | Only WHY (non-obvious decisions, timing, constraints) |
| **Logging** | Log or skip? | Errors + Milestones only |
