# Domain Freeze Review V2 — Classificação de Gate

**Data:** 2026-07-27  
**Commit-base auditado:** `805c117`  
**Revisão anterior:** [DOMAIN_FREEZE_REVIEW.md](./DOMAIN_FREEZE_REVIEW.md)  
**Estado:** `DOMAIN_FREEZE_PARTIALLY_BLOCKED`

## 1. Objetivo

Esta revisão não altera regras de domínio. Ela reclassifica os 14 achados da auditoria original segundo o efeito real de cada um sobre desenvolvimento e produção.

Categorias normativas desta revisão:

- `DOMAIN_BLOCKER`: impede implementar corretamente um ou mais contratos de domínio;
- `PRODUCTION_BLOCKER`: permite desenvolvimento, mas impede deploy seguro ou legal em produção;
- `DOCUMENTATION_DEBT`: exige sincronização documental, sem alterar comportamento já determinado por fonte normativa mais específica.

Um documento incompleto não é, isoladamente, bloqueador de domínio. O bloqueio existe somente quando a implementação ainda precisaria escolher uma fronteira, owner, produtor, invariante, transição ou contrato público.

## 2. Resumo

| Categoria | Quantidade | Itens |
| --- | ---: | --- |
| `DOMAIN_BLOCKER` | 7 | DFR-002, DFR-006, DFR-007, DFR-008, DFR-010, DFR-011, DFR-013 |
| `PRODUCTION_BLOCKER` | 1 | DFR-014 |
| `DOCUMENTATION_DEBT` | 6 | DFR-001, DFR-003, DFR-004, DFR-005, DFR-009, DFR-012 |

Conclusão:

- a plataforma **pode iniciar desenvolvimento estrutural e dos contextos não atingidos por bloqueadores locais**;
- a plataforma **não pode gerar como definitivos todos os contratos públicos**;
- Financial, ownership operacional distribuído e fluxos transversais ainda não podem ser implementados integralmente sem decisões;
- nenhum deploy em produção pode ser autorizado antes do fechamento do bloqueador de produção;
- dívida documental não bloqueia código quando a regra especializada e a precedência normativa já são inequívocas.

## 3. Reclassificação dos 14 achados

### DFR-001 — A especificação primária ainda é DRAFT

**Classificação:** `DOCUMENTATION_DEBT`

**Motivo:** o rótulo `DRAFT` descreve o estado editorial e de aprovação do conjunto. Não muda, por si só, fronteiras, owners, produtores, invariantes ou contratos já definidos.

**Impacto técnico:** ferramentas e leitores podem interpretar incorretamente o nível de autoridade do documento.

**Impede geração de código:** não.

**Impede deploy em produção:** não isoladamente.

**Ação exigida:** sincronizar os estados documentais `CANDIDATE`, `BLOCKED` e `CERTIFIED` quando os gates correspondentes forem atingidos.

### DFR-002 — Permanecem 24 decisões abertas

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** o conjunto contém decisões que alteram diretamente comportamento: precisão monetária, conservação contábil, chargeback, pagamentos parciais, ordering, cardinalidade de execução, timeouts semânticos e matriz Command/Event.

Nem todas as 24 decisões bloqueiam o primeiro código. O achado permanece `DOMAIN_BLOCKER` porque inclui escolhas que impedem contratos corretos em contextos específicos.

**Impacto técnico:** implementação integral exigiria inventar regras, especialmente em Financial, Evidence/Edge e Execution.

**Impede geração de código:** sim, apenas nos componentes atingidos pela decisão. Não impede scaffolding, infraestrutura comum ou contextos cujo contrato já esteja fechado.

**Impede deploy em produção:** sim para os fluxos afetados.

**Ação exigida:** decompor as 24 decisões individualmente em domínio, produção ou parâmetro de política antes de usar este achado como gate granular.

### DFR-003 — Decisões referenciadas sem status oficial rastreável

**Classificação:** `DOCUMENTATION_DEBT`

**Motivo:** o defeito identificado é a ausência de status e supersessão explícitos para `OPEN-011/012/013/015/022/024/035`. Quando o comportamento já está estabelecido em especificação especializada, a falha é de rastreabilidade.

Se a reconciliação revelar que alguma semântica realmente não foi decidida, essa decisão específica deverá ser promovida a `DOMAIN_BLOCKER`; a referência órfã, em si, não é esse bloqueio.

**Impacto técnico:** aumenta o risco de um engenheiro seguir referência histórica em vez da regra vigente.

**Impede geração de código:** não, desde que a fonte especializada seja inequívoca.

**Impede deploy em produção:** não.

**Ação exigida:** marcar cada referência como `OPEN`, `CLOSED_BY_DEC-XXX` ou `SUPERSEDED_BY_DEC-XXX`.

### DFR-004 — Decision Registry mantém conflitos `SYNC-*`

**Classificação:** `DOCUMENTATION_DEBT`

**Motivo:** `SYNC-*` registra divergência entre documentos e já estabelece, na maioria dos casos, qual norma possui precedência. Uma cópia desatualizada não reabre automaticamente a decisão.

Conflitos que não possuam uma regra de precedência inequívoca devem ser tratados separadamente como bloqueadores de domínio, não mantidos genericamente como dívida de sincronização.

**Impacto técnico:** documentação secundária pode induzir implementação incorreta.

**Impede geração de código:** não quando a norma vigente estiver identificada.

**Impede deploy em produção:** não.

**Ação exigida:** sincronização editorial e validação automatizada de termos, owners e supersessões.

### DFR-005 — Mapa de Bounded Contexts não coincide entre documentos

**Classificação:** `DOCUMENTATION_DEBT`

**Motivo:** a lista mais completa declara 19 contextos e as especificações especializadas demonstram suas fronteiras. A ausência de um contexto em uma tabela resumida não cria automaticamente um novo boundary.

**Impacto técnico:** prejudica inventário, onboarding e futura geração automática de módulos.

**Impede geração de código:** não, desde que o contexto implementado possua boundary especializado inequívoco.

**Impede deploy em produção:** não.

**Ação exigida:** consolidar uma matriz canônica derivada das definições existentes, sem criar ou remover contextos.

### DFR-006 — Catálogo central de Aggregates incompleto

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** omissões puramente editoriais seriam dívida documental, mas a auditoria também encontrou conceitos cuja natureza varia entre Aggregate, serviço, projeção e owner genérico. O freeze exige fronteiras de Aggregate estáveis.

**Impacto técnico:** determina stream, consistência transacional, optimistic concurrency, repositório e destino de Commands.

**Impede geração de código:** sim para Aggregates divergentes; não para roots inequivocamente definidos nas especificações especializadas.

**Impede deploy em produção:** sim para fluxos que dependam dos roots divergentes.

**Ação exigida:** decidir apenas os casos de natureza divergente. Inclusões omitidas mas inequívocas são sincronização documental.

### DFR-007 — Ownership global desatualizado ou conflitante

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** TV Network, Edge Runtime, Telemetry, Health e Insurance ainda aparecem com autoridade sobreposta. Owner único é condição explícita do Domain Freeze.

**Impacto técnico:** mais de um contexto pode aceitar Commands, validar invariantes ou publicar fatos autoritativos sobre o mesmo conceito.

**Impede geração de código:** sim para health, telemetry, disponibilidade, seguro operacional e integrações correspondentes.

**Impede deploy em produção:** sim para esses fluxos.

**Ação exigida:** aprovar a matriz `conceito → Bounded Context → Aggregate owner`. A atualização dos documentos depois disso é dívida editorial.

### DFR-008 — Commands e Events financeiros possuem owner/produtor variável

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** expressões como “Aggregate correspondente”, “ledger aplicável” e `AdvertiserAccount/Payment` não definem um único destino transacional ou produtor autoritativo.

**Impacto técnico:** impossibilita definir handler, stream, lock, idempotency scope e contrato do evento.

**Impede geração de código:** sim para os Commands e Events afetados.

**Impede deploy em produção:** sim.

**Ação exigida:** escolher exatamente um Aggregate por Command e um produtor por Event, decompondo efeitos cruzados em eventos e Sagas.

### DFR-009 — `DEC-037` ainda menciona quatro classes

**Classificação:** `DOCUMENTATION_DEBT`

**Motivo:** a norma mais recente já define `ResponsibleParty.NONE` e explica sua semântica. Não existe escolha de implementação remanescente: `NONE` é o quinto valor e não representa decisão incompleta.

**Impacto técnico:** gerador ou consumidor baseado exclusivamente na redação antiga pode produzir enum desatualizado.

**Impede geração de código:** não quando o contrato vigente de Governance for utilizado.

**Impede deploy em produção:** não, desde que schemas e consumidores adotem a norma mais recente.

**Ação exigida:** registrar supersessão parcial de `DEC-037`, preservando a proibição de responsabilidade compartilhada.

### DFR-010 — Catálogos globais e especializados não formam contrato único

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** existem aliases, wildcards, eventos ausentes e contratos sem produtor ou owner consolidado. O Domain Freeze exige Commands e Events públicos congelados.

**Impacto técnico:** impede gerar handlers, AsyncAPI, Protobuf, schemas e políticas de compatibilidade de forma determinística.

**Impede geração de código:** sim para integração entre contextos e contratos públicos. Não impede lógica interna baseada em contratos já inequívocos.

**Impede deploy em produção:** sim para integrações afetadas.

**Ação exigida:** decidir apenas contratos efetivamente ambíguos; depois gerar catálogo canônico a partir das fontes especializadas.

### DFR-011 — Sagas dependem de semânticas não fechadas

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** ponto de não retorno, compensação financeira, resultado externo desconhecido, owner de retry, cardinalidade attempt/session e corrida Evidence/Settlement alteram o comportamento distribuído.

**Impacto técnico:** implementação poderia repetir side effects, compensar o owner errado ou encerrar fluxo em estado incompatível.

**Impede geração de código:** sim para os coordenadores e handlers das Sagas afetadas.

**Impede deploy em produção:** sim.

**Ação exigida:** fechar as decisões semânticas; valores quantitativos que não alteram o lifecycle podem permanecer como políticas de produção.

### DFR-012 — State Machines não estão globalmente sincronizadas

**Classificação:** `DOCUMENTATION_DEBT`

**Motivo:** a existência de máquinas centrais incompletas não bloqueia código quando a máquina especializada do Aggregate já define estados, transições, eventos e terminalidade. O achado original agrupou divergências editoriais com decisões reais.

Casos específicos sem terminalidade decidida, como elementos ainda dependentes de `OPEN-*`, permanecem cobertos por DFR-002 e DFR-011.

**Impacto técnico:** risco de implementar a partir do catálogo resumido errado.

**Impede geração de código:** não para máquinas especializadas fechadas.

**Impede deploy em produção:** não isoladamente.

**Ação exigida:** gerar a visão global a partir das máquinas especializadas certificadas e validar alcançabilidade automaticamente.

### DFR-013 — Conservação financeira não demonstrada

**Classificação:** `DOMAIN_BLOCKER`

**Motivo:** unidade monetária, precisão, arredondamento, residual, correspondência entre movimentos, reservas, chargeback e saldo negativo são invariantes do domínio financeiro.

**Impacto técnico:** não é possível garantir que dinheiro criado, reservado, consumido, creditado, revertido e sacado seja conservado.

**Impede geração de código:** sim para Ledger, saldos oficiais, split, chargeback, compensação e reconciliação. Interfaces e estruturas não financeiras podem avançar.

**Impede deploy em produção:** sim.

**Ação exigida:** aprovar o modelo contábil e suas equações antes de implementar qualquer componente que seja fonte oficial de saldo.

### DFR-014 — Segurança, legal, fiscal e autorização de produção

**Classificação:** `PRODUCTION_BLOCKER`

**Motivo:** retenção, LGPD, resposta a incidentes, tributação e segregação formal são obrigatórias para operar, mas não impedem construir e testar o modelo de domínio em ambiente não produtivo.

A matriz mínima de owner continua sendo requisito de domínio e está coberta por DFR-007/008. Este item trata dos controles completos de produção.

**Impacto técnico:** afeta storage lifecycle, acesso, auditoria, observabilidade, compliance e operação.

**Impede geração de código:** não para desenvolvimento do domínio. Alguns adapters e controles finais permanecerão incompletos.

**Impede deploy em produção:** sim.

**Ação exigida:** fechar políticas com responsáveis jurídicos, contábeis, segurança e operação antes do production readiness review.

## 4. Bloqueadores reais de implementação

### 4.1 Bloqueadores globais

Os seguintes itens impedem congelar contratos públicos para toda a plataforma:

- DFR-002 — decisões abertas com conteúdo estrutural;
- DFR-010 — catálogo público de Commands e Events não consolidado;
- DFR-011 — Sagas com semântica distribuída ainda aberta.

### 4.2 Bloqueadores localizados

| Área | Bloqueadores | Desenvolvimento permitido |
| --- | --- | --- |
| Financial Platform | DFR-008, DFR-013 e parte de DFR-002 | tipos básicos, adapters isolados e testes de infraestrutura; não Ledger/saldos definitivos |
| TV Network/Edge/Telemetry | DFR-007 e parte de DFR-011 | lógica interna inequívoca; não contratos de health/availability disputados |
| Evidence/Execution | DFR-002, DFR-010, DFR-011 | estruturas locais fechadas; não Saga integral nem contrato público final |
| Aggregates divergentes | DFR-006 | roots inequívocos podem avançar; conceitos divergentes não |

### 4.3 Contextos que podem iniciar implementação controlada

Com base apenas no critério de domínio e respeitando os contratos especializados vigentes:

- Campaign Management pode iniciar núcleo de Aggregate, Value Objects e transições já fechadas;
- Governance & Dispute Management pode iniciar Aggregate, revisões append-only e contratos aprovados;
- Pricing Engine pode iniciar cálculo e versionamento que não dependam da precisão monetária ainda aberta;
- componentes internos de TV Network podem iniciar onde o owner não esteja em disputa;
- infraestrutura comum de Event Store, Outbox, Inbox, optimistic concurrency e envelopes versionados pode iniciar sem criar regra de negócio.

Essas frentes não autorizam publicar contratos globais como definitivos nem implementar comportamento ainda ligado a `OPEN-*`.

## 5. Bloqueadores apenas de produção

O bloqueador de produção consolidado é DFR-014:

- retenção e descarte;
- LGPD e privacidade;
- segurança e resposta a incidentes;
- tributação e documentos fiscais;
- segregação completa de funções;
- controles operacionais e autorização final.

Ele não impede iniciar desenvolvimento. Impede liberar a plataforma para usuários reais, movimentar dinheiro real ou tratar dados reais sem os controles aprovados.

Parâmetros numéricos de SLA, TTL e retry também podem ser production blockers quando a semântica qualitativa e o lifecycle já estiverem fechados. Quando o valor altera terminalidade ou compensação, permanece domain blocker.

## 6. Débitos documentais

Podem ser tratados em paralelo, sem impedir desenvolvimento:

- DFR-001 — status editorial `DRAFT`;
- DFR-003 — referências `OPEN-*` sem status rastreável;
- DFR-004 — sincronizações `SYNC-*` cuja precedência já é conhecida;
- DFR-005 — tabela central incompleta de Bounded Contexts;
- DFR-009 — redação antiga de `DEC-037`;
- DFR-012 — máquinas globais não derivadas das especializadas.

Também são débitos documentais:

- ADR histórico supersedido e corretamente marcado como histórico;
- catálogo resumido que omite item já normativamente definido;
- referência cruzada desatualizada sem ambiguidade comportamental;
- terminologia antiga quando existe definição normativa inequívoca;
- ausência de visão consolidada que pode ser gerada sem decisão.

Débito documental deixa de ser apenas dívida e passa a `DOMAIN_BLOCKER` quando duas fontes com autoridade equivalente exigem comportamentos incompatíveis e não existe regra de precedência.

## 7. Novo gate para início do desenvolvimento

O desenvolvimento pode começar imediatamente sob as seguintes restrições:

1. implementar somente Aggregates com boundary e invariantes inequívocos;
2. aceitar somente Commands com owner único;
3. publicar somente Events com produtor único;
4. não declarar contratos transversais provisórios como versão `1.0`;
5. não implementar Ledger ou saldo oficial antes da conservação financeira;
6. não escolher comportamento para qualquer `OPEN-*`;
7. manter feature flags ou isolamento de módulos cuja integração dependa de decisão;
8. impedir deploy em produção até fechamento de DFR-014;
9. executar Architecture Lock antes de certificar contratos públicos;
10. tratar sincronização documental em backlog paralelo.

## 8. Parecer final

**A plataforma já pode iniciar desenvolvimento controlado.**

O Domain Freeze não está globalmente certificado porque ainda existem sete classes de bloqueio de domínio. Isso não exige paralisar todo o repositório.

O ponto correto de transição é:

- iniciar código dos contextos e componentes cujos cinco gates estejam fechados;
- manter bloqueados somente os Aggregates, Commands, Events, invariantes e Sagas atingidos pelos sete `DOMAIN_BLOCKER`;
- resolver DFR-014 antes de produção;
- executar os seis itens de `DOCUMENTATION_DEBT` em paralelo, sem tratá-los como impedimento arquitetural.

Nenhuma regra de negócio foi criada, removida ou reinterpretada nesta reclassificação.

