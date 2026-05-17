---
description: Work through review comments on the current branch's PR — read, plan, address, reply. Use when user says "address PR comments" / "handle the review feedback" / "respond to the reviewer" / "fix the review comments", or wants to clear the PR's outstanding review threads.
---

1. **Find the PR**: `gh pr view --json number,url,reviewDecision,reviews` for the current branch. If none, stop.

2. **Fetch all open review comments**:
   ```
   gh api repos/{owner}/{repo}/pulls/{number}/comments
   ```
   Plus general PR review comments:
   ```
   gh pr view <number> --json reviews
   ```

3. **Group comments** into:
   - **Code changes requested** — need a code edit
   - **Questions** — need a reply, not a code change
   - **Suggestions / nits** — judgment call: address if cheap, reply with reasoning if not

4. **Show the user the grouping** with a one-line summary per comment and let them confirm or re-categorize before any edits.

5. **For each "code changes requested" comment**:
   - Make the change.
   - Run the verify command on the affected files only.
   - Stage the change.
6. After all code changes:
   - One commit per logical fix (not one commit per comment — group related fixes).
   - Commit message: `fix(<scope>): address review — <short summary>`.

7. **For each "questions" comment**: draft a reply (clear, terse, evidence-based). Show drafts to user before posting.

8. **For each "suggestions/nits"**: if addressed → reply "Done in <commit hash>"; if rejected → reply with the reason (1-2 sentences), no defensiveness.

9. **Post replies**:
   ```
   gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies -f body="<reply>"
   ```
   Or for general PR comments:
   ```
   gh pr comment <number> --body "<reply>"
   ```

10. **Push**: `git push`. Note the new commit shas in your replies so reviewers can find them.

11. **Re-request review** if appropriate: `gh pr review --request-changes-from <reviewer>` (or just leave a summary comment).

## Never

- Mark a "changes requested" comment "resolved" without making the change OR getting explicit user override.
- Argue with reviewers in replies. State facts; if you disagree, explain once.
- Lump unrelated fixes into one commit because they came from the same review.
- `--force-push` to a shared PR branch without warning reviewers.
