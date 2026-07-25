# ADR-002 — Arquitetura do Edge

- **Status:** Aceito
- **Data:** 2026-07-25

## Contexto

Cada TV do ecossistema Mostarda possui um mini PC executando o software **Edge**, que reproduz conteúdo, coleta telemetria e produz Playback Events. O Edge opera em ambientes heterogêneos, com conectividade instável e sem intervenção física frequente. Ele precisa ser confiável, leve e atualizável remotamente — mas **não** pode carregar a complexidade de negócio da plataforma.

## Decisão

### Mini PC
- Hardware padronizado, homologado pela Mostarda.
- Identidade única (`TV ID`) provisionada no primeiro boot.
- Chave assimétrica gerada e mantida em armazenamento local seguro (para assinar Playback Events).

### Player
- Reprodução de Slots baseada em **fila local** recebida do Backend.
- Suporte a Assets pré-baixados (cache local).
- Renderização delegada ao **Canvas**.
- Sem lógica de precificação, split, elegibilidade ou negócio.

### Telemetria
- Envio contínuo (batch) de dados operacionais: saúde do dispositivo, conectividade, ocorrências.
- Separada semanticamente de **Evidence** — telemetria é operacional, evidência é fiscal.

### Heartbeat
- Sinal periódico curto declarando "estou vivo e saudável".
- Ausência prolongada aciona alertas (SLA, seguro).

### Atualização remota
- Canal seguro de atualização (assinada) de software, configuração e assets.
- Rollback automático se novo build falhar health checks.
- Janelas de atualização respeitam horário de operação do Venue.

### Segurança
- Comunicação sempre TLS mútuo entre Edge e Backend.
- Playback Events assinados com chave local (integridade e não-repúdio).
- Software assinado; boot verificado quando o hardware suportar.
- Sem porta administrativa aberta na rede local do Venue.

### Operação offline
- Edge mantém fila local de Slots por janela limitada (ex: 24h).
- Playback Events são armazenados localmente e ressincronizados ao voltar conectividade.
- Nenhuma Evidence é considerada válida antes da ressincronização e validação no Backend.

## Consequências

**Positivas**
- Edge simples de manter e auditar.
- Falhas de rede não param a operação imediata.
- Regras de negócio evoluem no Backend sem re-deploy de campo.

**Negativas**
- Necessidade de disciplina para não “empurrar” lógica ao Edge por conveniência.
- Sincronização offline exige tratamento cuidadoso de duplicidade e ordem.

## Complemento (2026-07-25) — TV como Container de Capabilities

A TV é modelada como **Container de Capabilities** (ver [`docs/domain/CAPABILITIES.md`](../domain/CAPABILITIES.md)),
cada Capability composta por **Facets** substituíveis ([`FACETS.md`](../domain/FACETS.md)), inspiradas
conceitualmente no Diamond Standard (EIP-2535). O Backend só envia trabalho compatível com as
Capabilities declaradas no provisionamento. As Facets do Edge continuam proibidas de conter regra de negócio.
