# Technical Behavioral Specification

- **Versão normativa:** `TBS-1`
- **Status:** `CANDIDATE`
- **Escopo:** semântica técnica observável transversal

## 1. Autoridade

Esta TBS é subordinada ao domínio certificado e ao Architecture Lock. Ela não cria Aggregate, Command, Event, owner, produtor ou regra de negócio.

Precedência interna:

1. texto identificado como normativo;
2. tabela identificada como normativa;
3. exemplo;
4. nota.

Exemplo e nota nunca alteram norma.

## 2. Cláusula constitucional

**Norma TBS-N-001:** a TBS define exclusivamente semântica observável.

Um efeito observável é qualquer resultado percebido por outro artefato normativo, consumidor, Aggregate, Projection, Saga ou contrato de integração. Inclui Command Result, Error, Event persistido/publicado, transição, Projection e side effect autorizado.

Organização de classes, memória, algoritmo equivalente, banco, broker, cache, funções internas e otimizações não pertencem à TBS quando preservam os mesmos efeitos observáveis.

**Norma TBS-N-002 — Minimalidade:** comportamento técnico somente entra na TBS quando sua ausência permitir implementações observavelmente diferentes.

## 3. Glossário normativo

| Termo | Definição |
| --- | --- |
| Aggregate | boundary transacional que decide Events e protege invariantes |
| Command | intenção identificada dirigida a exatamente um owner |
| Event | fato persistido, imutável e versionado |
| Replay | aplicação ordenada de Events para reidratar Aggregate |
| Rebuild | reconstrução de Projection/Read Model |
| Snapshot | estado derivado e descartável para acelerar restauração |
| Upcast | transformação determinística de representação antiga para schema suportado |
| Duplicate | mesma identidade lógica e mesmo conteúdo |
| Conflict | conteúdo, revisão ou intenção incompatível |
| Revision | posição monotônica em stream autoritativo |
| ExpectedRevision | revisão exigida como precondição de mutação |
| Unknown Event | tipo ou schema sem interpretação normativa suportada |
| Side Effect | efeito externo à aplicação pura de estado |
| Projection | estado derivado, reconstruível e não transacional |
| Logical Identity | identidade normativa que sobrevive a transporte/reentrega |
| Transport Identity | identidade técnica de uma entrega específica |
| Causation | ligação direta entre efeito e intenção/fato causador |
| Correlation | ligação entre artefatos do mesmo fluxo |

## 4. Fronteira TBS × CGS × Configuração

| Decisão | TBS | CGS | Configuração/Vertical Slice |
| --- | --- | --- | --- |
| significado de Command Result | sim | não | não |
| representação de Command Result | não | sim | não |
| comportamento para Unknown Event | sim | não | não |
| formato de serialização | não | sim | não |
| semântica de optimistic concurrency | sim | não | não |
| tipo físico de Revision | não | sim | não |
| equivalência snapshot + replay | sim | não | não |
| frequência/tamanho/storage de snapshot | não | não | sim |
| comportamento de gap/duplicate | sim | não | não |
| timeout, TTL, tentativas, batch size, threshold e SLO | não | não | sim |

Configuração nunca altera semântica. Ausência de parâmetro obrigatório para operação produz falha explícita; default silencioso não possui força normativa.

## 5. Identidade

**TBS-ID-001:** Command possui identidade lógica estável por intenção.

**TBS-ID-002:** Event possui identidade lógica estável por fato persistido.

**TBS-ID-003:** Aggregate possui identidade estável durante todo o lifecycle.

**TBS-ID-004:** retry e redelivery preservam identidade lógica, causation e correlation.

**TBS-ID-005:** identidade de transporte nunca substitui CommandId, EventId, AggregateId ou idempotency key.

**TBS-ID-006:** nova identidade representa nova intenção ou novo fato; não pode mascarar retry.

**TBS-ID-007:** mesma identidade lógica com conteúdo divergente é Conflict, nunca Duplicate.

## 6. Command Result

Todo Command termina em exatamente um resultado normativo:

| Status | Significado normativo |
| --- | --- |
| `Accepted` | intenção foi aceita; Events declarados foram persistidos ou nenhum Event era normativamente necessário |
| `Rejected` | precondição de negócio/técnica declarada não foi satisfeita; nenhum Event de sucesso foi persistido |
| `Conflict` | identidade, payload ou ExpectedRevision é incompatível com estado/intenção existente |
| `Duplicate` | mesma intenção já terminou; retorna o resultado original sem novo efeito |
| `Expired` | intenção temporal perdeu validade antes de ser aceita |
| `Unauthorized` | actor não possui autoridade exigida; nenhum efeito foi produzido |
| `InvariantViolation` | estado resultante violaria invariante do Aggregate |

**TBS-CMD-001:** resultado contém CommandId, AggregateId quando aplicável, status, observed revision, correlation, causation, errors e EventIds produzidos.

**TBS-CMD-002:** mutação aceita informa a nova revisão.

**TBS-CMD-003:** Duplicate preserva o resultado e os EventIds originais.

**TBS-CMD-004:** Conflict não executa merge automático.

**TBS-CMD-005:** mensagem, exception, HTTP ou gRPC mapping não altera status.

**TBS-CMD-006:** Command rejeitado não emite Event que represente sucesso.

## 7. Error Catalog e envelope

Todo erro normativo declarado por artefato contém:

| Campo | Norma |
| --- | --- |
| `code` | estável, único no namespace normativo e orientado a máquina |
| `meaning` | significado sem ambiguidade |
| `condition` | condição exata de ocorrência |
| `retryable` | se a mesma intenção pode ser repetida sem mudança externa |
| `recoverable` | se nova ação permitida pode resolver |
| `severity` | impacto técnico, não responsabilidade |
| `consumer` | ator/artefato que deve reagir |
| `relatedIdentity` | Command/Event/Aggregate relacionado |
| `safeContext` | diagnóstico sem dado proibido |
| `version` | versão do descriptor |

Famílias técnicas normativas: `AUTHORIZATION`, `VALIDATION`, `INVARIANT`, `CONCURRENCY`, `IDEMPOTENCY`, `EXPIRATION`, `REPLAY`, `SCHEMA`, `PERSISTENCE_PUBLICATION`, `PROJECTION_REBUILD`, `SAGA_COORDINATION`.

**TBS-ERR-001:** código é autoridade; mensagem é explicativa.

**TBS-ERR-002:** Error não é Event de domínio.

**TBS-ERR-003:** transporte não muda significado, retryability ou recoverability.

**TBS-ERR-004:** erro desconhecido não é reinterpretado por heurística.

**TBS-ERR-005:** dados sensíveis não aparecem em code, message ou safeContext.

**TBS-ERR-006:** cada artefato define seus códigos específicos sem redefinir famílias transversais.

## 8. Optimistic concurrency

**TBS-CON-001:** mutação de Aggregate existente exige ExpectedRevision.

**TBS-CON-002:** comparação e append de todos os Events de um Command aceito são atômicos.

**TBS-CON-003:** WrongRevision produz Conflict e nenhum Event do Command perdedor.

**TBS-CON-004:** conflito exige releitura antes de nova intenção.

**TBS-CON-005:** retry cego com nova identidade é proibido.

**TBS-CON-006:** merge automático de intenções concorrentes é proibido.

**TBS-CON-007:** Duplicate é determinado por identidade/conteúdo, não por coincidência de revisão.

## 9. Persistência e publicação atômicas

**TBS-ATOM-001:** Events persistidos constituem o estado autoritativo do Aggregate event-sourced.

**TBS-ATOM-002:** Event commitado permanece publicável até confirmação de entrega.

**TBS-ATOM-003:** republicação preserva EventId, causation e correlation.

**TBS-ATOM-004:** falha após commit e antes de publish não cria novo Event.

**TBS-ATOM-005:** consumidor produz efeito idempotente.

**TBS-ATOM-006:** confirmação de transporte não redefine confirmação do domínio.

**TBS-ATOM-007:** replay e rebuild desabilitam side effects externos.

Outbox, transaction boundary física, broker e storage pertencem à CGS.

## 10. Replay e reidratação de Aggregate

**TBS-RPL-001:** replay inicia de estado vazio normativamente conhecido ou snapshot válido.

**TBS-RPL-002:** Events são aplicados por Revision estritamente crescente.

**TBS-RPL-003:** replay não executa Commands, publicação, chamada externa ou novo Event.

**TBS-RPL-004:** Duplicate Event não é aplicado duas vezes.

**TBS-RPL-005:** gap bloqueia conclusão do replay.

**TBS-RPL-006:** Unknown Event, schema incompatível, Event corrompido ou invariante impossível aborta replay.

**TBS-RPL-007:** estado parcialmente reconstruído é descartado após aborto.

**TBS-RPL-008:** Aggregate abortado não aceita Command.

**TBS-RPL-009:** replay integral é referência normativa.

Resultados conceituais: `ReplayCompleted`, `ReplayAborted`, `ReplayGapDetected`, `UnknownEventSchema`, `IncompatibleEventSchema`, `CorruptedEvent`, `ReplayInvariantViolation`.

Replay é exclusivo de Aggregate. Projection usa rebuild.

## 11. Snapshots

**TBS-SNP-001:** snapshot é derivado, descartável e nunca substitui Event.

**TBS-SNP-002:** snapshot contém AggregateId, source revision, snapshot schema version e integridade verificável.

**TBS-SNP-003:** snapshot não pode alterar sequência ou significado dos Events.

**TBS-SNP-004:** snapshot ausente, corrompido ou incompatível não altera comportamento.

**TBS-SNP-005:** sem snapshot compatível, restauração usa somente Events autoritativos.

**TBS-SNP-006:** snapshot + tail replay produz estado e revisão idênticos ao replay integral.

**TBS-SNP-007:** snapshot futuro/desconhecido não é interpretado por heurística.

Frequência, tamanho, compressão e storage não são definidos pela TBS.

## 12. Evolução e compatibilidade de Events

**TBS-EVT-001:** Event original é imutável.

**TBS-EVT-002:** Event possui event type e schema version.

**TBS-EVT-003:** mudança de significado exige nova schema version.

**TBS-EVT-004:** depreciação não apaga nem reescreve histórico.

**TBS-EVT-005:** upcast é determinístico, versionado, puro e preserva EventId, causation, correlation e representação original.

**TBS-EVT-006:** cadeia de upcast é explícita; salto heurístico é proibido.

**TBS-EVT-007:** downgrade heurístico é proibido.

**TBS-EVT-008:** campos desconhecidos são preservados/ignorados somente quando a compatibilidade declarada garante significado conhecido inalterado.

**TBS-EVT-009:** Event futuro sem compatibilidade declarada aborta reidratação.

**TBS-EVT-010:** backward/forward compatibility declarada possui teste de conformidade.

Formato físico pertence à CGS.

## 13. Idempotência, duplicidade, ordering e gaps

**TBS-IDO-001:** mesma idempotency key e mesmo payload lógico retorna resultado original.

**TBS-IDO-002:** mesma key e payload divergente produz Conflict.

**TBS-IDO-003:** retry preserva CommandId lógico; redelivery preserva EventId.

**TBS-IDO-004:** ordering normativo é por stream/Revision, nunca global.

**TBS-IDO-005:** Event duplicado não avança revisão.

**TBS-IDO-006:** Event atrasado não regride estado já confirmado.

**TBS-IDO-007:** gap impede avanço do estado que depende da sequência.

**TBS-IDO-008:** gap nunca é preenchido por inferência.

**TBS-IDO-009:** expiração de retenção técnica não autoriza repetir efeito já conhecido.

Prazo quantitativo de retenção pertence à configuração.

## 14. Rebuild de Projections e Read Models

**TBS-PRJ-001:** rebuild reconstrói estado derivado e não reidrata Aggregate.

**TBS-PRJ-002:** mesma sequência de fatos e mesma projection rule version produzem resultado logicamente equivalente.

**TBS-PRJ-003:** rebuild não executa side effects externos.

**TBS-PRJ-004:** Projection registra versão, checkpoint/source position e staleness.

**TBS-PRJ-005:** falha não promove Projection parcial a atual.

**TBS-PRJ-006:** substituição por Projection reconstruída é observavelmente atômica.

**TBS-PRJ-007:** schema/rule incompatível invalida a visão derivada sem alterar fatos.

**TBS-PRJ-008:** rebuild nunca escreve no Aggregate ou stream fonte.

## 15. Sagas

**TBS-SAG-001:** Saga coordena e nunca decide regra de domínio.

**TBS-SAG-002:** Saga possui identidade, estado, correlation, causation, inputs processados e Commands pendentes.

**TBS-SAG-003:** input duplicado não produz segundo Command equivalente.

**TBS-SAG-004:** retry preserva identidade da intenção.

**TBS-SAG-005:** resultado externo desconhecido bloqueia ação incompatível.

**TBS-SAG-006:** compensação é novo Command explícito ao owner; não desfaz Event.

**TBS-SAG-007:** replay/rebuild da Saga não executa side effects externos.

**TBS-SAG-008:** conclusão exige condições terminais da Saga específica.

**TBS-SAG-009:** crash após persistência e antes do envio não pode duplicar efeito observável.

Timeouts e tentativas quantitativas pertencem à configuração.

## 16. Perfil de conformidade

Esta seção prova normas; não cria comportamento.

Toda implementação conforme executa testes para:

1. Command Accepted;
2. Rejected por precondição;
3. InvariantViolation;
4. Unauthorized;
5. Duplicate;
6. Conflict por payload;
7. Conflict por ExpectedRevision;
8. Expired;
9. atomic append;
10. falha após commit e antes de publish;
11. redelivery;
12. replay integral;
13. snapshot + tail equivalente;
14. snapshot ausente/corrompido/incompatível;
15. Event duplicado;
16. gap;
17. Unknown Event com descarte do estado parcial;
18. Event futuro;
19. upcast válido/inválido;
20. rebuild completo e falha intermediária;
21. Saga duplicate/retry/unknown result/compensation.

Cada teste referencia a norma TBS correspondente e preserva efeitos observáveis para comparação entre implementações.

## 17. Critérios de conformidade

Uma implementação somente declara conformidade quando:

- nenhuma decisão comportamental é inferida pelo código;
- toda norma aplicável possui teste;
- a mesma sequência de Commands/Events produz a mesma sequência de efeitos observáveis;
- comportamento não especificado falha explicitamente;
- extensão local é marcada como não normativa;
- extensão não altera efeitos normativos;
- CGS, configuração e adapters não contradizem a TBS;
- resultados são reproduzíveis.

## 18. Evolução da TBS

**TBS-EVO-001:** alteração de efeito observável é breaking change.

**TBS-EVO-002:** novo comportamento obrigatório exige nova versão normativa.

**TBS-EVO-003:** correção editorial sem mudança semântica não cria nova versão comportamental.

**TBS-EVO-004:** somente texto/tabela normativa altera conformidade.

**TBS-EVO-005:** exemplo e nota não criam norma.

**TBS-EVO-006:** CGS nunca supersede TBS.

**TBS-EVO-007:** configuração nunca altera semântica.

**TBS-EVO-008:** extensão local não se torna normativa sem processo formal.

**TBS-EVO-009:** versões anteriores permanecem auditáveis.

## 19. Não objetivos

A TBS não escolhe linguagem, framework, classes, exceptions, Result type físico, banco, broker, Event Store, serializer, API protocol, DI, storage, compressão, frequência de snapshot, timeout, TTL, retry count, batch size, threshold, SLO ou estrutura de arquivos.

## Contract compatibility evaluation

**TBS-COMP-001:** An operation resolves exactly one `CompatibilityScopeId` before matrix discovery. Scope inheritance, global/default fallback and composition are prohibited.

**TBS-COMP-002:** Evaluation stops at the first blocking condition, records exactly one cause, and Later stages are not evaluated. The deterministic order is `COMPATIBILITY_SCOPE_NOT_RESOLVED`, `MATRIX_NOT_FOUND`, `MATRIX_UNAVAILABLE`, `MATRIX_CORRUPTED`, `MATRIX_VERSION_UNRESOLVABLE`, `MATRIX_NOT_EFFECTIVE`.

**TBS-COMP-003:** Only after loading a valid and effective matrix does an absent exact six-field entry produce `DECISION_PRODUCED` with `UNSUPPORTED / ENTRY_NOT_FOUND`. Matrix absence, retrieval failure, corruption, unresolved historical revision or ineffective period produces `COMPATIBILITY_NOT_EVALUATED`, never `UNSUPPORTED`.

**TBS-COMP-004:** The exact lookup key is `ConsumerId + CompatibilityScopeId + ProducerContext + ArtifactType + VersionKind + VersionValue`. Duplicate or contradictory complete keys invalidate the immutable revision.

**TBS-COMP-005:** For each consumer and scope, effective intervals are non-overlapping and activation is atomic. Before instant `T` the predecessor applies; at and after `T` the successor applies. Two revisions cannot be percentage-rolled within one scope.

**TBS-COMP-006:** Real-time evaluation selects the current effective revision at the evaluation instant. Replay uses an explicitly identified historical revision; if it cannot be recovered, the result is `COMPATIBILITY_NOT_EVALUATED / MATRIX_VERSION_UNRESOLVABLE`. Current state never substitutes silently.

**TBS-COMP-007:** `UNSUPPORTED` is a completed decision. Non-evaluation rejects without a compatibility decision. Retry after non-evaluation is permitted only with the same operation identity and cannot mutate the producer artifact or the prior attempt.

**TBS-COMP-008:** Every append-only audit record carries an explicit `ResultKind`: `DECISION_PRODUCED` with state and reason, or `COMPATIBILITY_NOT_EVALUATED` with exactly one cause. It also records operation, consumer, scope and scope-contract revision, complete artifact key, matrix revision, evaluation instant, correlation and causation, and experimental authorization when applicable.

**TBS-COMP-009:** `DEPRECATED` produces an identical functional result to `SUPPORTED` and adds operational replacement observability only; it never changes business behavior.

**TBS-COMP-010:** `EXPERIMENTAL` processing requires explicit authorization, and its output is marked experimental. It cannot replace official results without consumer-specific normative authority.
