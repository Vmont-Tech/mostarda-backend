# Commands — Execution Model

Este é o catálogo normativo de intenções da plataforma. Command não é chamada técnica nem mensagem de transporte: é uma solicitação dirigida a exatamente um Aggregate owner. As regras gerais estão em [`EXECUTION_INVARIANTS.md`](./EXECUTION_INVARIANTS.md).

## Contrato comum

Todo Command DEVE conter:

| Campo conceitual | Regra |
| --- | --- |
| `commandId`, tipo e versão | Identificam uma tentativa de intenção e seu contrato. |
| Contexto, Aggregate e identidade alvo | Devem apontar para um único owner. |
| Emissor e contexto de autorização | Pessoa, sistema ou Saga; o owner revalida a permissão. |
| `issuedAt` e expiração | Expiração é obrigatória para intenção temporal/remota; duração quantitativa é `OPEN-031`. |
| `correlationId` e `causationId` | Ligam intenção ao fluxo e ao fato/Command causador. |
| Chave de idempotência e digest do payload | Mesma chave + mesmo digest retorna o resultado original; digest divergente é conflito (`OPEN-030`). |
| Revisão esperada | Obrigatória quando concorrência pode invalidar a intenção. |
| Motivo e versões de política | Obrigatórios para dinheiro, prova, segurança, emergência, manutenção e override. |

Resultados conceituais:

- `ACCEPTED`: o owner aplicou uma transição válida e publicou os Events declarados.
- `REJECTED`: nenhuma transição de sucesso ocorreu; ficam motivo, regra, ator e revisão na auditoria.
- `DUPLICATE`: retorna exatamente o resultado da primeira aceitação/rejeição compatível.
- `CONFLICT`: revisão ou digest incompatível; exige nova leitura e nova intenção.
- `EXPIRED`: intenção não pode mais produzir efeito.

Entrega não significa aceite. Timeout do emissor não autoriza repetição com nova chave.

### Falhas aplicáveis a todo Command

| Falha | Resultado obrigatório | Event de domínio |
| --- | --- | --- |
| Emissor não autenticado ou não autorizado | `REJECTED`; registrar ator/contexto, regra e alvo | Nenhum Event de sucesso |
| Pré-condição ou invariante falsa | `REJECTED`; retornar motivo estável e revisão observada | Somente Event de rejeição se ele estiver explicitamente catalogado |
| Revisão esperada obsoleta | `CONFLICT`; exigir nova avaliação da intenção | Nenhum |
| Mesma chave e mesmo digest | `DUPLICATE`; retornar resultado original | Nenhum novo |
| Mesma chave e digest/alvo diferente | `CONFLICT`; alerta auditável | Nenhum |
| Command expirado | `EXPIRED` | Nenhum |
| Owner indisponível antes do aceite | Resultado desconhecido para o emissor; retry com mesma chave | Nenhum até aceite comprovado |
| Resposta perdida após possível aceite | Consultar pelo `commandId`/chave; nunca criar outra intenção | O Event original, se aceito, será republicado |
| Efeito externo sem resultado conclusivo | Manter `PENDING_RECONCILIATION/UNKNOWN` e consultar a obrigação | Nunca publicar sucesso/falha por timeout |

## Campaign Management

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `CreateCampaign` | `Campaign` | Advertiser | Identidade inédita; Advertiser ativo; nome, objetivo, moeda, país, responsável e data válidos | Nova Campaign `DRAFT` | `CampaignCreated` | Campos mínimos e actor; chave `advertiserId+clientRequestId` |
| `UploadCreativeAsset` | `Campaign` | Dono/delegado da Campaign | Campaign não final; arquivo identificado e hash presente | Creative Asset fica aguardando veredito | `CreativeAssetUploaded` | Dono/delegado; hash e origem; `campaignId+assetId+hash` |
| `RecordCreativeAssetVerdict` | `Campaign` | Campaign Management após fato da AI Orchestration | Asset enviado; veredito técnico versionado; revisão atual | Asset torna-se aprovado ou rejeitado pelo owner | `CreativeAssetApproved` ou `CreativeAssetRejected` | Serviço do contexto; preserva AI execution/explanation; `assetId+verdictVersion` |
| `MarkCampaignReady` | `Campaign` | Dono/delegado ou workflow | `DRAFT`; ao menos um Creative Asset aprovado; janela/segmentação completas | `READY` | `CampaignReady` | Mesma autoridade de edição; requisitos auditados; `campaignId+revision` |
| `PublishCampaign` | `Campaign` | Dono/delegado | `READY`; política comercial e orçamento de referência válidos | `PUBLISHED` | `CampaignPublished` | Dono/delegado; contrato e revisão; `campaignId+publishRevision` |
| `ActivateCampaign` | `Campaign` | Scheduler de Campaign Management | `PUBLISHED`; janela iniciada; `AvailableBudget` suficiente segundo política; nenhum bloqueio | `ACTIVE` | `CampaignActivated` | Serviço do owner; fatos causadores preservados; `campaignId+activationWindow` |
| `RecordCampaignExecutionStarted` | `Campaign` | Campaign Management consumindo o primeiro `SlotAllocated` | `ACTIVE`; execução ainda não iniciada; Slot pertence à revisão vigente | Marca início operacional uma única vez | `CampaignExecutionStarted` | `campaignId+firstSlotId`; Slots seguintes retornam resultado já iniciado |
| `PauseCampaign` | `Campaign` | Dono/delegado ou política do owner | `ACTIVE`; motivo permitido | `PAUSED`; não invalida execução passada | `CampaignPaused` | Motivo obrigatório; `campaignId+pauseReason+revision` |
| `ResumeCampaign` | `Campaign` | Dono/delegado ou política do owner | `PAUSED`; causa específica removida; janela e budget permitem; nenhuma outra causa permanece | `ACTIVE` | `CampaignResumed` | Cada causa é removida separadamente; `campaignId+revision` |
| `CompleteCampaign` | `Campaign` | Campaign Management | `ACTIVE` ou `PAUSED`; critério de entrega/fim satisfeito | `COMPLETED` final | `CampaignCompleted` | Critério e métricas de origem; `campaignId+completionRevision` |
| `ExpireCampaign` | `Campaign` | Scheduler do owner | `PUBLISHED`, `ACTIVE` ou `PAUSED`; janela terminou | `EXPIRED` final | `CampaignExpired` | Base temporal e revisão; `campaignId+windowEnd` |
| `CancelCampaign` | `Campaign` | Advertiser | Estado não final; motivo; inventário de Slots revalidado | Sem Slot `DISPATCHED`: `CANCELLED`; com Slot `DISPATCHED`: `CANCELLING` | `CampaignCancelled` ou `CampaignCancellationRequested` | `campaignId+cancelRevision`; nunca publica `CampaignCompleted` |
| `FinalizeCampaignCancellation` | `Campaign` | Saga de cancelamento | `CANCELLING`; Slots revogáveis resolvidos; irreversíveis terminais/reconciliados | `CANCELLED` final | `CampaignCancelled` | Manifest de obrigações e resultados; `campaignId+cancelRevision` |

`CampaignReady`, `CampaignPublished`, `CampaignActivated` e `CampaignCancelled` tornam explícitas transições antes implícitas. Devem ser sincronizados ao catálogo global conforme `OPEN-033`; até lá, seus nomes neste modelo não autorizam sinônimos.

## Pricing, CampaignBudget e Slot

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `QuotePrice` | `PricingPolicy` | Campaign Management | Intenção de Slot, inventário e inputs permitidos; política vigente | Cria `PricingQuote` imutável ainda não aplicado | `PriceQuoted`, `PricingAuditRecorded` | Serviço autorizado; inputs/política/algoritmo; `slotIntentId+policyVersion` |
| `OverridePriceQuote` | `PricingPolicy` | Papel comercial segregado | Quote ainda não aplicado; override permitido | Nova revisão de quote; original preservado | `PriceOverridden` | Dupla autoridade conforme `OPEN-032`; motivo obrigatório; `quoteId+overrideRevision` |
| `ApplyPriceQuote` | `PricingPolicy` | Campaign Management | Quote válido, não expirado e dentro de floor/ceiling | Quote torna-se aplicado e congelado | `PriceApplied` | Serviço autorizado; `quoteId+slotIntentId` |
| `RecordCompensatedPayment` | `PaymentLedger` | Financial Platform após confirmação do provider | Fato financeiro autenticado, não processado e reconciliável | Nova entrada append-only no Payment Ledger | `PaymentCompensated` | Owner do callback permanece `OPEN-015`; `providerPaymentId+compensationRevision` |
| `IncreaseCampaignBudget` | `CampaignBudget` | Financial Platform consumindo `PaymentCompensated` | Entrada compensada elegível e não alocada antes | Aumenta `AvailableBudget` | `CampaignBudgetIncreased` | Nunca executado pelo PaymentLedger; `paymentLedgerEntryId+campaignBudgetId` |
| `ReserveCampaignBudget` | `CampaignBudget` | Campaign Management | AvailableBudget suficiente; intenção e quote válidos | Move valor segundo política entre Available/Reserved | `CampaignBudgetReserved` | Momento normativo permanece `OPEN-013`; `slotIntentId+budgetRevision` |
| `ReleaseCampaignBudget` | `CampaignBudget` | Campaign Management/compensação de Slot | Reserva existente; Slot revogado/expirado segundo política | Libera valor não consumido | `CampaignBudgetReleased` | Causa de liberação; `reservationId+releaseReason` |
| `ConsumeCampaignBudget` | `CampaignBudget` | Financial Platform/Campaign Management após fato elegível | Reserva/saldo e fato de consumo válidos | Move valor para `ConsumedBudget` | `CampaignBudgetConsumed` | Instante exato permanece `OPEN-013`; `evidenceId+budgetRevision` |
| `ReserveSlot` | `Slot` | Campaign Management | Campaign `PUBLISHED/ACTIVE`; TV elegível por leitura operacional; Creative aprovado; quote aplicado; janela livre; autorização de budget | Novo Slot `ALLOCATED` | `SlotAllocated` | Decisão completa e quote; `campaignId+tvId+window` |
| `RevokeSlot` | `Slot` | Campaign Management | `ALLOCATED`; ainda não entregue/iniciado | `REVOKED` final | `SlotRevoked` | Motivo obrigatório; `slotId+revision` |
| `ExpireSlot` | `Slot` | Campaign Management após fato temporal/local | `ALLOCATED`; janela terminou sem entrega | `EXPIRED` final | `SlotExpired` | Preserva `SlotExpiredLocally` como fato causador quando houver; `slotId+windowEnd` |
| `RecordSlotDispatchedToEdge` | `Slot` | Campaign Management consumindo aceite autenticado do Edge | `ALLOCATED`; revisão e destino correspondem | `DISPATCHED`, cutoff de cancelamento imediato | `SlotDispatchedToEdge` | `slotId+edgeDispatchId`; timeout permanece desconhecido |
| `RecordSlotDelivered` | `Slot` | Campaign Management consumindo `PlaybackFinished` | `DISPATCHED`; tentativa correlacionada e não duplicada | `DELIVERED` | `SlotDelivered` | `playbackAttemptId`; não declara Evidence |
| `RecordSlotEvidenced` | `Slot` | Campaign Management consumindo `EvidenceValidated` | `DELIVERED`; Evidence correlacionada e não revertida no instante | `EVIDENCED` final | `SlotEvidenced` | `evidenceId`; reversão posterior não reescreve Slot |

## Player, playback e submissão offline

`PlayerSession` e `PlaybackAttempt` são conceitos distintos; sua relação cardinal permanece `OPEN-034`. Até decisão, toda tentativa possui identidade própria e nenhuma sessão pode ocultar tentativas.

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `PreparePlayback` | `PlayerSession` | Scheduler local autorizado | Sessão `IDLE`; Slot local aceito; composição, Asset, Capability e integridade válidos | `PREPARING` | `PlaybackPrepared` | Somente Edge; versões e referências; `slotId+attemptId` |
| `StartPlayback` | `PlayerSession` | Player local | `PREPARING`; relógio e saída prontos | `PLAYING` | `PlaybackStarted` | Somente Player; instante monotônico; `attemptId` |
| `FinishPlayback` | `PlayerSession` | Player local | `PLAYING`; execução chegou ao fim observado | `COMPLETED` | `PlaybackFinished` | Duração/checksums/versões; `attemptId` |
| `InterruptPlayback` | `PlayerSession` | Supervisor, emergência ou falha observada | `PREPARING/PLAYING`; causa explícita | `INTERRUPTED`, `PREEMPTED` ou `FAILED` segundo máquina | `PlaybackInterrupted` ou `PlaybackFailed` | Causa e frames observados; `attemptId+transition` |
| `ResumePlaybackAttempt` | `PlayerSession` | Player Supervisor | Tentativa recuperável; janela ainda válida | Retoma ou cria nova tentativa conforme `OPEN-034` | `PlaybackRecovered` ou `PlaybackFailed` | Nunca concatena fatos para fabricar 15s; identidade preservada |
| `SignPlaybackEvent` | `PlaybackAttempt` | Playback Collector | Resultado local congelado; payload canônico completo | Anexa `PlaybackSignature`; não cria Evidence | `PlaybackEventSigned` | Chave do dispositivo; `playbackEventId` |
| `QueuePlaybackEvent` | `PlaybackAttempt` | Playback Collector | Evento assinado; transporte indisponível ou envio pendente | Marca cópia local pendente | `PlaybackEventQueued` | Mesmo evento em retries; `playbackEventId` |
| `SubmitPlaybackEvent` | `PlaybackAttempt` | Playback Collector | Evento assinado; ainda dentro da política de retenção | Registra tentativa de submissão; fato original não muda | `PlaybackEventSubmitted` | Dispositivo autenticado; `playbackEventId`; timeout não cria nova identidade |

## Evidence e Quantum

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `BuildEvidence` | `EvidenceRecord` | Evidence Builder | PlaybackEvent assinado e deduplicado; Slot, quote e contexto correlacionáveis | Cria `PENDING_VALIDATION` após `BUILDING` | `EvidenceGenerated` | Somente Cloud; fontes/digests/versões; `playbackEventId` |
| `ValidateEvidence` | `EvidenceRecord` | Evidence Validator | `PENDING_VALIDATION`; inputs e política disponíveis; gaps relevantes resolvidos | `VALID`, `INVALID` ou `DISPUTED` | `EvidenceValidated`, `EvidenceRejected` ou `EvidenceDisputed` | Decisão reproduzível; `evidenceId+validationPolicyVersion` |
| `OpenEvidenceDispute` | `EvidenceRecord` | Parte autorizada/monitor de integridade | `PENDING_VALIDATION` ou `VALID`; motivo e referência presentes | `DISPUTED` | `EvidenceDisputed` | Identidade e motivo; `evidenceId+disputeId` |
| `ResolveEvidenceDispute` | `EvidenceRecord` | Analista segregado | `DISPUTED`; decisão e material permitido presentes | Retorna à decisão permitida ou gera reversão | `EvidenceDisputeResolved` e, se necessário, `EvidenceReversed` | Segregação `OPEN-032`; `disputeId+decisionRevision` |
| `ReverseEvidence` | `EvidenceRecord` | Analista autorizado/política do owner | `VALID` ou `DISPUTED`; causa material comprovada | `REVERSED` final; histórico original preservado | `EvidenceReversed` | Motivo/documentos/hash; `evidenceId+reversalDecisionId` |
| `PrepareCanonicalEvidencePackage` | `EvidenceRecord` | Evidence Ledger | `VALID`; conteúdo e versão canônica congelados | Associa pacote/hash a Evidence sem alterar fatos anteriores | `EvidenceHashed` | Somente Cloud; `evidenceId+canonicalSchemaVersion` |
| `AnchorEvidence` | `QuantumAnchor` | Quantum Integration | Hash permitido, não ancorado ou tentativa recuperável | `REQUESTED`; cria uma tentativa externa identificada | `AnchoringRequested` | Adapter autorizado; Quantum recebe somente conteúdo permitido; `evidenceHash` |
| `RecordAnchoringResult` | `QuantumAnchor` | Quantum Integration após resposta/reconciliação autenticada | Anchor `REQUESTED/UNKNOWN`; resultado pertence ao mesmo hash/tentativa | `CONFIRMED`, `FAILED` ou continua `UNKNOWN` | `AnchoringConfirmed` ou `AnchoringFailed`; nenhum Event terminal se desconhecido | Recibo/erro preservados; callback deduplicado por identidade externa + hash |

Validade da Evidence e estado do QuantumAnchor possuem owners separados. A projeção que combina ambos não é um Aggregate (`OPEN-028`).

## Settlement e Financial Platform

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `OpenSettlementCycle` | `Settlement` | Scheduler do Settlement | Identidade/período inéditos; políticas versionadas disponíveis | `OPEN` | `SettlementCycleOpened` | Serviço do owner; `cycleId` |
| `CalculateSettlement` | `Settlement` | Settlement | `OPEN/BLOCKED`; somente Evidences `VALID`, não revertidas e ancoradas | `CALCULATING`; cria cinco SplitShares por Evidence elegível | `SplitCalculated` ou `SettlementBlocked` | Snapshot de eligibility/políticas; `cycleId+calculationRevision` |
| `AuthorizeSettlement` | `Settlement` | Política do owner/operador segregado | Cálculo fechado e reconciliado; nenhum bloqueio global | `AUTHORIZED` | `SettlementAuthorized` | Segregação conforme `OPEN-032`; `cycleId+calculationHash` |
| `PublishSettlementRights` | `Settlement` | Settlement | `AUTHORIZED`; direitos ainda não publicados | `CLOSED`; publica cada direito elegível uma vez | `SettlementExecuted`, `PartnerCreditRequested` por share | `cycleId+splitShareId`; fechamento é imutável |
| `BlockSplitShare` | `Settlement` | Settlement/analista autorizado | Share `PENDING/READY`; causa específica | Share `BLOCKED` sem bloquear outras | `SplitShareBlocked` | Motivo e escopo; `splitShareId+blockDecision` |
| `MarkSplitShareReady` | `Settlement` | Settlement após cálculo/autorização | Share `PENDING`; beneficiário e direito elegíveis | Share `READY` | `SplitShareReady` | Snapshot de elegibilidade; `splitShareId+calculationRevision` |
| `UnblockSplitShare` | `Settlement` | Settlement/analista autorizado | Share `BLOCKED`; causa removida por decisão explícita | Share `PENDING` ou `READY`, conforme nova validação | `SplitShareUnblocked` | Não presume elegibilidade; `splitShareId+unblockDecision` |
| `MarkSplitShareUnclaimed` | `Settlement` | Settlement | Beneficiário ausente/inelegível | Share `UNCLAIMED` | `SplitShareUnclaimed` | Snapshot da elegibilidade; `splitShareId` |
| `CreditPartner` | `PartnerLedger` | Financial Platform consumindo direito | Direito imutável, não creditado e parceiro correlacionável | Nova entrada de crédito; share projetada como `CREDITED` | `PartnerCredited` | `splitShareId`; não significa pagamento |
| `MarkSplitShareCredited` | `Settlement` | Settlement consumindo `PartnerCredited` | Share `READY`; ledger entry corresponde exatamente ao direito | Share `CREDITED` | `SplitShareCredited` | Não move dinheiro; `splitShareId+partnerLedgerEntryId` |
| `CreateCompensatingLedgerEntry` | `PartnerLedger` | Financial Platform | Chargeback/reversão/ajuste autorizado; referência original | Nova entrada append-only, possivelmente saldo negativo | `PartnerLedgerCompensated`, `NegativeBalanceCreated` ou `NegativeBalanceRecovered` | Nunca altera direito original; `sourceEntryId+decisionId` |
| `RequestWithdrawal` | `Withdrawal` | Parceiro autorizado | Política, autoridade transacional e saldo elegível; nenhuma solicitação conflitante | `REQUESTED` | `WithdrawalRequested` | Owner revalida; `partnerId+clientRequestId` |
| `ApproveWithdrawal` | `Withdrawal` | Financial Platform | `REQUESTED`; política e saldo revalidados | `APPROVED` ou `REJECTED` | `WithdrawalApproved` ou `WithdrawalRejected` | Segregação `OPEN-032`; `withdrawalId+policyVersion` |
| `AddWithdrawalToBatch` | `Withdrawal` | Financial Platform | `APPROVED`; batch elegível | `BATCHED` | `WithdrawalBatched` | Lifecycle de batch é `OPEN-024`; `withdrawalId+batchId` |
| `ExecuteWithdrawal` | `Withdrawal` | Financial Platform via adapter Asaas | `BATCHED`; reserva/autorização válidas | `EXECUTING` | `WithdrawalExecutionRequested` | Instrução externa idempotente; `withdrawalId+executionAttempt` |
| `RecordWithdrawalResult` | `Withdrawal` | Financial Platform após resultado autenticado | `EXECUTING`; resultado correlacionável e não processado | `EXECUTED` ou `FAILED` | `WithdrawalExecuted` ou `WithdrawalFailed` | Deduplica callback; `providerTransferId` |
| `RetryWithdrawal` | `Withdrawal` | Financial Platform | `FAILED`; falha classificada como recuperável e política permite | Nova tentativa `EXECUTING`; histórico anterior preservado | `WithdrawalRetryScheduled`, `WithdrawalExecutionRequested` | Efeito sobre janela/taxa é `OPEN-022/023`; `withdrawalId+attempt` |

## TV Network e operação do Edge

TV Network não conhece Campaign, anúncio, preço, Evidence, Settlement ou Financial Platform. Os Commands abaixo tratam somente identidade e disponibilidade operacional.

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `RegisterTV` | `TV` | Operador Mostarda | Identidade física inédita; owner/Venue válidos | `REGISTERED` | `TvRegistered` | Operador de rede; serial/origem; `hardwareIdentity` |
| `RegisterDevice` | `DeviceRegistry` | Operador/instalação | Device identity inédita | Device registrado, ainda não vinculado | `DeviceRegistered` | Cadeia de custódia; `deviceIdentity` |
| `BindDeviceToTV` | `DeviceRegistry` | Operador/instalação | TV/Device ativos e vínculo compatível | Novo vínculo histórico | `DeviceBoundToTV` | Não apaga vínculo anterior; `deviceId+tvId+bindingRevision` |
| `VerifyInstallation` | `Installation` | Técnico identificado | Instalação `IN_PROGRESS`; checklist e observações presentes | `VERIFIED` ou `FAILED` | `InstallationVerified` ou `InstallationFailed` | Técnico/evidências operacionais; `installationId+checklistRevision` |
| `AcceptInstallation` | `Installation` | Operador autorizado | `VERIFIED`; critérios vigentes satisfeitos | `ACCEPTED` | `InstallationAccepted` | Segregação quando aplicável; `installationId+acceptanceRevision` |
| `ProvisionEdge` | `EdgeInstallation` | Provisioning autorizado | Gates conhecidos presentes; ordem Installation/Provisioning é `OPEN-011` | `INSTALLING/PROVISIONING` | `EdgeProvisioningStarted` | Credenciais e versões auditadas; `edgeInstallationId+revision` |
| `RegisterEdgeIdentity` | `EdgeInstallation` | Edge provisionado/Provisioning | Identidade/chave válidas; relação TV/Device conforme `OPEN-012` | Identidade operacional registrada | `EdgeIdentityRegistered` | Prova de posse; `edgeIdentity` |
| `DeclareCapability` | `TVCapability` | Edge autenticado/operador | Manifesto declarativo assinado e compatível | `DECLARED` | `CapabilityDeclared` | Independente de Facets; `capabilityId+manifestVersion` |
| `ActivateCapability` | `TVCapability` | TV Network | `VALIDATED`; health permite | `ACTIVE` | `CapabilityActivated` | Política/health gate; `capabilityId+revision` |
| `RetireCapability` | `TVCapability` | TV Network | Não final; retirada autorizada | `RETIRED` final | `CapabilityRetired` | Motivo; `capabilityId+revision` |
| `ActivateTV` | `TV` | TV Network | Todos os gates obrigatórios presentes; ordem interna `OPEN-011` | `ACTIVE` | `TvActivated` | Snapshot dos gates; `tvId+revision` |
| `SuspendTV` | `TV` | Operador/política do owner | TV não final; causa explícita | `SUSPENDED` | `TvSuspended` | Motivo e escopo; `tvId+revision` |
| `EnterTVMaintenance` | `TV` | TV Network | `ACTIVE/SUSPENDED`; MaintenanceWindow aberta e autorizada | `MAINTENANCE` | `TvMaintenanceStarted` | Janela/motivo; `tvId+maintenanceWindowId` |
| `ExitTVMaintenance` | `TV` | TV Network | `MAINTENANCE`; janela/ações concluídas; health reavaliado | `ACTIVE` ou `SUSPENDED` segundo decisão do owner | `TvMaintenanceEnded` | Pós-estado explícito; `tvId+maintenanceWindowId+revision` |
| `DecommissionTV` | `TV` | Operador segregado | TV não final; impactos operacionais tratados | `DECOMMISSIONED` final | `TvDecommissioned` | Aprovação e cadeia de custódia; `tvId+decommissionDecision` |
| `PublishDesiredState` | `TV` | Control plane do TV Network | Revisão nova; política e alvo válidos | Nova revisão de DesiredState | `DesiredStatePublished` | Conteúdo assinado; `tvId+desiredRevision` |
| `RecordCurrentState` | `EdgeInstallation` | Edge autenticado | Relato assinado e revisão local válida | Acrescenta CurrentState report | `CurrentStateReported` | Nunca sobrescreve relato; `tvId+edgeStateRevision` |
| `DeriveObservedState` | `TVObservation` | Health Monitoring do TV Network | Fatos operacionais disponíveis e versionados | Nova ObservedState derivada | `ObservedStateDerived` | Fontes/algoritmo; `tvId+observationRevision` |
| `RequestStateReconciliation` | `StateReconciliation` | Reconciler | Desired/Current/Observed identificados; divergência não obsoleta | Registra diagnóstico/plano; não altera TV/Edge | `StateDivergenceDetected`, `ReconciliationPlanned` ou `StateReconciliationCompleted` | Diff completo; `tvId+desiredRevision+observedRevision` |
| `ApplyDesiredState` | `EdgeInstallation` | Reconciler após plano | Command assinado, não expirado, permitido por manutenção/segurança | Edge tenta convergir e reporta resultado | `DesiredStateApplyStarted`, `CurrentStateReported` ou `DesiredStateApplyFailed` | `tvId+desiredRevision`; nunca força fora da política |
| `RecordEdgeOperationalStatus` | `EdgeInstallation` | Health/Supervisor do TV Network | Observações autênticas e revisão atual | `HEALTHY`, `DEGRADED` ou `FAILED` | `EdgeHealthy`, `EdgeDegraded` ou `EdgeFailed` | Inputs/policy auditados; `edgeInstallationId+observationRevision` |
| `RecordHeartbeat` | `HealthRecord` | Edge autenticado | Sinal autêntico e não duplicado | Nova observação append-only | `HeartbeatReceived` | `tvId+heartbeatSequence` |
| `RecordHealthObservation` | `HealthRecord` | Health Monitoring | Fonte identificada; observação nova | Nova observação e score derivado quando aplicável | `HealthObserved`, `HealthScoreChanged` | Política/inputs; `observationId` |
| `ScheduleUpdate` | `UpdateRollout` | Operador de frota | Pacote assinado, compatível; política/onda/janela aprovadas | `SCHEDULED` | `UpdateScheduled` | Segregação `OPEN-032`; `rolloutId+targetVersion` |
| `StartUpdateWave` | `UpdateRollout` | Operador/política | `SCHEDULED/PAUSED`; onda elegível e health gate prévio | `WAVE_RUNNING` | `UpdateWaveStarted` | Critérios quantitativos `OPEN-007`; `rolloutId+waveId` |
| `PauseUpdateWave` | `UpdateRollout` | Operador/política | `WAVE_RUNNING`; risco ou decisão explícita | `PAUSED` | `UpdateWavePaused` | Motivo/observações; `rolloutId+waveId+revision` |
| `ApplyUpdate` | `EdgeInstallation` | Update Management | Janela aberta; pacote/política válidos; Command não expirado | `UPDATING`; cria tentativa operacional identificada | `UpdateApplyStarted` | `tvId+packageDigest`; retry não reinstala versão já confirmada |
| `RollbackUpdate` | `EdgeInstallation` | Update Management/health policy | Update falhou ou health gate exige; versão saudável conhecida | `ROLLING_BACK`; cria tentativa operacional identificada | `UpdateRollbackStarted` | Preserva tentativa; `tvId+failedUpdateAttempt` |
| `RecordUpdateResult` | `EdgeInstallation` | Edge/Supervisor após operação observada | `UPDATING`; resultado pertence ao mesmo package/attempt | Mantém versão nova para health gate ou registra falha | `UpdateApplied` ou `UpdateFailed` | Resultado desconhecido não é terminal; `tvId+updateAttempt` |
| `RecordRollbackResult` | `EdgeInstallation` | Edge/Supervisor após operação observada | `ROLLING_BACK`; resultado pertence à mesma tentativa | `HEALTHY/DEGRADED/FAILED` | `UpdateRolledBack` ou `RollbackFailed` | Versões/health preservados; `tvId+rollbackAttempt` |

## Hardware Continuity (`Insurance*` supersedido)

Os Commands normativos vigentes estão definidos em [HARDWARE_CONTINUITY.md](../domain/HARDWARE_CONTINUITY.md). Nenhum Command `Insurance*` é autorizado.

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `ActivateContinuitySubscription` | `ContinuitySubscription` | Partner onboarding/billing autorizado | TV elegível, Complete Mode, preço e policy version vigentes | Assinatura `ACTIVE` | `ContinuitySubscriptionActivated` | `tvId+servicePlanPriceVersion+competence` |
| `OpenMaintenanceCase` | `MaintenanceCase` | Parceiro, suporte ou monitoramento autorizado | TV e ocorrência identificadas; caso equivalente não aberto | Caso `OPEN` | `MaintenanceCaseOpened` | `tvId+occurrenceId` |
| `AuthorizeRepair` | `MaintenanceCase` | Operação autorizada | Diagnóstico registrado; alternativa conforme policy | Reparo `AUTHORIZED` | `RepairAuthorized` | `maintenanceCaseId+decisionRevision` |
| `AssignTemporaryReplacement` | `TemporaryReplacement` | Operação autorizada | Caso aberto; TV temporária Mostarda disponível | Empréstimo `ASSIGNED` | `TemporaryReplacementAssigned` | `maintenanceCaseId+temporaryTvId` |
| `CompleteTemporaryReturn` | `TemporaryReplacement` | Operação autorizada | Equipamento devolvido e inspecionado | Empréstimo `RETURNED` | `TemporaryReplacementReturned` | `temporaryReplacementId+inspectionRevision` |
| `ProposePermanentExchange` | `PermanentExchange` | Operação autorizada | Perda total/equivalência e ativos registrados | Troca `PROPOSED` | `PermanentExchangeProposed` | `maintenanceCaseId+proposalRevision` |
| `AcceptPermanentExchange` | `PermanentExchange` | Titulares autorizados | Proposta vigente; declarações e assinaturas válidas | Troca `DELIVERY_PENDING` | `PermanentExchangeAccepted` | `exchangeId+signaturePackageId` |
| `CompletePermanentExchange` | `PermanentExchange` | Operação após entrega e inspeção | Transferências recíprocas e custódia comprovadas | Troca `COMPLETED` | `PermanentExchangeCompleted`, fatos de provenance | `exchangeId+completionRevision` |
| `RegisterDonorPart` | `CircularInventory` | Operação de hardware autorizada | Origem, integridade e ativo doador rastreáveis | Peça disponível ou destinada | `DonorPartRegistered` | `sourceAssetId+partSerial` |

## Emergência e IA

Emergência é uma Saga com Commands separados. Nenhum Command tem `PlayerSession / CanvasComposition` como owner duplo.

| Command | Aggregate owner | Quem pode emitir | Pré-estado e pré-condições | Pós-estado/efeito | Events | Autorização, auditoria e idempotência |
| --- | --- | --- | --- | --- | --- | --- |
| `DeclareEmergencyBroadcast` | `EmergencyBroadcast` | Operador de emergência | Fonte, escopo, prioridade, motivo e expiração homologados | Emergência `DECLARED` | `EmergencyBroadcastDeclared` | Segregação `OPEN-032`; `emergencyId` |
| `ActivateEmergencyBroadcast` | `EmergencyBroadcast` | Orquestrador de emergência | `DECLARED`; ainda vigente | `ACTIVE` | `EmergencyBroadcastActivated` | Escopo congelado/revisado; `emergencyId+activationRevision` |
| `ApplyEmergencyComposition` | `CanvasComposition` | Saga de emergência | Emergência ativa e aplicável à TV; token assinado | Camada prioritária aplicada | `EmergencyLayerActivated` | `emergencyId+tvId+compositionRevision` |
| `PreemptPlayerSession` | `PlayerSession` | Saga de emergência | Sessão `PLAYING/PREPARING`; prioridade superior válida | `PREEMPTED` | `EmergencyBroadcastStarted`, `PlaybackInterrupted` | Tentativa/frames preservados; `emergencyId+sessionId` |
| `ClearEmergencyBroadcast` | `EmergencyBroadcast` | Operador/política de expiração | `ACTIVE`; clear autorizado ou expiração alcançada | `CLEARED` final | `EmergencyBroadcastCleared` | Motivo/instante; `emergencyId+clearRevision` |
| `RestorePlayerSession` | `PlayerSession` | Saga de emergência | Emergência limpa; composição compatível disponível | Retoma com nova tentativa ou encerra segundo `OPEN-034` | `EmergencyBroadcastEnded`, `PlaybackRecovered` ou `PlaybackFailed` | Nunca completa tentativa interrompida por soma implícita |
| `RequestAiRecommendation` | `AiExecution` | Usuário/contexto autorizado | Finalidade, escopo, consentimento e orçamento de IA válidos | Execução registrada; produz recomendação/explicação | `AiDecisionExplained`, evento recomendado específico | Versões Model/Prompt/Agent/Policy; `requestId` |
| `RevokeAiRecommendation` | `AiExecution` | AI Orchestration/operador autorizado | Recomendação existente; motivo de invalidação | Marca recomendação revogada sem alterar ação já decidida por outro owner | `AiRecommendationRevoked` | Correlação com execução; `aiExecutionId+revocationRevision` |

Um Command delegado por IA usa o Command normal do contexto alvo, com o usuário/sistema delegado e sua autorização explícitos. Não existe Command genérico “execute o que a IA decidiu”.

## Exemplos e contraexemplos

| Intenção | Correto | Proibido |
| --- | --- | --- |
| Pagamento compensado deve liberar orçamento | `RecordCompensatedPayment` publica Event; Financial Platform emite `IncreaseCampaignBudget` | PaymentLedger alterar CampaignBudget na mesma transação |
| Reconciliar uma TV | `RequestStateReconciliation` produz plano e Commands ao owner | Reconciler sobrescrever CurrentState |
| Ativar emergência | Commands separados para EmergencyBroadcast, Canvas e Player | Um Command com dois Aggregate owners |
| Cancelar Campaign | `CancelCampaign → CampaignCancelled` | Publicar `CampaignCompleted` |
| Repetir saque após timeout | Reusar chave/tentativa e obter resultado original | Criar novo Withdrawal para “garantir” |
| Reverter Evidence | `ReverseEvidence → EvidenceReversed` | Editar status/hash/payload anterior |

## Commands adicionais de Campaign e realocação

| Command | Owner | Pré-condições | Resultado | Event |
| --- | --- | --- | --- | --- |
| `ReviseCampaignStrategy` | Campaign | estado editável, actor autorizado, revisão esperada | nova revisão imutável | `CampaignStrategyRevised` |
| `AddCampaignPauseCause` | Campaign | causa válida e ainda ausente | causa adicionada; Campaign pausada | `CampaignPaused` |
| `RemoveCampaignPauseCause` | Campaign | causa existente | remove somente a causa alvo | `CampaignPauseCauseRemoved`; `CampaignResumed` somente sem outras causas |
| `RequestSlotReallocation` | Campaign | falha original sem execução, reserva liberada, janela vigente | tentativa de busca criada | `SlotReallocationRequested` |

Mandato do Grão é informado no envelope e revalidado pelo Campaign owner. Ele não cria um Command privilegiado.
## Governance & Dispute Management Commands

Owner único de todos os Commands: `GovernanceCase`.

| Command | Preestado | Pós-estado/efeito | Event |
| --- | --- | --- | --- |
| `OpenGovernanceCase` | inexistente | OPEN | `GovernanceCaseOpened` |
| `AttachEvidenceReference` | qualquer não CLOSED | referência imutável anexada | `EvidenceReferenceAttached` |
| `StartInvestigation` | OPEN | INVESTIGATING | `InvestigationStarted` |
| `RequestHumanReview` | INVESTIGATING | UNDER_REVIEW | `HumanReviewRequested` |
| `ClassifyResponsibility` | INVESTIGATING/UNDER_REVIEW | proposta interna, sem autoridade pública | nenhum público |
| `PublishDecision` | INVESTIGATING/UNDER_REVIEW | DECIDED e nova revision | `ResponsibilityDecisionPublished` |
| `PublishDecision` | REEVALUATING | nova revision e DECIDED | `ResponsibilityDecisionPublished`, depois `GovernanceCaseReevaluated` |
| `AppealDecision` | DECIDED | APPEALED | `ResponsibilityDecisionAppealed` |
| `ReevaluateGovernanceCase` | APPEALED | REEVALUATING | `GovernanceCaseReevaluationStarted` |
| `CloseGovernanceCase` | DECIDED | CLOSED | `GovernanceCaseClosed` |

Todos exigem actor, autorização, expected revision, idempotency key, correlation e causation. Contrato integral: [`../governance/GOVERNANCE_COMMANDS.md`](../governance/GOVERNANCE_COMMANDS.md).

## Financial Platform — contratos consolidados

| Command | Owner único | Resultado |
| --- | --- | --- |
| `RefundAdvertiserUnusedCredit` | PaymentLedger | `AdvertiserUnusedCreditRefunded` |
| `RegisterPartnerRecoveryObligation` | PartnerLedger | `PartnerRecoveryObligationRegistered` |
| `RegisterAdvertiserRecoveryObligation` | PaymentLedger | `AdvertiserRecoveryObligationRegistered` |
| `RegisterThirdPartyRecoveryObligation` | PaymentLedger | `ThirdPartyRecoveryObligationRegistered` |
| `UpdateFinancialPolicy` | FinancialPolicy | `FinancialPolicyChanged` |
| `ReconcilePaymentOperation` | PaymentLedger | `PaymentReconciliationRequired/Completed` |
| `ReconcileWithdrawalOperation` | Withdrawal | `WithdrawalReconciliationRequired/Completed` |
| `ExecuteTaxPayment` | PaymentLedger | `TaxPaymentExecuted` |
| `HoldParticipantPayout` | PartnerLedger | `ParticipantPayoutHeld` |

Commands genéricos de recovery/reconciliação não aceitam novos dispatches. `CreditPartner`, `ConfirmPaymentCompensation`, `FinancialPolicyChanged` e `WithdrawalFailed` permanecem canônicos.
