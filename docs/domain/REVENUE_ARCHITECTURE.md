# Arquitetura de Receita — Mostarda

Este é o contrato econômico oficial. Nenhuma implementação pode trocar percentuais, escolher outro destinatário ou liquidar fora destas regras sem um novo ADR aprovado.

## Split canônico e imutável por padrão

Para cada valor líquido elegível de uma Evidence, aplica-se exatamente:

| Beneficiário | Percentual |
| --- | ---: |
| Mostarda | **30%** |
| Proprietário da TV | **20%** |
| Proprietário do Local | **20%** |
| Vendedor responsável pela campanha | **20%** |
| Influenciador | **10%** |
| Total | **100%** |

Não há percentual configurável por padrão, arredondamento que mude o total ou destinatário implícito. A política é versionada (`SplitPolicyVersion`), mas uma nova versão só pode existir por decisão arquitetural aprovada; a versão canônica inicial é `SPLIT-30-20-20-20-10`. A Evidence guarda a versão e todas as cinco linhas de split. A ausência de vínculo elegível de um destinatário bloqueia a liquidação daquele valor, não redistribui sua parcela.

## Ordem do cálculo e auditabilidade

1. O Pricing Engine calcula e congela o `PricingQuote` ao alocar o Slot: preço calculado, fatores, política e versão de algoritmo.
2. A Evidence append-only registra preço calculado, preço final, preço efetivamente cobrado, impostos, descontos autorizados, moeda, precisão, split aplicado, percentuais, versão da política, TV, Slot, Campaign, playback, telemetria, hash, documento associado e Quantum Anchor.
3. Somente Evidence `VALID`, não revertida, sem disputa e com ancoragem confirmada torna-se elegível.
4. O Settlement forma o valor bruto elegível, registra taxas Asaas, impostos, retenções e reserva de seguro como linhas explícitas; obtém o valor líquido distribuível e aplica os cinco percentuais. Nenhum custo é escondido dentro de uma `SplitShare`.
5. Asaas executa cobrança, notas, transferências e retorna webhooks; Settlement reconcilia cada transação com a linha de origem.

Todo cálculo preserva os valores antes/depois de cada retenção, regra e versão utilizada. Reexecuções são idempotentes por `SettlementCycle + EvidenceId + SplitPolicyVersion`.

## Ciclo, exceções e compensações

| Situação | Tratamento obrigatório |
| --- | --- |
| Campanha pausada, cancelada ou expirada antes da exibição | Revogar Slots futuros; nenhuma Evidence é criada e nenhum valor é liquidado. |
| Falha de exibição | Não há Evidence `VALID`; não há cobrança nem split. Falha após cobrança abre ajuste/estorno rastreável. |
| Cancelamento após exibição válida | Não altera Evidence; gera política de cancelamento, crédito/estorno e linhas compensatórias auditáveis. |
| Chargeback | Bloqueia valores ainda não repassados; valores já repassados tornam-se saldo em recuperação, nunca se reescreve o ciclo fechado. |
| Inadimplência | Cobrança permanece pendente, não autoriza repasse sem política explícita de adiantamento; juros/multa, se existentes, são linhas próprias. |
| Reprocessamento | Cria nova tentativa ligada à tentativa anterior, com motivo, operador/sistema, idempotency key e reconciliação. |
| Disputa de Evidence | Bloqueia somente a linha afetada até resolução; demais Evidences elegíveis não são alteradas. |

## Limites de responsabilidade

`Pricing` decide preço; `Evidence Ledger` prova o fato; `Settlement` decide elegibilidade financeira e composição; `Insurance` administra fundo e sinistro; `Asaas` executa os rails financeiros; `Quantum` ancora hashes, nunca dinheiro. Blockchain não custodia nem movimenta valor.
