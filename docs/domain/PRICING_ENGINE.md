# Pricing Engine

Pricing Engine é o Bounded Context que calcula e congela o `PricingQuote` antes da alocação do Slot. É o cérebro de preço, não de cobrança ou split; Edge recebe apenas o resultado imutável.

## Cálculo explicável

O preço parte de CPM/base e aplica somente insumos permitidos e versionados: oferta de inventário, demanda, ROI/performance histórica, horário, perfil e categoria do Venue, região/distância, telemetria com `ConfidenceScore` suficiente, ocupação, sazonalidade e limites floor/ceiling. IA pode recomendar fatores, mas a `PricingPolicy` determinística decide e registra o resultado.

`PricingPolicy` é Aggregate: `PricingRules`, `DemandCurve`, `PeakHours`, `MarketRegion`, perfil/categoria, regras de distância, limites e `PricingPolicyVersion`. `PricingQuote` contém valor calculado/final, insumos normalizados, fatores aplicados, instante, algoritmo e política. Após `PriceApplied`, é imutável e acompanha Slot, PlaybackEvent e EvidenceRecord.

Eventos: `PriceQuoted`, `PriceApplied`, `PriceOverridden`, `PricingInputRejected`, `DemandIndexUpdated`, `PricingAuditRecorded`. Override só é possível por política autorizada, com ator, motivo, regra e versão; nunca reescreve quote já aplicado a playback.
