#!/usr/bin/env bash
# PreToolUse hook for Write|Edit. Blocks writes to secret files.
# Exit 0 = allow; exit 2 = block (stderr surfaces to Claude).
set -euo pipefail

# Hook receives JSON on stdin: { tool_input: { file_path: "..." } }
input=$(cat)
file_path=$(echo "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)

if [[ -z "${file_path}" ]]; then
  exit 0
fi

# Patterns that should never be written by the agent.
declare -a blocked_patterns=(
  '(^|/)\.env$'
  '(^|/)\.env\.'
  '(^|/)\.envrc$'
  '(^|/)\.dev\.vars'
  '(^|/)secrets\.'
  '\.pem$'
  '\.key$'
  '\.p12$'
  '\.pfx$'
  '(^|/)id_rsa'
  '(^|/)\.npmrc$'
  '(^|/)\.pypirc$'
  'gha-creds-.*\.json$'
  '(^|/)\.terraformrc$'
)

for pattern in "${blocked_patterns[@]}"; do
  if [[ "${file_path}" =~ ${pattern} ]]; then
    cat >&2 <<EOF
blocked: Writes to secret/credential files are not permitted by .claude/hooks/block-secret-writes.sh.
file: ${file_path}
matched pattern: ${pattern}
fix: Edit the file manually outside Claude Code, or remove the matching pattern in the hook only if you've audited why.
EOF
    exit 2
  fi
done

exit 0
