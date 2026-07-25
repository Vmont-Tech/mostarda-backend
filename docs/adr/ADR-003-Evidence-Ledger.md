# ADR-003 — Evidence Ledger

- **Status:** Aceito
- **Data:** 2026-07-25

## Contexto

A promessa central da Mostarda é: **o anunciante só paga o que foi exibido, e cada exibição pode ser provada.** Isso exige um registro atômico, íntegro e auditável de cada exibição — o **Evidence Ledger**.

## Decisão

### Unidade atômica

Cada **Evidence** representa **15 segundos** de exibição de um Asset em uma TV.

### Estrutura mínima de uma Evidence

Cada evento deve conter obrigatoriamente:

- `TV ID` — identidade do dispositivo que exibiu.
- `Campaign ID` — campanha a que pertence o Slot.
- `Slot ID` — instância de reserva executada.
- `timestamp` — instante de conclusão da exibição (com fuso e precisão milissegundos).
- `hash` — hash íntegro do conteúdo do evento (inclui assinatura do Edge).
- `conteúdo exibido` — referência imutável ao Asset (id + hash do arquivo).
- `valor cobrado` — valor definido pelo Dynamic Pricing no momento da alocação.
- `status` — `VALID`, `PENDING_VALIDATION`, `INVALID`, `DISPUTED`.

### Ciclo de vida

1. **Emissão local** — Edge conclui a exibição, calcula hash e assina o evento.
2. **Envio** — Playback Event é enviado ao Backend (ou enfileirado offline).
3. **Validação** — Backend valida assinatura, coerência temporal, existência do Slot, do Asset e do TV ID; verifica ausência de duplicidade.
4. **Materialização** — Evidence é gravada no **Evidence Ledger** (append-only) com status `VALID`.
5. **Ancoragem** — hash é registrado no **Quantum Registry** e/ou blockchain institucional.
6. **Liquidação** — Settlement consome Evidences `VALID` em ciclos e dispara Split via Asaas.

### Integridade é bloqueante

Regra inegociável: **qualquer erro na evidência impede liquidação financeira.**

- Assinatura inválida → `INVALID` → não liquida.
- Referências inconsistentes (Slot inexistente, Asset diferente) → `INVALID` → não liquida.
- Duplicidade detectada → apenas a primeira Evidence válida é considerada.
- Divergência entre valor cobrado e regra de pricing → `DISPUTED` → não liquida até resolução.
- Ancoragem falha → Settlement aguarda ancoragem antes de liberar Split.

### Append-only e auditável

- O Ledger é **append-only**. Correções ocorrem por **eventos compensatórios** (ex: `EvidenceReversed`), nunca por edição destrutiva.
- Snapshots periódicos do ledger são ancorados publicamente para prova de não-adulteração.

## Consequências

**Positivas**
- Fundamento sólido para a promessa de mídia auditável.
- Base para relatórios, disputas, seguros e auditoria fiscal.
- Compatível com prova pública via Quantum/blockchain sem depender deles para pagar.

**Negativas**
- Qualquer falha de integridade trava dinheiro — exige observabilidade forte e SLA de validação.
- Custo operacional maior por evento comparado a um contador simples.

**Mitigações**
- Alertas específicos por tipo de invalidação.
- Ferramenta interna de reprocessamento com trilha de auditoria.
