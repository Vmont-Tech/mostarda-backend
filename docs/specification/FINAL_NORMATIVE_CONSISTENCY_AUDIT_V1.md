# Final Normative Consistency Audit V1

**Data:** 2026-07-27  
**Escopo:** consistência cruzada antes de Architecture Freeze  
**Modo:** somente leitura sobre domínio/arquitetura; nenhuma decisão foi fechada.

## 1. Parecer executivo

**PLATFORM SPECIFICATION v1.0 — ACCEPTED:** `NOT AUTHORIZED`  
**ARCHITECTURE FREEZE GLOBAL:** `NOT AUTHORIZED`  
**DESENVOLVIMENTO DE ARTEFATOS JÁ AUTORIZADOS:** preservado conforme Architecture Lock/IRR  
**TBS-1 CANDIDATE:** `NOT APPROVED`

A plataforma possui hierarquia normativa madura, mas ainda não satisfaz o gate global proposto.

Os bloqueios não são editoriais:

- Commands financeiros ainda não possuem owner único;
- Events financeiros ainda não possuem produtor único;
- existem decisões comportamentais abertas;
- existem contratos públicos ausentes;
- existem lifecycles sobrepostos;
- a TBS ainda exige consolidação normativa.

## 2. Autoridade da Specification

### Evidência

- ADR-009 está `Aceito`;
- ADR-009 adota a Specification como fonte primária **após sua aprovação**;
- `PLATFORM_SPECIFICATION.md` permanece `DRAFT`;
- `CONSISTENCY_RULES.md` determina que, enquanto estiver `DRAFT`, documentos aprovados existentes continuam operacionais.

### Veredito

A Specification é a candidata constitucional e a principal fonte de consolidação, mas seu próprio processo ainda não autoriza declarar `v1.0 ACCEPTED`.

Promovê-la antes dos gates restantes violaria ADR-009 e o processo que a torna autoritativa.

## 3. Unicidade de Aggregate owner

### Violações comprovadas

| Artefato | Texto atual | Resultado |
| --- | --- | --- |
| `ReconcileFinancialOperation` | owner = “Aggregate correspondente” | owner não determinístico |
| `RecordPlatformLoss` | owner = “ledger financeiro aplicável” | owner não identificado |
| `RefundAdvertiserByResponsibility` | owner = `AdvertiserAccount/Payment` | dois owners possíveis |
| `RecoverFromResponsibleParty` | owner = “ledger da obrigação” | owner não identificado |
| Command de emergência | `SYNC-014/OPEN-027` | owner ainda não consolidado |

### Veredito

Gate “todo Command possui owner único”: **falhou**.

Esses Commands não podem ser gerados nem usados como contratos públicos.

## 4. Unicidade de Event producer

### Violações comprovadas

| Event | Producer atual | Resultado |
| --- | --- | --- |
| `FinancialReconciliationRequired` | “owner que detectou divergência” | produtor variável |
| `FinancialReconciliationCompleted` | “owner da reconciliação/decisão” | produtor variável |
| `AdvertiserRefundRecorded` | `AdvertiserAccount/Payment` | dois produtores possíveis |
| `PlatformLossRecorded` | “ledger financeiro” | tipo de produtor não identificado |
| `ResponsiblePartyRecoveryRecorded` | “ledger financeiro” | tipo de produtor não identificado |

### Veredito

Gate “todo Event possui produtor único”: **falhou**.

## 5. Command alterando Aggregate alheio

### Regra superior

A Specification proíbe Command alterar Aggregate que não seja seu owner. Event não altera estado; consumidor solicita mudança por Command ao owner.

### Resultado da busca

Não foi encontrado texto normativo vigente autorizando Event a alterar Aggregate diretamente.

`SYNC-016` registra uma divergência histórica na qual Command de PaymentLedger descrevia efeito em CampaignBudget. A decisão vigente exige Commands distintos, ligados por Events.

### Veredito

Regra global: **consistente**.  
Documentos derivados: **sincronização ainda necessária**.  
Commands com owner genérico permanecem bloqueados pela seção 3.

## 6. State Machines e lifecycle

### Consistências confirmadas

- GovernanceCase possui reavaliação temporalmente consistente;
- Campaign lifecycle específico foi fechado;
- WithdrawalBatch especializado possui lifecycle fechado;
- Settlement fechado não pode reabrir; compensação ocorre por nova linha/Aggregate.

### Conflitos remanescentes

| Conflito | Evidência |
| --- | --- |
| Settlement `CLOSED → COMPENSATING` em visão derivada antiga | `SYNC-011` |
| PlayerSession versus PlaybackAttempt | `SYNC-018`, `OPEN-034` |
| Evidence validity versus QuantumAnchor/reversão tardia | `SYNC-018`, `OPEN-028` |
| Insurance Claim withdrawal Event ausente | `OPEN-033` no catálogo de State Machines |

### Veredito

Gate “nenhuma máquina contradiz outra”: **falhou globalmente**.

As máquinas especializadas fechadas continuam utilizáveis de forma isolada.

## 7. Sagas e invariantes globais

### Consistências confirmadas

- Saga coordena e não decide domínio;
- compensação é nova intenção ao owner;
- replay/rebuild não executa side effects externos;
- resultado externo desconhecido não equivale a sucesso/falha;
- Governance reevaluation possui ordem fechada.

### Bloqueios

- playback recovery depende da relação Attempt/Session;
- Evidence/Anchor depende de reversão tardia;
- Payment/Settlement/Withdrawal dependem de conservação e chargeback;
- Emergency depende de owner único;
- catálogo Command/Event incompleto impede contrato integral.

### Veredito

Sagas autorizadas individualmente preservam seus status.  
Gate global de Sagas: **falhou**.

## 8. Policies com comportamento implícito

### Apenas quantitativas/operacionais

- SLO/SLA numéricos;
- thresholds de Health/rollout;
- retenção quantitativa de idempotency key;
- timeout/TTL/tentativas quando não alteram lifecycle;
- limites mínimo/máximo de Withdrawal;
- controles produtivos de autorização, privacidade e retenção.

Esses itens podem ser policies/configuração sem reabrir comportamento estrutural.

### Comportamentais

| Decisão | Por que não é apenas parâmetro |
| --- | --- |
| tolerância dos 15 segundos | determina validade de playback/Evidence |
| fiscalidade | determina cálculo, retenção, obrigação e lançamento |
| capitalização do Insurance Fund | determina origem da obrigação financeira |
| chargeback após consumo | determina consequência e compensação |
| alocação de saldo negativo | determina quem absorve/recupera perda |
| gross/net, taxas e impostos | determina base econômica |
| precisão/arredondamento/residual | determina valor normativo |
| conservação do Ledger | determina saldo oficial |
| pagamento parcial/excedente | determina alocação entre obrigações |
| ordering/gaps offline | determina aguardar, invalidar ou reprocessar |
| reversão tardia Evidence/Anchor | determina direito e compensação |
| recovery PlaybackAttempt/PlayerSession | determina tentativa e completude |

### Veredito

A afirmação “OPENs restantes não impedem desenvolvimento porque são policies versionadas” é **parcialmente falsa**.

Policies versionadas podem materializar decisões aprovadas. Elas não podem criar silenciosamente o comportamento listado acima.

## 9. Documentos derivados com norma não migrada

### Dívida com precedência conhecida

`SYNC-003..013`, `SYNC-015..017` possuem regra prevalente identificada. São sincronização documental, não decisão nova.

### Bloqueio real

- `SYNC-014`: owner de emergência;
- `SYNC-018`: Player/Playback e Evidence/Anchor.

### Veredito

Gate “todo documento derivado está sincronizado”: **falhou**.  
Parte majoritária é dívida documental; `SYNC-014/018` contém bloqueio real.

## 10. TBS

### Estado da auditoria

| Veredito | Quantidade |
| --- | ---: |
| KEEP | 82 |
| CONSOLIDATE_REFERENCE | 11 |
| REWRITE_TESTABLE | 2 |
| REMOVE_UPSTREAM_DUPLICATE | 1 |
| Total | 96 |

### Autoridade única pendente

Consolidações necessárias:

- identidade em retry/redelivery;
- Conflict sob payload divergente;
- merge automático;
- duplicate/gap durante replay;
- side effects em replay/rebuild;
- idempotência de Saga.

Reescritas necessárias:

- `TBS-ERR-005`: referenciar classificação normativa de dados;
- `TBS-EVO-008`: referenciar processo normativo identificável.

Referência upstream:

- `TBS-SAG-001` deve virar precondição arquitetural referenciada.

Regra preservada:

- `TBS-ID-003` permanece `KEEP`; não existe autoridade superior semanticamente equivalente.

### Veredito

Gate “toda regra TBS promovida, referenciada ou conscientemente mantida”: **auditado, mas ainda não aplicado ao texto candidate**.

TBS não pode ser promovida enquanto os 14 ajustes não forem materializados e revalidados.

## 11. Testes globais

| Gate | Resultado |
| --- | --- |
| regra repetida com semântica diferente | falhou parcialmente; duplicidade TBS e documentos derivados |
| Aggregate com dois owners | falhou para Commands financeiros/emergência |
| Event altera estado | nenhuma autorização normativa encontrada |
| Command altera Aggregate alheio | regra superior correta; divergências derivadas registradas |
| State Machines contraditórias | falhou globalmente |
| lifecycle viola invariante global | bloqueios Player/Evidence/Financial impedem demonstração completa |
| policy contém comportamento implícito | falhou em decisões comportamentais listadas |
| documento derivado possui norma não migrada | falhou |
| toda TBS possui destino auditado | passou na matriz; aplicação ainda pendente |

## 12. Condições mínimas para ACCEPTED

1. aplicar os 14 resultados da TBS Normative Review;
2. reexecutar a matriz das 96 normas e obter autoridade textual única/testabilidade;
3. definir owners dos Commands financeiros e de emergência;
4. definir producers dos Events financeiros genéricos;
5. fechar contratos ausentes de `OPEN-027/033`;
6. fechar boundary/recovery de `OPEN-034`;
7. fechar reversão tardia de `OPEN-028`;
8. fechar conservação, precisão, fiscalidade, chargeback e pagamentos parciais;
9. sincronizar State Machines e documentos derivados;
10. executar nova certificação global sem exceções.

## 13. Conclusão

A plataforma está madura para desenvolvimento incremental de artefatos explicitamente autorizados, mas não para declarar:

`Platform Specification v1.0 — ACCEPTED`

nem:

`Architecture Freeze global`.

O próximo passo de menor escopo é consolidar a TBS candidate. Isso não substitui os blockers de domínio/arquitetura restantes e não autoriza merge na `main`.

