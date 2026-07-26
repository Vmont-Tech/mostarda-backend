# TV Network — Arquitetura da Frota

TV Network é o Bounded Context proprietário da infraestrutura física Mostarda: TVs, displays, mini PCs, Edge Runtime, inventário, instalação, capacidade, saúde, conectividade, manutenção e ciclo de vida. Sua responsabilidade termina na disponibilidade operacional verificável.

Ele nunca conhece Campaign, anúncio, preço, Financeiro, Evidence ou Settlement. Recebe somente intenções operacionais compatíveis e publica fatos de infraestrutura. Não interpreta conteúdo ou consequência comercial.

```text
TV / Device Registry → Provisioning → Capability Registry → Edge Runtime
→ Heartbeat / Health / State → Fleet Management → Maintenance / Update / Rollback
```

Aggregates proprietários: `TV`, `DeviceRegistry`, `TVCapability`, `EdgeInstallation`, `HealthRecord`, `MaintenanceWindow`, `UpdateRollout`, `Fleet`, `Installation` e `NetworkInventory`. Todo histórico é append-only; comandos alteram somente o Aggregate owner e o reconciliador apenas emite comandos válidos.
