# Network Inventory

## Natureza

Network Inventory é projeção operacional derivada e reconstruível. Não é Aggregate, não aceita Commands de mutação e não é fonte proprietária para TV, Device, EdgeInstallation, Capability, Health ou Fleet.

## Conteúdo conceitual

Para cada TV, a projeção pode apresentar:

- `TVIdentifier`, lifecycle e revisão;
- Venue, owner e localização referenciados, com vigência;
- Display, MiniPC, periféricos e vínculos atuais/históricos;
- EdgeInstallation ativa e situação de confiança/quarentena;
- Desired/Current/Observed State e respectivas revisões;
- Connectivity e posição de sincronização;
- Capability revisions e disponibilidade;
- versões Edge, Player, Canvas, Capability Manifest, OS e Firmware;
- HealthRecord vigente, confiança, cobertura e instante;
- Maintenance Window aplicável;
- rollout/update/rollback em curso;
- Fleet memberships e revisões;
- momento da projeção, posição das fontes e staleness.

Nunca inclui anúncio, Campaign, Slot, preço, Evidence, Settlement ou informação financeira.

## Origem e precedência

Campos mantêm referência ao Event proprietário. Quando fontes divergem:

- identidade/vínculo segue DeviceRegistry;
- lifecycle segue TV;
- versão declarada segue Current State, mas sua confiança é confrontada com Observed State;
- Health segue HealthRecord/projeção oficial;
- Fleet membership segue revisão do Fleet;
- dado ausente fica `UNKNOWN`; não é preenchido por suposição.

Precedência não apaga a fonte divergente; gera diagnóstico quando relevante.

## Ordering, duplicidade e replay

Cada stream é aplicado por Aggregate/revisão. Evento duplicado não altera a projeção. Evento atrasado pode completar histórico, mas não regride o “current” sem regra causal.

Se houver gap de revisão, o item fica marcado como incompleto/stale até reconstrução. Replay integral deve produzir projeção logicamente equivalente sob a mesma versão de regra.

## Freshness e clock

Toda visão informa `observedAt`, `projectedAt`, staleness e confiança. Timestamp do Edge não substitui instante de recebimento; clock drift é exibido como condição operacional.

Janelas de freshness são `OPEN`. Até aprovação, ausência de dado recente não pode ser mostrada como disponibilidade.

## Consulta e uso

Inventory pode sustentar diagnóstico, planejamento de frota, manutenção e seleção operacional. Consumidor externo não deve tratá-lo como autorização para mudar Aggregate nem como elegibilidade comercial.

O contrato publicado de `OperationalAvailabilityChanged`, destinado a outros contextos sem vazar detalhes internos, permanece `OPEN`.

## Auditoria

Cada item pode ser explicado por Events fonte, versão da projeção e políticas derivadas. Correção ocorre por novo Event ou rebuild, nunca alteração do fato de origem.

## Exemplos

**Válido:** Current State reporta Player versão B, Observed State ainda vê A. Inventory apresenta divergência e confiança reduzida.

**Válido:** evento antigo de vínculo chega tarde e completa a timeline sem trocar o Device atual.

**Contraexemplo:** operador edita diretamente o Health mostrado no Inventory. Deve haver nova observação/avaliação no owner.

**Contraexemplo:** Campaign consome Heartbeat bruto e presume TV elegível. A fronteira exige fato operacional publicado e decisão no contexto consumidor.
