import type { Register, ToolCallResult } from 'claude-code'

import { bash, powershell, type Verdict } from './rules'

// Deny before the call runs, or attach a note the model reads after the result.
const withNote = (result: ToolCallResult, verdict: Verdict): ToolCallResult =>
  verdict && 'note' in verdict && result.deny === undefined
    ? { ...result, context: [...(result.context ?? []), verdict.note] }
    : result

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const verdict = bash(e.command)
    if (verdict && 'deny' in verdict) return { deny: verdict.deny }
    return withNote(await next(e), verdict)
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const verdict = powershell(e.command)
    if (verdict && 'deny' in verdict) return { deny: verdict.deny }
    return withNote(await next(e), verdict)
  })
}
