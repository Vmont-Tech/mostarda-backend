# Remote Operations

## Escopo

Remote Operations coordena Commands operacionais dirigidos a TV, Device, EdgeInstallation, MaintenanceWindow ou UpdateRollout. Não é Aggregate e não possui autoridade própria sobre os targets.

Operações permitidas incluem publicar Desired State, solicitar diagnóstico, reiniciar processo, sincronizar estado, abrir manutenção, aplicar update, executar rollback, suspender TV e colocar Edge em quarentena.

## Envelope obrigatório

Todo Command remoto contém:

- `operationId` e `idempotencyKey`;
- target exato e Aggregate owner;
- tipo e payload conceitual;
- revisão esperada;
- ator/principal e autorização;
- motivo e política aplicável;
- instante de emissão, `notBefore` quando aplicável e TTL;
- correlação/causation;
- maintenance window ou autorização excepcional quando exigida;
- resultado esperado e condição de conclusão.

Ausência de campo obrigatório gera rejeição auditável.

## Ciclo de vida da operação

```text
REQUESTED → AUTHORIZED → DISPATCHABLE → DISPATCHED → ACKNOWLEDGED
                                              ↘ EXECUTING
ACKNOWLEDGED/EXECUTING → SUCCEEDED | FAILED | TIMED_OUT
REQUESTED/AUTHORIZED/DISPATCHABLE → REJECTED | CANCELLED | EXPIRED
DISPATCHED → EXPIRED, se não iniciou dentro do TTL
```

`SUCCEEDED`, `FAILED`, `TIMED_OUT`, `REJECTED`, `CANCELLED` e `EXPIRED` são finais para a tentativa. Retry cria nova tentativa correlacionada, preservando a anterior.

ACK não significa sucesso; apenas reconhecimento da operação.

## Idempotência, ordering e conflito

- Repetição da mesma `idempotencyKey` e conteúdo retorna o resultado conhecido.
- Mesma chave com conteúdo diferente é conflito e nunca substitui a operação original.
- Ordering é por target e classe de operação.
- Revisão esperada impede aplicar intenção obsoleta.
- Operações incompatíveis não executam simultaneamente; a política decide rejeitar, serializar ou cancelar a de menor precedência.
- Operação de emergência ou segurança pode preemptar update somente quando política pré-aprovada autorizar.

A matriz completa de compatibilidade e precedência entre operações é `OPEN`.

## Timeout e retry

Cada tipo de operação possui:

- prazo para despacho;
- prazo para ACK;
- prazo de execução;
- período de observação;
- máximo de tentativas e espaçamento;
- condição de retry seguro.

Valores quantitativos são `OPEN`.

Timeout é fato, não prova de falha física. Resultado tardio é preservado como tardio e não reabre a tentativa final; pode iniciar reconciliação.

## Operação offline

Command expirado não é aplicado após reconexão. O Edge primeiro reporta Current State e confirma o último Command conhecido; o Reconciler então decide se uma nova intenção ainda é necessária.

Reenfileirar Command antigo com nova identidade para contornar TTL é proibido. Se a intenção persistir, deve ser emitido novo Command com nova revisão e nova auditoria.

## Desired, Current e Observed State

`PublishDesiredState` cria revisão imutável para uma EdgeInstallation. `ReportCurrentState` declara o que o Edge acredita estar aplicado. `ObservedState` é derivado independentemente de Heartbeat, Health, versão e resultado de operação.

O Reconciler:

1. seleciona revisões comparáveis;
2. descarta sinais inválidos/obsoletos para a projeção corrente sem apagar histórico;
3. identifica convergência, divergência ou informação insuficiente;
4. registra `StateReconciliationRequested`;
5. emite Commands específicos para os owners corretos;
6. aguarda Events e novas observações;
7. conclui como `CONVERGED`, `DIVERGED`, `BLOCKED`, `TIMED_OUT` ou `UNKNOWN`.

Ele nunca:

- altera Desired, Current ou Aggregate diretamente;
- força update sem política;
- ignora maintenance window;
- transforma ausência de dado em convergência;
- inclui conteúdo comercial em Desired State.

## Spoofing e quarentena

Command com origem inválida é rejeitado pelo Edge. Resultado com identidade inválida é rejeitado pelo TV Network. Conflito persistente, replay malicioso ou target incompatível pode gerar `QuarantineEdge`.

Liberação exige Command autorizado, motivo, nova observação confiável e evento `EdgeReleasedFromQuarantine`.

## Auditoria

Cada mudança de estágio preserva ator, target, revisão, política, timestamps, motivo, payload digest, resultado, erros, tentativa e relação causal. Operações não podem ser apagadas ou reclassificadas silenciosamente.

## Exemplos

**Válido:** update permanece pendente enquanto a maintenance window não abre; ao expirar, termina `EXPIRED` e precisa de nova operação.

**Válido:** restart retorna ACK, mas o processo não estabiliza no período de observação. A operação termina `FAILED` e gera diagnóstico.

**Contraexemplo:** Reconciler grava diretamente a versão desejada como Current State. Current State só pode ser declarado pelo Edge e confrontado com observação.

**Contraexemplo:** reenviar depois da reconexão um restart expirado. O sistema deve reconciliar e emitir nova intenção se ainda necessária.
