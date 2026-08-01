# Telemetry Context

## 1. Autoridade e fronteiras

Telemetry Context é o owner exclusivo dos contratos de aquisição, da validação, das accepted observations imutáveis, do `Telemetry Ledger` append-only e da geração de `AudienceProjection`. Edge Runtime coleta sinais locais e publica fatos assinados; não aceita observações, não classifica audiência comercial e não calcula preço.

`AudienceProjection` is an internal Telemetry projection e um read artifact versionado, derivado e reconstruível a partir do Telemetry Ledger. It does not introduce an Audience Bounded Context. Não escreve fatos de origem, não possui autoridade de lifecycle independente e nenhum consumidor pode produzi-la ou alterá-la.

Telemetry and Audience cannot materialize Evidence. Edge/Playback produces authoritative playback facts, `PlaybackEvent` e `PlaybackSignature`; Evidence Ledger alone materializes EvidenceRecord a partir desses fatos validados. Telemetria ou AudienceProjection não provam playback, presença, atenção, identidade, responsabilidade jurídica ou elegibilidade financeira.

## 2. Coleta, capabilities e degradação

Edge fecha um one-minute bucket por minuto civil na referência temporal do Venue. Cada one-minute bucket is immutable depois de fechado: correção, complemento tardio ou invalidação exige novo fato correlacionado e preserva o original. O bucket identifica TV, Venue, EdgeInstallation, Device, PlayerInstallation quando aplicável, intervalo, sequência, cobertura de capability, medições agregadas, confiança, proveniência e integridade.

Durante conectividade normal, os buckets são enviados normalmente em um five-minute batch contendo cinco fronteiras independentes de um minuto. Retry reapresenta as mesmas identidades e conteúdo; Telemetry deduplica sem duplicar efeito. Operação offline preserva ordem e instantes observados para sincronização posterior.

Optional collectors degrade explicitly. Cada collector reporta uma condição explícita: `AVAILABLE`, `UNAVAILABLE`, `DISABLED`, `DEGRADED` ou `FAILED`. Wi-Fi and camera absence or failure is explicitly reported conforme a causa; playback continues, assim como scheduling, execução offline, Health e sincronização dos outros fatos. Informação ausente não vira zero, sucesso presumido ou valor inventado.

QR and NFC bypass Edge. Edge only renders QR fornecido pelo Cloud; interações de QR e tags comunicam diretamente com o fluxo público Cloud/Quantum e não dependem de batching, conectividade ou resolução local do Edge.

## 3. Validação, Ledger e projeção

Telemetry valida identidade, assinatura, schema, intervalo, ordering, política e integridade antes de aceitar um bucket. Aceite adiciona a observação ao Telemetry Ledger; rejeição preserva causa catalogada e não a registra como observação aceita. O Ledger é append-only: um bucket aceito nunca é editado, reaberto, substituído ou apagado.

Um snapshot atual de `AudienceProjection` usa rolling fifteen-minute observation window e pode ser atualizado após cada batch aceito. Preserva buckets cobertos, intervalos ausentes ou rejeitados, capabilities contribuintes, proveniência, versões, confiança, cobertura, instante de cálculo e intervalo de validade. Dados tardios podem melhorar snapshot posterior ou Analytics histórico, mas não mudam decisões comerciais passadas.

Only new PricingQuotes may consume uma AudienceProjection ainda válida e confiável. Applied PricingQuotes remain unchanged; InventoryHolds remain unchanged; reserved or sold Slots remain unchanged; prices remain unchanged. Campaign charge, Evidence e Settlement também nunca são recalculados. Cobertura, confiança ou consistência insuficiente torna o fator indisponível; Pricing usa snapshot anterior ainda válido quando a policy permitir ou o cálculo estrutural/base, sem inventar audiência. Dado não confiável não pode aumentar preço.

## 4. Contratos públicos conceituais

As nove famílias conceituais são `TelemetryCaptured`, `TelemetryBucketClosed`, `TelemetryBucketAccepted`, `TelemetryBucketRejected`, `AudienceProjectionProduced`, `AudienceProjectionExpired`, `AudienceProjectionInvalidated`, `TelemetryCapabilityChanged` e incident reporting por `TelemetryIncidentReported`.

Cada concrete event type tem exactly one authoritative producer. Edge produz captura e fechamento; Telemetry produz aceite, rejeição e lifecycle da projeção. `TelemetryCapabilityChanged` é família conceitual: `EdgeTelemetryCapabilityChanged` registra somente condição local observada pelo Edge Runtime; transições autoritativas do TV capability owner reutilizam `CapabilityDeclared`, `CapabilityValidated`, `CapabilityRejected`, `CapabilityActivated`, `CapabilityDegraded`, `CapabilitySuspended`, `CapabilityRecovered` e `CapabilityRetired`. Se Edge e Telemetry precisarem reportar incidentes, os contratos concretos são distintos: `EdgeTelemetryIncidentReported` para coleta, armazenamento ou transporte local e `TelemetryValidationIncidentReported` para validação, integridade ou ordering no Telemetry Context. Famílias conceituais nunca são tipos concretos com produtor ambíguo.

Todo contrato preserva identidade do evento e produtor, causation, correlation, tempos observado e registrado, schema, policies, ordering key, hashes canônicos e compatibilidade. Duplicidade de entrega nunca duplica efeito.

## 5. Versionamento semântico

The following versions are independent; they must never be collapsed into a generic `version`:

- `TelemetrySchemaVersion`: significado e forma das medições e buckets; owner Telemetry declara `VersionSyntax = OPAQUE_TOKEN_V1`;
- `CollectorVersion`: algoritmo/implementação que produziu a medição;
- `CapabilityVersion`: comportamento e suporte declarados pela capability;
- `CollectionPolicyVersion`: autorização, minimização e regras de coleta; owner Telemetry declara `VersionSyntax = OPAQUE_TOKEN_V1`;
- `AudienceProjectionVersion`: schema e contrato de derivação da projeção; owner Telemetry declara `VersionSyntax = OPAQUE_TOKEN_V1`;
- `AudienceProjectionPolicyVersion`: confiança, cobertura, validade e semântica de derivação; owner Telemetry declara `VersionSyntax = OPAQUE_TOKEN_V1`;
- `PricingPolicyVersion`: uso autorizado da projeção no cálculo de preço.

Mudança de significado observável, input aceito, output, derivação, interpretação de confiança ou compatibilidade publica uma versão sucessora e nunca reinterpreta o histórico. Upcast autorizado ocorre no owner receptor e preserva o envelope imutável original.

## Compatibility boundary

Telemetry records the producer-supplied exact canonical version identities and their `VersionKind` as immutable provenance. It never evaluates consumer compatibility, declares whether Pricing, Analytics, Marketplace or AI can process an identity, or mutates historical observations when consumer support changes. Telemetry does not own a consumer `CompatibilityMatrix`; each consuming context owns its own scoped immutable declarations. Configuration Service may distribute those declarations only.
