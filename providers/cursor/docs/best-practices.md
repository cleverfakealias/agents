# Cursor — Best Practices (2026)

Distilled from `cursor.com/docs/rules`, `cursor.com/docs/mcp`, `cursor.com/docs/cloud-agent`, `cursor.com/changelog`.

## The four rule types

Each `.cursor/rules/<name>.mdc` is YAML frontmatter + Markdown body. The frontmatter determines **when** the rule enters context.

| Type | `alwaysApply` | `description` | `globs` | Triggered by |
|---|---|---|---|---|
| **Always** | `true` | omit | omit | Every chat/agent turn |
| **Auto Attached** | `false` | optional | required (comma-separated) | A file in context matches the glob |
| **Agent Requested** | `false` | **required** | omit | Agent decides from the description |
| **Manual** | `false` | omit | omit | User types `@rule-name` |

**Example — Always:**
```mdc
---
alwaysApply: true
---
- Never edit files in `vendor/` or `dist/`.
- Use `pnpm`, not `npm`.
```

**Example — Auto Attached:**
```mdc
---
description: TypeScript React conventions for src/
globs: src/**/*.ts, src/**/*.tsx
alwaysApply: false
---
- Server Components by default; add "use client" only when interactive.
- Use `interface` for object shapes, `type` for unions.
- Reference: @src/components/Button.tsx
```

**Example — Agent Requested:**
```mdc
---
description: Apply when writing or reviewing database migrations (Prisma, Drizzle, Alembic, raw SQL). Covers reversibility and destructive-op safety.
alwaysApply: false
---
- Every `up` needs a verified `down`.
- Destructive ops require a comment block: rollback plan + data-loss assessment.
```

**Example — Manual:**
```mdc
---
alwaysApply: false
---
(only invoked when user types `@security-review`)
```

## Precedence

When Cursor assembles context, sources merge in this order; earlier wins on conflict:

1. **Team Rules** (org-level, enterprise feature)
2. **Project Rules** (`.cursor/rules/*.mdc`)
3. **`AGENTS.md`** (root + nested)
4. **User Rules** (set in Cursor Settings, global)

## `AGENTS.md` — native since 2025

Plain Markdown, **no frontmatter**, no globs. Root file + nested per-directory files combine; deeper paths take precedence on conflict.

Recommended split:
- **AGENTS.md** — cross-tool portable house rules (Codex / Claude / Cursor / Windsurf all read it)
- **`.cursor/rules/*.mdc`** — Cursor-specific scoping (globs, agent-requested, manual)

They coexist cleanly. Don't duplicate content between them.

## User Rules (settings, not files)

Set in **Settings → Rules → User Rules**. Plain text, global across all projects, **applies only to Chat/Agent** (not Inline Edit, not Tab).

Use for personal preferences: "be terse", "no emojis", preferred natural language. **Don't** put project-specific architecture or stack info here — that belongs in `.cursor/rules/` or `AGENTS.md` so teammates inherit it.

## Memories

Auto-generated rules synthesized from chat history. **Enable:** Settings → Rules → Generate Memories. They're stored as managed rules and feed the same context-injection path. Per-project. Treat as a convenience layer over rules, not a replacement.

## Custom Commands (Cursor 1.6+)

**Path:** `.cursor/commands/<name>.md` (project) or `~/.cursor/commands/<name>.md` (global).
**Format:** **plain Markdown, NO frontmatter.** (This differs from Claude skills — strip frontmatter when porting.)
**Invoke:** `/` in Agent input → pick from dropdown. Filename (kebab-case) becomes the command name.

```md
<!-- .cursor/commands/open-pr.md -->
Run `pnpm lint && pnpm test`. If both pass, stage all changes,
write a conventional-commits message describing the diff, push,
and open a PR using `gh pr create` with a Why / What / Test plan body.
```

## MCP — `.cursor/mcp.json`

**Scopes:** `.cursor/mcp.json` (project, commit it) and `~/.cursor/mcp.json` (global).

```json
{
  "mcpServers": {
    "stdio-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"],
      "env": { "LOG_LEVEL": "info" },
      "envFile": ".env"
    },
    "http-server": {
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${env:API_TOKEN}" }
    },
    "oauth-server": {
      "url": "https://api.example.com/mcp",
      "auth": { "CLIENT_ID": "...", "scopes": ["read", "write"] }
    }
  }
}
```

Interpolation: `${env:NAME}`, `${userHome}`, `${workspaceFolder}`, `${workspaceFolderBasename}`. OAuth callback: `cursor://anysphere.cursor-mcp/oauth/callback`. Pre-approved tools: `~/.cursor/permissions.json`.

## Background / Cloud Agents — `.cursor/environment.json`

```json
{
  "snapshot": "snapshot-20260301-abc123",
  "install": "pnpm install --frozen-lockfile",
  "start": "sudo service docker start",
  "terminals": [
    { "name": "dev", "command": "pnpm dev", "ports": [3000] },
    { "name": "tsc", "command": "pnpm tsc --watch" }
  ],
  "env": { "NODE_ENV": "development" },
  "persistedDirectories": ["node_modules", ".next/cache"]
}
```

**Fields:**
- `snapshot` — cached VM/disk image id (faster boot)
- `build.dockerfile` + `build.context` — paths relative to `.cursor/`
- `install` — idempotent dependency script (disk cached)
- `start` — environment startup command
- `terminals` — background processes in tmux
- `env` — environment variables
- `persistedDirectories` — survive across sessions

**Secrets:** never in `environment.json`; use the Secrets tab at `cursor.com/dashboard/cloud-agents`.

## Tab is separate

Rules don't feed Tab. To shape Tab output: write good neighbor code; Tab learns from local context.

## Sources

- [Rules](https://cursor.com/docs/rules)
- [MCP](https://cursor.com/docs/mcp)
- [Cloud Agent Setup](https://cursor.com/docs/cloud-agent/setup)
- [Changelog 1.6 (custom commands)](https://cursor.com/changelog/1-6)
- [agents.md spec](https://agents.md/)
