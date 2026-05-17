# Claude Code — Anti-Patterns

The named failure modes from `code.claude.com/docs/en/best-practices` and what to do instead.

## The five named failure modes

| Mode | Symptom | Fix |
|---|---|---|
| **Kitchen-sink session** | One session does ten unrelated tasks; context bloats; Claude loses thread | Start a new session per logical task. Use `/clear` between unrelated work. |
| **Infinite exploration** | Claude reads everything before doing anything | Tell Claude what file/area to focus on. Use the `Explore` subagent for survey questions instead of letting main agent wander. |
| **Correction loops** | "No, do X instead. No, that's wrong. No..." | Stop the loop. Give Claude a concrete example or a failing test. If still wrong, rewrite the request from scratch — the loop is sunk cost. |
| **Over-specified CLAUDE.md** | 600-line CLAUDE.md, Claude ignores half | Cut to ≤200 lines. Move workflows to skills, language rules to scoped `.claude/rules/*.md`, must-happen to hooks. |
| **Trust-then-verify gap** | "It says it ran the tests" — but didn't | Use `PostToolUse` hooks to *verify* (`pnpm test`), not just *request* (CLAUDE.md says "run tests"). |

## CLAUDE.md anti-patterns

**Don't put in CLAUDE.md:**

- Things Claude can read from code (file lists, function signatures, imports).
- Standard language conventions ("use semicolons in JS"). Claude knows.
- Long API docs (link instead — `See @docs/api-reference.md`).
- File-by-file architecture descriptions. They rot the moment you refactor.
- Frequently-changing info (current sprint, today's deploy).
- Platitudes: "write clean code", "be careful", "follow best practices".
- Aspirational rules with no enforcement ("always run tests" — make it a hook).

**Do put in CLAUDE.md:**

- Commands Claude can't guess (`pnpm verify` runs lint+typecheck+test).
- Project-specific style deltas from your language's default.
- Test-runner preferences and flags.
- Env-var quirks ("`NODE_ENV=test` required for migrations").
- Non-obvious gotchas ("the API gateway strips trailing slashes").
- Repo etiquette (commit format, branch naming).

## Imports don't save context

`@path/to/file` expands at launch like a C `#include`. There's no lazy loading. Splitting one 200-line file into ten 20-line imported files saves you nothing — the bytes still load.

**Use imports for organization (humans navigating), not optimization (Claude's context).**

## Rule rot

Conflicting rules cause Claude to pick arbitrarily. Schedule a quarterly review:

1. Grep `CLAUDE.md` for rules referencing files/symbols that no longer exist.
2. Diff against `git log -- CLAUDE.md` — anything older than a year deserves "still true?" scrutiny.
3. Remove rules that defend against a one-off bug from 2024.

## Skills anti-patterns

- **Skill body >500 lines** — Claude truncates or loses focus. Split into multiple skills or move detail to `references/`.
- **`description` too vague** — Claude won't trigger. Be specific: "Use when the user asks to review a PR or before merging" beats "PR review."
- **`disable-model-invocation: true` on everything** — defeats auto-discovery. Set this only for destructive ops where you want `/`-only invocation.
- **Skills that duplicate hooks** — if it must happen every time, it's a hook, not a skill.

## Hooks anti-patterns

- **Hook with `timeout` missing** — hangs lock up the session. Always set `"timeout": <seconds>`.
- **Hook that writes to disk without logging** — when it fires unexpectedly you have no audit trail. Echo to a log file.
- **Hook that exits 2 with cryptic message** — Claude sees the stderr. Make it actionable: "blocked: writes to migrations/ require explicit user confirmation in CLAUDE.md `<rules id="migrations">`".

## Subagent anti-patterns

- **Subagent with all tools enabled** — defeats the point. Cap `tools:` to the minimum.
- **Subagent for one-off questions** — adds latency and breaks context. Use main agent for trivial lookups.
- **Identical subagents differing only in `model`** — confusing. Use one subagent and pass model via skill arg.

## MCP anti-patterns

- **MCP server marked `trust: true`** — bypasses approval. Only for servers you wrote.
- **MCP secrets in `.mcp.json`** — committed → leaked. Use `${ENV_VAR}` interpolation.
- **Too many MCP servers** — clutters the tool list, slows startup, exhausts the context budget for tool descriptions.

## Process anti-patterns

These bite once skills like `/tdd`, `/diagnose`, and `/improve-codebase-architecture` enter the workflow.

### Horizontal-slice TDD

Writing all tests first, then all implementation. Produces tests of *imagined* behavior rather than *actual* behavior — they pass when the system is broken and fail when it isn't. **Fix**: one test → one implementation → repeat. Each test responds to what the previous cycle taught you.

### Shallow modules

A module whose interface is nearly as complex as its implementation isn't earning its keep. Common symptom: every change touches the module *and* every caller. **Fix**: apply the deletion test — if removing the module concentrates complexity elsewhere it's deep; if removing it doesn't change much, it was a pass-through. Deepen by moving caller-side logic behind a smaller interface.

### Mocking what you own

A test that mocks your own classes/modules is testing implementation, not behavior. It breaks on every refactor while letting real behavior changes slip through. **Fix**: mock only at *system boundaries* (network, fs, time, third-party APIs). Verify your own code through its public interface.

### "Boundary" drift

The word "boundary" overloads with DDD's bounded context. Architecture conversations get confused. **Fix**: say **seam** (Feathers) or **interface**. Reserve "boundary" for the DDD sense, or skip it entirely.

### ADRs for everything

If every PR ships an ADR, none of them carry weight and future readers stop reading them. **Fix**: the three-test gate — hard to reverse, surprising without context, real trade-off. If any leg is missing, write a commit message and move on.

### Verbose-without-glossary

Without a `CONTEXT.md`, the agent uses three sentences and four synonyms for the same concept each session. Token waste compounds. **Fix**: capture domain terms in `CONTEXT.md` as they're resolved — one sentence each, aliases-to-avoid surfaced.

## Sources

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)
- [Memory](https://code.claude.com/docs/en/memory)
- [Skills](https://code.claude.com/docs/en/skills)
- [Hooks](https://code.claude.com/docs/en/hooks)
