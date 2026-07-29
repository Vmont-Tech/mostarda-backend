# Domain Evolution — Expansão Futura

O domínio deve evoluir sem transformar `Campaign` em Aggregate rígido ou condicional. O contrato atual é estável: Campaign define intenção de veiculação, Slot é a reserva de exibição, Pricing congela preço, Evidence prova, Settlement liquida. Novas modalidades especializam por política/contrato e novos Bounded Contexts quando necessário; não alteram retrospectivamente Campaigns ou Evidences existentes.

## Modalidades previstas

| Modalidade | Evolução de domínio |
| --- | --- |
| Fixed Campaign | Mantém preço e inventário contratados, com política explícita de entrega. |
| Programmatic Campaign | Contexto/adaptador de demanda programática; publica intenção elegível, nunca escreve em Campaign Management diretamente. |
| Auction Campaign | Contexto de leilão dono de lance, clearing e versão de regra; após adjudicação gera contrato/Slot normal. |
| National Campaign | Orquestra alocação multi-região e cotas, preservando Slots, Evidence e Settlement locais. |
| Regional Campaign | Aplica território e políticas regionais, sem duplicar identidade de Campaign. |

Cada expansão declara vocabulário, Aggregate proprietário, eventos, políticas versionadas, compatibilidade com Evidence/Settlement e estratégia de migração. Feature flags não substituem Bounded Context nem mudam invariantes financeiros. Nenhuma modalidade pode contornar preço congelado, Evidence válida ou o split canônico.
