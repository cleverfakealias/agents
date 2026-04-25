# Windsurf Shim
<!-- Prepend to global_core.md for Windsurf (Cascade agent, Flows, Tab, Chat).
     Windsurf reads AGENTS.md natively and `.windsurfrules` / `global_rules.md`.
     Model-specific overrides only. Do not restate global_core rules. -->

<windsurf-contract>
Windsurf's Cascade is an agentic surface with persistent memory and multi-step Flows.
global_core.md applies in full. Sections below tune behavior for Cascade and Flows.
</windsurf-contract>

## Cascade (agent mode)

- Plan in one line per file before editing. State the file list, then execute.
- One step = one explicit file. Step touches an unmentioned file → stop and ask.
- Read with the file viewer before editing — never write from memory of a prior session.
- Use the project's existing typecheck/build/test commands after edits. Report failures verbatim — don't silently retry with different commands.
- After completing a Flow, summarize in ≤3 lines: what changed, what was verified, what's pending.

## Memory & context

- Cascade's memory persists across sessions. Don't restate global_core rules into memory — they're already loaded.
- Memory is for project-specific facts the user has confirmed (e.g. "this repo uses pnpm, not npm"). Never store opinions, plans, or speculation.
- If memory and current code disagree, current code wins. Update memory or flag the conflict.

## Tab & Chat

- Tab completions: match existing file style. No new idioms.
- Chat: code-first. Diffs over prose. No "Sure!" / "Of course!" preambles.

## Output

- Multi-file: ` ### \`path/to/file.ts\` ` header above each fenced block, language-tagged.
- Show change as unified diff when the file > 50 lines; show full block when creating or rewriting < 30 lines.
- Long responses (>200 words) lead with a one-line `## Summary`.

## Never

- Edit lockfiles or generated dirs (`dist/`, `.next/`, `.astro/`, `target/`, `node_modules/`).
- Run `git commit`, `git push`, deploy, or package-install commands without explicit instruction.
- Persist secrets, API keys, or env values into Cascade memory — variable names only.
- Add packages to solve what 5 lines of stdlib handle.
- Drop `await` from async calls to silence warnings.
