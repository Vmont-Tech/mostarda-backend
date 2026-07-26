# ARCHITECTURE OVERVIEW — Mostarda

Este documento apresenta a **visão arquitetural macro** da Mostarda. Detalhamentos vivem em ADRs e nas pastas específicas (`edge/`, `canvas/`, `ai/`, `asaas/`, `quantum/`).

## Camadas do sistema

```text
                 ┌──────────────────────────────────────────┐
                 │              Frontend (Web)              │
                 │   Dashboards + Grão (agente pessoal)     │
                 └──────────────────────────────────────────┘
                                    │  HTTPS
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                          Backend (Cloud)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Campaigns  │  │  Pricing   │  │  Evidence  │  │ Settlement │  │
│  │  Service   │  │  Service   │  │   Ledger   │  │  (Asaas)   │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Inventory  │  │ Telemetry  │  │  AI Core   │  │  Quantum   │  │
│  │  Service   │  │  Service   │  │  (Agents)  │  │  Adapter   │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                      Event Bus (async, orientado a eventos)      │
└──────────────────────────────────────────────────────────────────┘
        │                     │                      │
        ▼                     ▼                      ▼
   ┌──────────┐        ┌────────────┐         ┌─────────────┐
   │  Asaas   │        │  Quantum   │         │ Blockchain  │
   │(finance) │        │   Cert     │         │institucional│
   └──────────┘        └────────────┘         └─────────────┘
                                    ▲
                                    │  (ancoragem de hash — prova)
                                    │
┌──────────────────────────────────────────────────────────────────┐
│                          Edge (na TV)                            │
│   Player leve · Telemetria · Heartbeat · Assinatura local        │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │                        Canvas                            │   │
│   │       (camada de composição/renderização visual)         │   │
│   └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Componentes

### Cloud (Backend)
Núcleo de negócio. Modelado em Clean Architecture + DDD, dividido em módulos de contexto (Campaigns, Inventory, Pricing, Evidence, Settlement, Telemetry, AI, Quantum). Comunica-se via **event bus** interno. Expõe APIs para Frontend e para Edge.

### Edge
Roda no mini PC acoplado a cada TV. **Leve por design.** Responsável por: baixar assets, executar Slots, produzir e assinar Playback Events, emitir telemetria e operar offline por janelas curtas. Evidence é construída no Cloud; regras de negócio complexas (pricing, split, elegibilidade) **não** ficam aqui.

### Canvas
Subcamada visual do Edge, isolada. Recebe instruções declarativas do Edge e desenha na tela. Permite evoluir tratamento visual sem tocar no player.

### Frontend
Aplicação web com dashboards por perfil (Anunciante, Dono da TV, Dono do espaço, Vendedor, Influenciador) e a interface do **Grão**. Consome APIs do Backend.

### Quantum Cert
Registro público de provas. Hashes de documentos, evidências e interações NFC/QR são ancorados aqui para consulta externa. Interações NFC/QR do usuário final **passam pelo Quantum**, nunca diretamente pelo Edge.

### Asaas
Provedor financeiro. Responsável por **split**, **notas fiscais** e **ciclos de pagamento**. Nenhuma liquidação ocorre sem Evidence válida.

### IA local (agentes)
Conjunto de agentes especializados (validação de vídeo, recomendação de TVs, otimização de orçamento, análise de performance, relatórios, atendimento via Grão). Ver [ADR-006](../adr/ADR-006-AI-Architecture.md).

### Blockchain institucional
**Camada de prova**, não de pagamento. Usada exclusivamente para ancorar hashes (Evidence Ledger, documentos oficiais, snapshots de auditoria). Não custodia valor, não move dinheiro.

## Princípios obrigatórios

1. **Blockchain não será utilizada para pagamentos.**
2. **Blockchain será apenas camada de prova institucional.**
3. **Asaas será responsável pelo financeiro** (split, notas, ciclos).
4. **Edge deve ser leve** — sem regras complexas de negócio.
5. **Sistema deve ser orientado a eventos** — comunicação assíncrona via event bus interno; sagas para processos multi-etapa (Evidence → Settlement → Split).
6. **Nada é liquidado sem Evidence íntegra.**
7. **Domínio explícito** — todos os módulos consomem o mesmo `DOMAIN_DICTIONARY`.

## Fluxo canônico (exibição → dinheiro)

1. **Campaign** ativa gera **Slots** alocados a **TVs** elegíveis (Inventory + Pricing).
2. Edge recebe o **Slot**, baixa o **Asset**, exibe via **Canvas** por 15s.
3. Edge emite **Playback Event** assinado localmente.
4. Backend constrói, valida e materializa o **Evidence Record** no **Evidence Ledger**.
5. Cloud prepara o **Canonical Evidence Package**; seu hash é ancorado no **Quantum Registry** / blockchain institucional.
6. Settlement consolida Evidences válidas do ciclo, explicita impostos/taxas/retenções e aplica o split arquitetural fixo: **30% Mostarda, 20% Proprietário da TV, 20% Proprietário do Local, 20% Vendedor responsável, 10% Influenciador**.
7. **Asaas** executa o **Split Payment** entre os participantes elegíveis e Settlement reconcilia o resultado.

Qualquer falha de integridade em (3)/(4)/(5) **bloqueia** (6) e (7).

## Contratos reforçados no Architecture Review Gate

- Seguro é domínio próprio (`Insurance`), não atributo da TV; o fundo e a reserva não são saldo de campanha.
- QR é emitido e resolvido no Cloud/Quantum; Edge somente o renderiza. Quantum nunca conversa com Edge, nunca conhece campanhas, anunciantes, preços ou pessoas e registra somente hashes/documentos oficiais permitidos.
- Facets são plugins pequenos inspirados no Diamond, independentes e hot-swappable. Seus Assets são políticas, capacidades, perfis e pipelines — não somente estado de execução.
- Marketplace separa Ads, Influencers, TV Owners e Rentals futuro. Grão é um produto com memória consentida e explicabilidade.
- O plano de crescimento e a cadeia TV → MiniPC → Display → Player → Edge estão definidos em `domain/SCALABILITY.md` e `domain/TV_EDGE_MODEL.md`.
