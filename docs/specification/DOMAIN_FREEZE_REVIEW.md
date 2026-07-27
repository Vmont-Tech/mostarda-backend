# Domain Freeze Review — Mostarda

**Data da revisão:** 2026-07-27  
**Commit auditado:** `805c117`  
**Estado:** `CERTIFICATION_REJECTED — FOUNDER DECISIONS REQUIRED`  
**Modo da revisão:** somente leitura sobre o domínio; nenhuma decisão conceitual foi alterada.

## 1. Parecer executivo

O domínio possui fundação estratégica madura, mas ainda não está certificado para geração de contratos técnicos ou implementação integral.

A certificação é recusada neste ciclo porque permanecem decisões abertas estruturais, conflitos de ownership, catálogos centrais incompletos, referências a decisões sem status oficial e contratos financeiros que não fecham conservação monetária, chargeback e autoridade transacional.

O resultado não invalida a arquitetura macro. Ele distingue três situações que não podem ser confundidas:

1. contexto conceitualmente bem delimitado;
2. contexto documentado em profundidade;
3. contexto implementável sem decisão externa.

A plataforma satisfaz amplamente os dois primeiros critérios. Ainda não satisfaz o terceiro de forma global.

## 2. Escopo e evidência

Foram considerados os documentos normativos, ADRs, catálogos de domínio, especificações especializadas, modelos de execução, documentos financeiros, TV Network e Governance.

Inventário auditado:

- 88 documentos Markdown;
- aproximadamente 18 mil linhas;
- 19 Bounded Contexts declarados;
- 9 ADRs;
- catálogos centrais de Aggregates, Commands e Events;
- Sagas, timelines, máquinas de estado e invariantes distribuídas;
- 24 decisões `OPEN-*` presentes na tabela normativa;
- conflitos `SYNC-*` registrados no Decision Registry.

Validação estrutural:

- links Markdown locais quebrados: **0**;
- worktree auditado sem mutações de domínio;
- Governance & Dispute Management sincronizado para `DEC-041` e `DEC-042`;
- Domain Freeze mantido como candidato, não declarado como concluído.

## 3. Bloqueadores de certificação

### DFR-001 — A especificação primária ainda é DRAFT

`PLATFORM_SPECIFICATION.md` e `DECISION_REGISTRY.md` afirmam que a especificação completa permanece `DRAFT` até revisão do fundador. O ADR-009 condiciona sua autoridade definitiva ao aceite.

**Impacto:** não existe base formal para declarar o domínio congelado e, simultaneamente, manter sua fonte normativa principal em estado provisório.

**Proposta técnica:** introduzir estados distintos `DOMAIN_FREEZE_CANDIDATE`, `CERTIFICATION_BLOCKED` e `CERTIFIED`, promovendo a especificação somente após o fechamento dos bloqueadores.

**Aprovação necessária:** sim.

### DFR-002 — Permanecem 24 decisões abertas

Continuam abertas `OPEN-001..010`, `OPEN-016..020`, `OPEN-025` e `OPEN-027..034`.

São estruturalmente bloqueantes:

- autorização por papel e segregação de funções;
- retenção, LGPD, segurança e incidentes;
- tolerância de playback e ordering offline;
- regras fiscais;
- precisão, arredondamento e residual monetário;
- modelo contábil e conservação do Ledger;
- pagamentos parciais, excedentes e duplicados;
- chargeback e alocação de perdas;
- matriz completa Command → Aggregate → Event;
- separação Evidence/Quantum;
- PlaybackAttempt/PlayerSession;
- timeouts, TTLs, retries e retenção de idempotência.

**Impacto:** contratos técnicos exigiriam inventar comportamento.

**Proposta técnica:** classificar cada decisão como `BLOCKING_IMPLEMENTATION`, `BLOCKING_PRODUCTION` ou `POLICY_PARAMETER`, sem fechar nenhuma por inferência.

**Aprovação necessária:** sim, decisão por decisão.

### DFR-003 — Existem decisões referenciadas sem registro aberto ou fechamento rastreável

Os documentos vigentes referenciam `OPEN-011`, `OPEN-012`, `OPEN-013`, `OPEN-015`, `OPEN-022`, `OPEN-024` e `OPEN-035`, mas esses IDs não constam da tabela atual de decisões abertas.

Exemplos:

- ordem Installation/Provisioning: `OPEN-011`;
- identidade TV/Device/EdgeInstallation: `OPEN-012`;
- momento de reserva/consumo do CampaignBudget: `OPEN-013`;
- owner do callback compensado: `OPEN-015`;
- política de falha de Withdrawal: `OPEN-022`;
- lifecycle de WithdrawalBatch: `OPEN-024`;
- autoridade transacional de saque: `OPEN-035`.

Algumas dessas matérias parecem ter sido parcial ou totalmente consolidadas em decisões posteriores, mas o registro não declara a supersessão individual.

**Impacto:** um engenheiro não consegue saber se deve implementar a regra citada, aguardar decisão ou seguir uma norma que a substituiu.

**Proposta técnica:** para cada ID, registrar exatamente um status: `OPEN`, `CLOSED_BY_DEC-XXX` ou `SUPERSEDED_BY_DEC-XXX`.

**Aprovação necessária:** sim.

### DFR-004 — O Decision Registry mantém conflitos bloqueantes

O próprio registro declara que itens `SYNC-*` não marcados como `RESOLVED` continuam bloqueantes. Permanecem divergências em Evidence, QR/Quantum, TV/Edge/Telemetry, Capability/Facets, diagramas, Settlement, Commands, CampaignBudget, Financial, WithdrawalBatch e Player/Evidence/Anchor.

**Impacto:** a precedência normativa existe, mas os documentos consumidos por implementação ainda podem instruir comportamentos incompatíveis.

**Proposta técnica:** sincronização editorial somente depois da aprovação das decisões subjacentes, seguida por verificação automática de termos e ownership.

**Aprovação necessária:** não para correções puramente mecânicas já decididas; sim quando a sincronização exigir escolher semântica ainda aberta.

### DFR-005 — O mapa de Bounded Contexts não coincide com a especificação principal

`BOUNDED_CONTEXTS.md` declara 19 contextos. A tabela central da Specification não representa o mesmo conjunto de forma inequívoca; Governance aparece em seção posterior e outros contextos não possuem presença equivalente.

**Impacto:** não existe lista canônica única para geração de serviços, contratos e ownership.

**Proposta técnica:** eleger uma matriz canônica com `contextId`, nome normativo, responsabilidade, Aggregate roots, upstreams e downstreams.

**Aprovação necessária:** sim para confirmar o conjunto final; sincronização posterior é mecânica.

### DFR-006 — O catálogo central de Aggregates é incompleto

`AGGREGATES.md` não contém todos os roots definidos nas especificações especializadas. Entre as divergências objetivas estão `PricingQuote`, `Payment`, `AdvertiserAccount`, `Installation`, `Fleet`, `UpdateRollout`, `EdgeInstallation` e roots/lifecycles especializados de execução.

Também existem conceitos descritos como Aggregate em um documento e apenas como serviço, projeção ou owner genérico em outro.

**Impacto:** geração de repositórios, streams, comandos e locks produziria estruturas incorretas ou incompletas.

**Proposta técnica:** gerar uma matriz única `Aggregate → Bounded Context → stream → Commands → Events → repository`, validada contra os catálogos especializados.

**Aprovação necessária:** sim quando a natureza do conceito estiver divergente; não para inclusões meramente omitidas e já inequívocas.

### DFR-007 — Ownership global está desatualizado

`OWNERSHIP.md` atribui Telemetry e Device Health ao Edge em pontos onde `BOUNDED_CONTEXTS.md`, ADR-008 e TV Network atribuem autoridade diferente. Também atribui seguro de TV ao TV Network apesar de Insurance ser Bounded Context próprio. Governance não está integralmente representado.

**Impacto:** mais de um contexto pode aceitar Commands ou publicar fatos autoritativos para o mesmo conceito.

**Proposta técnica:** substituir owners genéricos como “Cloud”, “Financial” e “Edge” por `boundedContextId + aggregateType`, mantendo infraestrutura separada de autoridade de domínio.

**Aprovação necessária:** sim para Telemetry/Health e Insurance/TV; Governance já possui decisão aprovada.

### DFR-008 — Commands financeiros possuem owner não determinístico

`FINANCIAL_COMMANDS.md` contém owners descritos como:

- “Aggregate correspondente à operação reconciliada”;
- “ledger financeiro aplicável”;
- `AdvertiserAccount/Payment`.

`FINANCIAL_EVENTS.md` contém produtor `AdvertiserAccount/Payment`.

**Impacto:** viola a regra global de exatamente um Aggregate owner por Command e um produtor autoritativo por Event.

**Proposta técnica:** decompor cada intenção em Commands específicos por Aggregate e ligar efeitos cruzados exclusivamente por Events/Saga.

**Aprovação necessária:** sim para escolher os owners e a decomposição.

### DFR-009 — Contradição interna em responsabilidade

`DEC-037` afirma “exatamente um responsável entre quatro classes”. A norma posterior introduz cinco valores de `ResponsibleParty`, incluindo `NONE`.

`NONE` não é ausência de decisão: representa decisão completa de que nenhum participante do ecossistema é responsável.

**Impacto:** consumidores podem rejeitar um evento válido, interpretar `NONE` como schema desconhecido ou aplicar política incompatível.

**Proposta técnica:** declarar `DEC-037` parcialmente supersedida por `DEC-041` e pela extensão normativa de `ResponsibleParty`; preservar a regra de responsabilidade não compartilhada.

**Aprovação necessária:** sim, por alterar redação de decisão aceita.

### DFR-010 — Catálogos globais e especializados não formam um contrato único

Commands e Events aparecem em `DOMAIN_EVENTS.md`, `execution/*`, `financial/*`, `tv-network/*` e `governance/*`. Os documentos admitem eventos ausentes, aliases, wildcards e sincronização pendente em `OPEN-027/033`.

**Impacto:** não é possível gerar AsyncAPI/Protobuf nem garantir produtor único, consumidor conhecido, ordering e compatibilidade.

**Proposta técnica:** após decisões, produzir um catálogo canônico gerado, rejeitando:

- Event sem produtor único;
- Command sem Aggregate único;
- wildcard de contrato;
- alias sem regra de compatibilidade;
- Event sem schemaVersion e ordering key;
- consumidor que reinterpreta fato do owner.

**Aprovação necessária:** sim para contratos ausentes e aliases; consolidação mecânica depois.

### DFR-011 — Sagas dependem de estados e decisões não fechados

As Sagas de ativação, pagamento, alocação, playback, Evidence/Anchor, saque, seguro, update e emergência referenciam decisões abertas ou órfãs.

Não estão certificados globalmente:

- deadlines;
- ponto de não retorno;
- compensações financeiras;
- resultado externo `UNKNOWN`;
- owner de retry;
- cardinalidade attempt/session;
- encerramento de batch;
- corrida entre reversão de Evidence e Settlement.

**Impacto:** falhas parciais podem criar dupla cobrança, dupla transferência, direito financeiro indevido ou execução obsoleta no Edge.

**Proposta técnica:** certificar cada Saga por tabela temporal contendo trigger, owner, estado persistido, Command, Event, timeout, retry, compensação, ordering e terminalidade.

**Aprovação necessária:** sim para semânticas ainda abertas.

### DFR-012 — State Machines não estão globalmente fechadas

Existem estados cuja terminalidade ou transição depende de decisões não registradas, por exemplo `Withdrawal.FAILED`, `WithdrawalBatch`, Evidence/Anchor e PlaybackAttempt/PlayerSession. Há evento de Insurance ainda descrito como “a sincronizar”.

**Impacto:** estados inalcançáveis, estados sem saída e retries incompatíveis podem ser materializados em código.

**Proposta técnica:** validar automaticamente que todo estado não inicial é alcançável, todo estado não final possui saída válida, toda transição possui Command/Event/owner e nenhum estado final reabre.

**Aprovação necessária:** sim para transições não decididas.

### DFR-013 — Conservação financeira não está demonstrada

`OPEN-020` mantém aberto o modelo contábil e as equações de conservação. Também estão abertas precisão, arredondamento, residual, chargeback, perda, parcial/excedente e regras fiscais.

**Impacto:** Ledger, Wallet, CampaignBudget, Settlement e Withdrawal não podem ser fontes financeiras oficiais com garantia matemática.

**Proposta técnica:** antes de contratos, aprovar:

1. unidade monetária e precisão;
2. regra de arredondamento e residual;
3. equações por ledger;
4. correspondência débito/crédito;
5. tratamento de reserva;
6. chargeback e saldo negativo;
7. reconciliação e correção append-only;
8. identidade idempotente de cada movimento.

**Aprovação necessária:** sim para cada decisão de negócio/contabilidade.

### DFR-014 — Segurança, legal e operação impedem autorização de produção

`OPEN-001..003`, `OPEN-006` e `OPEN-032` deixam sem fechamento retenção, descarte, LGPD, incidentes, tributação, papéis e segregação.

**Impacto:** mesmo código funcional não poderia ser autorizado para produção com operações financeiras, dados pessoais, disputas e ações remotas.

**Proposta técnica:** separar “implementável em ambiente de desenvolvimento” de “certificável para produção”, sem reduzir a natureza bloqueante dessas decisões.

**Aprovação necessária:** sim, com validação jurídica, contábil e de segurança quando aplicável.

## 4. Auditoria por capacidade transversal

| Capacidade | Resultado | Bloqueador principal |
| --- | --- | --- |
| Bounded Contexts | Parcial | conjunto e mapa canônico divergentes |
| Aggregates | Reprovado | catálogo central incompleto |
| Ownership | Reprovado | TV/Edge/Telemetry/Insurance e owners genéricos |
| Commands | Reprovado | owners múltiplos/indeterminados e catálogo aberto |
| Events | Reprovado | produtores ambíguos, aliases e eventos ausentes |
| Sagas | Parcial | boa estrutura, decisões temporais/compensatórias abertas |
| State Machines | Reprovado | terminalidade e transições ainda abertas |
| Event Ordering | Parcial | Aggregate ordering existe; offline/gaps permanecem abertos |
| Invariants | Parcial | base forte; conservação e invariantes distribuídas não demonstradas |
| Financial Invariants | Reprovado | `OPEN-016..020/025` |
| Consistência eventual | Parcial | padrões descritos, contratos críticos incompletos |
| Replay | Parcial | princípio correto; side effects externos exigem catálogo certificado |
| Idempotência | Parcial | sem retenção quantitativa e identidade global completa |
| Versionamento | Parcial | envelope base existe; evolução/compatibilidade não certificada |
| Dependências circulares | Não certificável | mapa de Sagas/contratos ainda não canônico |
| Responsabilidades duplicadas | Reprovado | ownership e Financial Commands |
| Eventos duplicados | Não certificável | catálogos ainda não consolidados |
| Ambiguidade semântica | Reprovado | decisões órfãs e `DEC-037` |
| Contradições documentais | Reprovado | `SYNC-*` bloqueantes |

## 5. Maturidade por Bounded Context

Escala:

- `M4`: semanticamente fechado e próximo de certificação;
- `M3`: profundo, mas bloqueado por contratos transversais;
- `M2`: boundary conhecido, especificação insuficiente;
- `M1`: visão ou capacidade futura, sem contrato implementável.

| Bounded Context | Maturidade | Parecer |
| --- | --- | --- |
| Campaign Management | M4 | lifecycle maduro; bloqueado por budget, pricing, execução e contratos globais |
| Governance & Dispute Management | M4 | modelo interno consistente; bloqueado por `DEC-037` e contratos consumidores |
| Pricing Engine | M3 | cálculo/freeze/versionamento fortes; precisão, autorização e parâmetros abertos |
| Campaign Budget | M3 | buckets e concorrência fortes; instante, conservação e destinos financeiros abertos |
| Financial Platform | M2 | boundary maduro; ledger, chargeback e contabilidade bloqueantes |
| Settlement | M2 | separação de direitos correta; algoritmo e compensações não fechados |
| Evidence Ledger | M3 | replay/dedupe fortes; ordering, invalidação e anchor ainda abertos |
| TV Network | M3 | maior cobertura operacional; ownership, thresholds e recovery incompletos |
| Edge Runtime | M2 | execução offline conhecida; attempt/session, TTL, gaps e trust temporal abertos |
| Telemetry | M2 | função conhecida; owner autoritativo e boundary com Health divergentes |
| User Identity | M2 | identidade conceitual; autorização, KYC/KYB e lifecycle legal incompletos |
| Configuration Service | M2 | papel transversal reconhecido; publicação, rollout, rollback e ownership de policies não certificados |
| Quantum Integration | M2 | boundary claro; contratos de anchor/retry/reversão incompletos |
| Insurance | M1 | contexto separado; funding, claim, reserve, payout e SLA abertos |
| AI Orchestration | M1 | princípios e limites claros; contratos operacionais, falhas, custo e memória incompletos |
| Notifications | M1 | consumidor reconhecido; preferências, entrega, retry e compliance não especificados integralmente |
| Analytics | M1 | consumidor reconhecido; métricas, freshness, rebuild e autoridade não especificados integralmente |
| CRM | M1 | visão de relacionamento; lifecycle e contratos operacionais insuficientes |
| Marketplace | M1 | capacidade estratégica/futura; transações e lifecycle não congelados para implementação |
| Influencer Network | M1 | participação econômica conhecida; onboarding, elegibilidade e lifecycle incompletos |

## 6. Riscos

### Riscos arquiteturais críticos

1. dupla autoridade entre TV Network, Edge Runtime e Telemetry;
2. geração de Commands com owner variável;
3. contratos financeiros sem conservação demonstrável;
4. eventos semanticamente equivalentes com nomes/produtores diferentes;
5. Saga compensando um efeito cujo owner ainda não foi definido;
6. projeção stale autorizando decisão operacional ou financeira;
7. documentação supersedida continuar orientando implementação;
8. domínio “congelado” sem uma lista canônica de artefatos.

### Riscos de implementação críticos

1. dupla cobrança, dupla transferência ou dupla reserva;
2. perda de dinheiro por arredondamento/residual;
3. reprocessamento repetir side effect externo;
4. Edge offline executar Slot ou Command expirado;
5. Evidence tardia produzir direito depois de reversão incompatível;
6. batch encerrar com Withdrawal sem estado terminal;
7. decisão de Governance com `NONE` ser rejeitada por consumidor antigo;
8. código nascer antes da matriz de autorização e precisar ser redesenhado.

## 7. Inconsistências corrigidas neste ciclo

Nenhuma inconsistência conceitual foi corrigida durante esta revisão.

Isso é intencional: o Domain Freeze Candidate proíbe que o auditor transforme recomendação em decisão. A sincronização de Governance já existente no commit auditado foi apenas verificada; não foi reaberta.

Correções estruturais já demonstradas:

- zero links Markdown locais quebrados;
- `OPEN-049` fechado por `DEC-041`;
- reavaliação fechada por `DEC-042`;
- `GovernanceCaseReevaluationStarted` e `GovernanceCaseReevaluated` possuem semânticas temporais distintas;
- `UNKNOWN` não é `ResponsibilityCategory`;
- `NONE` é `ResponsibleParty`;
- decisões de Governance são append-only.

## 8. Decisões exigidas antes de nova certificação

O fundador deve aprovar ou rejeitar, separadamente:

1. status e supersessão de `OPEN-011/012/013/015/022/024/035`;
2. correção de `DEC-037` para reconhecer `NONE`;
3. lista canônica dos Bounded Contexts;
4. ownership Telemetry/Health/TV/Edge;
5. ownership Insurance versus TV Network;
6. natureza e owner de cada Aggregate omitido/divergente;
7. owners dos Commands e Events financeiros ambíguos;
8. decisões ainda abertas da tabela `OPEN-*`;
9. resolução dos `SYNC-*` bloqueantes;
10. matriz canônica de Commands, Events, Sagas e State Machines.

## 9. Gate de certificação

Uma nova revisão só poderá emitir `CERTIFIED` quando:

- não houver decisão estrutural aberta;
- todo `OPEN-*` referenciado possuir status rastreável;
- todo `SYNC-*` bloqueante estiver resolvido;
- todo Command possuir exatamente um Aggregate owner;
- todo Event possuir exatamente um produtor autoritativo;
- todos os Aggregates estiverem no mapa canônico;
- todas as State Machines forem completas e verificáveis;
- todas as Sagas tiverem timeout, retry, compensação e terminalidade;
- conservação financeira estiver formalmente demonstrada;
- contratos entre contextos estiverem versionados;
- testes de consistência do domínio passarem;
- o fundador aprovar explicitamente o relatório final.

## 10. Conclusão normativa da revisão

**Domain Freeze Candidate:** mantido.  
**Domain Freeze oficial:** não concedido.  
**Geração de contratos técnicos:** bloqueada.  
**Geração de código de domínio:** bloqueada.  
**Próxima ação permitida:** decisões do fundador e sincronizações estritamente derivadas dessas decisões.

