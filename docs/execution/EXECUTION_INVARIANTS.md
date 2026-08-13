# Execution Invariants — Constituição do Comportamento

Este documento é normativo. Ele especializa a [Especificação Oficial](../specification/PLATFORM_SPECIFICATION.md) para execução de Commands, Events, State Machines, Sagas, replay e recuperação. Os termos **DEVE**, **NÃO DEVE** e **NUNCA** expressam obrigação. Valores quantitativos ainda não aprovados permanecem `OPEN`; nenhum implementador pode inventá-los.

## 1. Ownership e mudança de estado

1. `EXE-INV-001` — Um Command possui exatamente um Bounded Context e um Aggregate owner.
2. `EXE-INV-002` — Um Command aceito pode modificar somente uma instância do Aggregate owner. Mudanças em outros Aggregates ocorrem por novos Commands, normalmente causados por Events.
3. `EXE-INV-003` — Somente o Aggregate owner avalia pré-condições, autorização contextual, revisão esperada e invariantes.
4. `EXE-INV-004` — Event é fato imutável no passado. Ele não modifica estado por si; o consumidor decide se deve emitir um Command ao seu próprio owner.
5. `EXE-INV-005` — Saga coordena progresso. Ela não calcula preço, validade de Evidence, split, cobertura, health, autorização ou qualquer regra pertencente a Aggregate.
6. `EXE-INV-006` — Reconciler compara `DesiredState`, `CurrentState` e `ObservedState`, mas somente emite Commands válidos. Ele nunca grava o estado convergido diretamente.
7. `EXE-INV-007` — Read model, projeção, cache, relatório e estado de Saga nunca são autoridade transacional.

## 2. Commands

8. `EXE-INV-008` — Todo Command declara `commandId`, tipo e versão, Aggregate alvo, identidade alvo, emissor, contexto de autorização, instante, `correlationId`, `causationId`, chave de idempotência, digest conceitual do payload e, quando aplicável, revisão esperada e expiração.
9. `EXE-INV-009` — Aceite significa somente que o owner validou e aplicou a intenção. Entrega ao owner ou recebimento pelo transporte não significa aceite.
10. `EXE-INV-010` — Rejeição não publica um evento de sucesso. A tentativa e seu motivo permanecem na auditoria; um Event de rejeição só existe quando a rejeição é um fato de domínio catalogado.
11. `EXE-INV-011` — Repetição da mesma chave de idempotência com o mesmo payload retorna o resultado original sem novo efeito.
12. `EXE-INV-012` — Repetição da mesma chave com payload ou alvo diferente é conflito e nunca produz segundo efeito silencioso. Prazo de retenção da chave permanece `OPEN-030`.
13. `EXE-INV-013` — Commands expirados, obsoletos ou dirigidos a uma revisão incompatível são rejeitados antes da mudança.
14. `EXE-INV-014` — Command remoto, financeiro, de Evidence, segurança, manutenção, emergência ou reversão exige motivo auditável e autorização revalidada pelo owner.

## 3. Events e entrega

15. `EXE-INV-015` — Todo Event declara `eventId`, tipo e versão, produtor único, Aggregate e revisão de origem, `occurredAt`, correlação, causação, payload conceitual e versões de políticas relevantes.
16. `EXE-INV-016` — O produtor persiste a transição e o Event como uma única decisão de domínio; nunca existe Event de sucesso sem a transição que ele afirma.
17. `EXE-INV-017` — A entrega pode atrasar, duplicar, falhar temporariamente ou chegar fora de ordem entre Aggregates. Nenhum consumidor pode depender de entrega exatamente uma vez.
18. `EXE-INV-018` — Ordering garantido é somente o definido para o stream do Aggregate. Ordem global não existe. Relações entre streams usam correlação, causação, revisões e pré-condições.
19. `EXE-INV-019` — Consumidor registra `eventId` e resultado antes de confirmar processamento. Reentrega não repete efeito.
20. `EXE-INV-020` — Evento com schema desconhecido, payload inválido, lacuna de revisão ou dependência ausente é isolado para diagnóstico; não é descartado nem reinterpretado.
21. `EXE-INV-021` — Indisponibilidade do transporte interrompe propagação, não desfaz o fato já aceito pelo produtor. A retomada republica o mesmo Event, com o mesmo `eventId`.
22. `EXE-INV-022` — Retry de publicação ou consumo preserva identidade, correlação e causação. Criar novo `eventId` para o mesmo fato é proibido.
23. `EXE-INV-023` — Compensação é novo Command seguido de novo Event; nunca edição, remoção ou substituição do fato original.

## 4. Concorrência e ordering

24. `EXE-INV-024` — Dois Commands concorrentes para o mesmo Aggregate são serializados conceitualmente pela revisão do Aggregate.
25. `EXE-INV-025` — Command baseado em revisão anterior é rejeitado como conflito ou reavaliado por nova intenção explícita; nunca é mesclado automaticamente quando afeta dinheiro, prova, segurança ou disponibilidade.
26. `EXE-INV-026` — O consumidor não presume que eventos de Aggregates diferentes foram produzidos na ordem em que chegaram.
27. `EXE-INV-027` — Eventos offline atrasados conservam `occurredAt`, identidade da tentativa e ordem local conhecida. O instante de ingestão nunca substitui o instante do fato.
28. `EXE-INV-028` — Gap de sequência é estado explícito. Enquanto o gap puder afetar validade ou dinheiro, a decisão dependente permanece bloqueada ou pendente.
29. `EXE-INV-029` — A política quantitativa de espera por gaps, lateness e TTL permanece `OPEN-029/031`; até ser aceita, o sistema não presume perda definitiva.

## 5. Replay, reprocessamento e projeções

30. `EXE-INV-030` — Replay reapresenta Events imutáveis a um consumidor ou projeção; não executa novamente o Command de origem.
31. `EXE-INV-031` — Reprocessamento repete uma decisão derivada com identidade de tentativa própria e referência à tentativa anterior. Ele não muda o Event de entrada.
32. `EXE-INV-032` — Reidratação de Aggregate usa somente seu histórico autoritativo e snapshots verificáveis do mesmo owner. Read models de outros contextos não completam estado ausente.
33. `EXE-INV-033` — Rebuild de projeção começa de checkpoint verificável, pode ser reiniciado e deve convergir ao mesmo resultado para o mesmo conjunto ordenado de Events.
34. `EXE-INV-034` — Durante rebuild, projeção incompleta ou defasada é marcada como tal. Ela não autoriza saque, crédito, split, Evidence, ativação ou emergência.
35. `EXE-INV-035` — Replay e rebuild não enviam novamente notificações, transferências, atualizações, comandos remotos ou qualquer efeito externo já executado; esses efeitos exigem ledger de entrega/idempotência próprio.
36. `EXE-INV-036` — Divergência entre projeção reconstruída e estado publicado abre diagnóstico auditável; nunca é corrigida por sobrescrita silenciosa.

## 6. Fronteiras críticas

37. `EXE-INV-037` — Edge produz `PlaybackEvent` e `PlaybackSignature`; `EvidenceRecord` nasce somente no Evidence Ledger do Cloud (`DEC-002`).
38. `EXE-INV-038` — Quantum nunca recebe `PlaybackEvent`, Campaign, preço, pessoa ou documento de aplicação. Recebe somente representação/hash permitido e ancora o hash.
39. `EXE-INV-039` — Settlement nunca consulta Player, Canvas ou fila Edge. Ele consome somente referência a `EvidenceRecord` elegível.
40. `EXE-INV-040` — Edge e TV Network nunca recebem Command financeiro e nunca calculam preço, split, direito, cobertura ou Settlement.
41. `EXE-INV-041` — TV Network termina na disponibilidade operacional e não conhece Campaign, anúncio, Pricing, Evidence, Settlement ou Financial Platform (`DEC-008`).
42. `EXE-INV-042` — Capability é declarativa e independente de Facets. Facet pode ser mecanismo interno, mas não é pré-condição implícita do Capability Registry (`DEC-010`).
43. `EXE-INV-043` — QR contém token opaco e é resolvido no Cloud. Edge somente renderiza; Quantum só participa da consulta institucional permitida (`DEC-013`).
44. `EXE-INV-044` — AI Orchestration e Grão emitem recomendação ou Command delegado. O owner continua responsável por autorização e decisão.

## 7. Prova, preço e dinheiro

45. `EXE-INV-045` — `PricingQuote` é calculado antes da alocação e fica imutável após `PriceApplied`.
46. `EXE-INV-046` — Campaign e Slot só usam `AvailableBudget` compensado. `ContractValue` não é saldo (`DEC-005`).
47. `EXE-INV-047` — A separação entre reserva e consumo de CampaignBudget permanece `OPEN-013`; nenhum fluxo pode escolher o instante por conveniência.
48. `EXE-INV-048` — `EvidenceRecord` segue `BUILDING → PENDING_VALIDATION → VALID` ou `INVALID/DISPUTED`; Edge nunca atribui esses estados.
49. `EXE-INV-049` — Nenhum direito financeiro derivado de exibição existe sem Evidence `VALID`, não revertida e com ancoragem confirmada.
50. `EXE-INV-050` — Settlement aplica `SPLIT-PERFORMANCE-RESIDUAL-V1` e cria sete direitos: TV 20%, Espaço 20%, Seller/Seller Acquisition Fund 20%, Influencer/Influencer Acquisition Fund 10% e Mostarda 30%. Financial Platform materializa créditos; Withdrawal é o único fluxo que instrui saída ao Asaas (`DEC-004/066`).
51. `EXE-INV-051` — Cada SplitShare tem ciclo próprio. Falha, ausência ou inelegibilidade de uma parcela não bloqueia nem redistribui as demais.
52. `EXE-INV-052` — `CREDITED` significa direito materializado no Partner Ledger, não pagamento ao parceiro.
53. `EXE-INV-053` — Settlement fechado é imutável. Chargeback, reversão tardia ou erro geram linhas/Aggregates compensatórios; `CLOSED → COMPENSATING` é proibido.
54. `EXE-INV-054` — Wallet é projeção do Partner Ledger e não pode ser autoridade de saque enquanto `OPEN-035` não for resolvido.

## 8. Estado operacional e recuperação

55. `EXE-INV-055` — `DesiredState`, `CurrentState` e `ObservedState` possuem owners e revisões diferentes; nenhum substitui o outro.
56. `EXE-INV-056` — Ausência de heartbeat gera `UNKNOWN` ou gap, nunca inferência de `HEALTHY`.
57. `EXE-INV-057` — Health observation é append-only; HealthScore é derivado, versionado e explicável.
58. `EXE-INV-058` — Update exige pacote assinado, compatibilidade, política, MaintenanceWindow, onda e health gate. Nenhuma atualização é forçada fora da política.
59. `EXE-INV-059` — Rollback é nova transição auditável e preserva versão tentada, motivo, resultado e última versão saudável.
60. `EXE-INV-060` — Emergência preempta mídia somente por Command autorizado, com escopo, prioridade, motivo e expiração. Owner único e segregação de funções permanecem `OPEN-027/032`.
61. `EXE-INV-061` — Recuperação automática respeita limite qualitativo: tenta somente ações homologadas, evita loop e escala para diagnóstico quando não converge. Limites numéricos permanecem `OPEN-031`.

## 9. Auditoria e tempo

62. `EXE-INV-062` — Toda decisão relevante registra ator ou sistema, autoridade, motivo, pré-estado, pós-estado, revisão, políticas, instante, resultado, correlação e causação.
63. `EXE-INV-063` — Relógio do dispositivo pode divergir, mas essa divergência não substitui a confirmação do final natural do Creative. Evidence Validator registra e avalia o drift por política; interrupção anterior ao final é inválida e não é cobrada. Falha posterior, durante o frame final congelado, não reverte a conclusão e recebe registro de incidente separado.
64. `EXE-INV-064` — Histórico auditável é append-only. Prazo de retenção permanece `OPEN-001`; até decisão aceita, fatos necessários a prova, dinheiro, segurança e disputa são preservados.
65. `EXE-INV-065` — Dados pessoais e sensoriais obedecem minimização, consentimento e autorização. Replay nunca amplia finalidade ou público do dado.

## Exemplos normativos

| Situação | Resultado correto | Contraexemplo proibido |
| --- | --- | --- |
| `ReserveSlot` é repetido após resposta perdida | Retornar o mesmo Slot/resultado pela chave original | Criar um segundo Slot |
| `CampaignPaused` chega antes de `CampaignPublished` a uma projeção | Marcar gap e aguardar/reconstruir o stream da Campaign | Inventar transição `DRAFT → PAUSED` |
| Transporte fica indisponível após `EvidenceValidated` | Preservar o fato e republicar o mesmo Event quando recuperar | Revalidar e gerar novo `eventId` |
| Projeção de Wallet é reconstruída | Reaplicar ledger sem reenviar saque | Usar replay para chamar o Asaas |
| Uma SplitShare não tem beneficiário elegível | Marcar somente ela `UNCLAIMED` | Redistribuir seus 10% às outras |
| Update falha no health gate | Emitir falha e Command de rollback conforme política | Apagar a tentativa e declarar versão antiga como nunca alterada |
| Playback offline chega atrasado | Preservar instante/tentativa, deduplicar e validar gaps | Recriar evento com timestamp de ingestão |
## Governance execution invariants

1. GovernanceCase é o único Aggregate que aceita PublishDecision.
2. ResponsibilityDecisionPublished possui producer único.
3. Consumer nunca deriva responsável a partir de fatos.
4. Confidence nunca controla branching de consequência.
5. Toda consequência referencia decisionId + revision.
6. Ordering é por governanceCaseId + aggregateRevision.
7. Duplicidade não cria nova decisão nem efeito.
8. Replay e rebuild executam sem side effects externos.
9. Timeout não equivale a decisão.
10. Nova policy exige nova revision.
11. CLOSED é final.
12. Compensação é novo Command no owner competente.
