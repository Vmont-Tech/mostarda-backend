# FACETS — Mostarda

Inspirado conceitualmente no **Diamond Standard (EIP-2535)**: a TV é um container estável (o "diamond") e cada **Capability** é composta por **Facets** — módulos substituíveis e versionáveis independentemente, sem trocar a identidade da TV (`TV ID`).

## Contrato arquitetural

Cada Facet é uma capacidade pequena, independente, isolada, substituível, versionável e hot-swappable. Ela não é um módulo de produto nem um Bounded Context: a TV/Cloud é o container estável inspirado no Diamond (EIP-2535), e a Facet é o plugin de capacidade desse container.

Uma Facet declara `FacetId`, versão semântica, contrato de entrada/saída, schema e compatibilidade de Assets, requisitos de recurso, telemetria, assinatura e estratégia de rollback. A ativação exige verificação de assinatura e health gate; em falha, o Player Supervisor retorna à última versão saudável. Facets nunca compartilham estado, banco, cache ou chamadas diretas: colaboram exclusivamente por contratos declarativos, eventos ou Assets explicitamente publicados pelo container.

## Modelo interno da Facet

Toda Facet explicita quatro superfícies: **Assets** (conhecimento, configuração e estado que possui), **Services** (operações internas oferecidas pelo contrato), **Policies** (regras versionadas aplicadas pelos Services) e **Events** (fatos publicados após uma transição). Aggregate é uma técnica de consistência quando a Facet precisa de identidade e invariantes; não substitui nem reduz as quatro superfícies. Nenhuma Facet acessa Assets ou Services internos de outra.

## Regras

1. Uma Facet tem **responsabilidade única** e é substituível sem quebrar a Capability ou a identidade `TV ID`.
2. Facets **não** compartilham estado diretamente: cada Facet é dona dos seus **Assets de capacidade** (ver [`ASSETS.md`](./ASSETS.md)). Estado de runtime é somente uma categoria de Asset, não sua definição.
3. Nenhuma Facet introduz vocabulário fora de [`DOMAIN_DICTIONARY.md`](./DOMAIN_DICTIONARY.md).
4. Facet no Edge nunca decide regra de negócio (ADR-002).
5. Nenhuma Facet pode depender diretamente de outra; o container resolve contratos versionados e garante compatibilidade.

---

## Árvore completa

```text
Playback
├── Player
├── Playlist
├── Overlay
├── Live
├── Subtitles
├── Transitions
├── Resolution
└── Decoder

Campaign
├── Budget
├── Advertiser
├── Priority
├── Creative
├── Scheduling
├── ROI
├── Frequency
└── Delivery

Telemetry
├── Presence
├── Dwell Time
├── Confidence
├── Heat Map
├── Occupancy
├── Peak Hours
├── Movement
└── Distance

Evidence
├── Signature
├── Hash
├── Payload
├── Queue
├── Validation
├── Deduplication
├── Anchoring
└── Dispute

Pricing
├── Base CPM
├── Demand
├── Occupancy Factor
├── Peak Factor
├── Context
├── Floor & Ceiling
├── Quote
└── Audit

QR
├── Code
├── Target
├── Rendering
├── Lifetime
├── Attribution
└── Interaction History

NFC
├── Tag
├── Binding
├── Resolution
├── Interaction History
└── Integrity

Heartbeat
├── Interval
├── Payload
├── Liveness
├── Miss Detection
└── SLA

Maintenance
├── Update Channel
├── Package Signature
├── Health Gate
├── Rollback
├── Window
└── Remote Command

AI
├── Model Registry
├── Inference
├── Explainability
├── Recommendation
├── Optimization
├── Report
├── Guardrails
└── Grão Conversation

Streaming
├── Source
├── Session
├── Buffer
├── Bitrate
├── Failover
└── Priority Yield

Overlay
├── Template
├── Layer
├── Safe Area
├── Branding
├── Subtitle Layer
└── QR Layer

Scheduling
├── Grid
├── Operating Hours
├── Window
├── Conflict
├── Drift
└── Fill Content

Health Monitoring
├── CPU
├── Temperature
├── Memory
├── Storage
├── Network
├── Display
├── HDMI
└── Severity

Security
├── Key Custody
├── Signing
├── Attestation
├── Transport (mTLS)
├── Anonymization
├── Access Control
└── Tamper Detection
```

---

## Detalhamento por Capability

### Playback
| Facet | Responsabilidade |
| --- | --- |
| Player | Executar o item corrente pelo tempo atômico de 15s. |
| Playlist | Manter ordem e consumo da fila local de Slots. |
| Overlay | Delegar composição de camadas à Capability Overlay. |
| Live | Alternar entre conteúdo gravado e fluxo ao vivo. |
| Subtitles | Renderizar legendas e acessibilidade. |
| Transitions | Transições entre itens sem quadro preto indevido. |
| Resolution | Adequar saída à tela e ao HDMI disponíveis. |
| Decoder | Decodificação de codecs homologados. |

### Campaign
| Facet | Responsabilidade |
| --- | --- |
| Budget | Refletir orçamento e saldo autorizado (calculado no Cloud). |
| Advertiser | Vínculo obrigatório da Campaign ao **Advertiser**. |
| Priority | Ordem relativa entre Campaigns concorrentes. |
| Creative | Vínculo aos **Assets** elegíveis. |
| Scheduling | Janela temporal e recorrência da Campaign. |
| ROI | Leitura derivada de performance (Analytics). |
| Frequency | Limite de repetição por TV/período. |
| Delivery | Entrega realizada versus contratada. |

### Telemetry
| Facet | Responsabilidade |
| --- | --- |
| Presence | Detecção anônima de pessoas presentes. |
| Dwell Time | Tempo de permanência agregado. |
| Confidence | Grau de confiança da medição. |
| Heat Map | Distribuição espacial agregada. |
| Occupancy | Nível de ocupação do ambiente. |
| Peak Hours | Faixas de maior audiência. |
| Movement | Padrão de fluxo. |
| Distance | Faixa de distância média da audiência. |

### Evidence
| Facet | Responsabilidade |
| --- | --- |
| Signature | Assinatura local do Playback Event. |
| Hash | Hash íntegro do conteúdo do evento. |
| Payload | Campos obrigatórios (ADR-003). |
| Queue | Fila offline e reenvio. |
| Validation | Validação no Cloud e atribuição de status. |
| Deduplication | Garantia de unicidade por Slot executado. |
| Anchoring | Ancoragem do hash via Quantum Integration. |
| Dispute | Trilha de contestação e eventos compensatórios. |

### Pricing
| Facet | Responsabilidade |
| --- | --- |
| Base CPM | Preço de referência do inventário. |
| Demand | Pressão de demanda no período. |
| Occupancy Factor | Ajuste por ocupação medida. |
| Peak Factor | Ajuste por horário de pico. |
| Context | Ajuste por categoria/localização do Venue. |
| Floor & Ceiling | Limites de proteção comercial. |
| Quote | Congelamento do preço no instante da alocação. |
| Audit | Registro de insumos e resultado do cálculo. |

### QR
| Facet | Responsabilidade |
| --- | --- |
| Code | Geração do código no Cloud. |
| Target | Destino que resolve no **Quantum Registry**. |
| Rendering | Exibição na tela via Overlay. |
| Lifetime | Validade e revogação. |
| Attribution | Vínculo à Campaign e ao Slot. |
| Interaction History | Histórico público de **QR Interaction**. |

### NFC
| Facet | Responsabilidade |
| --- | --- |
| Tag | Mídia física instalada no Venue. |
| Binding | Vínculo tag ↔ TV/Venue. |
| Resolution | Resolução da leitura pelo Quantum Registry. |
| Interaction History | Histórico público de **NFC Interaction**. |
| Integrity | Detecção de troca/violação da tag. |

### Heartbeat
| Facet | Responsabilidade |
| --- | --- |
| Interval | Periodicidade configurada. |
| Payload | Conteúdo mínimo do sinal. |
| Liveness | Estado vivo/morto derivado. |
| Miss Detection | Detecção de ausência prolongada. |
| SLA | Base de apuração de SLA e seguro. |

### Maintenance
| Facet | Responsabilidade |
| --- | --- |
| Update Channel | Canal seguro de distribuição. |
| Package Signature | Verificação de assinatura do pacote. |
| Health Gate | Health check pós-atualização. |
| Rollback | Retorno automático à versão estável. |
| Window | Janela permitida pelo Venue. |
| Remote Command | Comandos remotos homologados. |

### AI
| Facet | Responsabilidade |
| --- | --- |
| Model Registry | Modelos homologados e versões. |
| Inference | Execução de inferência. |
| Explainability | Insumos, decisão e razão registrados. |
| Recommendation | Sugestão de inventário e ações. |
| Optimization | Redistribuição de orçamento. |
| Report | Geração de relatórios. |
| Guardrails | Limites de custo e circuit breakers. |
| Grão Conversation | Único canal conversacional com o usuário. |

### Streaming
| Facet | Responsabilidade |
| --- | --- |
| Source | Origem do fluxo. |
| Session | Sessão ativa de stream. |
| Buffer | Gestão de buffer. |
| Bitrate | Adaptação de qualidade. |
| Failover | Fonte alternativa. |
| Priority Yield | Ceder tela a Slot comercial. |

### Overlay
| Facet | Responsabilidade |
| --- | --- |
| Template | Modelo de composição publicado. |
| Layer | Ordem e opacidade das camadas. |
| Safe Area | Áreas protegidas da tela. |
| Branding | Elementos de marca. |
| Subtitle Layer | Camada de legenda. |
| QR Layer | Camada do QR. |

### Scheduling
| Facet | Responsabilidade |
| --- | --- |
| Grid | Grade de execução do dia. |
| Operating Hours | Horário de operação do Venue. |
| Window | Janelas especiais (evento, manutenção). |
| Conflict | Resolução de conflitos de agenda. |
| Drift | Desvio entre planejado e executado. |
| Fill Content | Conteúdo de preenchimento sem Slot comercial. |

### Health Monitoring
| Facet | Responsabilidade |
| --- | --- |
| CPU / Temperature / Memory / Storage | Recursos do mini PC. |
| Network | Conectividade e latência. |
| Display / HDMI | Estado da tela e do sinal. |
| Severity | Classificação de gravidade e alerta. |

### Security
| Facet | Responsabilidade |
| --- | --- |
| Key Custody | Guarda da chave privada local. |
| Signing | Assinatura de eventos. |
| Attestation | Boot e software verificados. |
| Transport (mTLS) | Canal mútuo autenticado. |
| Anonymization | Remoção de identificação pessoal na origem. |
| Access Control | Ausência de porta administrativa local. |
| Tamper Detection | Suspeita de violação física/lógica. |
