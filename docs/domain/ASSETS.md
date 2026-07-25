# ASSETS (Estado por Facet) — Mostarda

Cada **Facet** possui **Assets**: unidades nomeadas de estado sob sua responsabilidade.

> Nota terminológica: **Asset** neste documento significa *unidade de estado de uma Facet*. O termo **Asset** do [`DOMAIN_DICTIONARY.md`](./DOMAIN_DICTIONARY.md) (arquivo de mídia de uma Campaign) é referido aqui sempre como **Creative Asset** para evitar ambiguidade.

Campos de cada Asset:

- **Descrição** — o que representa.
- **Tipo** — Value Object, referência, escalar, série temporal, binário, agregado derivado.
- **Origem** — quem produz o dado.
- **Dono** — proprietário único (ver [`OWNERSHIP.md`](./OWNERSHIP.md)).
- **Persistência** — volátil (memória), local (disco do Edge), durável (Cloud), append-only (Ledger), externa (Quantum/Asaas).
- **Criticidade** — **Crítica** (bloqueia dinheiro/prova), **Alta** (bloqueia operação), **Média** (degrada experiência), **Baixa** (informativa).

---

## Playback

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Current Playlist | Fila local de Slots vigente | referência ordenada | Cloud | Edge | local | Alta |
| Current Video | Creative Asset em exibição | referência imutável (id+hash) | Cloud | Edge | local | Crítica |
| Current Overlay | Composição sobreposta ativa | referência | Cloud | Edge | volátil | Média |
| Current QR | QR renderizado no momento | referência | Cloud | Cloud | volátil | Média |
| Current Subtitle | Trilha de legenda ativa | referência | Cloud | Edge | volátil | Baixa |
| Current Stream | Sessão de streaming ativa | referência | Cloud | Edge | volátil | Média |
| Playback Position | Progresso dentro dos 15s | escalar (ms) | Edge | Edge | volátil | Alta |
| Last Playback Result | Resultado da última exibição | enum | Edge | Edge | local | Crítica |

## Campaign

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Campaign Identifier | Identidade da Campaign | Value Object | Cloud | Cloud | durável | Crítica |
| Advertiser Reference | Anunciante proprietário | referência | Cloud | Cloud | durável | Crítica |
| Contracted Budget | Orçamento contratado | Money | Cloud | Cloud | durável | Crítica |
| Consumed Budget | Orçamento consumido por Evidences válidas | Money derivado | Evidence Ledger | Cloud | durável | Crítica |
| Priority | Prioridade relativa | escalar | Cloud | Cloud | durável | Média |
| Creative Set | Creative Assets elegíveis | conjunto de referências | Cloud | Cloud | durável | Crítica |
| Campaign Window | Janela temporal | TimeSlot | Cloud | Cloud | durável | Alta |
| Frequency Cap | Limite de repetição | escalar | Cloud | Cloud | durável | Média |
| Delivery Counter | Entregas realizadas | agregado derivado | Evidence Ledger | Cloud | durável | Alta |
| ROI Snapshot | Retorno estimado | agregado derivado | Analytics | Cloud | durável | Baixa |

## Telemetry

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Presence Count | Pessoas presentes (anônimo) | série temporal | Edge | Edge | local→durável | Média |
| Dwell Time Average | Permanência média | série temporal | Edge | Edge | durável | Média |
| Confidence Score | Confiança da medição | ConfidenceScore | Edge | Edge | durável | Alta |
| Heat Map Snapshot | Distribuição espacial agregada | agregado | Edge | Edge | durável | Baixa |
| Occupancy Level | Nível de ocupação | OccupancyLevel | Edge | Edge | durável | Alta |
| Peak Hours Profile | Perfil de picos | agregado derivado | Analytics | Cloud | durável | Média |
| Movement Pattern | Padrão de fluxo | agregado | Edge | Edge | durável | Baixa |
| Average Distance | Distância média da audiência | escalar | Edge | Edge | durável | Baixa |

## Evidence

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Evidence Payload | Campos obrigatórios da Evidence (ADR-003) | agregado | Edge | Cloud | append-only | Crítica |
| Evidence Hash | Hash íntegro do evento | EvidenceHash | Edge | Quantum (registro) | append-only + externa | Crítica |
| Device Signature | Assinatura da chave local | binário | Edge | Edge | append-only | Crítica |
| Evidence Status | `VALID`/`PENDING_VALIDATION`/`INVALID`/`DISPUTED` | enum | Cloud | Cloud | append-only | Crítica |
| Charged Amount | Valor cobrado congelado | Money | Pricing Engine | Cloud | append-only | Crítica |
| Offline Queue | Eventos pendentes de envio | fila | Edge | Edge | local | Crítica |
| Anchoring Receipt | Comprovante de ancoragem | referência externa | Quantum | Quantum | externa | Crítica |
| Dispute Record | Contestação aberta | agregado | Cloud | Cloud | append-only | Crítica |

## Pricing

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Current CPM | CPM vigente do inventário | Money | Pricing Engine | Cloud | durável | Crítica |
| Dynamic Multiplier | Multiplicador aplicado | escalar | Pricing Engine | Cloud | durável | Crítica |
| Current Occupancy | Ocupação usada no cálculo | OccupancyLevel | Telemetry | Cloud | durável | Alta |
| Peak Factor | Fator de horário de pico | escalar | Pricing Engine | Cloud | durável | Alta |
| Demand Index | Índice de demanda | escalar | Pricing Engine | Cloud | durável | Alta |
| Price Floor / Ceiling | Limites comerciais | Money | Cloud | Cloud | durável | Alta |
| Applied Quote | Preço congelado do Slot | Money | Pricing Engine | Cloud | durável | Crítica |
| Pricing Audit Trail | Insumos e resultado | agregado | Pricing Engine | Cloud | durável | Crítica |

## QR

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| QR Code | Código emitido | referência | Cloud | Cloud | durável | Alta |
| QR Target | Destino no Quantum Registry | URI | Cloud | Cloud | durável | Alta |
| QR Lifetime | Validade | TimeSlot | Cloud | Cloud | durável | Média |
| QR Attribution | Vínculo Campaign/Slot | referência | Cloud | Cloud | durável | Alta |
| QR Interaction History | Histórico público de leituras | append-only externo | Quantum | Quantum | externa | Alta |

## NFC

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| NFC Tag Identifier | Identidade da tag física | Value Object | Cloud | Cloud | durável | Alta |
| Tag Binding | Vínculo tag ↔ TV/Venue | referência | Cloud | Cloud | durável | Alta |
| NFC Interaction History | Histórico público de interações | append-only externo | Quantum | Quantum | externa | Alta |
| Tag Integrity State | Suspeita de violação | enum | Cloud | Cloud | durável | Média |

## Heartbeat

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Last Heartbeat At | Instante do último sinal | timestamp | Edge | Cloud | durável | Alta |
| Heartbeat Interval | Periodicidade configurada | escalar | Cloud | Cloud | durável | Média |
| Liveness State | Vivo/ausente | enum derivado | Cloud | Cloud | durável | Alta |
| SLA Counter | Tempo fora do ar acumulado | agregado derivado | Cloud | Cloud | durável | Crítica |

## Maintenance

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Software Version | Versão instalada | escalar | Edge | Edge | local | Alta |
| Pending Update | Pacote agendado | referência assinada | Cloud | Cloud | durável | Alta |
| Rollback Snapshot | Versão estável anterior | binário | Edge | Edge | local | Alta |
| Maintenance Window | Janela permitida | TimeSlot | Cloud | Cloud | durável | Média |
| Last Update Result | Resultado da atualização | enum | Edge | Edge | local | Alta |

## AI

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Active Model Version | Modelo em uso | referência | Cloud | Cloud | durável | Alta |
| Inference Result | Saída da inferência | agregado | AI Orchestration | Cloud | durável | Média |
| Explanation Record | Insumos, decisão e razão | agregado | AI Orchestration | Cloud | durável | Crítica |
| Recommendation | Sugestão emitida | agregado | AI Orchestration | Cloud | durável | Média |
| Grão Preference Profile | Preferências aprendidas do usuário | agregado | AI Orchestration | Cloud | durável | Alta |
| Cost Budget | Limite de inferência | Money | Cloud | Cloud | durável | Alta |

## Streaming

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Stream Source | Origem atribuída | referência | Cloud | Cloud | durável | Média |
| Session State | Estado da sessão | enum | Edge | Edge | volátil | Média |
| Buffer Level | Nível de buffer | escalar | Edge | Edge | volátil | Baixa |
| Current Bitrate | Qualidade corrente | escalar | Edge | Edge | volátil | Baixa |

## Overlay

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Overlay Template | Modelo publicado | referência | Cloud | Cloud | durável | Média |
| Active Layers | Camadas ativas | lista | Edge | Edge | volátil | Média |
| Safe Area Definition | Áreas protegidas | agregado | Cloud | Cloud | durável | Baixa |

## Scheduling

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Daily Grid | Grade do dia | agregado | Cloud | Edge (execução) | local | Alta |
| Operating Hours | Horário do Venue | TimeSlot | Cloud | Cloud | durável | Alta |
| Schedule Drift | Desvio planejado × executado | escalar derivado | Edge | Cloud | durável | Média |
| Fill Content Set | Conteúdo de preenchimento | referência | Cloud | Cloud | durável | Baixa |

## Health Monitoring

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Device Health | Estado consolidado | DeviceHealth | Edge | Edge | durável | Alta |
| Temperature / CPU / Memory / Storage | Recursos do mini PC | série temporal | Edge | Edge | durável | Média |
| Network Quality | Conectividade | série temporal | Edge | Edge | durável | Alta |
| HDMI Signal State | Sinal para a tela | enum | Edge | Edge | durável | Alta |
| Severity Level | Gravidade atual | enum derivado | Edge | Cloud | durável | Alta |

## Security

| Asset | Descrição | Tipo | Origem | Dono | Persistência | Criticidade |
| --- | --- | --- | --- | --- | --- | --- |
| Device Private Key | Chave de assinatura local | binário secreto | Edge | Edge | local seguro | Crítica |
| Device Public Key | Chave pública registrada | binário | Edge | Cloud | durável | Crítica |
| Software Signature | Assinatura do build | binário | Cloud | Cloud | durável | Crítica |
| mTLS Certificate | Certificado do canal | binário | Cloud | Cloud | local seguro | Crítica |
| Tamper Flag | Suspeita de violação | enum | Edge | Cloud | durável | Crítica |
| Security Policy | Política vigente | agregado | Cloud | Cloud | durável | Alta |
