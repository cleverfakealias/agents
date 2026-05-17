#!/usr/bin/env bash
# PostToolUse hook for Write|Edit. Runs the project's lint/typecheck on the touched file.
# Exit 0 = silent; exit 2 = surface errors to Claude. Any other exit = non-blocking error.
#
# Customize the LINT_CMD / TYPECHECK_CMD per project. The defaults below dispatch
# based on file extension and the presence of common config files.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)

if [[ -z "${file_path}" || ! -f "${file_path}" ]]; then
  exit 0
fi

ext="${file_path##*.}"
project_root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
output=""
exit_code=0

run_or_skip() {
  local cmd="$1"
  local label="$2"
  if command -v "${cmd%% *}" >/dev/null 2>&1; then
    if ! result=$(${cmd} 2>&1); then
      output+="${label} failed for ${file_path}:\n${result}\n"
      exit_code=2
    fi
  fi
}

case "$ext" in
  ts|tsx|js|jsx|mjs|cjs)
    if [[ -f "${project_root}/pnpm-lock.yaml" ]]; then
      run_or_skip "pnpm exec eslint ${file_path}" "eslint"
    elif [[ -f "${project_root}/package-lock.json" ]]; then
      run_or_skip "npx --no-install eslint ${file_path}" "eslint"
    fi
    ;;
  py)
    if [[ -f "${project_root}/pyproject.toml" ]] && command -v ruff >/dev/null 2>&1; then
      run_or_skip "ruff check ${file_path}" "ruff"
    fi
    ;;
  rs)
    if [[ -f "${project_root}/Cargo.toml" ]]; then
      run_or_skip "cargo check --quiet --message-format=short" "cargo check"
    fi
    ;;
  go)
    run_or_skip "gofmt -l ${file_path}" "gofmt"
    ;;
esac

if [[ -n "${output}" ]]; then
  printf "%b" "${output}" >&2
  exit ${exit_code}
fi

exit 0
