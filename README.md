# Mostarda Backend

Repositório oficial do backend da plataforma **Mostarda**.

Fase atual: fundação, contratos e primeiro walking skeleton local. O slice E2E abaixo é uma simulação de desenvolvimento; ele não homologa hardware nem autoriza provisioning.

## Documentação

Toda a documentação vive em [`/docs`](./docs). Comece por:

- [`docs/specification/PLATFORM_SPECIFICATION.md`](./docs/specification/PLATFORM_SPECIFICATION.md) — documento-mestre oficial em revisão
- [`docs/README.md`](./docs/README.md) — índice geral
- [`docs/product/VISION.md`](./docs/product/VISION.md)
- [`docs/product/PRODUCT_BIBLE.md`](./docs/product/PRODUCT_BIBLE.md)
- [`docs/product/BUSINESS_FOUNDATION.md`](./docs/product/BUSINESS_FOUNDATION.md)
- [`docs/product/GO_TO_MARKET.md`](./docs/product/GO_TO_MARKET.md)
- [`docs/architecture/ARCHITECTURE_OVERVIEW.md`](./docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [`docs/domain/DOMAIN_DICTIONARY.md`](./docs/domain/DOMAIN_DICTIONARY.md)
- [`docs/execution/`](./docs/execution) — Commands, Events, State Machines e Sagas
- [`docs/financial/FINANCIAL_ARCHITECTURE.md`](./docs/financial/FINANCIAL_ARCHITECTURE.md)
- [`docs/tv-network/TV_NETWORK_ARCHITECTURE.md`](./docs/tv-network/TV_NETWORK_ARCHITECTURE.md)
- [`docs/adr/`](./docs/adr) — Architecture Decision Records

## Princípios não-negociáveis

- Blockchain não é utilizada para pagamentos; atua apenas como camada de prova institucional.
- Asaas é o responsável financeiro (split, notas e ciclos).
- Edge é leve e não carrega regras complexas de negócio.
- O sistema é orientado a eventos.
- Evidence Ledger é pré-requisito para liquidação financeira.

## Real Edge Runtime (software/Linux)

O marco seguinte substitui o `SimulatedEdge` por `RealEdgeRuntime`. Ele usa identidade persistente, armazenamento JSON atômico configurável, cache de manifesto/asset, fila persistente de telemetria/evidência, retomada offline após reinício e entrega idempotente para a superfície HTTP Edge do `apps/cloud-api` (`/v1/edge/*`).

```bash
npm run edge:e2e
npm run edge:diagnostics
npm run edge:hardware:validate
```

Esses comandos validam software em Linux/Windows, não homologam o MXQ. O diagnóstico marca GPU, display, codecs, bootloader, Secure Boot e recovery como `UNKNOWN` quando não há evidência física. A validação permanece `SOFTWARE_VERIFIED`, com `compatibility: UNKNOWN` e `provisioning: BLOCKED`.

`DeterministicPlayer` continua reservado ao teste E2E determinístico. O `Browser Player`, servido em `/player`, é o artefato visual executável; eles não são a mesma implementação e compartilham somente os contratos do slice.

O bootstrap configurável usa `loadEdgeRuntimeSettings`/`createEdgeRuntimeFromSettings` com um JSON externo contendo `edgeId`, `environment`, `cloudEndpoint`, `syncIntervalSeconds`, `cacheDirectory`, `telemetryRetry` e `player`. O Runtime recebe o transporte HTTP por injeção; nenhum endpoint de produção é codificado no processo.

O Runtime depende de `EdgeCloudClient` e dos contratos `edge-cloud-v1`; o adapter HTTP traduz esses contratos para `/v1/edge/*`. As rotas `/v1/demo/*`, `DemoCloudStore` e `DEMO_*` permanecem exclusivas do walking skeleton do PR #7.

## E2E Minimum Functional Slice

O repositório possui um walking skeleton local para validar a primeira cadeia executável sem tocar em hardware físico:

`Cloud → Campaign/Manifest → Simulated Edge → Player → Playback → Telemetry/Evidence → Cloud`

Ele é explicitamente uma simulação de desenvolvimento (`DEVELOPMENT_SIMULATION`) e usa o Edge determinístico `edge-demo-001`. Não promove o MXQ, não cria `InstallationProfile`, não executa provisioning e não reivindica audiência humana.

### Executar

Com Node.js 24 ou superior:

```bash
npm run mostarda:e2e
```

O comando sobe o `cloud-api` em memória, cria uma campanha/manifesto determinísticos, sincroniza o conteúdo para o armazenamento local do Edge simulado, reproduz o criativo, envia os eventos e imprime a evidência de execução produzida.

Para abrir o player no navegador, inicie a API em modo de demonstração:

```powershell
$env:MOSTARDA_DEMO_MODE="1"
npm run dev:api
```

Depois abra `http://127.0.0.1:3333/player` (ou a porta configurada). A página é um player browser-executável mínimo, servido pela mesma API, e usa o manifesto e o asset locais da demonstração.

### O que o teste comprova

- campanha e manifesto existem no Cloud;
- o Edge faz cache do manifesto e do asset antes da reprodução;
- o Player registra `player.started`, `playback.started` e `playback.completed`;
- o Cloud recebe telemetria idempotente e uma `PLAYBACK_EXECUTION_OBSERVATION` imutável;
- se o Cloud fica indisponível depois do cache, o Edge continua reproduzindo e sincroniza a fila quando a conexão retorna.

O slice não persiste em PostgreSQL nem em infraestrutura distribuída: seu modo offline é explicitamente uma **in-memory offline simulation**, deliberadamente limitado à demonstração local. O caminho de contratos permanece substituível por adaptadores reais sem exigir mudança no contrato de campanha, manifesto, Player, telemetria ou evidência.

`DeterministicPlayer` é usado apenas pelo teste E2E para produzir relógio, IDs e resultados determinísticos. O `Browser Player`, servido em `/player`, é o artefato visual executável no navegador. Eles ainda não são a mesma implementação; compartilham apenas os contratos do slice.
