# ADR-006 — Arquitetura de IA

- **Status:** Aceito
- **Data:** 2026-07-25

## Contexto

A Mostarda depende de IA para escalar validação, recomendação, otimização e atendimento. Precisamos de uma arquitetura de agentes especializados, coordenados, observáveis e substituíveis por provedor.

## Decisão

Adotamos uma arquitetura de **múltiplos agentes especializados**, coordenados pelo núcleo (`AI Core`), com um único **Anti-Corruption Layer** por provedor externo (LLM, visão, etc.). O **Grão** é a face conversacional dos agentes para o usuário final.

### Agentes obrigatórios

1. **Agente de validação de vídeo**
   - Verifica formato, duração (15s), qualidade, conformidade e políticas.
   - Bloqueia Assets que não podem virar Slot.

2. **Agente de recomendação de TVs**
   - Sugere inventário (TVs/Venues) ideal para uma Campaign, dado público-alvo, contexto e histórico.

3. **Agente de otimização de orçamento**
   - Redistribui orçamento entre Slots/TVs em tempo real conforme performance e Dynamic Pricing.

4. **Agente de análise de performance**
   - Cruza Evidences, Telemetria e metas para gerar diagnósticos por Campaign, TV, Venue e Vendedor.

5. **Agente de relatórios**
   - Gera relatórios executivos, fiscais e operacionais a partir dos dados consolidados.

6. **Agente de atendimento Grão**
   - Interface conversacional ao usuário. Aprende preferências, explica decisões, aciona os demais agentes sob demanda.

### Princípios

- **Explicabilidade obrigatória** — todo agente registra insumos, decisão e razão.
- **Portabilidade de provedor** — nenhum agente conversa direto com um SDK externo; sempre via `AI Core`.
- **Domínio primeiro** — agentes consomem os mesmos conceitos do dicionário; nada de vocabulário paralelo.
- **Grão é o único canal humano** — os demais agentes operam em background e nunca falam diretamente com o usuário.
- **Rastreabilidade** — decisões de IA que afetam dinheiro (ex: pricing, split-relevantes) geram evento auditável.

### Contratos internos

- Cada agente expõe uma **capability** interna versionada (input/output tipados).
- `AI Core` orquestra chamadas e mantém trilha de execução.
- Falha de um agente **não** derruba o fluxo humano: o sistema apresenta fallback e sinaliza degradação.

## Consequências

**Positivas**
- Evolução independente por agente.
- Troca de LLM/modelo é local ao adapter.
- Grão oferece experiência consistente enquanto o backend evolui.

**Negativas**
- Coordenação exige observabilidade robusta.
- Custo variável de inferência precisa de governança (limites, orçamento por Campaign).

**Mitigações**
- Painel interno de execução de agentes.
- Limites por Campaign/usuário e circuit breakers no AI Core.
