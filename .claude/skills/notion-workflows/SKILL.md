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
await mcp.notion.updatePage({
  page_id: "123",
  command: "update_properties",
  properties: {
    "status": "done"  // Wrong case! Property not updated.
  }
})

// ✅ - Exact match
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

1. Update status (machine-readable)
2. Add comment (human context)

**Why two steps:** Status for filtering, comment for details

## Graceful Fallback Pattern

**Pattern:** Try/catch Notion updates, log warning on failure, don't throw

**Why graceful:** Notion unavailable shouldn't block workflow

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

**Phase 2 Survey Task Sync:** Fetch to verify property names → Update with exact case → Add comment

**Result:** Task marked Done in Notion with context

