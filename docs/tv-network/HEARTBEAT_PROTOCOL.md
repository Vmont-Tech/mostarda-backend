# Heartbeat Protocol

## Finalidade e fronteira

Heartbeat é uma declaração operacional periódica emitida por uma `EdgeInstallation`. Ele prova apenas que uma identidade reconhecida reportou determinado estado em determinado instante; não prova que a TV exibiu conteúdo nem que está saudável.

O protocolo de domínio deve permitir:

- determinar liveness com confiança explícita;
- detectar lacunas, duplicidade, replay, conflito de identidade e clock drift;
- transportar uma síntese de `CurrentState`;
- alimentar `ObservedState`, Health e diagnóstico;
- reconciliar estado após períodos offline;
- auditar cada decisão sem sobrescrever fatos anteriores.

Heartbeat nunca contém Campaign, Slot, anúncio, criativo, preço, saldo, Evidence ou Settlement.

## Ownership e participantes

| Papel | Responsabilidade |
| --- | --- |
| `EdgeInstallation` | produz a declaração e preserva sequência monotônica dentro de uma sessão de boot |
| TV Network | autentica a identidade, registra o fato e decide se ele pode avançar projeções |
| Health Monitoring | consome fatos aceitos, lacunas e anomalias |
| Reconciler | compara revisão Current reportada com Desired e Observed |
| Fleet Management | usa somente projeções de liveness/Health, nunca o payload bruto como verdade absoluta |

## Envelope conceitual obrigatório

| Campo | Significado |
| --- | --- |
| `heartbeatId` | identidade imutável da declaração |
| `schemaVersion` | versão do contrato conceitual |
| `tvIdentifier` | referência ao nó lógico |
| `deviceIdentifier` | referência ao MiniPC emissor |
| `edgeInstallationId` | instalação Edge que possui a sessão |
| `bootSessionId` | época que delimita reinício e reinicialização de sequência |
| `sequence` | contador monotônico dentro de `bootSessionId` |
| `emittedAt` | instante declarado pelo Edge |
| `receivedAt` | instante independente de recebimento pelo TV Network |
| `currentStateRevision` | revisão de Current State representada |
| `lastAppliedDesiredRevision` | última revisão Desired que o Edge afirma ter aplicado |
| `connectivitySummary` | condição de conectividade observada localmente |
| `processSummary` | estado dos processos operacionais supervisionados |
| `versionInventory` | versões Edge, Player, Canvas, Capability Manifest, OS e Firmware |
| `healthSignalsSummary` | sinais brutos ou resumidos; não é o HealthScore oficial |
| `syncSummary` | último ponto confirmado e lacunas locais conhecidas |
| `identityProof` | prova de origem vinculada à identidade ativa |
| `correlationId` | correlação com boot, reconciliação ou operação remota quando aplicável |

Extensões desconhecidas podem ser preservadas, mas não podem alterar semântica de campos existentes. Campo obrigatório ausente torna a declaração inválida para liveness, sem impedir seu registro como tentativa rejeitada.

## Identidade, duplicidade e conflito

A chave de idempotência é:

```text
edgeInstallationId + bootSessionId + sequence
```

- Mesma chave e mesmo conteúdo lógico: duplicata idempotente; não cria novo fato de liveness.
- Mesma chave e conteúdo diferente: conflito de integridade; gera `HeartbeatConflictDetected` e não avança Current/Observed State.
- Nova sessão pode reiniciar `sequence`, mas `bootSessionId` não pode ser reutilizado.
- Heartbeat de identidade revogada, dispositivo incompatível ou sessão desconhecida é rejeitado e gera observação de segurança.
- Repetição suspeita, clonagem ou conflito pode colocar a EdgeInstallation em `QUARANTINED` conforme política. Quarentena é reversível por Command autorizado e não apaga mensagens.

## Ordering, atraso e replay

Ordering é monotônico por `edgeInstallationId + bootSessionId`. Recebimento global não é ordenado.

- Mensagem fora de ordem é preservada com `receivedAt`, mas não faz projeção regredir.
- Salto de sequência gera `HeartbeatGapDetected`; a lacuna permanece explícita mesmo que parte das mensagens chegue depois.
- Mensagem de sessão anterior pode completar histórico, mas não recupera liveness atual.
- Replay legítimo após reconexão reutiliza a identidade original da mensagem; reenviar com nova sequência seria um novo fato falso e é proibido.
- A janela temporal para aceitar replay como contribuição a diagnóstico é definida por política e permanece `OPEN`.

## Clock drift

`emittedAt` é sinal do relógio local; `receivedAt` é referência para liveness do lado do TV Network. O sistema nunca corrige silenciosamente o timestamp original.

Cada avaliação de clock preserva desvio estimado, confiança, origem e política usada. Desvio além da tolerância gera `EdgeClockDriftDetected` e pode degradar Health, solicitar sincronização ou levar à quarentena quando houver risco de identidade/replay.

Tolerância, método de estimação e janela de estabilização são `OPEN`. Até serem aprovados, clock local não pode ser usado sozinho para declarar disponibilidade.

## Liveness e ausência

`HeartbeatReceived` significa recebimento autenticado; não significa `HEALTHY`.

Liveness é derivada pela `HeartbeatPolicy`, que versiona cadência esperada, tolerância, número/tempo de faltas, tratamento por conectividade e recuperação. Os valores quantitativos são `OPEN`.

- Ausência produz `HeartbeatMissed` por avaliação temporal explícita.
- `UNKNOWN` é o resultado seguro quando cobertura é insuficiente.
- Um Heartbeat posterior pode gerar `HeartbeatLivenessRecovered`, mas não remove a lacuna anterior.
- Mudança para `HEALTHY` depende de Health Monitoring, não apenas de retorno do sinal.

## Retry e recuperação offline

Retry reutiliza `heartbeatId`, sessão e sequência originais. O emissor conserva ordem por sessão quando possível e declara perda quando não puder.

Ao reconectar:

1. Edge declara a sessão corrente e o último ponto confirmado;
2. mensagens pendentes são reapresentadas com identidade original;
3. o receptor elimina duplicatas;
4. gaps e sessões antigas são registrados;
5. Current State corrente é reconciliado separadamente do replay histórico.

Timeout de retry, retenção local e limite de backlog são `OPEN`. Esgotamento nunca autoriza fabricação de Heartbeat nem conclusão automática de Health.

## Eventos

- `HeartbeatReceived`
- `HeartbeatDuplicateIgnored`
- `HeartbeatRejected`
- `HeartbeatConflictDetected`
- `HeartbeatGapDetected`
- `HeartbeatMissed`
- `HeartbeatLivenessRecovered`
- `EdgeClockDriftDetected`
- `EdgeQuarantined`

## Exemplos

**Válido:** a sessão `boot-7` reapresenta sequência 41 após reconexão com o mesmo conteúdo. A tentativa é reconhecida como duplicata e não cria segundo fato de liveness.

**Válido:** sequências 51 e 53 chegam antes de 52. A sequência 53 registra gap; a chegada posterior de 52 completa histórico sem fazer Current State regredir.

**Contraexemplo:** tratar um Heartbeat autenticado como prova de que Player e Display estão saudáveis. Heartbeat prova presença da declaração, não funcionamento de todas as dimensões.

**Contraexemplo:** aceitar mesma sessão/sequência com versões diferentes e manter a mais recente. Isso mascara conflito de integridade e é proibido.
