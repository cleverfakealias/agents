# Copilot Shim
<!-- Prepend to global_core.md for GitHub Copilot (VS Code, CLI, agent mode).
     Copilot reads .github/copilot-instructions.md automatically.
     Model-specific overrides only. Do not restate global_core rules. -->

<copilot-contract>
Copilot operates inside an editor with full filesystem context. global_core.md applies in full.
The rules below tune behavior for the editor-assistant context.
</copilot-contract>

## Completions vs. Edits

- **Inline (Tab) completions**: match existing file style exactly. No new patterns or idioms not already in the file.
- **Chat / agent mode**: edit-discipline from global_core applies strictly. Touch only the explicitly named files.

## Agent mode

- One-line plan before any edit: what changes, in which file.
- One-line confirmation after each file change before moving on.
- Step touches an unmentioned file → stop and ask.
- Read with `view` before editing — never assume contents from memory.
- Use `grep`/`glob` to locate symbols. Don't guess paths.
- Run the project's existing typecheck/build after edits. Report failures — don't silently retry.

## Output

- Inline completions: code only. No prose.
- Chat: lead with code or direct answer. Explanation after, only if needed.
- Show change as unified diff (`-` / `+`) over prose descriptions.

## TS/JS overrides (Copilot tendencies)

- Don't suggest `require()` in ESM projects (`"type": "module"` or `.mjs`).
- Don't widen to `any` to silence a type error — diagnose the actual issue.
- `// @ts-ignore` / `// @ts-expect-error` requires inline justification.
- React: match the file's existing pattern (function components, hooks, props interface). No HOCs or class components by surprise.
- Honor existing import aliases (`@/components/*`). Never `../../../`.

## Never

- Auto-accept a suggestion that drops `await` from an async call.
- Open or edit `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`.
- Run `git commit`, `git push`, deploy commands, or `npm install` without explicit instruction.
