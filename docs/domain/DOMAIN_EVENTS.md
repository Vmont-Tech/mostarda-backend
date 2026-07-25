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
| `PlaybackFinished` | Conclusão íntegra dos 15s — gatilho da Evidence. |
| `PlaybackInterrupted` | Interrupção antes da conclusão. |
| `PlaybackRecovered` | Retomada após falha. |
| `PlaybackFailed` | Falha definitiva; não gera Evidence válida. |
| `PlaybackQueueExhausted` | Fila local sem Slots disponíveis. |

## Campaign (produtor: Cloud / Campaign Management; alguns no Edge)

| Evento | Significado |
| --- | --- |
| `CampaignCreated` | Campaign registrada por um Advertiser. |
| `CampaignScheduled` | Janela e segmentação definidas. |
| `CampaignStarted` | Início da veiculação. |
| `CampaignPaused` | Suspensa pelo Advertiser ou por regra. |
| `CampaignResumed` | Retomada. |
| `CampaignCompleted` | Concluída por entrega/orçamento. |
| `CampaignExpired` | Encerrada por fim de janela. |
| `CampaignBudgetExhausted` | Orçamento consumido por Evidences válidas. |
| `CreativeAssetUploaded` | Creative Asset enviado. |
| `CreativeAssetApproved` | Aprovado pela validação de IA. |
| `CreativeAssetRejected` | Reprovado — não pode virar Slot. |
| `SlotAllocated` | Slot reservado para uma TV com preço congelado. |
| `SlotRevoked` | Reserva cancelada. |
| `SlotAccepted` / `SlotRejected` | Aceite/recusa local no Edge. |
| `SlotExpiredLocally` | Slot expirou sem execução no Edge. |
| `PlaybackQueueUpdated` | Nova fila enviada à TV. |
| `CampaignDeliveryReported` | Entrega reportada pelo Edge. |

## Telemetry (produtor: Edge)

| Evento | Significado |
| --- | --- |
| `PresenceUpdated` | Contagem anônima de presença atualizada. |
| `DwellTimeUpdated` | Permanência média atualizada. |
| `OccupancyChanged` | Mudança de nível de ocupação. |
| `HeatMapGenerated` | Novo mapa de calor agregado. |
| `PeakHourDetected` | Faixa de pico identificada. |
| `MovementPatternUpdated` | Padrão de fluxo atualizado. |
| `TelemetryBatchSubmitted` | Lote enviado ao Cloud. |
| `TelemetryGapDetected` | Lacuna de coleta identificada. |

## Evidence (produtor: Edge → Cloud)

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
| `SettlementExecuted` | Split enviado ao Asaas. |
| `PayoutConfirmed` | Repasse confirmado pelo Asaas. |
| `PayoutFailed` | Falha de repasse. |
| `InvoiceIssued` | Nota fiscal emitida. |
| `ChargeRegistered` | Cobrança do Advertiser registrada. |
| `ChargePaid` / `ChargeOverdue` | Estado da cobrança. |
| `InsuranceFundCredited` | Crédito explícito ao Fundo de Seguro; não é sexta linha de split. |
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
| `InsurancePolicyAttached` | Seguro vinculado à TV. |

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
| `DesiredStatePublished` / `CurrentStateReported` / `StateReconciliationCompleted` | Convergência entre estado desejado e observado. |
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

## Insurance

| Evento | Significado |
| --- | --- |
| `InsurancePolicyIssued` / `InsurancePolicyCancelled` | Emissão ou encerramento da cobertura. |
| `InsurancePremiumDue` / `InsurancePremiumPaid` / `InsurancePremiumOverdue` | Ciclo de mensalidade e adimplência. |
| `InsuranceReserveCreated` / `InsuranceReserveReleased` | Reserva financeira criada ou liberada. |
| `InsuranceClaimFiled` / `InsuranceClaimApproved` / `InsuranceClaimDenied` | Ciclo do sinistro. |
| `InsuranceRepairAuthorized` / `InsuranceReplacementAuthorized` | Decisão operacional para reparar ou substituir. |
| `InsuranceSettlementExecuted` | Saída do fundo reconciliada. |

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

---

## Saga de referência: exibição → dinheiro

```text
PlaybackFinished → PlaybackEventSigned → PlaybackEventSubmitted
   → EvidenceGenerated → EvidenceValidated → EvidenceHashed
   → AnchoringRequested → AnchoringConfirmed → EvidenceRegistered
   → SettlementCycleClosed → SettlementAuthorized → SplitCalculated
   → SettlementExecuted → PayoutConfirmed
```

Qualquer falha na cadeia produz `EvidenceRejected`, `EvidenceDisputed`, `AnchoringFailed` ou `SettlementBlocked` — e **nenhum** repasse ocorre.
