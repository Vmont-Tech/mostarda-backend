# Update Management

## Propósito e owner

Update Management governa mudanças versionadas de Edge, Player, Canvas, Capability Manifest, OS e Firmware. `UpdateRollout` é o Aggregate owner do plano e das ondas; `EdgeInstallation` é owner da aplicação em uma TV.

Uma atualização só é elegível quando possui:

- identidade e versão imutáveis;
- origem e integridade verificadas;
- escopo de componente explícito;
- compatibilidade declarada;
- política e autorização vigentes;
- Maintenance Window aplicável;
- Health gate prévio;
- condição de sucesso observável;
- estratégia de rollback aprovada.

Atualização nunca é forçada fora de política.

## Plano de rollout

O plano preserva:

- `rolloutId`, versão e objetivo operacional;
- componente/versão origem e destino;
- política de compatibilidade;
- política de rollout e rollback;
- critérios de inclusão/exclusão;
- snapshot dos membros de cada onda;
- Maintenance Windows;
- gates pré-update, pós-aplicação e de observação;
- timeouts, retries e regras de pausa;
- ator, aprovação, motivo e correlação.

Critérios quantitativos de tamanho de onda, intervalo, taxa de falha, período de observação e promoção são `OPEN`.

## State Machine do rollout

```text
DRAFT → VALIDATED → SCHEDULED → WAVE_RUNNING
WAVE_RUNNING → PAUSED → WAVE_RUNNING
WAVE_RUNNING/PAUSED → ROLLING_BACK
WAVE_RUNNING → COMPLETED
PAUSED → CANCELLED
ROLLING_BACK → ROLLED_BACK | FAILED
qualquer execução irrecuperável → FAILED
DRAFT/VALIDATED/SCHEDULED → CANCELLED
```

`COMPLETED`, `CANCELLED`, `ROLLED_BACK` e `FAILED` são finais. Rollout em execução deve ser pausado antes de cancelamento; cancelar não desfaz membros já atualizados.

## State Machine da onda

```text
PENDING → READY → RUNNING → OBSERVING → PASSED
READY/RUNNING/OBSERVING → PAUSED
RUNNING/OBSERVING → FAILED → ROLLING_BACK → ROLLED_BACK/ROLLBACK_FAILED
PENDING/READY/PAUSED → CANCELLED
```

Uma onda só fica `PASSED` após período de observação e Health/Fleet gates previstos. ACK de instalação não é sucesso da onda.

## Seleção e ordering

Membership de onda é snapshot imutável. Mudanças posteriores na Fleet não alteram a onda em execução.

Ordering:

- ondas são promovidas na ordem do plano;
- por EdgeInstallation, apenas uma mudança incompatível pode executar;
- componentes seguem ordem de dependência declarada;
- resultado individual é ordenado por tentativa;
- eventos tardios não reabrem estado final; iniciam reconciliação ou nova tentativa.

## Execução individual

Para cada membro:

1. validar identidade, versão atual e revisão;
2. confirmar Maintenance Window e Health gate;
3. emitir `ApplyUpdate`;
4. registrar ACK separadamente de conclusão;
5. observar Current State e Version Inventory;
6. avaliar Health pelo período da política;
7. concluir, pausar, diagnosticar ou iniciar rollback.

Falha individual é preservada e não reescreve versão anterior. A política decide se a onda continua, pausa ou reverte; não existe tolerância implícita.

## Duplicidade, timeout e retry

- `ApplyUpdate` é idempotente por EdgeInstallation, rollout, onda, componente e versão destino.
- Mesma chave com destino diferente é conflito.
- Retry reutiliza a intenção da tentativa e cria registro de tentativa correlacionado.
- Timeout de ACK, aplicação e observação são distintos.
- Resultado tardio é registrado, mas não altera silenciosamente decisão já final.
- Após reconexão, Current State é reconciliado antes de repetir a aplicação.

Valores de timeout, tentativas e backoff são `OPEN`.

## Health e Fleet gates

Cada gate registra política, janela, população, cobertura, baseline e resultado. `UNKNOWN` ou cobertura insuficiente não podem ser tratados como aprovação.

Uma dimensão crítica individual não pode ser escondida pelo FleetScore. A promoção de onda exige os critérios explícitos da política; sem política quantitativa aprovada, a promoção automática é proibida.

## Segurança, spoofing e quarentena

Versão sem origem/integridade confiável, incompatível ou divergente da solicitada é rejeitada. Divergência entre versão reportada e observada gera diagnóstico e pode quarentenar a EdgeInstallation.

Quarentena retira o membro da promoção automática. Ela não autoriza substituir histórico nem aplicar versão arbitrária.

## Eventos

- `UpdateRolloutCreated`
- `UpdateRolloutValidated`
- `UpdateScheduled`
- `UpdateWaveStarted`
- `UpdateWavePaused`
- `UpdateWaveResumed`
- `UpdateApplicationRequested`
- `UpdateAcknowledged`
- `UpdateApplied`
- `UpdateObservationPassed`
- `UpdateFailed`
- `UpdateWavePassed`
- `UpdateRolloutCompleted`
- `UpdateRolloutCancelled`
- `UpdateRollbackStarted`
- `UpdateRolledBack`
- `UpdateRollbackFailed`

## Exemplos

**Válido:** uma onda instala a versão, mas Fleet Health fica `UNKNOWN` por baixa cobertura. A onda permanece em observação ou pausa; não promove.

**Válido:** Edge reconecta reportando versão destino já aplicada após timeout. O resultado tardio é registrado e reconciliado antes de qualquer retry.

**Contraexemplo:** recalcular dinamicamente os membros da onda após iniciá-la. Isso destrói a população de auditoria.

**Contraexemplo:** considerar rollout concluído apenas porque todos os dispositivos emitiram ACK. Conclusão exige versão e Health observados.
