# TBS Normative Review V1

**Data:** 2026-07-27  
**Objeto:** `TECHNICAL_BEHAVIORAL_SPECIFICATION.md` — `TBS-1 CANDIDATE`  
**Modo:** auditoria somente leitura; nenhuma norma foi alterada.

## 1. Gates

Para cada norma:

- **Q1 — Divergência:** sem ela, implementações podem divergir observavelmente?
- **Q2 — Independência:** é independente de linguagem, framework, storage, broker e serializer?
- **Q3 — Testabilidade:** admite teste objetivo de conformidade?
- **Q4 — Autoridade:** não contradiz, amplia nem redefine Domain Freeze/Architecture Lock?

Vereditos:

- `KEEP`: passa nos quatro gates e não duplica autoridade textual;
- `CONSOLIDATE_REFERENCE`: passa nos gates, mas repete norma já expressa;
- `REWRITE_TESTABLE`: semântica pertence à TBS, porém o texto não é objetivamente testável;
- `REMOVE_UPSTREAM_DUPLICATE`: repete decisão de autoridade superior.

## 2. Integridade dos identificadores

- identificadores encontrados: **96**;
- identificadores duplicados: **0**;
- identificadores sem texto normativo: **0**;
- sequências internas ausentes: **0**.

Identificador único não garante autoridade textual única. A seção 4 registra sobreposições semânticas.

## 3. Matriz individual

`S` = sim; `N` = não.

| Norma | Q1 | Q2 | Q3 | Q4 | Veredito |
| --- | --- | --- | --- | --- | --- |
| TBS-N-001 | S | S | S | S | KEEP |
| TBS-N-002 | S | S | S | S | KEEP |
| TBS-ID-001 | S | S | S | S | KEEP |
| TBS-ID-002 | S | S | S | S | KEEP |
| TBS-ID-003 | S | S | S | N | REMOVE_UPSTREAM_DUPLICATE |
| TBS-ID-004 | S | S | S | S | KEEP |
| TBS-ID-005 | S | S | S | S | KEEP |
| TBS-ID-006 | S | S | S | S | KEEP |
| TBS-ID-007 | S | S | S | S | KEEP |
| TBS-CMD-001 | S | S | S | S | KEEP |
| TBS-CMD-002 | S | S | S | S | KEEP |
| TBS-CMD-003 | S | S | S | S | KEEP |
| TBS-CMD-004 | S | S | S | S | KEEP |
| TBS-CMD-005 | S | S | S | S | KEEP |
| TBS-CMD-006 | S | S | S | S | KEEP |
| TBS-ERR-001 | S | S | S | S | KEEP |
| TBS-ERR-002 | S | S | S | S | KEEP |
| TBS-ERR-003 | S | S | S | S | KEEP |
| TBS-ERR-004 | S | S | S | S | KEEP |
| TBS-ERR-005 | S | S | N | S | REWRITE_TESTABLE |
| TBS-ERR-006 | S | S | S | S | KEEP |
| TBS-CON-001 | S | S | S | S | KEEP |
| TBS-CON-002 | S | S | S | S | KEEP |
| TBS-CON-003 | S | S | S | S | KEEP |
| TBS-CON-004 | S | S | S | S | KEEP |
| TBS-CON-005 | S | S | S | S | KEEP |
| TBS-CON-006 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-CON-007 | S | S | S | S | KEEP |
| TBS-ATOM-001 | S | S | S | S | KEEP |
| TBS-ATOM-002 | S | S | S | S | KEEP |
| TBS-ATOM-003 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-ATOM-004 | S | S | S | S | KEEP |
| TBS-ATOM-005 | S | S | S | S | KEEP |
| TBS-ATOM-006 | S | S | S | S | KEEP |
| TBS-ATOM-007 | S | S | S | S | KEEP |
| TBS-RPL-001 | S | S | S | S | KEEP |
| TBS-RPL-002 | S | S | S | S | KEEP |
| TBS-RPL-003 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-RPL-004 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-RPL-005 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-RPL-006 | S | S | S | S | KEEP |
| TBS-RPL-007 | S | S | S | S | KEEP |
| TBS-RPL-008 | S | S | S | S | KEEP |
| TBS-RPL-009 | S | S | S | S | KEEP |
| TBS-SNP-001 | S | S | S | S | KEEP |
| TBS-SNP-002 | S | S | S | S | KEEP |
| TBS-SNP-003 | S | S | S | S | KEEP |
| TBS-SNP-004 | S | S | S | S | KEEP |
| TBS-SNP-005 | S | S | S | S | KEEP |
| TBS-SNP-006 | S | S | S | S | KEEP |
| TBS-SNP-007 | S | S | S | S | KEEP |
| TBS-EVT-001 | S | S | S | S | KEEP |
| TBS-EVT-002 | S | S | S | S | KEEP |
| TBS-EVT-003 | S | S | S | S | KEEP |
| TBS-EVT-004 | S | S | S | S | KEEP |
| TBS-EVT-005 | S | S | S | S | KEEP |
| TBS-EVT-006 | S | S | S | S | KEEP |
| TBS-EVT-007 | S | S | S | S | KEEP |
| TBS-EVT-008 | S | S | S | S | KEEP |
| TBS-EVT-009 | S | S | S | S | KEEP |
| TBS-EVT-010 | S | S | S | S | KEEP |
| TBS-IDO-001 | S | S | S | S | KEEP |
| TBS-IDO-002 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-IDO-003 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-IDO-004 | S | S | S | S | KEEP |
| TBS-IDO-005 | S | S | S | S | KEEP |
| TBS-IDO-006 | S | S | S | S | KEEP |
| TBS-IDO-007 | S | S | S | S | KEEP |
| TBS-IDO-008 | S | S | S | S | KEEP |
| TBS-IDO-009 | S | S | S | S | KEEP |
| TBS-PRJ-001 | S | S | S | S | KEEP |
| TBS-PRJ-002 | S | S | S | S | KEEP |
| TBS-PRJ-003 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-PRJ-004 | S | S | S | S | KEEP |
| TBS-PRJ-005 | S | S | S | S | KEEP |
| TBS-PRJ-006 | S | S | S | S | KEEP |
| TBS-PRJ-007 | S | S | S | S | KEEP |
| TBS-PRJ-008 | S | S | S | S | KEEP |
| TBS-SAG-001 | S | S | S | N | REMOVE_UPSTREAM_DUPLICATE |
| TBS-SAG-002 | S | S | S | S | KEEP |
| TBS-SAG-003 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-SAG-004 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-SAG-005 | S | S | S | S | KEEP |
| TBS-SAG-006 | S | S | S | S | KEEP |
| TBS-SAG-007 | S | S | S | S | CONSOLIDATE_REFERENCE |
| TBS-SAG-008 | S | S | S | S | KEEP |
| TBS-SAG-009 | S | S | S | S | KEEP |
| TBS-EVO-001 | S | S | S | S | KEEP |
| TBS-EVO-002 | S | S | S | S | KEEP |
| TBS-EVO-003 | S | S | S | S | KEEP |
| TBS-EVO-004 | S | S | S | S | KEEP |
| TBS-EVO-005 | S | S | S | S | KEEP |
| TBS-EVO-006 | S | S | S | S | KEEP |
| TBS-EVO-007 | S | S | S | S | KEEP |
| TBS-EVO-008 | S | S | N | S | REWRITE_TESTABLE |
| TBS-EVO-009 | S | S | S | S | KEEP |

## 4. Duplicidade normativa

### 4.1 Identidade, retry e redelivery

Autoridade recomendada:

- `TBS-ID-004` governa preservação de identidade em retry/redelivery;
- `TBS-ID-007` governa conteúdo divergente sob mesma identidade.

Redefinições a converter em referências:

- `TBS-IDO-003` repete `TBS-ID-004`;
- `TBS-ATOM-003` repete a parte de Event de `TBS-ID-004`;
- `TBS-SAG-004` repete a parte de retry de `TBS-ID-004`;
- `TBS-IDO-002` repete `TBS-ID-007`.

### 4.2 Merge automático

- `TBS-CMD-004` já define que Conflict não executa merge automático;
- `TBS-CON-006` repete a mesma proibição no recorte concorrente.

`TBS-CON-006` deve referenciar `TBS-CMD-004`, mantendo apenas a ligação com optimistic concurrency.

### 4.3 Duplicate e gap durante replay

Autoridade recomendada:

- `TBS-IDO-005` governa Event duplicado e Revision;
- `TBS-IDO-007` governa gap.

Redefinições:

- `TBS-RPL-004` repete `TBS-IDO-005`;
- `TBS-RPL-005` repete `TBS-IDO-007`.

Replay deve referenciar essas normas e manter apenas o resultado específico do aborto.

### 4.4 Side effects em replay/rebuild

Autoridade transversal:

- `TBS-ATOM-007` proíbe side effects externos durante replay e rebuild.

Redefinições:

- `TBS-RPL-003`;
- `TBS-PRJ-003`;
- `TBS-SAG-007`.

As seções especializadas devem referenciar `TBS-ATOM-007` e somente explicar o efeito local.

### 4.5 Saga idempotente

- `TBS-SAG-003` é aplicação de `TBS-IDO-001/003` a Saga.

Deve tornar-se referência normativa, preservando somente a exigência de que o Command pendente permaneça correlacionado.

## 5. Normas não testáveis como escritas

### TBS-ERR-005

Texto atual proíbe “dados sensíveis”, mas a TBS não define como reconhecer essa classe nem referencia a classificação autoritativa.

Sem referência normativa, duas suítes podem discordar sobre o que constitui vazamento.

Veredito: `REWRITE_TESTABLE`.

A revisão deve referenciar explicitamente a classificação de dados vigente e exigir teste de ausência para cada campo classificado. Não cabe à TBS criar a classificação.

### TBS-EVO-008

“Processo formal” não possui identidade nem autoridade referenciada.

Sem uma referência, não existe teste objetivo capaz de distinguir extensão local de norma promovida.

Veredito: `REWRITE_TESTABLE`.

A revisão deve apontar para o processo de governança normativa vigente, sem redefini-lo.

## 6. Duplicações de autoridade superior

### TBS-ID-003

Estabilidade da identidade do Aggregate já pertence ao modelo de Aggregate autorizado pelo Domain Freeze/Architecture Lock. A TBS pode assumir essa propriedade, mas não deve republicá-la como decisão própria.

Veredito: `REMOVE_UPSTREAM_DUPLICATE`.

### TBS-SAG-001

“Saga coordena e nunca decide regra de domínio” já é invariante arquitetural explícita em `CONSISTENCY_RULES.md`.

Veredito: `REMOVE_UPSTREAM_DUPLICATE`.

A seção de Saga deve declarar essa regra como precondição arquitetural referenciada, não como nova norma TBS.

## 7. Resultado

| Veredito | Quantidade |
| --- | ---: |
| KEEP | 81 |
| CONSOLIDATE_REFERENCE | 11 |
| REWRITE_TESTABLE | 2 |
| REMOVE_UPSTREAM_DUPLICATE | 2 |
| Total | 96 |

## 8. Parecer

**TBS-1 CANDIDATE:** `NOT APPROVED`.

Motivos objetivos:

1. onze normas possuem mais de um texto normativo autoritativo para a mesma semântica;
2. duas normas não são testáveis sem referência externa explícita;
3. duas normas repetem autoridade superior.

As 81 normas `KEEP` passam nos quatro gates. Nenhuma foi identificada como escolha de linguagem, framework, banco, broker ou serialização.

A aprovação exige somente consolidação normativa; não exige nova decisão de domínio ou arquitetura.

