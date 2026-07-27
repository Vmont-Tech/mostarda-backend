# Registro de Decisões da Especificação

Este registro conecta regras vigentes, ADRs e supersessões. O status `ACCEPTED` significa que a decisão já aparece como aprovada na documentação; o status da especificação completa permanece `DRAFT` até revisão do fundador.

## ADRs

| ADR | Decisão | Status / supersessão |
| --- | --- | --- |
| ADR-001 | Fundação DDD, eventos, Edge/Cloud e invariantes arquiteturais | Aceito; sua cláusula de fonte única em `domain/` é supersedida pelo ADR-009 após aceite da Specification |
| ADR-002 | Edge leve, offline e sem regras complexas | Aceito; identidade, lifecycle e capability foram refinadas por ADR-008 e pela Specification |
| ADR-003 | Evidence Ledger append-only e prova de exibição | Aceito; pagamento direto citado foi supersedido por ADR-007 |
| ADR-004 | Quantum registra hashes e atende NFC/QR, sem pagamento | Aceito |
| ADR-005 | Asaas adapter e arquitetura financeira original | Aceito parcialmente; execução via Settlement foi supersedida por ADR-007 |
| ADR-006 | AI Orchestration, agentes e explicabilidade | Aceito |
| ADR-007 | Financial Platform separa direito, ledger, wallet e withdrawal | Aceito; vigente para movimentos financeiros |
| ADR-008 | TV Network é proprietário da frota e disponibilidade | Aceito |
| ADR-009 | Especificação oficial como fonte normativa primária e processo obrigatório de sincronização | Proposto; passa a governar quando a especificação for declarada `ACCEPTED` |

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
| `DEC-016` | Installation física aceita precede Provisioning lógico e ambos são gates de ativação | TV Network + Specification | ACCEPTED no draft |
| `DEC-017` | TV, Device e EdgeInstallation possuem identidades distintas; credencial pertence à EdgeInstallation e não é transferida em substituição | Device Registry + Specification | ACCEPTED no draft |
| `DEC-018` | Produto comercial é capacidade financeira livre consumida em Slots, não Campaign pronta, pacote ou audiência garantida | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-019` | Advertiser mantém autoridade final; Grão otimiza somente dentro de mandato explícito | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-020` | Concorrência de Slot é first-confirmed/first-reserved, sem leilão ou prioridade por preço | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-021` | Ocupação afeta preços posteriores; Slot reservado não é reprecificado | Contexto de Negócio Consolidado + Pricing Engine | ACCEPTED no draft |
| `DEC-022` | Falha operacional libera orçamento e tenta realocação compatível antes de saldo ocioso | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-023` | Overdelivery técnico não é cobrado do Advertiser; custo é absorvido pela Mostarda | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-024` | Cancelamento preserva exibições comprovadas e devolve somente saldo não consumido | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-025` | Remoção de uma causa de pausa só retoma Campaign quando nenhuma outra causa permanecer | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-026` | IA modera por regra/confiança; ambiguidade ou baixa confiança exige revisão humana; Advertiser mantém autoria | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-027` | Inventário prioriza anúncios pagos e depois as classes editoriais explicitadas, sem deslocar compromisso pago confirmado | Contexto de Negócio Consolidado + Campaign Management | ACCEPTED no draft |
| `DEC-028` | Campaign DRAFT exige Advertiser, nome, objetivo, moeda, país, responsável e data | Fechamento do Campaign Management (`OPEN-036`) | ACCEPTED no draft |
| `DEC-029` | DRAFT é editável; READY congela revisão; PUBLISHED/ACTIVE não sofrem mutação operacional in place | Fechamento do Campaign Management (`OPEN-037`) | ACCEPTED no draft |
| `DEC-030` | Campaign ativa automaticamente no início da janela; primeira reserva publica ExecutionStarted | Fechamento do Campaign Management (`OPEN-038`) | ACCEPTED no draft |
| `DEC-031` | Cancelamento é imediato antes de Slot DISPATCHED e coordenado depois da distribuição ao Edge | Fechamento do Campaign Management (`OPEN-039`) | ACCEPTED no draft |
| `DEC-032` | Grace periods são parâmetros de políticas operacionais distribuídas pelo Configuration Service | Fechamento do Campaign Management (`OPEN-040`) | ACCEPTED no draft |
| `DEC-033` | Realocação exige equivalência multidimensional governada por policy; fim da janela libera saldo | Fechamento do Campaign Management (`OPEN-041`) | ACCEPTED no draft |
| `DEC-034` | Saldo cancelado vira crédito interno por padrão; Advertiser pode solicitar refund | Fechamento do Campaign Management (`OPEN-042`) | ACCEPTED no draft |
| `DEC-035` | Moderação possui auto-approve, auto-reject ou human-review; incerteza sempre exige humano | Fechamento do Campaign Management (`OPEN-043`) | ACCEPTED no draft |
| `DEC-036` | SLA de moderação é operacional, configurável e observável; timeout nunca aprova conteúdo | Fechamento do Campaign Management (`OPEN-044`) | ACCEPTED no draft |
| `DEC-037` | Toda falha possui exatamente um responsável entre quatro classes, sem responsabilidade compartilhada | Fechamento do Campaign Management (`OPEN-045`) | ACCEPTED no draft; autoridade julgadora definida por `DEC-041` |
| `DEC-038` | Evidence válida de overdelivery remunera parceiro; Mostarda financia e Advertiser não paga | Fechamento do Campaign Management (`OPEN-046`) | ACCEPTED no draft |
| `DEC-039` | Slots consecutivos evitam repetição por padrão e só reorganizam unidades movíveis sem prejudicar terceiros | Fechamento do Campaign Management (`OPEN-047`) | ACCEPTED no draft |
| `DEC-040` | Matriz Advertiser/Grão/IA/Moderador/Financial/Campaign define autoridade e proibições | Fechamento do Campaign Management (`OPEN-048`) | ACCEPTED no draft |
| `DEC-041` | Governance & Dispute Management, por GovernanceCase, é o único owner do julgamento oficial; decisões são revisions append-only publicadas por ResponsibilityDecisionPublished e consumidores não reinterpretam | Fechamento de `OPEN-049`; Governance specification | ACCEPTED no draft |

## Conflitos conhecidos a sincronizar

| ID | Documento | Divergência | Decisão vigente |
| --- | --- | --- | --- |
| `SYNC-001` | `product/PRODUCT_BIBLE.md` | Percentuais/redistribuição antigos | RESOLVED por sincronização com `DEC-001` |
| `SYNC-002` | `product/PRODUCT_BIBLE.md` | Capitalização presumida do seguro | RESOLVED; fonte permanece `OPEN-009` |
| `SYNC-003` | ADR-003/ADR-005 históricos | Linguagem associa Settlement diretamente a Asaas | ADR-007 supersede essa parte; ADRs históricos não são editados |
| `SYNC-004` | `domain/DOMAIN_PRINCIPLES.md`, `WORLDS.md`, `DOMAIN_DICTIONARY.md` | Linguagem antiga sugere Evidence nascendo/assinada no Edge | `DEC-002`: Edge cria PlaybackEvent; EvidenceRecord nasce no Cloud |
| `SYNC-005` | documentos antigos de QR/Quantum | Alguns trechos sugerem resolução final no Quantum | `DEC-013`: QR contém token e Cloud resolve destino; Quantum fornece consulta/âncora permitida |
| `SYNC-006` | `domain/BOUNDED_CONTEXTS.md`, `OWNERSHIP.md` e documentos legados | Ownership de TV Network, Edge, Telemetry e Capability ainda tem sobreposição | ADR-008 e `SPEC-TV-001..005` governam a frota; execução de mídia continua no Edge Runtime |
| `SYNC-008` | ADR-002 e Capability docs | ADR antigo compõe Capability por Facets; regra nova exige independência declarativa | `DEC-010`: Capability Registry é independente; Facets são mecanismo interno separado quando aplicável |
| `SYNC-009` | `architecture/ARCHITECTURE_OVERVIEW.md` | Diagrama/texto legado ainda pode representar Settlement/Asaas e Inventory separados | ADR-007/008 e a Specification são vigentes |
| `SYNC-010` | `execution/TIMELINES.md` | Timeline termina pagamento em Settlement | Financial Platform reconcilia Withdrawal; Settlement termina no direito |
| `SYNC-011` | `execution/STATE_MACHINES.md` | Settlement `CLOSED → COMPENSATING` conflita com CLOSED imutável | Compensação é nova linha/Aggregate; Settlement fechado não reabre |
| `SYNC-012` | `execution/COMMANDS.md` | CancelCampaign publicava CampaignCompleted | RESOLVED; `CampaignCancelled` é o fato terminal |
| `SYNC-013` | Commands/Sagas de Evidence | Ordem Builder/Validator/Ledger diverge | Spec: cria PENDING, valida, então torna VALID |
| `SYNC-014` | Command de emergência | Um Command aparece com dois owners | Owner único ou Saga com Commands separados (`OPEN-027`) |
| `SYNC-015` | CampaignBudget docs | Estados/buckets e ownership de ContractValue divergem | `SPEC-FIN-002`: Campaign é owner de ContractValue; CampaignBudget referencia o contrato e governa Available/Reserved/Consumed |
| `SYNC-016` | Financial Commands | Command de PaymentLedger descreve efeito em CampaignBudget | `SPEC-FIN-002`: Payment, PaymentLedger e CampaignBudget recebem Commands distintos, ligados por Events |
| `SYNC-017` | WithdrawalBatch docs | Open/Close/Seal/Execute possuem semânticas conflitantes | `SPEC-FIN-004`: `OPEN → SEALED → SUBMITTED → RECONCILING → CLOSED`, com resultado por Withdrawal |
| `SYNC-018` | Player/Playback e Evidence/Anchor state machines | Lifecycles/owners estão sobrepostos | `OPEN-028/034` |

Itens marcados `RESOLVED` foram sincronizados a partir das respostas consolidadas do fundador. Os demais `SYNC-*` continuam bloqueantes até correção e validação.
