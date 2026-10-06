import { expect, test } from 'claude-code/testing'

import { PROFILES, profileOf } from '../hooks/register'

test('perfil por id, rótulo ou número', async () => {
  expect(profileOf('codigo')?.model).toBe('sonnet')
  expect(profileOf('Arquiteto')?.model).toBe('opus')
  expect(profileOf('1')?.id).toBe('rapido')
  expect(profileOf('nada')).toBeUndefined()
  expect(PROFILES.length).toBe(4)
})

test('/modo sem argumento lista os perfis', async $ => {
  const { text } = await $.command.run({ command: 'modo' })
  expect(text).toContain('rapido → haiku')
})

test('o painel desenha um atalho por perfil', async ($, on) => {
  on('session.model', () => ({ value: 'opus' }))
  const props = { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 120 }
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'control-panel', surface, component: 'AbovePrompt', props: props as never })
    for (const p of PROFILES) expect(await ui.find({ key: p.id })).toBeDefined()
    await ui.unmount()
  }
})
