# TV Network Commands

| Command | Aggregate owner | Emissor | Pré-condições, efeito e auditoria |
| --- | --- | --- | --- |
| `RegisterTV` / `UpdateTVLocation` / `SuspendTV` / `DecommissionTV` | TV | operador autorizado | Identidade/revisão válidas; emite lifecycle event; motivo obrigatório. |
| `RegisterDevice` / `BindDeviceToTV` / `ReplaceDevice` | DeviceRegistry | operador/instalação | Serial inédito e vínculo compatível; preserva substituído. |
| `VerifyInstallation` / `AcceptInstallation` | Installation | técnico/operador | Checklist e sinais físicos válidos; resultado auditado. |
| `ProvisionEdge` / `RegisterEdgeIdentity` | EdgeInstallation | Provisioning | TV instalada; identidade e versões registradas. |
| `DeclareCapability` / `ActivateCapability` / `RetireCapability` | TVCapability | Edge/operador | Manifesto, compatibilidade e health válidos. |
| `PublishDesiredState` / `ReconcileTVState` | TV/EdgeInstallation | Reconciler | Revisão válida; somente comando, nunca mutação direta. |
| `RecordHeartbeat` / `RecordHealthObservation` | HealthRecord | Edge/Health Monitoring | Evento autenticado; acrescenta fato, nunca sobrescreve. |
| `ScheduleUpdate` / `StartUpdateWave` / `PauseUpdateWave` | UpdateRollout | operador de frota | Política, janela, grupo e versão aprovados. |
| `ApplyUpdate` / `RollbackUpdate` | EdgeInstallation | Update Management | Componente assinado, janela/health gate e política. |
| `OpenMaintenanceWindow` / `CloseMaintenanceWindow` | MaintenanceWindow | operador | Escopo e período autorizados; rastreáveis. |
| `CreateFleet` / `ChangeFleetMembership` | Fleet | operador de frota | Critério/membros versionados; não muda TVs diretamente. |
