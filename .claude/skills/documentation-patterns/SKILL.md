---
name: documentation-patterns
description: Use when updating project documentation after implementation. Covers PROJECT_SPEC.yaml updates (task status, completion notes), Notion task sync, and progress tracking. Focus on outcomes (what user can do now), not implementation details.
---

# Documentation Patterns - Progress & Outcome Tracking

## Purpose

Document implementation outcomes: update PROJECT_SPEC.yaml with completed tasks, sync Notion status, track progress. Focus on WHAT user can do now (outcomes), not HOW it was built (implementation).

## When to Use

- Implementation complete (need docs update)
- Task finished (mark as done in Notion)
- Feature deployed (update PROJECT_SPEC)
- Progress tracking (percentage completion)

## Critical Pattern: Signal vs Noise in Docs

**SIGNAL (document this):**
```yaml
✅ Outcomes - What user can do now:
  "Lawyers can now create surveys with 7 question types"

✅ Milestones - What's complete:
  "Survey submission feature complete"

✅ Impact - Why this matters:
  "Clients can submit responses anonymously"

✅ Status changes:
  task_status: pending → in_progress → done
  acceptance_criteria_verified: false → true
```

**NOISE (skip this):**
```yaml
❌ Implementation details:
  "Used Controller instead of register for checkboxes"
  "Created QuestionField.tsx with conditional rendering"

❌ File-level changes:
  "Modified apps/website/features/survey/components/SurveyForm.tsx"
  "Added 15 lines to validation.ts"

❌ Technical trivia:
  "Used React Hook Form with zodResolver"
  "Implemented dynamic Zod schema generation"
```

**Why:** Documentation for users/stakeholders, not developers. Outcomes matter, not code structure.

## PROJECT_SPEC.yaml Updates

**Pattern: Task completion**

```yaml
# Before:
tasks:
  - id: survey-submission
    name: "Survey Submission Feature"
    status: in_progress
    acceptance_criteria:
      - criterion: "Clients can submit survey responses"
        verified: false

# After:
tasks:
  - id: survey-submission
    name: "Survey Submission Feature"
    status: done
    completion_notes: "Feature deployed. Clients can submit responses via public links."
    acceptance_criteria:
      - criterion: "Clients can submit survey responses"
        verified: true
        verification_date: "2025-01-26"
```

**Fields to update:**
- `status`: pending → in_progress → done
- `acceptance_criteria[].verified`: false → true
- `acceptance_criteria[].verification_date`: add date
- `completion_notes`: outcome summary

## Notion Task Sync

**Pattern: Status update with MCP tools**

```typescript
// Update task status
await mcp.notion.updatePage({
  page_id: "task-id",
  command: "update_properties",
  properties: {
    "Status": "Done",  // Case-sensitive!
    "Completion Date": "2025-01-26"
  }
})

// Add completion comment
await mcp.notion.createComment({
  parent: { page_id: "task-id" },
  rich_text: [{
    text: { content: "Survey submission feature complete. Clients can now submit responses." }
  }]
})
```

**Critical: Notion is case-sensitive**
- Status values: "Done" (not "done")
- Property names: exact match ("Completion Date" not "completion_date")

## Quick Reference

**Documentation checklist:**
```yaml
- [ ] PROJECT_SPEC.yaml updated (task status → done)
- [ ] Acceptance criteria marked verified
- [ ] Completion notes added (outcome-focused)
- [ ] Notion task status updated (if task_id exists)
- [ ] Notion comment added (optional, for context)
```

**Outcome-focused template:**

```
Feature: [Name]
Status: Done

What's now possible:
- [User capability 1]
- [User capability 2]

Acceptance criteria verified:
✅ [Criterion 1]
✅ [Criterion 2]

Impact:
[Why this matters to users/business]
```

**Commands:**

```bash
# Verify PROJECT_SPEC syntax
yq eval '.tasks[] | select(.id == "task-id")' docs/PROJECT_SPEC.yaml

# Check Notion task
# (Use MCP tools via Claude)
```

## Real Project Example

**Phase 2 Survey Feature Documentation:**

```yaml
# PROJECT_SPEC.yaml update
tasks:
  - id: survey-public-access
    name: "Public Survey Access"
    status: done
    completion_notes: >
      Survey submission feature complete. Clients can access surveys via public
      links, submit responses with 7 question types, and receive confirmation.

    acceptance_criteria:
      - criterion: "Clients access survey via public link"
        verified: true
        verification_date: "2025-01-25"
      - criterion: "Submit responses with validation"
        verified: true
        verification_date: "2025-01-25"
      - criterion: "Handle expired/maxed links gracefully"
        verified: true
        verification_date: "2025-01-25"

# Notion sync
Status: Done
Comment: "Public survey feature deployed. 7 question types supported, validation working, edge cases handled."
```

**Notice:** Outcome-focused ("clients can..."), not implementation ("created SurveyForm.tsx")

## Anti-Patterns

### ❌ Implementation Details in Docs

**Problem:** Documenting HOW instead of WHAT

```yaml
# ❌ NOISE
Completion notes: >
  Created SurveyForm component using React Hook Form with zodResolver.
  Used Controller for checkbox arrays instead of register. Implemented
  dynamic schema generation with Zod. Added QuestionField with conditional
  rendering for 7 types.

# ✅ SIGNAL
Completion notes: >
  Survey submission feature complete. Clients can submit responses with
  7 question types (text, email, checkbox, etc.). Validation enforced,
  edge cases handled (expired links, max submissions).
```

**Why wrong:** Users don't care about Controller vs register. They care about question types working.

### ❌ Missing Verification Dates

**Problem:** Acceptance criteria marked verified but no date

```yaml
# ❌ WRONG
acceptance_criteria:
  - criterion: "Feature works"
    verified: true
    # No date!

# ✅ CORRECT
acceptance_criteria:
  - criterion: "Feature works"
    verified: true
    verification_date: "2025-01-26"
```

**Why wrong:** Can't track when criteria met (important for audits)

### ❌ Case-Insensitive Notion Updates

**Problem:** Using wrong case for Notion properties

```yaml
# ❌ WRONG
properties: {
  "status": "done"  # Wrong case!
}

# ✅ CORRECT
properties: {
  "Status": "Done"  # Exact match from Notion schema
}
```

**Why wrong:** Notion MCP API is case-sensitive, update silently fails

---

**Key Lesson:** Document outcomes (what user can do), not implementation (how it was built). Verify acceptance criteria with dates.
