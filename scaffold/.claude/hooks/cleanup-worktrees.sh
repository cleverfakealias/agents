#!/usr/bin/env bash
# SessionStart + Stop hook: keep git worktrees from piling up.
# Removes only worktrees that are SAFE to delete — clean tree (no uncommitted
# changes, no untracked files) AND whose HEAD is already preserved on another
# branch or remote — then prunes stale registrations and empty leftover dirs.
# Worktrees holding unsaved work are kept and reported, never deleted.
# This hook is housekeeping: it always exits 0 and never blocks the session.
#
# Escape hatches:
#   - CLAUDE_SKIP_WORKTREE_CLEANUP=1  disables this hook entirely
#   - CLAUDE_WORKTREE_DIR=<relpath>   override the managed dir (default .claude/worktrees)
set -uo pipefail

[[ "${CLAUDE_SKIP_WORKTREE_CLEANUP:-0}" == "1" ]] && exit 0
command -v git >/dev/null 2>&1 || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "${root}" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

main_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
managed_rel="${CLAUDE_WORKTREE_DIR:-.claude/worktrees}"
managed_abs="${main_root}/${managed_rel}"

removed=()        # worktrees we cleaned up
kept=()           # worktrees kept because they hold unsaved work
report=""

# -- 1. drop stale administrative entries (dirs already gone) ------------------
git worktree prune >/dev/null 2>&1 || true

# -- 2. walk live worktrees; only touch ones under the managed dir -------------
# `git worktree list --porcelain` emits blank-line-separated records:
#   worktree <path> / HEAD <sha> / branch <ref>  (branch absent when detached)
wt_path="" wt_head="" wt_branch=""
flush() {
  [[ -z "${wt_path}" ]] && return
  # only manage worktrees living under the managed dir, never the main checkout
  case "${wt_path}/" in
    "${managed_abs}/"*) ;;
    *) return ;;
  esac
  [[ "${wt_path}" == "${main_root}" ]] && return
  [[ -d "${wt_path}" ]] || return

  # dirty = any uncommitted change OR any untracked file
  local dirty containers safe="yes" reasons=()
  dirty=$(git -C "${wt_path}" status --porcelain 2>/dev/null)
  [[ -n "${dirty}" ]] && { safe="no"; reasons+=("$(grep -c '' <<<"${dirty}") uncommitted/untracked"); }

  # unpushed = HEAD not reachable from any OTHER local branch or any remote ref.
  # If it is reachable elsewhere, the commits are preserved and removal is safe.
  if [[ -n "${wt_head}" ]]; then
    containers=$( {
      git branch --format='%(refname)' --contains "${wt_head}" 2>/dev/null \
        | grep -vxF "${wt_branch}"
      git branch -r --contains "${wt_head}" 2>/dev/null
    } | grep -c '.' )
    if [[ "${containers}" -eq 0 ]]; then
      safe="no"; reasons+=("unpushed commits on ${wt_branch:-detached HEAD}")
    fi
  fi

  if [[ "${safe}" == "yes" ]]; then
    if git worktree remove "${wt_path}" >/dev/null 2>&1; then
      removed+=("${wt_path}")
    fi
  else
    kept+=("${wt_path}")
    report+="  kept ${wt_path#"${main_root}/"} — ${reasons[*]}"$'\n'
  fi
}

while IFS= read -r line; do
  case "${line}" in
    "worktree "*) flush; wt_path="${line#worktree }"; wt_head=""; wt_branch="" ;;
    "HEAD "*)     wt_head="${line#HEAD }" ;;
    "branch "*)   wt_branch="${line#branch }" ;;
    "")           flush; wt_path=""; wt_head=""; wt_branch="" ;;
  esac
done < <(git worktree list --porcelain 2>/dev/null)
flush

# -- 3. prune again (for removals above) + delete empty orphan dirs ------------
git worktree prune >/dev/null 2>&1 || true
if [[ -d "${managed_abs}" ]]; then
  find "${managed_abs}" -mindepth 1 -maxdepth 1 -type d -empty -delete 2>/dev/null || true
fi

# -- 4. report to the transcript (informational; never blocks) -----------------
if ((${#removed[@]})) || [[ -n "${report}" ]]; then
  {
    ((${#removed[@]})) && printf 'worktree cleanup: removed %d safe worktree(s).\n' "${#removed[@]}"
    [[ -n "${report}" ]] && printf 'worktree cleanup: kept %d with unsaved work (commit or remove manually):\n%s' "${#kept[@]}" "${report}"
  } >&2
fi
exit 0
