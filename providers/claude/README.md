# Claude Code — Optimized Scaffold

> Drop-in scaffold for [Claude Code](https://code.claude.com) (Anthropic's CLI coding agent). Tuned for the **2026 Skills-first model** — custom commands are now skills, hooks are first-class enforcement, subagents handle delegated work.

## What's in this folder

```
claude/
├── README.md                           ← you are here
├── docs/
│   ├── best-practices.md               ← concise field guide (read once)
│   └── anti-patterns.md                ← what NOT to do (read once)
└── scaffold/                           ← drop into your target repo
    ├── CLAUDE.md                       ← memory file, imports AGENTS.md
    ├── AGENTS.md                       ← cross-tool portable contract
    ├── .mcp.json                       ← MCP servers (sample)
    └── .claude/
        ├── settings.json               ← permissions, hooks, model
        ├── settings.local.json.example ← personal overrides (gitignored)
        ├── skills/
        │   ├── NOTICES.md                       ← MIT credits for adapted skills
        │   ├── init-claude-standards/SKILL.md   ← interactive setup skill
        │   ├── commit-and-push/SKILL.md
        │   ├── review-pr/SKILL.md
        │   ├── grill-with-docs/                 ← stress-test plans against domain model
        │   ├── to-prd/                          ← conversation → PRD on issue tracker
        │   ├── to-issues/                       ← plan/PRD → vertical-slice issues
        │   ├── zoom-out/                        ← higher-level perspective on code
        │   ├── tdd/                             ← red-green-refactor loop
        │   ├── diagnose/                        ← disciplined bug-diagnosis loop
        │   ├── prototype/                       ← throwaway logic or UI prototypes
        │   ├── improve-codebase-architecture/   ← deepening opportunities
        │   ├── triage/                          ← state-machine issue triage
        │   └── handoff/                         ← compact conversation for next agent
        ├── agents/
        │   └── security-reviewer.md    ← read-only Sonnet subagent
        ├── hooks/
        │   ├── block-secret-writes.sh  ← PreToolUse Write|Edit
        │   ├── block-destructive-bash.sh ← PreToolUse Bash
        │   └── lint-after-edit.sh      ← PostToolUse Write|Edit
        └── output-styles/
            └── pr-review.md
```

## Install into a target repo

```bash
# From this repo, copy the scaffold into your target project:
cp -r providers/claude/scaffold/. /path/to/your-repo/

# Then in the target repo, open Claude Code and run:
/init-claude-standards
```

The `init-claude-standards` skill walks you through detecting your stack, customizing `CLAUDE.md` and `AGENTS.md`, and pruning skills/hooks you don't need.

## Why this layout

| Surface | Used for | Why |
|---|---|---|
| `CLAUDE.md` (≤200 lines) | Memory injected every session | Single canonical entry point. First line is `@AGENTS.md` to share the contract with Codex/Cursor/Windsurf without duplication. |
| `AGENTS.md` | Cross-tool contract | Plain Markdown, no Claude-specific syntax. Other tools that read AGENTS.md inherit the same rules. |
| `.claude/settings.json` | Hard enforcement: permission allow/deny, hooks, model | Settings are *enforced*; memory is *advisory*. Anything that must happen every time lives here. |
| `.claude/skills/` | Reusable workflows (commit, review-PR, init) | Skills replaced commands in 2025. Auto-discoverable by description; can be `/`-invoked or model-invoked. |
| `.claude/agents/` | Delegated work (security review, log spelunking) | Subagents protect main context from log/file dumps and can run cheaper models. |
| `.claude/hooks/` | Deterministic guards (block secret writes, lint after edit) | The only place a rule is truly un-skippable. CLAUDE.md rules can be overridden by clever prompts; hooks cannot. |
| `.mcp.json` | MCP servers (GitHub, Sentry, etc.) | Project-scoped, committed for team sharing. |

## What's missing on purpose

- **No `.claude/commands/`** — commands are deprecated to skills. Same frontmatter, better lifecycle.
- **No long architecture essays** in `CLAUDE.md` — those rot. Use `AGENTS.md` for stable contract, README.md for narrative.
- **No "be careful" platitudes** — Claude ignores them. Hooks for must-happen, terse rules for behavior.

## Compatibility

- Requires Claude Code **v2.1.59+** for auto-memory and the merged-skills behavior.
- Hooks use POSIX shell; Windows users should run them via WSL or rewrite as `.ps1` and update `settings.json`.

## Credits

Ten of the bundled skills (`grill-with-docs`, `to-prd`, `to-issues`, `zoom-out`, `tdd`, `diagnose`, `prototype`, `improve-codebase-architecture`, `triage`, `handoff`) are adapted from [`mattpocock/skills`](https://github.com/mattpocock/skills) under MIT. See [`scaffold/.claude/skills/NOTICES.md`](scaffold/.claude/skills/NOTICES.md) for the full notice.

## See also

- [`docs/best-practices.md`](docs/best-practices.md) — when to use skills vs. subagents vs. hooks
- [`docs/anti-patterns.md`](docs/anti-patterns.md) — the five named failure modes
- [`../../shared/principles.md`](../../shared/principles.md) — the canonical rules this scaffold expresses
