# Insurance — Documento Supersedido

Status: `SUPERSEDED`

O antigo bounded context Insurance foi substituído por [HARDWARE_CONTINUITY.md](HARDWARE_CONTINUITY.md) conforme `SPEC-CONT-001` e `DEC-048`.

A decisão vigente não oferece seguro, apólice, prêmio, sinistro, indenização nem proteção patrimonial mutualista. A Mostarda oferece o **Plano Mostarda de Continuidade Operacional**, serviço mensal de manutenção e disponibilidade de hardware.

Mapeamento de migração:

| Conceito antigo | Conceito vigente |
| --- | --- |
| `InsurancePolicy` | `ContinuitySubscription` |
| `InsuranceClaim` | `MaintenanceCase` |
| `InsuranceReplacement` | `TemporaryReplacement` ou `PermanentExchange` |
| `InsuranceFund/Reserve` | receita, obrigação e provisão operacional do serviço |
| `InsuranceHistory` | `AssetProvenance` + histórico do caso |

Nenhuma implementação nova pode gerar contratos `Insurance*`. Referências em auditorias anteriores são históricas e não possuem autoridade contra a Specification vigente.
