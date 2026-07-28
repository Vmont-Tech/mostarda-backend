# Partner Network Operating Model Documentation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar o modelo Freemium/completo da rede de parceiros, continuidade operacional, fundo de influenciadores, prova universal de playback, precificação inicial e proveniência patrimonial sem introduzir decisões além das aprovadas pelo fundador.

**Architecture:** `PLATFORM_SPECIFICATION.md` permanece a autoridade primária. Uma especificação especializada de produto descreve o modelo comercial e de grade; especificações de domínio próprias detalham continuidade de hardware e fundo de influenciadores. Documentos derivados são sincronizados por referências normativas, preservando owners existentes: Campaign/Slot para programação, Pricing para preço, Evidence Ledger para prova, TV Network para estado operacional, Financial para lançamentos, Quantum para âncoras e Governance para julgamentos.

**Tech Stack:** Markdown normativo, DDD, Event Sourcing, CQRS, contratos conceituais append-only e Git.

---

### Task 1: Consolidar a autoridade normativa

**Files:**
- Create: `docs/product/PARTNER_NETWORK_OPERATING_MODEL.md`
- Modify: `docs/specification/PLATFORM_SPECIFICATION.md`
- Modify: `docs/specification/DECISION_REGISTRY.md`
- Modify: `docs/specification/TRACEABILITY.md`

- [ ] **Step 1: Escrever a especificação especializada**

Registrar propósito, modos Freemium/completo, grade 40/60 por faixa, composição de Slots, imutabilidade, sugestões, retenção temporária, pagamento, Pricing, offline, fallback, Evidence, onboarding e upgrade.

- [ ] **Step 2: Atualizar a Specification primeiro**

Adicionar regras `SPEC-PARTNER-*`, especializar Pricing/Evidence/Financial/TV e substituir o antigo Insurance pelo Plano Mostarda de Continuidade Operacional.

- [ ] **Step 3: Registrar decisões e rastreabilidade**

Adicionar decisões estáveis, documentos derivados e fluxos ponta a ponta, explicitando supersessões.

- [ ] **Step 4: Validar autoridade**

Run: `rg -n "SPEC-PARTNER|DEC-04|Partner Network|Continuidade Operacional" docs/specification docs/product`

Expected: todas as regras novas possuem autoridade, decisão e derivação identificáveis.

### Task 2: Especificar continuidade operacional e proveniência

**Files:**
- Create: `docs/domain/HARDWARE_CONTINUITY.md`
- Modify: `docs/domain/INSURANCE.md`
- Modify: `docs/tv-network/INSTALLATION.md`
- Modify: `docs/tv-network/DEVICE_REGISTRY.md`
- Modify: `docs/tv-network/EDGE_RUNTIME.md`

- [ ] **Step 1: Definir o contexto de continuidade**

Documentar plano mensal, preço piloto versionado, manutenção, TV temporária da Mostarda, reparo, perda total, equivalência, coparticipação por limites e banco circular de peças.

- [ ] **Step 2: Definir proveniência e troca**

Documentar declaração de propriedade, onboarding remoto assistido, pacote probatório, assinatura, QuantumAnchor, troca bilateral e histórico patrimonial append-only.

- [ ] **Step 3: Superseder Insurance**

Transformar `INSURANCE.md` em registro explícito de supersessão, sem preservar linguagem de apólice, prêmio, sinistro ou fundo securitário como norma vigente.

- [ ] **Step 4: Sincronizar TV Network**

Registrar instalação autoguiada assistida, desafio de presença, provisioning remoto, fallback local, operação offline e lifecycle de substituição.

### Task 3: Especificar o Fundo de Desenvolvimento de Influenciadores

**Files:**
- Create: `docs/domain/INFLUENCER_DEVELOPMENT_FUND.md`
- Modify: `docs/domain/REVENUE_ARCHITECTURE.md`
- Modify: `docs/product/PRODUCT_BIBLE.md`
- Modify: `docs/product/BUSINESS_FOUNDATION.md`

- [ ] **Step 1: Definir patrimônio restrito**

Registrar que a parcela de 10% sem influenciador elegível pertence ao fundo, nunca à receita livre da Mostarda.

- [ ] **Step 2: Definir governança**

Registrar política versionada, mais de 50% do equity total, ao menos dois votos favoráveis, snapshot societário imutável e execução financeira segregada.

- [ ] **Step 3: Definir usos permitidos**

Abranger infraestrutura, estúdios, produção, aquisição, capacitação, campanhas, eventos e projetos diretamente relacionados ao ecossistema de influenciadores.

### Task 4: Sincronizar Campaign, Pricing, Evidence e Financial

**Files:**
- Modify: `docs/domain/CAMPAIGN_MANAGEMENT.md`
- Modify: `docs/domain/PRICING_ENGINE.md`
- Modify: `docs/domain/EVIDENCE_PIPELINE.md`
- Modify: `docs/financial/PAYMENT_POLICY.md`
- Modify: `docs/financial/PAYMENT_FLOW.md`
- Modify: `docs/financial/FINANCIAL_ARCHITECTURE.md`
- Modify: `docs/financial/FINANCIAL_INVARIANTS.md`
- Modify: `docs/financial/FINANCIAL_DECISION_REGISTER.md`

- [ ] **Step 1: Sincronizar programação**

Adicionar blocos contíguos, limite local de dois Slots, busca explicável de alternativas, retenção temporária e proibição de preempção.

- [ ] **Step 2: Sincronizar Pricing**

Adicionar preço-base provisório, benchmarks, confiança limitada, dinâmica por oferta/demanda e recálculo formal versionado.

- [ ] **Step 3: Sincronizar Evidence**

Adicionar propósito tipado, campos probatórios comuns e extensão econômica exclusiva de playback monetizado.

- [ ] **Step 4: Sincronizar pagamento**

Registrar budget líquido solicitado, taxas adicionadas e discriminadas, Quote/hold coexpirantes, confirmação dentro do prazo e boleto apenas para aporte antecipado.

- [ ] **Step 5: Remover autoridade securitária antiga**

Substituir referências ativas a Insurance Fund por receita/obrigações do Plano de Continuidade, sem misturar CampaignBudget ou PartnerLedger.

### Task 5: Sincronizar catálogos arquiteturais

**Files:**
- Modify: `docs/domain/BOUNDED_CONTEXTS.md`
- Modify: `docs/domain/AGGREGATES.md`
- Modify: `docs/domain/DOMAIN_EVENTS.md`
- Modify: `docs/domain/OWNERSHIP.md`
- Modify: `docs/execution/COMMANDS.md`
- Modify: `docs/execution/EVENTS.md`
- Modify: `docs/execution/SAGAS.md`
- Modify: `docs/execution/STATE_MACHINES.md`

- [ ] **Step 1: Atualizar bounded context e Aggregates**

Remover Insurance como autoridade vigente e registrar Hardware Continuity, seus Aggregates e relações.

- [ ] **Step 2: Atualizar Commands e Events**

Adicionar contratos conceituais de grade, hold, continuidade, fundo, proveniência e troca, com owner único.

- [ ] **Step 3: Atualizar Sagas e states**

Adicionar checkout com hold, recuperação offline, manutenção/substituição e transferência bilateral compensável.

### Task 6: Validar e integrar

**Files:**
- Validate: all modified Markdown files

- [ ] **Step 1: Verificar conflitos terminológicos**

Run: `rg -n "InsuranceFund|InsurancePolicy|InsurancePremium|InsuranceClaim|seguro obrigatório|Evidence fiscal" docs --glob "*.md"`

Expected: ocorrências vigentes removidas ou explicitamente marcadas como históricas/supersedidas.

- [ ] **Step 2: Verificar regras críticas**

Run: `rg -n "40%|60%|TEMPORARILY_HELD|LOCAL_FREEMIUM_PLAYBACK|24,90|Fundo de Desenvolvimento|OWNERSHIP_DECLARED" docs --glob "*.md"`

Expected: cada decisão aparece na Specification ou especificação especializada e nos derivados necessários.

- [ ] **Step 3: Verificar links e whitespace**

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Revisar diff e status**

Run: `git diff --stat && git status --short`

Expected: somente documentação e o presente plano.

- [ ] **Step 5: Commit e publicação**

Run: `git add docs && git commit -m "docs: define partner network operating model" && git push origin main`

Expected: commit criado na `main` e publicado em `origin/main`.
