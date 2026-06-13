# AGENTS.md — working on this repo

This repo is a single, condensed agent scaffold (`scaffold/`) plus a short
per-provider reference (`providers.md`). The scaffold is a **template** — it is
copied into target repos, never executed here.

## Rules

- Ground every change in current official docs — agent tooling changes monthly,
  and hallucinated config fields are the #1 failure mode. Cite the doc URL in
  the commit body.
- Keep it condensed. New files need to earn their place; prefer editing an
  existing file over adding one. `scaffold/AGENTS.md` stays ≤150 lines,
  `scaffold/CLAUDE.md` ≤50, skills ≤90.
- Placeholders are HTML comments (`<!-- ... -->`); substitution replaces the
  whole comment. No realistic-looking secrets anywhere — use `EXAMPLE_API_KEY`.
- Hook scripts must pass `bash -n` and `shellcheck`, handle missing tools
  gracefully (exit 0, never crash the session), and only exit 2 with
  actionable stderr.
- One logical change per commit, conventional commit messages.

## Smoke test

Copy `scaffold/.` into a sample Python repo and a sample TypeScript repo, open
Claude Code, edit a file, and verify: format/lint hook fires, Stop hook runs
tests, secret/destructive guards block what they should.
