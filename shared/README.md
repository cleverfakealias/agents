# `shared/` — Canonical Source Rules

This directory holds the **substance** every provider scaffold expresses. The form differs per provider; the substance is fixed here.

## What's here

- **[`principles.md`](principles.md)** — the 10 canonical principle blocks (identity, reasoning, code quality, edit discipline, communication, security, agentic safety, secrets, testing, commits & PRs). Source of truth.

## What's NOT here

- **No provider-specific tactics.** "Use hooks for enforcement" → that's a Claude tactic, lives in `providers/claude/`.
- **No assembled outputs.** This file is read by humans editing the provider scaffolds, not by AI agents at runtime.
- **No file templates.** Each `providers/<name>/scaffold/` is the template.

## How to use it

When you change a principle here:
1. Grep the six `providers/<name>/scaffold/` trees for the affected wording.
2. Update each in its native idiom.
3. Bump the version note at the top of each provider's `README.md` if the change is material.

When a provider's official docs change (e.g., Cursor adds a new rule trigger type):
1. Update **only** `providers/<name>/`.
2. Do **not** touch `principles.md` — it codifies your standards, not theirs.
