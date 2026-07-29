# Code Generation Specification — Parte A

- **Versão:** `CGS-A-1`
- **Status:** `CANDIDATE`
- **Escopo:** tipos e infraestrutura técnica transversal

## 1. Autoridade e precedência

Esta CGS materializa, sem ampliar:

1. `docs/specification/PLATFORM_SPECIFICATION.md`;
2. `docs/specification/ARCHITECTURE_LOCK_REVIEW_V1.md`;
3. `docs/specification/IMPLEMENTATION_READINESS_REVIEW_V2.md`;
4. `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`.

Em conflito, a fonte superior prevalece. Esta CGS não promove artefato e não corrige lacuna de domínio.

## 2. Gate deny-by-default

O gerador opera em **deny-by-default**.

- `IMPLEMENTATION_AUTHORIZED` permite preparar o artefato dentro dos limites do IRR.
- `IMPLEMENTATION_READY` permite materialização definitiva.
- `IMPLEMENTATION_PARTIAL`, `IMPLEMENTATION_NOT_READY` e qualquer `IMPLEMENTATION_BLOCKED_*` não geram implementação definitiva.
- artefato ausente da matriz não é inferido;
- associação com artefato READY não promove dependências;
- template nunca preenche campo, Event, Command, owner ou comportamento ausente.

## 3. Unidades físicas

Todo módulo de Bounded Context possui:

```text
packages/<context>/
├── src/
│   ├── domain/
│   ├── application/
│   ├── contracts/
│   └── infrastructure/
└── test/
```

### Domain

Contém Aggregate, Entity, Value Object, Domain Service puro, Policy pura e aplicação de Event. Não importa framework, transporte, banco, relógio global ou provider.

### Application

Contém handlers, autorização de caso de uso, ports, orchestration local e transformação entre contrato e domínio. Não decide invariante do Aggregate.

### Contracts

Contém schemas versionados de Command, Event, Query, Read Model e Error específicos certificados. Contrato não contém comportamento.

### Infrastructure

Contém adapters de persistência, transporte, provider e observabilidade. Não é importada pelo Domain.

## 4. Kernel transversal

`packages/kernel` materializa apenas a TBS:

- identidades opacas;
- `Revision`;
- `ExpectedRevision`;
- Command envelope;
- Event envelope;
- Command Result;
- Error descriptor/envelope;
- replay;
- projection checkpoint;
- outbox/inbox ports;
- clock e identity generator ports.

O kernel não conhece nomes de contexto.

## 5. Representações

### 5.1 Identidades

Identidades são `string` opacas nominalmente marcadas. Nova identidade só nasce por port autorizado. Identidade de transporte é campo separado.

### 5.2 Revision

`Revision` é inteiro não negativo e monotônico por stream. Stream vazio possui revisão conceitual `-1` somente na API de append inicial. Persistência usa inteiro de 64 bits.

### 5.3 Command Result

Representação TypeScript:

```ts
type CommandStatus =
  | "Accepted"
  | "Rejected"
  | "Conflict"
  | "Duplicate"
  | "Expired"
  | "Unauthorized"
  | "InvariantViolation";
```

O resultado é discriminated union e contém os campos exigidos por `TBS-CMD-001`. `Duplicate` preserva o resultado original.

### 5.4 Errors

Código é estável e orientado a máquina. Mensagem é localizada fora do domínio. Error técnico desconhecido permanece desconhecido; não é convertido em erro de negócio por texto.

## 6. Event Sourcing

Aggregate event-sourced expõe:

- estado inicial explícito;
- `decide(command)` puro;
- `apply(event)` puro;
- revision observada;
- lista de Events não persistidos fora do estado reidratado.

Repositório:

1. carrega stream;
2. valida schemas;
3. executa replay;
4. entrega Aggregate somente após replay completo;
5. chama decisão;
6. persiste append atômico com ExpectedRevision;
7. retorna Command Result.

Unknown Event, gap, corrupção ou schema futuro incompatível aborta.

## 7. Persistência

PostgreSQL usa migrations explícitas. Event e outbox são gravados na mesma transação. Não existe update/delete de Event por aplicação.

Constraints obrigatórias:

- `event_id` único;
- `(stream_id, revision)` único;
- `command_id` correlacionável;
- payload e metadata versionados;
- inbox única por `(consumer, logical_event_id)`.

Snapshot é cache derivado e removível. Frequência não é fixada nesta CGS.

## 8. Publicação e consumo

Publisher lê outbox confirmada como não entregue e publica preservando EventId. Confirmação de broker marca entrega técnica sem alterar Event.

Consumer:

1. valida envelope/schema;
2. abre transação;
3. verifica inbox;
4. produz efeito idempotente;
5. grava inbox;
6. confirma transporte após commit.

## 9. Projections

Projection handler é puro sobre estado anterior e Event conhecido. Read Model persiste:

- `projectionVersion`;
- `checkpoint`;
- `asOf`;
- `staleness`;
- `rebuildId` quando aplicável.

Rebuild escreve em destino isolado e promove atomicamente somente após conclusão.

## 10. HTTP e OpenAPI

Fastify é adapter. JSON Schema valida input e output. OpenAPI 3.1 é derivada dos schemas registrados.

Mapeamento inicial:

| Resultado | HTTP |
| --- | --- |
| Accepted | 200/201/202 conforme contrato |
| Duplicate | mesmo status observável do resultado original |
| Rejected | 422 |
| Conflict | 409 |
| Expired | 410 |
| Unauthorized | 403 |
| InvariantViolation | 422 |

Autenticação ausente usa 401 e não é Command Result.

## 11. Clients

Frontend importa somente client gerado. É proibido:

- copiar DTO;
- importar Domain;
- redefinir enum de contrato;
- converter ausência em zero;
- tratar staleness como atual;
- decidir retry por mensagem.

## 12. Testes gerados

Todo artefato READY gera:

- schema validation;
- serialization round-trip;
- Command Result;
- autorização;
- idempotência;
- concorrência;
- replay;
- compatibilidade;
- architecture boundary;
- contract test.

Teste gerado não substitui teste normativo específico.

## 13. Evolução

Mudança nesta CGS que altera efeito observável exige revisão contra TBS. Mudança apenas estrutural mantém semântica. CGS Parte B somente pode especializar artefato READY.

