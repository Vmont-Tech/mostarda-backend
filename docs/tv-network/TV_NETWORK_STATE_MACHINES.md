# TV Network State Machines

| Aggregate | Estados e transições válidas | Finais/proibidos | Recuperação |
| --- | --- | --- | --- |
| TV | `REGISTERED → PROVISIONING → INSTALLED → ACTIVE ↔ SUSPENDED`; `ACTIVE/SUSPENDED → MAINTENANCE → ACTIVE/SUSPENDED`; qualquer não final → `DECOMMISSIONED`. | `DECOMMISSIONED` final; proibido ativar sem instalação, Edge, capability e health. | Suspensão/reprovisionamento por nova revisão; nunca reutiliza identidade. |
| Installation | `PLANNED → IN_PROGRESS → VERIFIED → ACCEPTED`; `PLANNED/IN_PROGRESS → FAILED/CANCELLED`. | `ACCEPTED`, `FAILED`, `CANCELLED` finais. | Nova instalação referencia a anterior. |
| EdgeInstallation | `UNINSTALLED → INSTALLING → HEALTHY`; pode ir a `DEGRADED`, `UPDATING`, `ROLLING_BACK`, `FAILED`. `ROLLING_BACK → HEALTHY/DEGRADED/FAILED`; `FAILED → INSTALLING`. | Proibido update sem política/janela. | Supervisor, watchdog e rollback produzem fatos novos. |
| TVCapability | `DECLARED → VALIDATED → ACTIVE`; `ACTIVE → DEGRADED/SUSPENDED/RETIRED`; `DEGRADED → ACTIVE/RETIRED`. | `RETIRED` final; proibida ativação sem manifesto/health. | Nova versão declara nova revisão. |
| HealthRecord | `UNKNOWN → HEALTHY/DEGRADED/CRITICAL`; qualquer estado pode ir a `UNKNOWN` por ausência de observação. | Sem final enquanto ativo; proibido sobrescrever observação. | Nova observação/diagnóstico, não correção histórica. |
| UpdateRollout | `DRAFT → SCHEDULED → WAVE_RUNNING → COMPLETED`; `WAVE_RUNNING → PAUSED/ROLLING_BACK`; `PAUSED → WAVE_RUNNING/CANCELLED`; `ROLLING_BACK → COMPLETED/PAUSED`. | `COMPLETED`, `CANCELLED` finais. | Ondas falhas podem pausar ou rollback por política. |
| MaintenanceWindow | `SCHEDULED → OPEN → CLOSED`; `SCHEDULED → CANCELLED`. | `CLOSED`, `CANCELLED` finais. | Nova janela não reabre janela fechada. |
