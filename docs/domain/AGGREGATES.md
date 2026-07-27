# AGGREGATES — Mostarda

Cada Aggregate tem **uma raiz**, protege **invariantes** e é a única porta de escrita do seu estado. Referências entre Aggregates são sempre **por identidade**, nunca por objeto.

## Regras

1. Uma transação altera **um** Aggregate. Consistência entre Aggregates é **eventual**, via eventos.
2. Invariantes vivem dentro do Aggregate — nunca em serviço de aplicação, nunca no Frontend, nunca no Edge.
3. Todo Aggregate emite eventos de [`DOMAIN_EVENTS.md`](./DOMAIN_EVENTS.md).
4. Value Objects usados estão em [`VALUE_OBJECTS.md`](./VALUE_OBJECTS.md).

---

## TV Aggregate — contexto TV Network

- **Root:** `TV` (identidade `TVIdentifier`)
- **Entidades internas:** Device (mini PC), Screen, DeclaredCapability, TagBinding. `InsurancePolicy` é Aggregate do contexto Insurance; TV mantém apenas referência de cobertura.
- **Value Objects:** `TVIdentifier`, `GeoLocation` (via Venue), `DeviceHealth`, `TimeSlot` (operação/manutenção)
- **Invariantes:** toda TV pertence a **um** Dono da TV e está em **um** Venue; `TV ID` imutável e não reutilizável; só recebe Slots compatíveis com suas Capabilities declaradas; TV suspensa não recebe Slot.
- **Eventos:** `TvRegistered`, `TvProvisioned`, `TvActivated`, `TvSuspended`, `TvReactivated`, `TvDecommissioned`, `TvAssignedToVenue`, `TvOwnershipTransferred`, `InsurancePolicyAttached`, `NfcTagLinked`.

## TVCapability Aggregate — contexto Edge Runtime

- **Root:** `TVCapability` (`CapabilityIdentifier`)
- **Entidades internas:** `FacetInstallation`, `AssetBinding`, `ServiceContract`, `PolicyBinding`, `CapabilityHealth`.
- **Value Objects:** `CapabilityVersion`, `CapabilityState`, `FacetId`, `Owner`, `DeviceHealth`.
- **Invariantes:** pertence a exatamente uma TV e a um owner técnico; estado, versão, health e contratos são explícitos; Facets instaladas são compatíveis com a versão e não dependem diretamente entre si; alteração de Asset/Service/Policy é versionada e auditável; Capability degradada não anuncia suporte que não pode executar.
- **Eventos:** `CapabilityDeclared`, `CapabilityActivated`, `CapabilityDegraded`, `CapabilityRecovered`, `FacetInstalled`, `FacetSwapped`, `CapabilityPolicyApplied`.

## Venue Aggregate — contexto TV Network

- **Root:** `Venue`
- **Entidades internas:** OperatingSchedule, ContextProfile (categoria, tráfego)
- **Value Objects:** `GeoLocation`, `TimeSlot`
- **Invariantes:** pertence a **um** Dono do espaço; horário de operação obrigatório; alteração de contexto é versionada (afeta pricing histórico).
- **Eventos:** `VenueRegistered`, `VenueOperatingHoursUpdated`.

## Campaign Aggregate — contexto Campaign Management

- **Root:** `Campaign` (identidade `CampaignIdentifier`)
- **Entidades internas:** CreativeAssetRevision, TargetingRule, StrategyRevision, OptimizationMandate, PauseCause
- **Value Objects:** `Money`, `TimeSlot`, `AssetReference`, `PlaybackWindow`
- **Invariantes:** toda Campaign pertence a **um** Advertiser; só solicita Slot com Creative aprovado; não veicula fora da janela; Contract Value não é saldo; budget pertence ao Financial Platform; pausa impede nova alocação; causas de pausa são independentes; Grão só atua dentro de mandato; estimativa nunca é garantia; estados finais não retornam.
- **Eventos:** `CampaignCreated`, `CampaignStrategyRevised`, `CampaignReady`, `CampaignPublished`, `CampaignActivated`, `CampaignPaused`, `CampaignPauseCauseRemoved`, `CampaignResumed`, `CampaignCompleted`, `CampaignExpired`, `CampaignCancellationRequested`, `CampaignCancelled`, `CreativeRevisionSubmitted`, `CreativeApproved`, `CreativeRejected`.

Especificação integral: [`CAMPAIGN_MANAGEMENT.md`](./CAMPAIGN_MANAGEMENT.md).

## Slot Aggregate — contexto Campaign Management

- **Root:** `Slot` (identidade `SlotIdentifier`)
- **Entidades internas:** —
- **Value Objects:** `CampaignIdentifier`, `TVIdentifier`, `PlaybackWindow`, `PricingQuote`, `AssetReference`
- **Invariantes:** um Slot referencia exatamente **uma** Campaign, **uma** TV e **um** Creative Asset; preço é congelado na alocação e nunca recalculado; lifecycle `ALLOCATED → DISPATCHED → DELIVERED → EVIDENCED`; Slot dispatched não permite cancelamento imediato; Slot executado é imutável; Slot não executado na janela expira.
- **Eventos:** `SlotAllocated`, `SlotDispatchedToEdge`, `SlotDelivered`, `SlotEvidenced`, `SlotRevoked`, `SlotExpired`.

## Evidence Aggregate — contexto Evidence Ledger

- **Root:** `Evidence`
- **Entidades internas:** ValidationRecord, AnchoringRecord, DisputeRecord
- **Value Objects:** `TVIdentifier`, `CampaignIdentifier`, `SlotIdentifier`, `EvidenceHash`, `DeviceSignature`, `Money` (calculado, final e efetivamente cobrado), `PlaybackDuration`, `AssetReference`, `AnchoringReceipt`, `EvidenceConfidence`, `PlaybackChecksum`, `CreativeChecksum`, `PlayerVersion`, `EdgeVersion`, `AIModelVersion`, `OSVersion`, `PricingPolicyVersion`, `PricingAlgorithmVersion`, `SettlementPolicyVersion`, `TaxPolicyVersion`, `InsurancePolicyVersion`, `SplitPolicyVersion`, `TaxBreakdown`, `SplitShare`.
- **Invariantes:** representa exatamente **15s** de exibição; campos obrigatórios do ADR-003 sempre presentes; contém preço calculado, final e cobrado, preço dinâmico/fatores, impostos, split aplicado, percentuais, versões de política/algoritmo, timestamp, TV, Slot, Campaign, playback, telemetria, hash, documento associado e Quantum Anchor; registra `EvidenceConfidence`, checksums de playback e criativo e versões de Player, Edge, IA e sistema operacional; assinatura válida é condição para `VALID`; unicidade por Slot executado; **append-only** — correção apenas por `EvidenceReversed`; sem status `VALID` + ancoragem confirmada não há liquidação.
- **Eventos:** `EvidenceGenerated`, `EvidenceValidated`, `EvidenceRejected`, `EvidenceDuplicateDetected`, `EvidenceHashed`, `EvidenceRegistered`, `EvidenceDisputed`, `EvidenceDisputeResolved`, `EvidenceReversed`, `LedgerSnapshotAnchored`.

## Settlement Aggregate — contexto Settlement

- **Root:** `Settlement` (por `SettlementCycle` e participante pagador/recebedor)
- **Entidades internas:** SplitLine, FinancialRight, Invoice, Charge, SettlementDispute
- **Value Objects:** `SettlementCycle`, `Money`, `SplitShare`, `SplitShareStatus`, `SplitPolicyVersion`, `SettlementPolicyVersion`, `TaxPolicyVersion`, `Retention`, `TaxBreakdown`, `AsaasFee`.
- **Invariantes:** consome apenas Evidences `VALID` e ancoradas; após taxas, impostos e retenções explícitas, o valor líquido distribuível é dividido exatamente em **30% Mostarda, 20% Proprietário da TV, 20% Proprietário do Local, 20% Vendedor responsável e 10% Influenciador**; soma das cinco `SplitShare` = valor líquido distribuível; cada parcela possui status próprio `READY`/`BLOCKED`/`UNCLAIMED`/`CREDITED`; ausência de beneficiário não redistribui percentual nem bloqueia as demais parcelas; `CREDITED` cria direito para Financial Platform, não pagamento; ciclo fechado é imutável; falha de ancoragem ou disputa da Evidence bloqueia as parcelas afetadas; nenhuma trilha de valor em blockchain. Ver [`REVENUE_ARCHITECTURE.md`](./REVENUE_ARCHITECTURE.md).
- **Eventos:** `SettlementCycleOpened`, `SettlementCycleClosed`, `SettlementAuthorized`, `SettlementBlocked`, `SplitCalculated`, `SettlementExecuted`, `PartnerCreditRequested`, `InvoiceIssued`, `ChargeRegistered`, `ChargePaid`, `ChargeOverdue`, `InsuranceFundCredited`, `SettlementDisputeOpened`, `SettlementDisputeResolved`.

## Financial Platform Aggregates — contexto Financial Platform

- **Roots:** `PartnerAccount`, `PartnerLedger`, `PartnerWallet`, `Withdrawal`, `WithdrawalBatch`, `CampaignBudget`, `PaymentLedger`, `FinancialPolicy`, `WithdrawalPolicy`.
- **Invariantes:** PartnerLedger e PaymentLedger são append-only; Wallet é projeção do PartnerLedger; CampaignBudget só aumenta por pagamento compensado e só consome AvailableBudget; Withdrawal sempre aplica WithdrawalPolicy; chargebacks e recuperações são novos lançamentos; Settlement apenas origina direitos.
- **Eventos:** catálogo em [`../financial/FINANCIAL_EVENTS.md`](../financial/FINANCIAL_EVENTS.md).

## Influencer Aggregate — contexto Influencer Network

- **Root:** `Influencer`
- **Entidades internas:** ParticipationContract, AudienceProfile
- **Value Objects:** `SplitShare`, `TimeSlot`, `Money`
- **Invariantes:** só é elegível a Split com contrato ativo; percentual acordado imutável dentro do contrato vigente; encerramento não afeta Splits já executados.
- **Eventos:** `InfluencerRegistered`, `InfluencerContractSigned`, `InfluencerAttachedToCampaign`, `InfluencerShareDefined`, `InfluencerContractTerminated`.

## Marketplace Aggregates — contexto Marketplace

- **Roots:** `AdsOffer`, `InfluencerOffer`, `TvOwnerOffer` e, no futuro, `RentalOffer`; cada root possui `Proposal`, `AvailabilityWindow` e `PackageItem` do próprio tipo.
- **Value Objects:** `Money`, `TimeSlot`, `TVIdentifier`, `OfferType`.
- **Invariantes:** ofertas e propostas não misturam tipos; oferta publicada só expõe inventário/elegibilidade do seu subdomínio; proposta aceita gera pedido ao contexto proprietário (Campaign Management, Influencer Network ou TV Network), nunca reserva direto; preço exibido é sempre cotação do Pricing Engine quando houver preço dinâmico.
- **Eventos:** `AdsOfferPublished`, `InfluencerOfferPublished`, `TvOwnerOfferPublished`, `RentalOfferPublished`, `ProposalCreated`, `ProposalAccepted`, `ProposalRejected`, `InventoryReserved`.

## User Aggregate — contexto User Identity

- **Root:** `User`
- **Entidades internas:** Credential, RoleAssignment, Consent, GraoAssignment
- **Value Objects:** `Role`
- **Invariantes:** papéis vivem em associação própria (`RoleAssignment`), nunca como atributo livre do perfil; todo usuário recebe um **Grão** na entrada, sem configuração; consentimento é obrigatório para dados sensoriais/pessoais; desativação preserva histórico.
- **Eventos:** `UserRegistered`, `UserAuthenticated`, `RoleGranted`, `RoleRevoked`, `ConsentGranted`, `ConsentRevoked`, `UserDeactivated`, `GraoAssigned`, `GraoRenamed`.

## Account Aggregate — contexto CRM

- **Root:** `Account`
- **Entidades internas:** Opportunity, SellerAssignment, CommissionAttribution
- **Value Objects:** `Money`
- **Invariantes:** uma conta tem no máximo um Vendedor responsável por período; comissão é atribuída no CRM e **executada** no Settlement.
- **Eventos:** `AccountCreated`, `OpportunityCreated`, `OpportunityWon`, `OpportunityLost`, `SellerAssigned`, `CommissionAttributed`, `PartnerOnboarded`.

## PricingPolicy Aggregate — contexto Pricing Engine

- **Root:** `PricingPolicy`
- **Entidades internas:** RuleSet, MultiplierTable, FloorCeiling
- **Value Objects:** `Money`, `PricingQuote`, `OccupancyLevel`, `ConfidenceScore`
- **Invariantes:** cotação sempre dentro de floor/ceiling; telemetria com confiança abaixo do limiar não influencia preço; toda cotação registra insumos (auditável); política é versionada — cotações antigas mantêm a versão usada.
- **Eventos:** `PriceQuoted`, `PriceApplied`, `PriceOverridden`, `DemandIndexUpdated`, `PricingRuleChanged`, `PricingAuditRecorded`.

## TelemetrySeries Aggregate — contexto Telemetry

- **Root:** `TelemetrySeries` (por TV e período)
- **Entidades internas:** Sample, Gap
- **Value Objects:** `OccupancyLevel`, `ConfidenceScore`, `DeviceHealth`, `TimeSlot`
- **Invariantes:** amostras são imutáveis e anônimas; lacunas são explícitas (`TelemetryGapDetected`); telemetria **nunca** é usada como prova fiscal.
- **Eventos:** `PresenceUpdated`, `DwellTimeUpdated`, `OccupancyChanged`, `HeatMapGenerated`, `PeakHourDetected`, `MovementPatternUpdated`, `TelemetryBatchSubmitted`, `TelemetryGapDetected`.

## AiExecution Aggregate — contexto AI Orchestration

- **Root:** `AiExecution`
- **Entidades internas:** AgentStep, ExplanationRecord, Recommendation
- **Value Objects:** `ConfidenceScore`, `Money` (custo)
- **Invariantes:** nenhuma execução se conclui sem `ExplanationRecord`; recomendação não altera estado de outro contexto (apenas sugere); custo respeita o limite configurado.
- **Eventos:** `AssetValidationCompleted`, `InventoryRecommended`, `BudgetOptimizationSuggested`, `PerformanceDiagnosisGenerated`, `ReportGenerated`, `AiDecisionExplained`, `AiCapabilityDegraded`, `GraoPreferenceLearned`.

## QuantumAnchor Aggregate — contexto Quantum Integration

- **Root:** `QuantumAnchor`
- **Entidades internas:** AnchoringAttempt, PublicInteraction
- **Value Objects:** `EvidenceHash`, `AnchoringReceipt`, `InteractionIdentifier`
- **Invariantes:** ancoragem é idempotente por hash; Quantum nunca recebe dados de Campaign, preço ou pessoas; NFC/QR resolvem aqui e **nunca** no Edge.
- **Eventos:** `AnchoringRequested`, `AnchoringConfirmed`, `AnchoringFailed`, `DocumentHashRegistered`, `NfcInteractionRegistered`, `QrInteractionRegistered`, `QrCodeIssued`, `QrCodeRevoked`.

## GovernanceCase Aggregate — contexto Governance & Dispute Management

- **Root:** `GovernanceCase`.
- **Entidades internas:** `EvidenceReference`, `Investigation`, `ResponsibilityDecision`, `Appeal`.
- **Value Objects:** `ResponsibleParty`, `ResponsibilityCategory`, `Severity`, `Confidence`, `GovernancePolicyVersion`, `DecisionRevision`.
- **Lifecycle:** `OPEN → INVESTIGATING → UNDER_REVIEW → DECIDED → APPEALED → REEVALUATING → DECIDED → CLOSED`.
- **Invariantes:** owner único do julgamento; fatos externos imutáveis; decisão append-only; exatamente um responsibleParty, incluindo `NONE`; confidence obrigatório em `[0.00,1.00]` e sem efeito decisório; exatamente uma policyVersion imutável; party/category indeterminadas impedem publicação; CLOSED final.
- **Eventos:** `GovernanceCaseOpened`, `EvidenceReferenceAttached`, `InvestigationStarted`, `HumanReviewRequested`, `ResponsibilityDecisionPublished`, `ResponsibilityDecisionAppealed`, `GovernanceCaseReevaluationStarted`, `GovernanceCaseReevaluated`, `GovernanceCaseClosed`.

O Aggregate não executa consequências. Toda consequência material ocorre no owner competente e referencia `decisionId + revision`.
