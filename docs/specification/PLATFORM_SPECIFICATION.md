# Especificação Oficial da Plataforma Mostarda

- **Identificador:** `MOSTARDA-PLATFORM-SPEC`
- **Versão:** `0.2.0-draft`
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
| Configuration Service | Distribuição de parâmetros e versões aprovadas | Criar regra de negócio, owner ou default implícito |

Contextos NÃO DEVEM ler ou alterar armazenamento de outro contexto. Colaboração ocorre por Commands ao owner, Events ou contratos públicos conceituais. Integrações externas DEVEM passar por anti-corruption boundary.

### Por que estes limites existem

Os limites não são organização de pastas. Eles impedem que uma decisão seja tomada por quem não possui seus invariantes. Se Campaign consultasse diretamente Payment, poderia confundir um pagamento recebido com dinheiro compensado. Se Settlement pagasse, uma falha externa poderia reabrir um cálculo de direitos já encerrado. Se TV Network conhecesse Campaign, disponibilidade física passaria a depender de regra comercial. Se Quantum recebesse PlaybackEvent, a camada institucional passaria a conhecer detalhes que não precisa provar.

A alternativa de um modelo central compartilhado foi descartada porque produziria owner ambíguo, transações distribuídas implícitas e correções destrutivas. A regra vigente é: cada contexto decide somente o que pode provar com o próprio estado; os demais reagem a fatos ou solicitam uma decisão ao owner.

## 6. Modelo central de mídia

### SPEC-MEDIA-001 — Campaign

Campaign representa a intenção contratada de veiculação e pertence a um Advertiser. DEVE possuir ao menos um Creative Asset aprovado, janela válida e `CampaignBudget` com saldo disponível para gerar/reservar Slot.

Lifecycle normativo: `DRAFT → READY → PUBLISHED → ACTIVE ↔ PAUSED → COMPLETED`, com saídas válidas para `CANCELLED` ou `EXPIRED`. Estados finais não retornam. Pausa por orçamento NÃO invalida Slots já executados.

### SPEC-MEDIA-002 — Slot

Slot referencia exatamente uma Campaign, uma TV, um Creative Asset, uma janela de playback e um PricingQuote congelado. Lifecycle: `ALLOCATED → DISPATCHED → DELIVERED → EVIDENCED`, ou `ALLOCATED → REVOKED/EXPIRED`. `DISPATCHED` confirma aceite da distribuição pelo Edge; `DELIVERED` confirma playback. Slot executado é imutável e não é reatribuído.

### SPEC-MEDIA-003 — Unidade atômica

A unidade atômica vigente é uma exibição de 15 segundos. Formatos maiores DEVEM ser compostos por unidades/Slots compatíveis, preservando prova e preço por unidade. A tolerância técnica exata permanece `OPEN-004`.

### SPEC-MEDIA-004 — Player e Canvas

Player controla sessão, timeline, frames, decode, transições, live, PIP, legendas e preempção de emergência. Canvas compõe Regions, Layers, z-index, Safe Areas, templates, QR e widgets. Player/Canvas não conhecem regra financeira nem materializam Evidence.

PlayerSession segue `IDLE → PREPARING → PLAYING → COMPLETED`, com caminhos `DEGRADED`, `FAILED` e `PREEMPTED`. Conclusão exige duração, checksums e versões aplicáveis.

### SPEC-MEDIA-005 — Produto comercial

A Mostarda NÃO vende Campaign pronta, pacote fixo, circuito fechado, audiência garantida, alcance mínimo ou quantidade fixa de exibições. O Advertiser compra capacidade financeira de acesso ao inventário e decide como consumi-la em Slots independentes.

Campaign é o instrumento de estratégia e governança desse consumo. O Advertiser pode operar manualmente, aceitar recomendações ou delegar otimização ao Grão dentro de mandato explícito. A decisão final permanece com o Advertiser.

### SPEC-MEDIA-006 — Garantia e estimativas

A Mostarda garante comprovação de execução, transparência, rastreabilidade, auditoria e dados reais observados. Estimativas de audiência, preço e ocupação DEVEM ser identificadas como estimativas e NUNCA apresentadas como garantia.

Falha operacional sem exibição válida NÃO consome definitivamente o orçamento da obrigação. O valor liberado DEVE ser procurado para realocação compatível antes de permanecer como saldo disponível.

### SPEC-MEDIA-007 — Concorrência de Slot

Quando duas Campaigns disputam a mesma oportunidade, vence a primeira que obtiver budget disponível, reserva financeira aceita e reserva de Slot aceita na ordem autoritativa dos owners. Não existe prioridade por maior preço nem intervenção manual.

Ordem de confirmação determina aquisição. Ocupação determina preço de oportunidades posteriores. Slot já reservado NUNCA é reprecificado.

### SPEC-MEDIA-008 — Underdelivery e realocação

Falha de exibição NÃO encerra a obrigação nem gera refund automático. O owner libera a reserva por fato explícito; Campaign Management procura novo Slot compatível e cria nova identidade, Quote e reserva.

Compatibilidade considera restrições, janela, localização, perfil estimado de audiência, categoria, capacidade e preço equivalente ou inferior. Tolerâncias pertencem à `SlotEquivalencePolicy` versionada. Saldo só permanece ocioso quando não existe candidato autorizável.

### SPEC-MEDIA-009 — Overdelivery

Exibição excedente causada por concorrência, retry, duplicidade ou falha da plataforma NUNCA é cobrada do Advertiser. O fato físico permanece auditável; Evidence válida remunera o parceiro normalmente e a Mostarda financia integralmente o direito.

### SPEC-MEDIA-010 — Cancelamento

O Advertiser pode cancelar a Campaign. Exibições comprovadas permanecem faturadas; consumo reconhecido não é apagado; reservas liberáveis e saldo não consumido entram no fluxo financeiro de devolução. Retenção ou replanejamento podem ser oferecidos, mas não podem impedir o cancelamento.

Cancelamento é imediato antes de qualquer Slot `DISPATCHED`. Depois disso, publica `CampaignCancellationRequested`, revoga Slots ainda revogáveis, reconcilia os irreversíveis e somente então publica `CampaignCancelled`.

Campaign decide o encerramento comercial. Financial Platform mantém crédito interno por padrão e executa refund ao meio original quando solicitado, elegível e compatível com a legislação.

### SPEC-MEDIA-011 — Creative e autoridade

O Advertiser é responsável pelo conteúdo. A Mostarda valida conformidade e não assume autoria. IA pode decidir somente quando regra objetiva e limiar de confiança aprovados permitirem; dúvida, baixa confiança, falta de dados ou conflito exigem revisão humana.

Creative que perde elegibilidade pausa novas alocações, notifica o Advertiser e exige nova revisão. Após aprovação, remove-se apenas a causa editorial; a execução continua se nenhuma outra causa de pausa permanecer.

### SPEC-MEDIA-012 — Criação, revisão e início de execução

Campaign nasce `DRAFT` somente com Advertiser, nome, objetivo, moeda, país, responsável e data. Todos os campos são editáveis no draft. READY congela revisão operacional; PUBLISHED e ACTIVE nunca sofrem mutação operacional in place.

Ativação comercial ocorre automaticamente no início da janela e publica `CampaignActivated`. A primeira reserva de Slot publica, uma única vez, `CampaignExecutionStarted`.

### SPEC-MEDIA-013 — Políticas operacionais

Grace periods, confiança de IA, SLA de moderação, equivalência de realocação e organização de Slots consecutivos pertencem a políticas operacionais versionadas. Configuration Service distribui versões aprovadas. Cada decisão preserva valores e policy versions; nenhum parâmetro é hardcoded e mudança nunca reinterpreta fato histórico.

### SPEC-MEDIA-014 — Responsabilidade e overdelivery

Toda perda recebe exatamente um responsável entre Advertiser, Edge Partner, Mostarda e Terceiro Integrado, com justificativa, evidências e auditoria. Responsabilidade compartilhada é proibida.

Se overdelivery possuir Evidence válida, parceiro recebe normalmente; Advertiser não é debitado e Mostarda financia integralmente o direito. Governance & Dispute Management é a única autoridade que julga e publica a responsabilidade; os demais contextos somente publicam fatos e executam consequências autorizadas.

### SPEC-MEDIA-015 — Autorização

Advertiser mantém autoridade final. Grão recomenda e otimiza, mas não publica, cancela, gasta ou altera sem consentimento explícito. IA analisa; conteúdo duvidoso exige humano. Moderador decide conformidade. Financial Platform governa budget/refund sem alterar lifecycle. Campaign é único owner de seus estados.

## 7. Pricing

### SPEC-PRICE-001 — Cálculo

Pricing Engine DEVE calcular `PricingQuote` antes da alocação, usando somente fatores permitidos e versionados: preço base, oferta, demanda, horário, perfil/categoria do Venue, região/distância, telemetria com confiança suficiente, ocupação, performance histórica, ROI, sazonalidade e floor/ceiling.

IA pode recomendar; `PricingPolicy` determinística decide. O quote DEVE registrar valor calculado/final, inputs normalizados, fatores, política, algoritmo, timestamp e validade. Após `PriceApplied`, o quote é imutável.

Cada Venue DEVE possuir preço base e mínimo aplicável. Maior ocupação aumenta o preço e menor ocupação pode reduzi-lo, nunca abaixo do mínimo. Não existe leilão manual, negociação individual ou prioridade de inventário por preço.

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

Essa separação existe porque execução física, validação probatória e ancoragem institucional possuem autoridades, tempos e modos de falha diferentes. Fazer o Edge produzir a Evidence final permitiria que o mesmo componente que afirma ter executado também julgasse a própria afirmação. Fazer Quantum receber fatos brutos ampliaria exposição de dados e acoplaria a prova institucional ao modelo operacional. Ambas as alternativas são proibidas.

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

Settlement existe para transformar prova elegível em direitos determinísticos e reproduzíveis. Pagamento é uma operação externa, assíncrona e sujeita a indisponibilidade, timeout, devolução e reconciliação. Unir cálculo e pagamento faria uma falha do provider alterar o lifecycle do cálculo, dificultaria replay e prenderia o domínio a um executor financeiro. A alternativa “calcular e pagar cada SplitShare no mesmo Aggregate” foi descartada. Settlement termina quando os direitos foram estabelecidos; Financial Platform decide como materializá-los e movimentá-los.

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

`Payment` é o Aggregate proprietário do lifecycle da cobrança: `CREATED → PENDING → RECEIVED → COMPENSATING → COMPENSATED`, com saídas `CANCELLED`, `OVERDUE`, `DISPUTED` e `FAILED`. O adapter externo informa fatos ao Payment; ele não escreve no PaymentLedger. Ao confirmar `COMPENSATED`, Payment publica `PaymentCompensated`. Um consumidor financeiro emite `PostPaymentLedgerEntry` ao PaymentLedger; após o lançamento ser aceito, outro Command aumenta CampaignBudget. Essa sequência preserva owner único e consistência eventual.

Duplicidade do callback externo é deduplicada pela identidade do pagamento, tipo de fato e revisão externa. Callback fora de ordem é registrado para auditoria, mas só causa transição se a máquina permitir. Confirmação tardia de pagamento já cancelado/disputado não libera saldo automaticamente: abre reconciliação financeira.

CampaignBudget representa a capacidade financeira autorizada para execução. Campaign NÃO consulta Payment, Asaas ou Ledger e NÃO calcula saldo. Campaign Management solicita `AuthorizeBudgetReservation` ao CampaignBudget, que responde por fato `BudgetReservationAuthorized` ou `BudgetReservationRejected`.

A reserva existe para impedir que duas alocações prometam o mesmo dinheiro durante a janela entre seleção e prova. Debitar somente depois da exibição permitiria sobrealocação; consumir definitivamente antes da prova cobraria uma entrega ainda não demonstrada. Por isso, autorização, reserva e consumo são decisões distintas do mesmo Aggregate financeiro.

O Aggregate possui uma referência imutável ao ContractValue pertencente à Campaign e mantém os buckets financeiros:

- `AvailableBudget`: valor compensado, não reservado e não consumido;
- `ReservedBudget`: soma de reservas ativas, vinculadas individualmente a Slots;
- `ConsumedBudget`: valor confirmado por Evidence válida e ancorada;
- `ReleasedBudget`: histórico derivado de reservas liberadas, nunca saldo adicional independente.

Regras de reserva:

1. A reserva ocorre antes de `SlotAllocated` e corresponde exatamente ao valor congelado do PricingQuote.
2. Um Slot possui no máximo uma reserva ativa e uma reserva pertence a exatamente um Slot.
3. A unidade de reserva é indivisível: saldo insuficiente rejeita a reserva inteira; não há reserva parcial do mesmo Slot.
4. Reservas concorrentes são decididas serialmente pelo CampaignBudget com revisão esperada. Apenas uma transição pode consumir a mesma disponibilidade; concorrente com revisão obsoleta deve reler o estado e tentar novamente, sem assumir autorização.
5. Reserva autorizada move valor de Available para Reserved sem alterar o total compensado.
6. Revogação ou expiração anterior ao playback libera a reserva por evento compensatório.
7. Conclusão do playback não consome definitivamente o valor. A reserva permanece até Evidence válida e ancorada.
8. Evidence válida e ancorada converte Reserved em Consumed de modo idempotente por Slot/Evidence.
9. Evidence inválida, expirada ou definitivamente rejeitada libera a reserva conforme `BudgetReservationPolicy`.
10. Reversão após consumo não edita o consumo: cria ajuste financeiro compensatório e segue a política de refund/chargeback.

Toda reserva possui `reservationId`, Campaign, Slot, PricingQuote, valor, moeda, revisão, `expiresAt` derivado da janela do Slot e `BudgetReservationPolicyVersion`. O intervalo numérico adicional para processamento tardio é política versionada; ausência de valor aprovado não autoriza reserva infinita.

AvailableBudget nunca é negativo e a igualdade de conservação deve permanecer verdadeira:

`total compensado + ajustes de crédito = available + reserved + consumed + ajustes de débito`.

Protocolo normativo:

| Intenção | Emissor permitido | Owner/decisão | Resultado |
| --- | --- | --- | --- |
| Autorizar reserva | Saga de alocação, após quote válido | CampaignBudget revalida Campaign, Slot, quote, saldo, revisão e unicidade | `BudgetReservationAuthorized` ou `BudgetReservationRejected` |
| Liberar reserva | Saga de alocação por falha/revogação; Saga de Evidence por rejeição definitiva; recuperação financeira autorizada | CampaignBudget verifica reserva ativa e motivo correlacionado | `BudgetReservationReleased`; repetição não libera duas vezes |
| Expirar reserva | Política temporal do CampaignBudget | CampaignBudget compara prazo, estado e revisão; relógio do chamador não é autoridade | `BudgetReservationExpired`; Slot ainda não executado torna-se inelegível |
| Consumir reserva | Saga de Evidence, somente após validade e ancoragem confirmadas | CampaignBudget correlaciona Slot, Evidence e valor reservado | `BudgetReservationConsumed`; repetição da mesma Evidence retorna o primeiro resultado |

`BudgetReservationAuthorized` perdido no transporte não autoriza a Saga a criar uma segunda reserva. Ela repete o mesmo Command/idempotency key ou consulta o resultado correlacionado. Se a reserva foi autorizada e `AllocateSlot` falha, a Saga emite `ReleaseBudgetReservation`; não altera buckets diretamente. Se a liberação falha por indisponibilidade, a reserva permanece ativa e não volta a Available até confirmação ou expiração válida.

Exemplo válido: um Slot de R$3,27 recebe quote congelado, reserva integral de R$3,27 e somente depois é alocado. A Evidence válida e ancorada converte exatamente R$3,27 em consumo.

Contraexemplo proibido: dois allocators leem R$5,00 disponíveis, criam Slots de R$4,00 e “acertam o saldo depois”. O CampaignBudget deve serializar as decisões; apenas uma reserva pode ser aceita.

### SPEC-FIN-003 — Partner Ledger e Wallet

PartnerLedger é append-only. PartnerWallet é projeção derivada dos saldos `Pending`, `Available`, `Blocked`, `Withdrawable` e `Negative`. Settlement publica direito; Financial Platform cria crédito. Chargeback cria lançamento compensatório e pode gerar saldo negativo, recuperado automaticamente por créditos futuros.

PartnerWallet não autoriza saque por si. Ela apresenta uma leitura. `RequestWithdrawal` deve solicitar ao PartnerLedger uma reserva transacional do saldo withdrawable usando a revisão do Ledger. Se a revisão estiver obsoleta, se houver saldo negativo ou se outro saque tiver reservado o valor, a solicitação é rejeitada ou reavaliada. Isso impede duas retiradas concorrentes do mesmo crédito.

Um `PartnerLedgerCredit` nasce `PENDING`. A política de maturação decide `AVAILABLE` ou `BLOCKED` a partir de elegibilidade, disputa e retenção. A mudança de bucket produz novo fato; não altera o lançamento original. Crédito futuro primeiro compensa NegativeBalance e somente o excedente pode tornar-se withdrawable.

### SPEC-FIN-004 — Withdrawal

Todo saque segue WithdrawalPolicy. Política inicial: um saque por parceiro a cada 30 dias e taxa Mostarda fixa de R$2,00. A política DEVE admitir futuras versões de mínimo, máximo, janela, dias e taxas sem alterar conceitos do domínio. Withdrawal segue `REQUESTED → APPROVED → BATCHED → EXECUTING → EXECUTED`, com `REJECTED` e `FAILED/retry` válidos.

Para esta versão draft, a janela de 30 dias é contada a partir do último `WithdrawalExecuted` bem-sucedido. Rejeição ou falha que não movimentou dinheiro não reinicia a janela. Apenas um Withdrawal não terminal pode existir por PartnerAccount. A taxa é reservada junto ao valor solicitado e debitada somente quando a execução é confirmada; falha definitiva libera valor e taxa reservados por novos lançamentos.

WithdrawalBatch segue `OPEN → SEALED → SUBMITTED → RECONCILING → CLOSED`. Depois de `SEALED`, membros e valores não mudam. Resultado parcial pertence a cada Withdrawal; o Batch só fecha quando todos os itens estão em estado terminal ou explicitamente destacados para novo Batch. Reenvio usa a mesma identidade da tentativa externa quando o resultado é desconhecido; uma nova tentativa só é criada após confirmação de que a anterior não movimentou valor.

## 12. Insurance

Insurance é Bounded Context próprio. Aggregates mínimos: InsuranceFund/Ledger, Policy, Premium, Reserve, Claim, Repair, Replacement, Coverage, Settlement e History.

Elegibilidade de claim exige TV identificada, policy ativa, vigência, carência cumprida, prêmio adimplente e evento coberto. Fundo registra entradas, reservas, aplicações/rendimentos quando aprovados, saídas e auditoria append-only. Claim segue `FILED → UNDER_REVIEW → APPROVED/DENIED`; aprovado segue para reparo/reposição e settlement próprio. Insurance Settlement não é Settlement de mídia.

## 13. TV Network e Edge operacional

### SPEC-TV-001 — Fronteira

TV Network é dono de TV/Device identity, instalação, provisionamento, Edge operacional, capability, heartbeat, health, maintenance, update, rollback, inventory e Fleet. Sua responsabilidade termina na disponibilidade operacional. Ele NUNCA conhece Campaign, anúncio, preço, Financial, Evidence ou Settlement.

O contexto existe para responder uma pergunta exclusivamente operacional: “este equipamento identificado está apto a cumprir uma intenção autorizada?”. Ele não responde “qual conteúdo deve ser vendido”, “quanto custa” ou “quem recebe”. Misturar essas decisões faria falha física contaminar contratos comerciais e permitiria que um diagnóstico técnico modificasse regras financeiras.

### SPEC-TV-002 — Identidade e lifecycle

TVIdentifier é permanente e não reutilizável; dispositivos substituíveis possuem suas próprias identidades e vínculos históricos. A sequência canônica é `REGISTERED → INSTALLATION_PENDING → INSTALLED → PROVISIONING → ACTIVE`. A instalação física aceita é pré-condição do provisionamento lógico; capability e health são gates adicionais antes de `ACTIVE`. Depois de ativa, a TV pode alternar `ACTIVE ↔ SUSPENDED`, entrar em `MAINTENANCE` e termina em `DECOMMISSIONED`. Substituição cria novo vínculo e preserva o dispositivo anterior.

`TVIdentifier`, `DeviceIdentifier` e `EdgeInstallationIdentifier` nunca são sinônimos. TV identifica o nó lógico permanente; Device identifica uma peça física; EdgeInstallation identifica uma instalação do runtime vinculada a exatamente um MiniPC durante sua vigência. A credencial operacional pertence à EdgeInstallation. Troca de MiniPC encerra o vínculo e a credencial anteriores e cria nova EdgeInstallation; não transfere a chave antiga nem recria a TV.

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

### SPEC-DIST-001 — Transição e publicação

Uma transição aceita pelo Aggregate e o registro conceitual dos Events resultantes formam uma única decisão de domínio. Indisponibilidade do transporte não desfaz uma transição já confirmada. O Event permanece `PENDING_PUBLICATION` e deve ser tentado novamente até confirmação ou intervenção operacional auditada.

O produtor não publica um novo `eventId` para contornar falha de entrega. O consumidor registra o `eventId` processado antes de confirmar consumo. Se receber o mesmo Event novamente, retorna o resultado do primeiro processamento sem repetir efeito.

O domínio não pressupõe entrega exatamente uma vez, porque essa promessa não pode ser garantida de ponta a ponta entre owners e executores externos. A combinação normativa é publicação durável, entrega repetível e efeito idempotente. Trocar o mecanismo de transporte não pode mudar esse contrato.

### SPEC-DIST-002 — Indisponibilidade do transporte

Quando o mecanismo de entrega estiver indisponível:

1. owners continuam aceitando Commands somente se conseguirem preservar estado e Events pendentes de forma durável;
2. processos que dependem de confirmação remota permanecem em estado intermediário explícito;
3. nenhuma Saga presume sucesso por timeout;
4. backlog é republicado em ordem por stream quando o transporte retornar;
5. limites de backlog, tempo e degradação pertencem a política operacional versionada;
6. ao exceder limite, o contexto reduz ou bloqueia novas operações que ampliariam exposição, sem apagar fatos existentes.

Isso responde ao problema independentemente de qual produto de transporte venha a ser escolhido.

### SPEC-DIST-003 — Ordering e concorrência

Ordering global não é exigido. Cada família define stream:

- Campaign por `CampaignId`;
- Slot e BudgetReservation por `SlotId`;
- Playback por `TVId + PlayerSessionId + attempt`;
- Evidence por `EvidenceId`, correlacionado ao Slot;
- Settlement por `SettlementCycleId`;
- PartnerLedger por `PartnerAccountId + ledgerSequence`;
- TV Network por `TVId` e Device por `DeviceId`.

Event com sequência anterior à última aplicada é duplicado ou atrasado: não regride estado. Gap de sequência pausa apenas o consumidor que exige ordem e solicita recuperação; não inventa evento ausente. Commands concorrentes usam revisão esperada do Aggregate. Revisão obsoleta rejeita a transição com conflito explícito; retry deve reler e reavaliar invariantes.

### SPEC-DIST-004 — Idempotência

Idempotency key é vinculada a owner, Command type, ator/cliente e payload canônico. A mesma chave com payload diferente é `IDEMPOTENCY_CONFLICT`, nunca replay válido. O registro de idempotência deve sobreviver por pelo menos toda a janela em que duplicidade possa causar novo efeito; o prazo quantitativo é política do contexto e não pode ser menor que a retenção operacional/replay relevante.

Retries usam a mesma chave enquanto representam a mesma intenção. Nova decisão humana ou compensação usa nova chave e referencia a intenção anterior por causation.

### SPEC-DIST-005 — Replay e reprocessamento

Replay reapresenta fatos históricos a um consumidor e NÃO cria novos fatos de domínio. Reprocessamento reexecuta uma decisão que falhou antes de produzir efeito confirmado; usa a mesma identidade quando a intenção é a mesma. Se a correção exigir mudar o resultado histórico, deve existir Command compensatório e novo Event.

Um consumidor em replay deve:

1. operar em modo declarado de rebuild/replay;
2. preservar ordering do stream;
3. deduplicar por eventId;
4. impedir integrações externas e efeitos irreversíveis já executados;
5. registrar versão do modelo de leitura e intervalo reprocessado;
6. comparar contagens/hash/resultados antes de promover a nova projection.

### SPEC-DIST-006 — Reidratação e rebuild

Aggregate é reidratado a partir de seu estado durável e histórico necessário, respeitando revisão. Projection é descartável e reconstruível a partir dos Events normativos. Rebuild ocorre em uma nova revisão de projection; a leitura antiga continua disponível até validação e troca atômica conceitual.

Falha de rebuild não altera owners nem Events. Divergência entre projection e Aggregate abre diagnóstico e novo rebuild; jamais corrige o Aggregate com base na projection.

### SPEC-DIST-007 — Timeouts e estado desconhecido

Timeout significa ausência de confirmação, não falha comprovada. A Saga deve consultar/reconciliar o participante ou repetir idempotentemente. Estados `UNKNOWN`, `PENDING_CONFIRMATION` e `RECONCILING` devem ser usados quando o resultado externo é ambíguo. Compensação só ocorre após determinar que não duplicará um efeito já executado.

### SPEC-DIST-008 — Edge offline prolongado

Edge pode operar offline somente dentro de `OfflineOperationPolicy`. Ao exceder a janela autorizada, entra em `QUARANTINED`: mantém diagnóstico, health e conteúdo operacional seguro permitido, mas não aceita novas intenções externas nem declara disponibilidade. O número exato de dias é política versionada; “40 dias” necessariamente excede a janela inicial a ser aprovada e exige reconciliação completa.

Na reconexão, TV Network valida identidade, credenciais, versões, clock drift, Current/Observed State e integridade do backlog. Eventos expirados são preservados e rejeitados com motivo; nunca recebem timestamp novo. O Edge só sai de quarantine após Commands explícitos de reconciliação e health gate.

### Commands

Todo Command DEVE declarar nome, Aggregate owner, emissor, pré-condições, invariantes, efeitos, eventos, autorização, auditoria e chave de idempotência. Repetição com a mesma chave retorna o resultado original sem novo efeito.

### Events

Todo Event DEVE estar no passado e carregar `eventId`, tipo, versão, timestamp, produtor, aggregate identity, correlation e causation. Consumo é idempotente; ordering é definido por Aggregate/stream. Retry não recria fato. Compensação é novo evento.

### Sagas

Sagas coordenam compra, provisionamento, exibição, Evidence, Settlement, pagamento/orçamento, saque, seguro, update, emergência e recuperação offline. Cada Saga define participantes, ordem, timeout, retry e compensação; NUNCA decide regra dos Aggregates.

### Exemplo válido

Duas requisições tentam reservar os últimos R$10 de uma Campaign. Ambas carregam a mesma revisão inicial. A primeira reserva R$10 e avança a revisão. A segunda recebe conflito de revisão, relê saldo zero e publica rejeição. Não há saldo negativo, reserva parcial ou “última escrita vence”.

### Contraexemplo proibido

Um consumidor recebe `PartnerCredited` duas vezes e cria dois créditos porque “a entrega é pelo menos uma vez”. Isso viola idempotência. O segundo recebimento deve ser reconhecido como o mesmo `eventId`, sem novo Ledger Entry.

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

## 20. Governance & Dispute Management

### SPEC-GOV-001 — Owner único do julgamento

Governance & Dispute Management é o único bounded context autorizado a publicar julgamento oficial de responsabilidade. Campaign, Pricing, Campaign Budget, Edge, Evidence, Financial, Settlement, AI e TV Network permanecem owners somente de seus fatos.

### SPEC-GOV-002 — Aggregate e contrato público

`GovernanceCase` é o Aggregate owner. `ResponsibilityDecisionPublished` é o único contrato público de decisão. `ResponsibilityAssigned` e `ResponsibilityReassigned` são proibidos; mudança de conclusão cria nova revision append-only.

### SPEC-GOV-003 — Conteúdo da decisão

Toda ResponsibilityDecision contém decisionId, revision, responsibleParty, responsibilityCategory, severity, confidence decimal `[0.00,1.00]`, exatamente uma policyVersion imutável, decidedBy, decidedAt, reason e evidenceReferences.

Confidence registra somente robustez da conclusão diante da qualidade, completude e consistência das evidências. Não representa probabilidade de culpa ou certeza jurídica, não altera a validade da decisão e nunca controla efeitos de negócio.

### SPEC-GOV-004 — Investigação completa e NONE

Ambiguidade exige revisão humana. `UNKNOWN` é proibido como ResponsibilityCategory. Enquanto party ou category não puderem ser determinadas, o caso permanece INVESTIGATING ou UNDER_REVIEW sem decisão publicada. `NONE` é responsibleParty obrigatório quando nenhum participante do ecossistema puder ser responsabilizado, inclusive em FORCE_MAJEURE comprovada.

### SPEC-GOV-005 — Consequências

Consumidores nunca reinterpretam a decisão. Financial, Settlement, Campaign e demais owners executam consequências por Commands próprios, sempre referenciando decisionId + revision. Reavaliação nunca edita efeitos anteriores; produz compensações append-only.

### SPEC-GOV-006 — Semântica da reavaliação

`ReevaluateGovernanceCase` expressa a intenção de iniciar nova análise e produz `GovernanceCaseReevaluationStarted`, movendo APPEALED para REEVALUATING. Durante REEVALUATING, novas evidências e análise podem ser anexadas. Ao alcançar nova conclusão, `PublishDecision` emite `ResponsibilityDecisionPublished` com nova revision e, depois, `GovernanceCaseReevaluated`, que representa exclusivamente a conclusão consumada e retorna o Aggregate a DECIDED.

GovernanceCaseReevaluated nunca representa início. Commands expressam intenção, States representam processos e Events registram fatos imutáveis.

Os contratos completos estão em [`../governance/GOVERNANCE_DISPUTE_MANAGEMENT.md`](../governance/GOVERNANCE_DISPUTE_MANAGEMENT.md).

## 21. Decisões abertas

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
| `OPEN-016` | Refund/chargeback/disputa após compensação e orçamento já consumido | Financial/Settlement | Somente lançamentos compensatórios |
| `OPEN-017` | Alocação de chargeback/saldo negativo entre participantes | Financial Platform | Não alterar Evidence, Settlement ou SplitShare |
| `OPEN-018` | Contabilização gross/net, taxas por meio e impostos | Financial Platform | Taxa de cartão não reduz orçamento contratado |
| `OPEN-019` | Precisão monetária, moeda, arredondamento e residual do split | Pricing/Settlement/Financial | Split fecha 100%; não inventar precisão |
| `OPEN-020` | Modelo contábil e invariantes de conservação do Ledger | Financial Platform | Append-only e saldo derivado obrigatórios |
| `OPEN-025` | Pagamento parcial/excedente/duplicado e alocação entre Campaigns | Payment/CampaignBudget | Só compensado aumenta saldo |
| `OPEN-027` | Matriz completa Command → pré/pós-estado → Event e owner único | Execution Model | Invariantes existentes continuam obrigatórios |
| `OPEN-028` | Separação dos lifecycles Evidence validity e Quantum anchor; reversão tardia | Evidence/Quantum/Financial | São owners distintos; compensação append-only |
| `OPEN-029` | Ordering de PlaybackEvents, gaps e eventos offline atrasados | Edge/Evidence | Idempotência e lacunas explícitas |
| `OPEN-030` | Prazo quantitativo de retenção de idempotency keys por contexto | Todos | Payload diferente já é conflito; retenção cobre toda a janela de duplicidade relevante |
| `OPEN-031` | Timeouts, TTLs, retries e SLAs quantitativos de Sagas | Execution/Operations | Regras qualitativas vigentes, números não presumidos |
| `OPEN-032` | Segregação de funções para finanças, reversão, emergência e manutenção | Identity/Contexts | Owner revalida autorização |
| `OPEN-033` | Completar Commands/Events ausentes e remover wildcards | Execution Model | Nenhum evento implícito é contrato de implementação |
| `OPEN-034` | Relação entre Playback attempt e PlayerSession | Player/Execution | Ambos preservam tentativa e fatos, sem owner duplo |
## 22. Documentos normativos relacionados

O mapa de rastreabilidade completo está em [`TRACEABILITY.md`](./TRACEABILITY.md), o registro de decisões em [`DECISION_REGISTRY.md`](./DECISION_REGISTRY.md) e o processo de sincronização em [`CONSISTENCY_RULES.md`](./CONSISTENCY_RULES.md).
