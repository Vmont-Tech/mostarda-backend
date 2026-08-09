# Provisioning

## Propósito e ownership

Provisioning é workflow de domínio que transforma uma TV `INSTALLED` em infraestrutura identificada e avaliável. Ele coordena owners, mas não altera Aggregate diretamente.

Participantes:

- `TV`: ciclo de vida;
- `DeviceRegistry`: MiniPC/Display e vínculos;
- `Installation`: aceite físico;
- `EdgeInstallation`: identidade e runtime;
- `TVCapability`: declarações operacionais;
- Health Monitoring e Reconciler: observação independente.

`EdgeInstallationId` e sua credencial operacional pertencem à instalação lógica do runtime. Eles não são aliases de `TVIdentifier` ou `DeviceIdentifier`. Uma EdgeInstallation referencia uma TV e um MiniPC durante sua vigência; substituição física encerra a instalação anterior e cria outra identidade/credencial, preservando toda a linha do tempo. `EdgeInstallationIdentifier` é uma referência histórica ao mesmo campo, não um contrato concorrente.

## Pré-condições

Provisioning só começa quando:

- TV está `INSTALLED`;
- Installation está `ACCEPTED`;
- Venue, localização e owner estão referenciados;
- Display e MiniPC estão registrados e vinculados;
- nenhum Device essencial está quarentenado/decommissioned;
- ator, policy e revisão de provisionamento estão definidos.

## Sequência normativa

1. `StartTVProvisioning`;
2. `CreateEdgeInstallation`;
3. `StartEdgeProvisioning`;
4. emitir e registrar identidade Edge ligada ao MiniPC;
5. estabelecer uma nova sessão confiável;
6. registrar Version Inventory;
7. declarar e validar Capability Manifest;
8. publicar Desired State inicial;
9. receber Current State e primeiro Heartbeat válidos;
10. derivar Observed State;
11. criar HealthRecord inicial;
12. reconciliar Desired/Current/Observed;
13. `ActivateTV` somente se todos os gates forem aprovados.

Etapa concluída não é inferida pela tentativa da etapa seguinte. Cada passo produz Event.

## Revisão, idempotência e ordering

Cada tentativa possui `provisioningRevision` monotônica por TV e correlação única.

- Repetir Command da mesma revisão e conteúdo retorna resultado anterior.
- Conteúdo divergente na mesma revisão é conflito.
- Evento atrasado de revisão anterior completa histórico, mas não ativa revisão corrente.
- Nova tentativa após falha cria nova revisão e referencia a anterior.
- Identidade Edge revogada não pode ser reutilizada em reprovisionamento.

## Falha, timeout e retry

Cada etapa pode terminar `SUCCEEDED`, `FAILED`, `TIMED_OUT`, `REJECTED` ou `BLOCKED`. Retry depende da natureza:

- falha transitória pode repetir Command idempotente;
- falha de identidade/segurança exige quarentena e decisão;
- incompatibilidade exige nova versão/manifesto;
- ausência de Heartbeat/Health mantém `PROVISIONING` ou leva a `SUSPENDED`;
- timeout não equivale a falha física e inicia reconciliação.

Timeouts, quantidade de retries e janela de estabilidade são `OPEN`.

## Spoofing e quarentena

Primeiro boot não é prova suficiente de identidade. Conflito de Device, chave, sessão, serial ou manifesto impede ativação e gera quarentena conforme política.

Edge quarentenado pode fornecer diagnóstico mínimo autorizado, mas não conclui provisioning nem anuncia Capability.

## Auditoria

Cada revisão preserva pré-condições, identidades, versões, manifesto, Desired/Current/Observed State, HealthRecords, Commands, Events, ator, policy, tentativas e resultado.

## Exemplos

**Válido:** primeiro Heartbeat chega, mas Capability ainda está `DECLARED`; TV permanece `PROVISIONING`.

**Válido:** Current State de uma revisão antiga chega após reprovisionamento. É registrado como atrasado e não altera a tentativa corrente.

**Contraexemplo:** ativar a TV porque o técnico marcou Installation como aceita sem Health independente.

**Contraexemplo:** reutilizar credencial da EdgeInstallation anterior após troca do MiniPC.
