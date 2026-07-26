# Mostarda Backend

Repositório oficial do backend da plataforma **Mostarda**.

Fase atual: **fundação e documentação**. Nenhum código de aplicação foi implementado ainda.

## Documentação

Toda a documentação vive em [`/docs`](./docs). Comece por:

- [`docs/README.md`](./docs/README.md) — índice geral
- [`docs/product/VISION.md`](./docs/product/VISION.md)
- [`docs/product/PRODUCT_BIBLE.md`](./docs/product/PRODUCT_BIBLE.md)
- [`docs/product/BUSINESS_FOUNDATION.md`](./docs/product/BUSINESS_FOUNDATION.md) — constituição de negócio
- [`docs/product/GO_TO_MARKET.md`](./docs/product/GO_TO_MARKET.md) — estratégia do piloto e liquidez inicial
- [`docs/architecture/ARCHITECTURE_OVERVIEW.md`](./docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [`docs/domain/DOMAIN_DICTIONARY.md`](./docs/domain/DOMAIN_DICTIONARY.md)
- [`docs/adr/`](./docs/adr) — Architecture Decision Records

## Princípios não-negociáveis

- Blockchain **não** é utilizada para pagamentos.
- Blockchain atua **apenas como camada de prova institucional**.
- **Asaas** é o responsável financeiro (split, notas, ciclos).
- **Edge** é leve e não carrega regras complexas de negócio.
- Sistema é **orientado a eventos**.
- **Evidence Ledger** é pré-requisito para qualquer liquidação financeira.
