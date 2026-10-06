import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ControlPanelProfile } from '../types'

export const PROFILES: readonly ControlPanelProfile[] = [
  { id: 'rapido', label: 'Rápido', model: 'haiku', effort: 'low', hint: 'buscas, dúvidas curtas, renomeações' },
  { id: 'codigo', label: 'Código', model: 'sonnet', effort: 'medium', hint: 'implementação e testes do dia a dia' },
  { id: 'arquiteto', label: 'Arquiteto', model: 'opus', effort: 'high', hint: 'planejamento, SDD, revisão de código' },
  { id: 'maximo', label: 'Máximo', model: 'claude-fable-5-1', effort: 'max', hint: 'problemas difíceis, depuração profunda' },
]

const active = atom({ plugin: 'control-panel', key: 'active' } as const, null)
const isHidden = atom({ plugin: 'control-panel', key: 'isHidden' } as const, false)

export const profileOf = (text: string) => {
  const key = text.trim().toLowerCase()

  return PROFILES.find(p => p.id === key || p.label.toLowerCase() === key || String(PROFILES.indexOf(p) + 1) === key)
}

// /model só roda com a sessão ociosa: dispara sem esperar.
function choose($: EngineInterface, profile: ControlPanelProfile) {
  void update($, active, () => profile.id)
  void $.command.run({ command: 'model', args: profile.model }).catch(() =>
    $.ui.toast(`Painel: o modelo ${profile.model} não está disponível.`),
  )
  $.ui.status(`Perfil: ${profile.label} (${profile.model}, esforço ${profile.effort})`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'modo',
      description: 'Painel de Controle: escolhe o perfil de modelo (rapido, codigo, arquiteto, maximo)',
      argumentHint: '[perfil]',
    })
    await $.command.register({
      name: 'painel',
      description: 'Painel de Controle: mostra ou oculta os atalhos acima do prompt',
    })

    return next(e)
  })

  on('command.run', { command: 'modo' }, async ($, e) => {
    const profile = profileOf(e.args ?? '')
    if (profile === undefined) {
      const list = PROFILES.map((p, i) => `${i + 1}. ${p.id} → ${p.model} (${p.effort}): ${p.hint}`)

      return { text: ['Perfis:', ...list].join('\n') }
    }
    choose($, profile)

    return { text: `Perfil ${profile.label}: ${profile.model}, esforço ${profile.effort}.` }
  })

  on('command.run', { command: 'painel' }, async $ => {
    const value = await update($, isHidden, now => !now)

    return { text: `Painel ${value ? 'oculto' : 'visível'}.` }
  })

  // O esforço do perfil vale para o loop principal; subagentes seguem o próprio.
  on('turn.step', async function* ($, e, next) {
    const id = await read($, active)
    const profile = PROFILES.find(p => p.id === id)
    const isMain = e.agentId === undefined && e.effort !== undefined

    return yield* next(isMain && profile !== undefined ? { ...e, effort: profile.effort } : e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const id = await read($, active)
    const model = await $.session.model()

    return (
      <Box flexDirection="row" flexWrap="wrap">
        <Text dimColor>Modelo: {model} </Text>
        {PROFILES.map((p, i) => (
          <Button
            key={p.id}
            label={p.label}
            hotkey={String(i + 1)}
            variant={p.id === id ? 'primary' : 'secondary'}
            onPress={() => choose($, p)}
          />
        ))}
        <Button key="hide" label="Ocultar" plain dimColor onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
