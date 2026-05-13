---
name: blueprint
description: "Plan a new feature, service, or system using intents. Guides you from idea → tech stack → decomposed intent files. Also runs in maintenance mode to catch up the repo after intents complete. Triggers: 'I want to build X', 'plan a new feature', 'help me design', 'create intents for', 'what should I build next', 'catch up the repo', 'update project context'."
---

# Blueprint — Feature Planning with Intents

Turn an idea into a set of scoped, PR-sized intent files ready to hand off to any AI agent. Two modes: **Plan** (new feature) and **Sync** (catch-up after intents complete).

Intent files carry full YAML frontmatter (`intent-id`, `title`, `owner`, `status`, `created`, `updated`, `verified-against`, `verified-at`, `generated-by: blueprint`) — the same freshness pattern used by other skills (scaffold-context, architecture). This enables drift detection in Sync mode.

Conflict detection (Mode 1) and per-intent staleness checks (Mode 2) are delegated to Haiku sub-agents rather than performed inline. The main agent (Sonnet) reads their structured output and surfaces issues via `AskUserQuestion`.

`AGENTS.md` regeneration is never done inline. Blueprint always delegates to init's "Procedure: Assemble AGENTS.md" in `.agents/SKILL-implementation.md`. If that section is missing, blueprint aborts and reports the gap.

> **BEFORE EXECUTING:** Read `.agents/skills/blueprint/SKILL-implementation.md` for the full step-by-step logic — orientation checks, AskUserQuestion payloads, intent templates, assembly rules, self-management steps, and error handling. This page is orientation only; the implementation doc is the contract.

---

## When to Use

| Situation | Mode |
|---|---|
| You have a new idea and want to plan the work | **Plan** |
| Intents have shipped; repo context is stale | **Sync** |
| You want to see what's open / in-flight | **Sync** (read-only) |
| A tech decision needs an ADR before you build | **Plan** (will offer ADR) |

---

## Mode 1: Plan

A guided conversation that produces:

1. **Shared understanding** — what the feature is, why it matters, constraints.
2. **Stack validation** — uses your existing `project_context.md`; flags gaps; proposes ADR if a significant new technology is introduced.
3. **Decomposition** — the feature broken into PR-sized work units, each reviewed with you.
4. **Intent files** — one `.agents/intents/open/YYYY-MM-DD-<slug>.md` per work unit, fully populated:
   - Goal, success criteria, scope, out-of-scope, plan, risks.
5. **Repo update** — `project_context.md`, `AGENTS.md`, and `llms.txt` refreshed if the stack or structure changed.
6. **Optional ADR** — `.agents/architecture/decisions/NNNN-<slug>.md` for any significant tech choice.

### Discovery questions (in order)

1. What do you want to build? (free text)
2. What problem does it solve / who does it serve?
3. Any hard constraints? (deadline, perf, compatibility, must-reuse)
4. Is this on the existing stack or does it introduce something new?
5. *(If new tech)* What are you considering, and why?

Claude reads `.agents/project_context.md` first and uses it to ground every answer — no re-explaining what you already documented.

---

## Mode 2: Sync

Runs when you already have in-flight or recently-shipped intents and the repo needs a catch-up.

1. **Reads** `.agents/intents/{open,in-flight,done}/` to build a status picture.
2. **Asks** which in-flight intents have shipped.
3. **Moves** confirmed intents to `done/`.
4. **Checks** whether `project_context.md`, `AGENTS.md`, and `llms.txt` reflect the current state.
5. **Regenerates** assembled files if stale.
6. **Surfaces** what's left open and asks if you want to start a Plan session for the next thing.

---

## What Gets Created / Updated

### Always (Plan mode)
- `.agents/intents/open/YYYY-MM-DD-<slug>.md` — one per work unit

### Conditionally
- `.agents/project_context.md` — if stack or structure changed
- `AGENTS.md` — regenerated if `project_context.md` changed
- `llms.txt` — regenerated if structure changed
- `.agents/architecture/decisions/NNNN-<slug>.md` — if a significant tech choice was made

### Always (Sync mode)
- Intent files moved between `open/` → `in-flight/` → `done/`
- Intent frontmatter (`status`, `updated`, `verified-against`, `verified-at`) refreshed on each transition
- `AGENTS.md` regenerated if stale (delegated to init's assembly procedure, not assembled inline)

---

## Self-Management Contract

The blueprint skill keeps the repo honest:

- **Never creates intents that conflict with existing open/in-flight scope** — conflict detection is delegated to a Haiku sub-agent; results are surfaced via `AskUserQuestion` before any files are created.
- **Reads `global_core.md` and `project_context.md` before every session** — its proposals are grounded in your actual standards.
- **Only touches files in its mandate** — `.agents/intents/`, `.agents/architecture/decisions/`, `project_context.md`, `AGENTS.md`, `llms.txt`. Nothing else.
- **Never moves work to `done/`** without your explicit confirmation.
- **Flags when intents in `in-flight/` are getting stale** — per-intent staleness is delegated to a Haiku sub-agent (checks scope-file git activity and the `updated` field). Flagged intents are presented with options: defer / cancel / update-status / split-intent.
- **Never reassembles `AGENTS.md` inline** — always delegates to init's "Procedure: Assemble AGENTS.md". If that procedure is missing, blueprint aborts rather than guessing the format.

---

## Implementation

All execution logic — orientation checks, exact AskUserQuestion payloads, intent template filling, assembly commands, error handling, and edge cases — lives in **[`SKILL-implementation.md`](SKILL-implementation.md)**. Read it before executing.
