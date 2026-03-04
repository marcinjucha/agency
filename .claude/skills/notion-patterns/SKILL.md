---
name: notion-patterns
description: Use when working with Notion MCP tools — task status updates, project tracking, workspace integration. Critical: Notion properties are CASE-SENSITIVE (silent failure if wrong case). Contains database IDs and filter rules for Agency Tasks/Projects.
---

# Notion Patterns

## Database IDs

**Agency Tasks:** `29284f14-76e0-8012-8708-f1c5d3a78386`
**Agency Projects:** `29284f14-76e0-8065-ae11-ebe3685f4c02`

---

## CRITICAL: Properties Are Case-Sensitive

**Wrong case = silent failure. Task appears unchanged in Notion.**

```typescript
// Wrong - silent failure
{ "status": "done" }

// Correct - exact match required
{ "Status": "Done" }
```

**How to verify correct case:** Fetch page first (`notion-fetch`), check property names in response, use exact spelling.

---

## Status Values (Case-Sensitive)

**Tasks:** `"Not Started"` | `"In Progress"` | `"On Hold"` | `"Done"` | `"Cancelled"`

**Projects:** `"Planning"` | `"In Progress"` | `"On Hold"` | `"Done"` | `"Cancelled"`

---

## Filter Rule: Always Exclude Type = "🎓 Learning"

Personal learning projects — not agency work. Always filter out.

```typescript
const projectType = project.properties["Type"]?.select?.name;
if (projectType === "🎓 Learning") return null; // SKIP

// PROCESS: Revenue, Growth, Operations, Infrastructure
```

Fallback check: `project.properties["📚 Skills Projects"]?.length > 0` → also skip.

---

## Read Pattern (Phase 0)

`notion-search` → `notion-fetch`

```typescript
const results = await mcp__notion__notion-search({
  query: "In Progress",
  query_type: "internal",
  data_source_url: "collection://29284f14-76e0-8062-a18d-000bfce0cf23"
});

const task = await mcp__notion__notion-fetch({ id: taskId });
```

---

## Update Pattern (Phase 8)

Two steps: status update (machine-readable) + comment (human context).

```typescript
// Step 1: Update status
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "update_properties",
    properties: { "Status": "Done" }
  }
});

// Step 2: Add completion notes
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "insert_content_after",
    selection_with_ellipsis: "## Notes...",
    new_str: "\n\n## Completion Summary\n- Implementation complete"
  }
});
```

---

## Graceful Fallback

Notion unavailable should not block workflow. Try/catch, log warning, continue.

```typescript
try {
  const task = await mcp__notion__notion-fetch({ id: taskId });
} catch (error) {
  console.log("Notion API unavailable, falling back to local files");
  // Fall back to: ~/.claude/plans/ and docs/PROJECT_SPEC.yaml
}
```

---

## References

- `@resources/database-schema.md` - Full database schema and property details
- `@resources/mcp-examples.md` - Complete MCP tool usage examples
