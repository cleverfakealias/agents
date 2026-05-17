---
trigger: model_decision
description: Rules for writing and reviewing database migrations (Prisma, Drizzle, Alembic, Flyway, Knex, or raw SQL). Apply when generating, editing, or reviewing migration files or schema changes. Covers reversibility, destructive-op safety, concurrent-write safety, and prod-deploy gating.
---

# Database Migrations

- Every `up` needs a verified `down` / `downgrade`. If the change is genuinely irreversible (e.g., data delete), state it explicitly in a comment.
- Destructive ops (`DROP`, `ALTER ... DROP COLUMN`, `TRUNCATE`) require a comment block with: rollback plan, data-loss assessment, and the deploy that stopped writing to the affected column.
- **Two-step destructive drops**: stop writing to the column in release N; drop the column in release N+1. Never both in one migration.
- Backfill data in a separate migration from the schema change. Backfills must be idempotent.
- Indexes on large tables: use `CREATE INDEX CONCURRENTLY` (Postgres) or the equivalent. Index creation in a separate migration from the column it indexes.
- Never run migrations against prod without a `--dry-run` first AND a reviewed plan.

## Tool-specific

- **Prisma**: `prisma migrate dev` for local; `prisma migrate deploy` for prod. Never edit generated SQL after the migration has been applied somewhere.
- **Alembic**: `op.execute()` for raw SQL. Always provide `downgrade()`.
- **Drizzle**: snapshot diffs should be reviewed by a human before being applied.
- **Knex**: keep migrations append-only — never edit an existing migration that's been run elsewhere.
