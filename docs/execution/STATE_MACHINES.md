# State Machines — Execution Model

Este documento define os estados autoritativos e as únicas transições válidas dos principais Aggregates. Toda transição:

1. é solicitada por um Command ao owner;
2. valida ator, revisão esperada, pré-condições e políticas;
3. altera um único Aggregate;
4. publica o Event indicado;
5. preserva pré/pós-estado, correlação, causação e auditoria.

Timeout não é transição implícita, salvo quando um Command temporal do owner (`Expire*`) a materializa. Retry reutiliza a identidade idempotente. Compensação nunca reabre estado final.

## Semântica comum de concorrência e recuperação

| Situação | Regra normativa |
| --- | --- |
| Dois Commands na mesma revisão | O primeiro aceito avança a revisão; o outro é rejeitado como conflito e deve ser reavaliado. |
| Resultado do Command desconhecido | Consultar o owner pela identidade/idempotency key; não emitir nova intenção com outra chave. |
| Event duplicado | Consumidor retorna o resultado do primeiro processamento. |
| Event fora de ordem | Processar somente quando a revisão anterior exigida estiver presente; caso contrário registrar gap. |
| Transporte indisponível | Estado do produtor permanece; o mesmo Event é republicado. |
| Replay | Reidrata Aggregate/projeção sem repetir Commands ou efeitos externos. |
| Estado final | Rejeita todo Command de lifecycle, exceto criação explícita de novo Aggregate/linha compensatória. |
| Timeout quantitativo | Permanece `OPEN-031`; o owner usa política versionada, nunca número embutido por suposição. |

## Campaign

Estados:

| Estado | Significado |
| --- | --- |
| `DRAFT` | Intenção editável; ainda não elegível à publicação. |
| `READY` | Criativo e dados mínimos aprovados; aguarda publicação. |
| `PUBLISHED` | Oferta de veiculação publicada; aguarda janela/condições de ativação. |
| `ACTIVE` | Pode gerar novas intenções de Slot. |
| `PAUSED` | Nova alocação suspensa; fatos/Slots executados permanecem. |
| `CANCELLING` | Cancelamento solicitado; Slots distribuídos estão em revogação ou reconciliação. |
| `COMPLETED` | Entrega encerrada conforme critério. Final. |
| `CANCELLED` | Encerrada por cancelamento autorizado. Final. |
| `EXPIRED` | Janela terminou. Final. |

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `DRAFT` | Advertiser, `CreateCampaign` | `CampaignCreated` | Advertiser, nome, objetivo, moeda, país, responsável e data válidos | Retry por client request; conflito de identidade rejeita | Cancelar, nunca apagar |
| `DRAFT` → `READY` | Dono/workflow, `MarkCampaignReady` | `CampaignReady` | Creative aprovado e dados completos | Falha mantém DRAFT; sem timeout implícito | Corrigir dados por Commands próprios |
| `READY` → `PUBLISHED` | Dono/delegado, `PublishCampaign` | `CampaignPublished` | Política comercial válida | Retry mesma revisão; concorrência rejeita | `CancelCampaign` |
| `PUBLISHED` → `ACTIVE` | Scheduler owner, `ActivateCampaign` | `CampaignActivated` | Janela iniciada, budget/impedimentos validados | Sem condição, permanece PUBLISHED | Pausa/cancelamento/expiração |
| `ACTIVE` → `ACTIVE` | Owner consumindo primeiro `SlotAllocated`, `RecordCampaignExecutionStarted` | `CampaignExecutionStarted` | Ainda não iniciado; Slot da revisão vigente | Eventos seguintes são duplicata sem nova publicação | Apenas auditoria |
| `ACTIVE` → `PAUSED` | Dono/política, `PauseCampaign` | `CampaignPaused` | Motivo explícito | Duplicata retorna primeira pausa | Slots futuros tratados separadamente |
| `PAUSED` → `ACTIVE` | Dono/política, `ResumeCampaign` | `CampaignResumed` | Causa alvo removida; demais bloqueios ausentes | Crédito remove somente a causa financeira | Nova pausa |
| `ACTIVE/PAUSED` → `COMPLETED` | Campaign owner, `CompleteCampaign` | `CampaignCompleted` | Critério de conclusão comprovado | Resultado desconhecido é consultado; final não reabre | Ajuste posterior em Aggregates financeiros/projeções |
| qualquer não final sem Slot `DISPATCHED` → `CANCELLED` | Advertiser, `CancelCampaign` | `CampaignCancelled` | Motivo e autorização | Imediato; retries retornam resultado | Liberações por Commands próprios |
| qualquer não final com Slot `DISPATCHED` → `CANCELLING` | Advertiser, `CancelCampaign` | `CampaignCancellationRequested` | Motivo, autorização e manifest de Slots | Resultado parcial permanece explícito | Saga revoga/reconcilia |
| `CANCELLING` → `CANCELLED` | Saga, `FinalizeCampaignCancellation` | `CampaignCancelled` | Revogáveis resolvidos; irreversíveis terminais/reconciliados | Gap mantém CANCELLING | Financeiro trata saldo por Commands próprios |
| `PUBLISHED/ACTIVE/PAUSED` → `EXPIRED` | Scheduler owner, `ExpireCampaign` | `CampaignExpired` | Window end alcançado | Evento temporal atrasado preserva instante | Revogar/expirar Slots futuros |

Proibido: `DRAFT → ACTIVE`, publicar sem Creative aprovado, alocar em `PAUSED/CANCELLING`, retornar de estado final ou representar cancelamento como `CampaignCompleted`.

## Slot

Estados: `ALLOCATED`, `DISPATCHED`, `DELIVERED`, `EVIDENCED`, `REVOKED`, `EXPIRED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `ALLOCATED` | Campaign Management, `ReserveSlot` | `SlotAllocated` | Campaign elegível, quote congelado, janela/TV/Asset/budget autorizados | Dedupe por Campaign+TV+window; conflito de inventário rejeita | `RevokeSlot`/`ExpireSlot` e budget release |
| `ALLOCATED` → `REVOKED` | Campaign Management, `RevokeSlot` | `SlotRevoked` | Playback ainda não iniciado/entregue | Corrida com playback é resolvida pela revisão; loser reavalia | Budget release por Saga |
| `ALLOCATED` → `EXPIRED` | Owner, `ExpireSlot` | `SlotExpired` | Window terminou sem entrega | Evento local atrasado é validado, não confiado cegamente | Budget release por Saga |
| `ALLOCATED` → `DISPATCHED` | Owner, `RecordSlotDispatchedToEdge` | `SlotDispatchedToEdge` | Edge aceitou identidade/revisão do Slot | Timeout = UNKNOWN; reconciliar receipt | Torna cancelamento assíncrono |
| `DISPATCHED` → `DELIVERED` | Owner, `RecordSlotDelivered` | `SlotDelivered` | `PlaybackFinished` correlacionado e único | Duplicata da tentativa não avança duas vezes | Evidence pode ser rejeitada sem desfazer entrega física |
| `DELIVERED` → `EVIDENCED` | Owner, `RecordSlotEvidenced` | `SlotEvidenced` | Evidence válida correlacionada | Retry pelo EvidenceId | Reversão tardia não reabre Slot |

Finais: `EVIDENCED`, `REVOKED`, `EXPIRED`. Proibido reatribuir identidade, executar Slot revogado/expirado ou usar entrega como sinônimo de Evidence válida.

## PlaybackAttempt

Esta máquina representa uma tentativa física. A relação exata com `PlayerSession` permanece `OPEN-034`.

Estados: `QUEUED`, `PREPARING`, `PLAYING`, `FINISHED`, `INTERRUPTED`, `FAILED`, `EXPIRED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `QUEUED` | Scheduler local ao aceitar Slot | fato local de fila | Slot/revisão válidos | Fila offline preserva ordem conhecida | Revogação/expiração explícita |
| `QUEUED` → `PREPARING` | Player, `PreparePlayback` | `PlaybackPrepared` | Asset/composição/capability íntegros | Falha pode ir a FAILED | Nova tentativa identificada se permitido |
| `PREPARING` → `PLAYING` | Player, `StartPlayback` | `PlaybackStarted` | Saída pronta e janela válida | Resultado desconhecido consultado localmente | Falha/interrupção explícita |
| `PLAYING` → `FINISHED` | Player, `FinishPlayback` | `PlaybackFinished` | Fim observado; duração/checksums/versions capturados | Tolerância de 15s é `OPEN-004`; owner registra valor observado | Collector assina fato; Validator decide validade |
| `PREPARING/PLAYING` → `INTERRUPTED` | Supervisor/emergência, `InterruptPlayback` | `PlaybackInterrupted` | Causa conhecida; dados parciais preservados | Não completar por timeout | Retomada/nova tentativa conforme `OPEN-034` |
| `QUEUED/PREPARING/PLAYING/INTERRUPTED` → `FAILED` | Player Supervisor | `PlaybackFailed` | Falha classificada definitiva para tentativa | Retry não reutiliza tentativa como sucesso | Nova tentativa com causalidade |
| `QUEUED` → `EXPIRED` | Scheduler local | `SlotExpiredLocally` | Window terminou | Cloud valida ao receber | Nenhuma Evidence válida |

Finais da tentativa: `FINISHED`, `FAILED`, `EXPIRED`; `INTERRUPTED` só é recuperável conforme política. Proibido somar trechos de tentativas distintas para fabricar 15 segundos.

## PlayerSession

Estados: `IDLE`, `PREPARING`, `PLAYING`, `DEGRADED`, `PREEMPTED`, `COMPLETED`, `FAILED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| `IDLE` → `PREPARING` | Player, `PreparePlayback` | `PlaybackPrepared` | Slot/tentativa/composição válidos | Falha de preparação vai a FAILED ou volta por nova sessão conforme política | Supervisor registra diagnóstico |
| `PREPARING` → `PLAYING` | Player, `StartPlayback` | `PlaybackStarted` | Recursos/saída prontos | Watchdog não declara PLAYING sem confirmação | Reinício identificado |
| `PLAYING` → `DEGRADED` | Player Supervisor | fato de degradação catalogado | Frames/buffer/saúde fora da política | Retry local limitado qualitativamente | Volta a PLAYING ou FAILED |
| `DEGRADED` → `PLAYING` | Supervisor | `PlaybackRecovered` | Health observado | Sem loop infinito | Preserva janela degradada |
| `PLAYING/PREPARING` → `PREEMPTED` | Saga de emergência, `PreemptPlayerSession` | `EmergencyBroadcastStarted`, `PlaybackInterrupted` | Emergência ativa/prioritária | Confirmação por TV; ausência = UNKNOWN | `RestorePlayerSession` |
| `PREEMPTED` → `PLAYING/COMPLETED/FAILED` | Saga, `RestorePlayerSession` | `EmergencyBroadcastEnded` e resultado | Clear confirmado; composição compatível | Retomada/tentativa exata `OPEN-034` | Nunca oculta interrupção |
| `PLAYING` → `COMPLETED` | Player, `FinishPlayback` | `PlaybackFinished` | Tentativa concluída | Duração real registrada | — |
| qualquer não final → `FAILED` | Supervisor | `PlaybackFailed` | Falha definitiva | Nova sessão/tentativa, não reabertura | Diagnóstico append-only |

Finais: `COMPLETED`, `FAILED`. Proibido aplicar composição de emergência sem prioridade/autorização ou declarar sucesso apenas porque o processo está vivo.

## EvidenceRecord — validade

O lifecycle de validade é separado do `QuantumAnchor`; uma projeção pode exibir ambos, mas não cria owner combinado (`OPEN-028`).

Estados: `BUILDING`, `PENDING_VALIDATION`, `VALID`, `INVALID`, `DISPUTED`, `REVERSED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `BUILDING` → `PENDING_VALIDATION` | Evidence Builder, `BuildEvidence` | `EvidenceGenerated` | PlaybackEvent deduplicado; fontes correlacionáveis; schema/version | Dependência ausente mantém build pendente/diagnosticado; não cria VALID parcial | Reprocessar mesma origem idempotentemente |
| `PENDING_VALIDATION` → `VALID` | Evidence Validator, `ValidateEvidence` | `EvidenceValidated` | Assinatura, Slot, janela, duração, checksums, versions, quote e unicidade válidos | Gaps relevantes bloqueiam; retry mesma policy version | Preparar pacote/anchor |
| `PENDING_VALIDATION` → `INVALID` | Validator, `ValidateEvidence` | `EvidenceRejected` | Falha determinística de regra | Final para aquela origem/revisão | Nova execução física gera nova tentativa, não edita Evidence |
| `PENDING_VALIDATION/VALID` → `DISPUTED` | Parte/monitor autorizado, `OpenEvidenceDispute` | `EvidenceDisputed` | Motivo material e identidade | Timeout não resolve disputa | `ResolveEvidenceDispute` |
| `DISPUTED` → `VALID` | Analista, `ResolveEvidenceDispute` | `EvidenceDisputeResolved` | Contestação improcedente; revisão/policy registradas | Retry idempotente pela decisão | Retoma elegibilidade somente com anchor válido |
| `VALID/DISPUTED` → `REVERSED` | Analista segregado, `ReverseEvidence` ou resolução | `EvidenceReversed` | Causa comprovada | Reversão tardia coordena compensação; não reabre ciclos | Novos fatos financeiros compensatórios |

Finais: `INVALID`, `REVERSED`. `VALID` não é final porque pode ser disputado/revertido, mas seu payload nunca é mutado. Proibido validar no Edge, trocar hash/payload ou pular `PENDING_VALIDATION`.

## QuantumAnchor

Estados: `REQUESTED`, `CONFIRMED`, `FAILED`, `UNKNOWN`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `REQUESTED` | Quantum Integration, `AnchorEvidence` | `AnchoringRequested` | Evidence VALID e hash permitido | Indisponibilidade antes do aceite mantém tentativa pendente | Retry mesma chave/hash |
| `REQUESTED/UNKNOWN` → `CONFIRMED` | Quantum Integration, `RecordAnchoringResult` | `AnchoringConfirmed` | Recibo verificável para o mesmo hash | Callback duplicado é idempotente | Final; nunca troca hash |
| `REQUESTED` → `FAILED` | Quantum Integration, `RecordAnchoringResult` | `AnchoringFailed` | Falha definitiva classificada | Recuperável agenda nova tentativa; quantitativo `OPEN-031` | Nova tentativa ligada |
| `REQUESTED` → `UNKNOWN` | Reconciliação após timeout | fato operacional de resultado desconhecido | Não foi possível provar sucesso/falha | Consulta/reconcilia; não autoriza Settlement | Pode ir a CONFIRMED/FAILED |

`CONFIRMED` é final para o hash. Falha de anchor não muda validade da Evidence; apenas sua elegibilidade financeira combinada.

## Settlement

Estados: `OPEN`, `CALCULATING`, `BLOCKED`, `AUTHORIZED`, `CLOSED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `OPEN` | Scheduler, `OpenSettlementCycle` | `SettlementCycleOpened` | Ciclo/período inéditos; policies disponíveis | Duplicata retorna ciclo original | — |
| `OPEN/BLOCKED` → `CALCULATING` | Settlement, `CalculateSettlement` | `SplitCalculated` ou `SettlementBlocked` | Evidences VALID/não revertidas/anchored; dados completos | Dependência/gap bloqueia somente escopo afetado | Reprocessar mesmos inputs |
| `CALCULATING` → `BLOCKED` | Settlement | `SettlementBlocked` | Inconsistência ou dependência material | Aguarda fato/Command de desbloqueio; sem timeout implícito | Novo cálculo revisionado |
| `CALCULATING` → `AUTHORIZED` | Autoridade do owner, `AuthorizeSettlement` | `SettlementAuthorized` | Cálculo reconciliado e hash congelado | Conflito de revisão rejeita | — |
| `AUTHORIZED` → `CLOSED` | Settlement, `PublishSettlementRights` | `SettlementExecuted`, `PartnerCreditRequested` | Rights manifest ainda não publicado | Falha parcial mantém identidade por share e retry; não duplica direito | Financial Platform pode creditar depois |

`CLOSED` é final e imutável. Não existe `CLOSED → COMPENSATING`; compensação cria novo Aggregate/linha e referencia o ciclo fechado. Proibido fechar com Evidence inelegível ou tratar `SettlementExecuted` como pagamento.

## SplitShare

Estados: `PENDING`, `READY`, `BLOCKED`, `UNCLAIMED`, `CREDITED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `PENDING` | Settlement calculation | `SplitCalculated` | Uma das cinco linhas canônicas; valor e papel preservados | Duplicata pelo direito não cria linha | — |
| `PENDING` → `READY` | Settlement, `MarkSplitShareReady` | `SplitShareReady` | Beneficiário elegível e cálculo autorizado | Falha de outra share não afeta | Publicar direito |
| `PENDING/READY` → `BLOCKED` | Settlement, `BlockSplitShare` | `SplitShareBlocked` | Causa individual | Sem desbloqueio automático | Nova decisão pode retornar a PENDING/READY |
| `BLOCKED` → `PENDING/READY` | Settlement, `UnblockSplitShare` | `SplitShareUnblocked` | Causa removida e elegibilidade reavaliada | Retry pela decisão; sem auto-unblock | — |
| `PENDING/READY` → `UNCLAIMED` | Settlement, `MarkSplitShareUnclaimed` | `SplitShareUnclaimed` | Beneficiário ausente/inelegível | Destino futuro permanece política aberta | Nunca redistribuir |
| `READY` → `CREDITED` | Settlement, `MarkSplitShareCredited`, causado por `PartnerCredited` | `SplitShareCredited` | Direito único materializado no PartnerLedger | Event duplicado não duplica crédito | Chargeback é ledger compensatório |

`CREDITED` é final no lifecycle da share e não significa `PAID`. `UNCLAIMED` não é redistribuível; sua eventual recuperação/destinação exige política aceita.

## TV

A ordem entre Installation e Provisioning é `OPEN-011`; portanto esses lifecycles ficam em Aggregates próprios e são gates, não uma sequência inventada dentro da TV.

Estados autoritativos da TV: `REGISTERED`, `ACTIVE`, `SUSPENDED`, `MAINTENANCE`, `DECOMMISSIONED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `REGISTERED` | Operador, `RegisterTV` | `TvRegistered` | TV identity inédita; owner/Venue refs válidos | Duplicata por identidade retorna original | Nunca reutiliza identidade |
| `REGISTERED/SUSPENDED` → `ACTIVE` | TV Network, `ActivateTV` | `TvActivated` | Installation aceita, provisioning/Edge, Capability e Health gates satisfeitos | Gate ausente rejeita; nenhum auto-timeout | Corrigir gate e reenviar Command |
| `ACTIVE/MAINTENANCE` → `SUSPENDED` | Operador/política, `SuspendTV` | `TvSuspended` | Motivo explícito | Falha de transporte não desfaz suspensão aceita | Reativar quando causa resolvida |
| `ACTIVE/SUSPENDED` → `MAINTENANCE` | TV Network, `EnterTVMaintenance` | `TvMaintenanceStarted` | MaintenanceWindow aberta e autorizada | Retry por TV+window | `ExitTVMaintenance` |
| `MAINTENANCE` → `ACTIVE/SUSPENDED` | TV Network, `ExitTVMaintenance` | `TvMaintenanceEnded` | Ações/janela concluídas; health reavaliado | Não presume ACTIVE | Pós-estado explícito |
| qualquer não final → `DECOMMISSIONED` | Operador segregado, `DecommissionTV` | `TvDecommissioned` | Decisão/cadeia de custódia e impactos tratados | Final; retries idempotentes | Novo equipamento recebe identidade própria |

Proibido ativar por heartbeat isolado, transformar `UNKNOWN` em `HEALTHY`, reutilizar TVIdentifier ou fazer TV conhecer Campaign/Finance/Evidence.

## EdgeInstallation

Estados: `UNINSTALLED`, `INSTALLING`, `HEALTHY`, `DEGRADED`, `UPDATING`, `ROLLING_BACK`, `FAILED`, `RETIRED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| `UNINSTALLED/FAILED` → `INSTALLING` | Provisioning, `ProvisionEdge` | `EdgeProvisioningStarted` | TV/Device refs e gates conhecidos | Timeout = UNKNOWN operacional, não HEALTHY | Retry limitado, mesma revision/package |
| `INSTALLING` → `HEALTHY/DEGRADED/FAILED` | TV Network, `RecordEdgeOperationalStatus` | `EdgeHealthy/EdgeDegraded/EdgeFailed` | Identidade, versões e checks válidos | Ausência de heartbeat = UNKNOWN/gap | Diagnóstico/reprovision |
| `HEALTHY` → `DEGRADED` | TV Network, `RecordEdgeOperationalStatus` | `EdgeDegraded` | Observações explicáveis | Não sobrescreve observações | Auto recovery limitado |
| `DEGRADED` → `HEALTHY` | TV Network, `RecordEdgeOperationalStatus` | `EdgeHealthy` | Nova observação suficiente | Sem limiar inventado (`OPEN-007`) | — |
| `HEALTHY/DEGRADED` → `UPDATING` | Update Management, `ApplyUpdate` | `UpdateApplyStarted` | Pacote, window, policy, wave e signature | Resultado desconhecido reconcilia | `RecordUpdateResult`/rollback |
| `UPDATING` → `HEALTHY/DEGRADED` | Edge/Supervisor, `RecordUpdateResult`, seguido de health status | `UpdateApplied`, depois `EdgeHealthy/EdgeDegraded` | Versão confirmada e health observado | Não declarar sucesso só por retorno do processo | — |
| `UPDATING` → `ROLLING_BACK` | Policy, `RollbackUpdate` após `UpdateFailed` | `UpdateRollbackStarted` | Falha/health gate | Retry não repete aplicação sem diagnóstico | Restaurar versão saudável |
| `ROLLING_BACK` → `HEALTHY/DEGRADED/FAILED` | Edge/Supervisor, `RecordRollbackResult` | `UpdateRolledBack` ou `RollbackFailed`, seguido do status | Resultado observado | Histórico preservado | Reprovision/suspensão |
| qualquer não final → `RETIRED` | TV Network | evento de retirada a sincronizar | Substituição/descomissionamento | Final | Novo EdgeInstallation |

Proibido update sem política/janela/assinatura, rollback por sobrescrita histórica ou loop ilimitado.

## InsuranceClaim

Estados: `FILED`, `UNDER_REVIEW`, `APPROVED`, `DENIED`, `WITHDRAWN`, `REPAIR_AUTHORIZED`, `REPLACEMENT_AUTHORIZED`, `SETTLED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `FILED` | Segurado, `FileInsuranceClaim` | `InsuranceClaimFiled` | Policy/ocorrência/identidade presentes | Duplicata retorna claim original | Retirar ou avaliar |
| `FILED` → `UNDER_REVIEW` | Insurance, `StartClaimAssessment` | `InsuranceClaimAssessmentStarted` | Assessor autorizado | SLA quantitativo `OPEN-005`; atraso não aprova/nega | Pedir complemento |
| `UNDER_REVIEW` → `UNDER_REVIEW` | Analista, `RequestClaimInformation` | `InsuranceClaimInformationRequested` | Lacuna explícita | Retry da solicitação é idempotente | Complemento é novo fato |
| `UNDER_REVIEW` → `APPROVED/DENIED` | Analista segregado, `DecideInsuranceClaim` | `InsuranceClaimApproved/Denied` | Cobertura, vigência, carência, adimplência, exclusões avaliadas | Resultado desconhecido consulta owner | Reserva só após APPROVED |
| `APPROVED` → `REPAIR_AUTHORIZED` | Saga após Reserve, `AuthorizeRepair` no InsuranceRepair | `InsuranceRepairAuthorized` | Reserva committed, orçamento elegível | Falha não muda claim para SETTLED | Novo repair Aggregate |
| `APPROVED` → `REPLACEMENT_AUTHORIZED` | Saga após Reserve, `AuthorizeReplacement` | `InsuranceReplacementAuthorized` | Reserva e equipment decision | Falha operacional preserva autorização | Novo replacement Aggregate |
| autorizado → `SETTLED` | Insurance, `MarkInsuranceClaimSettled`, causado por `InsuranceSettlementExecuted` | `InsuranceClaimSettled` | Obrigação/receipts reconciliados | Resultado financeiro unknown não fecha | Compensação no Insurance Ledger |
| `FILED/UNDER_REVIEW` → `WITHDRAWN` | Segurado/Insurance | evento explícito a sincronizar (`OPEN-033`) | Política permite e não há decisão final | Libera reserva se existir por Command separado | Final |

Finais: `DENIED`, `WITHDRAWN`, `SETTLED`. Proibido liquidar sem decisão e reserva, presumir cobertura enquanto em análise ou alterar uma decisão final.

## Withdrawal

Estados: `REQUESTED`, `APPROVED`, `BATCHED`, `EXECUTING`, `EXECUTED`, `REJECTED`, `FAILED`.

| De → Para | Ator e Command | Event | Gates/pré-condições | Timeout, retry e falha | Compensação/recuperação |
| --- | --- | --- | --- | --- | --- |
| inexistente → `REQUESTED` | Parceiro, `RequestWithdrawal` | `WithdrawalRequested` | Política e saldo autoritativo elegíveis | Duplicata retorna Withdrawal original | Rejeitar/aprovar |
| `REQUESTED` → `APPROVED/REJECTED` | Financial, `ApproveWithdrawal` | `WithdrawalApproved/Rejected` | Política, autoridade e saldo revalidados | Janela/taxa `OPEN-022/023/035` | Rejeição não edita ledger |
| `APPROVED` → `BATCHED` | Financial, `AddWithdrawalToBatch` | `WithdrawalBatched` | Batch elegível | Lifecycle batch `OPEN-024` | Novo batch somente por política |
| `BATCHED` → `EXECUTING` | Financial, `ExecuteWithdrawal` | `WithdrawalExecutionRequested` | Instrução idempotente e autorização válidas | Timeout = UNKNOWN até reconciliação | Não emitir nova transferência por palpite |
| `EXECUTING` → `EXECUTED/FAILED` | Financial, `RecordWithdrawalResult` | `WithdrawalExecuted/Failed` | Resultado autenticado | Callback duplicado idempotente | Retry só se falha recuperável |
| `FAILED` → `EXECUTING` | Financial, `RetryWithdrawal` | `WithdrawalRetryScheduled`, `WithdrawalExecutionRequested` | Política permite; resultado anterior definitivamente falhou | Efeito sobre taxa/janela `OPEN-022/023` | Nova tentativa ligada |

`EXECUTED` e `REJECTED` são finais. A finalidade de `FAILED` depende da política de retry. WithdrawalBatch permanece `OPEN-024`.

## Contraexemplos proibidos

- `Campaign CANCELLED → ACTIVE`.
- `Slot REVOKED → DELIVERED`.
- `Evidence INVALID → VALID` por edição manual.
- `QuantumAnchor FAILED → CONFIRMED` sem nova tentativa/reconciliação identificada.
- `Settlement CLOSED → COMPENSATING`.
- `SplitShare CREDITED → PAID` dentro do Settlement.
- `TV DECOMMISSIONED → ACTIVE`.
- `Edge UPDATING → HEALTHY` apenas porque o processo reiniciou.
- `InsuranceClaim DENIED → APPROVED` na mesma Claim.
- `Withdrawal timeout → EXECUTED` por suposição.
## GovernanceCase

```text
OPEN
→ INVESTIGATING
→ UNDER_REVIEW
→ DECIDED
→ APPEALED
→ REEVALUATING
→ DECIDED
→ CLOSED
```

| Transição | Command | Event | Timeout/retry | Compensação |
| --- | --- | --- | --- | --- |
| inexistente → OPEN | OpenGovernanceCase | GovernanceCaseOpened | abertura deduplicada | fechar preservando histórico |
| OPEN → INVESTIGATING | StartInvestigation | InvestigationStarted | atraso não decide | nova investigação correlacionada |
| INVESTIGATING → UNDER_REVIEW | RequestHumanReview | HumanReviewRequested | timeout escala fila | não aplicável |
| INVESTIGATING/UNDER_REVIEW → DECIDED | PublishDecision | ResponsibilityDecisionPublished | optimistic lock; retry idêntico | nova revision após Appeal |
| DECIDED → APPEALED | AppealDecision | ResponsibilityDecisionAppealed | prazo por policy | decisão permanece |
| APPEALED → REEVALUATING | ReevaluateGovernanceCase | GovernanceCaseReevaluationStarted | uma ativa por Appeal | nova tentativa auditada |
| REEVALUATING → DECIDED | PublishDecision | ResponsibilityDecisionPublished; GovernanceCaseReevaluated | revision monotônica; ordem fixa | efeitos append-only |
| DECIDED → CLOSED | CloseGovernanceCase | GovernanceCaseClosed | nunca fechar por timeout | terminal |

`UNKNOWN` não existe no modelo de Governance. Incerteza mantém INVESTIGATING ou UNDER_REVIEW sem publicação. Especificação integral: [`../governance/GOVERNANCE_STATE_MACHINE.md`](../governance/GOVERNANCE_STATE_MACHINE.md).
