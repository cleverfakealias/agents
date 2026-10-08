export type Limit = { kind: string; percent: number; resetsAt?: string }

export type Meter = {
  tokens: number
  // The window the session compacts at; `modelWindow` is the model's own limit.
  window: number
  modelWindow: number
  percent: number
  // Tokens after each main-loop turn, newest last.
  history: number[]
  limits: Limit[]
  usd?: number
}

export type Category = { name: string; tokens: number; color: string; kind: 'used' | 'free' | 'buffer' }

// The /context breakdown, estimated locally; refreshed at turn end and on expand.
export type Detail = {
  // The window the session compacts against: the model's limit, or a smaller
  // one from settings or the env (`autoCompactWindow`), as /context reports it.
  window: number
  windowSource: string
  categories: Category[]
  autoCompactAt?: number
  // Share of the last request's input served from the prompt cache, 0 to 100.
  cacheHit?: number
  memoryFiles: { path: string; tokens: number }[]
  mcpTokens: number
}

// What the model and effort buttons show and set.
export type Setup = {
  // The `/config` model row: its value (`opus[1m]`) and its choices.
  alias?: string
  options: string[]
  // The last main-loop request's resolved model id and effort.
  model?: string
  effort?: string | number
}

declare module 'claude-code' {
  interface PluginState {
    'context-meter': { meter: Meter | null; detail: Detail | null; setup: Setup | null; isOpen: boolean; warned: number }
  }
}
