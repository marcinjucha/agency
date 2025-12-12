# Legal-Mind Documentation

> **Central hub for all project documentation**

Welcome to Legal-Mind documentation. This directory contains everything you need to understand, build, and maintain the project.

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** - Complete project overview, plan, and current status
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design decisions
3. **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** - Machine-readable specification for AI agents

---

## 📚 Documentation Structure

### Core Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** | Master plan: vision, architecture, phases, status | **Start here** - Essential context |
| **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** | Machine-readable spec: features, dependencies, files (for AI agents) | For structured project data |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture, tech stack, system design, cross-app dependencies | When understanding how things work |
| **[CODE_PATTERNS.md](./CODE_PATTERNS.md)** | Concrete code examples and implementation patterns | When building features |

### Architecture Decision Records (ADRs)

Documents explaining **why** we made specific architectural choices:

- **[001-monorepo-structure.md](./adr/001-monorepo-structure.md)** - Why Turborepo
- **[005-app-vs-features-separation.md](./adr/005-app-vs-features-separation.md)** - Code organization pattern
- **[006-legal-mind-project-structure.md](./adr/006-legal-mind-project-structure.md)** - Project-specific patterns

### Guides (Coming Soon)

- `guides/getting-started.md` - Quick setup (10 minutes to first build)
- `guides/development.md` - Local development workflow
- `guides/deployment.md` - Deploy to Vercel

### Historical Documents

Older documents kept for reference (not actively maintained):

- `archive/architecture-implementation-plan.md` - Original detailed 1385-line implementation plan
- `archive/recommendation-for-mvp.md` - Early MVP recommendations
- `archive/sas-product-discussion.md` - Initial product discussions

---

## 🎯 For Different Audiences

### For AI Assistants (Claude, ChatGPT, etc.)

**Read this first:**
1. **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** - Full context in one file
2. **[PROJECT_SPEC.yaml](./PROJECT_SPEC.yaml)** - Structured spec (parse this for feature details)
3. **[PROJECT_SPEC_SCHEMA.md](./PROJECT_SPEC_SCHEMA.md)** - How to read the YAML structure

**Then reference:**
- ARCHITECTURE.md for technical details and cross-cutting concerns
- CODE_PATTERNS.md for implementation patterns

### For New Developers

**Day 1:**
1. Read PROJECT_ROADMAP.md (Vision + Current Status)
2. Read ARCHITECTURE.md (Tech Stack)
3. Follow `guides/getting-started.md` (when available)

**Day 2-7:**
- Study ADRs to understand patterns
- Read IMPLEMENTATION_STATUS.md to see what's done
- Dive into codebase with context

### For Project Manager / Stakeholder

**Read:**
- PROJECT_ROADMAP.md → Sections:
  - Vision & Goals
  - Implementation Phases (checkboxes)
  - Current Status Summary
  - Next Steps

---

## 📊 Current Project Status

> **As of:** December 12, 2025

| Metric | Value |
|--------|-------|
| **Phase** | Phase 1 Complete ✅, Phase 2 In Progress 🚧 |
| **Progress** | 100% Phase 1, 75% Phase 2 (3/5 features) = 25% MVP |
| **Commits** | 19 total (cleaned up commit history) |
| **Deployment** | ✅ Live on Vercel (2 apps) |
| **Latest Feature** | Dynamic survey form with 7 question types |

**Next Priority:** Fix form submission (RLS policy) + Build response management in CMS

---

## 🔍 Finding Information

### "How do I...?"

| Question | Document |
|----------|----------|
| Understand the project vision | PROJECT_ROADMAP.md → Vision & Goals |
| Know what's already built | PROJECT_ROADMAP.md → Current Status Summary |
| Understand the architecture | ARCHITECTURE.md |
| Know what to build next | PROJECT_ROADMAP.md → Next Steps |
| Understand code organization | adr/005, adr/006 |
| Set up development environment | guides/getting-started.md (coming soon) |
| Deploy to production | guides/deployment.md (coming soon) |

### "Why did we...?"

| Question | Document |
|----------|----------|
| Use Turborepo | adr/001-monorepo-structure.md |
| Separate app/ and features/ | adr/005-app-vs-features-separation.md |
| Use specific folder structure | adr/006-legal-mind-project-structure.md |
| Choose this tech stack | ARCHITECTURE.md → Tech Stack Decisions |

### "What's the status of...?"

| Question | Document |
|----------|----------|
| Overall project progress | PROJECT_ROADMAP.md → Current Status |
| Specific feature progress | PROJECT_SPEC.yaml → phases.features[*].status |
| Recent changes | PROJECT_ROADMAP.md → Recent Milestones |
| Next priorities | PROJECT_ROADMAP.md → Next Steps |

---

## 📝 Updating Documentation

### When to Update

**After completing a feature:**
- [x] Update PROJECT_SPEC.yaml (change status: pending → complete, mark acceptance_criteria as verified)
- [x] Update PROJECT_ROADMAP.md (change [x] for completed items, update progress %)
- [x] Commit changes with: `docs: update status after [feature name]`

**After making architectural decision:**
- [ ] Create new ADR in `adr/` directory
- [ ] Update ARCHITECTURE.md if high-level changes (especially "Cross-Cutting Concerns" section)
- [ ] Reference ADR in PROJECT_ROADMAP.md if relevant

**After major milestone:**
- [ ] Update PROJECT_SPEC.yaml (update phase progress, mark features complete)
- [ ] Update PROJECT_ROADMAP.md → Current Status Summary + Recent Milestones
- [ ] Update both file `last_updated` dates

### How to Update

1. Edit the relevant file(s)
2. Update "Last Updated" date
3. Commit with descriptive message
4. Push to repository

---

## 🎓 Documentation Principles

### Our Standards

1. **Single Source of Truth:** PROJECT_ROADMAP.md is the master document
2. **Keep It Updated:** Update docs in same commit as code changes
3. **Write for Humans:** Clear, concise, scannable
4. **Provide Context:** Explain "why", not just "what"
5. **Use Examples:** Code snippets, diagrams, real scenarios

### Document Types

- **PROJECT_ROADMAP.md:** Living document - narrative plan with timelines (updated frequently)
- **PROJECT_SPEC.yaml:** Machine-readable spec for AI agents (updated when features change)
- **PROJECT_SPEC_SCHEMA.md:** Documentation of YAML structure (stable, rarely changes)
- **ARCHITECTURE.md:** Technical design (stable, updated on major changes or new cross-cutting concerns)
- **ADRs:** Immutable decision records (never edit, only add new)
- **CODE_PATTERNS.md:** How-to examples (updated with new patterns)
- **Guides:** How-to documents (not yet created)

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

**Last Updated:** December 12, 2025
**Maintained By:** Development Team
**Next Review:** After Phase 3 completion

*This README serves as the central index for all documentation. Start with PROJECT_ROADMAP.md for complete project context.*
