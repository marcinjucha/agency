# Notion Database Schema

## Agency Tasks Table

**Database ID:** `29284f14-76e0-8012-8708-f1c5d3a78386`
**Collection URL:** `collection://29284f14-76e0-8062-a18d-000bfce0cf23`

### Properties

| Property | Type | Values/Notes |
|----------|------|--------------|
| `Name` | title | Task name |
| `Status` | select | "Not Started", "In Progress", "On Hold", "Done", "Cancelled" |
| `Priority` | select | "🔴 Urgent", "🟠 High", "🟡 Medium", "🟢 Low" |
| `Type` | select | "🚀 Delivery", "📝 Documentation", etc. |
| `Notes` | text | Description with acceptance criteria |
| `Deadline` | date | Due date |
| `Hours` | number | Estimated hours |
| `📊 Projects` | relation | Link to Projects database |
| `👥 Client` | relation | Link to Clients database |

**IMPORTANT:** Status values are **case-sensitive with spaces**

---

## Agency Projects Table

**Database ID:** `29284f14-76e0-8065-ae11-ebe3685f4c02`
**Collection URL:** `collection://29284f14-76e0-802f-a1de-000b357345a9`

### Properties

| Property | Type | Values/Notes |
|----------|------|--------------|
| `Name` | title | Project name |
| `Status` | select | "Planning", "In Progress", "On Hold", "Done", "Cancelled" |
| `Type` | select | "💰 Revenue", "📈 Growth", "🎓 Learning", "⚙️ Operations", "🏗️ Infrastructure" |
| `Priority` | select | "🔴 Critical", "🟠 High", "🟡 Medium", "🟢 Low" |
| `Timeline` | date | Project timeline |
| `Success Metric` | text | Measurable goal |
| `Revenue Impact` | text | Financial impact |
| `✅ Tasks` | relation | Link to Tasks |
| `📚 Skills Projects` | relation | **Filter out projects with this** |
| `🗄️ Documentation` | relation | Link to Documentation |

---

## Type Property - Portfolio Intelligence

The `Type` property enables strategic filtering:

### 💰 Revenue
- Generates cash THIS month
- Example: "Build email automation for Client X"
- Use for: Paid client projects, active implementations

### 📈 Growth
- Fills pipeline NEXT month
- Example: "LinkedIn outreach campaign for law firms"
- Use for: Lead generation, sales campaigns

### 🎓 Learning
- **FILTER OUT in agents**
- Builds capability FUTURE months
- Example: "Master Pinecone vector database"
- Use for: Personal skill development

### ⚙️ Operations
- Optimizes daily/weekly systems
- Example: "Optimize Friday weekly review template"
- Use for: Process improvements

### 🏗️ Infrastructure
- Enables future scale
- Example: "Set up n8n production monitoring stack"
- Use for: Technical infrastructure

---

## Filtering Rules

1. **Skills Projects (Type = 🎓 Learning):** SKIP
2. **Agency Work:** Process Revenue, Growth, Operations, Infrastructure
3. **Priority for agents:** Revenue first, then Growth

---

## Priority Order

When sorting tasks/projects:

1. 🔴 Urgent/Critical
2. 🟠 High
3. 🟡 Medium
4. 🟢 Low

```typescript
const priorityOrder = {
  "🔴 Urgent": 1,
  "🔴 Critical": 1,
  "🟠 High": 2,
  "🟡 Medium": 3,
  "🟢 Low": 4
};
```
