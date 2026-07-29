# Mostarda Implementation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fundação técnica transversal executável, certificar os contratos específicos mínimos de GovernanceCase quando sustentados pelas fontes normativas e iniciar backend/frontend locais sem atravessar artefatos bloqueados.

**Architecture:** Monólito modular TypeScript com domínio isolado, Event Store PostgreSQL, outbox/inbox e contratos schema-first. Next.js consome somente clients gerados; o primeiro slice de domínio permanece bloqueado até cumprir mecanicamente os cinco gates do IRR V2.

**Tech Stack:** Node.js 24, TypeScript 5.9, npm workspaces, Fastify 5, PostgreSQL 18, Next.js App Router, React 19, JSON Schema/OpenAPI 3.1, node:test, Vitest e Playwright.

---

### Task 1: Proteger os worktrees e registrar a autoridade técnica

**Files:**
- Modify: `.gitignore`
- Create: `docs/architecture/CODE_GENERATION_SPECIFICATION_PART_A.md`
- Create: `docs/architecture/IMPLEMENTATION_DECISION_LOG.md`
- Test: `tests/documentation/technical-authority.test.mjs`

- [ ] **Step 1: escrever teste que exige as autoridades**

O teste deve verificar que CGS Parte A referencia TBS, Architecture Lock e IRR V2, e que proíbe geração de artefato bloqueado.

- [ ] **Step 2: executar o teste e observar falha**

Run: `node --test tests/documentation/technical-authority.test.mjs`

Expected: FAIL porque a CGS ainda não existe.

- [ ] **Step 3: criar CGS Parte A e Decision Log**

Materializar estrutura, nomes, tipos transversais, Result, Error, Event envelope, revisions, replay, outbox, inbox, projections, clients e testes sem conteúdo específico de Aggregate.

- [ ] **Step 4: executar testes e validação editorial**

Run: `node --test tests/documentation/technical-authority.test.mjs`

Expected: PASS.

Run: `git diff --check`

Expected: saída vazia.

- [ ] **Step 5: commit**

```powershell
git add .gitignore docs/architecture tests/documentation
git commit -m "docs: define code generation foundation"
```

### Task 2: Auditar os cinco gates específicos de GovernanceCase

**Files:**
- Create: `docs/specification/GOVERNANCE_IMPLEMENTATION_GATE_V1.md`
- Modify only when fully supported: `docs/governance/GOVERNANCE_CONTRACTS.md`
- Test: `tests/documentation/governance-gate.test.mjs`

- [ ] **Step 1: escrever teste de cobertura dos cinco gates**

O teste deve falhar se error code, Command, Event schema, entidade interna, compatibilidade ou teste TBS não possuir referência normativa.

- [ ] **Step 2: executar e observar os gaps**

Run: `node --test tests/documentation/governance-gate.test.mjs`

Expected: FAIL listando cada gate sem evidência.

- [ ] **Step 3: construir matriz de evidência**

Para cada campo e erro, registrar arquivo e seção autoritativa. Campo sem evidência permanece `BLOCKED`; não receber inferência.

- [ ] **Step 4: materializar somente contratos deriváveis**

Schema e código técnico podem nomear condição já especificada, mas não criar condição, transição ou fallback.

- [ ] **Step 5: reexecutar gate**

Run: `node --test tests/documentation/governance-gate.test.mjs`

Expected: PASS apenas se os cinco gates estiverem completos; caso contrário, relatório mantém Aggregate bloqueado e a execução segue somente com CGS Parte A.

- [ ] **Step 6: commit**

```powershell
git add docs/specification docs/governance tests/documentation
git commit -m "docs: certify governance implementation gate"
```

### Task 3: Inicializar workspace backend e harness TBS

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/kernel/package.json`
- Create: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/command-result.ts`
- Create: `packages/kernel/src/errors.ts`
- Create: `packages/kernel/src/envelopes.ts`
- Create: `tests/conformance/command-result.test.ts`
- Create: `tests/conformance/identity.test.ts`

- [ ] **Step 1: criar testes RED para Command Result**

Cobrir Accepted, Duplicate preservando resultado, conflito de payload e identidade lógica estável.

- [ ] **Step 2: instalar toolchain e observar falha**

Run: `npm.cmd install`

Run: `npm.cmd test -- tests/conformance/command-result.test.ts`

Expected: FAIL por módulos ausentes.

- [ ] **Step 3: implementar tipos e validações mínimas**

Usar discriminated union; validar presença dos campos TBS; não incluir conceito de domínio.

- [ ] **Step 4: verificar GREEN**

Run: `npm.cmd test`

Expected: todos os testes PASS.

- [ ] **Step 5: commit**

```powershell
git add package.json package-lock.json tsconfig.base.json packages tests
git commit -m "feat: add TBS conformance kernel"
```

### Task 4: Implementar Event Store transacional

**Files:**
- Create: `compose.yaml`
- Create: `migrations/001_event_store.sql`
- Create: `packages/persistence-postgres/src/event-store.ts`
- Create: `packages/persistence-postgres/src/postgres-event-store.ts`
- Create: `tests/integration/event-store.test.ts`

- [ ] **Step 1: escrever testes RED**

Cobrir append inicial, ExpectedRevision, append multi-event atômico, EventId duplicado, gap e leitura ordenada.

- [ ] **Step 2: iniciar PostgreSQL local**

Run: `docker compose up -d postgres`

Expected: container healthy.

- [ ] **Step 3: executar migration e testes**

Expected: testes falham porque adapter não existe.

- [ ] **Step 4: implementar adapter mínimo**

Uma transação deve comparar revisão, inserir Events e outbox. Nenhum merge automático.

- [ ] **Step 5: verificar**

Run: `npm.cmd run test:integration`

Expected: PASS.

- [ ] **Step 6: commit**

```powershell
git add compose.yaml migrations packages/persistence-postgres tests/integration
git commit -m "feat: add transactional event store"
```

### Task 5: Implementar replay, snapshots conceituais e projections

**Files:**
- Create: `packages/kernel/src/replay.ts`
- Create: `packages/kernel/src/projection.ts`
- Create: `tests/conformance/replay.test.ts`
- Create: `tests/conformance/projection.test.ts`

- [ ] **Step 1: escrever testes RED**

Cobrir replay integral, duplicate, gap, unknown schema, descarte de estado parcial, snapshot incompatível e rebuild sem side effect.

- [ ] **Step 2: verificar falhas esperadas**

Run: `npm.cmd test -- tests/conformance/replay.test.ts tests/conformance/projection.test.ts`

- [ ] **Step 3: implementar funções puras**

Replay aceita registry explícito; desconhecido aborta. Projection inclui version, checkpoint, asOf e staleness.

- [ ] **Step 4: verificar GREEN**

Run: `npm.cmd test`

- [ ] **Step 5: commit**

```powershell
git add packages/kernel tests/conformance
git commit -m "feat: add deterministic replay and projections"
```

### Task 6: Implementar outbox e inbox

**Files:**
- Create: `migrations/002_outbox_inbox.sql`
- Create: `packages/persistence-postgres/src/outbox.ts`
- Create: `packages/persistence-postgres/src/inbox.ts`
- Create: `tests/integration/outbox-inbox.test.ts`

- [ ] **Step 1: escrever testes RED**

Cobrir falha pós-commit/pré-publish, republicação com mesmo EventId, consumer duplicate e payload divergente.

- [ ] **Step 2: observar falha**

Run: `npm.cmd run test:integration`

- [ ] **Step 3: implementar**

Outbox usa lease recuperável; inbox possui unicidade por consumer e logical EventId.

- [ ] **Step 4: verificar**

Run: `npm.cmd run test:integration`

- [ ] **Step 5: commit**

```powershell
git add migrations packages/persistence-postgres tests/integration
git commit -m "feat: add transactional outbox and inbox"
```

### Task 7: Criar Cloud API e OpenAPI transversal

**Files:**
- Create: `apps/cloud-api/package.json`
- Create: `apps/cloud-api/src/server.ts`
- Create: `apps/cloud-api/src/health.ts`
- Create: `apps/cloud-api/src/command-result-mapping.ts`
- Create: `contracts/openapi/cloud-api.yaml`
- Create: `tests/contract/cloud-api.test.ts`

- [ ] **Step 1: escrever testes RED**

Cobrir liveness, readiness, erro seguro e mappings dos sete Command Results.

- [ ] **Step 2: observar falha**

Run: `npm.cmd run test:contract`

- [ ] **Step 3: implementar Fastify e schemas**

Health diferencia processo vivo de dependência pronta. OpenAPI é gerada/validada a partir do schema.

- [ ] **Step 4: verificar**

Run: `npm.cmd run test:contract`

Run: `npm.cmd run build`

- [ ] **Step 5: commit**

```powershell
git add apps contracts tests/contract
git commit -m "feat: add cloud API foundation"
```

### Task 8: Inicializar frontend Next.js e design tokens

**Repository:** `mostarda-frontend`

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `apps/web/**`
- Create: `packages/design-system/**`
- Create: `packages/contracts/**`
- Modify: `docs/design-system/DESIGN_SYSTEM.md`
- Test: `apps/web/tests/workspace-shell.test.tsx`

- [ ] **Step 1: escrever testes RED do shell**

Cobrir navegação mobile, composição desktop, reduced motion, loading, empty, stale, partial e unavailable.

- [ ] **Step 2: observar falha**

Run: `npm.cmd test`

- [ ] **Step 3: implementar shell mínimo**

Criar tokens Mostarda, header, navigation, Grao entry e painéis sem KPI inventado.

- [ ] **Step 4: gerar client da OpenAPI**

O pacote de contracts deve ser gerado; nenhum DTO manual pode duplicar schema.

- [ ] **Step 5: verificar**

Run: `npm.cmd test`

Run: `npm.cmd run build`

- [ ] **Step 6: commit**

```powershell
git add .
git commit -m "feat: add responsive intelligent workspace shell"
```

### Task 9: Integrar frontend e Cloud

**Files:**
- Backend Create: `apps/cloud-api/src/routes/system.ts`
- Frontend Create: `apps/web/src/data/cloud-health.ts`
- Frontend Create: `apps/web/src/features/system/system-status.tsx`
- Test: `tests/e2e/local-stack.spec.ts`

- [ ] **Step 1: escrever E2E RED**

O navegador deve carregar a home, consultar readiness real e representar indisponibilidade sem número falso.

- [ ] **Step 2: iniciar stack**

Run: `npm.cmd run dev`

Expected: Cloud `:3001`, Web `:3000`.

- [ ] **Step 3: implementar integração mínima**

Usar client gerado; falha explícita e acessível.

- [ ] **Step 4: verificar**

Run: `npm.cmd run test:e2e`

- [ ] **Step 5: commits coordenados**

Backend: `feat: expose system readiness`

Frontend: `feat: connect workspace to cloud readiness`

### Task 10: Certificação e relatório notarial

**Files:**
- Create: `docs/certification/IMPLEMENTATION_FOUNDATION_CERTIFICATION_V1.md`
- Create: `docs/reports/IMPLEMENTATION_NOTARIAL_LOG_V1.md`

- [ ] **Step 1: executar suíte completa**

Run: `npm.cmd run verify`

Expected: lint, types, unit, conformance, contract, integration e build PASS.

- [ ] **Step 2: verificar localhost**

Confirmar `http://localhost:3000` e `http://localhost:3001/health`.

- [ ] **Step 3: registrar evidências**

Incluir commits, comandos, resultados, artefatos autorizados, bloqueados, decisões técnicas e próximos slices.

- [ ] **Step 4: revisão final**

Run: `git diff --check`

Run: `git status --short`

- [ ] **Step 5: commit**

```powershell
git add docs/certification docs/reports
git commit -m "docs: certify implementation foundation"
```

