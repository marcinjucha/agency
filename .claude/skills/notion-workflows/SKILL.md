---
name: notion-workflows
description: Use when syncing tasks with Notion workspace. Covers MCP tool patterns (case-sensitive properties), task status updates, and graceful fallbacks. Critical for avoiding silent failures from case mismatches.
---

# Notion Workflows - Task Sync & MCP Patterns

## Purpose

Notion task sync patterns: MCP tool usage (case-sensitive!), status updates, graceful fallbacks. Prevent silent failures from property name/value mismatches.

## When to Use

- Syncing task status to Notion
- Updating Notion properties (Status, dates)
- Adding comments to tasks
- Notion integration failures (debugging)

## Critical Pattern: Case-Sensitive Properties

**Notion MCP API is case-sensitive - exact match required**

```typescript
// ❌ WRONG - Silent failure
await mcp.notion.updatePage({
  page_id: "123",
  command: "update_properties",
  properties: {
    "status": "done"  // Wrong case! Property not updated.
  }
})

// ✅ CORRECT - Exact match
await mcp.notion.updatePage({
  page_id: "123",
  command: "update_properties",
  properties: {
    "Status": "Done"  // Exact match from Notion schema
  }
})
```

**Why critical:** Wrong case = silent failure. Task appears unchanged in Notion.

**How to verify correct case:**
1. Fetch page first (mcp.notion.fetch)
2. Check property names in response
3. Use exact spelling/case

## Task Status Update Pattern

**Pattern: Update + Comment**

```typescript
// Step 1: Update status
await mcp.notion.updatePage({
  page_id: task_id,
  command: "update_properties",
  properties: {
    "Status": "Done",  // Case-sensitive!
    "Completion Date": new Date().toISOString().split('T')[0]
  }
})

// Step 2: Add context comment (optional)
await mcp.notion.createComment({
  parent: { page_id: task_id },
  rich_text: [{
    type: "text",
    text: {
      content: "Survey submission feature complete. Clients can now submit responses."
    }
  }]
})
```

**Why two steps:** Status update = machine-readable, comment = human context

## Graceful Fallback Pattern

**Pattern: Handle Notion unavailable**

```typescript
async function syncNotionTask(task_id: string, status: string) {
  if (!task_id) {
    console.log("No Notion task_id, skipping sync")
    return
  }

  try {
    await mcp.notion.updatePage({
      page_id: task_id,
      command: "update_properties",
      properties: { "Status": status }
    })
    console.log(`✅ Notion task ${task_id} updated`)
  } catch (error) {
    console.warn(`⚠️ Notion sync failed: ${error.message}`)
    console.warn("Continuing without Notion sync (not critical)")
    // Don't throw - Notion failure shouldn't block docs update
  }
}
```

**Why graceful:** Notion unavailable shouldn't block entire workflow

## Quick Reference

**Common property names (case-sensitive):**

```yaml
Status: "To Do" | "In Progress" | "Done"  # Exact values from Notion
Priority: "High" | "Medium" | "Low"
Completion Date: "YYYY-MM-DD"
Owner: { id: "user-id" }  # User ID, not name
```

**MCP tool patterns:**

```typescript
// Fetch page (get schema)
mcp.notion.fetch({ id: "page-id" })

// Update properties
mcp.notion.updatePage({
  page_id: "page-id",
  command: "update_properties",
  properties: { "Property Name": value }
})

// Add comment
mcp.notion.createComment({
  parent: { page_id: "page-id" },
  rich_text: [{ type: "text", text: { content: "..." } }]
})

// Search tasks
mcp.notion.search({
  query: "survey",
  query_type: "internal"
})
```

**Debugging commands:**

```bash
# Via Claude (MCP tools)
# 1. Fetch page to see exact property names
# 2. Check response for capitalization
# 3. Use exact spelling in update
```

## Real Project Example

**Phase 2 Survey Task Sync:**

```typescript
// Fetch to verify property names
const page = await mcp.notion.fetch({ id: "task-id" })
// Response shows: "Status" (capital S), "Completion Date" (capital C, D)

// Update with exact case
await mcp.notion.updatePage({
  page_id: "task-id",
  command: "update_properties",
  properties: {
    "Status": "Done",  // Exact match
    "Completion Date": "2025-01-26"
  }
})

// Add context
await mcp.notion.createComment({
  parent: { page_id: "task-id" },
  rich_text: [{
    type: "text",
    text: {
      content: "Survey feature deployed. 7 question types working, validation enforced."
    }
  }]
})

// Result: ✅ Task marked Done in Notion with context comment
```

## Anti-Patterns

### ❌ Case-Insensitive Updates

**Problem:** Using lowercase property names

```typescript
// ❌ WRONG
properties: {
  "status": "done",          // Wrong case
  "completion date": "..."   // Wrong case
}

// Result: Silent failure, task not updated

// ✅ CORRECT
properties: {
  "Status": "Done",              // Exact match
  "Completion Date": "2025-01-26"  // Exact match
}
```

**Why wrong:** Notion API case-sensitive, no error thrown (silent fail)

### ❌ Notion Failure Blocks Workflow

**Problem:** Throwing error when Notion unavailable

```typescript
// ❌ WRONG
await syncNotionTask(task_id)  // Throws if Notion unavailable
// Entire docs update blocked!

// ✅ CORRECT
try {
  await syncNotionTask(task_id)
} catch (error) {
  console.warn("Notion sync failed, continuing")
  // Docs update continues
}
```

**Why wrong:** Notion is supplementary. Docs update should proceed even if Notion fails.

### ❌ Missing task_id Check

**Problem:** Attempting sync without task_id

```typescript
// ❌ WRONG
await mcp.notion.updatePage({
  page_id: undefined,  // Crashes!
  properties: { "Status": "Done" }
})

// ✅ CORRECT
if (task_id) {
  await mcp.notion.updatePage({
    page_id: task_id,
    properties: { "Status": "Done" }
  })
} else {
  console.log("No Notion task_id, skipping sync")
}
```

**Why wrong:** Not all tasks have Notion IDs (some local-only)

---

**Key Lesson:** Notion API is case-sensitive (exact match required). Handle failures gracefully (don't block workflow).
