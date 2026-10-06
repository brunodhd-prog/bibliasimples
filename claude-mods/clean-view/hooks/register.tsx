import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isOn = atom({ plugin: 'clean-view', key: 'isOn' } as const, true)

const KEYS = ['description', 'command', 'file_path', 'path', 'pattern', 'url', 'query', 'prompt']

// Um tópico por chamada: o campo mais descritivo do input, numa linha só.
export const topicOf = (input: unknown, max = 72) => {
  if (input === null || typeof input !== 'object') return ''
  const fields = input as Record<string, unknown>
  const key = KEYS.find(k => typeof fields[k] === 'string' && fields[k] !== '')
  const raw = key === undefined ? '' : String(fields[key])
  const flat = raw.replace(/\s+/g, ' ').trim()

  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'limpo',
      description: 'Visão Limpa: on/off oculta ou mostra os logs detalhados das ferramentas',
      argumentHint: '[on|off]',
    })

    return next(e)
  })

  on('command.run', { command: 'limpo' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    const value = await update($, isOn, now => (arg === 'on' ? true : arg === 'off' ? false : !now))

    return { text: `Visão Limpa ${value ? 'ligada' : 'desligada'}.` }
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const { Text } = $.ui.resolve(e)
    const { tool, input, isRunning, isErrored, isInterrupted } = e.props
    const mark = isRunning ? '…' : isInterrupted ? '■' : isErrored ? '✗' : '•'
    const topic = topicOf(input)

    return (
      <Text dimColor={!isErrored} color={isErrored ? 'red' : undefined}>
        {mark} {tool}
        {topic === '' ? '' : `: ${topic}`}
      </Text>
    )
  })

  // O resultado detalhado some; erros continuam visíveis.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (e.props.isErrored || !(await read($, isOn))) return next(e)
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, hint: '' } }) : next(e),
  )
}
