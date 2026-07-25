# ADR-004 — Integração com Quantum Cert

- **Status:** Aceito
- **Data:** 2026-07-25

## Contexto

A Mostarda precisa oferecer **prova pública verificável** para interações físicas (NFC, QR) e documentos institucionais, sem expor dados sensíveis nem depender do Edge para responder a consultas externas.

## Decisão

Integramos com **Quantum Cert** como camada de **registro público de prova**.

### Regras de integração

- **NFC não comunica diretamente com o Edge.**
  Uma tag NFC física resolve para uma URL/consulta que aponta ao **Quantum Registry** — nunca ao mini PC da TV.
- **NFC consulta Quantum.**
  A validação e o histórico da interação NFC vivem no Quantum Registry.
- **Mesma regra vale para QR Interaction.**
- **Quantum mantém consulta pública.**
  Qualquer pessoa com o identificador correto pode verificar a existência e integridade de uma interação/documento.
- **Histórico de interações permanece disponível.**
  As interações são acumuladas e consultáveis ao longo do tempo, servindo como prova pública contínua.
- **Hash dos documentos pode ser registrado.**
  Documentos institucionais (contratos, laudos, snapshots do Evidence Ledger) têm seu hash ancorado no Quantum, permitindo verificação sem publicar o conteúdo.

### Adapter no Backend

O Backend expõe um **Quantum Adapter** (Anti-Corruption Layer) que:

- traduz eventos internos em chamadas Quantum;
- guarda o retorno (id da ancoragem, timestamp) junto ao evento de origem;
- é o único ponto do sistema que fala Quantum — nenhum módulo de negócio o chama diretamente.

## Consequências

**Positivas**
- Interações físicas ganham prova pública sem expor o Edge.
- Superfície de ataque no Venue reduzida (NFC/QR não abre porta local).
- Base para verificação de terceiros (auditores, parceiros, imprensa).

**Negativas**
- Dependência externa: Quantum indisponível atrasa ancoragem.
- Latência adicional entre exibição e prova pública consolidada.

**Mitigações**
- Fila de ancoragem com retry e alerta de SLA.
- Evidence é válida internamente antes da ancoragem; ancoragem apenas confere prova pública.
