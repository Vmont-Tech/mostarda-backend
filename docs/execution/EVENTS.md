# Events — Execution Model

Este documento é o catálogo normativo dos fatos necessários ao comportamento da Mostarda. Event descreve algo já aceito pelo Aggregate produtor. Consumidor reage emitindo Command ao seu próprio owner; nunca altera o Aggregate produtor.

## Contrato comum

Todo Event DEVE conter:

| Campo conceitual | Obrigação |
| --- | --- |
| `eventId`, tipo e versão | Identidade global imutável e schema explícito. |
| Contexto, Aggregate, identidade e revisão do produtor | Define owner e ordering do stream. |
| `occurredAt` | Instante do fato; para Edge offline, não é substituído pelo instante de ingestão. |
| `correlationId` e `causationId` | Ligam o fato ao workflow e à intenção/fato anterior. |
| Payload conceitual | Somente dados necessários e permitidos aos consumidores declarados. |
| Versões de regra/software | Obrigatórias quando o fato depende de política, algoritmo, modelo, schema ou runtime. |
| Integridade | Digest/hash conceitual quando o fato participa de prova, dinheiro, segurança ou operação remota. |

## Entrega, falha, ordering e replay

1. O produtor registra transição e Event como uma decisão indivisível. Se o transporte estiver indisponível, o fato continua aceito e aguarda republicação.
2. Republicação preserva o mesmo `eventId`, payload, correlação e causação.
3. Consumidores DEVEM aceitar duplicidade. O resultado do primeiro processamento é reutilizado; nenhum efeito externo é repetido.
4. Ordering existe por stream do Aggregate/revisão, nunca globalmente. Eventos de Aggregates diferentes podem chegar em qualquer ordem.
5. Lacuna de revisão, schema desconhecido ou dependência ausente suspende somente o processamento dependente. O Event é isolado e diagnosticado, nunca descartado.
6. Replay reapresenta Events ao consumidor. Reprocessamento cria uma nova tentativa de decisão derivada; nenhum dos dois recria o fato original.
7. Rebuild de projeção não reenvia notificações, transferências, Commands remotos ou outras saídas já executadas.
8. Um resultado externo desconhecido permanece `UNKNOWN/PENDING_RECONCILIATION`; timeout não autoriza declarar sucesso nem falha.
9. Backoff, TTL, limite de tentativas e espera por gap são qualitativamente obrigatórios e quantitativamente `OPEN-029/031`.

## Campaign

Ordering: `CampaignId + aggregateRevision`. Idempotência do consumidor: `eventId`. Compensação: somente nova transição válida; estados finais não são reabertos.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `CampaignCreated` | Campaign | CRM, Marketplace, Analytics | campaign, Advertiser, nome, objetivo, moeda, país, responsável, data, revisão | Duplicata não recria Campaign; projeções podem ser reconstruídas |
| `CreativeAssetUploaded` | Campaign | AI Orchestration, Analytics | asset id/hash, Campaign, formato declarado, revisão | Falha da AI não muda o upload; retry conserva `eventId` |
| `CreativeAssetApproved` | Campaign | Slot, Edge asset distribution, Analytics | asset id/hash, veredito referenciado, revisão | Asset rejeitado/aprovado não é reavaliado em replay |
| `CreativeAssetRejected` | Campaign | Advertiser/Notifications, Analytics | asset, motivo permitido, veredito/version | Novo upload/revisão, nunca edição do veredito |
| `CampaignReady` | Campaign | Marketplace, Campaign scheduler | Campaign, requisitos satisfeitos, revisão | Gap bloqueia publicação derivada |
| `CampaignPublished` | Campaign | Pricing, Marketplace, Analytics | Campaign, janela/segmentação publicadas, revisão | Evento obsoleto não rebaixa revisão mais nova |
| `CampaignActivated` | Campaign | Slot, Analytics, Notifications | Campaign, janela, causa, revisão | Replay não reserva Slot por si; consumidor deduplica |
| `CampaignExecutionStarted` | Campaign | Analytics, Advertiser, Grão | Campaign, primeiro Slot, instante, revisão | Publicado uma vez; replay não cria Slot |
| `CampaignPaused` | Campaign | Slot, Analytics, Notifications | Campaign, tipo/motivo da pausa, revisão | Pausas distintas têm causalidade própria; não são colapsadas |
| `CampaignResumed` | Campaign | Slot, Analytics, Notifications | Campaign, causas removidas, revisão e gates | Só é produzido quando nenhuma causa de pausa permanece |
| `CampaignCompleted` | Campaign | Slot, Analytics, Notifications | Campaign, critério de conclusão, revisão | Final; replay não revoga fatos passados |
| `CampaignExpired` | Campaign | Slot, Marketplace, Analytics | Campaign, window end, revisão | Final; Slots futuros são tratados por Commands próprios |
| `CampaignCancellationRequested` | Campaign | Slot/Budget cancellation Saga, Notifications | Campaign, actor, reason, Slot manifest, revision | Não significa cancelamento concluído |
| `CampaignCancelled` | Campaign | Slot, Financial Platform, Marketplace, Notifications | Campaign, ator, motivo, revisão | Final; compensações financeiras seguem contextos owners |

Os quatro eventos de lifecycle explicitados após a documentação original devem ser sincronizados com o catálogo global (`OPEN-033`). `CampaignCancelled` substitui a associação incorreta entre cancelamento e `CampaignCompleted`.

## Pricing, CampaignBudget e Slot

Ordering: por `PricingQuoteId`, `CampaignBudgetId` ou `SlotId`, conforme produtor. Nenhum Event de Pricing movimenta budget; nenhum Event financeiro altera Slot diretamente.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `PriceQuoted` | PricingPolicy | Campaign Management, Marketplace | quote, valor calculado/final, inputs, validade, policy/algorithm version | Dedupe por quote; quote expirado permanece histórico |
| `PricingAuditRecorded` | PricingPolicy | Auditoria, Analytics | quote, inputs normalizados, fatores e decisão | Replay somente reconstrói trilha |
| `PriceOverridden` | PricingPolicy | Campaign Management, Auditoria | quote anterior/novo, ator, motivo, versões | Não altera quote já aplicado |
| `PriceApplied` | PricingPolicy | Slot, Evidence Builder | quote, Slot intent, valor congelado, versões | Uma única aplicação por quote/intent |
| `PaymentCompensated` | PaymentLedger | CampaignBudget, Analytics | ledger entry, pagamento/provider ref, valor/moeda, Campaign/contrato ref | Callback duplicado conserva uma entrada; owner permanece `OPEN-015` |
| `CampaignBudgetIncreased` | CampaignBudget | Campaign, Slot, Analytics | budget, origem compensada, delta, saldos resultantes | Dedupe por ledger entry; replay não duplica saldo |
| `CampaignBudgetReserved` | CampaignBudget | Slot, Analytics | reservation, intent/Slot, valor, saldos | Momento exato `OPEN-013`; consumidor não presume consumo |
| `CampaignBudgetReleased` | CampaignBudget | Campaign, Analytics | reservation, causa, valor, saldos | Não apaga reserva; gera movimento inverso explícito |
| `CampaignBudgetConsumed` | CampaignBudget | Campaign, Analytics | Evidence/causa, valor, saldos | Dedupe por causa; instante exato `OPEN-013` |
| `CampaignBudgetDepleted` | CampaignBudget | Campaign, Notifications | budget, saldo, causa | Pode causar `PauseCampaign`; não pausa diretamente |
| `SlotAllocated` | Slot | Edge Runtime, Campaign, Analytics | Slot, Campaign ref, TV ref operacional, asset, window, quote, revisão | Edge deduplica Slot/revisão; não aceita revisão obsoleta |
| `SlotRevoked` | Slot | Edge Runtime, CampaignBudget, Analytics | Slot, motivo, revisão | Revogação concorrente com início exige owner validar revisão |
| `SlotExpired` | Slot | CampaignBudget, Campaign, Analytics | Slot, window, causa/revisão | `SlotExpiredLocally` pode ser causador, não sinônimo |
| `SlotExpiredLocally` | Edge local schedule | Campaign Management, Observability | Slot, TV, instante local, revisão conhecida | Fato offline; Cloud decide `ExpireSlot`; duplicata não expira duas vezes |
| `SlotDispatchedToEdge` | Slot | Campaign, Cancellation Saga, Analytics | Slot, Edge identity, dispatch receipt, revision | Define cutoff; timeout sem receipt permanece UNKNOWN |
| `SlotDelivered` | Slot | Campaign, Analytics | Slot, playback attempt ref, instante/revisão | Não equivale a Evidence válida |
| `SlotEvidenced` | Slot | Campaign, Analytics | Slot, Evidence ref, revisão | Reversão tardia gera fatos compensatórios fora do Slot |

## Player e Playback

Ordering mínimo: `PlaybackAttemptId`; relação com `PlayerSession` é preservada e permanece `OPEN-034`. Eventos offline mantêm sequência local e `occurredAt`.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `PlaybackPrepared` | PlayerSession | Playback Collector, Telemetry | session, attempt, Slot ref, composition/versions | Replay não inicia playback |
| `PlaybackStarted` | PlayerSession | Playback Collector, Telemetry | session/attempt, Slot, monotonic start, versions | Uma tentativa tem um início aceito |
| `PlaybackFinished` | PlayerSession | Playback Collector, Campaign Management | session/attempt, start/end, duration, checksums, versions | Não declara Evidence; duplicata é ignorada |
| `PlaybackInterrupted` | PlayerSession | Playback Collector, Telemetry, Analytics | attempt, causa, duração observada, frames/checksums disponíveis | Nunca é somado silenciosamente a outra tentativa |
| `PlaybackRecovered` | PlayerSession | Playback Collector, Telemetry | session, tentativa original/nova, causa e resultado | Cardinalidade tentativa/sessão `OPEN-034` |
| `PlaybackFailed` | PlayerSession | Playback Collector, Telemetry, Analytics | attempt, estágio, erro classificado, versions | Falha definitiva da tentativa; retry cria tentativa identificada |
| `PlaybackEventSigned` | PlaybackAttempt | Playback Collector | playbackEvent id, payload digest, signature, device key ref | Mesma assinatura/payload em retry |
| `PlaybackEventQueued` | PlaybackAttempt | Edge observability | event id, queue sequence, occurredAt, reason | Rebuild local não inventa evento ausente |
| `PlaybackEventSubmitted` | PlaybackAttempt | Evidence Builder, ingest observability | event, signature, sequence, submission attempt | Cloud deduplica por event id; timeout = resultado desconhecido |

## Evidence Ledger

Ordering: `EvidenceId + revision`; deduplicação de origem: `PlaybackEventId`. Evidence é append-only. Validade e ancoragem são streams separados (`OPEN-028`).

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `EvidenceGenerated` | EvidenceRecord | Evidence Validator, Analytics | Evidence id, PlaybackEvent ref, fontes/digests, status PENDING, schema | Repetição do PlaybackEvent retorna mesma Evidence/result |
| `EvidenceValidated` | EvidenceRecord | Canonical package builder, Settlement eligibility, Campaign | Evidence, validation version, checks, status VALID | Replay não recria direito; consumidores deduplicam |
| `EvidenceRejected` | EvidenceRecord | Campaign, Notifications, Analytics | Evidence, regras falhas, status INVALID, versão | Novo fato só por nova origem válida; registro não é apagado |
| `EvidenceDisputed` | EvidenceRecord | Settlement, Notifications | Evidence, dispute id/motivo, revisão | Bloqueia decisões dependentes via Command do owner |
| `EvidenceDisputeResolved` | EvidenceRecord | Settlement, Analytics | dispute, decisão, referências, revisão | Resolução não remove abertura |
| `EvidenceReversed` | EvidenceRecord | Settlement, Financial Platform, Analytics | Evidence, decisão/motivo, refs compensatórias | Reversão tardia não reabre Settlement; causa compensação |
| `EvidenceHashed` | EvidenceRecord | Quantum Integration | Evidence, canonical schema, package digest/hash | Quantum não recebe dados proibidos; hash idempotente |

## Quantum

Ordering/idempotência: por hash. Falha externa mantém resultado desconhecido até consulta/reconciliação; nova tentativa não troca o hash.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `AnchoringRequested` | QuantumAnchor | Quantum adapter observability | hash, canonical version permitida, attempt | Repetição por hash não cria outra identidade lógica |
| `AnchoringConfirmed` | QuantumAnchor | Evidence eligibility projection, Settlement, Analytics | hash, receipt, external timestamp, attempt | Callback duplicado retorna mesmo recibo |
| `AnchoringFailed` | QuantumAnchor | Retry policy, Notifications | hash, tentativa, erro classificado, resultado conhecido/desconhecido | Só falha recuperável agenda nova tentativa; timeout não presume falha |

## Settlement e SplitShare

Ordering: por `SettlementId + revision`; direitos são deduplicados por `SettlementId + EvidenceId + SplitPolicyVersion + beneficiaryRole`. Settlement fechado não reabre.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `SettlementCycleOpened` | Settlement | Settlement scheduler, Analytics | cycle, period, policy versions, revision | Ciclo duplicado retorna original |
| `SplitCalculated` | Settlement | Auditoria, Financial Platform após autorização | cycle, Evidence refs, cinco shares, gross/net lines, policy versions | Reprocessamento com mesmos inputs converge; divergência abre diagnóstico |
| `SettlementBlocked` | Settlement | Notifications, Operations | cycle/share scope, causa, dependências | Não bloqueia shares não afetadas |
| `SettlementAuthorized` | Settlement | Financial Platform, Analytics | cycle, calculation hash, autoridade, revision | Duplicata não republica direito |
| `SplitShareReady` | Settlement | Financial Platform, Analytics | share, beneficiary snapshot, value, calculation revision | Duplicata não publica segundo direito |
| `SplitShareBlocked` | Settlement | Financial Platform, Notifications | share, causa, revisão | Compensação é desbloqueio/novo fato autorizado |
| `SplitShareUnblocked` | Settlement | Financial Platform, Analytics | share, decisão, novo estado/revisão | Consumidor revalida; não presume READY |
| `SplitShareUnclaimed` | Settlement | Financial Platform, Analytics | share, papel, snapshot de inelegibilidade | Nunca redistribui valor |
| `SplitShareCredited` | Settlement | Analytics, Notifications | share, PartnerLedger entry ref, revision | Confirma materialização; não é pagamento |
| `SettlementExecuted` | Settlement | Financial Platform, Analytics | cycle, rights manifest/hash, fechamento | Significa direitos publicados, não pagamento |
| `PartnerCreditRequested` | Settlement | Financial Platform | right/share id, partner ref quando existente, value, policies | Dedupe pelo share id; replay não duplica ledger |

## Financial Platform e Withdrawal

Ordering: por ledger identity ou `WithdrawalId`. PartnerWallet é projeção; replay nunca chama Asaas. Eventos externos são reconciliados por identidade da instrução/tentativa.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `PartnerCredited` | PartnerLedger | PartnerWallet, Analytics, Notifications | ledger entry, right/share ref, partner, value, maturity data | Uma entrada por right; `CREDITED` não é `PAID` |
| `PartnerLedgerCompensated` | PartnerLedger | PartnerWallet, Analytics | entry, original ref, reason, value/polarity | Nunca edita entrada original |
| `NegativeBalanceCreated` | PartnerLedger | PartnerWallet, Notifications | partner, entry, balance derivation refs | Projeção reconstruível |
| `NegativeBalanceRecovered` | PartnerLedger | PartnerWallet, Notifications | partner, recovery entries, remaining value | Créditos usados ficam explicitamente correlacionados |
| `WithdrawalRequested` | Withdrawal | Financial policy, Notifications | withdrawal, partner, requested value, policy version | Duplicata retorna mesma solicitação |
| `WithdrawalApproved` | Withdrawal | Batch coordinator, PartnerWallet projection | withdrawal, authority, value/fee, policy version | Autoridade transacional é `OPEN-035` |
| `WithdrawalRejected` | Withdrawal | Partner, Notifications | withdrawal, reason, policy version | Rejeição final/retentável conforme `OPEN-022/023` |
| `WithdrawalBatched` | Withdrawal | WithdrawalBatch, adapter | withdrawal, batch, value, revision | Lifecycle do batch `OPEN-024` |
| `WithdrawalExecutionRequested` | Withdrawal | Asaas adapter | instruction id, withdrawal, amount, attempt | Replay não reenvia se delivery ledger já confirma envio |
| `WithdrawalExecuted` | Withdrawal | PartnerLedger/Wallet, Notifications | withdrawal, provider receipt, settled value, attempt | Callback duplicado não lança novo débito |
| `WithdrawalFailed` | Withdrawal | Retry policy, Notifications | withdrawal, attempt, error, known/unknown result | Efeito na taxa/janela `OPEN-022/023`; desconhecido reconcilia |
| `WithdrawalRetryScheduled` | Withdrawal | Adapter/Operations | withdrawal, próxima tentativa qualitativa, causa | Nova tentativa, mesma obrigação |

## TV Network e Edge operacional

Ordering: por Aggregate owner (`TV`, `Device`, `Installation`, `EdgeInstallation`, `TVCapability`, `HealthRecord`, `UpdateRollout`, `EmergencyBroadcast`). TV Network nunca recebe payload de Campaign/Evidence/Finance.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `TvRegistered` | TV | Device Registry, Inventory, Fleet | TV id, owner/Venue refs, revision | Identidade nunca é reutilizada |
| `TvActivated` | TV | Fleet, Inventory, Notifications | TV, gates/health refs, revision | Replay não executa operação física |
| `TvSuspended` | TV | Fleet, Remote Operations, Notifications | TV, reason, revision | Não apaga identity/history |
| `TvMaintenanceStarted` | TV | Fleet, Remote Operations, Notifications | TV, maintenance window, reason, revision | Não abre a MaintenanceWindow; apenas muda a TV |
| `TvMaintenanceEnded` | TV | Fleet, Remote Operations, Notifications | TV, window, target state, health refs, revision | Não presume ACTIVE; pós-estado é explícito |
| `TvDecommissioned` | TV | Fleet, Device Registry, Security | TV, decision, revision | Final; consumers ignore older revisions |
| `DeviceRegistered` | DeviceRegistry | Installation, Inventory | device identity, class, custody ref | Serial/identity duplicate is same fact or conflict |
| `DeviceBoundToTV` | DeviceRegistry | Installation, Inventory | device, TV, binding revision, effective time | Rebuild preserves binding timeline |
| `InstallationVerified` | Installation | TV lifecycle, Provisioning | installation, checklist digest, technician, revision | Não implica aceite |
| `InstallationAccepted` | Installation | TV lifecycle, Provisioning | installation, authority, revision | Ordem com provisioning `OPEN-011` |
| `InstallationFailed` | Installation | TV lifecycle, Notifications | installation, failed checks, revision | Nova tentativa referencia a anterior |
| `EdgeProvisioningStarted` | EdgeInstallation | Health, Operations | edge installation, TV/device refs, desired versions | Timeout gera UNKNOWN, não sucesso |
| `EdgeIdentityRegistered` | EdgeInstallation | Security, Health | edge/device identity refs, public credential refs | Relação formal é `OPEN-012` |
| `CapabilityDeclared` | TVCapability | Capability Registry, Inventory | capability id, manifest/version, owner, revision | Independente de Facets |
| `CapabilityActivated` | TVCapability | Inventory, Health | capability, health/policy refs, revision | Duplicata não anuncia duas vezes |
| `CapabilityRetired` | TVCapability | Inventory, Edge Runtime | capability, reason, revision | Final para revisão; nova versão é nova declaração |
| `DesiredStatePublished` | TV | EdgeInstallation, Reconciler | TV, desired revision, signed intent, expiry | Edge rejeita revisão antiga/expirada |
| `CurrentStateReported` | EdgeInstallation | Reconciler, Health | TV/Edge, current revision, component versions, result | Append-only; relato posterior não sobrescreve anterior |
| `ObservedStateDerived` | TVObservation | Reconciler, Health | TV, observation revision, source refs, policy | Rebuild deve ser determinístico para mesmas fontes |
| `StateDivergenceDetected` | StateReconciliation | Operations, Reconciler | TV, desired/current/observed refs, diff | Não prova falha sozinho |
| `ReconciliationPlanned` | StateReconciliation | Owners dos Commands planejados | TV, plan revision, commands intended, constraints | Consumer revalida cada Command |
| `StateReconciliationCompleted` | StateReconciliation | Fleet, Analytics | TV, compared revisions, result | Estado novo invalida conclusão obsoleta, não a apaga |
| `DesiredStateApplyStarted` | EdgeInstallation | Reconciler, Health | TV, desired revision, attempt | Resultado desconhecido exige CurrentState/observação |
| `DesiredStateApplyFailed` | EdgeInstallation | Reconciler, Operations | TV, desired revision, cause, attempt | Retry limitado qualitativamente; nunca loop |
| `EdgeHealthy` | EdgeInstallation | TV lifecycle, Fleet, Update policy | Edge installation, observation/policy refs, revision | Não é inferido por heartbeat isolado |
| `EdgeDegraded` | EdgeInstallation | TV lifecycle, Fleet, Operations | Edge installation, cause, observations, revision | Histórico de observações permanece |
| `EdgeFailed` | EdgeInstallation | TV lifecycle, Fleet, Operations | Edge installation, cause, last known state, revision | Reprovision é novo Command |
| `HeartbeatReceived` | HealthRecord | Health derivation, Reconciler | TV/Edge, sequence, observed time, version summary | Sequência duplicada ignorada; gap explícito |
| `HeartbeatMissed` | HealthRecord | Health, Fleet, Notifications | TV, expected sequence/window policy, gap | Ausência gera UNKNOWN, não CRITICAL por suposição |
| `HealthObserved` | HealthRecord | HealthScore, Fleet | observation, sources, values, occurredAt | Append-only |
| `HealthScoreChanged` | HealthRecord | Fleet, Update policy, Notifications | old/new score, policy version, source refs | Replay não envia alerta já entregue |
| `UpdateScheduled` | UpdateRollout | EdgeInstallation, Fleet | rollout, package/version, wave, window, policy | Sem pacote/onda válida, consumidor rejeita Command |
| `UpdateWaveStarted` | UpdateRollout | EdgeInstallation, Fleet | rollout/wave, target set/version, health criteria | Duplicata não reaplica pacote |
| `UpdateWavePaused` | UpdateRollout | EdgeInstallation, Operations | rollout/wave, reason, observations | Targets não iniciados permanecem intactos |
| `UpdateApplyStarted` | EdgeInstallation | UpdateRollout, Health | TV, component, package digest, from/to, attempt | Timeout mantém resultado UNKNOWN |
| `UpdateApplied` | EdgeInstallation | UpdateRollout, Health | TV, component, from/to, package digest, attempt | Confirmação idempotente por package/TV |
| `UpdateFailed` | EdgeInstallation | UpdateRollout, Rollback policy | TV, component, stage, cause, attempt | Resultado desconhecido é reconciliado antes de retry |
| `UpdateRollbackStarted` | EdgeInstallation | UpdateRollout, Health | TV, failed attempt, target healthy version, rollback attempt | Duplicata não inicia segundo rollback |
| `UpdateRolledBack` | EdgeInstallation | UpdateRollout, Health | TV, failed version, restored version, reason | Preserva tentativa falha |
| `RollbackFailed` | EdgeInstallation | Fleet, Operations | TV, versions, stage/cause | Leva a DEGRADED/FAILED; não inventa HEALTHY |

## Insurance

Ordering: por `PolicyId`, `ClaimId`, `ReserveId`, `RepairId`, `ReplacementId` ou `InsuranceSettlementId`. Insurance Settlement nunca é Settlement de mídia.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `InsuranceClaimFiled` | InsuranceClaim | Claim assessment, Notifications | claim, policy/TV refs, occurrence, documents digest | Duplicata de solicitação retorna claim original |
| `InsuranceClaimAssessmentStarted` | InsuranceClaim | Claimant, Operations | claim, assessor, policy version | Timeout permanece UNDER_REVIEW |
| `InsuranceClaimInformationRequested` | InsuranceClaim | Claimant, Notifications | claim, missing items, reason | Complemento é novo fato, não edição |
| `InsuranceClaimApproved` | InsuranceClaim | Reserve, Repair/Replacement workflow | claim, coverage decision, limits/policy version | Não cria reserva diretamente |
| `InsuranceClaimDenied` | InsuranceClaim | Reserve release, Notifications | claim, reason, policy version | Final; nova Claim referencia a anterior |
| `InsuranceReserveCreated` | InsuranceReserve | Repair/Replacement, Fund projection | reserve, claim, value, policy/source refs | Capitalização `OPEN-009`; dedupe por claim/decision |
| `InsuranceReserveReleased` | InsuranceReserve | Fund projection, Analytics | reserve, released value, reason | Movimento append-only |
| `InsuranceRepairAuthorized` | InsuranceRepair | Operations, InsuranceSettlement | repair, claim/reserve refs, quote | Duplicata não autoriza segundo reparo |
| `InsuranceReplacementAuthorized` | InsuranceReplacement | TV Network, InsuranceSettlement | replacement, old/new device refs, reserve | TV Network recebe somente refs operacionais permitidas |
| `InsuranceSettlementExecuted` | InsuranceSettlement | Insurance Fund/Ledger, Notifications | obligation, value, receipt, reserve refs | Resultado externo desconhecido reconcilia; replay não paga |
| `InsuranceClaimSettled` | InsuranceClaim | Claimant, Analytics, Notifications | claim, insurance settlement ref, repair/replacement result, revision | Final; replay não repete obrigação |

## Emergência e AI

Ordering de emergência: `EmergencyId` e, para execução, `TVId/PlayerSessionId`. AI ordering: `AiExecutionId`; recomendação nunca é decisão do contexto consumidor.

| Event | Produtor único | Consumidores principais | Payload conceitual | Falha/duplicidade/replay |
| --- | --- | --- | --- | --- |
| `EmergencyBroadcastDeclared` | EmergencyBroadcast | Emergency Saga, Auditoria | emergency, source, scope, priority, expiry, authority | Expiração impede ativação tardia |
| `EmergencyBroadcastActivated` | EmergencyBroadcast | Canvas/Player command coordinators | emergency, frozen scope/revision, activation | Reentrega produz os mesmos Commands idempotentes |
| `EmergencyLayerActivated` | CanvasComposition | Emergency Saga, Edge observability | emergency, TV, composition revision | Falha em uma TV não declara sucesso global |
| `EmergencyBroadcastStarted` | PlayerSession | Emergency Saga, Analytics | emergency, TV/session, preempted attempt | Cada TV confirma separadamente |
| `EmergencyBroadcastCleared` | EmergencyBroadcast | Canvas/Player coordinators | emergency, clear cause/time | Clear repetido retorna resultado original |
| `EmergencyBroadcastEnded` | PlayerSession | Emergency Saga, Analytics | emergency, TV/session, restoration result | Gap de confirmação permanece explícito |
| `AiDecisionExplained` | AiExecution | Grão, contexto solicitante, Auditoria | execution, versions, sources, confidence, explanation | Replay não reexecuta Tool/Command |
| `AiRecommendationRevoked` | AiExecution | Grão, contexto solicitante | recommendation, reason, revision | Não desfaz ação já aceita por outro owner |

Eventos específicos de recomendação devem ter nomes no passado e payload próprio; wildcard `*Recommended` não é contrato. O catálogo global deve ser sincronizado em `OPEN-033`.

## Exemplos e contraexemplos

| Cenário | Comportamento normativo | Proibido |
| --- | --- | --- |
| Transporte cai depois de `PartnerCredited` | Republicar o mesmo Event; Wallet deduplica | Criar novo crédito |
| `AnchoringConfirmed` chega duas vezes | Registrar um único recibo lógico | Autorizar Settlement duas vezes |
| `CurrentStateReported` revisão 8 chega antes da 7 | Manter 8; registrar/diagnosticar gap 7 | Aplicar revisão 7 sobre 8 |
| Replay de `WithdrawalExecutionRequested` | Reconstruir estado e consultar ledger de entrega | Reenviar transferência automaticamente |
| Schema futuro desconhecido | Isolar e alertar; retomar quando compatível | Ignorar campos e processar dinheiro |
| Timeout do provider | Estado `UNKNOWN/PENDING_RECONCILIATION` | Publicar `Executed` ou `Failed` por palpite |

## Eventos adicionais de Campaign

| Event | Producer | Consumers | Payload conceitual | Regra |
| --- | --- | --- | --- | --- |
| `CampaignStrategyRevised` | Campaign | Grão, Scheduling, Analytics | Campaign, revision, actor, constraints, mandate | revisão antiga permanece histórica |
| `CampaignPauseCauseRemoved` | Campaign | Scheduling, Notifications | Campaign, cause, remaining causes, revision | não implica retomada |
| `CampaignCancellationRequested` | Campaign | Slot/Budget Saga | Campaign, reason, cutoff, revision | não significa cancelamento concluído |
| `CampaignCancelled` | Campaign | Financial, Analytics, Notifications | Campaign, reason, remaining obligations, revision | nunca equivale a completed |
| `SlotReallocationRequested` | Campaign | Pricing/Allocation Saga | original obligation, original Slot, constraints, attempt | novo Slot usa nova identidade |
## Governance & Dispute Management Events

Producer único: `GovernanceCase`. Ordering: `governanceCaseId + aggregateRevision`. Deduplicação: Event ID; decisões também por `decisionId + revision`.

| Event | Consumers principais |
| --- | --- |
| `GovernanceCaseOpened` | Governance workers, Audit, Analytics |
| `EvidenceReferenceAttached` | Investigation, Audit |
| `InvestigationStarted` | Investigation, AI Orchestration, Audit |
| `HumanReviewRequested` | Operations, Notifications, Audit |
| `ResponsibilityDecisionPublished` | Financial, Settlement, Campaign, Notifications, Analytics |
| `ResponsibilityDecisionAppealed` | Investigation, Notifications, Audit |
| `GovernanceCaseReevaluationStarted` | Investigation, Audit |
| `GovernanceCaseReevaluated` | Audit, Governance projections |
| `GovernanceCaseClosed` | Audit, Analytics, Notifications |

`ResponsibilityAssigned` e `ResponsibilityReassigned` são proibidos. Replay preserva Event ID e nunca repete consequência externa. Contrato integral: [`../governance/GOVERNANCE_EVENTS.md`](../governance/GOVERNANCE_EVENTS.md).
