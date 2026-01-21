# Notion Integration Guide

**Last Updated:** January 21, 2026

## Overview

Notion is the **source of truth** for task tracking and roadmap. Agents read tasks from Notion, execute implementation, and update status back to Notion.

**Local docs** (PROJECT_SPEC.yaml, ARCHITECTURE.md) provide **WHY context** (architecture decisions, tech stack rationale), not WHAT to build (task details).

---

## Notion Schema

### Agency Tasks Table

**Database ID:** `29284f14-76e0-8012-8708-f1c5d3a78386`
**Collection URL:** `collection://29284f14-76e0-8062-a18d-000bfce0cf23`

**Key Properties:**
- `Name` (title) - Task name
- `Status` (select) - **"Not Started", "In Progress", "On Hold", "Done", "Cancelled"**
- `Priority` (select) - "🔴 Urgent", "🟠 High", "🟡 Medium", "🟢 Low"
- `Type` (select) - "🚀 Delivery", "📝 Documentation", etc.
- `Notes` (text) - Task description with acceptance criteria
- `Deadline` (date)
- `Hours` (number)
- `📊 Projects` (relation) - Link to Projects database
- `👥 Client` (relation) - Link to Clients database

**IMPORTANT:** Status values are **case-sensitive with spaces**:
- ✅ Correct: `"In Progress"`
- ❌ Wrong: `"in_progress"` or `"in-progress"`

### Agency Projects Table

**Database ID:** `29284f14-76e0-8065-ae11-ebe3685f4c02`
**Collection URL:** `collection://29284f14-76e0-802f-a1de-000b357345a9`

**Key Properties:**
- `Name` (title) - Project name
- `Status` (select) - **"Planning", "In Progress", "On Hold", "Done", "Cancelled"**
- `Type` (select) - **"💰 Revenue", "📈 Growth", "🎓 Learning", "⚙️ Operations", "🏗️ Infrastructure"**
- `Priority` (select) - "🔴 Critical", "🟠 High", "🟡 Medium", "🟢 Low"
- `Timeline` (date) - Project timeline
- `Success Metric` (text)
- `Revenue Impact` (text)
- `✅ Tasks` (relation) - Link to Tasks
- `📚 Skills Projects` (relation) - **CRITICAL: Filter out projects with this**
- `🗄️ Documentation` (relation) - Link to Documentation database

**IMPORTANT Status Values:**
- Status values are **case-sensitive with spaces** (same as Tasks)
- Use exact values: "Planning", "In Progress", "On Hold", "Done", "Cancelled"

**IMPORTANT Type Values - Portfolio Intelligence:**

The `Type` property enables strategic portfolio analysis and filtering:

- **💰 Revenue** - Generates cash THIS month (client delivery, billable work)
  - Example: "Build email automation for Client X"
  - Use for: Paid client projects, active implementations

- **📈 Growth** - Fills pipeline NEXT month (sales, marketing, partnerships)
  - Example: "LinkedIn outreach campaign for law firms"
  - Use for: Lead generation, sales campaigns, content marketing

- **🎓 Learning** - Builds capability FUTURE months (skill development, practice)
  - Example: "Master Pinecone vector database"
  - Use for: Personal skill development, demo projects, courses
  - **CRITICAL:** These are linked to `📚 Skills Projects` - FILTER OUT for agency work

- **⚙️ Operations** - Optimizes daily/weekly systems (internal efficiency)
  - Example: "Optimize Friday weekly review template"
  - Use for: Process improvements, workflow optimization

- **🏗️ Infrastructure** - Enables future scale (production setup, team tools)
  - Example: "Set up n8n production monitoring stack"
  - Use for: Technical infrastructure, team onboarding systems

**IMPORTANT Filtering Rules:**
1. **Skills Projects (Type = 🎓 Learning):** Projects linked to `📚 Skills Projects` should be IGNORED (personal learning, not agency work)
2. **Agency Work (Type ≠ 🎓 Learning):** Process projects with Type = Revenue, Growth, Operations, or Infrastructure
3. **Priority for agents:** Focus on Revenue projects first (client delivery), then Growth (pipeline building)

---

## Integration Pattern for Agents

### Phase 0: Read from Notion (plan-analyzer, implement-phase)

**Query for tasks with status "In Progress":**

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

**Parse task properties:**
- `Name` - Task title
- `Notes` - Detailed acceptance criteria and implementation notes
- `📊 Projects` - Project context (fetch related project for dependencies)
- `Priority`, `Deadline` - Planning context

**Filter out Skills Projects (Type = 🎓 Learning):**
```typescript
// If task is linked to project, check both Type and Skills Projects relation
const project = await mcp__notion__notion-fetch({ id: projectId });

// Method 1: Check Type property (PRIMARY)
const projectType = project.properties["Type"]?.select?.name;
if (projectType === "🎓 Learning") {
  // SKIP - This is personal learning, not agency work
  return null;
}

// Method 2: Check Skills Projects relation (FALLBACK for legacy projects)
if (project.properties["📚 Skills Projects"] &&
    project.properties["📚 Skills Projects"].length > 0) {
  // SKIP - This is a Skills Project
  return null;
}

// PROCESS - This is Agency work (Revenue, Growth, Operations, or Infrastructure)
```

**Type-based filtering for focused work:**
```typescript
// Query for Revenue projects only (client delivery focus)
const results = await mcp__notion__notion-search({
  query: "In Progress Revenue",
  query_type: "internal",
  data_source_url: "collection://29284f14-76e0-802f-a1de-000b357345a9"
});

// Filter results by Type
const revenueProjects = results.filter(p =>
  p.properties["Type"]?.select?.name === "💰 Revenue"
);
```

### Phase 8: Update Notion (docs-updater)

**Update task status after completion:**

```typescript
// Change status from "In Progress" to "Done"
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "update_properties",
    properties: {
      "Status": "Done"
    }
  }
});
```

**Optionally add completion notes:**

```typescript
// Add completion summary to task Notes
await mcp__notion__notion-update-page({
  data: {
    page_id: taskId,
    command: "insert_content_after",
    selection_with_ellipsis: "## Notes...",
    new_str: "\n\n## Completion Summary\n- Implementation complete\n- All acceptance criteria met\n- Build verified successfully"
  }
});
```

**Optionally create documentation page:**

```typescript
// Create documentation page in Documentation database
const docDbId = "29384f14-76e0-80f8-9668-000bf49a79be"; // From project relation

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

### Reference PROJECT_SPEC.yaml for Context

**Always read PROJECT_SPEC.yaml for architecture context:**

```yaml
# PROJECT_SPEC.yaml provides WHY context
architecture:
  key_decisions:
    - decision: "API Routes for public submissions (not Server Actions)"
      rationale: "Better HTTP context for anonymous operations"

  tech_stack:
    - name: "Supabase"
      why: "Managed PostgreSQL + Auth + Realtime, RLS for multi-tenant isolation"

features:
  phase_2_client_form:
    - name: "Form Submission & Response Storage"
      why: "Persist client responses with multi-tenant isolation"
      tech_decisions:
        - decision: "Service role key for public submissions"
          rationale: "Safe when tenant_id derived from database, not user input"
```

---

## Natural Language Task Selection

### Overview

Users can work on tasks using natural language instead of manually copying task IDs from Notion.

**Traditional workflow (manual):**
```bash
# User must know task ID
/implement-phase --notion-task-id=29284f14-76e0-8012-abc123
```

**Natural language workflow:**
```
User: "Pracujmy dalej nad kalendarzem"
→ Claude detects intent
→ Queries Notion for "In Progress" tasks matching "kalendarzem"
→ Confirms with user
→ Launches: /implement-phase --notion-task-id=found-task-id
```

### Trigger Phrases

Claude detects these natural language patterns:
- "pracujmy nad X" / "work on X"
- "kontynuujmy X" / "continue X"
- "róbmy dalej X" / "let's work on X"
- "implement X"

Where X is the topic (e.g., "kalendarzem", "calendar", "email automation")

### Workflow Steps

**1. Intent Detection**
- Claude extracts topic from user message
- Example: "Pracujmy nad kalendarzem" → topic = "kalendarzem"

**2. Query Notion**
```typescript
// Search Agency Tasks with Status = "In Progress"
const tasks = await mcp__notion__notion_search({
  query: `In Progress ${extractedTopic}`,
  query_type: "internal",
  data_source_url: "collection://29284f14-76e0-8062-a18d-000bfce0cf23"
});

// Filter out Skills Projects
const agencyTasks = tasks.filter(task => {
  const project = task.properties["📊 Projects"];
  if (!project) return true;

  const projectType = project.Type;
  return projectType !== "🎓 Learning"; // Exclude Skills
});

// Sort by priority: 🔴 > 🟠 > 🟡 > ⚪
agencyTasks.sort((a, b) => {
  const priorityOrder = {
    "🔴 Urgent": 1,
    "🟠 High": 2,
    "🟡 Medium": 3,
    "⚪ Low": 4
  };
  return (priorityOrder[a.properties.Priority] || 5) -
         (priorityOrder[b.properties.Priority] || 5);
});
```

**3. Matching Logic**
1. **Exact match:** Task Name contains topic (case-insensitive)
2. **Fuzzy match:** Task Name similar to topic
3. **Semantic match:** Task Notes contain topic keywords
4. **Project match:** Related Project Name contains topic

**4. Confirmation Flow**

**Single match:**
```
Claude: "Znalazłem task: 'Fix calendar critical bugs'
         Project: Legal-Mind MVP (Revenue)
         Priority: 🔴 Urgent
         Status: In Progress

         Czy chcesz nad tym pracować? (yes/no)"

User: "yes"
→ Launch: /implement-phase --notion-task-id=abc123
```

**Multiple matches:**
```
Claude: "Znalazłem 3 taski związane z 'kalendarzem' (In Progress):

         1. Fix calendar critical bugs (🔴 Urgent, Revenue)
            Notes: Calendar events not displaying correctly...

         2. Add calendar export feature (🟠 High, Growth)
            Notes: Export events to .ics format...

         3. Calendar performance optimization (🟡 Medium, Operations)
            Notes: Improve loading times for large calendars...

         Który task chcesz implementować? (1/2/3/cancel)"

User: "1"
→ Launch: /implement-phase --notion-task-id=task-1-id
```

**No matches:**
```
Claude: "Nie znalazłem tasków 'In Progress' związanych z 'kalendarzem'.

         Możesz:
         - Zmienić status taska w Notion na 'In Progress'
         - Spróbować innego wyszukiwania: 'calendar', 'kalend', etc.
         - Użyć lokalnego planu: /implement-phase Phase 2

         Czy chcesz zobaczyć wszystkie taski In Progress? (yes/no)"
```

### Benefits

**User Experience:**
- ✅ **Faster:** No manual copy-paste of task IDs
- ✅ **Natural:** User describes what they want to work on
- ✅ **Smart:** Sorting by priority (Urgent first)
- ✅ **Safe:** Confirmation before launching implement-phase
- ✅ **Flexible:** Handles 0, 1, or N matches gracefully

**Technical:**
- ✅ **No new commands:** Uses existing MCP tools
- ✅ **Filters Skills Projects:** Only Agency work
- ✅ **Fallback:** Can still use manual `/implement-phase --notion-task-id=X`

### Edge Cases

**Multiple "In Progress" tasks:**
- Sort by priority, show top 5 matches

**Topic matches multiple words:**
```
User: "Pracujmy nad calendar events"
Query: "In Progress calendar events"
→ Searches for both "calendar" AND "events"
```

**Typos:**
```
User: "Pracujmy nad kalendarze" (typo)
Query: "In Progress kalendarze"
→ 0 matches
→ Fallback: "Did you mean 'kalendarz'?"
```

**User changes mind:**
```
Claude: "Czy chcesz nad tym pracować?"
User: "nie"
→ Exit gracefully, don't launch implement-phase
```

---

## Agent-Specific Workflows

### docs-updater Agent

**PRIMARY Task:** Update Notion task status after implementation

**Workflow:**
1. Receive `task_id` from orchestrator (implement-phase)
2. Query Notion for task details
3. Update task status: `"In Progress"` → `"Done"`
4. Optionally add completion summary to `Notes`
5. Optionally create documentation page in `🗄️ Documentation`
6. **SECONDARY:** Optionally update PROJECT_SPEC.yaml if architecture changed
7. Return YAML summary with Notion page URLs

**Output format:**
```yaml
notion_updates:
  - task_id: "abc123"
    task_url: "https://notion.so/abc123"
    status_changed: "In Progress → Done"
    notes_updated: true
    documentation_created: true
    documentation_url: "https://notion.so/doc456"

local_updates:
  - file: "docs/PROJECT_SPEC.yaml"
    changed: false
    reason: "No architecture changes"
```

### plan-analyzer Agent

**Task:** Read Notion tasks and create execution strategy

**Workflow:**
1. Query Notion for tasks with status `"In Progress"`
2. Filter out tasks linked to Skills Projects
3. Fetch task details (Name, Notes, Projects, Priority)
4. Read PROJECT_SPEC.yaml for architecture context
5. Create execution strategy with dependencies and parallelization

**Fallback:** If Notion unavailable, read from local plan file in `~/.claude/plans/`

### implement-phase Command

**Task:** Orchestrate Notion-integrated workflow

**Workflow:**
- **Phase 0:** plan-analyzer reads from Notion (tasks with status "In Progress")
- **Phase 1-7:** Execute implementation
- **Phase 8:** docs-updater updates Notion status to "Done"
- **Phase 9:** git-specialist creates commit

**Data flow:**
```
Notion Task (In Progress)
  → Phase 0 (analyze)
  → Phase 1-7 (implement)
  → Phase 8 (update Notion: Done)
  → Phase 9 (git commit)
```

### Other Agents (implementation-validator, test-validator, etc.)

**Reference Notion for context when needed:**

```typescript
// If acceptance criteria needed, check Notion task Notes
const task = await mcp__notion__notion-fetch({ id: taskId });
const acceptanceCriteria = extractFromNotes(task.properties.Notes);
```

**Fallback to PROJECT_SPEC.yaml for high-level criteria:**
- Use PROJECT_SPEC.yaml for architecture/design validation
- Use Notion for detailed task-level acceptance criteria

---

## Error Handling

### Notion API Unavailable

**Graceful fallback:**
1. Log warning: "Notion API unavailable, falling back to local files"
2. Read from local plan file in `~/.claude/plans/` (if exists)
3. Read PROJECT_SPEC.yaml for high-level context
4. Continue execution with available data

### Task Not Found

**Handle gracefully:**
- If task ID invalid: Log error, ask user to verify task ID
- If task has no `Notes`: Use PROJECT_SPEC.yaml lightweight acceptance criteria
- If project has Skills Projects relation: Skip task, log "Skills Project ignored"

### Rate Limits

**Retry with exponential backoff:**
1. First retry: 1 second delay
2. Second retry: 2 seconds delay
3. Third retry: 4 seconds delay
4. After 3 retries: Fall back to local files

---

## Best Practices

1. **Always check Notion first** for current tasks and status
2. **Always reference PROJECT_SPEC.yaml** for architecture context (WHY)
3. **Always filter out Skills Projects** - Check both:
   - PRIMARY: `Type` property = "🎓 Learning" → SKIP
   - FALLBACK: `📚 Skills Projects` relation exists → SKIP
4. **Always use exact property values** (case-sensitive):
   - Status: "In Progress" (not "in_progress")
   - Type: "💰 Revenue" (not "Revenue" - include emoji)
5. **Prioritize by Type** when multiple projects available:
   - Priority 1: 💰 Revenue (client delivery)
   - Priority 2: 📈 Growth (pipeline building)
   - Priority 3: ⚙️ Operations (internal efficiency)
   - Priority 4: 🏗️ Infrastructure (scale enablers)
   - Skip: 🎓 Learning (personal skill development)
6. **Use Type for focused work sessions:**
   - Client delivery day → Filter Type = "💰 Revenue"
   - Sales focus day → Filter Type = "📈 Growth"
   - Optimization day → Filter Type = "⚙️ Operations"
7. **Always add completion summaries** to task Notes for context
8. **Optionally create documentation pages** for complex implementations
9. **Keep PROJECT_SPEC.yaml lightweight** (WHY only, not detailed WHAT)
10. **Check Type distribution during reviews** to ensure portfolio health

---

## Examples

### Example 1: Simple Task Implementation (Revenue Project)

**Notion Task:**
- Name: "Fix calendar timezone bug"
- Status: "In Progress"
- Project: "Client Booking System" (Type: 💰 Revenue)
- Notes: "Calendar slots showing wrong timezone. Should use Europe/Warsaw with DST."

**Workflow:**
1. plan-analyzer: Read task from Notion, check project Type (💰 Revenue → PROCESS)
2. Phase 1-7: Fix timezone bug
3. docs-updater: Update Notion status to "Done", add completion note
4. git-specialist: Create commit

**No PROJECT_SPEC.yaml update needed** (no architecture change)

### Example 2: Feature with Architecture Change (Infrastructure Project)

**Notion Task:**
- Name: "Add Redis caching layer"
- Status: "In Progress"
- Project: "Performance Optimization" (Type: 🏗️ Infrastructure)
- Notes: "Implement Redis for survey response caching. See architecture doc for rationale."

**Workflow:**
1. plan-analyzer: Read task from Notion, check project Type (🏗️ Infrastructure → PROCESS), check PROJECT_SPEC.yaml for caching strategy
2. Phase 1-7: Implement Redis caching
3. docs-updater:
   - Update Notion status to "Done"
   - Create documentation page with implementation notes
   - **UPDATE PROJECT_SPEC.yaml → architecture.tech_stack** (add Redis with WHY)
4. git-specialist: Create commit

**PROJECT_SPEC.yaml updated:**
```yaml
architecture:
  tech_stack:
    - name: "Redis"
      version: "^7"
      why: "Cache survey responses for faster load times, reduce database queries"
```

### Example 3: Skills Project (Should be SKIPPED)

**Notion Task:**
- Name: "Learn Pinecone vector database"
- Status: "In Progress"
- Project: "Vector DB Mastery" (Type: 🎓 Learning)
- Notes: "Build demo RAG application to learn Pinecone integration patterns."

**Workflow:**
1. plan-analyzer: Read task from Notion, check project Type (🎓 Learning → **SKIP**)
2. Log: "Skipped Skills Project: Vector DB Mastery (Type: Learning)"
3. Continue to next task

**Rationale:** Personal skill development projects should not trigger agency implementation workflows. They're tracked in Notion for learning progress but handled manually, not by automated agents.

---

## Summary

**Notion = WHAT to build** (task tracking, detailed acceptance criteria, portfolio management)
**Local docs = WHY we build** (architecture decisions, tech stack rationale)

**Type Property = Strategic portfolio intelligence:**
- Filter by business purpose (Revenue, Growth, Learning, Operations, Infrastructure)
- Skip personal learning projects (Type = 🎓 Learning)
- Prioritize client delivery (Type = 💰 Revenue first)
- Enable focused work sessions (filter by Type)

**Integration flow:**
1. Agents read from Notion (tasks with status "In Progress")
2. Filter out Skills Projects (Type = 🎓 Learning OR has `📚 Skills Projects` relation)
3. Prioritize by Type (Revenue → Growth → Operations → Infrastructure)
4. Execute implementation
5. Update Notion status to "Done"
6. Reference local docs (PROJECT_SPEC.yaml) for architecture context
