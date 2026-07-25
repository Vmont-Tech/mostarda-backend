# WORLDS — Físico, Digital e Institucional

A Mostarda opera em três mundos com responsabilidades distintas. Confundir esses mundos é a principal fonte de erro arquitetural da plataforma.

---

## Mundo Físico

**O que é:** aquilo que existe no espaço e pode falhar por causas materiais.

- **TV** (tela + acessórios) instalada em um **Venue**
- **Mini PC** executando o **Edge**, com chave privada em armazenamento local seguro
- Cabo/sinal **HDMI**, energia, rede local
- **Tag NFC** física e **QR Code** impresso ou exibido
- Sensores e câmera (quando presentes), fonte de **Telemetry** anônima

**Papel:** produzir o fato — a exibição realmente aconteceu — e a **assinatura** que o torna verificável.

**Limites:** não decide preço, não decide elegibilidade, não conhece split, não responde a leitura de NFC.

---

## Mundo Digital

**O que é:** a intenção comercial e a experiência.

- **Campaign**, **Slot**, **Creative Asset**, orçamento, segmentação
- **Advertiser**, Dono da TV, Dono do espaço, Vendedor, **Influencer**, operador Mostarda
- **Pricing Engine**, **Marketplace**, **CRM**, **Analytics**, **Notifications**
- **AI Orchestration** e o **Grão** como única face conversacional
- Dashboards no **Frontend** — apresentação, jamais cálculo

**Papel:** decidir *o que deve acontecer*, *para quem* e *por quanto*; interpretar os fatos vindos do mundo físico.

**Limites:** não produz prova por conta própria (prova nasce no Edge), não executa pagamento (Asaas), não é registro público (Quantum).

---

## Mundo Institucional

**O que é:** a camada de confiança verificável por terceiros.

- **Evidence Ledger** append-only, fonte da verdade para liquidação
- **EvidenceHash**, hashes de documentos e snapshots do Ledger
- **Quantum Registry** (Quantum Cert): ancoragem e histórico público de **NFC Interaction** / **QR Interaction**
- **Blockchain institucional**: exclusivamente prova — **nunca** trilha de valor
- Auditoria, disputas, seguro da TV, obrigações fiscais
- **Asaas**: execução financeira (cobrança, split, notas) — sem qualquer contato com blockchain

**Papel:** tornar o fato incontestável e o dinheiro rastreável, com responsabilidades separadas.

**Limites:** Quantum não conhece Campaign, preço ou pessoas; Asaas não conhece blockchain; o mundo institucional não interfere na execução da tela.

---

## Como os três mundos interagem

```text
┌── MUNDO FÍSICO ─────────────┐
│ TV + Mini PC (Edge)         │
│ exibe 15s, mede ambiente,   │
│ assina o Playback Event     │
└──────────┬──────────────────┘
           │ Playback Event assinado + Telemetry
           ▼
┌── MUNDO DIGITAL ────────────┐
│ Cloud valida, materializa   │
│ Evidence, precifica, aloca  │
│ Slots, orquestra IA,        │
│ apresenta dashboards        │
└──────┬───────────────┬──────┘
       │ hash          │ Evidence VALID + ancorada
       ▼               ▼
┌── MUNDO INSTITUCIONAL ──────┐
│ Quantum Registry ancora     │
│ hashes e guarda NFC/QR      │
│ Blockchain: prova apenas    │
│ Asaas: cobrança e split     │
└─────────────────────────────┘
       │ AnchoringConfirmed / PayoutConfirmed
       ▼ retorna ao MUNDO DIGITAL como estado auditável
```

### Fluxos canônicos

1. **Exibição → prova → dinheiro**
   Físico exibe e assina → Digital valida e materializa a Evidence → Institucional ancora o hash → Digital autoriza o ciclo → Asaas executa o Split.

2. **Interação física do público (NFC/QR)**
   Pessoa aproxima a tag ou lê o QR → a resolução vai ao **Quantum Registry**, nunca ao mini PC → a interação passa a compor o histórico público → o Digital lê esse histórico para atribuição.

3. **Ambiente → preço**
   Sensores produzem Telemetry anônima com `ConfidenceScore` → Digital (Pricing Engine) usa como insumo do **Dynamic Pricing** → o preço congelado acompanha o Slot e a Evidence.

4. **Decisão de IA**
   Digital coleta fatos dos três mundos → agentes recomendam com explicação obrigatória → a decisão que move dinheiro permanece no contexto dono (Pricing Engine / Settlement).

### Invariantes de fronteira

- Nenhum fato do mundo físico entra no institucional sem passar pela validação do digital.
- Nenhuma liquidação ocorre sem que o institucional confirme a ancoragem.
- Nenhuma informação pessoal ou comercial atravessa para o registro público.
- Nenhum componente do mundo físico é alcançável a partir da rede do Venue para fins administrativos.
