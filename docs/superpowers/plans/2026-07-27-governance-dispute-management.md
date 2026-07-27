# Governance & Dispute Management Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sincronizar Governance & Dispute Management como único owner de julgamentos oficiais, fechar `OPEN-049` e remover atribuições locais de responsabilidade sem alterar a autoridade dos fatos de origem.

**Architecture:** `GovernanceCase` referencia fatos autoritativos, conduz investigação append-only e publica `ResponsibilityDecisionPublished`. Contextos de origem continuam donos de seus fatos; Financial, Settlement, Campaign, Notifications e Analytics apenas materializam consequências da decisão publicada.

**Tech Stack:** Markdown normativo, DDD, Event Sourcing conceitual, Commands/Events, PowerShell para validação, Git.

---

## Estrutura de arquivos

- Criar `docs/governance/GOVERNANCE_DISPUTE_MANAGEMENT.md`: especificação integral do contexto.
- Criar `docs/governance/GOVERNANCE_COMMANDS.md`: catálogo de Commands.
- Criar `docs/governance/GOVERNANCE_EVENTS.md`: catálogo de Events.
- Criar `docs/governance/GOVERNANCE_STATE_MACHINE.md`: lifecycle do GovernanceCase.
- Criar `docs/governance/GOVERNANCE_INVARIANTS.md`: invariantes e proibições.
- Modificar `docs/specification/PLATFORM_SPECIFICATION.md`: fechar `OPEN-049` e consolidar regra global.
- Modificar `docs/specification/DECISION_REGISTRY.md`: registrar decisão e supersessões.
- Modificar `docs/specification/TRACEABILITY.md`: mapear regra, fluxos e documentos.
- Modificar `docs/specification/ARCHITECTURE_AUDIT.md`: registrar reauditoria.
- Modificar `docs/domain/BOUNDED_CONTEXTS.md`, `AGGREGATES.md`, `DOMAIN_DICTIONARY.md`, `DOMAIN_EVENTS.md`, `SYSTEM_INVARIANTS.md`: sincronizar domínio.
- Modificar `docs/execution/COMMANDS.md`, `EVENTS.md`, `STATE_MACHINES.md`, `SAGAS.md`, `TIMELINES.md`, `EXECUTION_INVARIANTS.md`: sincronizar modelo executável.
- Modificar `docs/domain/EVIDENCE_PIPELINE.md`, `REVENUE_ARCHITECTURE.md`, `CAMPAIGN_MANAGEMENT.md`: remover julgamentos locais.
- Modificar documentos de `docs/financial/`: materializar consequências sem inferir responsabilidade.
- Modificar `docs/README.md` e `docs/domain/README.md`: atualizar índices.

### Task 1: Criar a especificação integral do bounded context

**Files:**
- Create: `docs/governance/GOVERNANCE_DISPUTE_MANAGEMENT.md`
- Modify: `docs/README.md`
- Modify: `docs/domain/README.md`

- [ ] **Step 1: Escrever a especificação**

Incluir literalmente:

```text
Owner: Governance & Dispute Management
Aggregate root: GovernanceCase
Entities: EvidenceReference, Investigation, ResponsibilityDecision, Appeal
States: OPEN, INVESTIGATING, UNDER_REVIEW, DECIDED, APPEALED, REEVALUATING, CLOSED
Official event: ResponsibilityDecisionPublished
```

Definir `ResponsibleParty`, `ResponsibilityCategory`, `Severity`, confidence decimal `[0.00,1.00]`, `GovernancePolicyVersion`, recurso, revisão, consumidores, consistência eventual, replay, rebuild, exemplos e contraexemplos conforme o design aprovado.

Declarar como invariantes:

- confidence é obrigatório, explicativo e auditável;
- confidence não determina a validade jurídica ou operacional da decisão;
- ResponsibilityDecisionPublished é sempre oficial, independentemente do confidence;
- confidence nunca controla efeitos de negócio, financeiros, contratuais ou jurídicos;
- classificações LOW/MEDIUM/HIGH de confidence são somente projections e nunca são persistidas;
- toda ResponsibilityDecision referencia exatamente uma policyVersion;
- policyVersion e sua referência na decisão são imutáveis;
- nova policy exige nova ResponsibilityDecision e nova revision append-only;
- `UNKNOWN` somente é publicável após investigação concluída.

- [ ] **Step 2: Verificar termos obrigatórios**

Run:

```powershell
Select-String docs\governance\GOVERNANCE_DISPUTE_MANAGEMENT.md -Pattern 'GovernanceCase','ResponsibilityDecisionPublished','GovernancePolicyVersion','UNKNOWN','confidence','exclusivamente explicativa','policyVersion'
```

Expected: ao menos uma ocorrência de cada termo.

- [ ] **Step 3: Atualizar índices**

Adicionar `docs/governance/` ao índice principal e a especificação à ordem de leitura do domínio.

- [ ] **Step 4: Commit**

```powershell
git add docs/governance/GOVERNANCE_DISPUTE_MANAGEMENT.md docs/README.md docs/domain/README.md
git commit -m "docs: specify governance dispute context"
```

### Task 2: Criar contratos especializados

**Files:**
- Create: `docs/governance/GOVERNANCE_COMMANDS.md`
- Create: `docs/governance/GOVERNANCE_EVENTS.md`
- Create: `docs/governance/GOVERNANCE_STATE_MACHINE.md`
- Create: `docs/governance/GOVERNANCE_INVARIANTS.md`

- [ ] **Step 1: Criar catálogo de Commands**

Definir owner, actor, pré-condições, pós-condições, Events, idempotência, concorrência e falhas para:

```text
OpenGovernanceCase
AttachEvidenceReference
StartInvestigation
RequestHumanReview
ClassifyResponsibility
PublishDecision
AppealDecision
ReevaluateGovernanceCase
CloseGovernanceCase
```

- [ ] **Step 2: Criar catálogo de Events**

Definir producer, consumers, payload, ordering, deduplicação, replay e compensação para:

```text
GovernanceCaseOpened
EvidenceReferenceAttached
InvestigationStarted
HumanReviewRequested
ResponsibilityDecisionPublished
ResponsibilityDecisionAppealed
GovernanceCaseReevaluated
GovernanceCaseClosed
```

Proibir explicitamente `ResponsibilityAssigned` e `ResponsibilityReassigned`.

- [ ] **Step 3: Criar state machine**

Documentar cada transição:

```text
OPEN → INVESTIGATING
INVESTIGATING → UNDER_REVIEW
INVESTIGATING/UNDER_REVIEW → DECIDED
DECIDED → APPEALED
APPEALED → REEVALUATING
REEVALUATING → DECIDED
DECIDED → CLOSED
```

`UNKNOWN` só pode aparecer em decisão publicada após investigação; nunca é estado do Aggregate.

- [ ] **Step 4: Criar invariantes**

Incluir as 21 invariantes do design e proibições de julgamento por consumidores.

- [ ] **Step 5: Validar contratos**

Run:

```powershell
Get-ChildItem docs\governance -Filter *.md | Select-String -Pattern 'ResponsibilityAssigned','ResponsibilityReassigned'
```

Expected: ocorrências somente em proibições explícitas.

- [ ] **Step 6: Commit**

```powershell
git add docs/governance
git commit -m "docs: define governance commands and events"
```

### Task 3: Fechar governança e rastreabilidade

**Files:**
- Modify: `docs/specification/PLATFORM_SPECIFICATION.md`
- Modify: `docs/specification/DECISION_REGISTRY.md`
- Modify: `docs/specification/TRACEABILITY.md`
- Modify: `docs/specification/ARCHITECTURE_AUDIT.md`

- [ ] **Step 1: Fechar OPEN-049**

Remover `OPEN-049` da tabela de decisões abertas e adicionar regra normativa:

```text
Governance & Dispute Management é o único owner do julgamento oficial.
ResponsibilityDecisionPublished é o único contrato público de decisão.
```

- [ ] **Step 2: Registrar decisão**

Adicionar novo `DEC-*` após o maior identificador existente, contendo nome do contexto, GovernanceCase, decisão revisionada e consumidores não interpretativos.

- [ ] **Step 3: Atualizar rastreabilidade**

Mapear Specification → arquivos Governance → Commands/Events/Saga → Financial/Settlement/Campaign/Notifications/Analytics.

- [ ] **Step 4: Atualizar auditoria**

Marcar `OPEN-049` como fechado e Governance como implementável normativamente.

- [ ] **Step 5: Verificar fechamento**

Run:

```powershell
Get-ChildItem docs -Recurse -Filter *.md | Select-String -Pattern 'OPEN-049'
```

Expected: somente referências históricas explicitamente marcadas como `CLOSED`.

- [ ] **Step 6: Commit**

```powershell
git add docs/specification
git commit -m "docs: close governance responsibility decision"
```

### Task 4: Sincronizar modelo de domínio

**Files:**
- Modify: `docs/domain/BOUNDED_CONTEXTS.md`
- Modify: `docs/domain/AGGREGATES.md`
- Modify: `docs/domain/DOMAIN_DICTIONARY.md`
- Modify: `docs/domain/DOMAIN_EVENTS.md`
- Modify: `docs/domain/SYSTEM_INVARIANTS.md`

- [ ] **Step 1: Adicionar bounded context**

Declarar responsabilidades, não responsabilidades, relações e owner único.

- [ ] **Step 2: Adicionar GovernanceCase**

Registrar Aggregate, entidades, Value Objects, invariantes e Events.

- [ ] **Step 3: Adicionar vocabulário**

Definir GovernanceCase, ResponsibilityDecision, GovernancePolicyVersion, ResponsibilityCategory, Severity, Confidence e Appeal.

- [ ] **Step 4: Atualizar eventos globais**

Adicionar apenas os oito Events aprovados e remover aliases de Assigned/Reassigned.

- [ ] **Step 5: Adicionar invariante global**

```text
Todos os contextos produzem fatos; somente Governance & Dispute Management publica julgamentos.
```

- [ ] **Step 6: Commit**

```powershell
git add docs/domain
git commit -m "docs: integrate governance domain model"
```

### Task 5: Sincronizar modelo executável

**Files:**
- Modify: `docs/execution/COMMANDS.md`
- Modify: `docs/execution/EVENTS.md`
- Modify: `docs/execution/STATE_MACHINES.md`
- Modify: `docs/execution/SAGAS.md`
- Modify: `docs/execution/TIMELINES.md`
- Modify: `docs/execution/EXECUTION_INVARIANTS.md`

- [ ] **Step 1: Adicionar Commands globais**

Copiar os contratos especializados sem alterar owner, nomes ou semântica.

- [ ] **Step 2: Adicionar Events globais**

Declarar ordering por `GovernanceCaseId + aggregateRevision` e dedupe por Event ID.

- [ ] **Step 3: Adicionar state machine**

Representar todas as transições, timeouts, retries, recurso e terminalidade.

- [ ] **Step 4: Criar Governance Saga**

Desenhar:

```text
Source facts
→ OpenGovernanceCase
→ AttachEvidenceReference
→ StartInvestigation
→ deterministic classification or HumanReviewRequested
→ PublishDecision
→ ResponsibilityDecisionPublished
→ owner-specific Commands
```

- [ ] **Step 5: Criar Saga de recurso**

Desenhar Appeal → Reevaluate → nova publicação → compensações append-only.

- [ ] **Step 6: Atualizar timeline**

Adicionar Governance após fatos materiais e antes das consequências de responsabilidade.

- [ ] **Step 7: Commit**

```powershell
git add docs/execution
git commit -m "docs: integrate governance execution model"
```

### Task 6: Remover julgamentos dos contextos de origem

**Files:**
- Modify: `docs/domain/EVIDENCE_PIPELINE.md`
- Modify: `docs/domain/REVENUE_ARCHITECTURE.md`
- Modify: `docs/domain/CAMPAIGN_MANAGEMENT.md`
- Modify: `docs/financial/FINANCIAL_ARCHITECTURE.md`
- Modify: `docs/financial/FINANCIAL_COMMANDS.md`
- Modify: `docs/financial/FINANCIAL_EVENTS.md`
- Modify: `docs/financial/FINANCIAL_INVARIANTS.md`
- Modify: `docs/financial/PAYMENT_FLOW.md`

- [ ] **Step 1: Preservar disputas internas**

Manter Evidence `DISPUTED` e Payment `DISPUTED` somente como estados internos de validade/lifecycle.

- [ ] **Step 2: Remover culpa local**

Substituir frases que atribuem responsável por publicação de fatos e abertura/referência de GovernanceCase.

- [ ] **Step 3: Vincular consequências financeiras**

Exigir `decisionId + decisionRevision` em:

```text
PlatformLossEntry
PartnerCompensation
AdvertiserRefund
recovery against responsible party
```

- [ ] **Step 4: Vincular Settlement**

Settlement cria, bloqueia ou compensa direitos por Commands próprios causados pela decisão; nunca altera direito diretamente por Event.

- [ ] **Step 5: Validar ausência de inferência**

Run:

```powershell
Get-ChildItem docs\financial,docs\domain -Recurse -Filter *.md | Select-String -Pattern 'decide culpa','atribui culpa','declara responsável'
```

Expected: nenhuma regra concedendo autoridade fora de Governance.

- [ ] **Step 6: Commit**

```powershell
git add docs/domain/EVIDENCE_PIPELINE.md docs/domain/REVENUE_ARCHITECTURE.md docs/domain/CAMPAIGN_MANAGEMENT.md docs/financial
git commit -m "docs: route responsibility through governance"
```

### Task 7: Validar consistência transversal

**Files:**
- Modify only if validation reveals inconsistency in files already listed.

- [ ] **Step 1: Verificar links Markdown**

Run:

```powershell
$root=(Resolve-Path docs).Path
$broken=@()
Get-ChildItem docs -Recurse -Filter *.md | ForEach-Object {
  $file=$_
  $text=Get-Content -LiteralPath $file.FullName -Raw
  [regex]::Matches($text,'\[[^\]]*\]\(([^)]+)\)') | ForEach-Object {
    $target=$_.Groups[1].Value.Split('#')[0]
    if($target -and $target -notmatch '^(https?:|mailto:|#)') {
      $resolved=Join-Path $file.DirectoryName ([uri]::UnescapeDataString($target))
      if(-not (Test-Path -LiteralPath $resolved)) { $broken += "$($file.FullName) -> $target" }
    }
  }
}
$broken
```

Expected: nenhuma saída.

- [ ] **Step 2: Verificar owner único**

Run:

```powershell
Get-ChildItem docs -Recurse -Filter *.md | Select-String -Pattern 'ResponsibilityDecisionPublished'
```

Expected: producer sempre GovernanceCase; demais ocorrências são consumidores.

- [ ] **Step 3: Verificar eventos proibidos**

Run:

```powershell
Get-ChildItem docs -Recurse -Filter *.md | Select-String -Pattern 'ResponsibilityAssigned','ResponsibilityReassigned'
```

Expected: somente design histórico e proibições.

- [ ] **Step 4: Verificar placeholders**

Run:

```powershell
Get-ChildItem docs\governance -Recurse -Filter *.md | Select-String -Pattern 'TBD','TODO','a definir'
```

Expected: nenhuma saída.

- [ ] **Step 5: Verificar whitespace**

Run:

```powershell
git diff --check
```

Expected: exit code 0.

- [ ] **Step 6: Revisar diff**

Run:

```powershell
git diff --stat
git status --short
```

Expected: somente alterações planejadas e mudanças preexistentes preservadas.

- [ ] **Step 7: Commit de correções de validação**

Executar somente se os passos anteriores exigirem correção:

```powershell
git add docs
git commit -m "docs: validate governance synchronization"
```

## Handoff

Depois deste plano:

1. continuar fechamento dos demais bounded contexts;
2. criar mapa integral de Events;
3. criar mapa integral de Sagas;
4. validar Ownership;
5. validar invariantes globais;
6. validar fluxos end-to-end;
7. declarar Domain Freeze;
8. emitir `Domain Certification (Architecture Lock)`, validando automaticamente owners, producers, Sagas circulares, fronteiras, decisões abertas, estados inalcançáveis, Commands sem Aggregate, Events sem consumidor, contextos órfãos e rastreabilidade dos invariantes;
9. bloquear a geração enquanto qualquer regra da certificação falhar;
10. gerar contratos técnicos somente sobre baseline certificado;
11. iniciar implementação de código.
