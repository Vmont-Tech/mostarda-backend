# Domínio Institucional — Três Mundos

| Mundo | O que pertence | O que não pertence |
| --- | --- | --- |
| Físico | TV, MiniPC, Display, Venue, tag NFC, saúde, conectividade, reprodução e sinais locais | preço, split, identidade pessoal, documento público completo |
| Digital | Campaign, Creative Asset, Slot, PricingQuote, usuário, CRM, telemetria, Evidence, Settlement, Hardware Continuity e Grão | custódia pública de documento completo e execução física remota sem contrato |
| Institucional | hashes de documentos oficiais, recibos de ancoragem, consulta pública, linha do tempo de interação e integridade verificável | Campaign, anunciante, pessoas, preço, pagamento, conteúdo de documento ou comunicação com Edge |

O mundo institucional é implementado pelo Quantum Integration como Anti-Corruption Layer. Ele recebe um `Canonical Evidence Package`: representação canônica independente de formato, da qual deriva/verifica o hash e ancora somente o hash e metadados mínimos permitidos. PDF, JSON, CBOR e Protobuf são transportes possíveis do Cloud, nunca contrato do Quantum. Quantum não conhece Edge, campanhas, anunciantes, preços ou pessoas.

## Consulta pública NFC/QR

```text
Usuário → NFC ou QR → Quantum → Consulta pública → Mostarda Link Resolver
        → campanha ativa naquele instante (referência opaca) → timeline permanente de interação
```

QR pertence ao Cloud: emissão, destino dinâmico, validade, revogação, atribuição e histórico são digitais/institucionais. O QR contém somente um token opaco, nunca URL final, destino de anunciante ou regra de resolução. Cloud resolve o token no instante da consulta, mitigando cache, fraude, reutilização de QR antigo e manipulação. O Edge só renderiza. Cada interação recebe identificador, timestamp, hash/recibo aplicável e trilha pública sem expor dados pessoais ou documentos completos.
