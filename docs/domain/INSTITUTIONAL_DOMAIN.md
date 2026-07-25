# Domínio Institucional — Três Mundos

| Mundo | O que pertence | O que não pertence |
| --- | --- | --- |
| Físico | TV, MiniPC, Display, Venue, tag NFC, saúde, conectividade, reprodução e sinais locais | preço, split, identidade pessoal, documento público completo |
| Digital | Campaign, Creative Asset, Slot, PricingQuote, usuário, CRM, telemetria, Evidence, Settlement, seguro e Grão | custódia pública de documento completo e execução física remota sem contrato |
| Institucional | hashes de documentos oficiais, recibos de ancoragem, consulta pública, linha do tempo de interação e integridade verificável | Campaign, anunciante, pessoas, preço, pagamento, conteúdo de documento ou comunicação com Edge |

O mundo institucional é implementado pelo Quantum Integration como Anti-Corruption Layer. Ele recebe somente documentos oficiais já preparados pelo Cloud e registra somente hash e metadados mínimos permitidos. Não conhece Edge, campanhas, anunciantes, preços ou pessoas.

## Consulta pública NFC/QR

```text
Usuário → NFC ou QR → Quantum → Consulta pública → Mostarda Link Resolver
        → campanha ativa naquele instante (referência opaca) → timeline permanente de interação
```

QR pertence ao Cloud: emissão, destino dinâmico, validade, revogação, atribuição e histórico são digitais/institucionais. O Edge só renderiza. Cada interação recebe identificador, timestamp, hash/recibo aplicável e trilha pública sem expor dados pessoais ou documentos completos.
