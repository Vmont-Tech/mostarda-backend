# Domínio de Seguro de Hardware

Seguro não é atributo da TV. É um Bounded Context próprio, dono de fundo, cobertura, prêmio, reserva, sinistro e liquidação de reparo/reposição. Integra-se por eventos com TV Network, Telemetry, Settlement e Evidence; não lê suas bases.

## Aggregates

| Aggregate | Responsabilidade e invariantes |
| --- | --- |
| `InsuranceFund` | Livro do fundo: entradas, saídas, saldo disponível e reserva comprometida. Append-only; saldo não pode ser gasto duas vezes. |
| `InsurancePolicy` | Cobertura de uma TV elegível, vigência, carência, limites, exclusões e estado. Não se confunde com a TV. |
| `InsurancePremium` | Obrigação de mensalidade/prêmio, vencimento, adimplência e origem do crédito. |
| `InsuranceReserve` | Valor separado para obrigação ou risco; só é liberado por evento autorizado. |
| `InsuranceClaim` | Sinistro, evidências, elegibilidade, decisão e trilha de análise. |
| `InsuranceRepair` | Orçamento, execução, aceite e liquidação de conserto. |
| `InsuranceReplacement` | Autorização, serial da TV substituta, transferência de cobertura e baixa do equipamento anterior. |
| `InsuranceCoverage` | Regras versionadas de cobertura, franquia, limite, carência e exclusões. |
| `InsuranceSettlement` | Ordem financeira de reparo/reposição; nunca altera histórico do fundo. |
| `InsuranceHistory` | Linha do tempo imutável de política, prêmio, sinistro e decisão. |

## Fluxos obrigatórios

Entrada: prêmio/mensalidade confirmado cria crédito no `InsuranceFund` e registra `InsurancePremiumPaid`. Saída: reparo ou reposição aprovado reserva valor, liquida pelo `InsuranceSettlement` e grava comprovante. A reserva é distinta de receita operacional e de split de campanha.

Elegibilidade exige TV identificada, política ativa, cobertura vigente, carência cumprida, prêmio adimplente e evento não excluído. Inadimplência suspende novas coberturas após a política de tolerância, mas não apaga histórico. Cancelamento encerra cobertura futura e calcula eventual devolução como lançamento explícito. Sinistro em análise não presume cobertura; reparo e troca exigem decisão registrada. Na reposição, a nova TV recebe nova identidade de hardware e vínculo auditável com a cobertura anterior.

Eventos mínimos: `InsurancePolicyIssued`, `InsurancePremiumDue`, `InsurancePremiumPaid`, `InsurancePremiumOverdue`, `InsuranceReserveCreated`, `InsuranceClaimFiled`, `InsuranceClaimApproved`, `InsuranceClaimDenied`, `InsuranceRepairAuthorized`, `InsuranceReplacementAuthorized`, `InsuranceSettlementExecuted`, `InsurancePolicyCancelled`.
