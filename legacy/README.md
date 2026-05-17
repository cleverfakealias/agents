# Legacy — pre-split scaffold

> The contents of this folder are the old **single-folder, multi-provider** scaffold that this repo used before the May 2026 split. Preserved for reference and migration. **Not actively maintained.**

## What's here

```
legacy/
└── .agents/
    ├── global_core.md            # universal rule set (replaced by ../../shared/principles.md)
    ├── project_context.md        # per-repo template (each provider now ships its own)
    ├── SKILL.md / SKILL-implementation.md   # interactive init skill (replaced by per-provider init mechanisms)
    ├── shims/                    # per-model rule files (replaced by per-provider full scaffolds)
    ├── skills/                   # additional skills (blueprint, scaffold-context, etc.)
    ├── architecture/             # optional Mermaid + ADR layer
    ├── intents/                  # optional intent-spec layer
    ├── nested-agents-md.template.md
    └── README.md                 # original docs
```

## Why it was deprecated

The original scaffold tried to serve every provider from one folder via "shims" — small per-model files that referenced `global_core.md`. That worked but produced a **least-common-denominator** result: no provider got an optimized setup using its **native idioms** (Claude skills with hooks, Copilot `.prompt.md` + `.agent.md` files, Cursor `.mdc` rule triggers, Gemini TOML commands, Codex profiles + override files, Windsurf rule triggers + workflows).

The new structure (`providers/<name>/`) gives each provider a **complete, hand-tuned scaffold** using its own native mechanisms. See [`../README.md`](../README.md) and [`../providers/`](../providers/).

## When you might still want this

- You explicitly want a one-folder drop-in for a small project where the per-provider native optimization isn't worth the layout overhead.
- You're maintaining an older repo that already uses this layout and you don't want to migrate.
- You want to read the original `SKILL.md` / `SKILL-implementation.md` as a reference for what an interactive init mechanism looks like.

## Migration to the new layout

For a project currently using the legacy `.agents/`:

1. Pick **one** provider you actually use day-to-day (or two, if you switch between, e.g., Claude Code at the terminal and Cursor in the IDE).
2. Copy that provider's `providers/<name>/scaffold/` into the project root.
3. Run that provider's init mechanism (skill / prompt / command / workflow) — it'll detect your stack and fill placeholders.
4. Delete `legacy/.agents/` from your project (or keep it for the optional architecture / intent layers — those are still good ideas, just not coupled to any specific provider).

If you used the optional **architecture** or **intents** layers from the old `.agents/`, they're still here in `legacy/.agents/architecture/` and `legacy/.agents/intents/`. They're tool-agnostic Markdown / Mermaid; copy them into your new layout if you want them.
