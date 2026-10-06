import { expect, test } from 'claude-code/testing'

import { topicOf } from '../hooks/register'

const ROW = {
  tool_use_id: 'u1',
  tool: 'Bash',
  input: { command: 'npm test -- --watch=false', description: 'Roda os testes' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
}

test('o tópico é o campo mais descritivo, numa linha', async () => {
  expect(topicOf({ description: 'Roda\n os testes' })).toBe('Roda os testes')
  expect(topicOf({ file_path: '/a/b.ts', content: 'longo' })).toBe('/a/b.ts')
  expect(topicOf('x'.repeat(10))).toBe('')
  expect(topicOf({ command: 'y'.repeat(100) }).length).toBe(72)
})

test('tool call vira uma linha só; /limpo off devolve o log completo', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'clean-view', surface, component: 'ToolUse', props: ROW })
    expect(await ui.find({ type: 'Text', text: /Bash: Roda os testes/ })).toBeDefined()
    await ui.unmount()
  }
  const { text } = await $.command.run({ command: 'limpo', args: 'off' })
  expect(text).toBe('Visão Limpa desligada.')
})
