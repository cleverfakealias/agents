Run the project's verify command (lint + typecheck + test). If everything passes:

1. Stage only the files the current task touched. Don't `git add -A`.
2. Write a Conventional Commits message: `<type>(<scope>): <imperative subject>`. Body lines (optional) describe **why**, not what.
3. Commit with that message.
4. Push to the current branch's upstream.
5. Open a PR with `gh pr create`. Title = subject line. Body sections:
   - **Why** — the problem this solves.
   - **What** — high-level summary of the change (no diff regurgitation).
   - **Test plan** — what was verified, including the commands run.

If the verify command fails: stop. Report the failures and ask whether to fix them or abort.

If push is rejected (non-fast-forward): `git pull --rebase`, resolve, retry. Never `--force` without explicit user instruction.

Never `--no-verify` on any git command.
