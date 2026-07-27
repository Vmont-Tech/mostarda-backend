# Domain Freeze Review V3 — Matriz Atômica de Gates

**Data:** 2026-07-27  
**Commit-base auditado:** `805c117`  
**Estado:** `PARTIAL IMPLEMENTATION AUTHORIZATION`  
**Escopo:** reclassificação arquitetural; nenhuma regra de domínio foi criada, fechada ou reinterpretada.

## 1. Autoridade e critério

A hierarquia utilizada é:

1. decisão aceita e ADR vigente;
2. `PLATFORM_SPECIFICATION.md`;
3. especificação especializada normativa;
4. catálogos e visões consolidadas derivadas.

Enquanto a Specification permanecer `DRAFT`, decisões aprovadas e documentos especializados existentes continuam operacionais, conforme ADR-009 e `CONSISTENCY_RULES.md`.

Cada pendência recebe um único gate somente quando for atômica:

- `DOMAIN_BLOCKER`: falta decidir comportamento de negócio;
- `ARCHITECTURE_BLOCKER`: comportamento existe, mas boundary, owner, produtor ou contrato não é único;
- `PRODUCTION_BLOCKER`: código pode existir em desenvolvimento, mas não operar em ambiente real;
- `DOCUMENTATION_DEBT`: fonte superior já permite determinar a implementação correta.

Pendências mistas são obrigatoriamente decompostas. A classificação de um conjunto nunca é herdada por todos os seus elementos.

## 2. Correções obrigatórias do V2

| Achado | Classificação V2 | Classificação V3 | Fundamento |
| --- | --- | --- | --- |
| DFR-006 — catálogo central de Aggregates | `ARCHITECTURE_BLOCKER` | `DOCUMENTATION_DEBT` | PricingQuote, Payment, UpdateRollout, EdgeInstallation e NetworkInventory já possuem natureza definida nas specs especializadas |
| DFR-007 — ownership global | `ARCHITECTURE_BLOCKER` | `DOCUMENTATION_DEBT` | ADR-008, `DEC-014` e `SYNC-006` estabelecem precedência |
| DFR-002 — 24 OPENs | `DOMAIN_BLOCKER` agregado | decomposto na seção 3 | as decisões pertencem a gates diferentes |
| DFR-004 — SYNCs | `DOCUMENTATION_DEBT` agregado | decomposto na seção 4 | nem todo SYNC possui precedência já resolvida |
| DFR-011 — Sagas | `DOMAIN_BLOCKER` agregado | decomposto na seção 5 | comportamento, ownership e parâmetros não são o mesmo gate |
| DFR-014 — produção/legal/fiscal | `PRODUCTION_BLOCKER` agregado | decomposto entre `OPEN-001/002/003/006/032` | regra fiscal pode alterar comportamento financeiro |

## 3. Matriz individual das decisões abertas

### 3.1 Production Blockers

| OPEN | Assunto | Classificação | Evidência objetiva | Código em desenvolvimento |
| --- | --- | --- | --- | --- |
| `OPEN-001` | retenção e descarte por classe de dado | `PRODUCTION_BLOCKER` | prazo não altera Aggregate; é obrigatório antes de operar storage real | permitido com policy não produtiva |
| `OPEN-002` | matriz completa de autorização por papel/Command | `PRODUCTION_BLOCKER` | owner do Command continua obrigatório e é auditado separadamente; falta autorização operacional completa | permitido sem liberar atores reais |
| `OPEN-003` | LGPD, segurança e incidentes | `PRODUCTION_BLOCKER` | controles formais são requisito de operação real | permitido sem dados reais |
| `OPEN-005` | SLO/SLA numéricos | `PRODUCTION_BLOCKER` | a norma proíbe presumir números, mas mantém tratamento qualitativo de falha/UNKNOWN | permitido com policy configurável não produtiva |
| `OPEN-007` | limiares quantitativos de HealthScore e rollout | `PRODUCTION_BLOCKER` | algoritmo deve consumir policy versionada; falta valor operacional aprovado | permitido sem autorizar rollout real |
| `OPEN-008` | mínimo/máximo de Withdrawal | `PRODUCTION_BLOCKER` | lifecycle, reserva, frequência e taxa estão definidos; faltam limites operacionais | permitido sem saque real |
| `OPEN-030` | retenção quantitativa de idempotency keys | `PRODUCTION_BLOCKER` | conflito de payload e semântica idempotente já estão definidos | permitido; retenção produtiva não certificada |
| `OPEN-031` | timeouts, TTLs, retries e SLAs quantitativos | `PRODUCTION_BLOCKER`, quando não altera lifecycle | tratamento qualitativo já existe; valores não podem ser presumidos | permitido com policies de teste |
| `OPEN-032` | segregação de funções | `PRODUCTION_BLOCKER` | owner transacional não é reaberto; falta controle operacional completo | permitido sem ações reais privilegiadas |

`OPEN-031` deixa de ser apenas produção em qualquer fluxo no qual o valor temporal determine terminalidade, compensação, perda de direito ou criação de nova obrigação. Esses casos pertencem à decisão comportamental específica da Saga, não ao parâmetro genérico.

### 3.2 Domain Blockers

| OPEN | Assunto | Classificação | Comportamento que não pode ser inventado |
| --- | --- | --- | --- |
| `OPEN-004` | tolerância técnica dos 15 segundos | `DOMAIN_BLOCKER` | quando playback observado satisfaz a unidade comercial/probatória |
| `OPEN-006` | regras fiscais, notas e tratamento tributário | `DOMAIN_BLOCKER` | cálculo, retenção, obrigação e lançamentos fiscais |
| `OPEN-009` | capitalização do Insurance Fund | `DOMAIN_BLOCKER` | origem e forma de financiamento do fundo |
| `OPEN-016` | refund/chargeback após consumo | `DOMAIN_BLOCKER` | consequência financeira e cadeia compensatória |
| `OPEN-017` | alocação de chargeback/saldo negativo | `DOMAIN_BLOCKER` | participante/conta que absorve ou recupera a perda |
| `OPEN-018` | gross/net, taxas e impostos | `DOMAIN_BLOCKER` | base econômica e contabilização |
| `OPEN-019` | precisão, moeda, arredondamento e residual | `DOMAIN_BLOCKER` | valor financeiro normativo resultante |
| `OPEN-020` | modelo contábil e conservação | `DOMAIN_BLOCKER` | equações e movimentos que constituem saldo oficial |
| `OPEN-025` | pagamento parcial/excedente/duplicado | `DOMAIN_BLOCKER` | alocação do valor entre obrigações e Campaigns |
| `OPEN-029` | ordering, gaps e eventos offline atrasados | `DOMAIN_BLOCKER` | quando aguardar, invalidar, reprocessar ou declarar lacuna irrecuperável |

### 3.3 Architecture Blockers

| OPEN | Assunto | Classificação | Ambiguidade remanescente |
| --- | --- | --- | --- |
| `OPEN-027` | matriz Command → Aggregate → Event | `ARCHITECTURE_BLOCKER` | owner, contrato e transição ainda não são únicos para todo o catálogo |
| `OPEN-033` | Commands/Events ausentes e wildcards | `ARCHITECTURE_BLOCKER` | contratos públicos não podem ser gerados deterministicamente |

### 3.4 Decisões mistas obrigatoriamente decompostas

#### OPEN-028 — Evidence validity e Quantum anchor

| Subdecisão | Gate |
| --- | --- |
| owners e streams separados para Evidence e QuantumAnchor | `DOCUMENTATION_DEBT` quando a separação já estiver definida por ADR-003/004 e Specification |
| contrato técnico da projeção combinada | `ARCHITECTURE_BLOCKER` se ainda não existir schema único |
| comportamento sob reversão tardia após direito financeiro | `DOMAIN_BLOCKER` |

#### OPEN-034 — PlaybackAttempt e PlayerSession

| Subdecisão | Gate |
| --- | --- |
| cardinalidade e identidade entre Aggregate/entidades | `ARCHITECTURE_BLOCKER` |
| owner dos Commands de retomada/restauração | `ARCHITECTURE_BLOCKER` |
| retomar a mesma tentativa ou criar nova tentativa após interrupção | `DOMAIN_BLOCKER` |
| efeito da interrupção sobre completude da unidade de 15 segundos | `DOMAIN_BLOCKER` |

### 3.5 Item sem gate técnico de Domain Freeze

| OPEN | Assunto | Classificação |
| --- | --- | --- |
| `OPEN-010` | critérios quantitativos de avanço do GTM | `DOCUMENTATION_DEBT` para fins do Domain Freeze |

`OPEN-010` permanece uma decisão de produto aberta. Ela não define Aggregate, Command, Event, invariante, contrato público ou condição técnica de produção da plataforma. A classificação acima não fecha a decisão; apenas a exclui do gate técnico de implementação.

## 4. Matriz dos conflitos SYNC

### 4.1 Documentation Debt por precedência conhecida

| SYNC | Fonte prevalente |
| --- | --- |
| `SYNC-001` | `DEC-001` |
| `SYNC-002` | `OPEN-009`, sem capitalização presumida |
| `SYNC-003` | ADR-007 |
| `SYNC-004` | `DEC-002` |
| `SYNC-005` | `DEC-013` |
| `SYNC-006` | ADR-008 e `SPEC-TV-*` |
| `SYNC-008` | `DEC-010` |
| `SYNC-009` | ADR-007/008 e Specification |
| `SYNC-010` | ADR-007 |
| `SYNC-011` | Settlement fechado é imutável |
| `SYNC-012` | `CampaignCancelled` |
| `SYNC-013` | lifecycle normativo de Evidence |
| `SYNC-015` | `SPEC-FIN-002` |
| `SYNC-016` | Commands distintos para Payment, PaymentLedger e CampaignBudget |
| `SYNC-017` | `SPEC-FIN-004` |

Esses itens exigem sincronização. Não autorizam reabrir a decisão prevalente.

### 4.2 Architecture Blockers

| SYNC | Gate | Motivo |
| --- | --- | --- |
| `SYNC-014` | `ARCHITECTURE_BLOCKER` | Command de emergência ainda não possui owner único; depende de `OPEN-027` |
| parte de `SYNC-018` | `ARCHITECTURE_BLOCKER` | owners/cardinalidade PlayerSession/PlaybackAttempt e contratos Evidence/Anchor |

### 4.3 Domain Blockers

| SYNC | Gate | Motivo |
| --- | --- | --- |
| parte de `SYNC-018` | `DOMAIN_BLOCKER` | retomada da tentativa e reversão tardia dependem de `OPEN-028/034` |

## 5. Matriz das Sagas

Uma Saga não recebe uma classificação única. O gate pertence à decisão ausente.

| Saga/família | Pendência | Gate |
| --- | --- | --- |
| Payment → CampaignBudget | alocação parcial/excedente entre Campaigns | `DOMAIN_BLOCKER` (`OPEN-025`) |
| Campaign cancellation/refund | consequência após valor consumido | `DOMAIN_BLOCKER` (`OPEN-016`) |
| Slot allocation | aliases e catálogo público | `ARCHITECTURE_BLOCKER` (`OPEN-027/033`) |
| Playback/recovery | cardinalidade/owner Attempt↔Session | `ARCHITECTURE_BLOCKER` (`OPEN-034`) |
| Playback/recovery | mesma tentativa versus nova tentativa | `DOMAIN_BLOCKER` (`OPEN-034`) |
| Evidence/Anchor | owners/streams já separados | `DOCUMENTATION_DEBT` onde ADR/Specification já prevalecem |
| Evidence/Anchor | reversão tardia e efeito financeiro | `DOMAIN_BLOCKER` (`OPEN-028`) |
| Withdrawal | valores de timeout/retry que não alteram lifecycle | `PRODUCTION_BLOCKER` (`OPEN-031`) |
| Withdrawal | compensação/chargeback/saldo negativo | `DOMAIN_BLOCKER` (`OPEN-016/017/020`) |
| Emergency | owner dos Commands | `ARCHITECTURE_BLOCKER` (`OPEN-027`) |
| Update rollout | thresholds quantitativos | `PRODUCTION_BLOCKER` (`OPEN-007`) |

## 6. Estado consolidado dos DFRs

| DFR | Veredito V3 |
| --- | --- |
| DFR-001 | `DOCUMENTATION_DEBT` |
| DFR-002 | removido como classificação agregada; substituído pela matriz `OPEN-*` |
| DFR-003 | `DOCUMENTATION_DEBT` |
| DFR-004 | removido como classificação agregada; substituído pela matriz `SYNC-*` |
| DFR-005 | `DOCUMENTATION_DEBT` |
| DFR-006 | `DOCUMENTATION_DEBT` |
| DFR-007 | `DOCUMENTATION_DEBT` |
| DFR-008 | `ARCHITECTURE_BLOCKER` |
| DFR-009 | `DOCUMENTATION_DEBT` |
| DFR-010 | `ARCHITECTURE_BLOCKER` |
| DFR-011 | removido como classificação agregada; substituído pela matriz de Sagas |
| DFR-012 | `DOCUMENTATION_DEBT` para a visão global; decisões locais abertas mantêm seu próprio gate |
| DFR-013 | `DOMAIN_BLOCKER` |
| DFR-014 | removido como classificação agregada; requisitos individualizados |

## 7. Autorização de implementação

Não existe autorização genérica por Bounded Context.

Também não se declara Campaign Management, Pricing Engine, TV Network ou qualquer outro contexto “integralmente liberado” quando parte de seus contratos depende de um gate aberto.

A autorização é por artefato:

- Aggregate com boundary e invariantes fechados;
- Command com owner único;
- Event com produtor e contrato únicos;
- State Machine com transições e terminalidade fechadas;
- Saga sem decisão comportamental ou arquitetural aberta.

Um artefato pode ser implementado quando todas as linhas normativas que o governam estão livres de `DOMAIN_BLOCKER` e `ARCHITECTURE_BLOCKER`.

É permitido implementar:

- componentes internos que satisfaçam os cinco critérios acima;
- infraestrutura genérica que não materialize regra ausente;
- testes de contrato para regras já aceitas;
- policies configuráveis em ambiente de desenvolvimento para valores classificados exclusivamente como `PRODUCTION_BLOCKER`.

É proibido:

- declarar um Bounded Context inteiro liberado com base apenas em seu núcleo;
- gerar contrato público definitivo afetado por `OPEN-027/033`;
- implementar saldo oficial antes de `OPEN-019/020`;
- escolher comportamento para `OPEN-004/006/009/016..020/025/029` ou para as partes de domínio de `OPEN-028/034`;
- escolher owner ou produtor onde houver `ARCHITECTURE_BLOCKER`;
- usar valor de teste como configuração produtiva aprovada.

## 8. Parecer

**Domain Freeze global:** não certificado.  
**Paralisação integral do desenvolvimento:** não requerida.  
**Autorização por Bounded Context completo:** não concedida por este relatório.  
**Autorização por artefato fechado:** concedida, condicionada à verificação de todas as dependências normativas do artefato.  
**Deploy em produção:** bloqueado enquanto houver `PRODUCTION_BLOCKER` aplicável ao fluxo.

O próximo gate não é “liberar um contexto por aproximação”. É demonstrar, para cada artefato a implementar, que nenhuma decisão aberta exige do engenheiro escolher comportamento, ownership, boundary, produtor ou contrato.

