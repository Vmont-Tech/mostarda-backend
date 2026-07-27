# Arquitetura de Escalabilidade

## 1. Propósito

Este documento especifica como a Mostarda cresce sem mudar o significado do domínio. Escalabilidade não é autorização para relaxar invariantes, duplicar owners ou substituir consistência por “última escrita vence”.

O problema central não é apenas processar mais volume. É preservar, sob concorrência, atraso, duplicidade, desconexão e falha parcial:

- a identidade permanente de cada TV e Device;
- a unicidade de Slot, PlaybackEvent e Evidence;
- o preço congelado;
- a conservação do orçamento;
- a imutabilidade de Evidence e ledgers;
- a separação entre direito financeiro e movimentação de dinheiro;
- a ordenação mínima exigida por cada Aggregate;
- a capacidade de reconstruir leituras sem reescrever fatos.

Esta especificação é independente de banco de dados, produto de mensageria, protocolo, framework e provedor de infraestrutura.

## 2. Por que a escalabilidade é uma regra de domínio

Uma arquitetura que funciona com 100 TVs, mas permite dois consumos do mesmo orçamento com 100.000 TVs, não escalou: mudou o negócio. Uma arquitetura que descarta PlaybackEvents atrasados sem trilha para reduzir backlog deixou de ser auditável. Uma arquitetura que soma resultados de duas regiões sem preservar a identidade das parcelas pode pagar duas vezes.

A alternativa de criar um modelo “rápido” para grandes volumes e reconciliá-lo posteriormente foi descartada. Reconciliação corrige processamento incompleto; ela não pode adivinhar qual decisão concorrente deveria ter vencido nem fabricar uma prova ausente.

## 3. Invariantes em qualquer escala

As regras seguintes valem de uma TV a um milhão:

1. Edge continua leve e não decide preço, Campaign, Evidence, Settlement ou pagamento.
2. Evidence nasce no Cloud, é append-only e só se torna elegível após validação e ancoragem.
3. PricingQuote aplicado permanece congelado.
4. CampaignBudget nunca reserva ou consome o mesmo valor duas vezes.
5. Settlement só cria direitos; Financial Platform governa ledger, wallet e Withdrawal.
6. Quantum recebe somente representação/hash canônico permitido.
7. TV Network conhece disponibilidade operacional, nunca conteúdo ou finanças.
8. Um Command altera somente o Aggregate owner.
9. Um Event representa um fato passado e não é editado.
10. Projection pode ser reconstruída; Aggregate e ledger não são corrigidos a partir dela.
11. Timeout nunca é interpretado como sucesso ou falha definitiva sem reconciliação.
12. Duplicidade de entrega nunca produz duplicidade de efeito.

Se uma estratégia de escala exigir violar qualquer item, ela é inválida.

## 4. Modelo conceitual de distribuição

### 4.1 Unidade de isolamento

Uma `OperationalCell` é uma fronteira conceitual de isolamento de carga e falha. Ela pode agrupar TVs por região, capacidade ou outra política operacional, mas NÃO se torna owner dos Aggregates.

Uma Cell:

- recebe atribuição versionada de TVs;
- processa apenas streams sob sua responsabilidade vigente;
- anuncia capacidade e estado de degradação;
- preserva eventos pendentes durante indisponibilidade externa;
- pode ser drenada ou substituída sem mudar identidades de domínio.

A mudança de Cell gera histórico auditável. Ela não recria TV, Slot, Evidence, Settlement ou Ledger Entry.

### 4.2 Control plane e execução regional

O plano de controle governa intenção, política e atribuição. A execução regional aplica a intenção autorizada. Nenhum dos dois pode contornar o Aggregate owner.

Exemplo: o plano de controle pode desejar mover uma TV para outra Cell. Ele emite Command ao owner do vínculo operacional; não altera diretamente o inventário nem reescreve heartbeats anteriores.

### 4.3 Localidade de decisão

Uma decisão deve ser processada onde seu owner e sua revisão autoritativa possam ser verificados. Réplicas de leitura podem responder consultas, mas não autorizam transições financeiras, probatórias ou de lifecycle.

Stale read é aceitável somente quando a consequência também é de leitura. Não é aceitável para:

- reservar CampaignBudget;
- consumir reserva;
- validar Evidence;
- criar SplitShare;
- reservar saldo de Withdrawal;
- ativar TV ou Capability;
- promover rollout;
- confirmar pagamento.

## 5. Streams e ordenação

Não existe ordering global. Cada fluxo define a menor chave que preserva seu invariant.

| Fluxo | Chave mínima | Regra de ordem |
| --- | --- | --- |
| Campaign | `CampaignId` | lifecycle e revisão crescentes |
| Slot e reserva | `SlotId` com correlação ao `CampaignBudgetId` | reservar antes de alocar; consumir/liberar uma vez |
| Playback | `TVId + PlayerSessionId + attempt` | início precede término da mesma tentativa |
| Evidence | `EvidenceId`, correlacionada ao `SlotId` | construir, validar e ancorar sem pular condição |
| Settlement | `SettlementCycleId + EvidenceId` | uma Evidence elegível por política/ciclo |
| Partner Ledger | `PartnerAccountId + ledgerSequence` | lançamentos monotônicos, sem edição |
| Withdrawal | `WithdrawalId`; reserva também ordenada pelo Partner Ledger | uma intenção e uma execução financeira efetiva |
| TV Network | `TVId`; Device lifecycle por `DeviceId` | identidade e vínculos não regridem |
| Update | `DeviceId + component + desiredRevision` | revisão obsoleta nunca substitui revisão mais nova |
| Quantum | hash/pacote canônico | a mesma prova não cria duas âncoras lógicas |

### 5.1 Evento atrasado

Um Event com sequência anterior à última aplicada:

- é reconhecido como duplicado ou atrasado;
- não regride o estado;
- permanece observável para auditoria;
- só atualiza uma projection se ainda não tiver sido aplicado nela e se a ordem puder ser preservada.

### 5.2 Gap

Quando um consumidor que exige ordem observa um gap:

1. registra a lacuna e a última sequência confirmada;
2. pausa somente o stream afetado;
3. solicita recuperação da sequência ausente;
4. continua streams independentes;
5. escala o diagnóstico quando a política de recuperação expira.

Ele NUNCA inventa o Event ausente nem avança silenciosamente.

### 5.3 Concorrência

Commands concorrentes carregam revisão esperada. O owner serializa a decisão lógica. Quem perde a corrida recebe conflito explícito, relê o estado e reavalia a intenção.

“Last write wins” é proibido para qualquer transição de Aggregate.

## 6. Entrega, duplicidade e indisponibilidade

### 6.1 Contrato de entrega

O domínio assume que um Event pode:

- atrasar;
- ser entregue mais de uma vez;
- chegar fora de ordem entre streams independentes;
- permanecer indisponível temporariamente;
- ter resultado de consumo desconhecido.

Por isso, todo Event possui identidade estável e todo consumidor produz efeito idempotente.

### 6.2 Publicação pendente

Uma transição confirmada e seus Events resultantes constituem uma decisão única. Se o mecanismo de entrega estiver indisponível:

1. a transição permanece confirmada;
2. os Events permanecem `PENDING_PUBLICATION`;
3. o produtor tenta novamente com os mesmos `eventId`;
4. a operação dependente de confirmação remota permanece intermediária;
5. o backlog é drenado preservando a ordem do stream.

Não se cria novo Event para “destravar” a entrega anterior.

### 6.3 Idempotência

A identidade idempotente de um Command é vinculada a:

- Aggregate owner;
- tipo de Command;
- ator ou sistema emissor;
- intenção correlacionada;
- payload canônico.

A mesma chave e o mesmo payload retornam o resultado original. A mesma chave com payload diferente gera conflito e auditoria; nunca uma segunda intenção silenciosa.

O prazo quantitativo de retenção é uma política aberta, mas deve cobrir toda a janela na qual uma repetição poderia criar novo efeito.

### 6.4 Resultado desconhecido

Se um participante externo não confirma o resultado:

- o estado torna-se `PENDING_CONFIRMATION`, `UNKNOWN` ou `RECONCILING`, conforme o Aggregate;
- a Saga consulta o participante ou repete a mesma intenção idempotentemente;
- uma nova tentativa com nova identidade só nasce após provar que a anterior não produziu efeito;
- compensação não ocorre enquanto puder duplicar uma operação já executada.

## 7. Backpressure e degradação

Backpressure é proteção de invariantes, não descarte de responsabilidade.

Cada contexto possui política versionada para:

- profundidade e idade de backlog;
- taxa de admissão de novas intenções;
- prioridade entre fluxos;
- isolamento de streams ruidosos;
- condição de degradação;
- condição de bloqueio;
- recuperação e saída de degradação.

Ao exceder a capacidade:

1. consultas podem usar projection identificada como atrasada;
2. operações não críticas podem ser adiadas;
3. novas intenções que aumentem exposição financeira ou operacional podem ser rejeitadas;
4. fatos já aceitos continuam preservados;
5. Evidence, ledger e histórico de health nunca são descartados para recuperar capacidade.

### Prioridade conceitual

A política deve distinguir ao menos:

1. segurança, emergência e preservação de identidade;
2. confirmação de fatos já executados;
3. movimentos financeiros em estado desconhecido;
4. health e reconciliação operacional;
5. novas alocações e recomendações;
6. analytics e rebuilds não urgentes.

A ordem quantitativa e os limites permanecem políticas operacionais versionadas.

## 8. Edge offline prolongado

Offline não significa autorização ilimitada.

Enquanto dentro de `OfflineOperationPolicy`, o Edge:

- executa apenas intenção previamente autorizada e ainda válida;
- preserva sequência local e assinatura dos fatos;
- não recalcula preço nem inventa Slot;
- mantém backlog dentro da quota;
- registra clock local, drift observado e versão de política.

Ao exceder janela ou quota, entra em `QUARANTINED`. Em quarantine:

- não aceita novas intenções externas;
- não anuncia disponibilidade;
- preserva diagnóstico e conteúdo operacional seguro permitido;
- não apaga backlog;
- aguarda reconciliação explícita.

Quarenta dias offline necessariamente excedem a janela inicial a ser aprovada. Na reconexão:

1. TV Network valida identidade, credenciais e vínculo;
2. compara Desired, Current e Observed State;
3. valida versões e clock drift;
4. recebe o backlog em sequência;
5. deduplica Events já conhecidos;
6. rejeita fatos expirados com motivo, sem alterar timestamp;
7. identifica gaps;
8. aplica health gate;
9. somente um Command explícito retira o Device de quarantine.

Um playback atrasado pode ser válido apenas se sua autorização e janela eram válidas no momento original e todas as provas passarem. Reconexão não renova validade retroativamente.

## 9. Replay, reprocessamento e reidratação

### 9.1 Replay

Replay reapresenta fatos históricos a um consumidor. Ele:

- usa os mesmos Events;
- preserva identidade e ordem;
- não publica fatos equivalentes novos;
- não repete pagamentos, anchors, notificações irreversíveis ou comandos externos;
- identifica a revisão da projection reconstruída;
- registra o intervalo e a finalidade do replay.

### 9.2 Reprocessamento

Reprocessamento repete uma decisão que não alcançou efeito confirmado. Se representa a mesma intenção, conserva sua identidade idempotente. Se busca um resultado diferente, é uma nova decisão ou compensação correlacionada.

Reprocessar Evidence não altera o PlaybackEvent. Reprocessar Settlement não cria outra SplitShare para a mesma combinação normativa. Reprocessar Withdrawal com resultado desconhecido não cria nova transferência.

### 9.3 Reidratação de Aggregate

Aggregate é reidratado com estado durável e histórico necessário até uma revisão conhecida. Antes de aceitar novo Command, o owner verifica que:

- não há gap obrigatório;
- a revisão reconstruída coincide com a autoritativa;
- a policy version necessária está disponível;
- fatos desconhecidos não foram ignorados.

Falha de reidratação bloqueia somente o Aggregate/stream afetado e abre diagnóstico.

### 9.4 Rebuild de projection

Projection é descartável e não possui autoridade de escrita. Rebuild:

1. cria nova revisão de projection;
2. reproduz Events no ordering exigido;
3. registra versão do modelo de leitura;
4. compara contagem, saldos, hashes e checkpoints;
5. só promove a revisão após validação;
6. mantém a versão anterior disponível até a troca;
7. descarta a tentativa incompleta sem tocar nos owners.

Divergência de projection nunca é “corrigida” editando Aggregate ou ledger.

## 10. Isolamento de falha

| Falha | Comportamento obrigatório | Comportamento proibido |
| --- | --- | --- |
| Entrega indisponível | preservar Events pendentes e estados intermediários | desfazer transição confirmada ou fabricar sucesso |
| Consumidor duplicado | reconhecer `eventId` e retornar primeiro resultado | repetir crédito, consumo, anchor ou pagamento |
| Stream com gap | pausar o stream e recuperar sequência | avançar lifecycle ignorando fato |
| Projection atrasada | declarar staleness e limitar uso autoritativo | autorizar saldo ou lifecycle com leitura stale |
| Cell indisponível | isolar, redirecionar por vínculo versionado e reconciliar | recriar identidades em outra Cell |
| Edge offline além da política | quarantine e reconciliação completa | executar intenção nova ou renovar timestamp |
| Resultado financeiro desconhecido | reconciliar/repetir mesma identidade | criar nova transferência “por segurança” |
| Rebuild falho | manter projection anterior e investigar | escrever correção no Aggregate |
| Sobrecarga | degradar admissão por política | descartar Evidence ou ledger |

## 11. Evolução por escala

Os marcos abaixo descrevem necessidades operacionais esperadas, não mudanças de domínio.

| Escala | Evolução permitida sem alterar o modelo |
| ---: | --- |
| 100 TVs | observabilidade por Device, filas duráveis, reconciliação manual auditada e baseline de capacidade |
| 1.000 TVs | isolamento por stream/TV/Venue, consumidores idempotentes, quotas e projections específicas |
| 10.000 TVs | particionamento por chaves normativas, processamento agregado de telemetria, publicação pendente e checkpoints |
| 100.000 TVs | Cells regionais, backpressure, atualização em ondas, recuperação automatizada e exercícios de desastre |
| 1.000.000 TVs | controle global com execução regional isolada, roteamento por Cell, contingência regional e agregação hierárquica |

Nenhum marco autoriza:

- novo owner para o mesmo Aggregate;
- consistência “posterior” de saldo;
- Evidence provisoriamente válida;
- pagamento antes de direito;
- dependência de ordering global;
- leitura direta entre armazenamentos de contextos.

## 12. Decisões operacionais e auditoria

Toda mudança de:

- atribuição de Cell;
- quota;
- política de backpressure;
- janela offline;
- ordering/checkpoint;
- modo replay;
- revisão de projection;
- estado de degradação;
- plano de recuperação;

deve registrar ator/sistema, motivo, versão anterior/nova, escopo, correlation, instante e resultado.

Automação pode recomendar ou emitir Command autorizado, mas o Aggregate owner revalida invariantes.

## 13. Exemplos normativos

### Exemplo válido — duas reservas concorrentes

Uma Campaign possui R$10 disponíveis. Dois allocators enviam reservas de R$10 com a mesma revisão. O owner aceita uma e avança a revisão. A outra recebe conflito, relê saldo zero e é rejeitada. O aumento de concorrência não altera o resultado financeiro.

### Exemplo válido — rebuild

Uma nova projection de saldo lê todos os Partner Ledger Events em sequência, compara o saldo final e somente então substitui a leitura anterior. Nenhum PartnerLedgerCredit é recriado.

### Contraexemplo — replay com efeito externo

Durante replay, um consumidor reenviar um Withdrawal ao executor externo porque reencontrou `WithdrawalSubmitted` é proibido. O replay deve reconstruir leitura, não repetir movimentação.

### Contraexemplo — descarte de offline

Apagar PlaybackEvents antigos para permitir que um Edge há 40 dias offline volte a `HEALTHY` é proibido. Os fatos devem ser recebidos, classificados e aceitos/rejeitados individualmente, preservando a trilha.

## 14. Critérios de aceite

Uma evolução de escala só pode ser aprovada quando demonstra:

- preservação de todos os invariantes desta especificação;
- comportamento sob duplicidade, atraso, gap e indisponibilidade;
- isolamento da falha ao menor stream/Cell possível;
- recuperação sem edição destrutiva;
- replay sem efeito externo duplicado;
- rebuild verificável;
- degradação explícita;
- auditoria das decisões operacionais.

Os valores quantitativos de SLO, backlog, retry, retenção, checkpoint e capacidade permanecem políticas versionadas e devem ser aprovados antes da implementação que dependa deles.
