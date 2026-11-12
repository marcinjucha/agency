# Halo-Efekt Documentation

> **Central hub for project architecture and technical decisions**

Welcome to Halo-Efekt documentation. This directory contains architecture, design patterns, and technical context.

**For task tracking:** there is no external tracker (since 2026-11-12) — the task list lives in the brain vault (`~/Prywatne/projects/brain-vault/01-Projects/agency/halo-efekt-teraz.md`).

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** - Architecture decisions and WHY (not WHAT)
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and system design
3. **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** - Implementation patterns and examples

---

## 📚 Documentation Structure

### Core Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** | WHY we made decisions: tech stack rationale, architecture choices, lightweight acceptance criteria | When understanding context and philosophy |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture, system design, cross-app dependencies | When understanding how things work |
| **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** | Concrete code examples and implementation patterns | When building features |
| **[design-system.md](./design-system.md)** | UI/UX guidelines, component library, accessibility standards | When designing interfaces |

### Architecture Decision Records (ADRs)

Documents explaining **why** we made specific architectural choices:

- **[006-agency-project-structure.md](./adr/006-agency-project-structure.md)** — Turborepo, TanStack Start, 4 apps, 5 packages, app/features separation, state management, DB access (folds in former ADR-001 and ADR-005)
- **[008-workflow-engine-architecture.md](./adr/008-workflow-engine-architecture.md)** — n8n Orchestrator + step handlers, replaces former ADR-007

### Technology Guides

Reference guides for learning (12 files in `guides/` directory):

- **Supabase guides** (4 files): GUIDE, QUICK_REFERENCE, RLS_PATTERNS, CASE_STUDY
- **TanStack Query guides** (4 files): GUIDE, QUICK_REFERENCE, PATTERNS, CASE_STUDY
- **Turborepo guides** (4 files): GUIDE, QUICK_REFERENCE, PATTERNS, CASE_STUDY

*These guides are kept for learning purposes and are not actively maintained.*

---

## 🎯 For Different Audiences

### For AI Assistants (Claude, ChatGPT, etc.)

**Read this first:**
1. **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** - WHY decisions were made (architecture, tech stack rationale)
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and cross-cutting concerns
3. **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** - Implementation patterns

Tasks come from the brain vault (`~/Prywatne/projects/brain-vault/01-Projects/agency/halo-efekt-teraz.md`); `/ag-develop` takes one as an argument or picks it from there.

### For New Developers

**Day 1:**
1. Read PROJECT_SPEC.yaml (Architecture decisions and WHY)
2. Read ARCHITECTURE.md (Tech Stack)

**Day 2-7:**
- Study ADRs to understand patterns (adr/006, adr/008)
- Read CODE_PATTERNS.md for implementation examples
- Explore guides/ directory for learning

### For Project Manager / Stakeholder

**Tasks and priorities:** the brain vault (`~/Prywatne/projects/brain-vault/01-Projects/agency/halo-efekt-teraz.md`).

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

**Task Tracking:** the brain vault (`~/Prywatne/projects/brain-vault/01-Projects/agency/halo-efekt-teraz.md`)

---

## 🔍 Finding Information

### "How do I...?"

| Question | Document |
|----------|----------|
| Know what to build next | brain vault → `halo-efekt-teraz.md` |
| Understand the architecture | ARCHITECTURE.md |
| Understand code organization | adr/006-agency-project-structure.md (Section 3) |
| See implementation patterns | CODE_PATTERNS.md |
| Understand UI/UX guidelines | design-system.md |

### "Why did we...?"

| Question | Document |
|----------|----------|
| Use Turborepo | adr/006-agency-project-structure.md (Section 1) |
| Separate app/ and features/ | adr/006-agency-project-structure.md (Section 3) |
| Run background AI / orchestration | adr/008-workflow-engine-architecture.md |
| Choose this tech stack | PROJECT_SPEC.yaml → architecture.tech_stack[*].why |
| Make specific decisions | PROJECT_SPEC.yaml → architecture.key_decisions |

### "What's the status of...?"

| Question | Document |
|----------|----------|
| Feature status | PROJECT_SPEC.yaml → features[*].status |
| Next priorities | brain vault → `halo-efekt-teraz.md` |
| Architecture context | PROJECT_SPEC.yaml → features[*].why |

---

## 📝 Updating Documentation

### When to Update

**After completing a feature:**
- [x] Update PROJECT_SPEC.yaml feature status (and architecture decisions if they changed)
- [x] Run `/brain-update` so the vault's task list records it
- [x] Commit changes with: `docs: update after [feature name]`

**After making architectural decision:**
- [ ] Create new ADR in `adr/` directory
- [ ] Update ARCHITECTURE.md if high-level changes
- [ ] Update PROJECT_SPEC.yaml → architecture.key_decisions if needed

**After major milestone:**
- [ ] Update PROJECT_SPEC.yaml → status_summary if phase complete
- [ ] Update README.md → Current Project Status

### How to Update

**Local docs updates:**
1. Edit PROJECT_SPEC.yaml only for architecture changes (WHY, not WHAT)
2. Update "last_updated" date
3. Commit with descriptive message

---

## 🎓 Documentation Principles

### Our Standards

1. **Brain vault = task list:** what to build next lives in the brain vault (`~/Prywatne/projects/brain-vault/01-Projects/agency/halo-efekt-teraz.md`)
2. **Local Docs = WHY Context:** Architecture decisions, tech stack rationale, design patterns
3. **Signal vs Noise:** Focus on WHY decisions were made, not detailed acceptance criteria
4. **Write for Humans:** Clear, concise, scannable
5. **Provide Context:** Explain rationale behind choices

### Document Types

- **PROJECT_SPEC.yaml:** WHY we made decisions (architecture, tech stack rationale, lightweight acceptance criteria)
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
- [GitLab Repository](https://gitlab.com/friendly-coders/halo-efekt)

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

*This README serves as the central index for all documentation. Tasks live in the brain vault; check PROJECT_SPEC.yaml for architecture context.*
