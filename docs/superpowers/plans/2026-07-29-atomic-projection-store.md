# Atomic Projection Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materializar staging isolado e promoção atômica de rebuilds de
Projection sem criar contratos de domínio.

**Architecture:** O kernel mantém o contrato transversal. Implementações em
memória e PostgreSQL persistem candidatos completos; somente `promote` troca o
head corrente, com monotonicidade de checkpoint e retry idempotente.

**Tech Stack:** Node.js 24, TypeScript 5.9, PostgreSQL, `node:test`.

---

### Task 1: Contrato comportamental em memória

**Files:**
- Create: `packages/persistence/src/projection-store.ts`
- Modify: `packages/persistence/src/index.ts`
- Test: `tests/persistence/projection-store.test.ts`

- [x] Escrever testes que demonstrem staging sem promoção, promoção atômica,
      retry idempotente e recusa de checkpoint regressivo.
- [x] Executar o teste e confirmar falha por módulo ausente.
- [x] Implementar `InMemoryProjectionStore` e erros técnicos mínimos.
- [x] Executar o teste e confirmar aprovação.
- [x] Commitar `feat: add atomic projection store contract`.

### Task 2: Migration e adapter PostgreSQL

**Files:**
- Create: `migrations/004_projection_store.sql`
- Create: `packages/persistence-postgres/src/postgres-projection-store.ts`
- Modify: `packages/persistence-postgres/src/index.ts`
- Modify: `scripts/migrate.ts`
- Test: `tests/persistence/postgres-schema.test.ts`
- Test: `tests/integration/postgres-projection-store.test.ts`

- [x] Escrever teste estático para tabelas, FKs e constraints da migration.
- [x] Executar e confirmar falha pela migration ausente.
- [x] Criar a migration append-only de candidatos e head único.
- [x] Escrever teste de integração condicionado a `DATABASE_URL`.
- [x] Executar e confirmar falha por adapter ausente quando PostgreSQL existir,
      ou skip explícito quando indisponível.
- [x] Implementar staging, leitura e promoção numa transação PostgreSQL.
- [x] Executar testes de persistência e typecheck.
- [x] Commitar `feat: add postgres atomic projection store`.

### Task 3: Certificação e registro notarial

**Files:**
- Modify: `tests/architecture/boundaries.test.mjs`
- Modify: `docs/architecture/IMPLEMENTATION_NOTARIAL_LOG.md`

- [x] Adicionar prova de que o adapter não importa Bounded Context.
- [x] Executar o teste e confirmar o comportamento esperado.
- [x] Registrar decisões, testes, limitações e ausência de PostgreSQL vivo.
- [x] Executar `npm run test:all`, `npm run typecheck` e `git diff --check`.
- [ ] Solicitar revisão independente e corrigir achados.
- [x] Commitar `docs: certify atomic projection store foundation`.
