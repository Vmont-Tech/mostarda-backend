# Auditoria Arquitetural da Documentação

- **Data-base:** 2026-07-26
- **Escopo:** todos os documentos Markdown versionados em `docs/`
- **Natureza:** parecer de revisão; este arquivo não cria nem substitui decisões de domínio
- **Resultado global:** **REPROVADO PARA IMPLEMENTAÇÃO INTEGRAL**

## 1. Critério de autorização

Um documento é `IMPLEMENTÁVEL` quando um engenheiro sênior consegue implementar o comportamento sob sua responsabilidade sem escolher regra de negócio, owner, transição, concorrência, compensação ou interpretação de falha.

Classificações:

| Resultado | Significado |
| --- | --- |
| `IMPLEMENTÁVEL` | escopo fechado e contratos suficientes |
| `PARCIAL` | parte pode ser implementada, mas há decisões bloqueantes |
| `NÃO IMPLEMENTÁVEL` | decisões estruturais ou conflitos impedem autorização |
| `REFERÊNCIA` | documento cumpre papel informativo/justificativo e não é uma especificação executável isolada |

Severidades:

| Severidade | Significado |
| --- | --- |
| `S0` | permite perda financeira, violação legal, prova inválida ou efeito externo duplicado |
| `S1` | impede implementação determinística ou cria owner/invariante conflitante |
| `S2` | comportamento de exceção, operação ou contrato está incompleto |
| `S3` | rastreabilidade, linguagem ou organização reduz segurança, sem mudar diretamente o domínio |

## 2. Parecer executivo

A arquitetura conceitual é forte, mas a baseline normativa ainda não pode ser autorizada. A Specification está `DRAFT`, o ADR-009 está proposto, documentos anteriores continuam operacionais e o Decision Registry reconhece conflitos não sincronizados. Há 25 famílias de decisões abertas na Specification e 17 conflitos `SYNC-*` registrados.

Os bloqueios mais graves são:

1. O negócio não fecha onboarding, contratos, cancelamento, suspensão, inadimplência, reativação, responsabilidade legal, KYC/KYB, titularidade e encerramento de conta.
2. `PRODUCT_BIBLE.md` contradiz decisões vigentes sobre split, redistribuição, pré-pagamento e capitalização do seguro.
3. Campaign não possui uma especificação própria completa; cancelamento, retomada, expiração e relação Campaign/Slot/Budget permanecem fragmentados.
4. Settlement não possui especificação suficiente do algoritmo, ciclo, reexecução, reversão tardia, impostos e resíduos.
5. O modelo contábil, precisão monetária e conservação de valor do Financial Platform permanecem abertos.
6. Chargeback após consumo de budget ou crédito/saque de parceiros não possui regra de alocação.
7. TV Network possui sobreposição com Edge Runtime e Telemetry sobre heartbeat, update, rollback, saúde e custódia.
8. Health, rollout, operação offline prolongada, TTLs e retries não possuem parâmetros normativos aprovados.
9. O catálogo transversal de Commands/Events ainda reconhece owners, nomes e contratos incompletos.
10. Evidence validity e Quantum anchor ainda possuem lifecycle/reversão tardia não completamente separados.

## 3. Achados bloqueantes

### AUD-S1-001 — Não existe baseline normativa aceita

**Evidência:** `PLATFORM_SPECIFICATION.md` está `DRAFT`; ADR-009 está proposto; `CONSISTENCY_RULES.md` mantém documentos anteriores operacionais durante o draft.

**Impacto:** em conflito, um engenheiro não consegue determinar com segurança se deve implementar o documento anterior aceito ou a regra nova ainda não aceita.

**Fechamento:** aceitar ou rejeitar formalmente a Specification; publicar versão; sincronizar todos os `SYNC-*`; somente então congelar baseline de implementação.

### AUD-S0-002 — Contradições econômicas vigentes

**Evidência:** `PRODUCT_BIBLE.md` chama percentuais de ajustáveis, redistribui parcela ausente, afirma que o anunciante só paga o exibido e capitaliza seguro por exibição. A Specification fixa o split, bloqueia parcela ausente, usa budget compensado e mantém a capitalização do seguro aberta.

**Impacto:** implementações incompatíveis de cobrança, saldo, split, seguro e reconhecimento de receita.

**Fechamento:** decisão explícita para cada regra e sincronização de Product Bible, Financial, Settlement e Insurance.

### AUD-S1-003 — Business lifecycle não especificado

**Ausências:** onboarding por papel, KYC/KYB, aceite contratual, titularidade de TV/local, troca de ownership, cancelamento, suspensão, inadimplência, reativação, encerramento, responsabilidade por conteúdo, responsabilidade fiscal, consentimento e retenção.

**Impacto:** os contextos técnicos não sabem quem pode criar, suspender, transferir ou encerrar os objetos centrais.

**Fechamento:** decisões de negócio e matriz papel × lifecycle × responsabilidade legal, antes de autorizar Identity, CRM, Campaign, TV Network e Financial.

### AUD-S1-004 — Campaign é um Aggregate sem especificação integral

**Evidência:** `CAMPAIGN_MANAGEMENT.md` consolidou o comportamento; `OPEN-031`, `OPEN-033` e conflitos `SYNC-012/015` ainda afetam contratos e parâmetros.

**Ausências:** owner de todos os motivos de pausa, composição dos motivos, política de retomada, expiração, cancelamento e refund, edição concorrente, terminalidade, Slots pendentes, Creative replacement e eventos completos.

**Impacto:** dois engenheiros podem produzir máquinas incompatíveis e efeitos financeiros diferentes.

### AUD-S0-005 — Modelo monetário não fechado

**Evidência:** `OPEN-016..020` e `OPEN-025` deixam abertos chargeback, alocação da perda, gross/net, impostos, precisão, arredondamento, conservação e pagamentos parciais/excedentes.

**Impacto:** saldo, ledger, budget, split e saque podem divergir ou perder valor.

**Fechamento:** modelo de dupla entrada ou alternativa formal, equações por ledger, unidade monetária, rounding mode, conta de residual, política de saldo negativo e cadeia completa de chargeback.

### AUD-S0-006 — Chargeback após execução não possui algoritmo

**Evidência:** Financial preserva fatos e exige compensação, mas não decide quem absorve a perda quando budget foi consumido, parceiro foi creditado ou saque foi executado.

**Impacto:** perda financeira sem owner; possibilidade de reescrever Settlement/Evidence ou produzir saldo negativo arbitrário.

**Fechamento:** política versionada com ordem de recuperação, contas afetadas, limites, bloqueio, cobrança, insolvência e auditoria.

### AUD-S1-007 — Settlement não é implementável

**Evidência:** `REVENUE_ARCHITECTURE.md` é resumido; algoritmo detalhado, impostos, arredondamento, resíduos, reexecução, janela, fechamento, reversão tardia e owner de disputa não estão integralmente especificados.

**Impacto:** direitos financeiros não são reproduzíveis de maneira determinística.

### AUD-S1-008 — Owners sobrepostos em TV/Edge/Telemetry

**Evidência:** `BOUNDED_CONTEXTS.md` atribui heartbeat, update e rollback tanto a TV Network quanto Edge Runtime; Telemetry possui “Edge (produção) / Cloud (custódia)”, contrariando owner único. TV Network inclui health/heartbeat enquanto Telemetry inclui os mesmos conceitos.

**Impacto:** Commands podem ser dirigidos ao Aggregate errado e eventos podem não possuir produtor autoritativo inequívoco.

**Fechamento:** separar fato local, ingestão, avaliação de health, desired state e execução; declarar um owner para cada informação e transição.

### AUD-S1-009 — TV Network oculta decisões abertas

**Evidência:** nenhum documento em `tv-network/` referencia `OPEN-*`, embora a Specification mantenha abertos Health/rollout, SLAs, ordering offline, TTL/retry e segregação operacional.

**Impacto:** documentos parecem completos sem informar ao implementador quais transições não podem receber valores presumidos.

### AUD-S2-010 — Offline prolongado não está fechado

**Ausências:** política para 40 dias offline, expiração de credenciais, validade máxima de fila, comandos obsoletos, versões incompatíveis, rotação de chave, gaps irrecuperáveis, clock trust e reintegração/quarantine obrigatória.

**Impacto:** um Edge antigo pode executar intenção expirada, submeter fatos não ordenáveis ou retornar à frota sem revalidação.

### AUD-S1-011 — Catálogo executável ainda está incompleto

**Evidência:** `OPEN-027`, `OPEN-033`, `SYNC-012..018`; Commands/Events usam contratos pendentes e lifecycles sobrepostos.

**Impacto:** não é possível gerar handlers, testes de contrato ou state machines com cobertura completa.

### AUD-S1-012 — Evidence e Anchor possuem terminalidade ambígua

**Evidência:** `OPEN-028` e `SYNC-018`; validade da Evidence e confirmação de anchor são owners/lifecycles diferentes, mas documentos ainda os projetam de maneira acoplada.

**Impacto:** falha ou reversão de anchor pode reabrir Evidence ou alterar elegibilidade financeira de modo não determinístico.

### AUD-S1-013 — Ordering e gaps de playback estão abertos

**Evidência:** `OPEN-029`, relação PlaybackAttempt/PlayerSession em `OPEN-034` e tolerância de 15 segundos em `OPEN-004`.

**Impacto:** deduplicação, reconstrução e validação de Evidence não podem ser implementadas integralmente.

### AUD-S1-014 — Segurança e legal não autorizam produção

**Evidência:** retenção, LGPD, incidentes, matriz de autorização e segregação de funções estão em `OPEN-001..003/032`.

**Impacto:** operações financeiras, reversões, manutenção e emergência não têm autoridade operacional completa; dados não têm política de retenção.

## 4. Auditoria por documento

### 4.1 Governança e arquitetura

| Documento | Parecer | Achado principal |
| --- | --- | --- |
| `docs/README.md` | `PARCIAL` | declara documentação oficial enquanto a fonte candidata está em revisão; lista pastas inexistentes como se fossem cobertura vigente |
| `specification/PLATFORM_SPECIFICATION.md` | `NÃO IMPLEMENTÁVEL` | boa consolidação, porém draft com 25 decisões abertas, várias estruturais |
| `specification/DECISION_REGISTRY.md` | `REFERÊNCIA` | excelente registro; prova 17 conflitos ainda ativos e não inclui `SYNC-007` |
| `specification/TRACEABILITY.md` | `PARCIAL` | rastreia famílias, não regra → Command/Event/invariante/teste; lacunas são agregadas demais |
| `specification/CONSISTENCY_RULES.md` | `IMPLEMENTÁVEL` | processo de governança é claro; baseline ainda não cumpriu o próprio processo |
| `architecture/ARCHITECTURE_OVERVIEW.md` | `NÃO IMPLEMENTÁVEL` | diagrama legado mantém relações supersedidas de Settlement/Asaas e Inventory |
| `adr/ADR-001-Architecture-Foundation.md` | `REFERÊNCIA` | válido como decisão histórica; fonte única foi supersedida condicionalmente |
| `adr/ADR-002-Edge-Architecture.md` | `REFERÊNCIA` | lifecycle/capability foram refinados e partes conflitam com ADR-008 |
| `adr/ADR-003-Evidence-Ledger.md` | `REFERÊNCIA` | pagamento direto foi supersedido; linguagem de Evidence/Edge exige leitura de supersessão |
| `adr/ADR-004-Quantum-Integration.md` | `REFERÊNCIA` | decisão de boundary é clara; contratos detalhados continuam ausentes |
| `adr/ADR-005-Financial-Architecture.md` | `REFERÊNCIA` | parcialmente supersedido pelo ADR-007 |
| `adr/ADR-006-AI-Architecture.md` | `REFERÊNCIA` | visão arquitetural, insuficiente para implementar autorização, memória e falhas |
| `adr/ADR-007-Financial-Platform.md` | `REFERÊNCIA` | separação correta, mas ADR curto não fecha o modelo contábil |
| `adr/ADR-008-TV-Network.md` | `REFERÊNCIA` | boundary pretendido é claro, contratos com Edge/Telemetry não |
| `adr/ADR-009-Platform-Specification-Governance.md` | `REFERÊNCIA` | ainda proposto; não governa até aceite |

### 4.2 Business e produto

| Documento | Parecer | Achado principal |
| --- | --- | --- |
| `product/BUSINESS_FOUNDATION.md` | `NÃO IMPLEMENTÁVEL` | tese forte; não especifica lifecycle comercial/legal completo |
| `product/PRODUCT_BIBLE.md` | `NÃO IMPLEMENTÁVEL` | contradiz split, redistribuição, pré-pagamento e seguro |
| `product/VISION.md` | `REFERÊNCIA` | cumpre visão; não é contrato operacional |
| `product/GO_TO_MARKET.md` | `REFERÊNCIA` | estratégia e hipóteses; critérios quantitativos continuam deliberadamente abertos |

Checklist Business: onboarding `PARCIAL`; cadastro `PARCIAL`; faturamento `PARCIAL`; cancelamento `AUSENTE`; suspensão `AUSENTE`; inadimplência `PARCIAL`; reativação `AUSENTE`; ownership `CONFLITANTE`; responsabilidades legais `AUSENTE`.

### 4.3 Modelo de domínio, Campaign, Pricing, Evidence e Settlement

| Documento | Parecer | Achado principal |
| --- | --- | --- |
| `domain/README.md` | `REFERÊNCIA` | índice útil; afirma fonte única incompatível com a transição ao ADR-009 |
| `domain/DOMAIN_DICTIONARY.md` | `PARCIAL` | termos centrais existem, mas owners/lifecycles novos não estão integralmente normalizados |
| `domain/DOMAIN_PRINCIPLES.md` | `NÃO IMPLEMENTÁVEL` | linguagem legada de Evidence/Edge registrada em `SYNC-004` |
| `domain/WORLDS.md` | `NÃO IMPLEMENTÁVEL` | mesma divergência de Evidence e resolução institucional |
| `domain/BOUNDED_CONTEXTS.md` | `NÃO IMPLEMENTÁVEL` | owners sobrepostos; cobrança atribuída a Settlement; mapa termina Settlement em Asaas |
| `domain/OWNERSHIP.md` | `NÃO IMPLEMENTÁVEL` | sobreposição TV/Edge/Telemetry/Capability reconhecida em `SYNC-006` |
| `domain/AGGREGATES.md` | `NÃO IMPLEMENTÁVEL` | inventário não substitui especificações; lifecycles Financial/TV/Evidence evoluíram fora dele |
| `domain/VALUE_OBJECTS.md` | `PARCIAL` | faltam decisões de precisão, moeda, tempo confiável e identities completas |
| `domain/SYSTEM_INVARIANTS.md` | `PARCIAL` | invariantes globais corretos, mas insuficientes para os contextos |
| `domain/DOMAIN_EVENTS.md` | `NÃO IMPLEMENTÁVEL` | catálogo legado diverge dos catálogos especializados e não fecha producer/consumer/ordering de todos |
| `domain/PRICING_ENGINE.md` | `PARCIAL` | especificação profunda; bloqueada por autorização, precisão e TTL/retry |
| `domain/EVIDENCE_PIPELINE.md` | `PARCIAL` | profunda; bloqueada por tolerância, ordering/gaps, PlayerAttempt/Session e Evidence/Anchor |
| `domain/REVENUE_ARCHITECTURE.md` | `NÃO IMPLEMENTÁVEL` | Settlement resumido; algoritmo e exceções financeiras insuficientes |
| `domain/PLAYER.md` | `NÃO IMPLEMENTÁVEL` | documento curto; lifecycle, concorrência, preemption e recovery dependem de execution |
| `domain/CANVAS.md` | `NÃO IMPLEMENTÁVEL` | composição descrita sem contrato executável completo |
| `domain/TV_EDGE_MODEL.md` | `NÃO IMPLEMENTÁVEL` | resumo legado sobreposto aos documentos de TV Network |
| `domain/INSURANCE.md` | `NÃO IMPLEMENTÁVEL` | capitalização, SLA, reservas, claims e execução não fechados |
| `domain/AI_ARCHITECTURE.md` | `NÃO IMPLEMENTÁVEL` | visão curta; não fecha modelos, autorização, memória, falhas e custos |
| `domain/GRAO.md` | `NÃO IMPLEMENTÁVEL` | identidade de produto, não especificação de contexto |
| `domain/INSTITUTIONAL_DOMAIN.md` | `NÃO IMPLEMENTÁVEL` | boundary resumido; contratos NFC/QR/anchor incompletos |
| `domain/CAPABILITIES.md` | `PARCIAL` | conflito histórico Capability/Facets e relação com registry operacional |
| `domain/FACETS.md` | `PARCIAL` | modelo detalhado, mas boundary com Capability permanece suscetível a dupla autoridade |
| `domain/ASSETS.md` | `PARCIAL` | taxonomia forte; lifecycle, concorrência e distribuição dependem de owners externos |
| `domain/SCALABILITY.md` | `PARCIAL` | resiliência conceitual boa; não fecha políticas operacionais quantitativas |
| `domain/DOMAIN_EVOLUTION.md` | `REFERÊNCIA` | orientação de evolução, não contrato implementável |

Checklist Campaign: lifecycle `PARCIAL`; finais `PARCIAL`; timeout `ABERTO`; pausa `PARCIAL`; retomada `ABERTA`; expiração `PARCIAL`; concorrência `PARCIAL`.

Checklist Pricing: cálculo/owner `SIM`; congelamento `SIM`; recálculo `SIM`; expiração `POLÍTICA SEM VALORES`; versões simultâneas `PARCIAL`; rollback `PARCIAL`.

Checklist Evidence: replay `SIM`; deduplicação `SIM`; invalidação `PARCIAL`; reconstrução `SIM`; auditoria `SIM`; reprocessamento `PARCIAL`; inconsistências `PARCIAL`.

Checklist Settlement: algoritmo `NÃO`; direitos `PARCIAL`; consistência `PARCIAL`; reexecução `PARCIAL`; compensação `ABERTA`; versionamento `PARCIAL`.

### 4.4 Financial Platform

| Documento | Parecer | Achado principal |
| --- | --- | --- |
| `financial/FINANCIAL_ARCHITECTURE.md` | `PARCIAL` | boundary excelente; 11 famílias abertas incluem contabilidade, chargeback e autorização |
| `financial/PAYMENT_FLOW.md` | `PARCIAL` | fluxos amplos; parcial/excedente, chargeback, fiscal, precisão e retry continuam abertos |
| `financial/PAYMENT_POLICY.md` | `PARCIAL` | semântica correta; conteúdo crítico de políticas ainda não aprovado |
| `financial/CAMPAIGN_BUDGET.md` | `PARCIAL` | reserva/concorrência bem especificadas; conservação, precisão, alocação e retomada abertas |
| `financial/LEDGER.md` | `NÃO IMPLEMENTÁVEL` | modelo contábil e equações de conservação em `OPEN-020`; não autoriza saldo oficial |
| `financial/PARTNER_WALLET.md` | `PARCIAL` | read model/autoridade melhor separados; depende do Ledger e chargeback |
| `financial/WITHDRAWAL_POLICY.md` | `PARCIAL` | resultado desconhecido e concorrência fortes; limites, autorização, compensação e parâmetros abertos |
| `financial/FINANCIAL_COMMANDS.md` | `PARCIAL` | catálogo extenso; nomes/owners globais, chargeback e contracts finais ainda abertos |
| `financial/FINANCIAL_EVENTS.md` | `PARCIAL` | envelopes e consumidores melhor definidos; catálogo depende de eventos globais não consolidados |
| `financial/FINANCIAL_INVARIANTS.md` | `PARCIAL` | boa base; não substitui conservação e política de perda |

Checklist Financial: ledger `BLOQUEADO`; wallet `PARCIAL`; batches `PARCIAL`; withdrawal `PARCIAL`; chargeback `BLOQUEADO`; retries `QUALITATIVOS`; falhas `BOA COBERTURA`; reconciliação `PARCIAL`.

### 4.5 TV Network

| Documento | Parecer | Achado principal |
| --- | --- | --- |
| `tv-network/TV_NETWORK_ARCHITECTURE.md` | `PARCIAL` | boa fronteira interna; conflito externo com Edge/Telemetry permanece |
| `tv-network/TV_LIFECYCLE.md` | `PARCIAL` | estados principais; gates, timeout, reativação e replacement não fecham todos os caminhos |
| `tv-network/DEVICE_REGISTRY.md` | `PARCIAL` | identidade/vínculo claros; rotação, perda, spoofing e substituição precisam de fluxo integral |
| `tv-network/INSTALLATION.md` | `PARCIAL` | checklist/lifecycle; autoridade, timeout, rework e responsabilidade legal incompletos |
| `tv-network/PROVISIONING.md` | `PARCIAL` | bootstrap descrito; confiança inicial, rotação, expiração e recuperação longa incompletas |
| `tv-network/HEARTBEAT_PROTOCOL.md` | `PARCIAL` | cobre duplicidade, drift e ordering; parâmetros e offline prolongado não fechados |
| `tv-network/HEALTH_MONITORING.md` | `PARCIAL` | dimensões e score conceituais; algoritmo/limiares e influência no scheduling abertos |
| `tv-network/EDGE_RUNTIME.md` | `PARCIAL` | watchdog/restart presentes; boundary de ownership e limites operacionais incompletos |
| `tv-network/NETWORK_INVENTORY.md` | `PARCIAL` | inventário/projeção; staleness e elegibilidade sob partição precisam de regra fechada |
| `tv-network/CAPABILITY_MANAGEMENT.md` | `PARCIAL` | lifecycle básico; compatibilidade, dependências e concorrência de versões incompletas |
| `tv-network/FLEET_MANAGEMENT.md` | `PARCIAL` | agregações e operação; score, staleness e autoridade de ações não fechados |
| `tv-network/REMOTE_OPERATIONS.md` | `PARCIAL` | comandos remotos e reconciliação; autorização, expiry e offline longo abertos |
| `tv-network/UPDATE_MANAGEMENT.md` | `PARCIAL` | waves/health gates; thresholds, blast radius e timers não aprovados |
| `tv-network/ROLLBACK_POLICY.md` | `PARCIAL` | rollback é nova transição; compatibilidade de dados e falha de rollback incompletas |
| `tv-network/TV_NETWORK_COMMANDS.md` | `PARCIAL` | owners locais descritos; matriz de autorização e contratos globais não fechados |
| `tv-network/TV_NETWORK_EVENTS.md` | `PARCIAL` | produtores listados; consumidores, ordering e retenção não fecham todos os eventos |
| `tv-network/TV_NETWORK_INVARIANTS.md` | `PARCIAL` | boa base; não cobre toda reintegração, key lifecycle e gap irrecuperável |
| `tv-network/TV_NETWORK_STATE_MACHINES.md` | `PARCIAL` | máquinas ampliadas; parâmetros, timeout e recovery dependem de decisões não referenciadas |

Checklist TV Network: instalação `PARCIAL`; bootstrap `PARCIAL`; provisioning `PARCIAL`; heartbeat `PARCIAL`; watchdog `PARCIAL`; desired/current/observed `SIM, COM OWNER A REFINAR`; rollback `PARCIAL`; waves `PARCIAL`; quarantine `PARCIAL`; recovery `PARCIAL`; replacement `PARCIAL`.

### 4.6 Execution

| Documento | Parecer | Achado principal |
| --- | --- | --- |
| `execution/COMMANDS.md` | `NÃO IMPLEMENTÁVEL` | 15 famílias abertas; Commands/eventos ausentes, aliases e owners ainda não consolidados |
| `execution/EVENTS.md` | `NÃO IMPLEMENTÁVEL` | 13 famílias abertas; producer/consumer/lifecycle dependem de decisões pendentes |
| `execution/STATE_MACHINES.md` | `NÃO IMPLEMENTÁVEL` | 11 famílias abertas; estados e owners sobrepostos, cancelamento e compensação pendentes |
| `execution/SAGAS.md` | `PARCIAL` | recuperação distribuída bem tratada; 17 decisões abertas impedem execução integral |
| `execution/TIMELINES.md` | `PARCIAL` | sequências detalhadas; ainda contém pontos de sincronização e decisões abertas |
| `execution/EXECUTION_INVARIANTS.md` | `PARCIAL` | regras transversais fortes; matriz executável e parâmetros permanecem abertos |

Checklist Execution: Commands `BLOQUEADO`; Events `BLOQUEADO`; Sagas `PARCIAL`; Timelines `PARCIAL`; State Machines `BLOQUEADO`.

## 5. Invariantes faltantes ou ainda não demonstradas

1. Conservação monetária por ledger e entre ledgers.
2. Uma unidade compensada não financia mais de uma obrigação além do próprio valor.
3. Toda perda por chargeback possui exatamente um owner e uma cadeia de recuperação.
4. Toda transição de Campaign preserva seus motivos independentes de pausa.
5. Campaign terminal não recebe budget sem destino financeiro explicitamente decidido.
6. Evidence validity nunca é reaberta por falha de anchor.
7. Um PlaybackAttempt possui exatamente um resultado terminal, mesmo após reboot.
8. Gap irrecuperável nunca é convertido em Evidence por inferência.
9. Edge offline além do limite não executa Command/Slot/pacote expirado.
10. Uma credencial não sobrevive a replacement/decommission incompatível.
11. Health desconhecido nunca equivale a saudável.
12. Projeção stale nunca autoriza decisão financeira ou operacional crítica.
13. Rollback de software não reverte schema/estado incompatível sem plano explícito.
14. WithdrawalBatch fechado não oculta item não terminal.
15. Replay nunca repete cobrança, transferência, anchor, update ou operação remota já confirmada.

## 6. Contratos entre contextos que exigem fechamento

| Origem | Destino | Contrato pendente |
| --- | --- | --- |
| Identity/CRM | Campaign/TV/Financial | autoridade por papel, KYC/KYB, suspensão e encerramento |
| Campaign | CampaignBudget | reserva, cancelamento, expiração, retomada e saldo remanescente |
| Pricing | Campaign/Slot/Evidence | quote revision, expiry, override e precisão |
| Edge | Evidence | sequence/gap, attempt/session, atraso offline e trust temporal |
| Evidence | Quantum | validity versus anchor, retry e reversão tardia |
| Evidence/Quantum | Settlement | snapshot de elegibilidade e corrida com reversão |
| Settlement | PartnerLedger | identidade imutável do direito, dedupe e compensação posterior |
| PaymentLedger | CampaignBudget | alocação parcial/excedente e Campaign terminal |
| Financial | Asaas | idempotência externa, UNKNOWN, reconciliação e retenção |
| TV Network | Edge Runtime | desired/current/observed, heartbeat, update e rollback |
| Telemetry | TV Network | owner do sinal, custódia, avaliação e staleness |
| TV Network | Scheduling | elegibilidade operacional e efeito de Health/quarantine |
| Insurance | TV/Financial | premium, claim, reserve, replacement e payout |

## 7. Condições para aprovação

A implementação integral só pode ser autorizada quando:

1. a Specification e o ADR-009 possuírem decisão formal;
2. todos os `SYNC-*` estiverem resolvidos;
3. decisões abertas estruturais forem fechadas, especialmente `OPEN-001..008`, `016..020` e `025..034`;
4. Business possuir lifecycle e responsabilidades legais completos;
5. Campaign e Settlement possuírem especificações próprias integrais;
6. o modelo contábil passar por revisão financeira/contábil;
7. TV Network e Edge/Telemetry tiverem owners não sobrepostos;
8. Command → owner → pré-estado → pós-estado → Event estiver completo;
9. contratos entre contextos tiverem schemas conceituais, ordering, idempotência e compensação;
10. uma segunda auditoria confirmar ausência de decisões implícitas e conflitos.

Até essas condições serem satisfeitas, módulos isolados podem ser prototipados, mas saldos oficiais, cobrança, Settlement, saque, Evidence elegível e operação remota de frota não devem ser tratados como implementação autorizada da plataforma.

## 8. Reauditoria de Campaign Management — 2026-07-27

O documento “Fechamento do Campaign Management” respondeu `OPEN-036..048`. A especificação [`CAMPAIGN_MANAGEMENT.md`](../domain/CAMPAIGN_MANAGEMENT.md) passou a cobrir dados mínimos, edição por estado, ativação versus início de execução, cancelamento imediato/assíncrono, configuração, equivalência, crédito/refund, moderação, responsabilidade, overdelivery, Slots consecutivos e autorização.

Status atualizado do contexto:

| Dimensão | Status |
| --- | --- |
| Lifecycle Campaign | IMPLEMENTÁVEL |
| Campaign/Slot cutoff de cancelamento | IMPLEMENTÁVEL com `DISPATCHED` distinto de `DELIVERED` |
| Concorrência e revisão | IMPLEMENTÁVEL |
| Pausa e retomada | IMPLEMENTÁVEL |
| Creative/moderação | IMPLEMENTÁVEL; números vêm de policy versionada |
| Realocação | IMPLEMENTÁVEL; tolerâncias vêm de `SlotEquivalencePolicy` |
| Crédito/refund | IMPLEMENTÁVEL semanticamente; contabilidade global ainda depende de `OPEN-020` |
| Overdelivery | IMPLEMENTÁVEL semanticamente; lançamentos dependem do modelo contábil global |
| Julgamento de responsabilidade | BLOQUEADO por `OPEN-049` |

Os achados históricos das seções anteriores permanecem como fotografia da auditoria original. Para Campaign, esta seção prevalece. A plataforma integral continua bloqueada pelas decisões transversais financeiras, legais, Identity, Evidence e TV Network já relacionadas.
