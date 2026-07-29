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
