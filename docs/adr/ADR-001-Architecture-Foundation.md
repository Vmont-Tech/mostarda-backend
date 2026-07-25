# ADR-001 — Fundação Arquitetural

- **Status:** Aceito
- **Data:** 2026-07-25
- **Contexto:** Definição inicial da arquitetura da Mostarda.

## Contexto

A Mostarda opera um ecossistema multi-participante (Anunciante, Dono da TV, Dono do espaço, Vendedor, Influenciador, Mostarda, Grão), com regras econômicas explícitas, prova auditável por exibição e integrações críticas com Asaas, Quantum Cert e blockchain institucional. Precisamos de uma fundação arquitetural que sustente evolução por décadas, com equipes independentes trabalhando em paralelo.

## Decisão

Adotamos, como fundação obrigatória:

### 1. Clean Architecture
Separação estrita entre **domínio**, **casos de uso**, **adaptadores** e **infraestrutura**. O domínio não conhece frameworks, banco de dados, HTTP ou provedores externos. Dependências apontam sempre para dentro.

### 2. Domain-Driven Design (DDD)
- **Bounded Contexts** claros: Campaigns, Inventory, Pricing, Evidence, Settlement, Telemetry, AI, Quantum, Identity.
- **Linguagem ubíqua** definida em [`DOMAIN_DICTIONARY.md`](../domain/DOMAIN_DICTIONARY.md).
- **Agregados** com invariantes protegidas.
- **Anti-Corruption Layers** em toda integração externa (Asaas, Quantum, provedores de IA).

### 3. Event-Driven Architecture
- Comunicação inter-contexto por **eventos de domínio** em event bus interno.
- Processos multi-etapa (ex: Evidence → Settlement → Split) modelados como **sagas** com compensação.
- Contratos de evento versionados (`docs/events/`).
- Consumo idempotente em todos os handlers.

### 4. Modularização
- Cada bounded context é um **módulo** com fronteiras físicas explícitas.
- Módulos comunicam-se **apenas** por API pública e eventos — nunca por acesso direto ao banco de outro módulo.
- Deploy pode iniciar como monólito modular e evoluir para serviços independentes sem reescrever o domínio.

## Consequências

**Positivas**
- Domínio protegido de mudanças de infra/fornecedor.
- Equipes podem trabalhar em contextos diferentes em paralelo.
- Substituir Asaas, Quantum ou o provedor de IA não fere o núcleo.
- Auditoria e testes ficam viáveis em escala.

**Negativas**
- Curva de aprendizado maior no início.
- Custo de disciplina — exige revisão para não vazar dependência.
- Boilerplate inicial para eventos, portas e adaptadores.

**Mitigações**
- Templates de módulo e ADRs por contexto.
- Linter/arquitetura test para impedir dependência ilegal entre camadas.

## Complemento (2026-07-25) — Modelo de domínio oficial

Os bounded contexts citados nesta decisão são detalhados, de forma normativa, em
[`docs/domain/BOUNDED_CONTEXTS.md`](../domain/BOUNDED_CONTEXTS.md). O modelo estratégico completo
(Capabilities, Facets, Assets, Ownership, Domain Events, Value Objects, Aggregates, Worlds e
Domain Principles) vive em `docs/domain/` e é a **fonte única da verdade** para qualquer
implementação futura. Nenhum código pode contrariar esses documentos.
