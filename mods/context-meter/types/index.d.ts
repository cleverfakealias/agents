export type Limit = { kind: string; percent: number; resetsAt?: string }

export type Meter = {
  tokens: number
  window: number
  percent: number
  // Tokens after each main-loop turn, newest last.
  history: number[]
  limits: Limit[]
  usd?: number
}

export type Category = { name: string; tokens: number; color: string; kind: 'used' | 'free' | 'buffer' }

// The /context breakdown, estimated locally; refreshed at turn end and on expand.
export type Detail = {
  categories: Category[]
  autoCompactAt?: number
  // Share of the last request's input served from the prompt cache, 0 to 100.
  cacheHit?: number
  memoryFiles: { path: string; tokens: number }[]
  mcpTokens: number
}

declare module 'claude-code' {
  interface PluginState {
    'context-meter': { meter: Meter | null; detail: Detail | null; isOpen: boolean; warned: number }
  }
}
