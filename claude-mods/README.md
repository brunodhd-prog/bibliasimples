# Mods de uso diário (Claude Code)

Quatro mods de function hooks para o Claude Code. Cada pasta é um plugin independente; a raiz do repositório é o marketplace (`.claude-plugin/marketplace.json`).

## Instalação

```
/plugin install clean-view --marketplace brunodhd-prog/bibliasimples
/plugin install control-panel --marketplace brunodhd-prog/bibliasimples
/plugin install agent-team --marketplace brunodhd-prog/bibliasimples
/plugin install t4-context --marketplace brunodhd-prog/bibliasimples
```

Responda `y` para adicionar o marketplace e escolha o escopo. Para desenvolver: `claude --plugin-dir claude-mods/<mod>`.

## 1. Visão Limpa — `clean-view`

| Comando | Efeito |
| --- | --- |
| `/limpo [on\|off]` | Liga, desliga ou alterna |

- Cada tool call vira uma linha: `• Bash: Roda os testes` (`…` rodando, `✗` erro, `■` interrompida).
- Resultados detalhados ficam ocultos; erros continuam visíveis.
- A dica de background (`ctrl+b`) some.
- O modelo continua recebendo tudo: só o desenho muda.

## 2. Painel de Controle — `control-panel`

Faixa acima do prompt com o modelo atual e um atalho por perfil (teclas `1`–`4` com a faixa em foco).

| Perfil | Modelo | Esforço | Uso |
| --- | --- | --- | --- |
| Rápido | haiku | low | buscas, dúvidas curtas, renomeações |
| Código | sonnet | medium | implementação e testes do dia a dia |
| Arquiteto | opus | high | planejamento, SDD, revisão de código |
| Máximo | claude-fable-5-1 | max | problemas difíceis, depuração profunda |

| Comando | Efeito |
| --- | --- |
| `/modo [perfil]` | Troca o perfil (`rapido`, `codigo`, `arquiteto`, `maximo` ou `1`–`4`); sem argumento lista |
| `/painel` | Mostra ou oculta a faixa |

O perfil troca o modelo via `/model` e aplica o esforço só no loop principal (subagentes seguem o seu).

## 3. Time de Agentes — `agent-team`

| Comando | Efeito |
| --- | --- |
| `/time` | Abre o painel: modelo por papel (seletor) e lista de agentes com status e modelo |
| `/time Explore=haiku Plan=opus *=sonnet` | Define o modelo de cada papel (`*` = padrão, `inherit` = herda) |
| `/time-rodar <papel>: <tarefa>` | Dispara um subagente daquele papel, no modelo do papel |
| `/time-sync <mensagem>` | Envia a mesma mensagem a todos os agentes ativos |

- Todo spawn sem modelo explícito recebe o modelo do seu papel (inclusive os do próprio Claude).
- O painel atualiza a cada 3 s e tem os botões **Atualizar** e **Sincronizar** (pede a cada agente o estado em 3 linhas).

## 4. Contexto T4 — `t4-context`

Estratégia T4 do estudo de gerenciamento de contexto, sem recall (os agentes praticamente não o usam):

1. **B1 (65%)** — elisão: resultados de ferramentas antigos acima de 600 caracteres viram `cabeçalho + [T4 elision: N caracteres / L linhas omitidos]`. As últimas 8 mensagens ficam intactas. Nada é sumarizado.
2. **B2 (85%)** — sumarização: `/compact` com instruções para preservar objetivo, decisões, arquivos, estado e próximos passos.

A checagem roda ao fim de cada turno do loop principal. A linha de status mostra `T4 <uso>% · <fase> · elisões · resumos`.

| Comando | Efeito |
| --- | --- |
| `/t4` | Limites, uso, elisões, caracteres poupados e resumos |
| `/t4 on\|off` | Liga ou desliga |
| `/t4 agora` | Força uma checagem |

Configuráveis em `/config` (`b1`, `b2`, `keepRecent`, `minChars`).

## Testes

```
claude plugin validate claude-mods/<mod>
claude plugin test claude-mods/<mod>
```

---

## SDD

**0. Constituição** — Um mod por funcionalidade, sem dependências entre si. Só a API pública de function hooks (`$`). Nenhum mod altera o que o modelo lê, exceto o T4 (por definição). Estado de tela em `$.state`, tipado no contrato `types/index.d.ts`. Cada mod: `validate` limpo, `tsc` limpo e testes de comportamento.

**1. Especificação**
- Visão Limpa: o usuário vê só o tópico de cada ação; detalhes sob demanda; erros nunca são ocultados.
- Painel de Controle: escolher o modelo pela natureza da tarefa com um toque; ver o modelo atual.
- Time de Agentes: ver todos os agentes; escolher o modelo de cada um por papel; disparar e sincronizar vários de uma vez.
- T4: evitar estouro de contexto sem perder a taxa de sucesso, reduzindo o custo por tarefa.

**2. Clarificação (decisões tomadas)**
- "Ocultar logs" = só o desenho; o transcript e o modelo ficam intactos.
- "Escolha individual de modelos" = por papel (`subagentType`), com padrão `*`; um modelo explícito na chamada sempre vence.
- Recall do T4 omitido, conforme o achado do estudo.
- B2 padrão = 85% (o estudo fixa só B1 = 65%).

**3. Planejamento** — `ui.render` em `ToolUse`/`ToolResult`/`ToolProgress`; `AbovePrompt` + `/model` + `turn.step` (esforço); `Pane` + `agent.spawn` + `$.agent.list` + `$.session.send`; `turn.complete` → `$.session.usage` → `$.session.compact` com hook próprio de `session.compact` para a elisão.

**4. Tarefas** — (a) contratos de estado; (b) hooks; (c) comandos; (d) testes; (e) marketplace e README. Critério de conclusão de cada uma: validate + tsc + testes passando.

**5. Portões de qualidade** — Todos os requisitos mapeados para um hook e um teste; nenhuma contradição entre mods (cada um desenha um componente diferente).

**6. Implementação** — Este diretório. Revisão humana pendente.
