# CAPABILITIES — Mostarda

Toda **TV** é tratada como um **Container de Capabilities**. Uma Capability é uma competência declarada — aquilo que aquela TV é capaz de executar. Duas TVs podem ter conjuntos diferentes de Capabilities (por exemplo, uma TV sem câmera declara o collector correspondente como `UNAVAILABLE`).

As fronteiras de Telemetry deste catálogo são regidas por `DEC-063`: Edge mantém a coleta física e publica observações; Telemetry Context possui exclusivamente accepted observations, Telemetry Ledger e `AudienceProjection`. Heartbeat e Device Health permanecem sob autoridade de TV Network.

## Regras

1. Capability é **declarada** no provisionamento e versionada; o Backend só envia trabalho compatível com as Capabilities declaradas.
2. Capability **não** contém regra de negócio quando roda no Edge (ADR-002).
3. `TVCapability` é Aggregate próprio: `CapabilityId`, estado, versão, owner, health, Facets, Assets, Services, Policies e Events. Toda Capability é composta por **Facets** (ver [`FACETS.md`](./FACETS.md)); cada Facet expõe Assets de conhecimento/estado, Services, Policies e Events (ver [`ASSETS.md`](./ASSETS.md)).
4. Eventos citados abaixo são os oficiais de [`DOMAIN_EVENTS.md`](./DOMAIN_EVENTS.md).

---

## Playback

- **Objetivo:** reproduzir o conteúdo alocado à TV.
- **Responsabilidades:** consumir a fila local de Slots, decodificar e exibir o Asset, aplicar overlays, preservar a janela fixa de 15s e o último frame de Creative menor, recuperar-se de falhas.
- **Dependências:** Campaign (fila), Canvas, Scheduling, Security (verificação de integridade do Asset).
- **Gera:** `PlaybackStarted`, `PlaybackFinished`, `PlaybackInterrupted`, `PlaybackRecovered`, `PlaybackFailed`, `PlaybackQueueExhausted`.
- **Consome:** `SlotAllocated`, `PlaybackQueueUpdated`, `AssetCached`, `MaintenanceWindowOpened`.

## Campaign

- **Objetivo:** representar, no dispositivo, a intenção comercial vigente.
- **Responsabilidades:** manter a fila de Slots recebida, respeitar prioridade e frequência, reportar entrega, descartar Slots expirados.
- **Dependências:** Playback, Scheduling, Evidence.
- **Gera:** `SlotAccepted`, `SlotRejected`, `SlotExpiredLocally`, `CampaignDeliveryReported`.
- **Consome:** `CampaignScheduled`, `CampaignPaused`, `CampaignResumed`, `CampaignCompleted`, `SlotAllocated`, `SlotRevoked`.

## Telemetry

- **Objetivo:** coletar no Edge sinais autorizados do ambiente e do equipamento para validação pelo Telemetry Context.
- **Responsabilidades:** produzir fatos locais assinados, fechar buckets civis imutáveis de um minuto e preservar capability, cobertura, confiança, policy, sequência e integridade; nunca aceitar observações, manter o Ledger, produzir AudienceProjection ou inferir valor financeiro.
- **Dependências:** sensores/câmera do mundo físico e Security (autenticidade, confidencialidade e anonimização).
- **Gera:** `TelemetryCaptured`, `TelemetryBucketClosed`, `EdgeTelemetryCapabilityChanged`, `EdgeTelemetryIncidentReported`.
- **Consome:** políticas de coleta versionadas publicadas pelo Telemetry Context; não consome Heartbeat como dado de audiência.

## Playback Reporting

- **Objetivo:** produzir fatos locais de execução; Evidence é exclusivamente do Cloud.
- **Responsabilidades:** ao concluir o Creative e preservar sua janela de 15s, montar `PlaybackEvent` com duração real, período do frame final, checksums e métricas, assinar com a chave local, enfileirar offline e ressincronizar.
- **Dependências:** Playback, Security (chave), Pricing (quote congelado recebido do Backend).
- **Gera:** `PlaybackEventSigned`, `PlaybackEventQueued`, `PlaybackEventSubmitted`.
- **Consome:** `PlaybackFinished`.

## Pricing

- **Objetivo:** transportar e exibir o preço já decidido pelo **Pricing Engine**.
- **Responsabilidades:** guardar imutavelmente o `valor cobrado` associado ao Slot e anexá-lo à Evidence. **Nunca calcula preço no Edge.**
- **Dependências:** Campaign, Playback Reporting.
- **Gera:** nenhum evento de precificação (somente referência no Playback Event).
- **Consome:** `PriceQuoted`, `PriceApplied`, `PriceOverridden`.

## QR

- **Objetivo:** apresentar o código que leva à **QR Interaction**.
- **Responsabilidades:** renderizar o QR fornecido pelo Backend; o alvo do QR resolve para o **Quantum Registry**, nunca para o Edge.
- **Dependências:** Playback, Overlay, Campaign.
- **Gera:** `QrRendered`, `QrRenderFailed`.
- **Consome:** `QrCodeIssued`, `QrCodeRevoked`.

## NFC

- **Objetivo:** suportar a presença física da tag associada ao ponto.
- **Responsabilidades:** apenas informar o vínculo tag↔TV e o estado da mídia física. Toda leitura NFC é resolvida pela **Quantum Integration**; o Edge não responde a NFC.
- **Dependências:** Security, TV Network.
- **Gera:** `NfcTagLinked`, `NfcTagMissing`.
- **Consome:** `NfcInteractionRegistered`.

## Heartbeat

- **Objetivo:** declarar que a TV está viva e saudável.
- **Responsabilidades:** emitir sinal periódico curto com versão de software e resumo de saúde.
- **Dependências:** Health Monitoring, Security (canal TLS mútuo).
- **Gera:** `HeartbeatEmitted`.
- **Consome:** `HeartbeatIntervalUpdated`.

## Maintenance

- **Objetivo:** manter o dispositivo atualizável e recuperável remotamente.
- **Responsabilidades:** aplicar atualização assinada, health check pós-update, rollback automático, respeitar janela de operação do Venue.
- **Dependências:** Security, Health Monitoring, Heartbeat.
- **Gera:** `MaintenanceWindowOpened`, `MaintenanceWindowClosed`, `UpdateApplied`, `UpdateRolledBack`, `UpdateFailed`.
- **Consome:** `UpdateScheduled`, `TvSuspended`, `TvReactivated`.

## AI

- **Objetivo:** executar inferência leve local quando aplicável (ex.: contagem anônima de presença).
- **Responsabilidades:** rodar modelos homologados, produzir apenas métricas agregadas e anônimas, entregar confiança da medição. Nunca decide negócio.
- **Dependências:** Telemetry, Security, Health Monitoring.
- **Gera:** `EdgeInferenceCompleted`, `EdgeInferenceDegraded`.
- **Consome:** `EdgeModelPublished`, `EdgeModelRevoked`.

## Streaming

- **Objetivo:** exibir conteúdo em fluxo contínuo (canais, live).
- **Responsabilidades:** manter sessão de stream, tratar buffer e degradação de banda, ceder prioridade a Slots comerciais.
- **Dependências:** Playback, Health Monitoring.
- **Gera:** `StreamStarted`, `StreamStalled`, `StreamRecovered`, `StreamEnded`.
- **Consome:** `StreamSourceAssigned`, `StreamSourceRevoked`.

## Overlay

- **Objetivo:** compor camadas sobre o conteúdo principal.
- **Responsabilidades:** renderizar QR, legendas, faixas informativas e elementos de marca, respeitando as regras do Canvas.
- **Dependências:** Playback, QR, Canvas.
- **Gera:** `OverlayApplied`, `OverlayRemoved`, `OverlayRenderFailed`.
- **Consome:** `OverlayTemplatePublished`, `QrCodeIssued`.

## Scheduling

- **Objetivo:** ordenar no tempo o que a TV faz.
- **Responsabilidades:** respeitar horário de operação do Venue, janelas de manutenção, prioridade e frequência dos Slots, e a grade de conteúdo de preenchimento.
- **Dependências:** Campaign, Playback, Maintenance.
- **Gera:** `ScheduleApplied`, `ScheduleConflictDetected`, `ScheduleDrifted`.
- **Consome:** `PlaybackQueueUpdated`, `VenueOperatingHoursUpdated`, `MaintenanceWindowOpened`.

## Health Monitoring

- **Objetivo:** conhecer o estado de saúde do hardware e do software.
- **Responsabilidades:** monitorar CPU, temperatura, memória, armazenamento, sinal HDMI, estado da tela, rede; classificar severidade.
- **Dependências:** Telemetry, Heartbeat.
- **Gera:** `DeviceHealthReported`, `DeviceDegraded`, `DeviceRecovered`, `HdmiSignalLost`, `StorageThresholdReached`.
- **Consome:** `HealthPolicyUpdated`.

## Security

- **Objetivo:** garantir integridade, autenticidade e confidencialidade no dispositivo.
- **Responsabilidades:** custodiar a chave privada, assinar eventos, validar assinatura de software e de Assets, manter TLS mútuo, impedir porta administrativa local, aplicar anonimização de dados sensoriais.
- **Dependências:** nenhuma interna (é base das demais).
- **Gera:** `DeviceKeyProvisioned`, `DeviceKeyRotated`, `SignatureVerificationFailed`, `TamperSuspected`, `SecurityPolicyApplied`.
- **Consome:** `DeviceKeyRotationRequested`, `SecurityPolicyPublished`, `TvDecommissioned`.
