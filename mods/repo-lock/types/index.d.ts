// The status line's text: `repo · package manager · branch`, or null before the first read.
export type Line = string | null

declare module 'claude-code' {
  interface PluginState {
    'repo-lock': {
      line: Line
    }
  }
}
