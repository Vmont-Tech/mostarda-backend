# TV Network State Machines

## Regras universais

- Transição ocorre somente após Command válido aceito pelo Aggregate owner ou, para projeções, após fato determinístico.
- Toda transição produz Event com estado anterior, novo, política, motivo, revisão e correlação.
- Nenhuma transição pula gate obrigatório.
- Duplicata idempotente não repete transição.
- Evento atrasado não regride estado corrente.
- Estado final não reabre; recuperação cria novo Aggregate, nova tentativa ou transição explicitamente prevista.
- `UNKNOWN` significa informação insuficiente e nunca equivale a sucesso.

## TV

| Origem | Command / evento causador | Destino | Condições |
| --- | --- | --- | --- |
| inexistente | `RegisterTV` | `REGISTERED` | identidade inédita |
| `REGISTERED` | `StartTVInstallation` | `INSTALLING` | Installation planejada |
| `INSTALLING` | `InstallationAccepted` → `MarkTVInstalled` | `INSTALLED` | aceite válido |
| `INSTALLED` | `StartTVProvisioning` | `PROVISIONING` | Device/Edge targets válidos |
| `PROVISIONING` | `ActivateTV` | `ACTIVE` | todos os gates aprovados |
| `PROVISIONING` | `SuspendTV` | `SUSPENDED` | falha/bloqueio explicado |
| `ACTIVE` | `SuspendTV` | `SUSPENDED` | motivo operacional/segurança/Health |
| `SUSPENDED` | `ReactivateTV` | `ACTIVE` | gates reavaliados |
| `ACTIVE` ou `SUSPENDED` | `EnterTVMaintenance` | `MAINTENANCE` | janela aberta |
| `MAINTENANCE` | `ExitTVMaintenance` | `ACTIVE` | gates aprovados |
| `MAINTENANCE` | `ExitTVMaintenance` | `SUSPENDED` | gates insuficientes |
| qualquer não final | `DecommissionTV` | `DECOMMISSIONED` | revogações e motivo |

`DECOMMISSIONED` é final. É proibido ativar sem Installation aceita, Edge confiável, Current State recente, Capability mínima e Health aprovado. Falha de instalação cria nova tentativa de Installation; não salta para provisioning.

## DeviceRegistration e vínculo

`DeviceRegistration`:

```text
REGISTERED ↔ BOUND
BOUND → UNBOUND → BOUND
REGISTERED/BOUND/UNBOUND → QUARANTINED
QUARANTINED → REGISTERED/BOUND/UNBOUND, conforme vínculo preservado
qualquer não final → DECOMMISSIONED
```

`DECOMMISSIONED` é final. Dois vínculos principais ativos e sobrepostos para a mesma TV/tipo são proibidos. Liberação de quarentena exige nova observação confiável; decommission não é recuperação.

## Installation

| Origem | Command | Destino | Condições |
| --- | --- | --- | --- |
| inexistente | `PlanInstallation` | `PLANNED` | escopo e responsável definidos |
| `PLANNED` | `StartInstallation` | `IN_PROGRESS` | janela/autoridade válidas |
| `IN_PROGRESS` | `RecordInstallationCheck` | `IN_PROGRESS` | acrescenta item, não sobrescreve |
| `IN_PROGRESS` | `VerifyInstallation` | `VERIFIED` | checklist completo e aprovado |
| `IN_PROGRESS` | `VerifyInstallation` | `FAILED` | falha bloqueante |
| `VERIFIED` | `AcceptInstallation` | `ACCEPTED` | aceite autorizado |
| `PLANNED/IN_PROGRESS/VERIFIED` | `CancelInstallation` | `CANCELLED` | motivo explícito |

`ACCEPTED`, `FAILED` e `CANCELLED` são finais. Nova tentativa cria outra Installation ligada à anterior.

## EdgeInstallation

| Origem | Command / evento | Destino | Condições |
| --- | --- | --- | --- |
| inexistente | `CreateEdgeInstallation` | `UNINSTALLED` | identidade reservada para TV/Device |
| `UNINSTALLED` | `StartEdgeProvisioning` | `INSTALLING` | TV instalada, Device vinculado |
| `INSTALLING` | `CompleteEdgeProvisioning` | `HEALTHY` | identidade, Current, Heartbeat, Capability e Health aprovados |
| `INSTALLING` | `CompleteEdgeProvisioning` | `DEGRADED` | operação permitida com degradação explícita |
| `INSTALLING` | `FailEdgeProvisioning` | `FAILED` | causa registrada |
| `HEALTHY` | Health/Observed State aceito | `DEGRADED` | policy |
| `DEGRADED` | nova avaliação | `HEALTHY` | estabilidade comprovada |
| `HEALTHY/DEGRADED` | `ApplyUpdate` | `UPDATING` | policy, janela e gate |
| `UPDATING` | update observado | `HEALTHY/DEGRADED` | Current/version/Health |
| `UPDATING` | falha | `FAILED` | resultado explicado |
| `UPDATING/FAILED` | `RollbackUpdate` | `ROLLING_BACK` | baseline elegível |
| `ROLLING_BACK` | observação | `HEALTHY/DEGRADED/FAILED` | resultado real |
| qualquer não final | `QuarantineEdge` | `QUARANTINED` | risco previsto |
| `QUARANTINED/FAILED` | `StartEdgeProvisioning` ou liberação autorizada | `INSTALLING` | identidade/risco tratados |
| qualquer não final | decommission coordenado | `DECOMMISSIONED` | credenciais revogadas |

`DECOMMISSIONED` é final. `UPDATING` sem Maintenance Window/policy e saída automática de quarentena são proibidos.

## TVCapability

```text
DECLARED → VALIDATED → ACTIVE
DECLARED/VALIDATED → REJECTED
ACTIVE → DEGRADED ↔ ACTIVE
ACTIVE/DEGRADED → SUSPENDED → ACTIVE
DECLARED/VALIDATED/ACTIVE/DEGRADED/SUSPENDED → RETIRED
```

`REJECTED` e `RETIRED` são finais para a revisão. Ativação sem manifesto íntegro, compatibilidade, dependências e Health é proibida. Mudança de manifesto cria nova revisão.

## OperationalHealth

`HealthRecord` é imutável após criação. A máquina abaixo é da projeção `OperationalHealth`:

```text
UNKNOWN → HEALTHY | DEGRADED | CRITICAL
HEALTHY ↔ DEGRADED
HEALTHY/DEGRADED → CRITICAL
CRITICAL → DEGRADED/HEALTHY, somente após nova avaliação
qualquer estado → UNKNOWN, por avaliação explícita de insuficiência/staleness
```

Cada transição referencia novo HealthRecord. É proibido sobrescrever a avaliação anterior ou usar retorno de Heartbeat sozinho para recuperar Health.

## Connectivity e Synchronization

Connectivity:

```text
UNKNOWN → ONLINE | INTERMITTENT | OFFLINE
ONLINE ↔ INTERMITTENT ↔ OFFLINE
OFFLINE/INTERMITTENT → RECOVERING → ONLINE/INTERMITTENT/OFFLINE
qualquer estado → UNKNOWN por cobertura insuficiente
```

Synchronization:

```text
IN_SYNC → GAP_DETECTED → REPLAYING → IN_SYNC
GAP_DETECTED/REPLAYING → PARTIAL | FAILED
PARTIAL/FAILED → REPLAYING, por nova tentativa
```

Replay nunca altera identidade de fatos antigos. Critérios temporais são `OPEN`.

## State Reconciliation

```text
REQUESTED → EVALUATING → CONVERGED
EVALUATING → DIVERGED → COMMANDS_ISSUED → EVALUATING
EVALUATING → BLOCKED | UNKNOWN | TIMED_OUT
```

Estados finais são por tentativa; nova observação cria nova tentativa correlacionada. Reconciler não modifica Aggregate diretamente.

## MaintenanceWindow

```text
SCHEDULED → OPEN → CLOSED
SCHEDULED → CANCELLED
```

`CLOSED` e `CANCELLED` são finais. Janela fechada não reabre; extensão exige nova revisão ou nova janela conforme política. Operação não iniciada antes do fim expira.

## RemoteOperation

```text
REQUESTED → AUTHORIZED → DISPATCHABLE → DISPATCHED
DISPATCHED → ACKNOWLEDGED → EXECUTING → SUCCEEDED | FAILED | TIMED_OUT
REQUESTED/AUTHORIZED/DISPATCHABLE → REJECTED | CANCELLED | EXPIRED
DISPATCHED → EXPIRED
```

ACK não é sucesso. Estados finais não reabrem; resultado tardio inicia reconciliação.

## UpdateRollout

```text
DRAFT → VALIDATED → SCHEDULED → WAVE_RUNNING
WAVE_RUNNING ↔ PAUSED
WAVE_RUNNING/PAUSED → ROLLING_BACK → ROLLED_BACK | FAILED
WAVE_RUNNING → COMPLETED
DRAFT/VALIDATED/SCHEDULED/PAUSED → CANCELLED
```

`COMPLETED`, `CANCELLED`, `ROLLED_BACK` e `FAILED` são finais. Cancelar durante execução exige pausar primeiro. `UNKNOWN` em gate não permite promoção.

## UpdateWave

```text
PENDING → READY → RUNNING → OBSERVING → PASSED
READY/RUNNING/OBSERVING → PAUSED
RUNNING/OBSERVING → FAILED → ROLLING_BACK → ROLLED_BACK | ROLLBACK_FAILED
PENDING/READY/PAUSED → CANCELLED
```

ACKs não levam diretamente a `PASSED`; Current/Observed State, versão e Health precisam ser observados.

## RollbackAttempt

```text
REQUESTED → ELIGIBILITY_CHECKED → AUTHORIZED → EXECUTING → OBSERVING
OBSERVING → SUCCEEDED | DEGRADED | FAILED
REQUESTED/ELIGIBILITY_CHECKED → REJECTED
AUTHORIZED → EXPIRED | CANCELLED
```

Alterar baseline cria nova tentativa. Sem baseline elegível, `REJECTED` e quarentena/suspensão conforme política.

## Fleet

```text
ACTIVE → RETIRED
ACTIVE → ACTIVE por nova membership revision
```

Cada ação congela snapshot próprio. `RETIRED` é final; nova Fleet usa nova identidade. Fleet não transiciona membros.

## Exemplos

**Válido:** TV em `MAINTENANCE` encerra janela, mas Health está `UNKNOWN`; vai para `SUSPENDED`.

**Válido:** update aplicou, porém Health ficou degradado; EdgeInstallation vai para `DEGRADED`, não automaticamente `HEALTHY`.

**Contraexemplo:** `REGISTERED → ACTIVE` porque o primeiro Heartbeat chegou. Instalação, provisionamento e gates foram pulados.

**Contraexemplo:** reabrir UpdateRollout `COMPLETED` ao receber resultado tardio. Deve haver reconciliação ou novo rollout.
