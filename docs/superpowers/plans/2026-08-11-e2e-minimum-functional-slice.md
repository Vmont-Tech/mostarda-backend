# E2E Minimum Functional Slice

## Objetivo

Entregar um walking skeleton local e determinístico para o fluxo:

`Cloud → Campaign/Manifest → Edge Runtime → Player → Playback → Telemetry/Evidence → Cloud`.

O slice usa somente um Edge simulado (`edge-demo-001`) e um fixture de campanha de desenvolvimento. Ele não promove o MXQ, não cria perfis de instalação e não executa provisioning.

## Contratos e limites

- Reutilizar `apps/cloud-api` como único ponto de entrada HTTP.
- Manter os contratos de Discovery, Compatibility, Hardware Profile e Provisioning intactos.
- Marcar todos os artefatos do slice como `DEVELOPMENT_SIMULATION`.
- Evidência representa somente execução de playback verificável; não representa audiência, pessoas ou impressão legal/financeira.
- O conteúdo oficial do Edge simulado vive em armazenamento local; Cloud é usado para sincronização e ingestão.

## Sequência de implementação

1. Criar testes de contrato e E2E para campanha, manifesto, cache local, reprodução, eventos, evidência e modo offline.
2. Implementar `packages/e2e-slice` com contratos, Cloud store, Edge simulado, Player determinístico e orquestrador E2E.
3. Adicionar rotas `/v1/demo/*` somente quando `demoMode` estiver habilitado no `cloud-api`.
4. Adicionar `/player` como uma página browser-executável mínima, sem dashboard.
5. Adicionar `npm run mostarda:e2e` e documentação operacional no README.
6. Executar `npm run test:all`, `npm run typecheck`, `git diff --check` e a suíte específica do slice; revisar todo o diff antes de abrir o PR.

## Arquivos previstos

- `packages/e2e-slice/src/contracts.ts`
- `packages/e2e-slice/src/cloud.ts`
- `packages/e2e-slice/src/edge.ts`
- `packages/e2e-slice/src/player.ts`
- `packages/e2e-slice/src/e2e.ts`
- `packages/e2e-slice/src/index.ts`
- `apps/cloud-api/src/server.ts`
- `apps/cloud-api/src/player-assets.ts`
- `scripts/run-mostarda-e2e.ts`
- `tests/e2e/mostarda-e2e.test.ts`
- `README.md`

## Critérios de aceite

- O teste E2E prova a cadeia completa e encontra um `ExecutionEvidence` imutável no Cloud store.
- Eventos mínimos presentes: `edge.started`, `manifest.synced`, `player.started`, `playback.started`, `playback.completed`, `telemetry.sent`.
- Offline: após o cache, a reprodução continua com o Cloud indisponível e os eventos são sincronizados depois.
- O mesmo fixture e o mesmo relógio produzem IDs, hashes e resultados determinísticos.
- Nenhum caminho do slice chama o MXQ ou altera estado físico.
