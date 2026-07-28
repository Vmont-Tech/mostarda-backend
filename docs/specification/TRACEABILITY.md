# Matriz de Rastreabilidade

| Regra da especificação | Documentos derivados principais | ADR |
| --- | --- | --- |
| `SPEC-BIZ-001..005` | `product/BUSINESS_FOUNDATION.md`, `VISION.md`, `GO_TO_MARKET.md` | — |
| `SPEC-INV-001..006` | `domain/SYSTEM_INVARIANTS.md`, `execution/EXECUTION_INVARIANTS.md` | ADR-001 |
| Contextos e ownership | `domain/BOUNDED_CONTEXTS.md`, `OWNERSHIP.md`, `AGGREGATES.md` | ADR-001, 007, 008 |
| `SPEC-MEDIA-001..015` | `domain/CAMPAIGN_MANAGEMENT.md`, `PLAYER.md`, `CANVAS.md`, `AGGREGATES.md`; execution docs | ADR-002 |
| `SPEC-PRICE-001..002` | `domain/PRICING_ENGINE.md`, `REVENUE_ARCHITECTURE.md`; `financial/CAMPAIGN_BUDGET.md` | ADR-005/007 |
| `SPEC-EVID-001..004` | `domain/EVIDENCE_PIPELINE.md`; `execution/COMMANDS.md`, `EVENTS.md`, `SAGAS.md` | ADR-003 |
| Quantum/QR/NFC | `domain/INSTITUTIONAL_DOMAIN.md`, `WORLDS.md`, `DOMAIN_EVENTS.md` | ADR-004 |
| `SPEC-SETTLE-001..002` | `domain/REVENUE_ARCHITECTURE.md`, `AGGREGATES.md`; execution docs | ADR-005/007 |
| `SPEC-FIN-001..004` | todos os documentos em `financial/` | ADR-007 |
| `DEC-043`, Financial Decision Register | `PLATFORM_SPECIFICATION.md`; `financial/FINANCIAL_ARCHITECTURE.md`, `FINANCIAL_INVARIANTS.md`, `LEDGER.md`, `FINANCIAL_COMMANDS.md`, `FINANCIAL_EVENTS.md`, `CAMPAIGN_BUDGET.md`, `PARTNER_WALLET.md`, `WITHDRAWAL_POLICY.md`; Aggregate/Execution/Governance catalogs | ADR-007/009 |
| `SPEC-CONT-001..004` | `domain/HARDWARE_CONTINUITY.md`, `INFLUENCER_DEVELOPMENT_FUND.md`, `INSURANCE.md`; catálogos Domain/Execution | — |
| `SPEC-PARTNER-001..003` | `product/PARTNER_NETWORK_OPERATING_MODEL.md`, Campaign/Pricing/Evidence, TV Network e Financial | ADR-002/007/008 |
| `SPEC-TV-001..005` | todos os documentos em `tv-network/` | ADR-008 |
| AI e Grão | `domain/AI_ARCHITECTURE.md`, `GRAO.md`; ADR-006 | ADR-006 |
| Marketplace/evolução | `domain/BOUNDED_CONTEXTS.md`, `DOMAIN_EVOLUTION.md` | — |
| Commands/Events/Sagas | todos os documentos em `execution/` | ADR-001 |
| `SPEC-DIST-001..008` | `execution/EXECUTION_INVARIANTS.md`, `EVENTS.md`, `SAGAS.md`, `STATE_MACHINES.md`; catálogos Financial e TV Network | ADR-001, 007, 008 |
| Escalabilidade | `domain/SCALABILITY.md` | ADR-001 |
| `SPEC-GOV-001..006` | `governance/GOVERNANCE_DISPUTE_MANAGEMENT.md`, `GOVERNANCE_COMMANDS.md`, `GOVERNANCE_EVENTS.md`, `GOVERNANCE_STATE_MACHINE.md`, `GOVERNANCE_INVARIANTS.md`; execution e consumidores Financial/Settlement/Campaign/Notifications/Analytics | — |

## Rastreabilidade de fluxos

| Fluxo | Origem → destino | Contratos |
| --- | --- | --- |
| Compra | Advertiser → Payment → CampaignBudget → Campaign/Slot | Payment Flow, Campaign Budget, Commands |
| Planejamento | Advertiser/Grão → Campaign → Quote → Budget Reservation → Slot | Campaign Management, Pricing Engine, Campaign Budget |
| Realocação | Slot não executado → liberação de reserva → candidato equivalente → novo Slot | Campaign Management, Campaign Budget, Sagas |
| Exibição | Slot → Edge/Player → PlaybackEvent | Player, Edge Runtime, Execution Timelines |
| Prova | PlaybackEvent → EvidenceRecord → Package → Anchor | Evidence Pipeline, ADR-003/004 |
| Direito | Evidence válida/ancorada → Settlement → SplitShare | Revenue Architecture, Settlement state machine |
| Saque | PartnerLedger → Wallet → Withdrawal → Asaas | Financial Architecture, Withdrawal Policy |
| Frota | Register → Install → Provision → Health → Active | TV Network lifecycle/state machines |
| Update | DesiredState → Wave → Health Gate → Apply/Rollback | TV Network update/rollback docs |
| Continuidade | Subscription → MaintenanceCase → reparo/TV temporária → PermanentExchange → QuantumAnchor | Hardware Continuity, TV Network, Institutional Domain |
| Fundo de influenciadores | Evidence monetizada sem Influencer → SplitShare do fundo → voto ponderado → compromisso → execução/prestação de contas | Influencer Development Fund, Revenue Architecture, Financial |
| Checkout temporal | sugestão → hold/quote congelados → pagamento imediato → confirmação/expiração | Partner Network Operating Model, Pricing, Payment Flow |
| Governança | Fatos autoritativos → GovernanceCase → investigação/revisão humana → ResponsibilityDecisionPublished → Commands dos owners consumidores | Governance specification, Commands, Events, State Machine, Sagas |
| Recurso | ResponsibilityDecisionPublished → Appeal → GovernanceCaseReevaluationStarted → nova revision → GovernanceCaseReevaluated → compensações append-only | Governance specification, Governance Saga, Financial/Settlement/Campaign |
| Recovery financeiro | ResponsibilityDecisionPublished → Command específico por ResponsibleParty → PaymentLedger/PartnerLedger → obrigação/lançamento append-only | Financial Decision Register, Financial Commands/Events |
| Fiscal | Withdrawal → TaxPolicy gate → WithdrawalExecuted/Failed → retenção → ExecuteTaxPayment | Withdrawal Policy, Financial Decision Register |

## Lacunas

As `OPEN-006/009/016..020/025` possuem artefato derivado definitivo em `DEC-043`. As demais decisões listadas na seção “Decisões abertas” da Specification continuam sem artefato definitivo.
