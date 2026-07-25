# ADR-005 — Arquitetura Financeira (Asaas)

- **Status:** Aceito
- **Data:** 2026-07-25

## Contexto

A Mostarda movimenta valores entre múltiplos participantes (Anunciante, Dono da TV, Dono do espaço, Vendedor, Influenciador, Mostarda, Fundo de Seguro) para cada Evidence válida. Precisamos de um provedor financeiro que suporte **split nativo**, **emissão de notas fiscais** e **ciclos previsíveis** — sem envolver criptoativos.

## Decisão

Adotamos **Asaas** como provedor financeiro oficial.

### Escopo do Asaas

- **Cobrança do Anunciante** (boleto, cartão, PIX).
- **Split** automático entre os participantes elegíveis, calculado a partir das Evidences do ciclo.
- **Emissão de notas fiscais** dos serviços prestados no ecossistema.
- **Ciclos de pagamento** (fechamento periódico) previsíveis por perfil.
- **Reconciliação** e webhooks para atualização de status no Backend.

### Ausência de cripto (inicialmente)

- Nenhuma custódia, nenhum token, nenhum pagamento em criptomoeda na fase inicial.
- Blockchain permanece **exclusivamente como camada de prova** (ver ADR-003 e ADR-004), nunca como trilha de valor.
- Reavaliar apenas via novo ADR se surgir demanda regulada e clara.

### Ligação com Evidence

- **Nenhum Split é disparado sem Evidence `VALID`.**
- O ciclo de Settlement consome apenas Evidences válidas e ancoradas.
- Divergências entre valor cobrado e valor liquidado geram evento de disputa, nunca ajuste silencioso.

### Adapter no Backend

- Um único **Asaas Adapter** encapsula toda comunicação com o provedor.
- Domínio conhece apenas conceitos internos (`Settlement`, `Split`, `Payout`) — nunca detalhes de API do Asaas.
- Troca de provedor futuro exige apenas novo adapter, sem tocar no domínio.

## Consequências

**Positivas**
- Split, notas e ciclos resolvidos por um provedor especializado.
- Foco da Mostarda permanece em mídia, prova e IA — não em rails financeiros.
- Domínio permanece portável.

**Negativas**
- Dependência de disponibilidade e regras do Asaas.
- Limitações do provedor podem restringir configurações de split muito exóticas.

**Mitigações**
- Adapter estrito com testes de contrato.
- Monitoramento de SLA e reconciliação diária.

## Complemento (2026-07-25) — Settlement Aggregate

Regras de ciclo, `SplitShare` e bloqueios estão em [`AGGREGATES.md`](../domain/AGGREGATES.md) e
[`VALUE_OBJECTS.md`](../domain/VALUE_OBJECTS.md). Asaas nunca conhece blockchain.
