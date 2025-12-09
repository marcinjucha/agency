# Legal-Mind Documentation

> **Central hub for all project documentation**

Welcome to Legal-Mind documentation. This directory contains everything you need to understand, build, and maintain the project.

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** - Complete project overview, plan, and current status
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design decisions
3. **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Detailed progress and commit history

---

## 📚 Documentation Structure

### Core Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** | Master plan: vision, architecture, phases, status | **Start here** - Essential for AI context |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture, tech stack, system design | When understanding how things work |
| **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** | Current progress, git history, next steps | When checking what's done |

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
2. **[adr/006-legal-mind-project-structure.md](./adr/006-legal-mind-project-structure.md)** - Code patterns

**Then reference:**
- ARCHITECTURE.md for technical details
- IMPLEMENTATION_STATUS.md for current progress

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

> **As of:** December 9, 2025

| Metric | Value |
|--------|-------|
| **Phase** | Phase 1 Complete ✅, Phase 2 Starting 🚧 |
| **Progress** | 88% Foundation (15/17 tasks) |
| **Commits** | 23 total |
| **Deployment** | ✅ Live on Vercel (2 apps) |
| **Latest Feature** | Survey Link Generation |

**Next Priority:** Build dynamic survey form (Website app)

---

## 🔍 Finding Information

### "How do I...?"

| Question | Document |
|----------|----------|
| Understand the project vision | PROJECT_ROADMAP.md → Vision & Goals |
| Know what's already built | IMPLEMENTATION_STATUS.md |
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
| Specific feature progress | IMPLEMENTATION_STATUS.md |
| Recent changes | IMPLEMENTATION_STATUS.md → Git Commit History |
| Next priorities | PROJECT_ROADMAP.md → Next Steps |

---

## 📝 Updating Documentation

### When to Update

**After completing a feature:**
- [x] Update PROJECT_ROADMAP.md (change 📋 TODO to ✅ COMPLETE)
- [x] Update IMPLEMENTATION_STATUS.md (add to completed section)
- [x] Commit changes with: `docs: update status after [feature name]`

**After making architectural decision:**
- [ ] Create new ADR in `adr/` directory
- [ ] Update ARCHITECTURE.md if high-level changes
- [ ] Reference ADR in PROJECT_ROADMAP.md if relevant

**After major milestone:**
- [ ] Update PROJECT_ROADMAP.md → Current Status
- [ ] Update IMPLEMENTATION_STATUS.md → Session Statistics
- [ ] Consider updating README.md (this file)

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

- **Roadmap:** Living document (updated frequently)
- **Architecture:** Stable document (updated on major changes)
- **ADRs:** Immutable records (never edit, only add new)
- **Status:** Log document (append-only)
- **Guides:** How-to documents (updated as needed)

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

**Last Updated:** December 9, 2025
**Maintained By:** Development Team
**Next Review:** After Phase 2 completion

*This README serves as the central index for all documentation. Start with PROJECT_ROADMAP.md for complete project context.*
