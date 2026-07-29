# Governance Implementation Gate V1

## 1. Objetivo e autoridade

Este gate verifica exclusivamente os cinco ajustes exigidos pela seção 6 do
`IMPLEMENTATION_READINESS_REVIEW_V2.md`. Ele não reabre domínio, não completa
contratos por inferência e não promove artefatos por associação.

Fontes verificadas:

1. `GOVERNANCE_DISPUTE_MANAGEMENT.md`;
2. `GOVERNANCE_COMMANDS.md`;
3. `GOVERNANCE_EVENTS.md`;
4. `GOVERNANCE_STATE_MACHINE.md`;
5. `GOVERNANCE_INVARIANTS.md`;
6. `TECHNICAL_BEHAVIORAL_SPECIFICATION.md`;
7. `IMPLEMENTATION_READINESS_REVIEW_V2.md`.

## 2. Parecer executivo

`GovernanceCase` possui boundary, owner, lifecycle, estados, invariantes e
semântica transversal suficientes. Ainda não possui os cinco contratos
específicos exigidos para que engenheiros independentes produzam a mesma
implementação serializável.

- GovernanceCase Aggregate: `IMPLEMENTATION_PARTIAL`
- Autorização para implementar o Aggregate: `NÃO`
- Autorização para implementar o kernel transversal: `SIM`
- Autorização para implementar os Value Objects já classificados como READY: `SIM`
- Autorização para declarar o Vertical Slice conforme: `NÃO`

## 3. Catálogo específico de erros

Os nove Commands estão normativamente identificados:

1. `OpenGovernanceCase`;
2. `AttachEvidenceReference`;
3. `StartInvestigation`;
4. `RequestHumanReview`;
5. `ClassifyResponsibility`;
6. `PublishDecision`;
7. `AppealDecision`;
8. `ReevaluateGovernanceCase`;
9. `CloseGovernanceCase`.

`GOVERNANCE_COMMANDS.md` descreve classes de falha em linguagem de domínio.
Não define, por Command, identificadores estáveis de erro, parâmetros
obrigatórios do erro nem o mapeamento inequívoco para as famílias TBS.

**Status:** `NÃO SATISFEITO`.

**Informação mínima ausente:** tabela normativa contendo, para cada falha de
cada Command, `errorCode`, família TBS, condição exata e parâmetros públicos.

## 4. Schemas versionados dos Events

Os nove Events estão normativamente identificados:

1. `GovernanceCaseOpened`;
2. `EvidenceReferenceAttached`;
3. `InvestigationStarted`;
4. `HumanReviewRequested`;
5. `ResponsibilityDecisionPublished`;
6. `ResponsibilityDecisionAppealed`;
7. `GovernanceCaseReevaluationStarted`;
8. `GovernanceCaseReevaluated`;
9. `GovernanceCaseClosed`.

`GOVERNANCE_EVENTS.md` define envelope, produtor, consumidores e payload
conceitual. Não define, para cada Event, schema version concreto, tipo,
obrigatoriedade, nulabilidade e cardinalidade de cada campo.

**Status:** `NÃO SATISFEITO`.

**Informação mínima ausente:** um schema conceitual completo por Event,
incluindo versão inicial explícita e constraints de todos os campos.

## 5. Contratos internos

O domínio lista propriedades e invariantes de:

- `EvidenceReference`;
- `Investigation`;
- `Appeal`;
- `GovernancePolicyVersion`.

Permanecem ausentes tipos conceituais fechados, identidades referenciadas,
cardinalidades, nulabilidade, estados internos completos e constraints
serializáveis para todos os campos. A TBS não pode criar esses contratos porque
eles são específicos do contexto.

**Status:** `NÃO SATISFEITO`.

**Informação mínima ausente:** contrato campo a campo de cada artefato,
incluindo identidade, tipos, constraints, cardinalidade e evolução.

## 6. Compatibilidade e upcast

A TBS determina a semântica transversal de evolução e exige cadeia explícita.
Nenhum dos nove Events declara sua matriz de compatibilidade nem uma cadeia
específica de upcast.

Como ainda não existe schema concreto versionado, não é possível declarar
legitimamente que uma cadeia vazia representa `v1 → atual`.

**Status:** `NÃO SATISFEITO`.

**Informação mínima ausente:** para cada Event, versão atual, versões aceitas,
compatibilidade declarada e cadeia determinística de upcast — inclusive a
declaração explícita de ausência de upcast quando houver somente uma versão.

## 7. Suíte de conformidade

`TECHNICAL_BEHAVIORAL_SPECIFICATION.md` define o perfil e os casos transversais,
mas não existe suíte executável do `GovernanceCase`. O teste deste documento
certifica apenas a presença e honestidade do gate; ele não substitui testes do
Aggregate.

**Status:** `NÃO SATISFEITO`.

**Informação mínima ausente:** suíte executável que cubra Commands, invariantes,
transições, replay, idempotência, concorrência, snapshots, schemas e evolução
contra os contratos específicos aprovados.

## 8. Árvore de bloqueio

```text
GovernanceCase
├── catálogo específico de erros ───────────── ausente
├── schemas versionados dos nove Events ───── ausentes
├── contratos internos completos ──────────── ausentes
├── matriz/cadeia de compatibilidade ───────── ausente
└── suíte de conformidade materializada ───── ausente
    └── IMPLEMENTATION_PARTIAL
```

## 9. Limite autorizado desta etapa

Enquanto este gate permanecer aberto, é permitido implementar somente:

- contratos transversais definidos pela TBS e materializados pela CGS Parte A;
- harness genérico de conformidade;
- `ResponsibleParty`, `ResponsibilityCategory`, `Severity`, `Confidence` e
  `ResponsibilityDecision`;
- testes estruturais que falhem explicitamente diante de contrato ausente.

É proibido preencher as lacunas listadas neste documento por convenção de
framework, preferência técnica ou inferência a partir dos exemplos.

## 10. Dependência contraditória de ResponsibilityDecision

O IRR V2 classifica `ResponsibilityDecision` como `IMPLEMENTATION_READY`, mas
classifica simultaneamente como `IMPLEMENTATION_PARTIAL` três dependências
obrigatórias da própria decisão:

- `EvidenceReference`;
- `GovernancePolicyVersion`;
- `DecisionRevision`.

Uma `ResponsibilityDecision` completa exige `evidenceReferences[]`, exatamente
uma `policyVersion` e `revision`. Logo, a implementação concreta do objeto
composto exigiria escolher contratos que o próprio IRR declara incompletos.

Este gate não altera a classificação original nem cria uma regra. Aplica apenas
o deny-by-default da CGS Parte A:

- enums `ResponsibleParty`, `ResponsibilityCategory` e `Severity`: autorizados;
- `Confidence`: autorizado;
- `ResponsibilityDecision` concreta: `BLOCKED_BY_PARTIAL_DEPENDENCY`;
- promoção do Aggregate por associação: proibida.

O bloqueio poderá ser removido mecanicamente quando os três contratos
dependentes forem certificados.
