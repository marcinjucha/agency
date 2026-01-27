# Notion MCP Examples

## Search Tasks

```typescript
// Search for tasks with status "In Progress"
const searchResults = await mcp__notion__notion-search({
  query: "In Progress",
  query_type: "internal"
});

// Search within specific database
const tasksSearch = await mcp__notion__notion-search({
  query: "In Progress Revenue",
  query_type: "internal",
  data_source_url: "collection://29284f14-76e0-8062-a18d-000bfce0cf23"
});
```

---

## Fetch Task Details

```typescript
// Fetch full task details by ID
const taskDetails = await mcp__notion__notion-fetch({
  id: taskId
});

// Parse properties
const taskName = taskDetails.properties.Name;
const taskNotes = taskDetails.properties.Notes;
const projectRelation = taskDetails.properties["📊 Projects"];
```

---

## Update Task Status

```typescript
// Change status from "In Progress" to "Done"
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "update_properties",
    properties: {
      "Status": "Done"  // Case-sensitive!
    }
  }
});
```

---

## Add Completion Notes

```typescript
// Insert content after existing Notes section
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "insert_content_after",
    selection_with_ellipsis: "## Notes...",
    new_str: `

## Completion Summary
- Implementation complete
- All acceptance criteria met
- Build verified successfully`
  }
});
```

---

## Create Documentation Page

```typescript
const docDbId = "29384f14-76e0-80f8-9668-000bf49a79be";

await mcp__notion__notion-create-pages({
  parent: { data_source_id: docDbId },
  pages: [{
    properties: {
      "title": "Implementation Notes: [Feature Name]"
    },
    content: `# Implementation Notes

## Overview
[Brief summary]

## Key Decisions
- [Decision 1]
- [Decision 2]

## Files Changed
- [File 1]
- [File 2]
`
  }]
});
```

---

## Filter Skills Projects

```typescript
// Fetch project to check Type
const project = await mcp__notion__notion-fetch({ id: projectId });

// Method 1: Check Type property (PRIMARY)
const projectType = project.properties["Type"]?.select?.name;
if (projectType === "🎓 Learning") {
  // SKIP - Personal learning
  return null;
}

// Method 2: Check Skills Projects relation (FALLBACK)
if (project.properties["📚 Skills Projects"]?.length > 0) {
  // SKIP - Skills Project
  return null;
}

// PROCESS - Agency work
```

---

## Natural Language Task Search

```typescript
// User says: "Pracujmy nad kalendarzem"
const topic = "kalendarzem";

// Query Notion
const tasks = await mcp__notion__notion-search({
  query: `In Progress ${topic}`,
  query_type: "internal",
  data_source_url: "collection://29284f14-76e0-8062-a18d-000bfce0cf23"
});

// Filter out Skills Projects
const agencyTasks = tasks.filter(task => {
  const projectType = task.properties["📊 Projects"]?.Type;
  return projectType !== "🎓 Learning";
});

// Sort by priority
agencyTasks.sort((a, b) => {
  const priorityOrder = {
    "🔴 Urgent": 1,
    "🟠 High": 2,
    "🟡 Medium": 3,
    "🟢 Low": 4
  };
  return (priorityOrder[a.properties.Priority] || 5) -
         (priorityOrder[b.properties.Priority] || 5);
});
```

---

## Error Handling

```typescript
try {
  const task = await mcp__notion__notion-fetch({ id: taskId });
} catch (error) {
  // Graceful fallback
  console.log("Notion API unavailable, falling back to local files");

  // Read from local plan
  const localPlan = await readFile("~/.claude/plans/current.md");

  // Read PROJECT_SPEC.yaml for context
  const spec = await readFile("docs/PROJECT_SPEC.yaml");
}
```

---

## Complete Workflow Example

```typescript
// Phase 0: Read from Notion
const task = await mcp__notion__notion-fetch({ id: taskId });
const projectType = task.properties["📊 Projects"]?.Type;

// Skip if Skills Project
if (projectType === "🎓 Learning") {
  console.log("Skipped Skills Project");
  return;
}

// Phase 1-7: Execute implementation
// ...

// Phase 8: Update Notion
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "update_properties",
    properties: { "Status": "Done" }
  }
});

await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "insert_content_after",
    selection_with_ellipsis: "## Notes...",
    new_str: "\n\n## Completion Summary\n- Implementation complete"
  }
});
```
