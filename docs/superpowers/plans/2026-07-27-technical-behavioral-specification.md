# Technical Behavioral Specification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir a TBS normativa transversal que congele comportamento técnico observável sem introduzir domínio, stack ou parâmetros quantitativos.

**Architecture:** Um documento normativo único em `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`, derivado do design aprovado e validado contra o IRR. A TBS separará normas de perfis de conformidade e será organizada por identidade, Commands, Errors, concurrency, atomicidade, replay, snapshots, Event evolution, projections e Sagas.

**Tech Stack:** Markdown normativo, PowerShell para validações locais, Git para versionamento.

---

## Arquivos

- Criar: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`
- Consultar: `docs/superpowers/specs/2026-07-27-technical-behavioral-specification-design.md`
- Consultar: `docs/specification/IMPLEMENTATION_READINESS_REVIEW_V1.md`
- Consultar: `docs/specification/CONSISTENCY_RULES.md`
- Consultar: `docs/specification/DECISION_REGISTRY.md`
- Validar: todos os documentos Markdown sob `docs/`

## Task 1: Criar autoridade, escopo e glossário

**Files:**
- Create: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`
- Reference: `docs/superpowers/specs/2026-07-27-technical-behavioral-specification-design.md`

- [ ] **Step 1: Escrever o cabeçalho normativo**

Incluir:

- versão normativa da TBS;
- status candidate;
- autoridade e precedência;
- cláusula constitucional;
- princípio de minimalidade;
- definição de efeito observável;
- escopo e não objetivos.

- [ ] **Step 2: Escrever o glossário**

Definir exatamente:

`Aggregate`, `Command`, `Event`, `Replay`, `Rebuild`, `Snapshot`, `Upcast`, `Duplicate`, `Conflict`, `Revision`, `ExpectedRevision`, `Unknown Event`, `Side Effect`, `Projection`, `Logical Identity`, `Transport Identity`, `Causation` e `Correlation`.

- [ ] **Step 3: Separar norma e conformidade**

Registrar:

- norma define comportamento;
- perfil de conformidade define evidência;
- teste nunca cria comportamento;
- exemplo e nota não possuem precedência sobre texto/tabela normativa.

- [ ] **Step 4: Validar fronteira**

Run:

```powershell
rg -n "linguagem|framework|PostgreSQL|Kafka|Avro|Protobuf|JSON|LZ4|100 events|32 MB" docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
```

Expected: nenhuma escolha de stack ou parâmetro quantitativo normativo.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: establish technical behavior authority"
```

## Task 2: Normatizar identidade e Command Result

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir identidades**

Normatizar:

- Command identity por intenção lógica;
- Event identity por fato persistido;
- idempotency identity;
- causation;
- correlation;
- Aggregate identity;
- transport identity como não normativa;
- preservação de identidade em retry e redelivery.

- [ ] **Step 2: Definir estados de Command Result**

Definir condições observáveis e exclusividade para:

- `Accepted`;
- `Rejected`;
- `Conflict`;
- `Duplicate`;
- `Expired`;
- `Unauthorized`;
- `InvariantViolation`.

Especificar que resultado não autoriza Event de sucesso incompatível e que `Duplicate` retorna o resultado original.

- [ ] **Step 3: Definir contrato conceitual de resultado**

Exigir:

- Command identity;
- Aggregate identity;
- expected/observed revision;
- status;
- errors;
- Event identities produzidas;
- correlation/causation;
- timestamp lógico aplicável;
- policy versions relevantes.

Não escolher enum, union, exception ou HTTP status.

- [ ] **Step 4: Validar completude**

Run:

```powershell
rg -n "Accepted|Rejected|Conflict|Duplicate|Expired|Unauthorized|InvariantViolation" docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
```

Expected: sete resultados normativos definidos.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define command identity and results"
```

## Task 3: Normatizar Error Catalog

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir Error Descriptor**

Exigir:

- stable code;
- meaning;
- normative condition;
- retryable;
- recoverable;
- severity;
- consumer;
- related Command/Event;
- safe diagnostic context;
- version.

- [ ] **Step 2: Definir famílias transversais**

Definir somente famílias técnicas:

- authorization;
- validation;
- invariant;
- concurrency;
- idempotency;
- expiration;
- replay;
- schema;
- persistence/publication;
- projection/rebuild;
- Saga coordination.

Não inventar erros específicos de negócio.

- [ ] **Step 3: Normatizar propagação**

Fixar:

- código estável sobre mensagem;
- mensagem não determina automação;
- erro não é Event de domínio;
- transporte não muda significado;
- erro desconhecido falha explicitamente;
- contexto sensível não é exposto.

- [ ] **Step 4: Criar perfil de conformidade**

Exigir teste para cada ErrorCode declarado por artefato e teste de estabilidade de serialização conceitual.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define normative error behavior"
```

## Task 4: Normatizar optimistic concurrency e atomicidade

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir concurrency**

Fixar:

- expected revision;
- atomic append;
- deterministic conflict;
- no automatic merge;
- reread before new intent;
- blind retry forbidden;
- duplicate distinct from concurrent conflict.

- [ ] **Step 2: Definir persistência/publicação observável**

Fixar:

- Events persistidos constituem estado autoritativo;
- Event commitado deve permanecer publicável;
- republicação preserva Event identity;
- consumer deduplica;
- falha entre commit e publish não cria novo fato;
- replay/rebuild não dispara side effect externo.

- [ ] **Step 3: Definir resultados de falha**

Conectar concurrency a `Conflict` e falhas de persistência/publicação às famílias do Error Catalog, sem escolher exceptions ou infraestrutura.

- [ ] **Step 4: Criar testes de conformidade**

Cobrir:

- dois Commands na mesma expected revision;
- retry idêntico;
- retry com payload divergente;
- falha após commit;
- redelivery do mesmo Event.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define concurrency and atomic publication semantics"
```

## Task 5: Normatizar replay, reidratação e snapshots

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir replay de Aggregate**

Fixar:

- estado inicial;
- aplicação por revision;
- validação de gap/duplicate;
- ausência de side effects;
- invariantes durante reidratação;
- aborto diante de Event desconhecido/incompatível;
- descarte de estado parcial;
- replay integral como referência.

- [ ] **Step 2: Definir resultados de replay**

Normatizar resultados conceituais:

- completed;
- aborted;
- gap detected;
- unknown schema;
- incompatible schema;
- corrupted event;
- invariant violation.

A CGS decidirá os tipos concretos.

- [ ] **Step 3: Definir snapshot conceitual**

Fixar:

- derivado, descartável e versionado;
- integridade verificável;
- não altera Events;
- incompatibilidade não altera comportamento;
- fallback para sequência autoritativa;
- snapshot + tail equivale ao replay integral.

- [ ] **Step 4: Excluir parâmetros**

Verificar que frequência, tamanho, compressão, storage e thresholds não receberam valores.

- [ ] **Step 5: Criar perfil de conformidade**

Cobrir:

- full replay;
- snapshot + tail;
- snapshot ausente;
- snapshot corrompido;
- snapshot incompatível;
- unknown Event;
- estado parcial descartado.

- [ ] **Step 6: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define replay and snapshot semantics"
```

## Task 6: Normatizar evolução de Events

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir imutabilidade e versionamento**

Fixar:

- original imutável;
- schema version obrigatório;
- mudança semântica exige nova versão;
- depreciação não apaga histórico;
- campos desconhecidos não alteram significado conhecido.

- [ ] **Step 2: Definir upcast**

Fixar:

- determinístico;
- versionado;
- sem side effect;
- preserva identidade/original;
- cadeia explícita;
- downgrade heurístico proibido.

- [ ] **Step 3: Definir compatibilidade**

Distinguir backward e forward compatibility sem escolher formato. Event futuro não suportado aborta reidratação.

- [ ] **Step 4: Criar perfil de conformidade**

Cobrir versão atual, versão antiga com upcast, versão futura, campo desconhecido e upcast inválido.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define event evolution semantics"
```

## Task 7: Normatizar ordering, idempotência e gaps

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir ordering**

Fixar ordering por stream/revision e proibir dependência de ordem global.

- [ ] **Step 2: Definir duplicate e gap**

Fixar:

- duplicate não avança revisão;
- Event atrasado não regride estado;
- gap bloqueia avanço dependente;
- gap nunca é preenchido por inferência;
- redelivery preserva identidade.

- [ ] **Step 3: Definir idempotency behavior**

Fixar mesma key/payload, mesma key/payload divergente e retenção quantitativa fora da TBS.

- [ ] **Step 4: Criar perfil de conformidade**

Cobrir duplicate, out-of-order, gap, redelivery e conflito de payload.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define ordering and idempotency semantics"
```

## Task 8: Normatizar rebuild de Projections e Read Models

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Separar replay e rebuild**

Declarar replay como reidratação de Aggregate e rebuild como reconstrução de estado derivado.

- [ ] **Step 2: Definir rebuild**

Fixar:

- determinismo;
- source Events autoritativos;
- side effects externos desabilitados;
- projection version;
- checkpoint conceitual;
- staleness explícita;
- publicação atômica da nova visão;
- falha não promove visão parcial;
- rebuild não altera fonte.

- [ ] **Step 3: Definir invalidation**

Fixar que schema/policy incompatível invalida a visão derivada sem alterar Events e exige rebuild compatível.

- [ ] **Step 4: Criar perfil de conformidade**

Cobrir rebuild completo, falha intermediária, troca válida, staleness e repetição idempotente.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define projection rebuild semantics"
```

## Task 9: Normatizar Sagas

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Definir autoridade**

Fixar que Saga coordena e nunca decide regra de domínio.

- [ ] **Step 2: Definir estado e identidade**

Exigir Saga identity, state, correlation, causation, processed Event identities e pending Commands.

- [ ] **Step 3: Definir recovery**

Fixar:

- retry preserva intenção;
- resultado desconhecido bloqueia ação incompatível;
- compensação é novo Command ao owner;
- replay/rebuild não emite side effects;
- conclusão depende de terminalidade específica;
- timeout quantitativo fica fora da TBS.

- [ ] **Step 4: Criar perfil de conformidade**

Cobrir duplicate input, crash após Command, resultado desconhecido, compensation e replay.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define saga coordination semantics"
```

## Task 10: Consolidar conformidade e evolução da TBS

**Files:**
- Modify: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Criar suíte de conformidade**

Listar todos os cenários obrigatórios das Tasks 2–9 e relacionar cada teste à norma correspondente.

- [ ] **Step 2: Criar matriz TBS × CGS × Configuração**

Classificar todas as decisões do documento em exatamente uma camada.

- [ ] **Step 3: Definir conformidade**

Exigir equivalência de efeitos observáveis, falha explícita para comportamento ausente e identificação de extensões locais.

- [ ] **Step 4: Definir evolução**

Fixar breaking changes, versão normativa, autoridade de texto/tabela/exemplo/nota e proibição de CGS/configuração superseder semântica.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: define TBS conformance and evolution"
```

## Task 11: Validar contra o IRR

**Files:**
- Modify if required: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`
- Reference: `docs/specification/IMPLEMENTATION_READINESS_REVIEW_V1.md`

- [ ] **Step 1: Verificar cobertura**

Confirmar cobertura explícita para:

- error catalog;
- snapshots;
- Event evolution/upcasting;
- Command Result;
- optimistic concurrency;
- replay/rebuild;
- testes normativos.

- [ ] **Step 2: Verificar não invasão**

Run:

```powershell
rg -n "OPEN-|SYNC-|DFR-|responsibleParty|CampaignBudget|chargeback|split|withdrawal limit" docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
```

Expected: nenhuma reabertura ou regra específica de domínio.

- [ ] **Step 3: Verificar parâmetros quantitativos**

Run:

```powershell
rg -n "\\b[0-9]+\\s*(events|ms|seconds|minutes|MB|GB|attempts)\\b" docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
```

Expected: nenhum parâmetro operacional normativo.

- [ ] **Step 4: Verificar estrutura e placeholders**

Run:

```powershell
rg -n "TODO|TBD|a definir|implement later|fill in" docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git diff --check
```

Expected: nenhuma ocorrência e exit code 0.

- [ ] **Step 5: Validar links**

Executar o verificador local de links Markdown para `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`.

- [ ] **Step 6: Commit final**

```powershell
git add docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md
git commit -m "docs: certify technical behavioral specification candidate"
```

## Task 12: Reavaliar readiness somente dos artefatos afetados

**Files:**
- Create: `docs/specification/IMPLEMENTATION_READINESS_REVIEW_V2.md`
- Reference: `docs/specification/IMPLEMENTATION_READINESS_REVIEW_V1.md`
- Reference: `docs/specification/TECHNICAL_BEHAVIORAL_SPECIFICATION.md`

- [ ] **Step 1: Reavaliar lacunas transversais**

Avaliar somente os artefatos autorizados anteriormente e somente os gates cuja lacuna no IRR V1 era transversal:

- error catalog;
- snapshot policy;
- schema evolution;
- Command Result;
- replay/rebuild;
- optimistic concurrency;
- idempotência;
- conformidade técnica transversal.

- [ ] **Step 2: Preservar lacunas específicas**

Preservar automaticamente como `IMPLEMENTATION_PARTIAL` ou `IMPLEMENTATION_NOT_READY` qualquer artefato cuja lacuna remanescente seja específica de domínio ou do próprio artefato, incluindo payload, Value Object, Entity, Policy, lifecycle ou contrato próprio ausente.

- [ ] **Step 3: Atualizar candidato ao Vertical Slice**

Aplicar uma regra mecânica:

1. copiar todos os gates do checklist do IRR V1;
2. marcar como satisfeitos somente os gates demonstravelmente cobertos pela TBS ou pela especificação própria;
3. preservar qualquer gate sem evidência como parcial/ausente;
4. promover um Aggregate para `IMPLEMENTATION_READY` somente quando todos os gates aplicáveis estiverem satisfeitos, sem exceção;
5. registrar a evidência normativa de cada promoção.

Determinar por essa regra se GovernanceCase passa a `IMPLEMENTATION_READY`.

- [ ] **Step 4: Validar**

Run:

```powershell
rg -n "IMPLEMENTATION_READY|IMPLEMENTATION_PARTIAL|IMPLEMENTATION_NOT_READY" docs/specification/IMPLEMENTATION_READINESS_REVIEW_V2.md
git diff --check
```

Expected: status explícito e documento sem erro de whitespace.

- [ ] **Step 5: Commit**

```powershell
git add docs/specification/IMPLEMENTATION_READINESS_REVIEW_V2.md
git commit -m "docs: reassess readiness against TBS"
```
