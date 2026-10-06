export type ControlPanelProfile = {
  id: string
  label: string
  model: string
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  hint: string
}

declare module 'claude-code' {
  interface PluginState {
    'control-panel': { active: string | null; isHidden: boolean }
  }
}
