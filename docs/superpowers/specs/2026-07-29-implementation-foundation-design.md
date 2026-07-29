# Mostarda Implementation Foundation — Design

- **Status:** CANDIDATE
- **Data:** 2026-07-29
- **Escopo:** materialização técnica transversal e primeiro vertical slice
- **Autoridade:** ADRs aceitas → Platform Specification → specifications especializadas → Architecture Lock → IRR V2 → TBS

## 1. Objetivo

Criar uma fundação executável que transforme apenas artefatos autorizados em software testável, preservando DDD, Event Sourcing, CQRS, atomicidade, idempotência e separação entre domínio, contratos e apresentação.

Esta etapa não cria regras de negócio. Quando um contrato específico não puder ser derivado de fonte normativa, o gerador e a implementação devem recusá-lo.

## 2. Decisão de implantação inicial

A Cloud inicia como **monólito modular**, conforme ADR-001. Cada Bounded Context possui boundary físico, exports públicos e testes de arquitetura. Nenhum módulo acessa tabelas, repositories ou tipos internos de outro contexto.

Extração futura para serviços independentes deve preservar Commands, Events, contratos e owners. Microserviços não serão criados apenas para reproduzir a lista de Bounded Contexts.

## 3. Stack da CGS Parte A

### 3.1 Backend

- Node.js 24 LTS;
- TypeScript 5.9 em modo estrito;
- npm workspaces;
- Fastify 5 na borda HTTP;
- JSON Schema como schema executável da borda;
- OpenAPI 3.1 gerado a partir dos schemas autoritativos;
- PostgreSQL 18 para Event Store, projections, outbox, inbox e idempotency records;
- migrations SQL explícitas;
- `node:test` para o harness transversal e testes de conformidade sem dependência de framework;
- Vitest somente quando necessário para componentes que dependam de bundler;
- Docker Compose para PostgreSQL local.

O domínio não importa Fastify, PostgreSQL, OpenAPI ou qualquer biblioteca de transporte.

### 3.2 Frontend

- Next.js App Router;
- React 19;
- TypeScript estrito;
- Server Components para conteúdo público e composição de leitura;
- Client Components apenas para interação, mapa, motion e streaming;
- CSS variables e tokens semânticos como autoridade visual;
- clients TypeScript gerados de OpenAPI;
- Playwright para jornadas;
- testes de componentes e acessibilidade;
- design mobile-first com composição desktop própria.

### 3.3 Contratos

- schema conceitual precede schema físico;
- OpenAPI cobre HTTP síncrono;
- AsyncAPI cobre integração assíncrona somente após produtor, consumidor, ordering e compatibilidade certificados;
- Protobuf não será gerado por associação;
- tipos frontend nunca espelham manualmente entidades do backend;
- todo contrato inclui versão, identidade, correlação, causalidade e erro conforme TBS.

## 4. Estrutura do backend

```text
mostarda-backend/
├── apps/
│   └── cloud-api/
├── packages/
│   ├── kernel/
│   │   ├── domain/
│   │   ├── application/
│   │   └── contracts/
│   ├── governance/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── contracts/
│   │   └── infrastructure/
│   ├── experience-api/
│   ├── persistence-postgres/
│   └── testing/
├── contracts/
│   ├── openapi/
│   ├── asyncapi/
│   └── schemas/
├── migrations/
├── tests/
│   ├── architecture/
│   ├── conformance/
│   ├── contract/
│   └── integration/
└── compose.yaml
```

`kernel` contém somente semântica técnica transversal já definida pela TBS. Ele não contém conceitos de Campaign, Financial, Governance ou TV Network.

## 5. Estrutura do frontend

```text
mostarda-frontend/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (public)/
│       │   ├── (auth)/
│       │   └── (workspace)/
│       ├── features/
│       └── public/
├── packages/
│   ├── design-system/
│   ├── contracts/
│   ├── grao/
│   ├── analytics/
│   └── testing/
└── docs/
```

Site público e workspace compartilham tokens e componentes, mas não fronteiras de autorização. Console operacional é aplicação futura separada.

## 6. Persistência normativa

### 6.1 Event Store

Cada Event persistido contém:

- `event_id`;
- `stream_id`;
- `stream_type`;
- `revision`;
- `event_type`;
- `schema_version`;
- `payload`;
- `metadata`;
- `command_id`;
- `correlation_id`;
- `causation_id`;
- `recorded_at`.

Existe unicidade por `event_id` e por `(stream_id, revision)`. Append compara `ExpectedRevision` e grava todos os Events e outbox records na mesma transação.

### 6.2 Outbox e Inbox

Outbox preserva identidade do Event e permanece publicável até confirmação. Inbox deduplica por consumidor e identidade lógica. Replay e rebuild desabilitam side effects externos.

### 6.3 Projections

Toda projection registra:

- versão da regra;
- checkpoint;
- `asOf`;
- staleness;
- estado de rebuild;
- última falha segura.

Projection parcial nunca é promovida como atual.

## 7. Borda HTTP

Commands usam `POST` e exigem:

- `commandId`;
- `idempotencyKey`;
- `expectedRevision` quando aplicável;
- `correlationId`;
- actor autenticado;
- payload versionado.

O resultado representa exatamente um dos estados TBS:

`Accepted`, `Rejected`, `Conflict`, `Duplicate`, `Expired`, `Unauthorized`, `InvariantViolation`.

Queries retornam dados derivados com `asOf`, `projectionVersion` e `staleness`. HTTP status é mapeamento técnico e nunca redefine o status normativo.

## 8. Experience API

Experience API compõe Read Models para o frontend. Ela não:

- calcula métricas;
- reconstrói saldo;
- decide disponibilidade;
- altera Aggregate;
- reinterpreta Event;
- decide responsabilidade;
- executa Command em nome do owner sem autorização explícita.

Respostas compostas devem representar fonte indisponível, parte ausente e staleness sem preencher lacunas por zero ou fallback silencioso.

## 9. Primeiro vertical slice

O slice de referência será `GovernanceCase`, condicionado aos cinco ajustes do IRR V2:

1. error codes específicos;
2. schemas versionados dos Events;
3. contratos internos completos;
4. compatibilidade/upcast por Event;
5. suíte de conformidade.

Somente após auditoria mecânica desses itens o Aggregate pode ser promovido. Até lá, é permitido implementar:

- kernel transversal;
- harness TBS;
- Event Store genérico;
- outbox/inbox genéricos;
- contrato de Command Result;
- envelope de erro;
- infraestrutura descartável de teste.

## 10. Frontend do primeiro slice

O frontend inicial entrega:

- shell mobile e desktop do Mostarda Intelligent Workspace;
- design tokens;
- estados loading, empty, partial, stale, unavailable e error;
- consulta real de health/readiness da Cloud;
- tela de timeline de Governance somente quando seu Read Model estiver certificado;
- Grão como presença visual sem simular decisão ou recomendação inexistente.

Nenhum KPI comercial será mockado. Cenários locais serão produzidos por Commands reais depois da certificação correspondente.

## 11. Segurança

- tokens de longa duração não são persistidos em `localStorage`;
- sessão web usa cookie `HttpOnly`, `Secure` em produção e `SameSite`;
- CSP restritiva;
- validação de schema em toda borda;
- logs estruturados com redaction;
- secrets somente por ambiente;
- nenhuma evidência, PII ou payload sensível em Error seguro;
- contratos públicos usam identificadores opacos.

## 12. Observabilidade

Cada request, Command, Event e projection update propaga correlation e causation. Health distingue liveness, readiness e dependency health. Falha parcial não é mascarada como sucesso total.

## 13. Desenvolvimento local

```text
PostgreSQL :5432
Cloud API :3001
Web       :3000
```

O repositório fornece comandos únicos para:

- instalar;
- migrar;
- seed por Commands;
- testar;
- iniciar;
- verificar health.

## 14. Critérios de aceitação

A fundação somente é aprovada quando:

1. testes de arquitetura impedem dependência ilegal;
2. perfil TBS possui testes executáveis;
3. append concorrente perde deterministicamente;
4. duplicate retorna resultado original;
5. replay desconhecido aborta e descarta estado parcial;
6. outbox sobrevive a falha entre commit e publish;
7. projection informa checkpoint e staleness;
8. OpenAPI é validada e gera client;
9. frontend não possui tipo de contrato manual;
10. frontend e API executam em localhost;
11. nenhum artefato bloqueado é apresentado como implementado;
12. relatório notarial registra decisões, evidências, limitações e próximos gates.

## 15. Consequências

### Positivas

- um stack único reduz atrito inicial;
- monólito modular preserva boundaries sem custo operacional prematuro;
- contratos gerados eliminam drift;
- SSR sustenta SEO/GEO;
- o slice valida toda a cadeia antes de expansão.

### Riscos

- TypeScript exige disciplina para não substituir invariantes runtime por tipos;
- PostgreSQL como Event Store exige testes rigorosos de append e ordering;
- Experience API pode virar owner acidental se começar a calcular;
- Next.js pode induzir lógica de backend no frontend.

Esses riscos são mitigados por schemas runtime, architecture tests, boundaries e contratos.

