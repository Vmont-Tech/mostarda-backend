# Campaign Management — Especificação normativa

## 1. Propósito

Campaign Management governa como um Advertiser transforma capacidade financeira compensada em uma estratégia de consumo de Slots de Exibição.

A Mostarda não vende Campaign pronta, pacote fixo, circuito fechado, loop de mídia, audiência garantida, alcance mínimo ou quantidade fixa de exibições. O produto comercial é o acesso ao inventário por meio de orçamento livre. A Campaign registra a intenção, as restrições e a estratégia escolhidas pelo Advertiser para utilizar esse orçamento.

O Advertiser pode selecionar manualmente TVs, horários, quantidades e prioridades ou autorizar o Grão a planejar e otimizar essas escolhas. O Grão atua dentro do mandato concedido, mas nunca substitui a autoridade final do Advertiser.

## 2. Razão arquitetural

Campaign existe para preservar a intenção do Advertiser separadamente de:

- dinheiro compensado, que pertence ao Financial Platform;
- preço, que pertence ao Pricing Engine;
- disponibilidade operacional da TV, que pertence ao TV Network;
- execução física, que pertence ao Edge Runtime;
- prova, que pertence ao Evidence Ledger;
- direito financeiro, que pertence ao Settlement;
- recomendação e otimização, que pertencem ao AI Orchestration.

Se Campaign calculasse saldo, preço, audiência ou saúde da TV, passaria a decidir com estado que não possui. Se o Grão alterasse a Campaign sem mandato, uma recomendação de IA se tornaria autoridade comercial. Se Slot e Campaign fossem o mesmo Aggregate, uma única disputa de inventário bloquearia toda a estratégia do Advertiser.

## 3. Escopo

Campaign Management é owner de:

- `Campaign`;
- revisão da estratégia;
- `CreativeAsset` e sua elegibilidade para a Campaign;
- `TargetingRule`;
- escolha manual ou mandato de otimização;
- criação e lifecycle do `Slot`;
- causas de pausa pertencentes ao contexto;
- cancelamento e encerramento comercial;
- realocação de obrigação não executada.

Campaign Management não é owner de:

- `AvailableBudget`, reserva ou consumo;
- `PricingQuote` ou algoritmo de preço;
- dados observados de audiência;
- health ou disponibilidade oficial de TV;
- reprodução;
- validade de Evidence;
- split, ledger, refund ou transferência;
- autoria do conteúdo enviado pelo Advertiser.

## 4. Compromisso comercial

O compromisso da Mostarda é fornecer:

- acesso ao inventário elegível;
- estimativas transparentes;
- dados históricos e estatísticos;
- estimativas de audiência, preço e ocupação;
- comprovação de execução;
- rastreabilidade e auditoria;
- preço efetivo do Slot;
- preservação do orçamento diante de falha operacional.

Estimativa nunca é garantia. Dado histórico nunca é promessa de resultado futuro. A plataforma deve distinguir, na linguagem e no payload, `estimated`, `observed` e `proven`.

Depois da execução, a plataforma registra onde, quando e por quanto tempo exibiu, qual audiência foi identificada segundo a política vigente e qual preço efetivo foi aplicado. O fato físico nunca é apagado para corrigir consequência comercial ou financeira.

## 5. Unidade comercial

`Slot` é a unidade comercial atômica. Cada Slot representa uma oportunidade independente de exibição e referencia exatamente:

- uma Campaign;
- uma TV;
- uma janela de reprodução;
- uma revisão imutável de Creative;
- um PricingQuote congelado;
- uma reserva de budget;
- as revisões de targeting e estratégia aplicáveis.

O Advertiser pode adquirir um único Slot ou milhões. Não existe quantidade mínima de Slots por princípio de domínio; eventual limite técnico ou comercial deve ser política explícita.

Formatos com duração superior à unidade atômica são compostos por Slots consecutivos. Eles não criam uma unidade financeira opaca: cada unidade conserva identidade, preço, reserva, execução e prova.

## 6. Campaign Aggregate

### 6.1 Responsabilidade

Campaign protege a intenção comercial, o mandato de otimização, a janela, as restrições, as revisões de Creative elegíveis e as causas de pausa.

### 6.2 Conteúdo conceitual

- `campaignId`;
- `advertiserId`;
- moeda;
- referência ao valor contratado;
- janela comercial;
- revisão de estratégia;
- targeting;
- modo `MANUAL`, `ASSISTED` ou `DELEGATED`;
- mandato concedido ao Grão;
- Creatives elegíveis;
- causas ativas de pausa;
- estado;
- revisão concorrente;
- timestamps e auditoria.

### 6.2.1 Dados mínimos de criação

Campaign nunca nasce vazia. `CreateCampaign` exige:

- Advertiser owner;
- nome;
- objetivo;
- moeda;
- país de operação;
- responsável pela criação;
- data de criação.

Budget, Creative, janela, targeting, estratégia e mandato do Grão são opcionais em `DRAFT`. Criação não autoriza operação.

### 6.3 Invariantes

1. Campaign pertence a exatamente um Advertiser.
2. Campaign nunca usa `ContractValue` como saldo.
3. Campaign nunca consulta Payment, Asaas ou armazenamento financeiro.
4. Nova alocação exige decisão autoritativa do CampaignBudget.
5. Nenhum Slot nasce sem Creative elegível, Quote vigente e reserva aceita.
6. Estimativa de audiência não pode ser apresentada como garantia.
7. Grão só atua dentro de mandato explícito e revogável.
8. Alteração manual do Advertiser prevalece sobre plano ainda não comprometido do Grão.
9. Pausa impede novas alocações.
10. Estado terminal nunca retorna a estado ativo.
11. Fato tardio não reabre Campaign terminal.
12. Cancelamento nunca apaga exibições comprovadas.

## 7. Lifecycle da Campaign

```text
DRAFT → READY → PUBLISHED → ACTIVE
ACTIVE ↔ PAUSED
DRAFT/READY/PUBLISHED/ACTIVE/PAUSED → CANCELLED
PUBLISHED/ACTIVE/PAUSED → EXPIRED
ACTIVE/PAUSED → COMPLETED
```

`CANCELLED`, `EXPIRED` e `COMPLETED` são finais. Eventos tardios são reconciliados sem reabrir o estado.

### 7.1 DRAFT

Permite construir estratégia, targeting, janela, Creatives e mandato. Não autoriza Slot.

Todos os campos são editáveis por actor autorizado. Alteração conserva auditoria e revisão.

### 7.2 READY

Significa que os gates comerciais e editoriais foram validados. Não significa dinheiro compensado nem inventário reservado.

READY congela uma revisão operacional. Nome, descrição, etiquetas e observações podem mudar sem afetar a revisão operacional. Mudança de budget, Creative, targeting, estratégia ou janela cria obrigatoriamente nova revisão.

### 7.3 PUBLISHED

Significa que a estratégia foi confirmada pelo Advertiser e pode buscar autorização financeira e inventário dentro da janela. Publicação não promete Slot.

Nenhum atributo operacional é mutado in place. Mudança de budget, Creative, targeting, estratégia ou janela cria nova revisão, preservando integralmente a anterior.

### 7.4 ACTIVE

Significa que a Campaign está autorizada a criar novas intenções de alocação. Ativação não garante audiência, quantidade ou consumo integral.

Ativação comercial ocorre automaticamente no início da janela. Em `ACTIVE`, somente pausa, cancelamento e criação de revisão futura são permitidos; nenhuma mudança altera execução vigente.

`CampaignActivated` declara elegibilidade comercial. `CampaignExecutionStarted` ocorre uma única vez, quando o primeiro Slot é reservado. Os fatos nunca são intercambiáveis.

### 7.5 PAUSED

Impede novas alocações. Causas independentes devem ser preservadas. Remover uma causa não remove outra.

Causas mínimas conceituais:

- `BUDGET_DEPLETED`;
- `ADVERTISER_REQUEST`;
- `CREATIVE_INELIGIBLE`;
- `COMPLIANCE`;
- `OPERATIONAL`;
- `ADMINISTRATIVE`.

O contexto que comunica uma restrição não altera Campaign diretamente: ele publica fato ou solicita Command ao owner. Somente o owner adiciona ou remove a causa.

### 7.6 COMPLETED

Representa encerramento normal da estratégia porque não há nova utilização planejada dentro da janela e não existem obrigações de realocação abertas. Não significa quantidade garantida entregue.

### 7.7 EXPIRED

Representa término da janela comercial antes de novo consumo possível. Slots e fatos já ocorridos continuam reconciliação em seus próprios owners.

### 7.8 CANCELLED

Representa exercício do direito de cancelamento pelo Advertiser ou cancelamento administrativo autorizado. O motivo é obrigatório. A plataforma pode oferecer retenção, correção ou replanejamento antes da confirmação, mas nunca pode impedir o cancelamento por objetivo de churn.

Cancelamento é imediato somente quando nenhum Slot irreversível foi distribuído. Se existe Slot distribuído ao Edge:

```text
CampaignCancellationRequested
→ revogação dos Slots revogáveis
→ conclusão/reconciliação dos Slots irreversíveis
→ CampaignCancelled
```

O ponto de irreversibilidade comercial é `Slot DISPATCHED`, confirmado por `SlotDispatchedToEdge` quando o Edge aceita a distribuição. `DELIVERED` permanece reservado à conclusão física do playback. Timeout não presume dispatch, entrega, reversão nem irreversibilidade.

## 8. Estratégia e autoridade do Advertiser

O Advertiser pode:

- selecionar TV;
- selecionar horário;
- selecionar quantidade de Slots;
- estabelecer prioridades;
- aceitar plano completo do Grão;
- modificar parcialmente o plano;
- revogar o mandato de otimização;
- pausar, retomar ou cancelar quando autorizado pelo lifecycle.

O modo de operação não altera as invariantes:

| Modo | Significado |
| --- | --- |
| `MANUAL` | Advertiser escolhe as alocações |
| `ASSISTED` | Grão recomenda; Advertiser confirma |
| `DELEGATED` | Grão pode solicitar alocações dentro do mandato |

Mandato deve declarar escopo, janela, restrições, limite financeiro e revisão. Uma nova revisão manual torna recomendações incompatíveis obsoletas. Grão nunca expande limite, targeting ou janela por inferência.

## 9. Creative Asset e moderação

O Advertiser é autor e responsável final pelo conteúdo. A Mostarda valida conformidade e não assume autoria.

IA deve executar validações objetivas e pode concluir automaticamente somente quando a política versionada autorizar e a confiança atingir o limiar aprovado. Dúvida, baixa confiança, dados insuficientes ou conflito de interpretação exigem revisão humana.

Os únicos resultados são `AUTO_APPROVED`, `AUTO_REJECTED` e `HUMAN_REVIEW_REQUIRED`. O limiar numérico pertence à política versionada do serviço de IA, não ao Aggregate Campaign. Alteração do limiar não reinterpreta decisões anteriores.

Uma rejeição deve informar:

- regra violada;
- trecho ou elemento causador;
- explicação;
- forma de correção;
- ação necessária para nova análise;
- policy e model versions;
- decisão automática ou humana;
- trilha de auditoria.

Alteração de conteúdo cria revisão imutável com novo digest. Slots preservam a revisão usada.

Se Creative aprovado perder elegibilidade:

1. novas alocações são interrompidas;
2. a Campaign recebe causa `CREATIVE_INELIGIBLE`;
3. o Advertiser é notificado;
4. conteúdo corrigido cria nova revisão;
5. nova revisão passa por moderação;
6. após aprovação, remove-se apenas a causa editorial;
7. a Campaign retoma somente se nenhum outro bloqueio permanecer;
8. budget remanescente continua disponível para execução.

Moderação deve ocorrer no menor tempo operacional possível. SLOs e SLAs numéricos pertencem à operação, são configuráveis, observáveis e versionados; atraso não autoriza aprovação por timeout.

## 10. Formação e congelamento de preço

Cada Venue possui preço base e preço mínimo. O preço varia automaticamente conforme ocupação do inventário: maior ocupação aumenta o preço; menor ocupação reduz o preço, nunca abaixo do mínimo aplicável.

Não existe leilão manual, negociação individual nem prioridade de Slot por maior valor.

O Pricing Engine calcula e versiona. O preço estimado é informativo. O preço efetivo é o Quote congelado aceito para a reserva. Ocupação de um Slot confirmado influencia cálculos posteriores, mas nunca reprecifica Slot já reservado.

## 11. Concorrência

Quando duas intenções disputam exatamente o mesmo Slot, vence a primeira que completar, na ordem autoritativa:

1. budget confirmado e disponível;
2. reserva de budget aceita;
3. reserva do Slot aceita.

Não existe prioridade por maior preço ou intervenção manual. O owner serializa a reserva pela revisão vigente. Resposta perdida é recuperada pela mesma idempotency key; nunca se cria identidade nova para “tentar ganhar”.

Ordem de chegada determina quem adquire o Slot. Ocupação determina o preço de oportunidades seguintes. Esses conceitos não podem ser combinados em leilão implícito.

## 12. Prioridade operacional de conteúdo

Quando conteúdos disputam capacidade, a ordem comercial é:

1. anúncios pagos;
2. campanhas institucionais;
3. conteúdo do proprietário da TV;
4. conteúdo do estabelecimento;
5. influenciadores;
6. conteúdo interno da plataforma.

Essa ordem governa planejamento ainda não comprometido. Não autoriza revogar Slot pago já adquirido para encaixar conteúdo inferior.

Formato que exige Slots consecutivos pode causar reposicionamento de anúncio unitário ainda não executado para o primeiro Slot equivalente na mesma janela. O reposicionamento:

- não pode aumentar preço;
- não pode violar targeting;
- não pode reduzir a obrigação já adquirida;
- deve preservar ou melhorar equivalência;
- deve ser auditável;
- depende de liberação e nova reserva pelos respectivos owners.

As tolerâncias quantitativas pertencem à `SlotEquivalencePolicy` versionada e distribuída pelo Configuration Service.

## 13. Falha de exibição e realocação

Falha operacional não consome definitivamente o orçamento da obrigação não executada. A reserva é liberada por fato explícito e o valor volta a ser elegível.

A ordem obrigatória é:

1. confirmar que não houve execução válida;
2. liberar a obrigação financeira pelo owner;
3. procurar outro Slot compatível;
4. realocar automaticamente quando houver candidato;
5. manter AvailableBudget quando não houver candidato.

Compatibilidade deve considerar:

- restrições da Campaign;
- janela;
- localização;
- perfil estimado de audiência;
- categoria;
- capacidade técnica;
- preço equivalente ou inferior;
- disponibilidade financeira.

`SlotEquivalencePolicy` versionada define tolerâncias sem hardcode. Ela exige igualdade ou compatibilidade aprovada para categoria, cidade, região, tipo e capacidade da tela, faixa de horário, preço e perfil esperado de audiência. Nenhuma dimensão obrigatória pode ser ignorada. “Sem degradação significativa” significa satisfazer todos os limites da versão preservada na tentativa.

Underdelivery não gera refund automático. Primeiro ocorre realocação e reaproveitamento. Saldo permanece somente quando nenhum Slot compatível pode ser autorizado.

Enquanto a janela estiver vigente e não houver candidato, o valor permanece reservado para a obrigação. Encerrada a janela, a reserva é liberada e o saldo retorna à conta do Advertiser.

Realocação cria novo Slot, Quote e reserva. Nunca reescreve o Slot falho.

## 14. Overdelivery

A arquitetura deve impedir execução superior ao autorizado. Duplicidade, retry, concorrência ou falha técnica nunca autorizam cobrança adicional ao Advertiser.

Se overdelivery ocorrer:

- o fato físico é preservado;
- o Advertiser não é debitado;
- o custo não é debitado do Advertiser e aguarda consequência financeira autorizada;
- a ocorrência é classificada e auditada;
- a causa deve possuir owner;
- correção nunca apaga PlaybackEvent ou Evidence.

Se a Evidence for válida, o parceiro recebe normalmente. Settlement cria o direito e Financial Platform materializa o crédito. O Advertiser não é debitado. A parte que financiará ou absorverá a consequência é determinada exclusivamente por `ResponsibilityDecisionPublished` e executada por lançamento explícito.

## 15. Responsabilidade por inconsistência

Campaign publica exclusivamente seus fatos: estado, Slot, Creative, pausa, cancelamento, realocação e resultado comercial. Campaign nunca classifica causa, responsável ou parte que absorve perda.

Governance & Dispute Management é o único owner do julgamento. Ele publica `ResponsibilityDecisionPublished` com responsável, categoria, severidade, confidence, policyVersion, razão e referências. Campaign apenas registra `decisionId + revision` e reage por Command próprio quando a consequência for compatível com seu lifecycle.

Contestação ocorre no GovernanceCase e cria revisão append-only. Campaign nunca edita o fato original nem reinterpreta a decisão.

## 16. Cancelamento e consequência financeira

Ao cancelar:

- nenhuma nova alocação é criada;
- Slots ainda revogáveis entram no fluxo de revogação;
- exibições comprovadas permanecem faturadas;
- consumo reconhecido não é estornado;
- reservas liberáveis retornam ao AvailableBudget;
- saldo não consumido deve retornar ao Advertiser;
- motivo e tentativa de retenção são auditados;
- retenção nunca altera o direito de cancelar.

Campaign publica o fato comercial. Financial Platform mantém crédito interno por padrão e executa refund quando solicitado e elegível; Campaign nunca escolhe o rail.

O padrão é crédito interno na `AdvertiserAccount`. O Advertiser pode manter o crédito ou solicitar refund ao meio de pagamento. Financial Platform decide elegibilidade e executa refund conforme política financeira e legislação. Campaign nunca escolhe o rail.

## 16.1 Grace periods e configuração

Grace periods são parâmetros de políticas operacionais versionadas, nunca constantes do domínio comercial. Heartbeat, playback, Evidence e sincronização podem possuir valores distintos.

O Configuration Service distribui versões aprovadas; cada decisão preserva policy version e valor efetivo. Ausência, expiração ou incompatibilidade de configuração bloqueia a operação dependente. Mudança não reinterpreta fatos históricos.

## 16.2 Slots consecutivos

Por padrão, anúncios consecutivos do mesmo Advertiser são evitados. Quando um formato adquirir unidades consecutivas suficientes, `ConsecutiveSlotPolicy` pode reorganizar anúncios vizinhos ainda movíveis.

Reorganização:

- preserva preço e budget congelados;
- não altera prioridade comercial;
- não prejudica outro Advertiser;
- usa o Slot elegível imediatamente mais próximo;
- respeita targeting, janela e equivalência;
- revoga e reserva por Commands dos owners;
- permanece integralmente auditável.

Slot irreversível nunca é movido.

## 16.3 Matriz de autorização

| Actor | Pode | Nunca pode |
| --- | --- | --- |
| Advertiser | criar, editar conforme estado, pausar, retomar, cancelar, escolher estratégia, aceitar sugestão, substituir Creative, solicitar refund | perder autoridade sobre sua Campaign por delegação |
| Grão | sugerir estratégia, fluxo, distribuição, budget e targeting | publicar, cancelar, gastar ou alterar sem consentimento explícito |
| IA de moderação | analisar, detectar, sugerir correção e recomendar melhoria | aprovar conteúdo duvidoso |
| Moderador humano | aprovar, rejeitar, solicitar alteração e classificar caso especial | alterar Campaign ou budget fora do Command autorizado |
| Financial Platform | reservar, liberar, consumir, gerar crédito e executar refund | alterar regra ou estado comercial da Campaign |
| Campaign Aggregate | decidir exclusivamente o próprio lifecycle | alterar Aggregate externo |

Consentimento do Advertiser é explícito, versionado, escopado e auditável. Nenhum contexto escreve diretamente no estado da Campaign.

## 17. Commands mínimos

| Command | Owner | Resultado |
| --- | --- | --- |
| `CreateCampaign` | Campaign | `CampaignCreated` |
| `ReviseCampaignStrategy` | Campaign | `CampaignStrategyRevised` |
| `ConfirmCampaignStrategy` | Campaign | `CampaignReady` |
| `PublishCampaign` | Campaign | `CampaignPublished` |
| `ActivateCampaign` | Campaign | `CampaignActivated` |
| `RecordCampaignExecutionStarted` | Campaign | `CampaignExecutionStarted` |
| `AddCampaignPauseCause` | Campaign | `CampaignPaused` ou causa adicionada |
| `RemoveCampaignPauseCause` | Campaign | `CampaignPauseCauseRemoved`; `CampaignResumed` se nenhuma causa restar |
| `CancelCampaign` | Campaign | `CampaignCancellationRequested` ou `CampaignCancelled` |
| `CompleteCampaign` | Campaign | `CampaignCompleted` |
| `ExpireCampaign` | Campaign | `CampaignExpired` |
| `SubmitCreativeRevision` | Campaign | `CreativeRevisionSubmitted` |
| `RecordCreativeDecision` | Campaign | `CreativeApproved/Rejected` |
| `RequestSlotAllocation` | Slot | `SlotAllocated/Rejected` |
| `RecordSlotDispatchedToEdge` | Slot | `SlotDispatchedToEdge` |
| `RevokeSlot` | Slot | `SlotRevoked/RevocationRejected` |
| `ExpireSlot` | Slot | `SlotExpired` |
| `RecordSlotDelivered` | Slot | `SlotDelivered` |
| `RecordSlotEvidenced` | Slot | `SlotEvidenced` |
| `RequestSlotReallocation` | Campaign | `SlotReallocationRequested/Rejected` |

Cada Command exige actor, owner, aggregate revision, correlation, causation, idempotency key, policy versions e motivo quando aplicável.

## 18. Consistência eventual e recuperação

- Projection nunca autoriza Slot ou gasto.
- Event duplicado gera no máximo um Command lógico.
- Event fora de ordem aguarda dependência ou abre reconciliação.
- Timeout não confirma reserva, revogação ou execução.
- Resposta perdida usa a mesma identidade.
- Replay reconstrói estado, mas não reserva inventário, não move budget e não chama Edge.
- Rebuild de projections não altera Campaign ou Slot.
- Falha entre reserva de budget e reserva de Slot libera budget por compensação explícita.
- Falha entre Slot e entrega não presume playback.
- Fato de execução tardio é processado sem reabrir Campaign terminal.

## 19. Exemplos normativos

### 19.1 Compra de um único Slot

Advertiser com budget disponível escolhe uma TV e horário. Pricing fornece Quote; CampaignBudget reserva; Slot aceita a janela. Nenhuma quantidade adicional é exigida.

### 19.2 Concorrência

Duas Campaigns disputam a mesma oportunidade. A primeira reserva aceita vence. A segunda recebe rejeição e pode procurar outra oportunidade; não oferece preço maior.

### 19.3 Falha operacional

Slot não executa. O fato de falha libera a reserva, e a estratégia procura candidato equivalente. O Slot original permanece histórico.

### 19.4 Overdelivery

Retry defeituoso causa segunda exibição. O fato é preservado, mas o Advertiser não é cobrado novamente. A plataforma registra custo e incidente.

### 19.5 Creative perde elegibilidade

Novas exibições são interrompidas, Campaign é pausada e Advertiser é notificado. Nova revisão aprovada permite continuidade do budget remanescente se não houver outro bloqueio.

## 20. Contraexemplos proibidos

- prometer audiência ou alcance com base em estimativa;
- priorizar Campaign porque oferece preço maior;
- alterar preço de Slot já reservado;
- deixar IA ampliar mandato do Advertiser;
- cobrar overdelivery técnico;
- apagar exibição para corrigir saldo;
- tratar falha operacional como consumo definitivo;
- refund automático antes de tentar realocação;
- remover pausa manual ao receber budget;
- reutilizar o mesmo Slot para esconder realocação;
- permitir conteúdo inferior deslocar anúncio pago confirmado;
- impedir cancelamento para reduzir churn.

## 21. Estado decisório

### 21.1 Grade de parceiros e blocos contíguos

Slots permanecem atômicos em 15 segundos. Freemium local compõe no máximo dois consecutivos; Campaign Mostarda pode exigir bloco maior. Slot confirmado é imutável. Ausência de bloco produz sugestões explicáveis e nunca realocação silenciosa. Pré-seleção cria hold temporário; somente confirmação válida produz reserva definitiva. A autoridade detalhada é [PARTNER_NETWORK_OPERATING_MODEL.md](../product/PARTNER_NETWORK_OPERATING_MODEL.md).

`OPEN-036..048` foram fechados pelo documento “Fechamento do Campaign Management”. Não permanecem decisões específicas abertas neste contexto. Parâmetros numéricos vivem em políticas operacionais versionadas e não alteram a semântica aqui definida.

`OPEN-049` está `CLOSED` por `DEC-041`: Governance & Dispute Management, por GovernanceCase, é o owner exclusivo da classificação oficial.
