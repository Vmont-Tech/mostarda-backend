# TV Network Events

## Contrato universal

Evento é fato passado, imutável e versionado. Ele nunca ordena que outro contexto mude estado.

Envelope conceitual:

- `eventId`, `eventType` e `eventVersion`;
- `aggregateType`, `aggregateId` e `aggregateRevision`;
- `occurredAt` e `recordedAt`;
- `producer`;
- `correlationId` e `causationId`;
- `commandId` quando originado por Command;
- ator/principal ou política automatizada;
- payload conceitual;
- identidade/integridade quando o fato veio do Edge.

## Ordering, entrega e idempotência

- Ordering garantido conceitualmente apenas por Aggregate e revisão.
- Não existe ordering global entre TVs, Fleets ou contextos.
- Consumidores devem aceitar duplicidade e detectar `eventId` repetido.
- Mesmo `eventId` com conteúdo diferente é conflito de integridade.
- Evento atrasado completa histórico, mas não pode fazer projeção corrente regredir sem regra explícita.
- Retry republica o mesmo evento; não cria novo `eventId`.
- Compensação é novo evento causalmente ligado; nunca edição ou exclusão do original.
- Campos novos não mudam semântica anterior; quebra semântica exige nova versão.

## TV

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `TvRegistered` | `TV` | Inventory, Fleet | identidade, Venue/owner refs, revisão; primeiro evento da TV |
| `TvInstallationStarted`, `TvInstalled` | `TV` | Installation, Provisioning, Inventory | InstallationId, estado anterior/novo; ordenados pela TV |
| `TvProvisioningStarted`, `TvActivated`, `TvReactivated` | `TV` | Inventory, Fleet, disponibilidade operacional | gates/políticas e referências que sustentam transição |
| `TvSuspended` | `TV` | Inventory, Fleet, operações | motivo, origem e bloqueios; recuperação usa `TvReactivated`, não remoção |
| `TvEnteredMaintenance`, `TvExitedMaintenance` | `TV` | Inventory, Update, Fleet | window, estado anterior/destino e avaliação de saída |
| `TvLocationChanged`, `TvOwnerChanged` | `TV` | Inventory, Fleet | referência anterior/nova e vigência |
| `TvDecommissioned` | `TV` | todos os consumidores operacionais | motivo, revogações e vínculos; final |

## Devices e Installation

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `DeviceRegistered` | `DeviceRegistry` | Inventory, Installation | identidade, tipo, atributos e origem |
| `DeviceBoundToTV`, `DeviceUnbound` | `DeviceRegistry` | Inventory, Installation, Provisioning | Device/TV, papel, início/fim e motivo |
| `DeviceReplaced` | `DeviceRegistry` | Inventory, Maintenance | antigo/novo, vínculo e causa; não apaga anterior |
| `DeviceQuarantined`, `DeviceReleasedFromQuarantine` | `DeviceRegistry` | Health, Provisioning, Fleet | risco, política, observações e decisão |
| `DeviceDecommissioned` | `DeviceRegistry` | Inventory, Provisioning | estado final e vínculos encerrados |
| `InstallationPlanned`, `InstallationStarted` | `Installation` | TV, Inventory | escopo, local, responsáveis, revisão |
| `InstallationCheckRecorded` | `Installation` | verificação | item, resultado, origem, instante e anexos conceituais |
| `InstallationVerified`, `InstallationFailed` | `Installation` | TV, Provisioning, Fleet | checklist, sinais, falhas e política |
| `InstallationAccepted`, `InstallationCancelled` | `Installation` | TV, Provisioning, Inventory | decisão, ator independente, motivo |

## Edge, State e Remote Operations

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `EdgeInstallationCreated`, `EdgeProvisioningStarted`, `EdgeIdentityRegistered`, `EdgeProvisioned`, `EdgeProvisioningFailed` | `EdgeInstallation` | TV, Inventory, Health | TV/Device/Edge, identidade, versões, causa e revisão |
| `DesiredStatePublished` | `EdgeInstallation` | Edge Runtime, Reconciler | revisão, target, intenção operacional, TTL e policy |
| `CurrentStateReported` | `EdgeInstallation` a partir do Edge | Reconciler, Health, Inventory | sessão, sequência, Desired aplicada, versões/processos |
| `ObservedStateDerived` | TV Network projection | Reconciler, Health | sinais usados, janela, confiança e policy; não é Aggregate Event |
| `StateReconciliationRequested` | `EdgeInstallation` | Reconciler | revisões selecionadas e motivo |
| `StateReconciliationCompleted` | Reconciler | EdgeInstallation, Health, Operations | `CONVERGED/DIVERGED/BLOCKED/TIMED_OUT/UNKNOWN`, diferenças e Commands emitidos |
| `ProcessRestartRequested`, `ProcessRestarted`, `ProcessRestartFailed` | `EdgeInstallation` | Health, Operations | processo, tentativa, policy, causa e resultado |
| `WatchdogStallDetected` | `EdgeInstallation` | Supervisor, Health | processo, sinal de progresso, janela e confiança |
| `EdgeQuarantined`, `EdgeReleasedFromQuarantine` | `EdgeInstallation` | TV, Fleet, Update, Security | risco, policy, restrições e evidência de liberação |
| `RemoteOperationRequested/Authorized/Dispatched/Acknowledged/Succeeded/Failed/TimedOut/Rejected/Expired/Cancelled` | owner do target / coordinator | Operations, Audit, Health | operationId, target, estágio, tentativa, timestamps e resultado |

Eventos de operação são ordenados por `operationId`; mudança de Aggregate continua ordenada pelo Aggregate owner.

## Heartbeat e conectividade

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `HeartbeatReceived` | `EdgeInstallation` | Health, Reconciler | ids, sessão, sequência, emitted/received, digest e resumos |
| `HeartbeatDuplicateIgnored` | TV Network | Audit | chave idempotente e evento original |
| `HeartbeatRejected` | TV Network | Health, Security | razão, identidade alegada e conteúdo preservado conforme política |
| `HeartbeatConflictDetected` | TV Network | Security, Health | mesma chave, digests divergentes e origem |
| `HeartbeatGapDetected` | TV Network | Health, Sync | intervalo ausente e sessão |
| `HeartbeatMissed`, `HeartbeatLivenessRecovered` | liveness evaluator | Health, Fleet | policy, janela, último sinal e estado derivado |
| `EdgeClockDriftDetected` | TV Network | Health, Sync | emitted/received, desvio estimado, confiança e policy |
| `ConnectivityChanged` | Health Monitoring | Reconciler, Fleet | estado anterior/novo, observações e policy |
| `SynchronizationGapDeclared`, `SynchronizationRecovered` | `EdgeInstallation` | Health, Operations | stream, sessão, intervalo, perda conhecida e ponto confirmado |

Ordering de Heartbeat é por `edgeInstallationId + bootSessionId + sequence`. Eventos de ausência usam a revisão da avaliação temporal, não fingem ter sido produzidos pelo Edge.

## Capability e Health

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `CapabilityDeclared/Validated/Rejected/Activated/Degraded/Suspended/Recovered/Retired` | `TVCapability` | Inventory, Health, Edge Runtime | Capability/revisão, manifesto, policy, estado anterior/novo e razões |
| `HealthObservationRecorded` | `HealthRecord` | Health evaluator | subject, origem, janela, sequência/digest e sinais |
| `HealthRecordCreated` | `HealthRecord` | Inventory, Fleet, Reconciler | state, score, dimensões, cobertura, confiança e policy |
| `OperationalHealthChanged` | Health projection | Fleet, Operations | record anterior/novo e mudança explicada |
| `HealthSignalConflictDetected` | Health Monitoring | Security, Diagnosis | origens, conflito e confiança |
| `DiagnosisCreated`, `DiagnosisResolved` | `HealthRecord` | Operations, Fleet | sintomas, fatos, hipóteses, ação e desfecho |
| `FleetHealthAssessed`, `FleetHealthChanged` | Fleet Health projection | Update, Operations | snapshot, janela, cobertura, distribuição, score/confiança e policy |

Um novo HealthRecord compensa entendimento anterior sem apagar ou editar o anterior.

## Maintenance, Update e Rollback

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `MaintenanceWindowScheduled/Opened/Closed/Cancelled` | `MaintenanceWindow` | TV, Update, Remote Operations | escopo, tempo, policy, estado e ator |
| `UpdateRolloutCreated/Validated/Scheduled` | `UpdateRollout` | Fleet, Operations | versões, policy, ondas, gates e aprovação |
| `UpdateWaveStarted/Paused/Resumed/Passed` | `UpdateRollout` | Update workers, Health, Fleet | wave, snapshot, baseline, motivo e avaliação |
| `UpdateApplicationRequested/Acknowledged/Applied/Failed` | `EdgeInstallation` | UpdateRollout, Health, Inventory | componente, origem/destino, tentativa, timestamps e resultado |
| `UpdateObservationPassed` | `EdgeInstallation` | UpdateRollout | janela, Current/Observed State, Health e policy |
| `UpdateRollbackStarted/UpdateRolledBack/UpdateRollbackFailed` | `EdgeInstallation` e `UpdateRollout` conforme escopo | Health, Inventory, Operations | versão falha, baseline, componentes, resultado e diagnóstico |
| `UpdateRolloutCompleted/Cancelled/Failed/RolledBack` | `UpdateRollout` | Fleet, Operations | resultado por onda/membro, cobertura, falhas e estado final |

Evento `UpdateApplied` não compensa `UpdateFailed`; ele registra resultado distinto. Rollback é a compensação operacional explícita.

## Fleet e Inventory

| Eventos | Produtor | Consumidores | Payload conceitual / ordering / compensação |
| --- | --- | --- | --- |
| `FleetCreated`, `FleetMembershipChanged` | `Fleet` | Inventory, Update | critério, revisão, membros incluídos/removidos |
| `FleetSnapshotFrozen` | `Fleet` | Update, Remote Operations | membership revision, membros e instante |
| `FleetOperationRequested` | `Fleet` | owners individuais, Audit | snapshot, policy, tipo e Commands gerados |
| `NetworkInventoryProjected` | Inventory projection | Operations | posição da projeção, fontes e cobertura; não é fato proprietário |

## Versionamento e consumidores

Consumidor que não entende versão não pode presumir compatibilidade. Campos críticos removidos, significado alterado ou unidade alterada exigem nova versão de evento e período explícito de coexistência.

Eventos publicados fora de TV Network devem expor apenas fatos operacionais mínimos. A definição do contrato canônico de `OperationalAvailabilityChanged` para contextos consumidores permanece `OPEN`; até sua aprovação, nenhum consumidor deve inferir disponibilidade comercial diretamente de um único Heartbeat.

## Exemplos

**Válido:** `TvSuspended` é seguido dias depois por `TvReactivated`; ambos permanecem no histórico.

**Válido:** o mesmo `HeartbeatReceived` é entregue duas vezes; consumidor processa uma vez por `eventId`.

**Contraexemplo:** republicar um evento antigo com novo `eventId` para implementar retry. Isso cria um fato duplicado.

**Contraexemplo:** consumidor altera TV diretamente ao receber `FleetOperationRequested`. O evento comunica intenção coordenada; cada TV muda apenas por seu Command.
