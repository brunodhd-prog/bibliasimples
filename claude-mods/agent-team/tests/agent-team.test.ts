import { expect, test } from 'claude-code/testing'

import { modelFor, parseRoster } from '../hooks/register'

test('papel=modelo vira o roster', async () => {
  expect(parseRoster('Explore=haiku, Plan=opus *=sonnet')).toEqual({ Explore: 'haiku', Plan: 'opus', '*': 'sonnet' })
  expect(parseRoster('lixo =x y=')).toEqual({})
})

test('o papel decide o modelo, com padrão e inherit', async () => {
  const team = { Explore: 'haiku', '*': 'sonnet', Plan: 'inherit' }
  expect(modelFor(team, 'Explore')).toBe('haiku')
  expect(modelFor(team, 'general-purpose')).toBe('sonnet')
  expect(modelFor(team, 'Plan')).toBeUndefined()
})

test('o spawn recebe o modelo do papel', async ($, on) => {
  let seen: string | undefined
  on('agent.spawn', ($, e) => {
    seen = e.model
    return { model: e.model ?? 'inherit', agentId: 'a1' }
  })
  on('agent.list', () => ({ value: [] }))
  await $.command.run({ command: 'time', args: 'Explore=haiku' })
  await $.agent.spawn({ prompt: 'leia o README', subagentType: 'Explore' })
  expect(seen).toBe('haiku')
})
