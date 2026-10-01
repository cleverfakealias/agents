@AGENTS.md

## Claude Code specifics

- **Checks run automatically.** After each edit, `.claude/hooks/checks.mjs` runs the
  format/lint command configured for that file type. When you finish a turn in which
  you edited files, it runs the verify commands (tests, typecheck). Both lists live
  in `.claude/hooks/checks.json`. If a check reports problems, fix them; don't work
  around the hook.
- **Permissions** live in `.claude/settings.json`. Secret files are denied outright.
  Pushing, `git reset --hard`, `git clean`, merging a PR, and editing CI workflows
  always ask the user first. If a rule stops you, say so and wait; don't look for
  another route to the same result.
- **Planning**: `/zenn` runs the spec-first workflow described in AGENTS.md.
- **Review**: `/code-review` and `/security-review` are built in. Use them before
  merging significant changes.
