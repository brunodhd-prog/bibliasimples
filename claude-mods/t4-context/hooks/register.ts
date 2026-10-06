import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMessage, ToolResultSummary } from 'claude-code'

import type { T4Status } from '../types'

// T4: elisão ao cruzar B1, sumarização ao cruzar B2. Recall omitido: o estudo
// mostra que os agentes praticamente não o usam.
const ELIDE = 't4:elision'
const SUMMARY_HINT =
  'Preserve objetivo, decisões, arquivos tocados, estado atual e próximos passos. Descarte saídas verbosas de ferramentas.'

const INITIAL: T4Status = { phase: 'normal', percent: 0, elisions: 0, summaries: 0, savedChars: 0 }
const status = atom({ plugin: 't4-context', key: 'status' } as const, INITIAL)
const isEnabled = atom({ plugin: 't4-context', key: 'isEnabled' } as const, true)

type Limits = { b1: number; b2: number; keepRecent: number; minChars: number }

let isBusy = false

const num = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const limitsOf = (options: Record<string, unknown>): Limits => {
  const b1 = num(options.b1, 65)

  return {
    b1,
    b2: Math.max(b1 + 1, num(options.b2, 85)),
    keepRecent: Math.max(1, num(options.keepRecent, 8)),
    minChars: Math.max(200, num(options.minChars, 600)),
  }
}

export const elideText = (text: string, minChars: number) => {
  if (text.length <= minChars) return text
  const head = text.slice(0, 160).trimEnd()
  const lines = text.split('\n').length

  return `${head}\n[T4 elision: ${text.length} caracteres / ${lines} linhas omitidos]`
}

export const elideMessages = (
  messages: readonly SessionMessage[],
  keepRecent: number,
  minChars: number,
) => {
  let saved = 0
  const cut = Math.max(0, messages.length - keepRecent)
  const out = messages.map((message, i): SessionMessage => {
    const results = message.toolResults
    if (i >= cut || results === undefined) return message
    if (!results.some(r => r.text.length > minChars)) return message

    const toolResults: ToolResultSummary[] = results.map(r => {
      const text = elideText(r.text, minChars)
      saved += r.text.length - text.length

      return { tool_use_id: r.tool_use_id, text, isError: r.isError }
    })

    return { role: message.role, text: message.text, toolUses: [...message.toolUses], toolResults }
  })

  return { messages: out, saved }
}

const line = (s: T4Status) =>
  `T4 ${s.percent}% · ${s.phase} · elisões ${s.elisions} · resumos ${s.summaries}`

async function check($: EngineInterface, limits: Limits, isForced: boolean) {
  if (isBusy || (!isForced && !(await read($, isEnabled)))) return
  const { context } = await $.session.usage()
  const percent = context.percent ?? 0
  $.ui.status(line(await update($, status, (s): T4Status => ({ ...s, percent }))))
  if (percent < limits.b1) return

  isBusy = true
  try {
    if (percent >= limits.b2) {
      await update($, status, (s): T4Status => ({ ...s, phase: 'sumarizacao' }))
      const { skip } = await $.session.compact({ instructions: SUMMARY_HINT })
      await update($, status, (s): T4Status => ({
        ...s,
        phase: 'normal',
        summaries: s.summaries + (skip === undefined ? 1 : 0),
      }))
      if (skip === undefined) $.ui.toast(`T4: B2 (${limits.b2}%) atingido, contexto sumarizado.`)
      return
    }

    const preview = elideMessages(await $.session.messages(), limits.keepRecent, limits.minChars)
    if (preview.saved === 0) return
    await update($, status, (s): T4Status => ({ ...s, phase: 'elisao' }))
    await $.session.compact({ instructions: ELIDE })
  } finally {
    isBusy = false
    $.ui.status(line(await read($, status)))
  }
}

export const register: Register = (on, options) => {
  const limits = limitsOf(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 't4',
      description: 'T4: status do contexto; on/off liga ou desliga; agora força a checagem',
      argumentHint: '[on|off|agora]',
    })

    return next(e)
  })

  // Elisão: a compactação marcada não sumariza; troca resultados verbosos
  // antigos por um resumo curto e mantém o resto da transcrição intacto.
  on('session.compact', async ($, e, next) => {
    if (e.trigger !== 'plugin' || e.instructions !== ELIDE || e.agentId !== undefined) {
      return next(e)
    }
    const { messages, saved } = elideMessages(e.messages, limits.keepRecent, limits.minChars)
    await update($, status, (s): T4Status => ({ ...s, phase: 'normal' }))
    if (saved === 0) return { skip: 'T4: nada a elidir' }

    await update($, status, (s): T4Status => ({
      ...s,
      elisions: s.elisions + 1,
      savedChars: s.savedChars + saved,
    }))
    $.ui.toast(`T4: B1 (${limits.b1}%) atingido, ${saved} caracteres elididos.`)

    return { messages }
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    // a compactação só roda entre turnos
    if (e.agentId === undefined && !e.isAborted) {
      $.clock.after(300, () => void check($, limits, false))
    }

    return done
  })

  on('command.run', { command: 't4' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      await update($, isEnabled, () => arg === 'on')

      return { text: `T4 ${arg === 'on' ? 'ligado' : 'desligado'}.` }
    }
    if (arg === 'agora') {
      $.clock.after(300, () => void check($, limits, true))

      return { text: 'T4: checagem agendada.' }
    }
    const s = await read($, status)
    const isOn = await read($, isEnabled)

    return {
      text: [
        `T4 ${isOn ? 'ligado' : 'desligado'} · B1 ${limits.b1}% elisão · B2 ${limits.b2}% sumarização · recall desativado`,
        `Contexto: ${s.percent}% · fase: ${s.phase}`,
        `Elisões: ${s.elisions} (${s.savedChars} caracteres poupados) · resumos: ${s.summaries}`,
      ].join('\n'),
    }
  })
}
