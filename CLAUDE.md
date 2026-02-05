# Legal-Mind Project Overview

## n8n Infrastructure

### n8n-vps (Infrastructure)

**Location:** `infra/n8n-vps/` (symbolic link to `../../n8n-vps`)

**Repository:** `git@github.com:marcinjucha/n8n-vps.git`

**Purpose:** VPS infrastructure configuration for n8n deployment

**Contents:**
- Docker Compose setup
- Traefik reverse proxy configuration
- Monitoring setup
- Deployment scripts

**Usage:**
- Reference for understanding n8n deployment architecture
- AI can read this to help build workflows in n8n
- Rarely modified during legal-mind development
- Changes typically made through n8n web UI, not in this repo

**Key Files:**
- `docker-compose.yml` - n8n service configuration
- `traefik/` - Reverse proxy setup
- `monitoring/` - Observability configuration

---

### n8n-workflows (Workflow Definitions)

**Location:** `n8n-workflows/` (in legal-mind root)

**Purpose:** Exported n8n workflow definitions used by legal-mind

**Pattern:** See `.claude/skills/n8n-workflows/SKILL.md` for workflow integration patterns

**Reference:** Background processing decisions and patterns documented in project docs

---

## Repository Structure

```
legal-mind/
├── infra/
│   └── n8n-vps/          # Symlink to n8n infrastructure repo
├── n8n-workflows/         # Workflow definitions for background processing
├── apps/
│   ├── cms/              # CMS application
│   └── website/          # Public website
├── packages/             # Shared packages
└── supabase/            # Database migrations and config
```

---

## Quick Reference

**When working with n8n:**
1. Infrastructure questions → Check `infra/n8n-vps/`
2. Workflow patterns → Check `.claude/skills/n8n-workflows/SKILL.md`
3. Background processing → n8n handles async AI operations (see docs)
