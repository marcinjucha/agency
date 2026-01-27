---
name: notion-integration
description: Notion workspace integration for Legal-Mind. Use when working with Notion MCP tools, task status updates, or project tracking.
---

# Notion Integration

**Purpose:** Patterns for Notion MCP integration in Legal-Mind workflows.

---

## Database IDs

**Agency Tasks:**
- Database ID: `29284f14-76e0-8012-8708-f1c5d3a78386`
- Collection URL: `collection://29284f14-76e0-8062-a18d-000bfce0cf23`

**Agency Projects:**
- Database ID: `29284f14-76e0-8065-ae11-ebe3685f4c02`
- Collection URL: `collection://29284f14-76e0-802f-a1de-000b357345a9`

---

## Status Values (CASE-SENSITIVE)

**Tasks:**
- ✅ `"Not Started"`, `"In Progress"`, `"On Hold"`, `"Done"`, `"Cancelled"`
- ❌ Wrong: `"in_progress"`, `"in-progress"`

**Projects:**
- `"Planning"`, `"In Progress"`, `"On Hold"`, `"Done"`, `"Cancelled"`

**Type (with emoji):**
- `"💰 Revenue"` - Client delivery
- `"📈 Growth"` - Sales/marketing
- `"🎓 Learning"` - Personal skills (**SKIP in agents**)
- `"⚙️ Operations"` - Internal efficiency
- `"🏗️ Infrastructure"` - Scale enablers

---

## Skills Projects Filter (CRITICAL)

**Always filter out Type = "🎓 Learning":**

```typescript
// Check project Type
const projectType = project.properties["Type"]?.select?.name;
if (projectType === "🎓 Learning") {
  return null; // SKIP - Personal learning
}

// PROCESS - Agency work (Revenue, Growth, Operations, Infrastructure)
```

---

## Read Pattern (Phase 0)

```typescript
// Search for tasks
const searchResults = await mcp__notion__notion-search({
  query: "In Progress",
  query_type: "internal"
});

// Fetch full task details
const taskDetails = await mcp__notion__notion-fetch({
  id: taskId
});
```

See: [@resources/mcp-examples.md](./resources/mcp-examples.md) for complete examples.

---

## Update Pattern (Phase 8)

```typescript
// Change status to "Done"
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "update_properties",
    properties: {
      "Status": "Done"
    }
  }
});

// Add completion notes
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

## Integration Flow

```
1. Agents read from Notion (tasks "In Progress")
2. Filter out Skills Projects (Type = 🎓 Learning)
3. Execute implementation
4. Update Notion status to "Done"
5. Reference local docs for architecture context
```

---

## Task Properties

| Property | Purpose |
|----------|---------|
| `Name` | Task title |
| `Status` | Current state |
| `Priority` | 🔴 Urgent > 🟠 High > 🟡 Medium > 🟢 Low |
| `Type` | Portfolio category (Revenue, Growth, etc.) |
| `Notes` | Detailed acceptance criteria |
| `📊 Projects` | Link to project |
| `Deadline` | Due date |

---

## Error Handling

**Notion unavailable:**
1. Log warning
2. Fall back to local plan in `~/.claude/plans/`
3. Read PROJECT_SPEC.yaml for context
4. Continue with available data

**Task not found:**
- Invalid ID: Ask user to verify
- No Notes: Use PROJECT_SPEC.yaml acceptance criteria
- Skills Project: Skip, log "Skills Project ignored"

See: [@resources/database-schema.md](./resources/database-schema.md) for full schema details.
