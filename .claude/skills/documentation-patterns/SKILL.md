---
name: documentation-patterns
description: Use when updating project documentation after implementation. Covers PROJECT_SPEC.yaml updates (task status, completion notes), Notion task sync, and progress tracking. Focus on outcomes (what user can do now), not implementation details.
---

# Documentation Patterns - Progress & Outcome Tracking

## Purpose

Document implementation outcomes: update PROJECT_SPEC.yaml with completed tasks, sync Notion status, track progress. Focus on WHAT user can do now (outcomes), not HOW it was built (implementation).

## When to Use

- Implementation complete (need docs update)
- Task finished (mark as done in Notion)
- Feature deployed (update PROJECT_SPEC)
- Progress tracking (percentage completion)

## Critical Pattern: Signal vs Noise in Docs

**SIGNAL (document):**
- Outcomes (what user can do)
- Status changes (done, verified)

**NOISE (skip):**
- Implementation details (Controller vs register)
- File-level changes (which .tsx modified)

**Why:** Docs for stakeholders, not developers.

## PROJECT_SPEC.yaml Updates

**Update on completion:**
- `status`: done
- `acceptance_criteria[].verified`: true
- `completion_notes`: outcome summary

## Notion Task Sync

**Critical: Notion is case-sensitive**
- Status values: "Done" (not "done")
- Property names: exact match

## Quick Reference

**Checklist:**
- [ ] PROJECT_SPEC.yaml (status → done, verified)
- [ ] Completion notes (outcome-focused)
- [ ] Notion sync (case-sensitive)

