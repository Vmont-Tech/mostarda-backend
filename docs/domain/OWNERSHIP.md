# OWNERSHIP — Mostarda

**Regra inegociável: toda informação da plataforma possui um único proprietário.** Nenhum dado pode ter dois donos. Quem não é dono apenas **lê** (por evento ou API pública) e **nunca** altera.

## Definições

| Proprietário | Significado |
| --- | --- |
| **Edge** | Software no mini PC acoplado à TV. |
| **Canvas** | Camada de renderização visual. |
| **Cloud (Backend)** | Backend Mostarda; quando útil, especifica-se o bounded context dono. |
| **Pricing Engine** | Bounded context de precificação (dentro do Cloud). |
| **Quantum** | Quantum Registry via Quantum Cert. |
| **Asaas** | Provedor financeiro. |
| **Frontend** | Aplicações de interface (dashboards). |
| **Grão** | Face conversacional da AI Orchestration. |

## Matriz de propriedade

| Elemento | Proprietário único | Quem lê | Observação |
| --- | --- | --- | --- |
| Playback (execução da exibição) | **Edge** | Cloud, Analytics | Cloud nunca "toca" a tela. |
| Fila local de Slots (execução) | **Edge** | Cloud | A *alocação* do Slot é do Cloud. |
| Telemetry capture e buckets fechados | **Edge** | Telemetry Context | Edge publica fatos assinados; não aceita observações nem produz projeções. |
| Accepted telemetry observations / Telemetry Ledger | **Telemetry Context** | Pricing Engine, AI, Analytics, operações | Ledger append-only; somente Telemetry aceita ou rejeita buckets. |
| AudienceProjection | **Telemetry Context** | Pricing Engine, AI, Analytics, Marketplace | Projeção interna, versionada e reconstruível de Telemetry; não cria Audience Bounded Context. |
| Saúde do dispositivo | **Edge** | Cloud, Notifications | |
| Heartbeat | **Edge** | Cloud | Liveness derivado é do Cloud. |
| Assinatura do Playback Event | **Edge** | Cloud | Chave privada nunca sai do dispositivo. |
| Renderização / composição visual | **Canvas** | Edge | |
| QR (emissão, alvo, validade) | **Cloud** | Edge (renderiza), Quantum (resolve) | Todo QR pertence à Campaign. |
| NFC Interaction | **Quantum** | Cloud | Edge nunca responde NFC. |
| QR Interaction (histórico público) | **Quantum** | Cloud | |
| Playback Event / Playback Signature | **Edge** | Cloud (Evidence Ledger), Telemetry | Fato assinado; não é Evidence. |
| Evidence Record | **Cloud** (Evidence Ledger) | Settlement, Analytics, Campaign Management | Construído e materializado no Cloud a partir de fatos e contexto validados. |
| Status da Evidence | **Cloud** (Evidence Ledger) | Settlement | |
| Hash (ancoragem pública) | **Quantum** | Cloud | Cálculo no Edge/Cloud; **registro** é do Quantum. |
| Snapshot do Ledger | **Cloud** (Evidence Ledger) | Quantum (ancora) | |
| Split e direitos financeiros | **Cloud** (Settlement) | Financial Platform | Settlement calcula; não paga. |
| Partner Ledger / Wallet / Withdrawal | **Cloud** (Financial Platform) | Asaas (execução instruída) | Ledger é append-only e Wallet é derivada. |
| Nota fiscal | **Asaas** | Cloud | |
| Ciclo de liquidação | **Cloud** (Settlement) | Financial Platform | Cria direitos; não instrui transferência. |
| Preço / CPM / multiplicadores | **Pricing Engine** | Campaign Management, Marketplace, Evidence Ledger | Edge nunca calcula preço. |
| Campanha | **Cloud** (Campaign Management) | todos | Toda Campaign pertence a um Advertiser. |
| Slots (alocação e revogação) | **Cloud** (Campaign Management) | Edge, Pricing Engine | |
| Creative Asset e elegibilidade | **Cloud** (Campaign Management) | Edge, AI Orchestration | Veredito técnico vem da IA, decisão é do contexto. |
| TV e `TV ID` | **Cloud** (TV Network) | todos | Toda TV pertence a um parceiro. |
| Venue | **Cloud** (TV Network) | Pricing Engine, Campaign Management | |
| Continuidade de hardware | **Hardware Continuity** | TV Network, Financial, Quantum, Governance | serviço; não seguro |
| Fundo de influenciadores | **InfluencerDevelopmentFund** | Settlement, Financial, comitê | patrimônio restrito |
| Influencer e contrato de participação | **Cloud** (Influencer Network) | Settlement, Campaign Management | |
| Conta comercial, pipeline, carteira do Vendedor | **Cloud** (CRM) | Settlement, Analytics | |
| Identidade, papéis e permissões | **Cloud** (User Identity) | todos | |
| Dados pessoais e consentimento | **Cloud** (User Identity) | conforme permissão | |
| Catálogo e ofertas | **Cloud** (Marketplace) | Frontend | |
| Recomendação, otimização e explicabilidade | **Cloud** (AI Orchestration) | Frontend, Cloud | Toda IA justifica sua recomendação. |
| Conversa e preferências do usuário | **Grão** | Frontend | Único canal humano de IA. |
| Métricas e relatórios consolidados | **Cloud** (Analytics) | Frontend, AI | Derivado, nunca fonte da verdade. |
| Dashboard (apresentação e estado de UI) | **Frontend** | — | Frontend nunca calcula métrica. |
| Notificações e preferências de canal | **Cloud** (Notifications) | Frontend | |

## Consumer compatibility authority

For every producer artifact, each consumer has exclusive authority over its own immutable scoped compatibility declarations. Pricing, Analytics, Marketplace and AI own separate matrices and may reach different decisions; one consumer cannot publish or alter another consumer's matrix. Producers own canonical version identity and syntax, not consumer support. Configuration Service distributes consumer-authored revisions only; it never chooses, never changes and never infers a compatibility decision. This authority is cross-cutting and creates no additional domain owner.

## Consequências práticas

1. Se dois contextos precisam do mesmo dado, um é dono e o outro mantém **cópia de leitura** derivada de evento — explicitamente marcada como derivada.
2. Nenhum contexto altera dado de outro; solicita por comando/evento ao dono.
3. Dado derivado nunca é usado como prova; prova é sempre a Evidence do Ledger com hash ancorado no Quantum.
4. Telemetry e AudienceProjection nunca materializam Evidence; Evidence Ledger é o único owner que cria `EvidenceRecord` a partir de `PlaybackEvent` e `PlaybackSignature`.
