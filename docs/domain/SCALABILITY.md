# Arquitetura de Escalabilidade

Escala não muda os contratos de domínio: Edge continua leve, Evidence é append-only, preço é congelado, Settlement exige Evidence `VALID` ancorada e Quantum recebe somente hashes.

| Escala | Evolução operacional sem alterar o modelo |
| ---: | --- |
| 100 TVs | Serviços Cloud iniciais, filas duráveis, observabilidade por dispositivo, ciclos financeiros auditáveis. |
| 1.000 TVs | Particionamento por TV/Venue, workers idempotentes, CDN/cache de Creative Assets, filas separadas para playback/evidence/telemetria. |
| 10.000 TVs | Event bus particionado por chave de ordenação, ingestão em lote de telemetria, autoscaling de validadores, outbox/inbox e snapshots do ledger. |
| 100.000 TVs | Células regionais, quotas por tenant, controle de backpressure, armazenamento de séries temporais, planos de desastre e atualização em ondas. |
| 1.000.000 TVs | Control plane global e data planes regionais isolados, roteamento por célula, multi-região ativo/contingência, agregação hierárquica, SLOs e testes de capacidade contínuos. |

Chaves de partição preservam ordem necessária: `TVIdentifier` para fila/heartbeat, `SlotIdentifier` para Evidence, `SettlementCycle + EvidenceId` para financeiro e `hash` para Quantum. Consumidores são idempotentes; reprocessamento nunca sobrescreve livros append-only. A expansão regional replica configuração versionada e não introduz acesso direto entre Bounded Contexts.
