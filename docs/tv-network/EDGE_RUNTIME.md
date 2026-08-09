# Edge Runtime

## Responsabilidade

Edge Runtime é o envelope operacional identificado que roda no MiniPC. Seu owner de domínio é `EdgeInstallation`.

Ele:

- inicia e supervisiona processos autorizados;
- mantém inventário de versão;
- aplica Commands operacionais válidos;
- reporta Current State, Heartbeat e sinais de Health;
- preserva backlog operacional durante desconexão;
- executa restart, diagnóstico, update e rollback conforme política.

Ele não contém regras de Campaign, anúncio, Pricing, Financeiro, Evidence ou Settlement. Player e Canvas são conhecidos apenas como processos, versões e dependências operacionais; seu conteúdo interno permanece fora de TV Network.

Edge coleta sinais locais autorizados e encaminha observações com sua origem, identidade e sequência. O Edge não fecha nem possui os buckets canônicos: o Telemetry Context valida as observações e fecha cada one-minute bucket as immutable observation, mantém o Telemetry Ledger e produz `AudienceProjection`. Em conectividade normal, os buckets aceitos são enviados em five-minute batches sem apagar as cinco fronteiras de minuto. Cada collector reporta `AVAILABLE`, `UNAVAILABLE`, `DISABLED`, `DEGRADED` ou `FAILED`. Wi-Fi and camera absence or failure is explicitly reported; playback continues sem fabricar valores.

Para `CollectorVersion`, o owner Edge Runtime declara inicialmente `VersionSyntax = OPAQUE_TOKEN_V1` e referencia `CONTRACT_COMPATIBILITY.md`, contrato canonical `DEC-065`, sem repetição local.

QR and NFC bypass Edge. Edge only renders QR fornecido pelo Cloud; não recebe, resolve, redireciona nem fabrica interação de QR ou tag. A pessoa interage diretamente com o fluxo público Cloud/Quantum.

## Identidade e sessão

Cada instalação possui `EdgeInstallationId` distinto do `DeviceIdentifier` e do `TVIdentifier`. Uma reinstalação que rompe a continuidade de identidade cria nova EdgeInstallation ou nova revisão conforme política; nunca reutiliza credencial revogada.

Cada boot cria `bootSessionId` não reutilizável. Sequências de Heartbeat, Current State e logs operacionais são monotônicas dentro da sessão.

## Componentes conceituais

| Componente | Responsabilidade |
| --- | --- |
| Runtime Controller | aplica intenção operacional autorizada e reporta resultado |
| Supervisor | conhece processos críticos, dependências e estados esperados |
| Watchdog | verifica progresso real, não apenas existência do processo |
| Restart Policy | limita, espaça e encerra tentativas de recuperação |
| State Reporter | produz Current State versionado |
| Sync Manager | reapresenta fatos pendentes sem criar duplicatas |
| Version Inventory | declara Edge, Player, Canvas, Capability Manifest, OS e Firmware |
| Security Guard | rejeita comando inválido, expirado, revogado ou incompatível |

## Estado da EdgeInstallation

```text
UNINSTALLED → INSTALLING → HEALTHY
HEALTHY ↔ DEGRADED
HEALTHY/DEGRADED → UPDATING → HEALTHY/DEGRADED/FAILED
UPDATING/FAILED → ROLLING_BACK → HEALTHY/DEGRADED/FAILED
qualquer não final → QUARANTINED
FAILED/QUARANTINED → INSTALLING, somente por recuperação autorizada
qualquer não final → DECOMMISSIONED
```

`DECOMMISSIONED` é final. Estados operacionais não substituem HealthRecord: refletem a condição do Aggregate conforme fatos aceitos.

### Mapeamento canônico entre estados

As máquinas locais continuam pertencendo aos seus respectivos contratos. A única máquina pública da frota é a de `EdgeInstallation`, cujo owner é TV Network. O mapeamento abaixo é a única tradução autorizada entre sinais locais e o estado operacional público:

| Estado público `EdgeInstallation` | Condição de entrada observável | Estados locais que não devem ser publicados como equivalentes |
| --- | --- | --- |
| `UNINSTALLED` | não existe instalação aceita ou identidade operacional registrada | qualquer estado de Runtime ainda não iniciado |
| `INSTALLING` | Installer ou Provisioning possui operação ativa antes da confirmação pós-provisioning | `PREPARING`, `WRITING` ou `ACTIVATING` não são estados de EdgeInstallation |
| `UPDATING` | OTA possui operação ativa entre staging e confirmação, sem rollback em curso | `STAGED`, `VERIFIED`, `BOOTED` e `CONFIRMED` permanecem estados de OTA |
| `ROLLING_BACK` | OTA ou Recovery executa rollback autorizado | `ROLLBACK_REQUIRED` e `RECOVERY_REQUIRED` permanecem estados de processo |
| `QUARANTINED` | Security ou TV Network declarou bloqueio operacional por identidade, integridade ou comprometimento | `SAFE_MODE` do Runtime não é, sozinho, quarentena |
| `FAILED` | não há estado operacional válido após uma falha e não existe caminho ativo de rollback/recovery | `FAILED` de um módulo não encerra a EdgeInstallation por si só |
| `DEGRADED` | Runtime/OS continuam operáveis com limitações declaradas ou capability opcional indisponível | `WAITING_FOR_DEPENDENCY` e `DEGRADED` de um módulo não são publicados sem avaliação do Aggregate |
| `HEALTHY` | Current State autenticado, OS `ACTIVE`, Runtime `ACTIVE`/`READY`, Player `HEALTHY`, identidade e Security verificadas e nenhum gate obrigatório pendente | nenhum estado `UNKNOWN`, `UNHEALTHY` ou `SAFE_MODE` pode ser tratado como saudável |
| `DECOMMISSIONED` | encerramento definitivo autorizado | terminal; não há transição implícita de retorno |

Quando mais de uma condição for verdadeira, aplica-se a precedência: `DECOMMISSIONED` → `QUARANTINED` → `ROLLING_BACK` → `UPDATING` → `INSTALLING` → `FAILED` → `DEGRADED` → `HEALTHY`. A decisão e os sinais usados permanecem no Health/EdgeInstallation history; o Runtime não altera o Aggregate diretamente.

## Supervisor

Supervisor mantém catálogo versionado de processos críticos, dependências, condição esperada e ação permitida. Uma transição de processo registra estado anterior, estado observado, causa, tentativa, política, instante e resultado.

Supervisor nunca interpreta o trabalho do Player. Pode concluir que o processo não progride; não pode concluir que um anúncio foi ou não exibido.

### Fronteira de supervisão

- **Edge OS** supervisiona o processo do Edge Runtime, fornece watchdog de sistema, limites de recursos e a ação mínima para reiniciar ou isolar o Runtime.
- **Edge Runtime** supervisiona apenas os módulos registrados sob seu contrato (Player, Store, OTA, Recovery, Security e Telemetry), mantendo seus próprios resultados e orçamento de restart.
- **Player** observa a própria reprodução e publica `PlayerHealth`/`PlaybackResult`; o Runtime não transforma liveness em fato de Playback.
- **Recovery** executa o Recovery Plan quando o Runtime ou OS não conseguem restaurar um estado seguro; não recebe autoridade do Supervisor para escolher outro plano.

O mesmo processo não pode ser reiniciado por OS e Runtime simultaneamente. Uma falha do processo Runtime é fato do OS e inicia a recuperação do Runtime; uma falha de módulo é fato do Runtime e segue sua Restart Policy. Causalidade e identidade da operação são preservadas no evento público correspondente.

## Watchdog e Restart Policy

Watchdog observa sinais de progresso definidos para cada processo. `running` sem progresso pode ser falha.

Ao detectar falha:

1. registra `WatchdogStallDetected`;
2. consulta Restart Policy;
3. emite `RestartProcess` quando permitido;
4. observa o resultado até timeout;
5. repete somente dentro do orçamento da política;
6. ao esgotar tentativas, cria diagnóstico e degrada, falha ou quarentena conforme severidade.

Quantidade de tentativas, backoff, timeout e período de estabilidade são `OPEN`. Restart infinito, ocultação da causa e zerar contador por reinício do processo são proibidos.

## Desired, Current e Observed State

- `DesiredState`: intenção imutável e versionada publicada pelo Cloud para uma EdgeInstallation.
- `CurrentState`: declaração autenticada do Edge sobre o que aplicou e executa.
- `ObservedState`: projeção independente construída pelo TV Network a partir de sinais aceitos.

Current State contém versões, processos, configuração operacional permitida, revisão Desired aplicada, conectividade e estado de sync. Não contém fila comercial, anúncio, preço ou Evidence.

Edge aplica apenas revisão Desired:

- destinada à sua identidade;
- posterior à última revisão aplicada;
- íntegra, autorizada e não expirada;
- compatível com sua política e maintenance window;
- sem conflito com operação de prioridade superior.

Divergência não é corrigida por mutação direta. O Reconciler emite Command específico e aguarda novo Current/Observed State.

## Conectividade e sincronização

Perda do Cloud não interrompe programação assinada e válida em cache. PlaybackEvents e Telemetry são enfileirados separadamente e sincronizados após reconexão. Edge nunca repete conteúdo além dos Slots autorizados. Esgotada a programação ou interrompido um Creative antes de seu final natural, Player usa fallback institucional local pelo período aplicável; tela preta por ausência de conteúdo é proibida enquanto o hardware puder renderizar. A falha preserva causa, estágio, duração, diagnóstico e versões e é enviada ao Cloud imediatamente ou após reconexão.

Falha comprovadamente isolada no Creative bloqueia somente seu checksum/versão e permite a execução dos demais conteúdos previamente validados. Falha do equipamento, Edge, Player, saída ou causa desconhecida suspende imediatamente a execução paga local, mesmo antes da confirmação do Cloud. Nessa condição o Edge mantém fallback institucional e diagnóstico seguro. O Cloud recebe os fatos e TV Network atualiza a disponibilidade operacional sem conhecer Campaign, preço ou cobrança.

Para solicitar recuperação, Edge executa verificação automática das capacidades observáveis, incluindo processos, versões, integridade, armazenamento, decodificação, renderização e saídas que o hardware consiga medir. Em seguida reproduz integralmente um asset institucional de teste e preserva os fatos assinados. A ausência de sensor ou capacidade não é convertida em sucesso: o campo fica não comprovado e a recuperação segue para atendimento. O Edge não se autodeclara disponível; TV Network avalia as provas recebidas.

## Expediente e turnos de apuração

Edge recebe o expediente vigente do Venue recortado pelas faixas civis fixas `00/06/12/18/24`, conforme horário aplicável ao Venue. Ele não calcula períodos nem horários por conta própria e rejeita configuração destinada a outra TV/EdgeInstallation. Confirma início do expediente, cada marco aplicável e encerramento, incluindo identidade, sequência, clock local, revisão da programação, cobertura, posições das filas, reproduções, falhas, fallback, health e telemetria disponível. O marco não reinicia o Player, não encerra filas e não altera Slots; apenas fecha e envia o consolidado operacional do período anterior.

Falha técnica é emitida imediatamente e nunca espera a troca ou o fechamento do período. Entre marcos, confirmações curtas de continuidade permitem detectar indisponibilidade sem acumular horas de execução incerta. Se o Cloud estiver indisponível, o Edge preserva o fato original e o envia após reconexão, sem trocar timestamp ou identidade. O período pode ser fechado com lacuna explícita, mas não como íntegro por presunção.

Conectividade possui estados conceituais `UNKNOWN`, `ONLINE`, `INTERMITTENT`, `OFFLINE` e `RECOVERING`, derivados por política.

Fatos pendentes preservam identidade, ordering key e instante original. Na reconexão:

- o Edge informa ponto de confirmação conhecido;
- reapresenta fatos originais;
- duplicatas são ignoradas deterministicamente;
- gaps e descarte inevitável são declarados;
- mensagens expiradas não são executadas;
- Current State atual é enviado separadamente do replay histórico.

Retenção, capacidade, prioridade entre classes operacionais e tratamento de pressão de armazenamento são parâmetros obrigatórios do `HardwareProfile`/`InstallationProfile` e da configuração operacional vigente. Eles não podem ser omitidos em um perfil de produção, mas também não são valores globais inferidos pelo Runtime. O runtime nunca fabrica confirmação e nunca altera evento antigo para fazê-lo parecer atual.

## Eventos públicos derivados do Runtime

`RuntimeCommand`, `RuntimeResult` e `RuntimeHealth` são contratos locais. Eles não são eventos públicos de TV Network. O adaptador autorizado de `EdgeInstallation` traduz resultados locais para os eventos já definidos em [`TV_NETWORK_EVENTS.md`](TV_NETWORK_EVENTS.md), preservando `operationId`, `commandId`, `correlationId`, `causationId`, sessão de boot e digest:

| Resultado/fato local | Evento público autorizado | Produtor público |
| --- | --- | --- |
| Desired State aplicado e Current State autenticado | `CurrentStateReported` | `EdgeInstallation` a partir do Edge |
| tentativa de restart autorizada | `ProcessRestartRequested` | `EdgeInstallation` |
| restart concluído ou falho | `ProcessRestarted` / `ProcessRestartFailed` | `EdgeInstallation` |
| watchdog detectou ausência de progresso | `WatchdogStallDetected` | `EdgeInstallation` |
| operação remota concluída, rejeitada, expirada ou cancelada | `RemoteOperationSucceeded` / `RemoteOperationFailed` / `RemoteOperationTimedOut` / `RemoteOperationRejected` / `RemoteOperationExpired` / `RemoteOperationCancelled` | owner do target/coordinator |

`ObservedStateDerived` continua sendo projeção do TV Network. Nenhum módulo Edge publica esse evento como se fosse um fato local.

## Comandos remotos e segurança

Command remoto exige target, identidade, idempotency key, revisão esperada, TTL, motivo, política e autorização. Comando inválido produz rejeição auditável. Falha de autenticação, replay conflitante ou spoofing pode levar a quarentena.

Quarentena bloqueia updates não essenciais e disponibilidade operacional, mas pode permitir diagnóstico mínimo autorizado. A política define o conjunto permitido.

## Auditoria

Boot, shutdown, mudança de versão, mudança de processo, restart, stall, aplicação Desired, sync, rejeição, update, rollback e quarentena produzem eventos. O histórico é append-only.

## Exemplos

**Válido:** Watchdog detecta Player vivo sem progresso, reinicia uma vez conforme política e registra recuperação observada.

**Contraexemplo:** Supervisor marca uma exibição como concluída porque o processo Player não caiu. TV Network não conhece conclusão de Playback.

**Contraexemplo:** Edge volta após período offline e executa Command remoto cujo TTL expirou. Comando expirado deve ser registrado e rejeitado.
