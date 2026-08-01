# DOMAIN EVENTS — Mostarda

Catálogo oficial de eventos de domínio, organizado por **Capability** / contexto. Nenhum evento existe fora deste catálogo.

## Convenções

- Nome no passado, `PascalCase`, sem prefixo de tecnologia.
- Todo evento carrega: `eventId`, `eventType`, `version`, `occurredAt`, `producer`, `correlationId`, `causationId` e o payload de domínio.
- Consumo é sempre **idempotente** (ADR-001).
- Eventos que afetam dinheiro são **auditáveis e imutáveis**.
- Correção nunca é edição: usa-se evento **compensatório**.

---

## Playback (produtor: Edge)

| Evento | Significado |
| --- | --- |
| `PlaybackStarted` | Início da exibição de um Creative Asset em um Slot. |
| `PlaybackFinished` | Conclusão íntegra do Creative e preservação de sua janela fixa — gatilho da Evidence. |
| `PlaybackInterrupted` | Interrupção antes da conclusão. |
| `PlaybackRecovered` | Retomada após falha. |
| `PlaybackFailed` | Falha definitiva; não gera Evidence válida. |
| `PlaybackQueueExhausted` | Fila local sem Slots disponíveis. |
| `FrameDropDetected` | Degradação de frames durante uma sessão de reprodução. |

## TV Capability (produtor: Edge / Cloud)

| Evento | Significado |
| --- | --- |
| `CapabilityDeclared` / `CapabilityActivated` | Capability instalada foi declarada ou ativada. |
| `CapabilityDegraded` / `CapabilityRecovered` | Capability perdeu ou recuperou condição operacional. |
| `FacetInstalled` / `FacetSwapped` | Facet instalada ou substituída sob contrato versionado. |
| `CapabilityPolicyApplied` | Política da Capability aplicada. |

## TV Network (produtor: TV Network)

| Evento | Significado |
| --- | --- |
| `DeviceRegistered` / `DeviceBoundToTV` / `DeviceReplaced` | Registro, vínculo e substituição de equipamento. |
| `InstallationVerified` / `InstallationAccepted` / `InstallationFailed` | Ciclo de instalação física. |
| `HeartbeatReceived` / `HeartbeatMissed` | Liveness operacional e lacunas. |
| `HealthObserved` / `HealthScoreChanged` / `DiagnosisCreated` | Histórico de saúde e diagnóstico. |
| `UpdateWaveStarted` / `UpdateWavePaused` / `UpdateRolledBack` | Operação de rollout e rollback. |
| `FleetCreated` / `FleetMembershipChanged` / `FleetHealthChanged` | Gestão de grupo operacional. |

## Campaign (produtor: Cloud / Campaign Management; alguns no Edge)

| Evento | Significado |
| --- | --- |
| `CampaignCreated` | Campaign registrada por um Advertiser. |
| `CampaignScheduled` | Janela e segmentação definidas. |
| `CampaignStarted` | Início da veiculação. |
| `CampaignPaused` | Suspensa pelo Advertiser ou por regra. |
| `CampaignResumed` | Retomada. |
| `CampaignCompleted` | Estratégia encerrada normalmente, sem nova utilização planejada ou obrigação de realocação aberta. |
| `CampaignCancellationRequested` | Cancelamento iniciou coordenação assíncrona de Slots e reservas ainda revogáveis. |
| `CampaignCancelled` | Campaign terminou por cancelamento; não equivale a conclusão normal. |
| `CampaignStrategyRevised` | Advertiser ou delegado aprovou nova revisão da estratégia. |
| `CampaignPauseCauseRemoved` | Uma causa específica foi removida; não implica retomada. |
| `SlotReallocationRequested` | Falha não executada originou busca de nova oportunidade compatível. |
| `CampaignExpired` | Encerrada por fim de janela. |
| `CampaignBudgetExhausted` | Orçamento consumido por Evidences válidas. |
| `CreativeAssetUploaded` | Creative Asset enviado. |
| `CreativeAssetApproved` | Aprovado pela validação de IA. |
| `CreativeAssetRejected` | Reprovado — não pode virar Slot. |
| `SlotAllocated` | Slot reservado para uma TV com preço congelado. |
| `SlotDispatchedToEdge` | Edge aceitou a distribuição do Slot e sua revisão; define cutoff de cancelamento imediato. |
| `SlotDelivered` | Playback do Slot foi concluído fisicamente; não significa Evidence válida. |
| `SlotRevoked` | Reserva cancelada. |
| `SlotAccepted` / `SlotRejected` | Aceite/recusa local no Edge. |
| `SlotExpiredLocally` | Slot expirou sem execução no Edge. |
| `PlaybackQueueUpdated` | Nova fila enviada à TV. |
| `CampaignDeliveryReported` | Entrega reportada pelo Edge. |

## Telemetry

| Evento conceitual ou concreto | Produtor autoritativo | Significado |
| --- | --- | --- |
| `TelemetryCaptured` | Edge Runtime collector | Medição local capturada sob versões identificadas de capability, collector e policy. |
| `TelemetryBucketClosed` | Edge Runtime | Bucket civil imutável de um minuto fechado com sequência e integridade. |
| `TelemetryBucketAccepted` | Telemetry Context | Bucket validado e anexado ao Telemetry Ledger como observação aceita. |
| `TelemetryBucketRejected` | Telemetry Context | Bucket rejeitado por causa catalogada e não aceito no Ledger. |
| `AudienceProjectionProduced` | Telemetry Context | Hipótese operacional versionada produzida de observações aceitas. |
| `AudienceProjectionExpired` | Telemetry Context | Projeção ultrapassou sua validade e não pode mais ser consumida como atual. |
| `AudienceProjectionInvalidated` | Telemetry Context | Fonte ou policy invalidou o uso da projeção sem apagar o histórico. |
| `TelemetryCapabilityChanged` | Edge Runtime | Condição ou versão observada de collector/capability mudou. |
| `TelemetryIncidentReported` | Família conceitual, não instanciável | Família de incident reporting; tipos concretos abaixo eliminam ambiguidade. |
| `EdgeTelemetryIncidentReported` | Edge Runtime | Incidente de coleta, armazenamento ou transporte local. |
| `TelemetryValidationIncidentReported` | Telemetry Context | Incidente de validação, integridade, schema ou ordering. |

Each concrete event type has one authoritative producer. Se Edge e Telemetry reportarem incidentes distintos, nomes e schemas concretos permanecem distintos; a família `TelemetryIncidentReported` nunca autoriza producer ambíguo.

## Evidence (produtor: Evidence Ledger no Cloud; fatos de playback produzidos no Edge)

| Evento | Significado |
| --- | --- |
| `PlaybackEventSigned` | Evento assinado localmente. |
| `PlaybackEventQueued` | Enfileirado offline. |
| `PlaybackEventSubmitted` | Enviado ao Backend. |
| `EvidenceGenerated` | Evidence criada em `PENDING_VALIDATION`. |
| `EvidenceValidated` | Validada — status `VALID`. |
| `EvidenceRejected` | Inválida — status `INVALID`; **não liquida**. |
| `EvidenceDuplicateDetected` | Duplicidade; apenas a primeira vale. |
| `EvidenceHashed` | Hash consolidado para ancoragem. |
| `EvidenceRegistered` | Hash ancorado no Quantum Registry. |
| `EvidenceDisputed` | Divergência detectada — status `DISPUTED`. |
| `EvidenceDisputeResolved` | Disputa encerrada. |
| `EvidenceReversed` | Evento compensatório (append-only). |
| `LedgerSnapshotAnchored` | Snapshot do Ledger ancorado publicamente. |

Edge/Playback produz `PlaybackEvent` e `PlaybackSignature`. Evidence Ledger alone materializes EvidenceRecord; Telemetry e AudienceProjection nunca produzem Evidence.

## Pricing (produtor: Pricing Engine)

| Evento | Significado |
| --- | --- |
| `PriceQuoted` | Cotação calculada para um Slot. |
| `PriceApplied` | Preço congelado na alocação. |
| `PriceOverridden` | Sobrescrito por regra comercial autorizada. |
| `DemandIndexUpdated` | Índice de demanda recalculado. |
| `PricingRuleChanged` | Regra/tabela alterada. |
| `PricingAuditRecorded` | Trilha de insumos e resultado registrada. |

## Settlement (produtor: Cloud / Settlement)

| Evento | Significado |
| --- | --- |
| `SettlementCycleOpened` | Ciclo iniciado. |
| `SettlementCycleClosed` | Ciclo fechado para apuração. |
| `SettlementAuthorized` | Evidences válidas e ancoradas liberam liquidação. |
| `SettlementBlocked` | Bloqueada por falha de evidência ou ancoragem. |
| `SplitCalculated` | Memória de cálculo do split gerada. |
| `SettlementExecuted` | Direitos financeiros do ciclo foram calculados e encaminhados ao Financial Platform. |
| `PartnerCreditRequested` | Crédito de parceiro solicitado a partir de uma SplitShare. |
| `InvoiceIssued` | Nota fiscal emitida. |
| `ChargeRegistered` | Cobrança do Advertiser registrada. |
| `ChargePaid` / `ChargeOverdue` | Estado da cobrança. |
| `InfluencerFundCreditRequested` | A parcela restrita de 10% sem influenciador elegível foi encaminhada ao Fundo de Desenvolvimento de Influenciadores; não é receita livre. |
| `SettlementDisputeOpened` / `SettlementDisputeResolved` | Disputa financeira. |

## Quantum Integration (produtor: Cloud Adapter / Quantum)

| Evento | Significado |
| --- | --- |
| `AnchoringRequested` | Ancoragem solicitada. |
| `AnchoringConfirmed` | Ancoragem concluída com recibo. |
| `AnchoringFailed` | Falha — entra em retry. |
| `DocumentHashRegistered` | Hash de documento institucional registrado. |
| `NfcInteractionRegistered` | NFC Interaction registrada no Quantum Registry. |
| `QrInteractionRegistered` | QR Interaction registrada. |
| `QrCodeIssued` / `QrCodeRevoked` | Ciclo do QR (emissão no Cloud). |
| `NfcTagLinked` / `NfcTagMissing` | Vínculo/ausência da tag física. |

## TV Network (produtor: Cloud / TV Network)

| Evento | Significado |
| --- | --- |
| `TvRegistered` | TV cadastrada com `TV ID`. |
| `TvProvisioned` | Primeiro boot concluído e chave registrada. |
| `TvActivated` / `TvSuspended` / `TvReactivated` | Estado comercial. |
| `TvDecommissioned` | Retirada de operação. |
| `TvAssignedToVenue` | Vínculo TV ↔ Venue. |
| `VenueRegistered` | Venue cadastrado. |
| `VenueOperatingHoursUpdated` | Horário de operação alterado. |
| `TvOwnershipTransferred` | Troca de Dono da TV. |
| `ContinuitySubscriptionAttached` | Assinatura vigente do Plano de Continuidade vinculada à TV. |

## Heartbeat & Health (produtor: Edge → Cloud)

| Evento | Significado |
| --- | --- |
| `HeartbeatEmitted` | Sinal periódico emitido. |
| `HeartbeatMissed` | Ausência detectada pelo Cloud. |
| `DeviceHealthReported` | Estado de saúde reportado. |
| `DeviceDegraded` / `DeviceRecovered` | Degradação e recuperação. |
| `HdmiSignalLost` | Sinal para a tela perdido. |
| `StorageThresholdReached` | Armazenamento crítico. |
| `SlaBreached` | SLA de disponibilidade violado. |

## Maintenance (produtor: Cloud / Edge)

| Evento | Significado |
| --- | --- |
| `UpdateScheduled` | Atualização agendada. |
| `MaintenanceWindowOpened` / `MaintenanceWindowClosed` | Janela de manutenção. |
| `UpdateApplied` | Atualização aplicada com sucesso. |
| `UpdateFailed` | Falha na atualização. |
| `UpdateRolledBack` | Rollback automático executado. |

## Security (produtor: Edge / Cloud)

| Evento | Significado |
| --- | --- |
| `DeviceKeyProvisioned` / `DeviceKeyRotated` | Ciclo da chave local. |
| `SignatureVerificationFailed` | Assinatura inválida detectada. |
| `TamperSuspected` | Suspeita de violação. |
| `SecurityPolicyPublished` / `SecurityPolicyApplied` | Política de segurança. |

## Streaming & Overlay & Scheduling (produtor: Edge / Cloud)

| Evento | Significado |
| --- | --- |
| `StreamSourceAssigned` / `StreamSourceRevoked` | Atribuição de fonte. |
| `StreamStarted` / `StreamStalled` / `StreamRecovered` / `StreamEnded` | Sessão de stream. |
| `OverlayTemplatePublished` | Template publicado. |
| `OverlayApplied` / `OverlayRemoved` / `OverlayRenderFailed` | Composição de camadas. |
| `QrRendered` / `QrRenderFailed` | Renderização do QR. |
| `ScheduleApplied` / `ScheduleConflictDetected` / `ScheduleDrifted` | Agenda de execução. |
| `CompositionApplied` | Composição Canvas versionada aplicada. |
| `LayerRenderFailed` / `SafeAreaViolationDetected` | Falha de layer ou violação visual detectada. |
| `EmergencyLayerActivated` | Layer de emergência ganhou prioridade. |
| `EmergencyBroadcastStarted` / `EmergencyBroadcastEnded` | Transmissão de emergência iniciou ou terminou. |

## AI Orchestration (produtor: Cloud / AI)

| Evento | Significado |
| --- | --- |
| `AssetValidationCompleted` | Veredito técnico do Creative Asset. |
| `InventoryRecommended` | TVs/Venues recomendados para uma Campaign. |
| `BudgetOptimizationSuggested` | Sugestão de redistribuição de orçamento. |
| `PerformanceDiagnosisGenerated` | Diagnóstico de performance emitido. |
| `ReportGenerated` | Relatório produzido. |
| `AiDecisionExplained` | Insumos, decisão e razão registrados. |
| `AiCapabilityDegraded` | Agente degradado; fluxo humano segue com fallback. |
| `EdgeModelPublished` / `EdgeModelRevoked` | Modelo local homologado/revogado. |
| `EdgeInferenceCompleted` / `EdgeInferenceDegraded` | Inferência no Edge. |
| `DesiredStatePublished` / `CurrentStateReported` / `ObservedStateDerived` / `StateReconciliationCompleted` | Convergência entre estado desejado, declarado e observado. |
| `GraoPreferenceLearned` | Preferência aprendida pelo Grão. |

## Influencer Network

| Evento | Significado |
| --- | --- |
| `InfluencerRegistered` | Influencer cadastrado. |
| `InfluencerContractSigned` | Contrato de participação firmado. |
| `InfluencerAttachedToCampaign` | Vinculado a uma Campaign. |
| `InfluencerShareDefined` | Percentual acordado definido. |
| `InfluencerContractTerminated` | Encerramento do contrato. |

## CRM

| Evento | Significado |
| --- | --- |
| `AccountCreated` | Conta comercial criada. |
| `OpportunityCreated` / `OpportunityWon` / `OpportunityLost` | Pipeline comercial. |
| `SellerAssigned` | Vendedor atribuído à conta. |
| `CommissionAttributed` | Comissão atribuída (execução no Settlement). |
| `PartnerOnboarded` | Parceiro integrado. |

## User Identity

| Evento | Significado |
| --- | --- |
| `UserRegistered` | Conta criada. |
| `UserAuthenticated` | Autenticação realizada. |
| `RoleGranted` / `RoleRevoked` | Papéis do ecossistema. |
| `ConsentGranted` / `ConsentRevoked` | Consentimento de dados. |
| `UserDeactivated` | Conta desativada. |
| `GraoAssigned` | Grão entregue ao usuário na entrada. |
| `GraoRenamed` | Grão renomeado pelo usuário. |

## Marketplace

| Evento | Significado |
| --- | --- |
| `OfferPublished` / `OfferUnpublished` | Vitrine de inventário. |
| `ProposalCreated` / `ProposalAccepted` / `ProposalRejected` | Negociação. |
| `InventoryReserved` | Reserva encaminhada ao Campaign Management. |

## Hardware Continuity (`Insurance*` supersedido)

| Evento | Significado |
| --- | --- |
| `ContinuitySubscriptionActivated/Suspended/Cancelled` | Lifecycle do serviço. |
| `MaintenanceCaseOpened` / `RepairAuthorized` | Diagnóstico e reparo. |
| `TemporaryReplacementAssigned/Returned` | Custódia de TV Mostarda. |
| `PermanentExchangeProposed/Accepted/Completed` | Troca bilateral. |
| `AssetOwnershipDeclared/Transferred` | Proveniência append-only. |
| `DonorPartRegistered` / `AssetRetired` | Inventário circular. |

## Financial Platform

| Evento | Significado |
| --- | --- |
| `PaymentReceived` / `PaymentCompensated` | Pagamento reconhecido ou confirmado para crédito de orçamento. |
| `PaymentCancelled` / `PaymentDisputed` / `PaymentOverdue` | Pagamento sem disponibilidade financeira. |
| `CampaignBudgetIncreased` / `CampaignBudgetConsumed` / `CampaignBudgetDepleted` | Alteração de orçamento disponível. |
| `PartnerCreditRequested` / `PartnerCredited` | Direito do Settlement encaminhado e creditado no Ledger. |
| `PartnerBalanceAvailable` / `PartnerBalanceBlocked` | Saldo de carteira derivado. |
| `WithdrawalRequested` / `WithdrawalApproved` / `WithdrawalExecuted` / `WithdrawalFailed` | Ciclo de saque. |
| `NegativeBalanceCreated` / `NegativeBalanceRecovered` | Débito compensatório e recuperação. |
| `FinancialPolicyChanged` | Nova versão de política financeira. |

## Notifications

| Evento | Significado |
| --- | --- |
| `NotificationRequested` | Notificação solicitada por um contexto. |
| `NotificationDelivered` / `NotificationFailed` | Resultado da entrega. |
| `AlertRaised` / `AlertCleared` | Alertas operacionais internos. |

## Analytics

| Evento | Significado |
| --- | --- |
| `MetricsAggregated` | Agregação concluída. |
| `ReadModelRebuilt` | Modelo de leitura reconstruído. |
| `AnomalyDetected` | Anomalia identificada em métricas. |

## Governance & Dispute Management

| Evento | Significado |
| --- | --- |
| `GovernanceCaseOpened` | Caso de governança foi aberto sem atribuição de culpa. |
| `EvidenceReferenceAttached` | Referência imutável a fato autoritativo foi anexada. |
| `InvestigationStarted` | Investigação começou sob policy versionada. |
| `HumanReviewRequested` | Ambiguidade exige autoridade humana. |
| `ResponsibilityDecisionPublished` | Revisão oficial da decisão foi publicada. |
| `ResponsibilityDecisionAppealed` | Revisão recebeu recurso formal. |
| `GovernanceCaseReevaluationStarted` | Reavaliação foi aceita e entrou em REEVALUATING. |
| `GovernanceCaseReevaluated` | Reavaliação foi concluída após a nova decisão publicada. |
| `GovernanceCaseClosed` | Caso atingiu estado final. |

`ResponsibilityAssigned` e `ResponsibilityReassigned` são aliases proibidos.

---

## Saga de referência: exibição → dinheiro

```text
PlaybackFinished → PlaybackEventSigned → PlaybackEventSubmitted
   → EvidenceGenerated → EvidenceValidated → EvidenceHashed
   → AnchoringRequested → AnchoringConfirmed → EvidenceRegistered
   → SettlementCycleClosed → SettlementAuthorized → SplitCalculated
   → SettlementExecuted → PartnerCreditRequested → PartnerCredited
```

Qualquer falha na cadeia produz `EvidenceRejected`, `EvidenceDisputed`, `AnchoringFailed` ou `SettlementBlocked` — e nenhum direito financeiro é emitido. Saque é fluxo posterior, governado pelo Financial Platform.
