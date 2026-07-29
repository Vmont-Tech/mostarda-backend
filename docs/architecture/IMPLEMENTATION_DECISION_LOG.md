# Implementation Decision Log

## IDL-001 — Monólito modular inicial

- **Data:** 2026-07-29
- **Natureza:** técnica
- **Decisão:** iniciar Cloud como monólito modular extraível.
- **Autoridade:** ADR-001 permite explicitamente essa progressão.
- **Motivo:** preservar boundaries com menor custo operacional e validar contratos antes da distribuição física.
- **Não altera:** owners, Commands, Events ou regras de domínio.

## IDL-002 — Backend Node.js/TypeScript

- **Data:** 2026-07-29
- **Natureza:** técnica
- **Decisão:** Node.js 24 LTS, TypeScript estrito e Fastify 5.
- **Motivo:** SDK disponível no ambiente, desempenho adequado para I/O, schemas compartilháveis sem compartilhar domínio e suporte a modularização.
- **Alternativas consideradas:** .NET e JVM.
- **Evidência operacional:** ambiente possui runtime .NET, mas não SDK; Node.js 24 está instalado.
- **Não altera:** TBS ou domínio.

## IDL-003 — PostgreSQL como persistência inicial

- **Data:** 2026-07-29
- **Natureza:** técnica
- **Decisão:** PostgreSQL para Event Store, outbox, inbox e projections.
- **Motivo:** append transacional e publicação atômica no mesmo boundary; reduz componentes antes do vertical slice.
- **Não implica:** broker definitivo ou storage futuro imutável.

## IDL-004 — Next.js no frontend

- **Data:** 2026-07-29
- **Natureza:** técnica
- **Decisão:** Next.js App Router e React 19.
- **Motivo:** SSR/metadata para SEO e GEO, composição pública/autenticada e ecossistema de acessibilidade/testes.
- **Restrição:** Server Functions não podem se tornar owner de regra de domínio.

## IDL-005 — Sem mocks comerciais no frontend

- **Data:** 2026-07-29
- **Natureza:** conformidade
- **Decisão:** componentes representam estados reais; dados de cenário nascem por Commands certificados.
- **Permitido:** fixtures de contrato determinísticas em testes.
- **Proibido:** números aleatórios, DTO manual e endpoint fake no runtime.

## IDL-006 — GovernanceCase não promovido por associação

- **Data:** 2026-07-29
- **Natureza:** gate
- **Decisão:** manter `IMPLEMENTATION_PARTIAL` até cumprir os cinco ajustes do IRR V2.
- **Consequência:** somente CGS Parte A, kernel e harness TBS avançam antes da certificação específica.

