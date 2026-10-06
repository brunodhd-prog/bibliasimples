export type AgentTeamMember = {
  id: string
  type: string
  description: string
  status: string
  model: string
}

export type AgentTeamRoster = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    'agent-team': {
      roster: AgentTeamRoster
      members: AgentTeamMember[]
      models: Record<string, string>
    }
  }
}
