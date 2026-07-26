# TV Network Events

Todos os eventos são fatos imutáveis, versionados, correlacionáveis e idempotentes para consumo. Ordering é por Aggregate (TV, Device, Edge, Capability, HealthRecord, Update ou Fleet); retries não recriam histórico.

| Evento | Produtor | Consumidores | Significado |
| --- | --- | --- | --- |
| `TvRegistered/Provisioned/Activated/Suspended/Decommissioned` | TV | Inventory, Fleet, Notifications | Ciclo de vida da TV. |
| `DeviceRegistered/BoundToTV/Replaced/Unbound` | Device Registry | Inventory, Installation | Identidade e vínculo de equipamento. |
| `InstallationVerified/Accepted/Failed` | Installation | Provisioning, Fleet | Resultado de instalação física. |
| `EdgeInstalled/Degraded/Recovered/Failed` | EdgeInstallation | Health, Fleet, Notifications | Estado operacional do runtime. |
| `CapabilityDeclared/Activated/Degraded/Retired` | TVCapability | Inventory, Edge Runtime | Capacidade declarada e disponibilidade. |
| `HeartbeatReceived/Missed` | Heartbeat | Health, Reconciler | Liveness e lacuna operacional. |
| `CurrentStateReported/ObservedStateDerived/StateReconciliationCompleted` | Edge / Cloud | Reconciler, Health | Estados e convergência. |
| `HealthObserved/HealthScoreChanged/DiagnosisCreated` | Health Monitoring | Fleet, Notifications | Observação e diagnóstico append-only. |
| `MaintenanceWindowOpened/Closed` | Maintenance | Update, Remote Operations | Janela operacional. |
| `UpdateScheduled/UpdateWaveStarted/UpdateWavePaused/UpdateApplied/UpdateFailed/UpdateRolledBack` | Update Management | Fleet, Health, Notifications | Lifecycle de atualização. |
| `FleetCreated/FleetMembershipChanged/FleetHealthChanged` | Fleet Management | Update, Analytics | Grupo e saúde agregada. |
