---
description: Cut a release — verify clean tree, run verify command, bump version, update CHANGELOG, tag, push. Use when user says "cut a release" / "release" / "ship a new version" / "publish a release" / "tag and push", or wants to bump the version after a batch of merged changes.
---

1. **Verify working tree is clean**: run `git status --porcelain`. If non-empty, stop and tell the user to commit or stash.

2. **Run the verify command** (default: `pnpm run ci:verify`). This should cover lint + typecheck + test + build. Stop on any failure — do not proceed with a broken tree.

3. **Determine the bump** (patch / minor / major) from commits since the last tag:
   - `git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"%s"`
   - Patch: only `fix:`, `chore:`, `docs:`, `refactor:` commits.
   - Minor: at least one `feat:` commit, no breaking changes.
   - Major: any commit with `!` in the type (`feat!:`, `fix!:`) or `BREAKING CHANGE:` in the body.
   - If ambiguous, ask the user.

4. **Bump version**: `pnpm version <bump> --no-git-tag-version` (or `npm version`, `cargo version`, `uv version` as appropriate).

5. **Update `CHANGELOG.md`** with the highlights from step 3. Group under `## [vX.Y.Z] — YYYY-MM-DD` with subsections: `### Added`, `### Changed`, `### Fixed`, `### Removed`. Stop if `CHANGELOG.md` doesn't exist — ask the user before creating one.

6. **Commit** with message `chore(release): vX.Y.Z` containing only the version bump and CHANGELOG update.

7. **Tag**: `git tag vX.Y.Z`.

8. **Push**: `git push --follow-tags`.

9. **Report**:
   - Tag: vX.Y.Z
   - Commit: <hash>
   - Pushed: <branch> → <remote>/<branch> with tags
   - Next: open release PR (`gh release create vX.Y.Z --generate-notes`) if your repo uses GitHub releases; otherwise stop.

## Never

- `--force-push` to a release branch.
- Skip the verify step "just this once."
- Tag from a dirty working tree.
- Bump the version manually in `package.json` instead of using `<package-manager> version` (drift between lockfile and version field).
