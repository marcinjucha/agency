# docs/ - Documentation

This directory contains all project documentation.

## Files

### ARCHITECTURE.md
High-level architecture overview:
- System architecture diagram
- Application separation rationale
- Data flow
- Technology decisions
- Future enhancements

**Read this first** to understand the system.

### DEPLOYMENT.md
Complete Vercel deployment guide:
- Step-by-step Vercel setup (Dashboard + CLI)
- Environment variables reference
- Domain configuration
- Troubleshooting deployment issues
- First user creation

**Use this** when deploying to production or debugging deployment issues.

### IMPLEMENTATION_STATUS.md
Current project status and progress:
- Overall progress percentage (82% complete)
- Git commit history (23 commits)
- What's completed vs TODO
- Session statistics
- Known issues and solutions
- Next steps

**Regularly updated** after major milestones.

### adr/ (Architecture Decision Records)

**ADR-001:** Monorepo Structure (from multi-tenant CMS project)
**ADR-005:** App vs Features Separation (from multi-tenant CMS project)
**ADR-006:** Legal-Mind Project Structure (specific to this project)

ADRs document **why** architectural decisions were made.

**ADR-006 is the most important** - it's the definitive guide for:
- When to create apps vs packages
- Folder organization pattern
- State management rules
- Database access patterns
- Import alias conventions

Read ADR-006 when:
- Adding new features
- Deciding where code belongs
- Choosing state management approach
- Setting up new developers

## Document Updates

### When to Update

**ARCHITECTURE.md:**
- Major architectural changes
- New technology additions
- System-wide patterns change

**DEPLOYMENT.md:**
- New deployment target
- Environment variable changes
- Infrastructure updates

**IMPLEMENTATION_STATUS.md:**
- After completing major milestones
- After deployment
- Weekly progress updates

**ADRs:**
- When making architectural decisions
- When changing established patterns
- Create new ADR for significant decisions

### How to Update

1. Edit the file
2. Update "Last Updated" date
3. Commit with descriptive message
4. Reference in related code comments

## Documentation Standards

- Use **Markdown** for all docs
- Include **examples** for complex concepts
- Add **diagrams** where helpful (ASCII art OK)
- Keep **up-to-date** (stale docs worse than no docs)
- Link to **related files** and docs

## For AI Assistants (Claude, etc.)

When working on this project:

1. **Read ADR-006 first** to understand patterns
2. **Check IMPLEMENTATION_STATUS.md** for current state
3. **Follow folder structure** defined in ADRs
4. **Reference ARCHITECTURE.md** for system design
5. **Update docs** when making significant changes

## Quick Reference

**Architecture questions?** → Read `ARCHITECTURE.md`
**Deployment issues?** → Check `DEPLOYMENT.md`
**Current progress?** → See `IMPLEMENTATION_STATUS.md`
**Pattern questions?** → Read `adr/006-legal-mind-project-structure.md`
**Why this structure?** → Read `adr/001-monorepo-structure.md` and `adr/005-app-vs-features-separation.md`
