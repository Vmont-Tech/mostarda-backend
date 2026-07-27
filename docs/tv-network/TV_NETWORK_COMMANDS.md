# TV Network Commands

## Contrato universal

Command expressa intenção e possui exatamente um Aggregate owner. Ele pode ser aceito ou rejeitado; nunca é fato.

Todo Command contém:

- `commandId`, `commandType` e versão;
- owner/target exato;
- `idempotencyKey`;
- revisão esperada do Aggregate;
- emissor, principal e autorização;
- motivo;
- `issuedAt`, TTL quando temporal e clock source;
- correlação e causation;
- política aplicável;
- payload conceitual.

Todo resultado registra `ACCEPTED`, `REJECTED`, `DUPLICATE`, `CONFLICT` ou `EXPIRED`, com razão. Mesma idempotency key e mesmo conteúdo retorna o resultado anterior; mesma chave com conteúdo diferente é conflito.

Commands remotos exigem identidade confiável e TTL. Command atrasado ou fora de ordem não contorna revisão esperada. Retry cria nova tentativa correlacionada apenas quando o efeito anterior não foi confirmado e a política permite.

## TV

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `RegisterTV` | `TV` / operador de cadastro | identidade nova, Venue/proprietário referenciáveis | cria `REGISTERED`; `TvRegistered` |
| `StartTVInstallation` | `TV` / workflow de Installation | TV `REGISTERED`; Installation válida | muda para `INSTALLING`; `TvInstallationStarted` |
| `MarkTVInstalled` | `TV` / consumidor de `InstallationAccepted` | instalação aceita e vinculada à TV | muda para `INSTALLED`; `TvInstalled` |
| `StartTVProvisioning` | `TV` / Provisioning | TV `INSTALLED`; Device e Edge alvo identificados | muda para `PROVISIONING`; `TvProvisioningStarted` |
| `ActivateTV` | `TV` / Provisioning ou operação | gates de instalação, identidade, Current, Capability e Health aprovados | muda para `ACTIVE`; `TvActivated` |
| `SuspendTV` | `TV` / operação, segurança ou Health policy | TV não final; motivo obrigatório | muda para `SUSPENDED`; `TvSuspended` |
| `ReactivateTV` | `TV` / operação | TV `SUSPENDED`; todos os gates reavaliados | muda para `ACTIVE`; `TvReactivated` |
| `EnterTVMaintenance` | `TV` / Maintenance workflow | janela aberta aplicável | preserva estado anterior e muda para `MAINTENANCE`; `TvEnteredMaintenance` |
| `ExitTVMaintenance` | `TV` / Maintenance workflow | janela encerrada e estado observado | vai para `ACTIVE` ou `SUSPENDED`; `TvExitedMaintenance` |
| `UpdateTVLocation` | `TV` / operador autorizado | nova referência válida; revisão esperada | acrescenta revisão; `TvLocationChanged` |
| `ChangeTVOwner` | `TV` / processo autorizado de transferência | origem/destino e vigência válidos | acrescenta revisão; `TvOwnerChanged` |
| `DecommissionTV` | `TV` / operador de frota autorizado | motivo, impacto e revogações planejadas | estado final; `TvDecommissioned` |

## Device Registry

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `RegisterDevice` | `DeviceRegistry` / operador ou Installation | identidade não reutilizada; atributos com origem | registra Device; `DeviceRegistered` |
| `BindDeviceToTV` | `DeviceRegistry` / Installation | TV ativa no contexto, tipo compatível e período sem sobreposição | abre vínculo; `DeviceBoundToTV` |
| `UnbindDeviceFromTV` | `DeviceRegistry` / manutenção | vínculo ativo existente | fecha vínculo; `DeviceUnbound` |
| `ReplaceDevice` | `DeviceRegistry` / manutenção | Device antigo vinculado; substituto registrado/compatível | fecha e abre vínculos preservando ambos; `DeviceReplaced` |
| `QuarantineDevice` | `DeviceRegistry` / segurança/Health policy | conflito ou risco identificado | estado `QUARANTINED`; `DeviceQuarantined` |
| `ReleaseDeviceFromQuarantine` | `DeviceRegistry` / autoridade de segurança | nova observação confiável e motivo | restaura estado compatível; `DeviceReleasedFromQuarantine` |
| `DecommissionDevice` | `DeviceRegistry` / operação | vínculos ativos tratados | estado final; `DeviceDecommissioned` |

## Installation e Provisioning

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `PlanInstallation` | `Installation` / operação | TV registrada, escopo/local/responsável definidos | cria `PLANNED`; `InstallationPlanned` |
| `StartInstallation` | `Installation` / técnico autorizado | plano vigente e identidade do técnico | `IN_PROGRESS`; `InstallationStarted` |
| `RecordInstallationCheck` | `Installation` / técnico | instalação em progresso; item do checklist conhecido | acrescenta resultado; `InstallationCheckRecorded` |
| `VerifyInstallation` | `Installation` / técnico habilitado | checklist completo e sinais exigidos presentes | `VERIFIED` ou `FAILED`; `InstallationVerified/Failed` |
| `AcceptInstallation` | `Installation` / operador independente autorizado | `VERIFIED`; sem bloqueios abertos | `ACCEPTED`; `InstallationAccepted` |
| `CancelInstallation` | `Installation` / operação | ainda não aceita; motivo | `CANCELLED`; `InstallationCancelled` |
| `CreateEdgeInstallation` | `EdgeInstallation` / Provisioning | TV instalada, MiniPC vinculado e identidade de instalação inédita | `UNINSTALLED`; `EdgeInstallationCreated` |
| `StartEdgeProvisioning` | `EdgeInstallation` / Provisioning | TV `INSTALLED`, MiniPC vinculado e não quarentenado | `INSTALLING`; `EdgeProvisioningStarted` |
| `RegisterEdgeIdentity` | `EdgeInstallation` / Provisioning | identidade inédita e vinculada ao Device | registra identidade; `EdgeIdentityRegistered` |
| `CompleteEdgeProvisioning` | `EdgeInstallation` / Provisioning | primeiro Current/Heartbeat aceito, versões e Capability validadas | estado conforme Health; `EdgeProvisioned` |
| `FailEdgeProvisioning` | `EdgeInstallation` / Provisioning | falha explicada | `FAILED`; `EdgeProvisioningFailed` |

## Capability

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `DeclareCapability` | `TVCapability` / Edge ou operador | manifesto íntegro e nova revisão | `DECLARED`; `CapabilityDeclared` |
| `ValidateCapability` | `TVCapability` / validador autorizado | compatibilidade, dependências e origem avaliáveis | `VALIDATED` ou `REJECTED`; evento correspondente |
| `ActivateCapability` | `TVCapability` / operação | `VALIDATED` e Health aplicável | `ACTIVE`; `CapabilityActivated` |
| `DegradeCapability` | `TVCapability` / Health policy | condição observada e explicada | `DEGRADED`; `CapabilityDegraded` |
| `SuspendCapability` | `TVCapability` / operação/segurança | risco ou incompatibilidade | `SUSPENDED`; `CapabilitySuspended` |
| `RecoverCapability` | `TVCapability` / operação/Health policy | nova validação e observação | `ACTIVE`; `CapabilityRecovered` |
| `RetireCapability` | `TVCapability` / owner técnico autorizado | motivo e dependências avaliadas | `RETIRED`; `CapabilityRetired` |

## State, Heartbeat, Health e segurança

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `PublishDesiredState` | `EdgeInstallation` / operação ou workflow autorizado | revisão monotônica, target, TTL/política e compatibilidade | registra intenção; `DesiredStatePublished` |
| `ReportCurrentState` | `EdgeInstallation` / Edge autenticado | sessão e sequência válidas | acrescenta declaração; `CurrentStateReported` |
| `RequestStateReconciliation` | `EdgeInstallation` / Reconciler ou operação | revisões comparáveis ou razão para `UNKNOWN` | registra solicitação; `StateReconciliationRequested` |
| `RecordHeartbeat` | `EdgeInstallation` / Edge autenticado | envelope válido; idempotência por instalação+sessão+sequência | registra/ignora/rejeita; eventos de Heartbeat |
| `RecordHealthObservation` | `HealthRecord` / monitor autorizado | origem e subject conhecidos | cria fato imutável; `HealthObservationRecorded` |
| `AssessOperationalHealth` | `HealthRecord` / Health Monitoring | policy version e cobertura explícitas | cria HealthRecord; `HealthRecordCreated` |
| `CreateDiagnosis` | `HealthRecord` / Health Monitoring ou operador | sinais correlacionáveis | cria diagnóstico; `DiagnosisCreated` |
| `QuarantineEdge` | `EdgeInstallation` / segurança/Health policy | condição prevista e motivo | `QUARANTINED`; `EdgeQuarantined` |
| `ReleaseEdgeFromQuarantine` | `EdgeInstallation` / segurança autorizada | risco resolvido e nova observação | estado compatível; `EdgeReleasedFromQuarantine` |

`ObservedState` é derivado e não possui Command de escrita.

## Remote Operations e manutenção

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `RequestRemoteDiagnosis` | `EdgeInstallation` / operação | target confiável, TTL e escopo mínimo | cria operação; `RemoteDiagnosisRequested` |
| `RestartProcess` | `EdgeInstallation` / Supervisor ou operação | Restart Policy permite; orçamento não esgotado | tenta reinício; `ProcessRestartRequested` |
| `ScheduleMaintenanceWindow` | `MaintenanceWindow` / operador | escopo/período e conflitos avaliados | `SCHEDULED`; `MaintenanceWindowScheduled` |
| `OpenMaintenanceWindow` | `MaintenanceWindow` / relógio confiável ou operador | janela vigente; revisão correta | `OPEN`; `MaintenanceWindowOpened` |
| `CloseMaintenanceWindow` | `MaintenanceWindow` / operador/workflow | janela aberta; resultados registrados | `CLOSED`; `MaintenanceWindowClosed` |
| `CancelMaintenanceWindow` | `MaintenanceWindow` / operador | ainda não aberta | `CANCELLED`; `MaintenanceWindowCancelled` |

## Update e rollback

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `CreateUpdateRollout` | `UpdateRollout` / operador de frota | versão, política e rollback definidos | `DRAFT`; `UpdateRolloutCreated` |
| `ValidateUpdateRollout` | `UpdateRollout` / aprovador autorizado | compatibilidade, ondas e gates completos | `VALIDATED` ou rejeição |
| `ScheduleUpdate` | `UpdateRollout` / operador | rollout validado e janelas existentes | `SCHEDULED`; `UpdateScheduled` |
| `StartUpdateWave` | `UpdateRollout` / workflow | onda anterior/gates aprovados; snapshot congelado | `WAVE_RUNNING`; `UpdateWaveStarted` |
| `PauseUpdateWave` | `UpdateRollout` / política ou operador | onda ativa | `PAUSED`; `UpdateWavePaused` |
| `ResumeUpdateWave` | `UpdateRollout` / operador/política | causa resolvida e gates refeitos | `WAVE_RUNNING`; `UpdateWaveResumed` |
| `CancelUpdateRollout` | `UpdateRollout` / operador autorizado | antes da execução ou rollout pausado | `CANCELLED`; `UpdateRolloutCancelled` |
| `CompleteUpdateRollout` | `UpdateRollout` / workflow | todas as ondas passaram observação | `COMPLETED`; `UpdateRolloutCompleted` |
| `ApplyUpdate` | `EdgeInstallation` / Update Management | target, versão, janela, Health e identidade válidos | tenta aplicar; eventos de aplicação |
| `RollbackUpdate` | `EdgeInstallation` / Rollback policy ou operador | baseline elegível e autorização | tenta restaurar; eventos de rollback |

## Fleet

| Command | Owner / emissor autorizado | Pré-condições e invariantes | Efeito / eventos |
| --- | --- | --- | --- |
| `CreateFleet` | `Fleet` / operador | identidade e critério definidos | cria revisão; `FleetCreated` |
| `ChangeFleetMembership` | `Fleet` / operador/workflow | critério ou membros explicados | nova revisão; `FleetMembershipChanged` |
| `FreezeFleetSnapshot` | `Fleet` / rollout/operação | revisão conhecida | cria snapshot imutável; `FleetSnapshotFrozen` |
| `RequestFleetOperation` | `Fleet` / operador | snapshot, política e escopo explícitos | emite Commands individuais; `FleetOperationRequested` |

Fleet nunca modifica seus membros diretamente.

## Autorização e auditoria

Papéis exatos e segregação de funções são `OPEN`. Até aprovação:

- autodeclaração do Edge não autoriza ativação, update ou saída de quarentena;
- quem executa Installation não pode presumir o aceite;
- operação em Fleet exige snapshot e resultado individual;
- ação de segurança, decommission, transferência de owner e rollback manual exigem motivo explícito;
- decisão automatizada deve citar política e versão.

Todo evento resultante preserva Command, ator, política, revisão anterior/nova, timestamps, motivo e correlação.

## Exemplos

**Válido:** `ActivateTV` é rejeitado porque Health está `UNKNOWN`; a rejeição é auditada sem alterar a TV.

**Válido:** retry de `ApplyUpdate` usa mesma idempotency key e retorna a tentativa existente.

**Contraexemplo:** `RequestFleetOperation` muda diretamente todas as TVs. Ele deve emitir Commands individuais aos owners.

**Contraexemplo:** enviar `PublishDesiredState` com conteúdo de Campaign. Isso viola a fronteira e deve ser rejeitado.
