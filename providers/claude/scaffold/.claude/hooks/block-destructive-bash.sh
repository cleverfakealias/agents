#!/usr/bin/env bash
# PreToolUse hook for Bash. Blocks obviously destructive commands.
# Exit 0 = allow; exit 2 = block (stderr surfaces to Claude).
set -euo pipefail

input=$(cat)
cmd=$(echo "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"command"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)

if [[ -z "${cmd}" ]]; then
  exit 0
fi

# Patterns to block outright.
declare -a deny=(
  'rm[[:space:]]+(-[A-Za-z]*[fr]|--force|--recursive)[A-Za-z]*[[:space:]]+/'
  'rm[[:space:]]+-rf[[:space:]]+/?[[:space:]]*$'
  'rm[[:space:]]+-rf[[:space:]]+~'
  'rm[[:space:]]+-rf[[:space:]]+\*'
  'rm[[:space:]]+-rf[[:space:]]+\$HOME'
  ':\(\)\{[[:space:]]*:\|:&[[:space:]]*\};:'
  'mkfs\.'
  'dd[[:space:]]+if=.+of=/dev/'
  'chmod[[:space:]]+-R[[:space:]]+777[[:space:]]+/'
  'chown[[:space:]]+-R[[:space:]]+.*[[:space:]]+/'
  'git[[:space:]]+push[[:space:]]+.*--force'
  'git[[:space:]]+push[[:space:]]+.*-f($|[[:space:]])'
  'git[[:space:]]+reset[[:space:]]+--hard[[:space:]]+origin'
  'git[[:space:]]+branch[[:space:]]+-D'
  'git[[:space:]]+clean[[:space:]]+-fd'
  'npm[[:space:]]+publish'
  'pnpm[[:space:]]+publish'
  'cargo[[:space:]]+publish'
  'kubectl[[:space:]]+delete[[:space:]]+ns'
  'aws[[:space:]]+s3[[:space:]]+rb[[:space:]]+.*--force'
)

for pattern in "${deny[@]}"; do
  if [[ "${cmd}" =~ ${pattern} ]]; then
    cat >&2 <<EOF
blocked: This command matches a destructive pattern guarded by .claude/hooks/block-destructive-bash.sh.
command: ${cmd}
matched pattern: ${pattern}
fix: If you truly need this, ask the user to run it manually. Do not bypass the hook with --no-verify or env flags.
EOF
    exit 2
  fi
done

exit 0
