# Documentação — Mostarda Backend

Esta é a documentação oficial de engenharia do backend da Mostarda. Ela é a fonte da verdade para decisões técnicas, contratos de domínio e integrações.

A candidata a fonte normativa primária é [`specification/PLATFORM_SPECIFICATION.md`](./specification/PLATFORM_SPECIFICATION.md), atualmente em revisão. Após seu aceite, os demais documentos detalharão e derivarão suas regras conforme a matriz de rastreabilidade.

## Como esta documentação é organizada

| Pasta             | Finalidade                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- |
| `specification/`  | Documento-mestre, decisões, rastreabilidade e governança de consistência.           |
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

1. Comece por `specification/PLATFORM_SPECIFICATION.md` para conhecer o contrato integral vigente.
2. Use `specification/TRACEABILITY.md` para localizar os documentos derivados de cada regra.
3. Leia `product/` para o negócio, `domain/` para o modelo e `execution/` para o comportamento.
4. Leia `financial/` e `tv-network/` para os contextos estruturais especializados.
5. Consulte `adr/` para entender **por que decidimos assim**.

## Regras da documentação

- Toda mudança arquitetural relevante gera um **novo ADR** (nunca edita um ADR aceito — cria-se um novo que o supersede).
- Toda decisão muda primeiro na especificação; depois são sincronizados o registro, a rastreabilidade e os documentos derivados.
- Termos de domínio **só existem** se estiverem no dicionário.
- Qualquer nova integração externa gera pasta própria em `docs/`.
