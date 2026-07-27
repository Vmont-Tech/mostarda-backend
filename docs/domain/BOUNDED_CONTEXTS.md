# BOUNDED CONTEXTS — Mostarda

Fonte única da verdade sobre as fronteiras do domínio. Vocabulário conforme [`DOMAIN_DICTIONARY.md`](./DOMAIN_DICTIONARY.md). Nenhuma implementação futura pode violar estas fronteiras.

## Regras gerais de fronteira

1. Um contexto **nunca** lê o banco de dados de outro contexto.
2. Comunicação entre contextos ocorre por **eventos de domínio** (assíncrono) ou **API pública do contexto** (síncrono, quando inevitável).
3. Todo contexto tem **um único proprietário** de domínio (ver [`OWNERSHIP.md`](./OWNERSHIP.md)).
4. Integrações externas atravessam sempre um **Anti-Corruption Layer** (Adapter).
5. Termos duplicados entre contextos são traduzidos na fronteira, nunca compartilhados por acaso.

Legenda de proprietário técnico: **Cloud** (backend Mostarda), **Edge** (software no mini PC), **Quantum** (Quantum Cert), **Asaas** (provedor financeiro), **Frontend** (aplicações de interface).

---

## 1. Campaign Management

- **Responsabilidade:** ciclo de vida de **Campaign**, **Asset** e geração de **Slot**.
- **Pertence:** criação/revisão de Campaign, estratégia manual/delegada, janela, targeting, mandato do Grão, upload/revisão e elegibilidade do Creative, lifecycle de Slot, causas de pausa, cancelamento, encerramento e coordenação de realocação.
- **NÃO pertence:** saldo/reserva/consumo (Financial Platform), cálculo de preço (Pricing Engine), avaliação técnica por IA, exibição (Edge Runtime), prova (Evidence Ledger), direito financeiro (Settlement) ou cobrança/devolução (Financial Platform).
- **Conversa com:** Pricing Engine, TV Network, AI Orchestration, Evidence Ledger (consumo), Analytics, Notifications, User Identity.
- **Proprietário:** Cloud.
- **Especificação:** [`CAMPAIGN_MANAGEMENT.md`](./CAMPAIGN_MANAGEMENT.md).

## 2. TV Network

- **Responsabilidade:** ciclo de vida e disponibilidade operacional da frota — **TV**, **Venue**, Device Registry, EdgeInstallation, Capability Registry, health, heartbeat, manutenção, rollout, rollback e Fleet.
- **Pertence:** cadastro e identidade (`TV ID`), vínculo TV↔Venue↔proprietários, atributos de contexto do Venue, instalação/provisionamento, inventário, estado operacional, Capability declarativa, Desired/Current/Observed State, conectividade e manutenção. Ver [`../tv-network/TV_NETWORK_ARCHITECTURE.md`](../tv-network/TV_NETWORK_ARCHITECTURE.md).
- **NÃO pertence:** software embarcado e fila local (Edge Runtime), saúde em tempo real (Telemetry), preço do inventário (Pricing Engine), pagamento ao parceiro (Settlement) ou fundo/cobertura/sinistro (Insurance).
- **Conversa com:** Edge Runtime, Telemetry, Insurance, Notifications e Analytics por fatos operacionais; não conhece Campaign, Pricing, Evidence, Settlement ou Financial Platform.
- **Proprietário:** Cloud.

## 3. Edge Runtime

- **Responsabilidade:** execução no dispositivo — fila local de Slots, reprodução via **Canvas**, emissão de **Playback Event** assinado, operação offline.
- **Pertence:** fila local, cache de Assets, decisão de *qual item da fila toca agora*, assinatura local, heartbeat, ressincronização, atualização remota e rollback.
- **NÃO pertence:** precificação, elegibilidade, split, regras de negócio, materialização de Evidence, atendimento a NFC/QR (isso é Quantum Integration).
- **Conversa com:** TV Network (provisionamento), Campaign Management (recebe fila), Evidence Ledger (envia Playback Events), Telemetry (envia telemetria).
- **Proprietário:** Edge.

## 4. Evidence Ledger

- **Responsabilidade:** validar Playback Events e materializar **Evidence** em livro-razão append-only.
- **Pertence:** validação de assinatura, coerência temporal, deduplicação, status (`VALID`, `PENDING_VALIDATION`, `INVALID`, `DISPUTED`), eventos compensatórios, snapshots do ledger.
- **NÃO pertence:** emissão original do evento (Edge Runtime), ancoragem pública (Quantum Integration), cálculo de split (Settlement), métricas agregadas (Analytics).
- **Conversa com:** Edge Runtime, Quantum Integration, Settlement, Analytics, Campaign Management.
- **Proprietário:** Cloud.

## 5. Telemetry

- **Responsabilidade:** dados operacionais e de audiência do dispositivo/ambiente.
- **Pertence:** heartbeat, saúde do dispositivo, conectividade, presença, dwell time, ocupação, mapas de calor, incidentes.
- **NÃO pertence:** prova fiscal (Evidence Ledger — telemetria **nunca** substitui Evidence), preço (Pricing Engine), decisão de exibição.
- **Conversa com:** Edge Runtime, Pricing Engine, AI Orchestration, Analytics, TV Network, Notifications.
- **Proprietário:** Edge (produção) / Cloud (custódia).

## 6. Pricing Engine

- **Responsabilidade:** **Dynamic Pricing** — definir o `valor cobrado` de um Slot no instante da alocação.
- **Pertence:** CPM base, multiplicadores de demanda/horário/contexto/ocupação, tabelas de piso e teto, registro auditável do preço aplicado.
- **NÃO pertence:** cobrança, split, emissão de nota, saldo ou execução financeira; decisão final de TV pertence a Campaign Management, com recomendação opcional do AI Orchestration.
- **Conversa com:** Campaign Management, TV Network, Telemetry, AI Orchestration, Evidence Ledger (fornece valor congelado), Analytics.
- **Proprietário:** Cloud.

## 7. Settlement

- **Responsabilidade:** liquidação — consolidar Evidences válidas em ciclos, calcular o split canônico 30/20/20/20/10 e criar direitos financeiros.
- **Pertence:** ciclo de liquidação, memória de cálculo do split, impostos e retenções explícitas, disputas financeiras e notas fiscais. Fundo, cobertura e sinistro pertencem a Insurance.
- **NÃO pertence:** validade da Evidence (Evidence Ledger), preço (Pricing Engine), ledger/carteira/saque (Financial Platform), rails de pagamento (Asaas), qualquer trilha de valor em blockchain.
- **Conversa com:** Evidence Ledger, Quantum Integration (confirmação de ancoragem), Financial Platform, TV Network, Influencer Network, User Identity, Notifications e Analytics.
- **Proprietário:** Cloud.

## 8. Quantum Integration

- **Responsabilidade:** Anti-Corruption Layer para o **Quantum Registry** — ancoragem de hashes e custódia de **NFC Interaction** / **QR Interaction**.
- **Pertence:** ancoragem de hash de Evidence e de snapshots, hash de documentos institucionais, resolução de tags NFC e QR, histórico público de interações, fila de retry de ancoragem.
- **NÃO pertence:** conhecimento de Campaign, orçamento, preço ou dados pessoais; comunicação com o Edge; pagamento.
- **Conversa com:** Evidence Ledger, Settlement (sinal de ancoragem), Marketplace/Campaign Management apenas via identificadores opacos; externamente com Quantum Cert.
- **Proprietário:** Quantum (registro) / Cloud (adapter).

## 9. Influencer Network

- **Responsabilidade:** **Influencer** e seu vínculo com Campaigns.
- **Pertence:** cadastro, perfil de audiência, contratos de participação, percentual acordado, elegibilidade a Split.
- **NÃO pertence:** execução do pagamento (Settlement), criação da Campaign, métricas consolidadas (Analytics).
- **Conversa com:** Campaign Management, Settlement, User Identity, Marketplace, Analytics.
- **Proprietário:** Cloud.

## 10. CRM

- **Responsabilidade:** relacionamento comercial — **Advertiser**, Vendedor, parceiros, pipeline.
- **Pertence:** contas, oportunidades, carteira do Vendedor, atribuição de comissão, histórico de interação comercial, onboarding.
- **NÃO pertence:** autenticação (User Identity), cálculo/pagamento de comissão (Settlement), execução de campanha.
- **Conversa com:** User Identity, Campaign Management, Settlement, Notifications, Analytics, Marketplace.
- **Proprietário:** Cloud.

## 11. AI Orchestration

- **Responsabilidade:** `AI Core` e os agentes especializados; **Grão** como face conversacional.
- **Pertence:** orquestração de agentes (validação de Asset, recomendação de TVs, otimização de orçamento, performance, relatórios, Grão), trilha de explicabilidade, limites de custo.
- **NÃO pertence:** decisão final que move dinheiro sem passar pelo contexto dono (Pricing Engine/Settlement decidem; IA recomenda), persistência de domínio de outros contextos, comunicação direta com SDKs sem adapter.
- **Conversa com:** todos os contextos como consumidor de eventos; escreve apenas recomendações e trilha própria.
- **Proprietário:** Cloud.

## 12. User Identity

- **Responsabilidade:** identidade, autenticação, autorização e papéis no ecossistema.
- **Pertence:** conta, credenciais, sessão, papéis (Advertiser, Dono da TV, Dono do espaço, Vendedor, Influencer, operador Mostarda), permissões, consentimentos, dados pessoais.
- **NÃO pertence:** dados comerciais (CRM), dados financeiros (Settlement), preferências do Grão (AI Orchestration).
- **Conversa com:** todos os contextos, sempre como fornecedor de identidade e permissão.
- **Proprietário:** Cloud.

## 13. Marketplace

- **Responsabilidade:** fronteira comercial com quatro subdomínios separados: **Marketplace Ads** (campanhas/inventário), **Marketplace Influencers** (criadores), **Marketplace TV Owners** (TVs/parceiros) e **Marketplace Rentals** (aluguel futuro).
- **Pertence:** cada subdomínio possui catálogo, disponibilidade publicada, propostas, checkout de contratação e regras de vitrine próprios; propostas nunca misturam tipos de oferta.
- **NÃO pertence:** reserva efetiva de Slot (Campaign Management), preço final (Pricing Engine), cobrança ou devolução (Financial Platform).
- **Conversa com:** Campaign Management, TV Network, Pricing Engine, Influencer Network, CRM, User Identity.
- **Proprietário:** Cloud.

## 14. Notifications

- **Responsabilidade:** entrega de mensagens ao usuário e a sistemas (e-mail, push, in-app, alertas internos).
- **Pertence:** templates, preferências de canal, deduplicação, retries, trilha de entrega.
- **NÃO pertence:** decisão sobre o fato notificado (contexto de origem), conteúdo analítico (Analytics), autoria conversacional do Grão (AI Orchestration).
- **Conversa com:** todos os contextos como consumidor de eventos.
- **Proprietário:** Cloud.

## 15. Analytics

- **Responsabilidade:** consolidação de leitura — métricas, relatórios e projeções derivadas de Evidence, Telemetry, Pricing e Settlement.
- **Pertence:** modelos de leitura, agregações, séries temporais, indicadores por Campaign/TV/Venue/Vendedor/Influencer.
- **NÃO pertence:** ser fonte da verdade de qualquer fato (é sempre derivado), cálculo de valor devido (Settlement), qualquer cálculo no Frontend.
- **Conversa com:** consome eventos de todos; serve Frontend e AI Orchestration.
- **Proprietário:** Cloud.

---

## 16. Insurance

- **Responsabilidade:** fundo, apólice, prêmio/mensalidade, reserva, cobertura, sinistro, reparo, reposição e liquidação de seguro.
- **Pertence:** os Aggregates definidos em [`INSURANCE.md`](./INSURANCE.md), inclusive saldo e histórico append-only do fundo.
- **NÃO pertence:** identidade/elegibilidade da TV (TV Network), pagamento de campanha (Settlement), saúde bruta do dispositivo (Telemetry) ou prova de exibição (Evidence Ledger).
- **Conversa com:** TV Network, Telemetry, Settlement, Notifications e User Identity, sempre por contratos/eventos.
- **Proprietário:** Cloud.

## 17. Financial Platform

- **Responsabilidade:** entrada compensada, Payment Ledger, Campaign Budget, Partner Account/Ledger/Wallet, Withdrawal, batches e políticas financeiras.
- **NÃO pertence:** preço (Pricing), prova (Evidence), direito/split (Settlement), execução física, blockchain ou decisão de cobertura de seguro.
- **Conversa com:** Asaas via adapter, Campaign Management, Settlement, Insurance, User Identity, Notifications e Analytics.
- **Proprietário:** Cloud (regras e ledger) / Asaas (execução de cobrança e transferência).

## 18. Configuration Service

- **Responsabilidade:** distribuir configurações e versões aprovadas de políticas operacionais.
- **Pertence:** grace periods, limiares, SLAs/SLOs, tolerâncias e parâmetros de policies já decididas pelos respectivos owners.
- **NÃO pertence:** criar regra de negócio, escolher owner, alterar fato histórico ou fornecer default implícito.
- **Conversa com:** todos os contextos que executam política versionada.
- **Proprietário:** Cloud; o contexto dono da política aprova seu conteúdo.

Ausência, expiração ou incompatibilidade de versão bloqueia a operação dependente. Toda decisão preserva policy version e valores efetivos.

## 19. Governance & Dispute Management

- **Responsabilidade:** investigar fatos, aplicar GovernancePolicyVersion, publicar julgamento oficial de responsabilidade, receber recursos e preservar revisões.
- **Pertence:** GovernanceCase, EvidenceReference, Investigation, ResponsibilityDecision, Appeal e trilha de auditoria.
- **NÃO pertence:** fatos de origem, identidade, preço, saldo, Evidence, direito de Settlement, execução de consequência ou administração de políticas de outros contexts.
- **Conversa com:** recebe fatos de todos; publica ResponsibilityDecisionPublished para Financial, Settlement, Campaign, Notifications e Analytics.
- **Proprietário:** Cloud, com autoridade humana segregada quando a policy exigir.

Governance é o único owner do julgamento. Todos os demais contexts produzem fatos. Consumers nunca reinterpretam responsibleParty, category, severity ou policyVersion.

## Mapa de contexto (resumo)

```text
Edge Runtime ──Playback Event──> Evidence Ledger ──hash──> Quantum Integration
     │                                  │                          │
     └──Telemetry──> Telemetry          └──VALID──> Settlement <──ancorado──┘
                        │                              │
Campaign Management <───┴── Pricing Engine             └──> Financial Platform ──> Asaas
     │        │                  ▲
     │        └── TV Network ────┘
     └──> Marketplace / Influencer Network / CRM
AI Orchestration, Analytics, Notifications: consumidores transversais
User Identity: fornecedor transversal de identidade e permissão
Todos os fatos relevantes ──> Governance & Dispute Management ──ResponsibilityDecisionPublished──> owners das consequências
```
