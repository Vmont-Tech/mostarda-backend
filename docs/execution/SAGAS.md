# Sagas — Workflows Distribuídos

Saga é um coordenador durável de progresso entre owners. Ela observa Events, emite Commands e registra seu próprio estado de coordenação. Não lê estado privado, não modifica Aggregate diretamente e não decide regra de domínio.

## Contrato normativo de toda Saga

Cada instância DEVE registrar:

| Elemento | Regra |
| --- | --- |
| Identidade e tipo/version | Uma identidade por workflow lógico; revisão de definição explícita. |
| `correlationId` | Único por instância e propagado a Commands/Events. |
| Estado/step atual | Progresso observado, pendências, bloqueios e resultado conhecido/desconhecido. |
| Participantes | Contextos/Aggregates permitidos e Commands que pode emitir. |
| Causação | Event que liberou cada passo e Command emitido em resposta. |
| Idempotência | Chave determinística por `sagaId + step + target`; retry não cria nova intenção lógica. |
| Deadline qualitativo | Prazo governado por política; valores permanecem `OPEN-031`. |
| Tentativas | Identidade, classificação da falha, próximo passo e resultado externo. |
| Compensações | Commands compensatórios explícitos, nunca rollback técnico global. |
| Auditoria | Ator inicial, decisões dos owners, policies, pré/pós-estados conhecidos e término. |

Regras comuns:

1. A Saga só avança após Event de sucesso do owner. “Command entregue” não é sucesso.
2. Timeout coloca o passo em `AWAITING_RECONCILIATION`, `TIMED_OUT` ou equivalente de coordenação; não fabrica Event de domínio.
3. Resultado externo desconhecido é reconciliado antes de retry com efeito externo.
4. Event duplicado retorna o resultado do passo já processado.
5. Event fora de ordem é armazenado como pendente se sua causação ainda não foi observada; lacuna de revisão bloqueia o passo dependente.
6. Transporte indisponível conserva a intenção e a mesma chave idempotente até republicação.
7. Replay reconstitui o estado da Saga, mas não reemite Command cujo resultado já está confirmado.
8. Reprocessamento administrativo cria nova tentativa ligada à anterior, com motivo e autorização.
9. Concorrência entre Sagas no mesmo Aggregate é resolvida pelo owner/revisão; a Saga derrotada reavalia ou compensa.
10. `COMPLETED`, `COMPENSATED`, `CANCELLED` e `FAILED_FINAL` são finais da coordenação; não são estados dos Aggregates participantes.

## 1. Funding e ativação de Campaign

**Objetivo:** transformar pagamento compensado em Campaign com budget disponível e elegível à ativação, sem confundir entrada financeira com direito de parceiro.

**Correlação:** Advertiser + contrato/Campaign + payment intent.  
**Participantes:** Campaign Management, Financial Platform/PaymentLedger, CampaignBudget e provider via adapter.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Solicitação comercial autorizada | `CreateCampaign → Campaign` | `CampaignCreated` | Duplicata retorna Campaign; contrato conflitante rejeita |
| 2 | Creative/segmentação completos | Commands de Creative e `MarkCampaignReady` | `CreativeAssetApproved`, `CampaignReady` | Veredito negativo mantém DRAFT |
| 3 | Campaign pronta | `PublishCampaign → Campaign` | `CampaignPublished` | Conflito de revisão exige reavaliação |
| 4 | Provider confirma compensação | `RecordCompensatedPayment → PaymentLedger` | `PaymentCompensated` | Callback duplicado gera uma entrada; unknown reconcilia |
| 5 | Entrada compensada elegível | `IncreaseCampaignBudget → CampaignBudget` | `CampaignBudgetIncreased` | Outro budget/contrato não é escolhido por suposição (`OPEN-025`) |
| 6 | Janela e condições satisfeitas | `ActivateCampaign → Campaign` | `CampaignActivated` | Budget insuficiente mantém PUBLISHED/PAUSED |

**Timeout/retry:** espera por compensação não tem sucesso presumido; payment pendente/falho não aumenta budget. Cada Command usa chave do passo.  
**Compensação:** cancelamento antes da entrega encerra Campaign e trata refund por Financial Platform (`OPEN-016`); nunca remove PaymentLedger.  
**Replay/rebuild:** reconstitui CampaignBudget pelo ledger sem reaplicar provider callback.  
**Resultado:** Campaign ativa somente quando Campaign owner aceita; pagamento por si não ativa.

## 2. Compra/alocação de Campaign

**Objetivo:** converter Campaign ativa e budget autorizado em Slots com quote congelado.

**Correlação:** Campaign + intenção de entrega.  
**Participantes:** Campaign, PricingPolicy, CampaignBudget, Slot, projeção operacional de inventário e Edge Runtime. TV Network não participa com conhecimento de Campaign.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | `CampaignActivated` e intenção de entrega | `QuotePrice → PricingPolicy` | `PriceQuoted` | Input ausente/rejeitado mantém intenção sem Slot |
| 2 | Quote autorizado/não expirado | `ApplyPriceQuote → PricingPolicy` | `PriceApplied` | Override concorrente é resolvido por revisão |
| 3 | AvailableBudget suficiente | `ReserveCampaignBudget → CampaignBudget` quando política exigir | `CampaignBudgetReserved` | Instante exato é `OPEN-013`; nunca reserva saldo negativo |
| 4 | TV operacional elegível em read model, janela livre, quote aplicado | `ReserveSlot → Slot` | `SlotAllocated` | Corrida de inventário: somente um Command vence |
| 5 | `SlotAllocated` | Entrega declarativa à fila Edge | confirmação/fatos locais de fila | Falha de entrega mantém Slot até retry/revogação/expiração |

**Timeout/retry:** quote/Slot respeitam validade qualitativa; números `OPEN-031`. Reenvio de Slot usa a mesma identidade/revisão.  
**Compensação:** falha após reserva de budget emite `RevokeSlot/ExpireSlot` e depois `ReleaseCampaignBudget`; a Saga não move saldo.  
**Ordering/gaps:** `PriceApplied` deve preceder `SlotAllocated` na causação, mas Events de streams distintos podem chegar fora de ordem; consumidor aguarda dependência.  
**Resultado:** Slot `ALLOCATED`, nunca playback ou Evidence presumidos.

## 3. Provisionamento de TV

**Objetivo:** tornar uma TV operacionalmente `ACTIVE` com identidade permanente, Device vinculado, Installation aceita, Edge provisionado, Capability ativa e health aceitável.

**Correlação:** onboarding/installation id + TVIdentifier.  
**Participantes:** TV, DeviceRegistry, Installation, EdgeInstallation, Security/identity, TVCapability e HealthRecord.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Solicitação autorizada | `RegisterTV → TV` | `TvRegistered` | TV identity nunca é reciclada |
| 2 | Hardware identificado | `RegisterDevice → DeviceRegistry` | `DeviceRegistered` | Serial/identity divergente é conflito |
| 3 | TV/Device compatíveis | `BindDeviceToTV → DeviceRegistry` | `DeviceBoundToTV` | Vínculo concorrente rejeitado; histórico preservado |
| 4A | Trabalho físico realizado | `VerifyInstallation`, depois `AcceptInstallation → Installation` | `InstallationVerified/Accepted` | Falha cria tentativa/revisão nova |
| 4B | Gates permitidos | `ProvisionEdge`, `RegisterEdgeIdentity → EdgeInstallation` | `EdgeProvisioningStarted`, `EdgeIdentityRegistered` | Relação identity/key é `OPEN-012` |
| 5 | Manifesto/health disponíveis | `DeclareCapability`, `ActivateCapability → TVCapability` | `CapabilityDeclared/Activated` | Capability independe de Facets |
| 6 | Heartbeat/observações autênticos | `RecordHeartbeat/HealthObservation` | `HeartbeatReceived`, `HealthObserved` | Ausência = UNKNOWN, não HEALTHY |
| 7 | Todos os gates confirmados | `ActivateTV → TV` | `TvActivated` | Owner revalida cada gate |

Passos 4A e 4B não têm ordem normativa fixa enquanto `OPEN-011` estiver aberto; podem progredir conforme políticas independentes, mas ambos devem terminar antes do passo 7.

**Timeout/retry:** instalação/provisioning/heartbeat usam deadline de política, sem números presumidos. Resultado do Edge desconhecido exige reconciliação.  
**Compensação:** revogar/rotacionar credencial, suspender onboarding e desvincular Device por Commands próprios quando permitido; TVIdentifier permanece.  
**Replay:** reconstrói gates pelos Events sem reprovisionar Device.  
**Resultado:** `TvActivated`; falha parcial deixa estados reais dos Aggregates, nunca “rollback global”.

## 4. Exibição

**Objetivo:** executar um Slot no Edge e produzir um `PlaybackEvent` assinado, sem criar Evidence.

**Correlação:** SlotId + PlaybackAttemptId; relação com PlayerSession `OPEN-034`.  
**Participantes:** fila local/Scheduler, PlayerSession, CanvasComposition, PlaybackAttempt/Collector e Campaign Management como consumidor posterior.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | `SlotAllocated` recebido e revisão vigente | Aceite/agendamento local | fato local de fila | Duplicata atualiza uma entrada lógica |
| 1A | Edge aceita Slot/revisão na fila | `RecordSlotDispatchedToEdge → Slot` | `SlotDispatchedToEdge` | Receipt perdido permanece UNKNOWN e é reconciliado |
| 2 | Janela, Asset, composição e capability válidos | `PreparePlayback → PlayerSession` | `PlaybackPrepared` | Revogação concorrente é validada antes do start |
| 3 | Saída pronta | `StartPlayback → PlayerSession` | `PlaybackStarted` | Timeout do processo não significa start |
| 4 | Execução termina/interrompe/falha | `FinishPlayback` ou `InterruptPlayback` | `PlaybackFinished/Interrupted/Failed` | Uma tentativa possui um resultado terminal |
| 5 | Resultado local congelado | `SignPlaybackEvent → PlaybackAttempt` | `PlaybackEventSigned` | Chave privada não sai do Edge |
| 6 | Transporte disponível/indisponível | `SubmitPlaybackEvent` ou `QueuePlaybackEvent` | `PlaybackEventSubmitted/Queued` | Timeout de submissão preserva o mesmo Event |
| 7 | Cloud observa `PlaybackFinished` válido para Slot | `RecordSlotDelivered → Slot` | `SlotDelivered` | Não torna Slot EVIDENCED |

**Timeout/retry:** tolerância de 15s é `OPEN-004`; janela/TTL quantitativos `OPEN-031`. Recuperação não soma trechos de tentativas.  
**Compensação:** falha física publica fatos; não cobra, não cria Evidence válida e pode criar nova tentativa se janela/política permitirem.  
**Ordering/gaps:** sequência local acompanha evento offline; gap bloqueia validação dependente.  
**Resultado:** PlaybackEvent assinado/submetido ou fato explícito de falha.

## 5. Construção, validação e ancoragem de Evidence

**Objetivo:** transformar fato assinado em `EvidenceRecord VALID` e anchor confirmado, com owners separados.

**Correlação:** PlaybackEventId → EvidenceId → EvidenceHash.  
**Participantes:** Evidence Builder, EvidenceRecord/Validator, Canonical Package builder e QuantumAnchor.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | `PlaybackEventSubmitted` deduplicado | `BuildEvidence → EvidenceRecord` | `EvidenceGenerated` em PENDING | Dependência ausente mantém pendência/diagnóstico |
| 2 | Evidence PENDING e inputs disponíveis | `ValidateEvidence → EvidenceRecord` | `EvidenceValidated/Rejected/Disputed` | Duplicidade de Slot segue decisão determinística |
| 3 | `EvidenceValidated` | `PrepareCanonicalEvidencePackage → EvidenceRecord` | `EvidenceHashed` | Mesmo conteúdo/version produz mesmo hash |
| 4 | Hash permitido | `AnchorEvidence → QuantumAnchor` | `AnchoringRequested` | Quantum não recebe PlaybackEvent/dados proibidos |
| 5 | Resultado externo | Reconciliação no owner | `AnchoringConfirmed/Failed` | Timeout = UNKNOWN até consulta |

**Timeout/retry:** validação e anchor têm políticas qualitativas; retry por PlaybackEventId/EvidenceHash.  
**Compensação:** Evidence rejeitada permanece; disputa/reversão usa Commands/Events próprios. Falha de anchor não invalida Evidence, apenas bloqueia elegibilidade.  
**Replay:** reconstruir Evidence/projeções não reenvia anchor confirmado; ledger de tentativas deduplica.  
**Resultado:** combinação projetada `Evidence VALID + Anchor CONFIRMED`, sem Aggregate híbrido (`OPEN-028`).

## 6. Liquidação e crédito de parceiro

**Objetivo:** converter Evidences elegíveis em cinco direitos e materializar cada direito no Partner Ledger.

**Correlação:** SettlementCycle + EvidenceId + SplitPolicyVersion; crédito por SplitShareId.  
**Participantes:** Evidence eligibility projection, Settlement/SplitShare e Financial Platform/PartnerLedger.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Janela do ciclo | `OpenSettlementCycle → Settlement` | `SettlementCycleOpened` | Ciclo duplicado retorna original |
| 2 | Evidences VALID, não revertidas e anchored | `CalculateSettlement → Settlement` | `SplitCalculated` ou `SettlementBlocked` | Gap/reversão concorrente bloqueia escopo afetado |
| 3 | Cálculo reconciliado | `AuthorizeSettlement → Settlement` | `SettlementAuthorized` | Revisão mudou: rejeitar e recalcular |
| 4 | Manifest de direitos congelado | `PublishSettlementRights → Settlement` | `SettlementExecuted`, `PartnerCreditRequested` | Falha parcial por share; retries individuais |
| 5 | Cada direito elegível recebido | `CreditPartner → PartnerLedger` | `PartnerCredited` | Dedupe por SplitShareId |

**Timeout/retry:** nenhum atraso de uma share bloqueia outra. Resultado de crédito desconhecido consulta o Ledger antes de retry.  
**Compensação:** chargeback/Evidence reversed após fechamento cria `CreateCompensatingLedgerEntry`; Settlement `CLOSED` nunca reabre.  
**Replay:** replay de `PartnerCreditRequested` não duplica entry; rebuild de Wallet não movimenta dinheiro.  
**Resultado:** SplitShare `CREDITED` significa direito no Ledger, não transferência.

## 7. Saque de parceiro

**Objetivo:** aplicar WithdrawalPolicy e instruir uma única transferência reconciliada.

**Correlação:** WithdrawalId + execution attempt; instrução externa idempotente.  
**Participantes:** PartnerLedger/autoridade financeira, Withdrawal, WithdrawalBatch e Asaas adapter.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Parceiro solicita | `RequestWithdrawal → Withdrawal` | `WithdrawalRequested` | Requests concorrentes disputam saldo no owner |
| 2 | Política/saldo revalidados | `ApproveWithdrawal → Withdrawal` | `WithdrawalApproved/Rejected` | Wallet defasada não autoriza (`OPEN-035`) |
| 3 | Approved e batch elegível | `AddWithdrawalToBatch → Withdrawal` | `WithdrawalBatched` | Lifecycle batch `OPEN-024` |
| 4 | Batch/instrução autorizados | `ExecuteWithdrawal → Withdrawal` | `WithdrawalExecutionRequested` | Entrega ao adapter não significa execução |
| 5 | Resultado autenticado/reconciliado | `RecordWithdrawalResult` | `WithdrawalExecuted/Failed` | Callback duplicado deduplica; timeout = UNKNOWN |
| 6 | Falha definitiva recuperável | `RetryWithdrawal` | `WithdrawalRetryScheduled`, nova request | Nunca retry enquanto resultado anterior for desconhecido |

**Timeout/retry:** frequência de 30 dias e taxa R$2 são vigentes; marco, reserva, taxa em falha e retries são `OPEN-022/023`.  
**Compensação:** ledger registra reserva/liberação/débito por fatos novos; Settlement/SplitShare não mudam.  
**Replay:** não chama Asaas; consulta ledger de entrega/receipt.  
**Resultado:** `EXECUTED` somente com comprovante reconciliado.

## 8. Seguro

**Objetivo:** decidir Claim e cumprir reparo/reposição por Insurance, sem usar Settlement de mídia.

**Correlação:** ClaimId; obrigações por Reserve/Repair/Replacement/InsuranceSettlement IDs.  
**Participantes:** InsuranceClaim, Coverage/Policy, InsuranceReserve/Fund, InsuranceRepair/Replacement, InsuranceSettlement e TV Network apenas para fatos operacionais permitidos.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Ocorrência declarada | `FileInsuranceClaim → InsuranceClaim` | `InsuranceClaimFiled` | Duplicata retorna Claim |
| 2 | Claim filed | `StartClaimAssessment` | `InsuranceClaimAssessmentStarted` | SLA numérico `OPEN-005`; atraso não presume decisão |
| 3 | Lacuna/decisão | `RequestClaimInformation` ou `DecideInsuranceClaim` | request, `Approved/Denied` | Analista revalida policy/cobertura |
| 4 | Claim aprovado | `CreateInsuranceReserve → InsuranceReserve` | `InsuranceReserveCreated` | Fonte do fundo `OPEN-009`; sem dupla reserva |
| 5A | Reparo adequado | `AuthorizeRepair → InsuranceRepair` | `InsuranceRepairAuthorized` | Falha de fornecedor não muda Claim |
| 5B | Troca adequada | `AuthorizeReplacement → InsuranceReplacement` | `InsuranceReplacementAuthorized` | Device novo tem identidade própria |
| 6 | Obrigação aceita/concluída | `SettleInsuranceObligation` | `InsuranceSettlementExecuted` | Resultado financeiro unknown reconcilia |
| 7 | Residual/cancelamento | `ReleaseInsuranceReserve` | `InsuranceReserveReleased` | Append-only |

**Compensação:** negar/retirar libera reserva por Command; pagamento incorreto gera entry compensatória no Insurance Ledger.  
**Ordering/gaps:** TV/health facts são referências; Insurance não lê base alheia.  
**Replay:** não repete payout/reparo/reposição.  
**Resultado:** Claim `SETTLED` somente após obrigação reconciliada.

## 9. Atualização remota

**Objetivo:** atualizar componentes em ondas com política, MaintenanceWindow, health gate e rollback.

**Correlação:** UpdateRolloutId + WaveId + TVId + package digest.  
**Participantes:** UpdateRollout, MaintenanceWindow, EdgeInstallation, HealthRecord, Reconciler e Fleet projections.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Release aprovado | `ScheduleUpdate → UpdateRollout` | `UpdateScheduled` | Pacote/policy inválidos rejeitam |
| 2 | Janela/onda/health prévio válidos | `StartUpdateWave` | `UpdateWaveStarted` | Critérios quantitativos `OPEN-007` |
| 3 | Target elegível | `ApplyUpdate → EdgeInstallation` | `UpdateApplied/Failed` + CurrentState | Command expirado/obsoleto é rejeitado |
| 4 | Fatos pós-update | `RecordCurrentState/HealthObservation` | Current/Observed/Health events | Processo vivo não equivale a saudável |
| 5A | Gates satisfeitos | UpdateRollout observa sucesso por target | progresso da onda | Duplicata não conta target duas vezes |
| 5B | Gate falhou | `PauseUpdateWave`, `RollbackUpdate` | `UpdateWavePaused`, `UpdateRolledBack/Failed` | Falha em onda limita blast radius |
| 6 | Estados convergem | `RequestStateReconciliation` e Commands owners | `StateReconciliationCompleted` | Estado novo torna plano antigo obsoleto |

**Timeout/retry:** TTL e tentativas numéricas `OPEN-031`; nunca forçar fora da janela/política.  
**Compensação:** rollback é nova transição; pacote tentado permanece histórico. Falha de rollback degrada/suspende target.  
**Replay:** não reinstala pacote já confirmado; projeção de rollout pode ser reconstruída.  
**Resultado:** sucesso por target e por wave são distintos; resultado parcial é explícito.

## 10. Emergência

**Objetivo:** preemptar mídia por emergência autorizada e restaurar cada TV com confirmação individual.

**Correlação:** EmergencyId; execução por EmergencyId + TVId + PlayerSessionId.  
**Participantes:** EmergencyBroadcast, CanvasComposition, PlayerSession e Edge observability. Owner único por Command.

| Passo | Fato/condição de entrada | Command e owner | Event esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Autoridade solicita | `DeclareEmergencyBroadcast → EmergencyBroadcast` | `EmergencyBroadcastDeclared` | Escopo/priority/expiry inválidos rejeitam |
| 2 | Declaração vigente | `ActivateEmergencyBroadcast` | `EmergencyBroadcastActivated` | Ativações concorrentes resolvidas por prioridade/policy |
| 3 | Por TV elegível | `ApplyEmergencyComposition → CanvasComposition` | `EmergencyLayerActivated` | Falha isolada por TV |
| 4 | Por sessão | `PreemptPlayerSession → PlayerSession` | `EmergencyBroadcastStarted`, `PlaybackInterrupted` | Confirmação ausente = UNKNOWN |
| 5 | Clear autorizado ou expiry | `ClearEmergencyBroadcast` | `EmergencyBroadcastCleared` | Clear idempotente |
| 6 | Por TV/sessão | `RestorePlayerSession` | `EmergencyBroadcastEnded` e resultado | Nova tentativa conforme `OPEN-034` |

**Timeout/retry:** Command tem expiração obrigatória; valor `OPEN-031`. Reentrega usa mesma chave por TV.  
**Compensação:** clear/restore, nunca apagar interrupção.  
**Segurança:** segregação de funções e owner de políticas permanecem `OPEN-032`; Saga não amplia escopo.  
**Resultado:** término global pode ser parcial enquanto TVs permanecem UNKNOWN; não declarar “toda frota restaurada” sem confirmações.

## 11. Recuperação offline

**Objetivo:** sincronizar fatos locais após reconexão sem duplicar, reordenar artificialmente ou fabricar Evidence.

**Correlação:** TV/Edge identity + local stream; cada fato conserva seu `eventId`.  
**Participantes:** Playback Collector, Telemetry Collector, Edge state reporting, ingest owners, Evidence Builder e gap monitoring.

| Passo | Fato/condição de entrada | Ação/Command owner | Resultado esperado | Falha/concorrência |
| --- | --- | --- | --- | --- |
| 1 | Transporte indisponível | Persistir fila local autorizada | `PlaybackEventQueued`/telemetria/state pendentes | Limite/TTL quantitativo `OPEN-029/031` |
| 2 | Conectividade retorna | Reenviar na ordem local conhecida | Mesmos ids/payloads/signatures | Envio concorrente deduplica no Cloud |
| 3 | Cloud recebe | Validar identidade, schema, sequência e duplicidade | aceite, gap ou rejeição explícitos | Evento atrasado preserva occurredAt |
| 4 | Gap detectado | Aguardar/requisitar reenvio conforme política | gap resolvido ou marcado irrecuperável por decisão | Não avançar dinheiro/prova dependente |
| 5 | PlaybackEvent elegível | Saga de Evidence normal | Evidence PENDING/VALID/etc. | Ingestão tardia não garante validade |
| 6 | Current/Observed divergem | Saga de reconciliação normal | Commands válidos ao owner | Cloud não sobrescreve CurrentState |

**Compensação:** evento expirado/inválido permanece na trilha; nenhuma Evidence é criada por inferência.  
**Replay:** fila local e ingest ledger distinguem “enviado”, “recebido” e “processado”; replay de Cloud não pede nova assinatura.  
**Resultado:** sincronização pode terminar com gaps explícitos; completude não é presumida.

## Exemplos e contraexemplos

| Cenário | Saga correta | Proibido |
| --- | --- | --- |
| `ReserveSlot` aceito, resposta perdida | Consultar/repetir mesma chave e continuar do Event | Criar outro Slot |
| Provider de saque não responde | Reconciliar instrução antes de retry | Enviar segunda transferência |
| Evidence é revertida após Settlement fechado | Emitir compensação no Financial Platform | Reabrir Settlement |
| Uma TV não confirma emergência | Manter target UNKNOWN e escalar | Declarar sucesso global |
| Evento offline chega fora de ordem | Registrar gap e bloquear dependência | Trocar timestamps/reordenar fatos |
| Replay da Saga de update | Reconstruir passos e pular efeitos confirmados | Reinstalar pacote em toda frota |

## Realocação de Slot não executado

**Objetivo:** preservar capacidade financeira após falha operacional sem reescrever o Slot original.

**Correlação:** obrigação original + Slot original + reallocation attempt.

| Passo | Fato/condição | Command e owner | Resultado |
| --- | --- | --- | --- |
| 1 | falha terminal confirma ausência de execução válida | `ReleaseBudgetReservation → CampaignBudget` | reserva liberada uma vez |
| 2 | Campaign continua ativa e dentro da janela | `RequestSlotReallocation → Campaign` | busca autorizada |
| 3 | candidatos satisfazem restrições e equivalência | `QuotePrice → PricingPolicy` | novos Quotes |
| 4 | budget ainda disponível | `AuthorizeBudgetReservation → CampaignBudget` | nova reserva |
| 5 | oportunidade ainda livre | `ReserveSlot → Slot` | novo Slot com nova identidade |

Realocação é automática antes de refund. Cada tentativa usa identidade própria ligada à obrigação original. Falha de uma tentativa não altera o Slot histórico e não permite cobrança sem Evidence.

O domínio de equivalência está fechado; tolerâncias quantitativas e limites de tentativa/tempo são parâmetros operacionais versionados. Na ausência de versão válida, a implementação não pode relaxar targeting, aumentar preço ou prolongar janela por inferência.

As tolerâncias são fornecidas por `SlotEquivalencePolicy` versionada no Configuration Service. A Saga aplica a versão preservada; não calcula equivalência por heurística própria.

## Cancelamento assíncrono de Campaign

**Objetivo:** finalizar cancelamento quando ao menos um Slot já foi `DISPATCHED`.

| Passo | Fato/condição | Command owner | Resultado |
| --- | --- | --- | --- |
| 1 | Advertiser cancela e existe Slot dispatched | `CancelCampaign → Campaign` | `CampaignCancellationRequested`, estado `CANCELLING` |
| 2 | Slot ainda `ALLOCATED` | `RevokeSlot → Slot` | `SlotRevoked` |
| 3 | Slot `DISPATCHED/DELIVERED` | reconciliar execução/Evidence | resultado terminal explícito |
| 4 | reserva revogável | `ReleaseCampaignBudget → CampaignBudget` | valor disponível |
| 5 | todos os itens resolvidos | `FinalizeCampaignCancellation → Campaign` | `CampaignCancelled` |
| 6 | saldo não consumido | Command financeiro à AdvertiserAccount | crédito interno padrão |

Solicitação de refund é fluxo posterior e opcional do Financial Platform. Replay reconstrói o manifest, não reenvia revogação confirmada nem refund.

## Reorganização de Slots consecutivos

Somente Slots ainda movíveis podem ser reorganizados. A Saga seleciona o Slot elegível imediatamente mais próximo conforme `ConsecutiveSlotPolicy`, revoga a alocação antiga pelos owners e cria nova reserva/Slot. Preço, budget, prioridade, targeting e direito de outro Advertiser não podem piorar. Falha preserva a organização anterior ou deixa compensações explícitas; nunca move in place.
## Governance Decision Saga

```text
Source facts
→ OpenGovernanceCase
→ GovernanceCaseOpened
→ AttachEvidenceReference*
→ StartInvestigation
→ deterministic classification OR HumanReviewRequested
→ PublishDecision
→ ResponsibilityDecisionPublished
→ owner-specific Commands
→ reconciliation
```

| Passo | Owner | Regra |
| --- | --- | --- |
| fatos | contexts de origem | publicam somente o observado |
| abertura/evidências | GovernanceCase | deduplica e registra gaps |
| investigação | GovernanceCase | congela GovernancePolicyVersion |
| classificação | GovernanceCase | proposta não é decisão pública |
| publicação | GovernanceCase | cria revision oficial append-only |
| consequência | Financial/Settlement/Campaign/etc. | Command próprio referencia decisionId + revision |
| reconciliação | cada executor | verifica resultado desconhecido antes de retry |

Timeout nunca publica decisão. Event fora de ordem aguarda dependência. Replay não repete efeito.

## Governance Appeal Saga

```text
ResponsibilityDecisionPublished
→ AppealDecision
→ ResponsibilityDecisionAppealed
→ ReevaluateGovernanceCase
→ GovernanceCaseReevaluated
→ PublishDecision (new revision)
→ ResponsibilityDecisionPublished
→ compensating owner-specific Commands
```

A decisão recorrida e seus efeitos permanecem. A nova revisão causa lançamentos, direitos ou estados compensatórios; nenhuma Saga edita Aggregate alheio.
