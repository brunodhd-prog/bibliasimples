import { expect, test } from 'claude-code/testing'

import { elideMessages, elideText, limitsOf } from '../hooks/register'

const big = 'x'.repeat(2000)
const row = (text: string) => ({
  role: 'user' as const,
  text: '',
  toolUses: [],
  toolResults: [{ tool_use_id: 't1', text, isError: false }],
})

test('B1/B2 padrão do estudo: 65% e 85%', async () => {
  expect(limitsOf({})).toEqual({ b1: 65, b2: 85, keepRecent: 8, minChars: 600 })
  expect(limitsOf({ b1: 90, b2: 50 }).b2).toBe(91)
})

test('elisão troca saída verbosa por resumo curto', async () => {
  const out = elideText(big, 600)
  expect(out.length < 300).toBe(true)
  expect(out).toContain('T4 elision: 2000 caracteres')
  expect(elideText('curto', 600)).toBe('curto')
})

test('mensagens recentes ficam intactas', async () => {
  const messages = [row(big), row(big), row(big)]
  const { messages: out, saved } = elideMessages(messages, 1, 600)
  expect(out[0]?.toolResults?.[0]?.text).toContain('T4 elision')
  expect(out[2]).toBe(messages[2])
  expect(saved > 3000).toBe(true)
})

test('/t4 mostra os limites e recall desativado', async $ => {
  const { text } = await $.command.run({ command: 't4' })
  expect(text).toContain('B1 65%')
  expect(text).toContain('recall desativado')
})
