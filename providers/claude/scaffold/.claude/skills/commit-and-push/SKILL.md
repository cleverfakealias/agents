---
name: commit-and-push
description: Stage changes, write a conventional-commits message, commit, and push to the current branch. Honors the repo's git rules in AGENTS.md. Use when user says "commit this" / "push" / "ship it" / "finalize the work" / "wrap this up" / "sync to remote", or asks to publish the current branch's changes.
argument-hint: "[optional: short message override]"
allowed-tools: Bash(git status*), Bash(git diff*), Bash(git log*), Bash(git add *), Bash(git commit *), Bash(git push*), Bash(git branch*), Read
disable-model-invocation: false
model: inherit
---

# Commit & Push

## Pre-flight (always)

1. `git status --porcelain` — verify there's something to commit. If clean, stop.
2. `git diff --staged` and `git diff` — read both. If nothing is staged, stage only files the user's task touched (use `Glob`/`Grep`/conversation context — do **not** `git add -A` or `git add .` blindly; secrets and lockfile drift sneak in that way).
3. `git log -5 --oneline` — match the repo's existing commit-message style.

## Compose message

Conventional Commits format unless the repo's recent history says otherwise:

```
<type>(<scope>): <imperative subject ≤72 chars>

<optional body: WHY, not what. Diffs show what.>
```

Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`, `revert`.

- One logical change per commit. If the diff spans two unrelated changes, ask the user how to split.
- Never `git commit --amend` to add to a published commit.

## Commit & push

```bash
git commit -m "<message>"
git push
```

If push is rejected:

- **Non-fast-forward**: `git pull --rebase`, resolve, then push. Never `--force` without explicit user instruction.
- **Hook failure**: surface the hook's output. Do not pass `--no-verify`.

## After push

Print:

```
Commit: <hash> <subject>
Branch: <branch> → <remote>/<branch>
URL:    <PR URL if `gh` available and an open PR exists>
```

## Hard never

- `git push --force` / `-f` to any protected branch without an explicit, in-this-session user instruction.
- `--no-verify` on any git command.
- Committing `.env*`, `secrets.*`, `*.pem`, `*.key`, lockfiles you don't own.
- Auto-staging deleted files unless the deletion was part of the task.
