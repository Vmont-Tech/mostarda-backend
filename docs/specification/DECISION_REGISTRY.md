# Registro de Decisões da Especificação

Este registro conecta regras vigentes, ADRs e supersessões. O status `ACCEPTED` significa que a decisão já aparece como aprovada na documentação; o status da especificação completa permanece `DRAFT` até revisão do fundador.

## ADRs

| ADR | Decisão | Status / supersessão |
| --- | --- | --- |
| ADR-001 | Fundação DDD, eventos, Edge/Cloud e invariantes arquiteturais | Aceito; sua cláusula de fonte única em `domain/` é supersedida pelo ADR-009 após aceite da Specification |
| ADR-002 | Edge leve, offline e sem regras complexas | Aceito; identidade/capability foram refinadas por ADR-008 e possuem pontos `OPEN-011/012` |
| ADR-003 | Evidence Ledger append-only e prova de exibição | Aceito; pagamento direto citado foi supersedido por ADR-007 |
| ADR-004 | Quantum registra hashes e atende NFC/QR, sem pagamento | Aceito |
| ADR-005 | Asaas adapter e arquitetura financeira original | Aceito parcialmente; execução via Settlement foi supersedida por ADR-007 |
| ADR-006 | AI Orchestration, agentes e explicabilidade | Aceito |
| ADR-007 | Financial Platform separa direito, ledger, wallet e withdrawal | Aceito; vigente para movimentos financeiros |
| ADR-008 | TV Network é proprietário da frota e disponibilidade | Aceito |

## Decisões normativas consolidadas

| ID | Decisão vigente | Origem principal | Status |
| --- | --- | --- | --- |
| `DEC-001` | Split fixo 30/20/20/20/10, sem redistribuição automática | Revenue Architecture + System Invariants | ACCEPTED |
| `DEC-002` | Edge produz fatos; EvidenceRecord nasce no Cloud | Evidence Pipeline | ACCEPTED |
| `DEC-003` | Quantum recebe pacote/hash canônico e nunca dinheiro | ADR-004 + Institutional Domain | ACCEPTED |
| `DEC-004` | Settlement cria direitos; Financial Platform movimenta saldos/saques | ADR-007 | ACCEPTED |
| `DEC-005` | Campaign consome apenas AvailableBudget compensado | Financial Platform | ACCEPTED |
| `DEC-006` | Sem antecipação de recebíveis; taxa de cartão pertence ao Advertiser | Payment Policy | ACCEPTED |
| `DEC-007` | Withdrawal inicial: uma vez por 30 dias, taxa R$2 | Withdrawal Policy | ACCEPTED |
| `DEC-008` | TV Network termina na disponibilidade operacional | ADR-008 | ACCEPTED |
| `DEC-009` | Desired/Current/Observed State são distintos; Reconciler só emite Commands | TV Network + Execution Invariants | ACCEPTED |
| `DEC-010` | Capability declarativa e independente de Facets | TV Network | ACCEPTED |
| `DEC-011` | Assets de Facets representam conhecimento, políticas, capacidades e estado | Assets/Facets | ACCEPTED |
| `DEC-012` | Grão é produto pessoal explicável; IA não decide por outros contextos | Grão + AI Architecture | ACCEPTED |
| `DEC-013` | QR contém token opaco e é resolvido no Cloud | Institutional Domain | ACCEPTED |
| `DEC-014` | Seguro é Bounded Context próprio, não atributo da TV | Insurance | ACCEPTED |
| `DEC-015` | Escala preserva conceitos de 100 a 1.000.000 de TVs | Scalability | ACCEPTED |

## Conflitos conhecidos a sincronizar

| ID | Documento | Divergência | Decisão vigente |
| --- | --- | --- | --- |
| `SYNC-001` | `product/PRODUCT_BIBLE.md` | Ainda descreve percentuais como indicativos/ajustáveis e redistribuição por papel ausente | `DEC-001`: fixos e parcela bloqueada/unclaimed |
| `SYNC-002` | `product/PRODUCT_BIBLE.md` | Descreve seguro como contribuição por exibição sem política aprovada | `OPEN-009`: não inferir capitalização |
| `SYNC-003` | ADR-003/ADR-005 históricos | Linguagem associa Settlement diretamente a Asaas | ADR-007 supersede essa parte; ADRs históricos não são editados |
| `SYNC-004` | `domain/DOMAIN_PRINCIPLES.md`, `WORLDS.md`, `DOMAIN_DICTIONARY.md` | Linguagem antiga sugere Evidence nascendo/assinada no Edge | `DEC-002`: Edge cria PlaybackEvent; EvidenceRecord nasce no Cloud |
| `SYNC-005` | documentos antigos de QR/Quantum | Alguns trechos sugerem resolução final no Quantum | `DEC-013`: QR contém token e Cloud resolve destino; Quantum fornece consulta/âncora permitida |
| `SYNC-006` | `domain/BOUNDED_CONTEXTS.md`, `OWNERSHIP.md` e documentos legados | Ownership de TV Network, Edge, Telemetry e Capability ainda tem sobreposição | ADR-008 e `SPEC-TV-001..005` governam a frota; execução de mídia continua no Edge Runtime |
| `SYNC-007` | `tv-network/TV_LIFECYCLE.md`, `INSTALLATION.md`, `PROVISIONING.md` | Ordem Installation/Provisioning diverge | `OPEN-011`; ambos permanecem gates antes de ACTIVE |
| `SYNC-008` | ADR-002 e Capability docs | ADR antigo compõe Capability por Facets; regra nova exige independência declarativa | `DEC-010`: Capability Registry é independente; Facets são mecanismo interno separado quando aplicável |
| `SYNC-009` | `architecture/ARCHITECTURE_OVERVIEW.md` | Diagrama/texto legado ainda pode representar Settlement/Asaas e Inventory separados | ADR-007/008 e a Specification são vigentes |
| `SYNC-010` | `execution/TIMELINES.md` | Timeline termina pagamento em Settlement | Financial Platform reconcilia Withdrawal; Settlement termina no direito |
| `SYNC-011` | `execution/STATE_MACHINES.md` | Settlement `CLOSED → COMPENSATING` conflita com CLOSED imutável | Compensação é nova linha/Aggregate; Settlement fechado não reabre |
| `SYNC-012` | `execution/COMMANDS.md` | CancelCampaign publica CampaignCompleted | Evento de cancelamento precisa ser explicitado em `OPEN-033` |
| `SYNC-013` | Commands/Sagas de Evidence | Ordem Builder/Validator/Ledger diverge | Spec: cria PENDING, valida, então torna VALID |
| `SYNC-014` | Command de emergência | Um Command aparece com dois owners | Owner único ou Saga com Commands separados (`OPEN-027`) |
| `SYNC-015` | CampaignBudget docs | Estados/buckets e ownership de ContractValue divergem | `OPEN-013/014` |
| `SYNC-016` | Financial Commands | Command de PaymentLedger descreve efeito em CampaignBudget | Owner emite Event; consumidor emite novo Command (`OPEN-015`) |
| `SYNC-017` | WithdrawalBatch docs | Open/Close/Seal/Execute possuem semânticas conflitantes | `OPEN-024` |
| `SYNC-018` | Player/Playback e Evidence/Anchor state machines | Lifecycles/owners estão sobrepostos | `OPEN-028/034` |

`SYNC-001` e `SYNC-002` não são corrigidos neste commit porque `PRODUCT_BIBLE.md` contém alteração local do usuário. Todos os itens `SYNC-*` devem ser sincronizados somente após revisão/aceite explícito desta especificação.
