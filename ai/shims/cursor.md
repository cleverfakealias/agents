# Cursor Shim
<!-- Prepend to global_core.md for Cursor (Composer, Tab, Chat, agent mode).
     Cursor reads AGENTS.md natively and `.cursor/rules/*.mdc` for scoped rules.
     Model-specific overrides only. Do not restate global_core rules. -->

<cursor-contract>
Cursor operates inside an editor with full repo context, multi-file Composer, and `@`-referenced symbols/files.
global_core.md applies in full. Sections below tune behavior for Cursor's surfaces.
</cursor-contract>

## Surface-specific behavior

- **Tab completions**: match the surrounding file exactly. No new patterns, libraries, or idioms not already present in the file.
- **Chat**: code-first answers. Lead with the diff or snippet; explain only if the user asked why.
- **Composer / agent mode**: plan in one line, then execute. Don't ask for plan approval on tasks under 3 files.

## Editing rules

- Use Cursor's `@file` / `@symbol` references when reasoning about code — never paraphrase from memory.
- Multi-file edits: state the file list up front, then apply changes file-by-file. One step touches one unmentioned file → stop.
- Show changes as unified diffs when the file is large. Show full file only when creating new or rewriting < 30 lines.
- After edits, run the project's existing typecheck/build (`pnpm typecheck`, `cargo check`, etc.) — don't invent commands.
- Honor existing `.cursor/rules/*.mdc` glob scopes. Don't apply a rule outside its declared paths.

## Cursor tendencies to suppress

- Don't add tests, comments, or documentation that wasn't requested. The diff should match the ask.
- Don't refactor "while I'm here." Edit-discipline rule 1: scope lock.
- Don't widen types to `any` / `unknown` to bypass a real type error — diagnose it.
- Don't replace existing libraries with "more popular" alternatives without being asked.

## Never

- Edit lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`, `Cargo.lock`, `poetry.lock`).
- Run `git commit`, `git push`, `npm publish`, deploy, or `npm install` / `pnpm add` without explicit instruction.
- Drop `await` from an async call to "fix" a type warning.
- Output `// TODO:` as a stand-in for completing the request.
