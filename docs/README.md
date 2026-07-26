# Documentação — Mostarda Backend

Esta é a documentação oficial de engenharia do backend da Mostarda. Ela é a fonte da verdade para decisões técnicas, contratos de domínio e integrações.

## Como esta documentação é organizada

| Pasta             | Finalidade                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- |
| `product/`        | Visão de produto, missão, ecossistema, modelo econômico.                            |
| `architecture/`   | Visão arquitetural geral (Cloud, Edge, Canvas, IA, Quantum, Asaas, Blockchain).     |
| `domain/`         | Dicionário de domínio (DDD) — vocabulário oficial da plataforma.                    |
| `execution/`      | Modelo executável de comportamento: Commands, Events, State Machines, Sagas e Timelines. |
| `financial/`      | Financial Platform: pagamento compensado, orçamento, ledger, carteira e saque. |
| `tv-network/`     | TV Network: ciclo de vida, dispositivos Edge, capacidade, saúde e frota. |
| `domain/REVENUE_ARCHITECTURE.md` | Contrato econômico: split, retenções, conciliação e exceções. |
| `domain/INSURANCE.md` | Fundo de seguro, apólices, reservas, sinistros e reposições. |
| `domain/TV_EDGE_MODEL.md` | Operação TV/Edge, recuperação e observabilidade. |
| `adr/`            | Architecture Decision Records — decisões arquiteturais versionadas.                 |
| `events/`         | Catálogo de eventos de domínio e contratos.                                         |
| `api/`            | Contratos de APIs (REST/gRPC/webhooks).                                             |
| `edge/`           | Player, mini PC, telemetria, heartbeat, operação offline.                           |
| `canvas/`         | Camada de composição/renderização visual.                                           |
| `quantum/`        | Integração com Quantum Cert (NFC, QR, prova pública).                               |
| `asaas/`          | Integração financeira Asaas (split, notas, ciclos).                                 |
| `ai/`             | Arquitetura de agentes de IA.                                                       |
| `security/`       | Postura de segurança, ameaças, controles.                                           |
| `infrastructure/` | Cloud, deploy, observabilidade, ambientes.                                          |
| `database/`       | Modelagem de dados e políticas de acesso.                                           |
| `testing/`        | Estratégia de testes (unitários, integração, contrato, E2E).                        |

## Como ler

1. Comece por `product/VISION.md`, `product/PRODUCT_BIBLE.md` e `product/BUSINESS_FOUNDATION.md` para entender o **porquê**, o modelo de negócio e seus princípios.
2. Leia `product/GO_TO_MARKET.md` para entender a estratégia de liquidez do piloto.
3. Leia `domain/DOMAIN_DICTIONARY.md` para dominar o **vocabulário**.
4. Leia `architecture/ARCHITECTURE_OVERVIEW.md` para ver o **quadro geral**.
5. Leia `execution/COMMANDS.md`, `execution/STATE_MACHINES.md` e `execution/SAGAS.md` para entender **como o domínio se comporta**.
6. Leia `financial/FINANCIAL_ARCHITECTURE.md` para entender os fluxos de entrada e saída de dinheiro.
7. Leia `tv-network/TV_NETWORK_ARCHITECTURE.md` para entender a operação da infraestrutura física.
8. Consulte `adr/` para entender **por que decidimos assim**.

## Regras da documentação

- Toda mudança arquitetural relevante gera um **novo ADR** (nunca edita um ADR aceito — cria-se um novo que o supersede).
- Termos de domínio **só existem** se estiverem no dicionário.
- Qualquer nova integração externa gera pasta própria em `docs/`.
