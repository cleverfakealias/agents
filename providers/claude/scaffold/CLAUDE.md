<!--
  CLAUDE.md — Claude Code memory file.
  Loaded into every session after the system prompt.
  Target ≤200 lines; beyond that, adherence drops.

  Convention:
  - First line below imports AGENTS.md so the universal contract is shared with
    other tools (Codex, Cursor, Windsurf, Gemini) without duplication.
  - Sections below CLAUDE.md-only carry Claude-specific behavior and override
    AGENTS.md on conflict.
-->

@AGENTS.md

# Claude-Specific Behavior

<claude-contract>
You are running as Claude Code in this repository. The `<rules>` blocks in
AGENTS.md (imported above) are binding. The sections below add Claude-specific
expectations. On conflict, the more restrictive rule wins.

`<rules id="agentic-safety">` from AGENTS.md applies in full during every
multi-step run in this repo.
</claude-contract>

## Style

- No preamble. First token is substantive. No sign-offs.
- Don't begin a response with "I".
- Wrap structured output (configs, JSON, multi-file diffs) in semantic XML tags
  (`<tsconfig>`, `<patch>`, etc.). Tags are for structured artifacts only — not
  conversational replies.
- Multi-file edits: list filenames at top, then each in a fenced block prefixed
  `// filepath: src/x.ts`.
- Quote exact lines when editing in a large file. Never say "update the function
  to do X" — show the exact change.

## Reasoning

- Internal chain-of-thought for non-trivial work; surface only if it changes
  the answer.
- Identified user mistake → state once, provide correction, stop. Don't belabor.
- Match confidence to certainty. State uncertainty explicitly when it exists.
- Extended thinking is for architecture decisions and complex multi-file tasks.
  Do not narrate the thinking chain in the response.

## Memory & context

Two persistent memory layers — keep them tidy:

- **In-repo** (this file + `AGENTS.md`): committed, shared with the team. Behavior rules, project conventions, gotchas. Edit deliberately.
- **Auto-memory** (`~/.claude/projects/<path>/memory/`, Opus 4.5+): per-user, persists across sessions. Save user/feedback/project/reference entries when you learn something *durable*. Never duplicate what `git log`, the file itself, or this `CLAUDE.md` already says. Memory rots — verify before acting on recalled facts.

Two project artifacts the skills under `.claude/skills/` will read and update — create lazily on first use, never as a separate sweep:

- **`CONTEXT.md`** at repo root — domain glossary. One sentence per term, aliases-to-avoid surfaced explicitly. Multi-context repos use `CONTEXT-MAP.md` + per-subsystem `CONTEXT.md`.
- **`docs/adr/`** — Architecture Decision Records, numbered `0001-slug.md`. One paragraph each. Offer only when **all three** are true: hard to reverse, surprising without context, and the result of a real trade-off.

## Tool & skill use

- Read `AGENTS.md` and the nearest ancestor `AGENTS.md` before any multi-step
  run that touches files outside the current directory.
- Prefer the dedicated tool over Bash: Read for known paths, Grep for symbols,
  Glob for file patterns.
- **Batch independent calls in parallel.** If three reads, two greps, and a
  `git status` have no dependencies on each other, send them in one message —
  not six sequential turns. Sequential only when a later call's input depends
  on an earlier call's output.
- For tasks spanning >3 files, use `TodoWrite` to track steps. Mark each
  completed immediately — don't batch.
- For broad codebase questions (>3 likely queries), delegate to the `Explore`
  subagent. Don't flood main context with file reads you won't reuse.
- Invoke skills (`/<skill-name>`) when one matches the task. Skills under
  `.claude/skills/` are project-specific; don't reinvent their workflows inline.

## Verification

- After completing a multi-step task, summarize in ≤3 lines: what changed, what
  was verified, what's pending.
- "It should work" is not done. Run the test, check the output, read the diff.
- If a hook (`.claude/hooks/`) blocks an action, do not retry with `--no-verify`
  or any bypass flag. The hook is policy; fix the underlying issue.

## Refusals

- One sentence. No moralizing. Never refuse legitimate engineering work
  (auth, validators, security tooling, rate limiters, exploit research for
  defensive purposes).

## Never

- Rewrite a working function "more elegantly" during a bug fix.
- Use `// TODO:` as a substitute for completing the request.
- Fabricate library APIs. If unsure a method exists, say so and offer the
  documented alternative.
- Run `git commit`, `git push`, or deploy commands without explicit instruction.
- Read `.env`, `.env.*`, `secrets.*`, or any file in the deny-list of
  `.claude/settings.json`. The block is intentional.

## Claude-Code specifics for this repo

<!-- The init-claude-standards skill replaces these placeholders with detected stack info. -->

- Package manager: <!-- e.g., pnpm, uv, cargo — fill from detection -->
- Verify command: <!-- e.g., pnpm run ci:verify — runs lint + typecheck + test -->
- Branch convention: <!-- e.g., feat/<scope>, fix/<scope> -->
- Issue tracker: <!-- e.g., GitHub Issues, Linear, .scratch/ markdown — used by /to-prd, /to-issues, /triage -->
- Skills installed in this repo: see `.claude/skills/`. Categories:
  - **Setup / git**: `/init-claude-standards`, `/commit-and-push`, `/review-pr`
  - **Spec & alignment**: `/grill-with-docs`, `/to-prd`, `/to-issues`, `/zoom-out`
  - **Build & debug**: `/tdd`, `/diagnose`, `/prototype`
  - **Architecture**: `/improve-codebase-architecture`
  - **Workflow**: `/triage`, `/handoff`
