export type CleanViewMode = boolean

declare module 'claude-code' {
  interface PluginState {
    'clean-view': { isOn: CleanViewMode }
  }
}
