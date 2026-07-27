# Health Monitoring

## Propósito

Health Monitoring transforma sinais operacionais em avaliações explicáveis de saúde. Ele não observa sucesso comercial, Playback, Campaign ou Evidence.

Dimensões possíveis incluem CPU, GPU, memória, armazenamento, temperatura, conectividade, energia, Display/HDMI, processos, Supervisor, Watchdog, integridade de versão, relógio e sincronização. Uma dimensão só participa da decisão quando declarada pela versão vigente da `HealthPolicy`.

## Fato, avaliação e projeção

Os conceitos são diferentes:

- `HealthObservation`: sinal imutável recebido de uma origem;
- `HealthRecord`: avaliação imutável de um subject em uma janela, sob uma política;
- `OperationalHealth`: projeção da avaliação vigente;
- `Diagnosis`: hipótese explicável e versionada, nunca verdade retroativa;
- `FleetHealth`: agregação derivada de HealthRecords individuais.

Health nunca é sobrescrito. Uma nova avaliação cria novo `HealthRecord`; a projeção vigente pode avançar, mas deve apontar para todos os fatos que a sustentam.

## Ownership

`HealthRecord` é criado pelo owner Health Monitoring. Edge fornece sinais, mas não atribui seu próprio HealthScore oficial. Fleet apenas agrega; não modifica Health individual. Reconciler consome a projeção e emite Commands, sem alterar Health.

## Payload conceitual de HealthRecord

| Campo | Significado |
| --- | --- |
| `healthRecordId` | identidade imutável |
| `subjectId` / `subjectType` | TV, Device, EdgeInstallation, processo ou Capability avaliada |
| `assessmentWindow` | intervalo dos sinais considerados |
| `evaluatedAt` | instante da avaliação |
| `policyVersion` | regra exata aplicada |
| `sourceObservationIds` | fatos que sustentam a avaliação |
| `dimensionResults` | resultado, severidade e confiança por dimensão |
| `dataCoverage` | suficiência e atualidade dos sinais |
| `healthScore` | valor derivado conforme política |
| `healthState` | `UNKNOWN`, `HEALTHY`, `DEGRADED` ou `CRITICAL` |
| `confidence` | confiança da avaliação |
| `causes` | causas conhecidas ou hipóteses explicitamente marcadas |
| `previousRecordId` | avaliação anterior comparável, quando houver |
| `correlationId` | operação, rollout, diagnóstico ou incidente relacionado |

Escala, pesos, limiares, janelas, cobertura mínima e fórmula do HealthScore são `OPEN`. Nenhum valor pode ser inventado na implementação.

## Regras de classificação

- `UNKNOWN`: sinais ausentes, antigos, conflitantes ou insuficientes. Nunca equivale a saudável.
- `HEALTHY`: todas as condições obrigatórias da política foram avaliadas e aprovadas.
- `DEGRADED`: operação possível, porém com condição relevante fora do ideal.
- `CRITICAL`: risco operacional ou de segurança que exige bloqueio, quarentena, rollback ou intervenção conforme política.

Uma dimensão crítica não pode ser escondida por média favorável. A política deve declarar dimensões bloqueantes e preservar a razão da classificação.

## Ordering, duplicidade e replay

- Observações são ordenadas por subject e origem quando a origem fornece sequência.
- Duplicata com mesma identidade e conteúdo não cria nova observação.
- Mesma identidade com conteúdo divergente cria conflito e não substitui a primeira.
- Observação atrasada pode aperfeiçoar diagnóstico histórico, mas não regride a projeção vigente sem reavaliação explícita.
- Replay de sessão antiga não recupera Health atual.
- Todo HealthRecord guarda a versão da política, permitindo reprodução lógica da decisão.

## Spoofing, confiança e quarentena

Cada origem possui nível de confiança. Auto-relato do Edge é confrontado com sinais independentes quando disponíveis.

Identidade inválida, conflito persistente, estado impossível ou divergência relevante entre Current e Observed State gera `HealthSignalConflictDetected`. A política pode emitir Command de quarentena. Quarentena:

- retira disponibilidade operacional;
- preserva coleta segura de diagnóstico quando permitido;
- não descomissiona o equipamento;
- só termina por decisão autorizada apoiada em nova observação.

## Diagnóstico

Diagnosis correlaciona Heartbeat, Current State, Observed State, eventos de Device, processos, versões, update e manutenção. Deve registrar:

- sintomas e período;
- evidências operacionais usadas;
- hipóteses e confiança;
- causas descartadas;
- ação recomendada;
- política/versão;
- desfecho posterior.

Diagnosis nunca infere fatos de Campaign, Financeiro, Evidence ou Settlement.

## Fleet Health

Fleet Health é calculado sobre snapshot explícito de membros e janela de avaliação. Preserva:

- `fleetId` e revisão de membership;
- instante/janela;
- população total e população com dados suficientes;
- distribuição por estado;
- dimensões críticas e concentração por versão/região/Venue;
- score agregado e confiança;
- versão da política.

Ausência de dados não pode melhorar o resultado. Quando cobertura for insuficiente, o resultado é `UNKNOWN` ou `INSUFFICIENT_DATA` conforme política, nunca `HEALTHY`.

Pesos, cobertura mínima, limiares de promoção de rollout e fórmula agregada permanecem `OPEN`.

## Eventos

- `HealthObservationRecorded`
- `HealthRecordCreated`
- `OperationalHealthChanged`
- `HealthSignalConflictDetected`
- `DiagnosisCreated`
- `DiagnosisResolved`
- `FleetHealthAssessed`
- `FleetHealthChanged`

## Exemplos

**Válido:** Heartbeats continuam chegando, mas Watchdog detecta ausência de progresso do Player. O Health pode ficar `DEGRADED` ou `CRITICAL` conforme política; liveness não mascara a falha.

**Válido:** uma observação atrasada explica uma falha passada. Cria-se novo diagnóstico histórico sem substituir o HealthRecord emitido naquele momento.

**Contraexemplo:** calcular média da frota excluindo TVs `UNKNOWN`. Isso aumenta artificialmente o score e é proibido.

**Contraexemplo:** sobrescrever `CRITICAL` por `HEALTHY` após retorno do Heartbeat. Recuperação exige nova avaliação completa e mantém ambos os registros.
