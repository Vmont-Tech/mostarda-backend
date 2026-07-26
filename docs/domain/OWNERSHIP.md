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
| Telemetria | **Edge** | Cloud, Pricing Engine, AI, Analytics | Nunca vira prova fiscal. |
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
| Split e repasses | **Asaas** | Cloud (Settlement) | Regra do split é do Cloud; execução é do Asaas. |
| Nota fiscal | **Asaas** | Cloud | |
| Ciclo de liquidação | **Cloud** (Settlement) | Asaas | |
| Preço / CPM / multiplicadores | **Pricing Engine** | Campaign Management, Marketplace, Evidence Ledger | Edge nunca calcula preço. |
| Campanha | **Cloud** (Campaign Management) | todos | Toda Campaign pertence a um Advertiser. |
| Slots (alocação e revogação) | **Cloud** (Campaign Management) | Edge, Pricing Engine | |
| Creative Asset e elegibilidade | **Cloud** (Campaign Management) | Edge, AI Orchestration | Veredito técnico vem da IA, decisão é do contexto. |
| TV e `TV ID` | **Cloud** (TV Network) | todos | Toda TV pertence a um parceiro. |
| Venue | **Cloud** (TV Network) | Pricing Engine, Campaign Management | |
| Seguro da TV | **Cloud** (TV Network) | Settlement | |
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

## Consequências práticas

1. Se dois contextos precisam do mesmo dado, um é dono e o outro mantém **cópia de leitura** derivada de evento — explicitamente marcada como derivada.
2. Nenhum contexto altera dado de outro; solicita por comando/evento ao dono.
3. Dado derivado nunca é usado como prova; prova é sempre a Evidence do Ledger com hash ancorado no Quantum.
