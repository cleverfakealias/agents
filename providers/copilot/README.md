# GitHub Copilot — Optimized Scaffold

> Drop-in scaffold for [GitHub Copilot](https://docs.github.com/en/copilot) (VS Code chat, agent mode, and the cloud **Copilot coding agent**). Tuned for the 2026 file-based customization model — settings-based `codeGeneration.instructions` are deprecated; `.instructions.md` / `.prompt.md` / `.agent.md` win.

## What's in this folder

```
copilot/
├── README.md                                ← you are here
├── docs/
│   ├── best-practices.md
│   └── anti-patterns.md
└── scaffold/                                ← drop into your target repo
    ├── AGENTS.md                            ← optional cross-tool contract (Copilot reads it since 2025-08)
    └── .github/
        ├── copilot-instructions.md          ← single global file, ≤2 pages
        ├── instructions/
        │   ├── typescript.instructions.md   ← applyTo: **/*.{ts,tsx}
        │   ├── python.instructions.md       ← applyTo: **/*.py
        │   └── tests.instructions.md        ← applyTo: **/*.{test,spec}.{ts,py}
        ├── prompts/
        │   ├── init-copilot-standards.prompt.md   ← interactive setup
        │   ├── new-component.prompt.md
        │   └── review-diff.prompt.md
        ├── agents/                          ← custom chat modes (renamed → agents in late 2025)
        │   ├── reviewer.agent.md
        │   └── planner.agent.md
        └── workflows/
            └── copilot-setup-steps.yml      ← env for the cloud coding agent
    └── .vscode/
        └── mcp.json                         ← workspace MCP servers
```

## Install into a target repo

```bash
cp -r providers/copilot/scaffold/. /path/to/your-repo/
```

Then in VS Code Chat (Copilot enabled), run:

```
/init-copilot-standards
```

The prompt walks you through detecting your stack, customizing `copilot-instructions.md`, deciding which language `.instructions.md` files to keep, and pruning unused prompts/agents.

## Why this layout

| Surface | Used for | Why |
|---|---|---|
| `.github/copilot-instructions.md` | Global, terse repo guidance | Auto-prepended to every Chat / agent / code-review / coding-agent request. Highest-leverage file. |
| `AGENTS.md` (optional) | Cross-tool contract | Copilot has read AGENTS.md since 2025-08-28 (coding agent) and 2025-11-12 (code review + agent mode). Coexists with `copilot-instructions.md` — both are sent additively. |
| `.github/instructions/*.instructions.md` | Path-scoped rules (TS, Py, tests) | `applyTo` glob keeps language rules out of the global file. Multiple matching files all apply. |
| `.github/prompts/*.prompt.md` | Parameterized, repeatable workflows | `/<promptname>` from Chat. Variables `${input:foo}`, `${selection}`, `${file}`. |
| `.github/agents/*.agent.md` | Persistent personas (reviewer, planner) | Locked tools/model across a conversation. Use for review/planning; use prompts for one-shot tasks. |
| `.vscode/mcp.json` | Workspace-scoped MCP servers | `sandboxEnabled: true` on stdio servers by default. |
| `.github/workflows/copilot-setup-steps.yml` | Cloud coding-agent environment | Required job name. ≤59min timeout. Ubuntu/Win x64 only. |

## What's deprecated and excluded

- `github.copilot.chat.codeGeneration.instructions` (VS Code setting) — **deprecated in 1.102**. Use `.instructions.md` files instead.
- `github.copilot.chat.testGeneration.instructions` — same.
- `.chatmode.md` — still parsed, but renamed to `.agent.md` in late 2025. New repos use the new name.

## Compatibility

- VS Code 1.102+ for the deprecation; older VS Code still reads `.chatmode.md`.
- `chat.useAgentsMdFile` and `chat.useNestedAgentsMdFiles` settings must be on (defaults vary by version) for AGENTS.md to participate.
- Cloud coding-agent setup steps job: ≤59min, Ubuntu x64 / Windows 64 only.

## See also

- [`docs/best-practices.md`](docs/best-practices.md)
- [`docs/anti-patterns.md`](docs/anti-patterns.md)
- [`../../shared/principles.md`](../../shared/principles.md)
