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
| `DEC-014` | Seguro é Bounded Context próprio, não atributo da TV | Insurance | SUPERSEDED por `DEC-048` |
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
| `DEC-042` | ReevaluateGovernanceCase inicia reavaliação por GovernanceCaseReevaluationStarted; nova ResponsibilityDecisionPublished precede GovernanceCaseReevaluated, que representa exclusivamente a conclusão e retorno a DECIDED | Semântica normativa da reavaliação de GovernanceCase | ACCEPTED no draft |
| `DEC-043` | Financial Platform usa BRL/4 casas, dupla entrada append-only, reconhecimento somente após compensação/Settlement, recovery por owner específico, Insurance Fund no PaymentLedger e bloqueio fiscal sem TaxPolicy | `financial/FINANCIAL_DECISION_REGISTER.md`; encerra `OPEN-006/009/016..020/025` | ACCEPTED, exceto trecho Insurance supersedido por `DEC-048` |
| `DEC-044` | Freemium reserva 40% de cada faixa à programação local, limitada a dois Slots consecutivos, e 60% à Mostarda; Slots confirmados são imutáveis | Partner Network Operating Model | ACCEPTED |
| `DEC-045` | Sugestão não reserva; pré-seleção cria InventoryHold e PricingQuote coexpirantes; decisão permanece com Advertiser/agente autorizado | Partner Network Operating Model | ACCEPTED |
| `DEC-046` | Budget solicitado é líquido; taxas e tributos são adicionais e discriminados no checkout; boleto não reserva inventário | Partner Network Operating Model + Payment Policy | ACCEPTED; especializa `DEC-006` |
| `DEC-047` | Toda execução gera EvidenceRecord tipada; somente `MONETIZED_PLAYBACK` possui extensão econômica/elegibilidade financeira | Partner Network Operating Model + Evidence Pipeline | ACCEPTED |
| `DEC-048` | Antigo Insurance é supersedido pelo Plano Mostarda de Continuidade Operacional, serviço mensal não securitário | Hardware Continuity | ACCEPTED; supersede `DEC-014` e a parte Insurance de `DEC-043` |
| `DEC-049` | Sem influenciador elegível, os 10% pertencem ao Fundo de Desenvolvimento de Influenciadores, patrimônio restrito governado por maioria do equity e dois votos | Influencer Development Fund | ACCEPTED; especializa `DEC-001` |
| `DEC-050` | Mini PC completo é propriedade Mostarda em comodato gratuito; instalação pode ser remota assistida; proveniência/troca são assinadas e ancoradas no Quantum | Hardware Continuity + Partner Network Operating Model | ACCEPTED |
| `DEC-051` | Edge executa cache autorizado offline, sincroniza fatos depois e usa fallback institucional quando a programação se esgota; tela preta por falta de conteúdo é proibida | Partner Network Operating Model | ACCEPTED |
| `DEC-052` | Slot é uma janela exclusiva e fixa de 15 segundos; Creative pode durar menos, mas o próximo conteúdo nunca começa antes do limite do Slot contratado | Platform Specification + Campaign Management + Evidence Pipeline | ACCEPTED |
| `DEC-053` | Quando o Creative termina antes do Slot, o último frame permanece congelado e visível até o fim da janela; nenhum conteúdo alheio ou antecipado ocupa o restante | Player + Platform Specification + Evidence Pipeline | ACCEPTED |
| `DEC-054` | Cobrança exige reprodução integral até o final natural do Creative; qualquer interrupção anterior invalida a tentativa, impede consumo e libera a reserva ao saldo disponível | Player + Evidence Ledger + CampaignBudget | ACCEPTED; fecha `OPEN-004` quanto à completude do Creative |
| `DEC-055` | Falha posterior ao final natural do Creative, durante a permanência do último frame, não invalida a exibição nem desfaz cobrança/repasse; o incidente posterior permanece auditável | Player + Evidence Ledger + Settlement | ACCEPTED |
| `DEC-056` | Exibição inválida inicia realocação automática dentro das escolhas originais: primeiro na mesma TV, depois em TV já escolhida ou equivalente; critérios nunca são ampliados silenciosamente | Campaign Management + Pricing Engine + CampaignBudget | ACCEPTED; especializa `DEC-022/033` |
| `DEC-057` | Falha antes do final encerra a entrega naquele Slot sem retomada; o restante executa fallback institucional não monetizado, a falha é reportada e o anúncio segue para realocação | Player + Edge Runtime + Campaign Management | ACCEPTED; fecha a retomada de conteúdo pago em `OPEN-034` |
| `DEC-058` | Falha comprovadamente restrita ao Creative bloqueia somente esse conteúdo; falha do equipamento, Player ou causa desconhecida suspende imediatamente entregas pagas da TV até recuperação comprovada | TV Network + Player + Campaign Management | ACCEPTED |
| `DEC-059` | Retorno ao inventário pago exige verificação automática bem-sucedida e reprodução integral de conteúdo institucional de teste com fatos do dispositivo; resultado inconclusivo exige atendimento e não libera automaticamente | TV Network + Edge Runtime + Player | ACCEPTED |
| `DEC-060` | Expediente do local e apuração são distintos: o expediente é dividido em turnos de apuração; Edge confirma início, troca e encerramento, reporta falha imediatamente e Cloud escala correção e notificações | Venue + Edge Runtime + TV Network + Notifications | ACCEPTED; divisão quantitativa fechada por `DEC-062` |
| `DEC-061` | Mostarda governa faixas diárias padronizadas; expediente informado pelo parceiro recorta somente os períodos efetivos de disponibilidade, enquanto picos e demais dados alimentam preço/planejamento sem mover os marcos de apuração | Configuration Service + Venue + TV Network | ACCEPTED; corrigida e especializada por `DEC-062` |
| `DEC-062` | Faixas de apuração usam marcos civis fixos de 6h (`00/06/12/18/24`) e são recortadas pela abertura/fechamento do Venue; cada fechamento envia o consolidado do período ao Cloud sem substituir alertas imediatos | Configuration Service + Venue + Edge Runtime | ACCEPTED |
| `DEC-063` | Telemetry Context é o owner exclusivo das accepted observations, do Telemetry Ledger append-only e de AudienceProjection interna; immutable civil-minute buckets seguem normalmente em five-minute batches, a projeção usa rolling fifteen-minute window e only new PricingQuotes may consume; QR and NFC bypass Edge; optional collectors degrade explicitly; applied quotes, holds, reserved/sold Slots e preços permanecem imutáveis; Edge/Playback produz `PlaybackEvent`/`PlaybackSignature` e Evidence Ledger alone materializes EvidenceRecord, nunca Telemetry/Audience | Edge Telemetry Architecture + Platform Specification | ACCEPTED |
| `DEC-064` | Producer owns opaque canonical version identity and syntax; each consumer exclusively owns its immutable scoped `CompatibilityMatrix` and compatibility decisions; Configuration Service distributes only; evaluation is closed by default and distinguishes a produced four-state decision from operational non-evaluation | Contract Compatibility + Platform Specification + TBS | ACCEPTED |

## Conflitos conhecidos a sincronizar

`DEC-048` torna referências a `InsuranceFund`, apólice, prêmio e sinistro dívida documental histórica quando presentes em relatórios de auditoria já emitidos. Documentos normativos ativos devem usar Hardware Continuity; relatórios históricos não são reescritos.

| ID | Documento | Divergência | Decisão vigente |
| --- | --- | --- | --- |
| `SYNC-001` | `product/PRODUCT_BIBLE.md` | Percentuais/redistribuição antigos | RESOLVED por sincronização com `DEC-001` |
| `SYNC-002` | `product/PRODUCT_BIBLE.md` | Capitalização presumida do seguro | RESOLVED por `DEC-043`; contribuição inicial zero e mudança somente por FinancialPolicy versionada |
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
| `SYNC-016` | Financial Commands | Command de PaymentLedger descreve efeito em CampaignBudget | RESOLVED por `DEC-043`: Payment, PaymentLedger e CampaignBudget recebem Commands distintos, ligados por Events |
| `SYNC-017` | WithdrawalBatch docs | Open/Close/Seal/Execute possuem semânticas conflitantes | `SPEC-FIN-004`: `OPEN → SEALED → SUBMITTED → RECONCILING → CLOSED`, com resultado por Withdrawal |
| `SYNC-018` | Player/Playback e Evidence/Anchor state machines | Lifecycles/owners estão sobrepostos | `OPEN-028/034` |

Itens marcados `RESOLVED` foram sincronizados a partir das respostas consolidadas do fundador. Os demais `SYNC-*` continuam bloqueantes até correção e validação.
