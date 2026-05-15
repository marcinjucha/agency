# Project Memory: Halo Efekt

> Curated 2026-05-15. Durable patterns live in skills (`ag-*`, `tanstack-*`, `vps-*`) and CLAUDE.md files (root, `apps/cms/`, `apps/cms/features/`, `n8n-workflows/`, `supabase/`, `packages/calendar/`). ADR-006 (Project Structure) + ADR-008 (Workflow Engine) hold architectural decisions. This file holds only what code/skills/CLAUDE.md cannot tell you.

## Production State

- **Tenant "Halo Efekt":** email `kontakt@haloefekt.pl`, id `19342448-4e4e-49ba-8bf0-694d5376f953`.
- **`email_configs` table empty in production** — n8n uses hardcoded Resend fallback (`noreply@haloefekt.pl`).
- **`notification_email` lives per `survey_link`, not per tenant** — each link has its own notification address.
- **`HALOEFEKT_TENANT_ID` is hardcoded in 12+ places — keep hardcoded, do NOT promote to env var.** UUID `19342448-4e4e-49ba-8bf0-694d5376f953` duplicated across migrations, n8n workflows, seed files, production code. Stable non-secret single-tenant identifier → hardcode is correct. Captured to forestall recurring "should this be in env?" debates.

## Worktree Gotchas

- **Old stash from another branch can auto-apply during fresh worktree creation.** `pnpm install` in a newly-created worktree triggered `git stash pop` (mechanism unclear — possibly stale `.git/hooks/post-checkout`), polluting the worktree with regressions from another feature. Rule: in a fresh worktree, run `git status` BEFORE staging any code. Restore unrelated dirty files via `git checkout HEAD -- <file>`. Also check `git stash list` — entries from other branches may pop unexpectedly.

## Workflow Preferences

- **"nie uzywaj db dockera" — do NOT apply migrations via `docker exec ... psql` against the local Supabase Docker container** (2026-05-15, AAA-T-232). User explicitly rejected the pattern of running `docker exec -i supabase_db_<dir> psql -U postgres -d postgres < <migration>.sql` + manual `INSERT INTO supabase_migrations.schema_migrations` to register it. WHY: the local Docker DB container is keyed off the MAIN checkout directory name (see "Worktree Gotchas" — `supabase_db_legal-mind`), which makes the workflow fragile across worktrees, leaves the local DB in a hand-edited state divergent from migration history, and bypasses the migration system's bookkeeping (`supabase migration list` becomes a lie until `migration repair` is run). HOW TO APPLY INSTEAD (in order of preference): (1) Trust staging/prod as source of truth — `supabase link --project-ref <id>` + `supabase migration list --linked` to verify state, then `supabase db push` to apply remaining migrations through the proper system. (2) For local schema sync, use `supabase db pull` to mirror remote schema, or `supabase db reset` to replay all migrations from scratch through the CLI (not psql). (3) Regenerate types via `supabase gen types typescript --linked` (against remote) rather than `--local` when possible. (4) If a prior session already did inline psql DDL and `db push` now fails with "column does not exist", use `supabase migration repair --status applied <version>` to register the ad-hoc migration WITHOUT re-running its SQL — never reach for `docker exec psql` as the fix. Generalize: never bypass the Supabase migration CLI by going straight to the Docker container, regardless of how convenient it seems.

- **`git add <explicit-path>` + `git commit` still picks up files already staged in INDEX from prior sessions.** This session's commit accidentally swept in 4 unrelated `docs/sessions/*.md` deletions that were sitting in the index from a previous session. Rule: before staging new work, run `git status` to see what's ALREADY in the index, and `git restore --staged <path>` to drop pre-staged entries that don't belong to the current commit. Specifying paths in `git add` only ADDS — it does not implicitly limit the commit to those paths. The commit's scope is the entire index, not the args to `git add`.
