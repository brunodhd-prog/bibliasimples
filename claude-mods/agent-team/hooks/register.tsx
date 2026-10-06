import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentTeamMember, AgentTeamRoster } from '../types'

const PANE = 'agent-team'
const ANY = '*'
const MODELS = ['inherit', 'haiku', 'sonnet', 'opus', 'claude-fable-5-1']
const ROLES = [ANY, 'general-purpose', 'Explore', 'Plan']
const LIVE = new Set(['pending', 'running', 'waiting', 'idle'])

const EMPTY_ROSTER: AgentTeamRoster = {}
const EMPTY_MODELS: Record<string, string> = {}
const NO_MEMBERS: AgentTeamMember[] = []

const roster = atom({ plugin: 'agent-team', key: 'roster' } as const, EMPTY_ROSTER)
const members = atom({ plugin: 'agent-team', key: 'members' } as const, NO_MEMBERS)
// modelo resolvido de cada agente, pelo id
const models = atom({ plugin: 'agent-team', key: 'models' } as const, EMPTY_MODELS)

// "Explore=haiku Plan=opus *=sonnet" → { Explore: 'haiku', ... }
export const parseRoster = (text: string): AgentTeamRoster =>
  Object.fromEntries(
    text
      .split(/[\s,;]+/)
      .map(pair => pair.split('='))
      .filter((kv): kv is [string, string] => kv.length === 2 && kv[0] !== '' && kv[1] !== ''),
  )

export const modelFor = (team: AgentTeamRoster, role: string) => {
  const model = team[role] ?? team[ANY]

  return model === undefined || model === 'inherit' ? undefined : model
}

async function refresh($: EngineInterface) {
  const known = await read($, models)
  const list = (await $.agent.list()).map(a => ({
    id: a.id,
    type: a.type,
    description: a.description,
    status: a.status,
    model: known[a.id] ?? '—',
  }))
  // o timer só redesenha quando algo mudou
  if (JSON.stringify(list) === JSON.stringify(await read($, members))) return
  await update($, members, () => list)
}

async function broadcast($: EngineInterface, text: string) {
  const live = (await $.agent.list()).filter(a => LIVE.has(a.status))
  await Promise.all(live.map(a => $.session.send({ to: { agentId: a.id }, text })))

  return live.length
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'time',
      description: 'Time de Agentes: abre o painel; "papel=modelo" define o modelo de cada papel',
      argumentHint: '[papel=modelo ...]',
    })
    await $.command.register({
      name: 'time-rodar',
      description: 'Time de Agentes: dispara um subagente, "papel: tarefa"',
      argumentHint: '<papel>: <tarefa>',
    })
    await $.command.register({
      name: 'time-sync',
      description: 'Time de Agentes: envia a mesma mensagem a todos os agentes ativos',
      argumentHint: '<mensagem>',
    })
    $.clock.every(3000, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'time' }, async ($, e) => {
    const changes = parseRoster(e.args ?? '')
    if (Object.keys(changes).length > 0) {
      const team = await update($, roster, now => ({ ...now, ...changes }))
      const text = Object.entries(team).map(([role, model]) => `${role} → ${model}`)

      return { text: ['Modelos por papel:', ...text].join('\n') }
    }
    await $.ui.open({ id: PANE, title: 'Time de Agentes' })

    return { text: 'Painel do Time de Agentes aberto.' }
  })

  on('command.run', { command: 'time-rodar' }, async ($, e) => {
    const args = e.args ?? ''
    const at = args.indexOf(':')
    if (at <= 0) return { text: 'Uso: /time-rodar <papel>: <tarefa>' }
    const role = args.slice(0, at).trim()
    const prompt = args.slice(at + 1).trim()
    const spawned = await $.agent.spawn({ prompt, subagentType: role, description: prompt.slice(0, 40) })
    if (spawned.deny !== undefined) return { text: `Recusado: ${spawned.deny}` }
    await refresh($)

    return { text: `Agente ${role} disparado em ${spawned.model}.` }
  })

  on('command.run', { command: 'time-sync' }, async ($, e) => {
    const text = (e.args ?? '').trim()
    if (text === '') return { text: 'Uso: /time-sync <mensagem>' }
    const count = await broadcast($, text)

    return { text: `Mensagem enviada a ${count} agente(s).` }
  })

  // Escolha individual de modelo: o papel define o modelo, salvo se a chamada já trouxe um.
  on('agent.spawn', async ($, e, next) => {
    const model = e.model ?? modelFor(await read($, roster), e.subagentType)
    const result = await next(model === undefined ? e : { ...e, model })
    if (result.deny === undefined && result.agentId !== undefined) {
      const { agentId, model: resolved } = result
      await update($, models, now => ({ ...now, [agentId]: resolved }))
      await refresh($)
    }

    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    // mobile não tem Select: mostra o papel como texto
    const Select = 'Select' in table ? table.Select : undefined
    const team = await read($, roster)
    const list = await read($, members)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - ROLES.length - 6)

    return (
      <Box flexDirection="column">
        <Text bold>Modelo por papel</Text>
        {ROLES.map(role =>
          Select === undefined ? (
            <Text key={`r-${role}`}>
              {role === ANY ? 'padrão' : role}: {team[role] ?? 'inherit'}
            </Text>
          ) : (
            <Select
              key={`r-${role}`}
              label={role === ANY ? 'padrão' : role}
              value={team[role] ?? 'inherit'}
              options={MODELS.map(value => ({ value }))}
              onSelect={(value: string) => void update($, roster, now => ({ ...now, [role]: value }))}
            />
          ),
        )}
        <Text bold>Agentes ({list.filter(a => LIVE.has(a.status)).length} ativos)</Text>
        {list.length === 0 && <Text dimColor>Nenhum agente nesta sessão.</Text>}
        {list.slice(-room).map(a => (
          <Text key={`a-${a.id}`} dimColor={!LIVE.has(a.status)}>
            {a.status.padEnd(9)} {a.type} · {a.model} · {a.description}
          </Text>
        ))}
        <Box flexDirection="row">
          <Button key="refresh" label="Atualizar" onPress={() => void refresh($)} />
          <Button
            key="sync"
            label="Sincronizar"
            onPress={() =>
              void broadcast($, 'Sincronização: reporte em 3 linhas o estado atual e o próximo passo.').then(n =>
                $.ui.toast(`Sync enviado a ${n} agente(s).`),
              )
            }
          />
        </Box>
      </Box>
    )
  })
}
