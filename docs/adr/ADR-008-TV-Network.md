# ADR-008 — TV Network

- **Status:** Aceito
- **Data:** 2026-07-26

## Decisão

TV Network é o Bounded Context proprietário da frota física e disponibilidade operacional: identidade de TV/dispositivos, instalação, provisionamento, Edge Runtime operacional, Capability Registry, Health, Heartbeat, Desired/Current/Observed State, manutenção, atualização, rollback e Fleet.

Ele não conhece Campaign, anúncios, Pricing, Financial Platform, Evidence ou Settlement. O Reconciler não altera Aggregates; compara estados e emite Commands válidos. Histórico de saúde, rollout, rollback e dispositivo é append-only; atualizações exigem política e nunca são forçadas fora dela.

## Consequências

- A operação da frota evolui sem carregar regras comerciais ou financeiras.
- Substituições e rollbacks são auditáveis e preservam histórico.
- Edge Runtime operacional e execução de domínio mantêm fronteiras explícitas.
