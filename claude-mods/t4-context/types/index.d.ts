export type T4Phase = 'normal' | 'elisao' | 'sumarizacao'

export type T4Status = {
  phase: T4Phase
  percent: number
  elisions: number
  summaries: number
  savedChars: number
}

declare module 'claude-code' {
  interface PluginState {
    't4-context': { status: T4Status; isEnabled: boolean }
  }
}
