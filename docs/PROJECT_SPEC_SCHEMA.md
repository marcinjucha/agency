# Project Specification Schema (YAML)

## Overview

This document defines the structure of `PROJECT_SPEC.yaml`, a machine-readable specification for the Halo-Efekt project designed to help AI assistants understand:
- What features to build
- Acceptance criteria for each feature
- Dependencies between features
- Files involved in each feature

## Why YAML?

- **Human-readable** - Easy for developers to edit and review
- **AI-parseable** - Clear structure, no syntax ambiguity
- **Nested hierarchy** - Perfect for expressing dependencies and relationships
- **Widely supported** - Works with all programming languages

## Schema Structure

```yaml
project:
  name: string                    # Project name
  description: string             # One-liner description
  version: string                 # Version (e.g., "1.0.0")
  status: string                  # Overall status (planning, in-progress, beta, production)
  last_updated: date              # ISO 8601 date (YYYY-MM-DD)

phases:
  - name: string                  # Phase name (e.g., "Phase 1: Foundation")
    description: string           # What this phase accomplishes
    status: string                # pending | in-progress | complete
    estimated_duration: string    # "2 weeks" or "10 days"
    progress: number              # 0-100 percentage

    features:
      - name: string              # Feature name
        id: string                # Unique identifier (e.g., "survey-builder")
        description: string       # What the feature does
        status: string            # pending | in-progress | complete

        acceptance_criteria:
          - description: string   # "User can create surveys"
            verified: boolean     # true | false

        dependencies:
          - feature_id: string    # ID of required feature
            reason: string        # Why it's needed

        files_involved:
          - path: string          # Absolute path from repo root
            type: string          # component | action | query | page | type | other
            description: string   # What this file does

        tech_stack:
          - name: string          # Library/technology
            version: string       # Version constraint (e.g., "^16.0")
            why: string           # Why used (e.g., "Form validation")

        notes: string             # Additional implementation notes
```

## Field Descriptions

### project
- **name**: Project title
- **description**: One-sentence project summary
- **version**: Semantic versioning
- **status**: Overall project status
- **last_updated**: When this spec was last updated

### phases
Array of implementation phases, each containing:

#### phase
- **name**: Phase title (e.g., "Phase 1: Foundation & CMS Core")
- **description**: What this phase achieves
- **status**: Current status of the phase
- **estimated_duration**: Time estimate (informational)
- **progress**: Percentage complete (0-100)

#### features (within phase)
Array of features in this phase, each containing:

##### feature
- **name**: Human-readable feature name
- **id**: Unique identifier (kebab-case, e.g., "survey-link-generation")
  - Used for referencing in dependencies
  - Should be stable across time
- **description**: What the feature does (1-2 sentences)
- **status**: pending | in-progress | complete
- **acceptance_criteria**: List of testable requirements
  - Each should be a complete sentence starting with a verb
  - Example: "User can create surveys" not "surveys"
  - `verified` field indicates if requirement has been tested
- **dependencies**: Features that must be completed first
  - Include `reason` to explain why (e.g., "needs user auth")
- **files_involved**: Which files implement this feature
  - `type`: Categorize files (component, action, query, etc.)
  - `description`: What the file does
- **tech_stack**: Technologies/libraries used by this feature
  - `why`: Justification for using this library
- **notes**: Implementation guidance, gotchas, or context

## Usage for AI Assistants

### Reading the Spec

```yaml
# Find all features in Phase 2
phase: "Phase 2"
features:
  - feature.id
  - feature.acceptance_criteria
  - feature.dependencies

# Understand what to build
feature: "survey-form"
acceptance_criteria: [...]  # Testable requirements
dependencies: [...]         # Must do these first
files_involved: [...]       # Where to write code
```

### Updating the Spec

After completing a feature:
1. Change `status` from `in-progress` to `complete`
2. Mark `acceptance_criteria[*].verified = true`
3. Update `phase.progress` percentage
4. Update `project.last_updated` date

## Example Feature

```yaml
- name: "Survey Link Generation"
  id: "survey-link-generation"
  description: "Generate unique shareable links with optional expiration, max submissions, and client email"
  status: complete

  acceptance_criteria:
    - description: "Lawyer can generate link from survey detail page"
      verified: true
    - description: "Link has unique token and can be copied to clipboard"
      verified: true
    - description: "Link can be configured with expiration date"
      verified: true
    - description: "Link tracks submission count with optional max limit"
      verified: true
    - description: "Expired or max-submission-reached links show error to client"
      verified: true

  dependencies:
    - feature_id: "authentication"
      reason: "Only authenticated lawyers can generate links"
    - feature_id: "database-schema"
      reason: "Needs survey_links table"

  files_involved:
    - path: "apps/cms/features/surveys/actions.ts"
      type: "action"
      description: "Server Action for creating/deleting survey links"
    - path: "apps/cms/features/surveys/components/SurveyLinks.tsx"
      type: "component"
      description: "UI for generating and managing links"
    - path: "apps/cms/features/surveys/queries.ts"
      type: "query"
      description: "Fetch survey links for a survey"

  tech_stack:
    - name: "crypto.randomUUID()"
      version: "built-in"
      why: "Generate unique tokens"
    - name: "TanStack Query"
      version: "^5.0"
      why: "Refetch links after mutation"

  notes: "Unlimited submissions by default (max_submissions = null)"
```

## Benefits for AI Assistants

1. **Dependency Resolution**: AI can identify blocking dependencies before implementing
2. **Acceptance Criteria**: AI knows exactly what counts as "done"
3. **File Organization**: AI knows where to create/modify files
4. **Tech Stack Consistency**: AI can suggest appropriate libraries
5. **Status Tracking**: AI can report progress accurately
6. **Context**: Each feature documents its purpose and constraints

## Tips for Maintaining the Spec

### Keep It Current
- Update after each feature completion
- Sync with PROJECT_ROADMAP.md
- Review before starting new phases

### Be Specific
- Acceptance criteria should be testable, not vague
- File paths should be exact (from repo root)
- Dependencies should explain *why*

### Structure for Parsing
- Use consistent naming (kebab-case for IDs)
- Keep feature IDs stable (don't change them after creation)
- Use consistent status values (pending | in-progress | complete)

### AI Usage
- Include references from ROADMAP when relevant
- Link related features in dependencies
- Add implementation notes that would help AI understand constraints

## Integration Points

This spec works alongside:
- **PROJECT_ROADMAP.md**: High-level roadmap with timelines (for humans)
- **CODE_PATTERNS.md**: Code patterns and examples (for humans)
- **ARCHITECTURE.md**: Technical architecture details (for humans)
- **PROJECT_SPEC.yaml**: Machine-readable features & dependencies (for AI)

**Hierarchy:**
1. PROJECT_SPEC.yaml ← Source of truth for feature definitions
2. PROJECT_ROADMAP.md ← Synced from spec, adds timeline/narrative
3. CODE_PATTERNS.md ← Shows how to implement features
4. ARCHITECTURE.md ← Technical deep dives

## Next Steps

1. Create `PROJECT_SPEC.yaml` with current project phases
2. Use spec to generate sections of PROJECT_ROADMAP.md
3. Reference spec in implementation guides
4. Update spec as features complete
