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
- **Pertence:** criação/edição de Campaign, orçamento contratado, janela temporal, segmentação, upload e estado de elegibilidade do Asset, geração e reserva de Slots, pausa/retomada/encerramento.
- **NÃO pertence:** cálculo de preço (Pricing Engine), validação técnica do vídeo por IA (AI Orchestration executa; Campaign Management apenas consome o veredito), exibição (Edge Runtime), prova (Evidence Ledger), cobrança (Settlement).
- **Conversa com:** Pricing Engine, TV Network, AI Orchestration, Evidence Ledger (consumo), Analytics, Notifications, User Identity.
- **Proprietário:** Cloud.

## 2. TV Network

- **Responsabilidade:** inventário físico — **TV**, **Venue**, Dono da TV, Dono do espaço, seguro do hardware.
- **Pertence:** cadastro e identidade (`TV ID`), vínculo TV↔Venue↔proprietários, atributos de contexto do Venue, estado comercial (ativa, suspensa, em manutenção), elegibilidade da TV para receber Slots, contrato de seguro da TV.
- **NÃO pertence:** software embarcado e fila local (Edge Runtime), saúde em tempo real (Telemetry), preço do inventário (Pricing Engine), pagamento ao parceiro (Settlement) ou fundo/cobertura/sinistro (Insurance).
- **Conversa com:** Campaign Management, Pricing Engine, Edge Runtime, Telemetry, Settlement, Marketplace.
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
- **NÃO pertence:** cobrança, split, emissão de nota (Settlement/Asaas), decisão de qual TV usar (Campaign Management + AI Orchestration).
- **Conversa com:** Campaign Management, TV Network, Telemetry, AI Orchestration, Evidence Ledger (fornece valor congelado), Analytics.
- **Proprietário:** Cloud.

## 7. Settlement

- **Responsabilidade:** liquidação — consolidar Evidences válidas em ciclos e disparar **Split Payment** via **Asaas** segundo o split canônico 30/20/20/20/10.
- **Pertence:** ciclo de liquidação, memória de cálculo do split, taxas, impostos e retenções explícitas, disputas financeiras, reconciliação de webhooks, notas fiscais. Fundo, cobertura e sinistro pertencem a Insurance.
- **NÃO pertence:** validade da Evidence (Evidence Ledger), preço (Pricing Engine), rails de pagamento (Asaas), qualquer trilha de valor em blockchain.
- **Conversa com:** Evidence Ledger, Quantum Integration (confirmação de ancoragem), TV Network, Influencer Network, User Identity, Notifications, Analytics; externamente **apenas** com Asaas via Adapter.
- **Proprietário:** Cloud (regras) / Asaas (execução financeira).

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
- **NÃO pertence:** reserva efetiva de Slot (Campaign Management), preço final (Pricing Engine), cobrança (Settlement).
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

## Mapa de contexto (resumo)

```text
Edge Runtime ──Playback Event──> Evidence Ledger ──hash──> Quantum Integration
     │                                  │                          │
     └──Telemetry──> Telemetry          └──VALID──> Settlement <──ancorado──┘
                        │                              │
Campaign Management <───┴── Pricing Engine             └──> Asaas (Adapter)
     │        │                  ▲
     │        └── TV Network ────┘
     └──> Marketplace / Influencer Network / CRM
AI Orchestration, Analytics, Notifications: consumidores transversais
User Identity: fornecedor transversal de identidade e permissão
```
