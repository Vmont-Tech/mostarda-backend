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

- [ ] Escrever testes que demonstrem staging sem promoção, promoção atômica,
      retry idempotente e recusa de checkpoint regressivo.
- [ ] Executar o teste e confirmar falha por módulo ausente.
- [ ] Implementar `InMemoryProjectionStore` e erros técnicos mínimos.
- [ ] Executar o teste e confirmar aprovação.
- [ ] Commitar `feat: add atomic projection store contract`.

### Task 2: Migration e adapter PostgreSQL

**Files:**
- Create: `migrations/004_projection_store.sql`
- Create: `packages/persistence-postgres/src/postgres-projection-store.ts`
- Modify: `packages/persistence-postgres/src/index.ts`
- Modify: `scripts/migrate.ts`
- Test: `tests/persistence/postgres-schema.test.ts`
- Test: `tests/integration/postgres-projection-store.test.ts`

- [ ] Escrever teste estático para tabelas, FKs e constraints da migration.
- [ ] Executar e confirmar falha pela migration ausente.
- [ ] Criar a migration append-only de candidatos e head único.
- [ ] Escrever teste de integração condicionado a `DATABASE_URL`.
- [ ] Executar e confirmar falha por adapter ausente quando PostgreSQL existir,
      ou skip explícito quando indisponível.
- [ ] Implementar staging, leitura e promoção numa transação PostgreSQL.
- [ ] Executar testes de persistência e typecheck.
- [ ] Commitar `feat: add postgres atomic projection store`.

### Task 3: Certificação e registro notarial

**Files:**
- Modify: `tests/architecture/boundaries.test.mjs`
- Modify: `docs/architecture/IMPLEMENTATION_NOTARIAL_LOG.md`

- [ ] Adicionar prova de que o adapter não importa Bounded Context.
- [ ] Executar o teste e confirmar o comportamento esperado.
- [ ] Registrar decisões, testes, limitações e ausência de PostgreSQL vivo.
- [ ] Executar `npm run test:all`, `npm run typecheck` e `git diff --check`.
- [ ] Solicitar revisão independente e corrigir achados.
- [ ] Commitar `docs: certify atomic projection store foundation`.
