# Legal-Mind Documentation

> **Central hub for project architecture and technical decisions**

Welcome to Legal-Mind documentation. This directory contains architecture, design patterns, and technical context.

**For task tracking and roadmap:** See [Notion workspace](https://notion.so) (Agency Projects & Tasks)

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[Notion](https://notion.so)** - Current tasks, roadmap, and project status (Source of truth)
2. **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** - Architecture decisions and WHY (not WHAT)
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and system design
4. **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** - Implementation patterns and examples

---

## 📚 Documentation Structure

### Core Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[NOTION_INTEGRATION.md](./NOTION_INTEGRATION.md)** | **Notion integration guide** for agents: how to read tasks, update status, and reference local docs | **Essential for AI agents** - read first |
| **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** | WHY we made decisions: tech stack rationale, architecture choices, lightweight acceptance criteria | When understanding context and philosophy |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture, system design, cross-app dependencies | When understanding how things work |
| **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** | Concrete code examples and implementation patterns | When building features |
| **[design-system.md](./design-system.md)** | UI/UX guidelines, component library, accessibility standards | When designing interfaces |

### Architecture Decision Records (ADRs)

Documents explaining **why** we made specific architectural choices:

- **[001-monorepo-structure.md](./adr/001-monorepo-structure.md)** - Why Turborepo
- **[005-app-vs-features-separation.md](./adr/005-app-vs-features-separation.md)** - Code organization pattern

### Technology Guides

Reference guides for learning (12 files in `guides/` directory):

- **Supabase guides** (4 files): GUIDE, QUICK_REFERENCE, RLS_PATTERNS, CASE_STUDY
- **TanStack Query guides** (4 files): GUIDE, QUICK_REFERENCE, PATTERNS, CASE_STUDY
- **Turborepo guides** (4 files): GUIDE, QUICK_REFERENCE, PATTERNS, CASE_STUDY

*These guides are kept for learning purposes and are not actively maintained.*

---

## 🎯 For Different Audiences

### For AI Assistants (Claude, ChatGPT, etc.)

**IMPORTANT:** Notion is the source of truth for task tracking and roadmap.

**Read this first:**
1. **[NOTION_INTEGRATION.md](./NOTION_INTEGRATION.md)** - **CRITICAL: Integration guide with Notion MCP examples**
2. **Notion** - Query tasks with status "In Progress" to know what to implement
3. **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** - WHY decisions were made (architecture, tech stack rationale)
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and cross-cutting concerns
5. **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** - Implementation patterns

**Integration pattern (see NOTION_INTEGRATION.md for details):**
- Phase 0: Read from Notion (tasks with status="In Progress")
- Phase 1-7: Execute implementation
- Phase 8: Update Notion (change status to "Done")
- Reference PROJECT_SPEC.yaml for architecture context (WHY)

**Notion MCP Tools:**
- `mcp__notion__notion-search` - Find tasks by status
- `mcp__notion__notion-fetch` - Get task details
- `mcp__notion__notion-update-page` - Update task status
- `mcp__notion__notion-create-pages` - Create documentation

### For New Developers

**Day 1:**
1. Check Notion for current project status (Agency Projects & Tasks)
2. Read PROJECT_SPEC.yaml (Architecture decisions and WHY)
3. Read ARCHITECTURE.md (Tech Stack)

**Day 2-7:**
- Study ADRs to understand patterns (adr/001, adr/005)
- Read CODE_PATTERNS.md for implementation examples
- Explore guides/ directory for learning

### For Project Manager / Stakeholder

**Check Notion for:**
- Current tasks (status: In Progress, Done, Not Started)
- Project progress (% complete)
- Next priorities (what's coming up)

**Check docs/ for:**
- PROJECT_SPEC.yaml → Architecture and technical context
- ARCHITECTURE.md → System design overview

---

## 📊 Current Project Status

> **As of:** January 21, 2026

| Metric | Value |
|--------|-------|
| **Phase** | Phase 4 Complete ✅ (UI/UX improvements) |
| **Progress** | 80% MVP (Phases 1-4 complete, Phase 5 next) |
| **Deployment** | ✅ Live on Vercel (2 apps: CMS + Website) |
| **Latest Feature** | WCAG 2.1 AA compliance, responsive design, component library |

**Next Priority:** Phase 5 - n8n Workflows & AI Analysis

**Task Tracking:** Check [Notion](https://notion.so) for current tasks with status "In Progress"

---

## 🔍 Finding Information

### "How do I...?"

| Question | Document |
|----------|----------|
| Know what to build next | **Notion** → Tasks with status "In Progress" |
| Understand the architecture | ARCHITECTURE.md |
| Understand code organization | adr/005-app-vs-features-separation.md |
| See implementation patterns | CODE_PATTERNS.md |
| Understand UI/UX guidelines | design-system.md |

### "Why did we...?"

| Question | Document |
|----------|----------|
| Use Turborepo | adr/001-monorepo-structure.md |
| Separate app/ and features/ | adr/005-app-vs-features-separation.md |
| Choose this tech stack | PROJECT_SPEC.yaml → architecture.tech_stack[*].why |
| Make specific decisions | PROJECT_SPEC.yaml → architecture.key_decisions |

### "What's the status of...?"

| Question | Document |
|----------|----------|
| Overall project progress | **Notion** → Agency Projects |
| Specific feature progress | **Notion** → Agency Tasks |
| Next priorities | **Notion** → Tasks with status "Not Started" |
| Architecture context | PROJECT_SPEC.yaml → features[*].why |

---

## 📝 Updating Documentation

### When to Update

**After completing a feature:**
- [x] Update Notion task status (In Progress → Done) - **PRIMARY**
- [x] Optionally update PROJECT_SPEC.yaml if architecture decisions changed
- [x] Commit changes with: `docs: update after [feature name]`

**After making architectural decision:**
- [ ] Create new ADR in `adr/` directory
- [ ] Update ARCHITECTURE.md if high-level changes
- [ ] Update PROJECT_SPEC.yaml → architecture.key_decisions if needed

**After major milestone:**
- [ ] Update Notion project progress
- [ ] Update PROJECT_SPEC.yaml → status_summary if phase complete
- [ ] Update README.md → Current Project Status

### How to Update

**Notion updates (PRIMARY):**
1. Agents automatically update task status after implementation
2. User manually updates priorities and creates new tasks

**Local docs updates (SECONDARY):**
1. Edit PROJECT_SPEC.yaml only for architecture changes (WHY, not WHAT)
2. Update "last_updated" date
3. Commit with descriptive message

---

## 🎓 Documentation Principles

### Our Standards

1. **Notion = Source of Truth:** Task tracking, roadmap, and WHAT to build lives in Notion
2. **Local Docs = WHY Context:** Architecture decisions, tech stack rationale, design patterns
3. **Signal vs Noise:** Focus on WHY decisions were made, not detailed acceptance criteria
4. **Write for Humans:** Clear, concise, scannable
5. **Provide Context:** Explain rationale behind choices

### Document Types

- **Notion (PRIMARY):** Task tracking, roadmap, detailed acceptance criteria (updated daily by agents)
- **PROJECT_SPEC.yaml (SECONDARY):** WHY we made decisions (architecture, tech stack rationale, lightweight acceptance criteria)
- **ARCHITECTURE.md:** Technical design (stable, updated on major changes)
- **ADRs:** Immutable decision records (never edit, only add new)
- **CODE_PATTERNS.md:** Implementation examples (updated with new patterns)
- **Guides:** Technology references (stable, for learning)

---

## 🔗 External Resources

### Technologies
- [Next.js 15 Docs](https://nextjs.org/docs)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### Tools
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://app.supabase.com/project/zsrpdslhnuwmzewwoexr)
- [GitLab Repository](https://gitlab.com/friendly-coders/legal-mind)

---

## 📞 Getting Help

### For Documentation Issues

- **Missing information?** Create issue in GitLab
- **Unclear explanation?** Ask project maintainer
- **Found error?** Submit PR with fix

### For Technical Issues

1. Check IMPLEMENTATION_STATUS.md → Known Issues
2. Check PROJECT_ROADMAP.md → Current Status
3. Ask in project chat/channel

---

**Last Updated:** January 21, 2026
**Maintained By:** Development Team + AI Agents
**Next Review:** After Phase 5 completion (n8n & AI)

*This README serves as the central index for all documentation. Start with Notion for task tracking, then check PROJECT_SPEC.yaml for architecture context.*
