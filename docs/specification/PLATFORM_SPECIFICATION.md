# Especificação Oficial da Plataforma Mostarda

- **Identificador:** `MOSTARDA-PLATFORM-SPEC`
- **Versão:** `0.1.0-draft`
- **Status:** `DRAFT — aguardando revisão do fundador`
- **Data-base:** 2026-07-26
- **Escopo:** negócio, domínio, comportamento e limites arquiteturais

## 1. Autoridade normativa

Esta é a fonte normativa primária da Plataforma Mostarda. Documentos de produto, domínio, execução, financeiro, TV Network e ADRs detalham ou justificam as regras aqui consolidadas. Em caso de divergência:

1. uma decisão posterior e explicitamente aprovada prevalece sobre uma anterior;
2. um ADR aceito prevalece apenas dentro do escopo que não tenha sido supersedido;
3. esta especificação deve registrar a decisão vigente e a referência de origem;
4. contradições não são resolvidas por implementação: são registradas como `OPEN` e decididas antes do código.

Os termos **DEVE**, **NÃO DEVE**, **SOMENTE** e **NUNCA** indicam requisitos normativos. Esta versão não autoriza implementação até ser revisada e declarada `ACCEPTED`.

## 2. Identidade e tese de negócio

### SPEC-BIZ-001 — Missão

A Mostarda DEVE democratizar a mídia OOH brasileira, transformando televisões em ativos de mídia inteligentes, auditáveis e monetizáveis e permitindo a participação econômica de comerciantes, proprietários de telas, proprietários de locais, vendedores, influenciadores e anunciantes.

### SPEC-BIZ-002 — Visão

A Mostarda DEVE operar uma infraestrutura distribuída de Digital Out Of Home, com prova criptográfica de exibição, liquidação de direitos, inteligência artificial explicável e capacidade de expansão para milhões de telas. A Mostarda não é apenas vendedora de publicidade; ela é operadora de infraestrutura de mídia.

### SPEC-BIZ-003 — Mercado inicial

O MVP tem dois lados:

- **Oferta:** pequenos comerciantes e estabelecimentos com televisão, inicialmente academias, padarias, restaurantes, barbearias, salões, lojas, clínicas e mercados.
- **Demanda:** PMEs, franquias, comércio local, prestadores, empresas regionais e agências; empresas maiores entram em fases posteriores.

O piloto começa no Rio de Janeiro, priorizando Bangu, Campo Grande, Realengo, Padre Miguel, Senador Camará e Santa Cruz. A expansão prevista é cidade → estado → Sudeste → Brasil.

### SPEC-BIZ-004 — Modelo e crescimento

O modelo é **SaaS + Marketplace** e depende de efeito de rede. Dono da TV, dono do local, vendedor, influenciador e anunciante possuem incentivo econômico. Produto, onboarding, convites, indicação e automações comerciais DEVEM aumentar liquidez e saúde da rede, não apenas cadastros.

### SPEC-BIZ-005 — Sucesso

Sucesso é uma rede saudável, líquida e confiável. A plataforma DEVE medir, no mínimo: TVs ativas, tempo disponível vendido, fill rate, occupancy rate, Evidence Records válidos, disponibilidade do Edge, receita por TV/local/anunciante, CAC, LTV, churn, tempo até primeira Campaign, tempo até primeiro pagamento e tempo entre compra e primeira exibição.

## 3. Participantes e papéis

| Papel | Responsabilidade de negócio | Direito/limite essencial |
| --- | --- | --- |
| Advertiser | Contrata Campaign e aporta orçamento | Consome somente orçamento compensado; recebe prova e métricas |
| Proprietário da TV | Detém ou financia o equipamento | Participa do split e acompanha saúde/seguro |
| Proprietário do Local | Cede o Venue | Participa do split vinculado ao local |
| Vendedor | Origina e acompanha relacionamento comercial | Participa do split quando responsável pela Campaign |
| Influenciador | Participa com audiência, imagem ou conteúdo | Participa do split quando elegível |
| Mostarda | Opera a infraestrutura e os domínios Cloud | Recebe parcela canônica e mantém governança |
| Operador técnico | Administra frota, manutenção e incidentes | Não pode alterar prova ou regra financeira |
| Grão | Produto de inteligência pessoal | Não recebe valor e não decide por contexto proprietário |

Identidade, papéis, consentimentos e autorização pertencem ao contexto User Identity. Um papel comercial NÃO DEVE ser representado como atributo livre nem usado para contornar autorização do Aggregate owner.

## 4. Princípios globais não negociáveis

### SPEC-INV-001 — Prova antes de direito financeiro

Nenhum direito financeiro derivado de exibição DEVE existir sem `EvidenceRecord` `VALID`, íntegro, não revertido e com ancoragem confirmada.

### SPEC-INV-002 — Imutabilidade

Evidence, ledgers, observações de saúde e fatos auditáveis DEVEM ser append-only. Correções DEVEM ocorrer por novos eventos ou lançamentos compensatórios.

### SPEC-INV-003 — Separação física, digital e institucional

Edge executa e produz fatos; Cloud coordena e decide regras; Quantum ancora hashes e fornece consulta institucional; Asaas executa cobrança/transferência quando instruído. Blockchain/Quantum NUNCA movimenta dinheiro.

### SPEC-INV-004 — Responsabilidade única

Um Command DEVE alterar somente o Aggregate proprietário. Um Event é fato e NÃO altera estado. Uma Saga coordena e NÃO decide regra de negócio.

### SPEC-INV-005 — Versionamento

Toda decisão financeira DEVE preservar as versões de Pricing, Settlement, Tax, Insurance e Split aplicáveis. Toda decisão de IA DEVE preservar Model, Prompt, Agent e Policy Version. Eventos e documentos auditáveis DEVEM possuir versão e hash.

### SPEC-INV-006 — Split canônico

O valor líquido distribuível DEVE somar exatamente:

| Beneficiário | Percentual |
| --- | ---: |
| Mostarda | 30% |
| Proprietário da TV | 20% |
| Proprietário do Local | 20% |
| Vendedor responsável | 20% |
| Influenciador | 10% |

Ausência ou inelegibilidade de um recebedor NÃO redistribui sua parcela. A parcela fica `BLOCKED` ou `UNCLAIMED`, e as demais seguem seu ciclo. Alteração do split exige decisão arquitetural aprovada e nova versão de política.

## 5. Arquitetura de contextos

| Bounded Context | É proprietário de | Não pode conhecer/decidir |
| --- | --- | --- |
| Campaign Management | Campaign, Creative Asset, Slot e lifecycle comercial | Preço, prova, ledger, pagamento e execução física |
| Pricing Engine | PricingPolicy, cálculo explicável e PricingQuote | Cobrança, saldo, split e seleção final de TV |
| Evidence Ledger | EvidenceRecord, validação, disputa e pacote canônico | Pagamento, split e emissão física do PlaybackEvent |
| Settlement | Elegibilidade, ciclo, SplitShares e direitos financeiros | Ledger, Wallet, Withdrawal e execução Asaas |
| Financial Platform | Payment Ledger, CampaignBudget, Partner Ledger/Wallet, Withdrawal e políticas | Pricing, Evidence, split e operação Edge |
| TV Network | TV/Device lifecycle, Edge operacional, capability, health, update e Fleet | Campaign, anúncio, preço, Financial, Evidence e Settlement |
| Edge Runtime | Execução local autorizada, filas, Player/Canvas e fatos de playback | Regras comerciais, preço, split, prova Cloud e pagamento |
| Telemetry | Sinais anônimos de ambiente e dispositivo | Evidence fiscal, preço final e decisão de playback |
| Quantum Integration | Canonical package/hash, anchor e consulta pública NFC/QR | Campaign, anunciante, pessoa, preço e Edge |
| Insurance | Fundo, policy, premium, reserve, claim, repair e replacement | Identidade da TV, Settlement comercial e Health bruto |
| AI Orchestration | Agentes, recomendações, explicações e Grão | Mutação direta de outros contextos e decisões financeiras finais |
| Marketplace | Ads, Influencers, TV Owners e Rentals futuro | Reserva efetiva, preço final, cobrança e ledger |
| CRM | Advertiser, vendedor, oportunidade e atribuição comercial | Autenticação, execução da Campaign e pagamento |
| User Identity | Identidade, autorização, papéis e consentimentos | Dados comerciais e saldos financeiros |
| Analytics | Read models, agregações e projeções | Ser fonte de verdade ou calcular valor devido |
| Notifications | Entrega e trilha de notificações | Decidir o fato notificado |

Contextos NÃO DEVEM ler ou alterar armazenamento de outro contexto. Colaboração ocorre por Commands ao owner, Events ou contratos públicos conceituais. Integrações externas DEVEM passar por anti-corruption boundary.

## 6. Modelo central de mídia

### SPEC-MEDIA-001 — Campaign

Campaign representa a intenção contratada de veiculação e pertence a um Advertiser. DEVE possuir ao menos um Creative Asset aprovado, janela válida e `CampaignBudget` com saldo disponível para gerar/reservar Slot.

Lifecycle normativo: `DRAFT → READY → PUBLISHED → ACTIVE ↔ PAUSED → COMPLETED`, com saídas válidas para `CANCELLED` ou `EXPIRED`. Estados finais não retornam. Pausa por orçamento NÃO invalida Slots já executados.

### SPEC-MEDIA-002 — Slot

Slot referencia exatamente uma Campaign, uma TV, um Creative Asset, uma janela de playback e um PricingQuote congelado. Lifecycle: `ALLOCATED → DELIVERED → EVIDENCED`, ou `ALLOCATED → REVOKED/EXPIRED`. Slot executado é imutável e não é reatribuído.

### SPEC-MEDIA-003 — Unidade atômica

A unidade atômica vigente é uma exibição de 15 segundos. Formatos maiores DEVEM ser compostos por unidades/Slots compatíveis, preservando prova e preço por unidade. A tolerância técnica exata permanece `OPEN-004`.

### SPEC-MEDIA-004 — Player e Canvas

Player controla sessão, timeline, frames, decode, transições, live, PIP, legendas e preempção de emergência. Canvas compõe Regions, Layers, z-index, Safe Areas, templates, QR e widgets. Player/Canvas não conhecem regra financeira nem materializam Evidence.

PlayerSession segue `IDLE → PREPARING → PLAYING → COMPLETED`, com caminhos `DEGRADED`, `FAILED` e `PREEMPTED`. Conclusão exige duração, checksums e versões aplicáveis.

## 7. Pricing

### SPEC-PRICE-001 — Cálculo

Pricing Engine DEVE calcular `PricingQuote` antes da alocação, usando somente fatores permitidos e versionados: preço base, oferta, demanda, horário, perfil/categoria do Venue, região/distância, telemetria com confiança suficiente, ocupação, performance histórica, ROI, sazonalidade e floor/ceiling.

IA pode recomendar; `PricingPolicy` determinística decide. O quote DEVE registrar valor calculado/final, inputs normalizados, fatores, política, algoritmo, timestamp e validade. Após `PriceApplied`, o quote é imutável.

### SPEC-PRICE-002 — Orçamento

Pricing, Slot Allocation e execução só podem consumir `AvailableBudget`. `ContractValue` é valor contratado e NUNCA saldo consumível.

## 8. Pipeline de execução e prova

### SPEC-EVID-001 — Objetos distintos

```text
PlaybackEvent → PlaybackSignature → Evidence Builder
→ EvidenceRecord PENDING_VALIDATION → Evidence Validator → EvidenceRecord VALID
→ CanonicalEvidencePackage → hash → QuantumAnchor
```

- Edge possui `PlaybackEvent` e `PlaybackSignature`.
- Cloud possui `EvidenceRecord` e `CanonicalEvidencePackage`.
- Quantum possui `QuantumAnchor`.

Edge NUNCA cria Evidence nem atribui `VALID`. Quantum NUNCA recebe PlaybackEvent.

### SPEC-EVID-002 — Conteúdo mínimo

EvidenceRecord DEVE correlacionar TV, Campaign, Slot, timestamp, duração, Creative Asset, preço calculado/final/cobrado, fatores dinâmicos, impostos, split e percentuais, versões de políticas/algoritmo, telemetria aplicável, `EvidenceConfidence`, Playback/Creative Checksum e versões de Player, Edge, modelo e OS.

### SPEC-EVID-003 — Validação e imutabilidade

Evidence Validator DEVE verificar assinatura, identidade, Slot, janela, duração, checksums, versões, quote e unicidade. Lifecycle: `BUILDING → PENDING_VALIDATION → VALID` ou `INVALID/DISPUTED`; correção de válido ocorre somente por `REVERSED`. Settlement só consome `VALID`, não revertido e ancorado.

### SPEC-EVID-004 — Pacote canônico

CanonicalEvidencePackage é independente de PDF, JSON, CBOR, Protobuf ou outro transporte. Quantum conhece somente representação/hash permitido, nunca formato de aplicação, Campaign, anunciante ou pessoa.

## 9. Quantum, QR e NFC

Quantum é camada de prova institucional e consulta pública. NUNCA é rail financeiro.

QR pertence ao Cloud e contém somente token opaco; NUNCA contém destino final ou URL de anunciante. O Cloud resolve o token no instante da consulta. NFC/QR seguem: usuário → Quantum/consulta pública → Mostarda Link Resolver → referência ativa no instante → histórico permanente permitido. Edge apenas renderiza QR e não resolve NFC.

## 10. Settlement e direitos financeiros

### SPEC-SETTLE-001 — Responsabilidade

Settlement consolida Evidence Records elegíveis, calcula valor líquido distribuível, aplica `SplitPolicyVersion` e cria cinco direitos financeiros. Ele NÃO executa pagamento, NÃO mantém Wallet e NÃO instrui Asaas.

### SPEC-SETTLE-002 — SplitShare

Cada SplitShare possui ciclo próprio: `PENDING → READY → CREDITED`, com caminhos `BLOCKED` e `UNCLAIMED`. `CREDITED` significa direito encaminhado/materializado no Partner Ledger, não pagamento. Uma parcela bloqueada não paralisa as demais.

## 11. Financial Platform

### SPEC-FIN-001 — Fluxos independentes

```text
Entrada: Asaas → PaymentLedger → CampaignBudget.AvailableBudget → Pricing / Slot
Saída:   Settlement right → PartnerLedger → PartnerWallet → Withdrawal → Asaas
```

Entrada de receita e saída de repasse são fluxos independentes e correlacionáveis.

### SPEC-FIN-002 — Pagamento e CampaignBudget

Somente `PaymentCompensated` aumenta AvailableBudget. Pagamentos aguardando, compensando, disputados, cancelados, inadimplentes ou falhos não autorizam consumo.

Em cartão, a taxa do provider é adicionada à cobrança do Advertiser e NUNCA reduz ContractValue/AvailableBudget. A Mostarda NÃO antecipa recebíveis. Em parcelamento, cada parcela compensada aumenta orçamento; saldo esgotado pausa a Campaign, e nova compensação pode permitir retomada.

CampaignBudget DEVE correlacionar o contrato a AvailableBudget, ReservedBudget e ConsumedBudget. A propriedade de ContractValue — referência imutável versus campo do Aggregate — permanece `OPEN-014`. AvailableBudget não pode ser negativo. O instante definitivo de reserva/consumo permanece `OPEN-013`.

### SPEC-FIN-003 — Partner Ledger e Wallet

PartnerLedger é append-only. PartnerWallet é projeção derivada dos saldos `Pending`, `Available`, `Blocked`, `Withdrawable` e `Negative`. Settlement publica direito; Financial Platform cria crédito. Chargeback cria lançamento compensatório e pode gerar saldo negativo, recuperado automaticamente por créditos futuros. A autoridade transacional usada para aprovar saque e a regra de maturação de cada crédito permanecem `OPEN-021` e `OPEN-035`.

### SPEC-FIN-004 — Withdrawal

Todo saque segue WithdrawalPolicy. Política inicial: um saque por parceiro a cada 30 dias e taxa Mostarda fixa de R$2,00. O marco da janela e o efeito de falha/rejeição permanecem `OPEN-023`. A política DEVE admitir futuras versões de mínimo, máximo, janela, dias e taxas sem alterar conceitos do domínio. Withdrawal segue `REQUESTED → APPROVED → BATCHED → EXECUTING → EXECUTED`, com `REJECTED` e `FAILED/retry` válidos; lifecycle final de WithdrawalBatch permanece `OPEN-024`.

## 12. Insurance

Insurance é Bounded Context próprio. Aggregates mínimos: InsuranceFund/Ledger, Policy, Premium, Reserve, Claim, Repair, Replacement, Coverage, Settlement e History.

Elegibilidade de claim exige TV identificada, policy ativa, vigência, carência cumprida, prêmio adimplente e evento coberto. Fundo registra entradas, reservas, aplicações/rendimentos quando aprovados, saídas e auditoria append-only. Claim segue `FILED → UNDER_REVIEW → APPROVED/DENIED`; aprovado segue para reparo/reposição e settlement próprio. Insurance Settlement não é Settlement de mídia.

## 13. TV Network e Edge operacional

### SPEC-TV-001 — Fronteira

TV Network é dono de TV/Device identity, instalação, provisionamento, Edge operacional, capability, heartbeat, health, maintenance, update, rollback, inventory e Fleet. Sua responsabilidade termina na disponibilidade operacional. Ele NUNCA conhece Campaign, anúncio, preço, Financial, Evidence ou Settlement.

### SPEC-TV-002 — Identidade e lifecycle

TVIdentifier é permanente e não reutilizável; dispositivos substituíveis possuem suas próprias identidades e vínculos históricos. Registro, instalação aceita, provisionamento, capability e health são gates obrigatórios antes de `ACTIVE`. A ordem normativa exata entre instalação e provisionamento permanece `OPEN-011` porque documentos atuais divergem. Depois de ativa, a TV pode alternar `ACTIVE ↔ SUSPENDED`, entrar em `MAINTENANCE` e termina em `DECOMMISSIONED`. Substituição cria novo vínculo e preserva o dispositivo anterior.

### SPEC-TV-003 — Estado e reconciliação

- DesiredState: intenção versionada do Cloud.
- CurrentState: declaração do Edge.
- ObservedState: derivação independente do Cloud a partir de heartbeat, health, conectividade e confirmações.

Reconciler compara os três e somente emite Commands válidos. NUNCA altera Aggregate diretamente.

### SPEC-TV-004 — Capability

TVCapability é declarativa, versionada, com identidade, owner, health e manifesto. É independente de Facets. Capability degradada não anuncia disponibilidade. Facets, quando aplicáveis, são pequenas, isoladas, substituíveis, versionadas e hot-swappable, sem estado/dependência direta compartilhados.

### SPEC-TV-005 — Health e updates

Health observations são append-only; HealthScore é derivado e explicável. Ausência de heartbeat gera `UNKNOWN`/gap, não estado saudável. Atualização exige assinatura, compatibilidade, política, MaintenanceWindow, rollout em ondas e health gate. Rollback é nova transição e NUNCA apaga histórico.

Versões de Edge, Player, Canvas, Capability Manifest, OS e Firmware acompanham Current/Observed State e updates.

## 14. AI e Grão

Grão é produto conversacional pessoal, não apenas agente. Possui identidade/apelido, personalidade, memória consentida e corrigível, preferências, primeira experiência, explicabilidade e evolução relacional.

AI Orchestration segue: Intent → Context Assembly → Knowledge/Memory retrieval → Prompt Pipeline → Agent Workflow/Tools → Policy Gate → Explanation → Recommendation/Command delegado.

Agentes NÃO alteram diretamente outro contexto. Tools possuem escopo mínimo, autorização e auditoria. Toda execução preserva versões, fontes, memórias usadas, ferramentas, custo, confiança e explicação. Local AI executa apenas modelo/manifesto homologado e política offline versionada.

## 15. Marketplace e evolução de domínio

Marketplace mantém subdomínios separados: Ads, Influencers, TV Owners e Rentals futuro. Ofertas/propostas não misturam tipos; aceitação solicita ação ao contexto proprietário.

Campaign pode evoluir para Fixed, Programmatic, Auction, National e Regional por política ou novo contexto, preservando Slot, Pricing, Evidence, Settlement e invariantes. Feature flag não substitui Bounded Context.

## 16. Comportamento distribuído

### Commands

Todo Command DEVE declarar nome, Aggregate owner, emissor, pré-condições, invariantes, efeitos, eventos, autorização, auditoria e chave de idempotência. Repetição com a mesma chave retorna o resultado original sem novo efeito.

### Events

Todo Event DEVE estar no passado e carregar `eventId`, tipo, versão, timestamp, produtor, aggregate identity, correlation e causation. Consumo é idempotente; ordering é definido por Aggregate/stream. Retry não recria fato. Compensação é novo evento.

### Sagas

Sagas coordenam compra, provisionamento, exibição, Evidence, Settlement, pagamento/orçamento, saque, seguro, update, emergência e recuperação offline. Cada Saga define participantes, ordem, timeout, retry e compensação; NUNCA decide regra dos Aggregates.

## 17. Auditoria, segurança e privacidade

Toda operação relevante DEVE ser autenticada/autorizada, correlacionável e auditável com ator/sistema, motivo, versões, timestamp e resultado. Chaves locais não saem do dispositivo; comandos remotos e pacotes operacionais são assinados. Dados sensoriais devem ser minimizados e anonimizados na origem. Consentimento é obrigatório quando aplicável.

Os detalhes quantitativos de retenção, classificação de dados, matriz de autorização, rotação de chaves, resposta a incidentes e requisitos LGPD permanecem `OPEN-001`, `OPEN-002` e `OPEN-003`.

## 18. Escalabilidade

Os conceitos centrais DEVEM permanecer os mesmos de 100 a 1.000.000 de TVs. Escala ocorre por particionamento lógico, células/regiões operacionais, processamento idempotente, backpressure, agregação e isolamento; não por quebra dos invariantes.

Ordering mínimo: TVIdentifier para estado/heartbeat, SlotIdentifier para playback/Evidence, SettlementCycle+EvidenceId para direitos, ledger identity para finanças e hash para Quantum.

## 19. Gate de implementação

Antes da implementação de um contexto, devem estar `ACCEPTED`:

1. regras normativas e ownership;
2. Aggregates e invariantes;
3. Commands, Events, State Machines e Sagas relevantes;
4. políticas versionáveis aplicáveis;
5. autorização, auditoria e critérios de idempotência;
6. decisões `OPEN` que bloqueiem comportamento seguro.

API, persistência, mensageria, frameworks e infraestrutura são decisões posteriores e NÃO podem alterar o modelo sem atualizar primeiro esta especificação.

## 20. Decisões abertas

| ID | Decisão pendente | Impacto | Regra provisória |
| --- | --- | --- | --- |
| `OPEN-001` | Retenção e descarte por classe de dado/documento | Legal, storage, auditoria | Preservar fatos auditáveis; não definir prazo por suposição |
| `OPEN-002` | Matriz completa de autorização por papel/command | Segurança e produto | Somente owner e ator explicitamente autorizado |
| `OPEN-003` | Controles formais LGPD, segurança e incidentes | Compliance | Minimização, consentimento e auditoria já obrigatórios |
| `OPEN-004` | Tolerância técnica exata dos 15 segundos | Evidence e Player | Unidade de 15s obrigatória; tolerância não inventada |
| `OPEN-005` | SLO/SLA numéricos de Edge, Evidence, Anchor e financeiro | Operação e seguro | Health/lacunas explícitos; sem número presumido |
| `OPEN-006` | Regras fiscais detalhadas, notas e tratamento tributário | Financial/Settlement | Registrar versões/linhas; validar com especialista |
| `OPEN-007` | Critérios quantitativos de HealthScore e rollout | TV Network | Política versionada e explicável, sem limiar inventado |
| `OPEN-008` | Mínimo/máximo de Withdrawal | Financial Platform | Apenas frequência de 30 dias e taxa R$2 estão aprovadas |
| `OPEN-009` | Fonte e forma de capitalização do Insurance Fund | Insurance | Fundo/ledger separados; não inferir percentual de split |
| `OPEN-010` | Critérios quantitativos de avanço do GTM | Produto | Medir baseline antes de fixar CAC/conversão |
| `OPEN-011` | Ordem canônica entre Installation e Provisioning | TV Network | Ambos são gates obrigatórios antes de ACTIVE |
| `OPEN-012` | Relação formal entre TV identity, Device identity e chave do Edge | TV Network/Security | TV é permanente; dispositivo substituído preserva histórico |
| `OPEN-013` | Instante de reserva e consumo de CampaignBudget | Campaign/Financial/Evidence | Só consumir AvailableBudget; não inferir momento |
| `OPEN-014` | Ownership de ContractValue versus snapshot no CampaignBudget | Campaign/Financial | ContractValue não é saldo; evitar owner duplicado |
| `OPEN-015` | Payment Aggregate versus PaymentLedger e owner de callbacks | Financial Platform | Ledger Entry só nasce de fato compensado |
| `OPEN-016` | Refund/chargeback/disputa após compensação e orçamento já consumido | Financial/Settlement | Somente lançamentos compensatórios |
| `OPEN-017` | Alocação de chargeback/saldo negativo entre participantes | Financial Platform | Não alterar Evidence, Settlement ou SplitShare |
| `OPEN-018` | Contabilização gross/net, taxas por meio e impostos | Financial Platform | Taxa de cartão não reduz orçamento contratado |
| `OPEN-019` | Precisão monetária, moeda, arredondamento e residual do split | Pricing/Settlement/Financial | Split fecha 100%; não inventar precisão |
| `OPEN-020` | Modelo contábil e invariantes de conservação do Ledger | Financial Platform | Append-only e saldo derivado obrigatórios |
| `OPEN-021` | Maturação Pending → Available/Blocked/Withdrawable | Partner Ledger/Wallet | Crédito não implica saque imediato |
| `OPEN-022` | Reserva de saque, momento da taxa e falha/retry/cancelamento | Withdrawal | Novos lançamentos; nunca apagar histórico |
| `OPEN-023` | Semântica exata de “um saque a cada 30 dias” | Withdrawal Policy | Frequência e taxa R$2 aprovadas; marco não definido |
| `OPEN-024` | Lifecycle e reconciliação parcial de WithdrawalBatch | Financial Platform/Asaas | Batch fechado não é reescrito |
| `OPEN-025` | Pagamento parcial/excedente/duplicado e alocação entre Campaigns | Payment/CampaignBudget | Só compensado aumenta saldo |
| `OPEN-026` | Retomada automática quando Campaign tem outros motivos de pausa | Campaign/Financial | Crédito não remove pausa manual/compliance por suposição |
| `OPEN-027` | Matriz completa Command → pré/pós-estado → Event e owner único | Execution Model | Invariantes existentes continuam obrigatórios |
| `OPEN-028` | Separação dos lifecycles Evidence validity e Quantum anchor; reversão tardia | Evidence/Quantum/Financial | São owners distintos; compensação append-only |
| `OPEN-029` | Ordering de PlaybackEvents, gaps e eventos offline atrasados | Edge/Evidence | Idempotência e lacunas explícitas |
| `OPEN-030` | Mesma idempotency key com payload diferente e retenção de chaves | Todos | Nunca produzir segundo efeito silencioso |
| `OPEN-031` | Timeouts, TTLs, retries e SLAs quantitativos de Sagas | Execution/Operations | Regras qualitativas vigentes, números não presumidos |
| `OPEN-032` | Segregação de funções para finanças, reversão, emergência e manutenção | Identity/Contexts | Owner revalida autorização |
| `OPEN-033` | Completar Commands/Events ausentes e remover wildcards | Execution Model | Nenhum evento implícito é contrato de implementação |
| `OPEN-034` | Relação entre Playback attempt e PlayerSession | Player/Execution | Ambos preservam tentativa e fatos, sem owner duplo |
| `OPEN-035` | PartnerWallet como projeção versus autoridade de autorização | Financial Platform | Ledger é a fonte; decisão não usa projeção defasada |

## 21. Documentos normativos relacionados

O mapa de rastreabilidade completo está em [`TRACEABILITY.md`](./TRACEABILITY.md), o registro de decisões em [`DECISION_REGISTRY.md`](./DECISION_REGISTRY.md) e o processo de sincronização em [`CONSISTENCY_RULES.md`](./CONSISTENCY_RULES.md).
