# Implementation Notarial Log

## Identificação

- **Iniciativa:** fundação executável da Plataforma Mostarda
- **Data de abertura:** 2026-07-29
- **Branches isoladas:** `agent/implementation-foundation`
- **Repositórios:** `mostarda-backend` e `mostarda-frontend`
- **Regra:** nenhuma omissão normativa será preenchida por inferência técnica

## 1. Estado recebido

O backend continha documentação normativa e nenhum workspace executável. O
frontend continha documentação e uma implementação histórica somente no
histórico Git. A implementação histórica não foi restaurada porque materializava
decisões superadas, dados fictícios e integrações não normativas.

## 2. Decisões técnicas materializadas

As decisões abaixo não alteram domínio:

1. Node.js 24 e TypeScript 5.9;
2. npm workspaces;
3. kernel transversal sem referência a Bounded Context;
4. Fastify como adapter HTTP;
5. Next.js App Router e React para o workspace responsivo;
6. contratos e geração deny-by-default;
7. Event Sourcing com replay estrito;
8. estado parcial descartado em replay abortado;
9. rebuild de Projection isolado antes de promoção atômica;
10. runtime e interface devem declarar indisponibilidade, nunca inventar dado.

As justificativas e a separação TBS/CGS/configuração constam em
`IMPLEMENTATION_DECISION_LOG.md` e
`CODE_GENERATION_SPECIFICATION_PART_A.md`.

## 3. Gate de Governance

A auditoria das fontes normativas comprovou nove Commands e nove Events, porém
confirmou as cinco lacunas específicas registradas pelo IRR V2:

1. catálogo de error codes dos nove Commands;
2. schemas completos e versionados dos nove Events;
3. contratos internos completos de `EvidenceReference`, `Investigation`,
   `Appeal` e `GovernancePolicyVersion`;
4. matriz e cadeia específica de compatibilidade/upcast;
5. suíte executável de conformidade do `GovernanceCase`.

Consequência: `GovernanceCase` permanece `IMPLEMENTATION_PARTIAL`. O código do
Aggregate e seus Commands não foi gerado.

## 4. Backend implementado

### Kernel TBS

- identidades opacas e canônicas;
- `CommandResult` discriminado;
- `Accepted`, `Conflict` e `Duplicate`;
- preservação do resultado original em retry duplicado;
- famílias e descriptors de erro;
- envelopes de Command e Event;
- replay determinístico;
- detecção de Event duplicado;
- detecção de gap;
- aborto em schema desconhecido;
- descarte explícito de estado parcial;
- rebuild isolado de Projection;
- checkpoint, version e `asOf`.

### Cloud API

Endpoints locais:

- `GET /health`;
- `GET /ready`;
- `GET /v1/implementation-capabilities`.

O endpoint de readiness retorna `503` enquanto o Event Store não estiver
disponível. O manifesto informa que o kernel está pronto, Governance está
parcial e Commands de domínio permanecem desativados.

## 5. Frontend implementado

Foi criado no repositório `mostarda-frontend` um primeiro
`Mostarda Intelligent Workspace`:

- mobile-first;
- navegação inferior no mobile;
- rail lateral no desktop;
- presença contextual do Grão;
- layout responsivo;
- design sem imagens estáticas;
- consumo server-side do endpoint real de capacidades;
- indisponibilidade explícita quando a API não responde;
- nenhum saldo, campanha, impressão ou métrica fictícia.

## 6. Segurança de dependências

Durante a implementação, a versão inicialmente selecionada do Fastify apresentou
advisories de segurança e foi substituída pela versão corrigida. Next.js trouxe
versões transitivas vulneráveis de PostCSS e Sharp; ambas foram atualizadas por
overrides explícitos.

Resultado das auditorias após correção: zero vulnerabilidades conhecidas nos
dois workspaces.

## 7. Provas executadas

Backend:

- 14 testes executáveis aprovados;
- 6 testes documentais aprovados;
- TypeScript typecheck aprovado;
- `npm audit --omit=dev`: zero vulnerabilidades;
- API real iniciada em `127.0.0.1:3333`;
- health real respondeu HTTP 200.

Frontend:

- 2 testes estruturais aprovados;
- TypeScript typecheck aprovado;
- build de produção Next.js aprovado;
- `npm audit --omit=dev`: zero vulnerabilidades;
- servidor iniciado em `127.0.0.1:3000`;
- página respondeu HTTP 200;
- renderização server-side confirmou conexão com a API real.

Prova ponta a ponta observada:

```json
{
  "ApiKernel": "IMPLEMENTATION_READY",
  "Governance": "IMPLEMENTATION_PARTIAL",
  "FrontendStatus": 200,
  "FrontendConnected": true
}
```

## 8. Limitações objetivas

O Docker CLI está instalado, porém o Docker Engine não respondeu ao
`docker info` dentro do timeout. Por isso, PostgreSQL, Event Store, outbox e
inbox ainda não possuem prova de integração real.

A primeira instalação do frontend falhou por falta de espaço no cache padrão do
volume C. Nenhum cache global foi apagado. A instalação parcial no worktree foi
removida e repetida com cache isolado no volume D, que possuía espaço.

## 9. Estado de conclusão

Esta fase não está declarada integralmente concluída.

- fundação documental/técnica: concluída;
- kernel transversal: concluído;
- replay/projections: concluídos;
- Cloud API de fundação: concluída;
- primeiro workspace responsivo: concluído;
- PostgreSQL/Event Store/outbox/inbox: pendente de implementação e prova;
- `GovernanceCase`: bloqueado pelos cinco contratos específicos;
- módulos de negócio subsequentes: não autorizados por associação.

Toda alegação futura de conclusão deverá incluir nova execução de testes,
typecheck, auditoria de dependências e prova localhost.

## 10. Continuação autônoma — persistência e certificação

Após a abertura deste registro foram materializados:

- contrato de Event Store;
- implementação transacional em memória para conformidade;
- migration PostgreSQL append-only;
- adapter PostgreSQL com advisory lock por stream;
- ExpectedRevision e append multi-Event atômico;
- Event e outbox na mesma transação;
- outbox com confirmação idempotente;
- inbox por `consumer + EventId`;
- conflito para mesmo EventId com digest divergente;
- runner de migrations;
- teste de integração PostgreSQL condicionado a `DATABASE_URL`;
- reidratação por snapshot com fallback para replay integral;
- cadeia explícita e contígua de upcast;
- catálogo transversal completo de Error conforme TBS;
- CommandResult completo conforme TBS;
- gate executável de geração deny-by-default;
- testes executáveis de fronteiras arquiteturais.

## 11. Artefatos Governance efetivamente implementados

O cruzamento Architecture Lock × IRR V2 autorizou deterministicamente:

- `ResponsibleParty`;
- `ResponsibilityCategory`;
- `Severity`;
- `Confidence`;
- GovernanceCase State Machine.

Esses artefatos foram implementados com testes. Nenhum Aggregate, Command,
Event, Saga, Projection ou contrato público de Governance foi gerado.

Foi identificada uma contradição objetiva: o IRR V2 marca
`ResponsibilityDecision` como READY, mas marca três de suas dependências
obrigatórias (`EvidenceReference`, `GovernancePolicyVersion` e
`DecisionRevision`) como PARTIAL. O objeto concreto foi bloqueado por
dependência; a ocorrência consta em `GOVERNANCE_IMPLEMENTATION_GATE_V1.md`.

## 12. Estado probatório atualizado

Na última execução anterior a este registro:

- 47 testes backend aprovados;
- 1 teste PostgreSQL suspenso por ausência de `DATABASE_URL`;
- 3 testes de fronteira arquitetural aprovados;
- 6 testes documentais aprovados;
- typecheck backend aprovado;
- auditoria de dependências backend sem vulnerabilidades conhecidas;
- 2 testes frontend aprovados;
- typecheck e build de produção frontend aprovados;
- auditoria de dependências frontend sem vulnerabilidades conhecidas.

O Docker Desktop foi localizado, mas seu serviço não pôde ser iniciado pelo
contexto de execução e o Engine não respondeu mesmo após solicitação de
inicialização em segundo plano. Não existe instalação PostgreSQL nativa
alternativa detectável. A prova real do adapter PostgreSQL continua pendente e
não foi convertida artificialmente em sucesso.

## 13. Revisão técnica independente e correções

A fundação foi submetida a revisão técnica independente antes da integração.
Os achados foram corrigidos sem ampliar o domínio:

- consumo inbox e efeito persistente passaram a compartilhar a mesma transação;
- falha do efeito não grava recibo e retry duplicado não reaplica o efeito;
- outbox passou a possuir claim exclusivo, lease recuperável e confirmação
  condicionada ao token da lease;
- revisions do Event Store passaram a usar `bigint` ponta a ponta, sem coerção
  destrutiva para `number`;
- Events, payloads e estados retornados pelo Event Store são cópias isoladas;
- replay descarta estado parcial, isola mutações do applier e converte falhas em
  `ReplayAborted` normativo;
- Projection declara staleness e só fica pronta para promoção após rebuild
  integral;
- readiness consulta uma dependência real com timeout e nunca declara produção
  pronta por constante;
- a State Machine autorizada mantém contexto suficiente para concluir
  reavaliação;
- o frontend valida o manifesto em runtime, possui timeout, não apresenta ações
  fictícias e diferencia API conectada de indisponível.

O requisito de produzir OpenAPI foi rejeitado nesta fase porque a autoridade
superior (`ARCHITECTURE_LOCK_REVIEW_V1.md`) mantém contratos públicos em estado
não autorizado. A omissão é deliberada e deny-by-default, não dívida acidental.

## 14. Evidência final desta rodada

Backend:

- 57 testes executados;
- 56 aprovados;
- 1 teste de integração PostgreSQL explicitamente suspenso por ausência de
  `DATABASE_URL`;
- typecheck aprovado;
- `git diff --check` aprovado.

Frontend:

- 7 testes comportamentais aprovados;
- typecheck aprovado;
- build de produção Next.js aprovado;
- rota principal confirmada como dinâmica para consultar o runtime;
- `git diff --check` aprovado.

Prova ponta a ponta em processos locais novos:

```json
{
  "FrontendStatus": 200,
  "ApiStatus": "ok",
  "FrontendConnected": true,
  "RenderedCapability": "Base parcial"
}
```

A consulta externa de advisories do npm não pôde ser repetida nesta rodada
porque o registry estava indisponível no ambiente restrito. A última execução
bem-sucedida registrou zero vulnerabilidades após os overrides documentados;
isso não substitui uma nova auditoria antes de produção.

## 15. Estado probatório consolidado

O Event Store, outbox e inbox possuem implementação e testes de contrato em
memória, adapter PostgreSQL e validação estática de schema. A afirmação anterior
de que estavam “pendentes de implementação” fica superada por esta seção.

Permanece pendente somente a prova viva contra PostgreSQL real. Essa pendência
não é mascarada: o teste de integração é omitido com motivo explícito quando
`DATABASE_URL` não existe, e `/ready` responde `503` enquanto a dependência não
está operacional.

O `GovernanceCase` Aggregate, seus Commands, Events, Sagas e contratos públicos
continuam proibidos. Somente os Value Objects e a State Machine expressamente
autorizados foram materializados.

## 16. Retificação após teste adversarial concorrente

Uma segunda revisão reproduziu uma corrida em entregas inbox simultâneas e uma
mutação vazada durante rebuild de Projection. Portanto, as alegações da seção
13 somente passam a valer com as correções e provas abaixo:

- inbox em memória serializa a primeira entrega por `consumer + EventId`;
- inbox PostgreSQL adquire advisory lock transacional pela mesma identidade
  antes de executar o efeito;
- teste concorrente comprova um único efeito e resultados
  `Applied + Duplicate`;
- rebuild clona estado e Event antes de cada aplicação e descarta mutações em
  falha intermediária;
- promoção exige um `AtomicProjectionStore`; a implementação concreta de
  persistência ainda não é declarada concluída;
- lease de outbox possui validação central, token de claim globalmente único e
  migration incremental `003_outbox_leases.sql`;
- factories de `CommandResult` controlam o discriminante em runtime e rejeitam
  Events em falhas ou mutação aceita sem nova revision;
- readiness coalesce probes concorrentes; PostgreSQL aplica
  `statement_timeout` e `query_timeout`, além de listener de erro do pool.

O número probatório desta rodada passa a ser 63 testes backend, sendo 62
aprovados e 1 integração PostgreSQL suspensa por ausência de `DATABASE_URL`.

## 17. Fechamento dos testes adversariais finais

Uma terceira passagem encerrou quatro bypasses residuais:

- `Conflict` usa a mesma factory validada dos demais resultados de falha;
- probes de readiness expirados permanecem coalescidos enquanto a operação
  subjacente não termina, e o pool limita aquisição de conexão;
- instantes de lease exigem representação ISO-8601 canônica, garantindo a mesma
  ordenação em memória e PostgreSQL;
- timestamps de staleness inválidos abortam o rebuild em vez de produzir
  `NaN`.

O número probatório final desta passagem é 65 testes backend: 64 aprovados e 1
integração PostgreSQL suspensa por ausência de `DATABASE_URL`.

## 18. Fundação do armazenamento atômico de Projection

O design aprovado em
`docs/superpowers/specs/2026-07-29-atomic-projection-store-design.md` adotou
staging genérico de candidatos completos e promoção por troca transacional do
head. O state permanece opaco e nenhuma Projection, Read Model, Event ou schema
de domínio foi criado.

Os commits que materializaram e corrigiram esta fundação antes da certificação
foram:

- `62e3d08`: contrato transversal e implementação em memória;
- `5cf566c`: lockfile reproduzível com todos os links dos workspaces npm,
  inclusive `generation`, `governance` e `persistence-postgres`;
- `000f851`: identidade composta do candidato e conflitos explícitos;
- `eb4f37c`: migration append-only, adapter PostgreSQL e teste de integração
  condicionado a `DATABASE_URL`;
- `6c29c5c`: preservação da representação JSONB-safe do candidato e rejeição
  explícita de representações não canônicas.

As provas comportamentais cobrem staging sem alteração do head, promoção
atômica, retry idempotente, conflito de conteúdo sob a mesma identidade,
isolamento por Projection, recusa de checkpoint regressivo e cópias isoladas.
A prova arquitetural adicional inspeciona imports do adapter de Projection e
permite somente os pacotes transversais `kernel`, `persistence` e
`persistence-postgres`; a independência do kernel em relação a Bounded Contexts
continua coberta pela mesma suíte.

Na execução desta rodada, `npm run test:all` descobriu 117 testes: 115
aprovados e 2 explicitamente suspensos. O detalhamento foi:

- suíte TypeScript: 107 testes, 105 aprovados e 2 suspensos;
- fronteiras arquiteturais: 4 testes aprovados;
- documentação: 6 testes aprovados.

Os dois testes suspensos são as integrações PostgreSQL de Event Store e de
Projection Store, ambas com a razão explícita `DATABASE_URL is not available`.
O Docker/PostgreSQL vivo continua indisponível neste ambiente; portanto não há
prova operacional real do adapter. `npm run typecheck` e `git diff --check`
também foram executados nesta rodada.

Este registro certifica somente a fundação técnica e suas provas locais. Ele não
declara certificação de produção, não substitui execução contra PostgreSQL real
e não autoriza nem afirma a existência de Projections de domínio.

## 19. Auditoria operacional para PostgreSQL vivo

Após a integração do Atomic Projection Store foram esgotadas as rotas locais
seguras para executar os testes PostgreSQL suspensos:

1. `com.docker.service` existe, mas permanece parado e não pode ser aberto pelo
   contexto atual;
2. Docker Desktop foi iniciado, porém o Engine não disponibilizou a named pipe;
3. WSL está instalado, mas a enumeração retorna `E_ACCESSDENIED`;
4. não existe serviço ou binário PostgreSQL detectável nos caminhos padrão;
5. Chocolatey localizou `postgresql18 18.4.0`, mas não pode escrever em
   `C:\ProgramData\chocolatey`;
6. o instalador oficial EDB foi baixado para D e validado pelo SHA-256
   `44B8187D2DB7E866495952D8260A1D7252CBB5125843142E1F0BF30115D23279`;
7. a execução normal foi cancelada pelo gate UAC;
8. a execução sem elevação via `RunAsInvoker` encerrou com código 1;
9. nenhuma instalação, diretório de dados ou serviço parcial foi criado.

Consequência: migrations e adapters possuem testes unitários, estáticos e
contratos executáveis, mas a certificação contra servidor PostgreSQL real
permanece bloqueada por disponibilidade administrativa externa.

Para remover o bloqueio basta Docker Engine funcional ou PostgreSQL local com
uma `DATABASE_URL` de desenvolvimento. Até lá, `/ready` responde `503`, e os
dois testes PostgreSQL permanecem suspensos com motivo explícito.

## 20. Limite atual de implementação de domínio

O cruzamento Architecture Lock × IRR V2 confirmou que todos os artefatos
`IMPLEMENTATION_READY` já foram materializados. Os Aggregates, Commands, Events,
Sagas, Projections específicas e contratos públicos restantes continuam
`IMPLEMENTATION_PARTIAL`, `IMPLEMENTATION_NOT_READY` ou bloqueados.

Nenhum módulo adicional pode ser gerado deterministicamente até que uma fonte
normativa promova seus artefatos ou forneça os contratos específicos ausentes.
Esse limite não autoriza inferência de payloads, error codes, owners, schemas ou
regras de negócio.

## 21. Estado probatório consolidado após revisão final

As revisões adversariais posteriores à seção 18 também fecharam:

- invalidação técnica de view sem mutar candidato;
- histórico de tombstones por identidade composta;
- proibição permanente de ressuscitar geração invalidada;
- recusa de conteúdo divergente durante promoção;
- preservação segura de `__proto__` como propriedade JSON;
- rejeição fail-fast de qualquer state não representável sem perda em JSONB.

Na `main` integrada foram executados:

- 118 testes TypeScript: 116 aprovados e 2 PostgreSQL suspensos;
- 4 testes de fronteira arquitetural aprovados;
- 6 testes documentais aprovados;
- typecheck aprovado;
- instalação limpa via `npm ci` aprovada;
- revisão independente final aprovada sem bloqueadores.

O backend local executa o commit `3833e32` em `127.0.0.1:3333`; o frontend em
`127.0.0.1:3000` consome seu manifesto real de capacidades.
