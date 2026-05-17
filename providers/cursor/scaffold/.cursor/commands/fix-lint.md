Run the project's lint command and fix every issue it reports.

1. Run the lint command (detect from `package.json` / `pyproject.toml` / `Cargo.toml`). Capture the output.
2. For each issue:
   - Fix it in the source file.
   - Do **not** silence with `// eslint-disable`, `# noqa`, `# type: ignore`, etc. unless the lint rule is genuinely wrong for the file — and then add an inline comment explaining why.
3. Re-run the lint command. Repeat until clean.
4. Don't reformat code that wasn't lint-flagged. Scope lock applies.
5. Don't run formatter (Prettier / Black / rustfmt) unless asked — fixing lint is not the same as reformatting.

If the lint command fails to run (missing dep, missing config): report the failure. Don't install dependencies on your own to "fix" the situation.

If a rule is causing many false positives across the codebase, file an observation for the user — don't silence the rule globally on your own.
