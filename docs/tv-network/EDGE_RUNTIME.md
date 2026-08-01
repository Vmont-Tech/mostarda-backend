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

Edge coleta sinais locais autorizados e fecha cada one-minute bucket as immutable observation. Em conectividade normal, envia os buckets normalmente em five-minute batches sem apagar as cinco fronteiras de minuto. Cada collector reporta `AVAILABLE`, `UNAVAILABLE`, `DISABLED`, `DEGRADED` ou `FAILED`. Wi-Fi and camera absence or failure is explicitly reported; playback continues sem fabricar valores. Telemetry Context, e não Edge, valida, aceita e mantém o Telemetry Ledger e `AudienceProjection`.

Para `CollectorVersion`, o owner Edge Runtime declara inicialmente `VersionSyntax = OPAQUE_TOKEN_V1` conforme `DEC-065`.

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

## Supervisor

Supervisor mantém catálogo versionado de processos críticos, dependências, condição esperada e ação permitida. Uma transição de processo registra estado anterior, estado observado, causa, tentativa, política, instante e resultado.

Supervisor nunca interpreta o trabalho do Player. Pode concluir que o processo não progride; não pode concluir que um anúncio foi ou não exibido.

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

Retenção, capacidade, prioridade entre classes operacionais e tratamento de pressão de armazenamento são `OPEN`. O runtime nunca fabrica confirmação e nunca altera evento antigo para fazê-lo parecer atual.

## Comandos remotos e segurança

Command remoto exige target, identidade, idempotency key, revisão esperada, TTL, motivo, política e autorização. Comando inválido produz rejeição auditável. Falha de autenticação, replay conflitante ou spoofing pode levar a quarentena.

Quarentena bloqueia updates não essenciais e disponibilidade operacional, mas pode permitir diagnóstico mínimo autorizado. A política define o conjunto permitido.

## Auditoria

Boot, shutdown, mudança de versão, mudança de processo, restart, stall, aplicação Desired, sync, rejeição, update, rollback e quarentena produzem eventos. O histórico é append-only.

## Exemplos

**Válido:** Watchdog detecta Player vivo sem progresso, reinicia uma vez conforme política e registra recuperação observada.

**Contraexemplo:** Supervisor marca uma exibição como concluída porque o processo Player não caiu. TV Network não conhece conclusão de Playback.

**Contraexemplo:** Edge volta após período offline e executa Command remoto cujo TTL expirou. Comando expirado deve ser registrado e rejeitado.
