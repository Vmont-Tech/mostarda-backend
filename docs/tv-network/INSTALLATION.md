# Installation

## Propósito e owner

`Installation` é o Aggregate que registra colocação e verificação física de uma TV. Seu registro é evidência **operacional**, sem relação com Evidence comercial.

Ele cobre TV, Display, MiniPC, periféricos, energia, conectividade, HDMI/sinal, Venue, localização, responsável e checklist de segurança.

## Plano

Uma Installation planejada contém:

- `installationId`, TV e revisão;
- Venue/localização;
- Devices previstos e papéis;
- responsável pela execução e autoridade de aceite;
- checklist versionado;
- janela operacional;
- riscos, dependências e motivo;
- correlação com instalação anterior quando troca/reparo.

## Lifecycle

```text
PLANNED → IN_PROGRESS → VERIFIED → ACCEPTED
IN_PROGRESS → FAILED
PLANNED/IN_PROGRESS/VERIFIED → CANCELLED
```

`ACCEPTED`, `FAILED` e `CANCELLED` são finais. Correção ou nova tentativa cria outra Installation referenciando a anterior.

## Verificação

Cada item do checklist registra resultado, origem, instante, confiança e observação. Resultado posterior não sobrescreve o anterior.

Verificação exige, quando aplicável pela policy:

- identidades Device correspondentes ao plano;
- vínculo físico e lógico;
- energia estável observável;
- Display e sinal HDMI;
- conectividade mínima para provisioning;
- condições de segurança;
- localização/Venue confirmados;
- inventário inicial.

Itens, critérios e tolerâncias quantitativas são `OPEN` até versão aprovada de `InstallationPolicy`.

## Segregação de responsabilidade

Técnico executa e declara checks; autoridade de aceite decide `AcceptInstallation`. A matriz de papéis e exceções é `OPEN`, mas autodeclaração não pode contornar check bloqueante.

Aceite permite iniciar provisioning; não ativa TV e não declara Health.

## Idempotência, ordering e clock

Ordering é por Installation/revisão. `RecordInstallationCheck` repetido com mesma identidade/conteúdo é duplicata; conteúdo divergente é conflito e exige resolução explícita.

Instantes do técnico e do TV Network são preservados. Clock drift não é corrigido silenciosamente; quando a ordem temporal ficar incerta, o registro declara confiança reduzida. Tolerância é `OPEN`.

## Falha, substituição e reparo

Falha encerra a tentativa com causas e itens bloqueantes. Remoção, troca ou reparo:

- cria nova Installation ou Maintenance correlacionada;
- fecha vínculos substituídos;
- preserva fotos/checks/declarações conceituais e decisões anteriores;
- força nova validação dos gates afetados;
- nunca restaura `ACTIVE` por suposição.

## Spoofing e auditoria

Device divergente, serial duplicado, identidade revogada ou declaração incompatível gera conflito e pode quarentenar Device/Edge. Todo Command, check, ator, origem, política, instante e decisão fica append-only.

## Eventos

`InstallationPlanned`, `InstallationStarted`, `InstallationCheckRecorded`, `InstallationVerified`, `InstallationFailed`, `InstallationAccepted` e `InstallationCancelled`.

## Exemplos

**Válido:** todos os checks são registrados, mas a autoridade ainda não aceitou; TV permanece `INSTALLING`.

**Válido:** troca do MiniPC gera nova Installation correlacionada e novo provisioning.

**Contraexemplo:** editar um check `FAILED` para `PASSED`. Deve-se acrescentar novo check e decisão.

**Contraexemplo:** considerar `InstallationAccepted` suficiente para `TvActivated`.
