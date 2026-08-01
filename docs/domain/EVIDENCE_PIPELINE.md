# Evidence Pipeline — Fatos, Prova e Ancoragem

## 1. Propósito

O Evidence Pipeline transforma um fato técnico de reprodução em uma prova de negócio auditável. Ele existe para que a Mostarda consiga responder, sem depender de confiança:

- o que foi exibido;
- em qual TV e Slot;
- quando e por quanto tempo;
- qual conteúdo foi efetivamente reproduzido;
- qual identidade de Device assinou o fato;
- qual preço foi calculado, congelado e consumido;
- quais fatores, impostos e políticas explicam o valor;
- quais percentuais de split eram aplicáveis;
- qual versão de cada política tomou parte da decisão;
- se a prova foi validada, disputada, revertida e ancorada.

Uma Evidence não é telemetria, log, screenshot, heartbeat, recibo financeiro nem Event emitido pelo Edge. Ela é um registro Cloud construído a partir de fatos independentes e validado por regras reproduzíveis.

## 2. Por que o Edge não cria Evidence

O Edge observa a reprodução e assina o fato local. Ele não pode também decidir que sua própria afirmação é prova válida. Essa separação evita que:

- um dispositivo comprometido declare a própria validade;
- regra financeira seja embarcada no equipamento;
- uma versão antiga do Edge determine critérios atuais de prova;
- ausência de conectividade force validação local irreconciliável;
- a camada física conheça impostos, split ou Settlement.

A alternativa “Edge cria Evidence pronta e Cloud apenas armazena” foi descartada. O Edge produz `PlaybackEvent`; somente o Evidence Ledger materializa `EvidenceRecord`.

## 3. Fronteiras e ownership

| Objeto | Owner | Responsabilidade | Não pode decidir |
| --- | --- | --- | --- |
| `PlaybackEvent` | Edge Runtime / PlaybackAttempt | Fato atômico da tentativa de reprodução | validade da Evidence, preço, split, pagamento |
| `PlaybackSignature` | Edge Runtime usando identidade do Device | Assinatura do payload local canônico | autenticidade final da prova |
| `EvidenceRecord` | Evidence Ledger | Construção, validação, disputa e reversão append-only | pagamento, Withdrawal, execução física |
| `CanonicalEvidencePackage` | Evidence Ledger | Representação canônica congelada para hash | destino público, rail financeiro |
| `QuantumAnchor` | Quantum Integration | Lifecycle da solicitação e recibo de ancoragem | Campaign, anunciante, pessoa, preço |
| `EvidenceEligibility` | Projection Cloud | Combina validade, reversão, disputa e anchor para leitura | alterar qualquer owner |

Evidence Ledger pode conhecer referências conceituais de Campaign, Slot, TV, Creative Asset, PricingQuote e políticas econômicas porque precisa provar o contexto. Quantum recebe somente hash, versão canônica e metadados mínimos permitidos.

`DISPUTED`, `EvidenceDisputed` e `EvidenceDisputeResolved` pertencem exclusivamente ao lifecycle de validade da Evidence. Eles não atribuem culpa, responsável contratual ou funding owner. Quando a resolução exigir julgamento de responsabilidade, Evidence publica fatos e referencia o GovernanceCase; somente Governance & Dispute Management publica a decisão oficial.

Settlement consome apenas a projection de elegibilidade e o snapshot econômico congelado. Ele não lê PlaybackEvent nem revalida assinatura.

## 4. Objetos distintos

```text
PlayerSession
    ↓ fato local
PlaybackEvent + PlaybackSignature
    ↓ submissão idempotente
Evidence Builder
    ↓ correlação Cloud
EvidenceRecord PENDING_VALIDATION
    ↓ decisão reproduzível
VALID | INVALID | DISPUTED
    ↓ somente VALID
CanonicalEvidencePackage + hash
    ↓ contrato mínimo
QuantumAnchor
    ↓ projection
EvidenceEligibility
```

Nenhuma seta autoriza escrita direta no owner seguinte. Cada etapa emite fato; o participante seguinte recebe um Command próprio.

## 5. PlaybackEvent

### 5.1 Conteúdo local mínimo

O PlaybackEvent deve preservar:

- `playbackEventId`;
- `playerSessionId`;
- `playbackAttemptId`;
- `slotId`;
- `tvId` e `deviceId`;
- sequência local;
- início e término observados;
- duração monotônica;
- clock de parede e estimativa de drift;
- `creativeAssetId` e `CreativeChecksum`;
- `PlaybackChecksum`;
- frames/segmentos ou métricas necessárias à política de validação;
- resultado local (`FINISHED`, `INTERRUPTED`, `FAILED`);
- versões de Edge, Player, Canvas, Capability Manifest, OS e Firmware;
- versão de modelo Local AI, quando sua saída participou;
- identidade/versionamento da chave que assina;
- versão do schema local;
- instante original e instante de enfileiramento.

O evento não contém Evidence status, valor de split calculado pelo Edge nem decisão financeira.

### 5.2 Identidade e tentativa

Cada tentativa possui identidade própria. Reiniciar Player, recuperar uma sessão ou repetir parte do conteúdo não reutiliza o mesmo `playbackAttemptId`.

Dois trechos interrompidos não podem ser concatenados para fabricar uma execução válida. Cada tentativa é validada isoladamente. Somente a confirmação do final natural do Creative satisfaz sua completude; interrupção anterior é inválida, independentemente da fração restante. Depois dessa confirmação, falha durante a permanência do último frame não reverte a completude e é preservada como incidente posterior correlacionado.

Falha anterior ao final não admite continuação ou reinício dentro do mesmo Slot. O PlaybackEvent falho e a execução institucional posterior permanecem fatos distintos, com `EvidencePurpose` distintos. O fallback nunca torna válida a tentativa monetizada nem completa sua duração.

O Evidence Ledger preserva a classificação técnica recebida e os sinais verificáveis, mas não diagnostica equipamento nem atribui responsabilidade. Conflito ou insuficiência mantém a causa desconhecida, o que não autoriza a TV a continuar entregas pagas. Falha de checksum/decodificação só é considerada exclusiva do Creative quando essa conclusão for determinística e correlacionada à versão exata do arquivo.

### 5.3 Fila offline

O Edge preserva o PlaybackEvent original. Retry:

- conserva `playbackEventId`, payload, assinatura e timestamp;
- adiciona somente metadados de tentativa de transmissão fora do payload assinado;
- respeita sequência local;
- não renova janela do Slot;
- não altera duração;
- não transforma evento expirado em atual.

## 6. EvidenceRecord

### 6.0 Purpose e elegibilidade

Toda execução comprovável gera EvidenceRecord com `EvidencePurpose`: `MONETIZED_PLAYBACK`, `LOCAL_FREEMIUM_PLAYBACK`, `INSTITUTIONAL_PLAYBACK` ou `FALLBACK_PLAYBACK`. Campos físicos são comuns. Somente o primeiro exige snapshot econômico e pode ser elegível a Settlement; os demais usam `FinancialEligibility = NOT_APPLICABLE`. Declaração humana nunca prova playback.

### 6.1 Identidade

Um PlaybackEvent aceito para construção corresponde a no máximo um `EvidenceRecord`. A deduplicação primária usa `playbackEventId`; a unicidade de negócio também verifica Slot, tentativa e unidade de exibição.

A repetição do mesmo PlaybackEvent retorna a mesma Evidence ou a mesma rejeição. Um payload diferente com a mesma identidade é incidente de integridade, não nova revisão válida.

### 6.2 Fontes congeladas

O Builder não “completa” fatos por suposição. Ele correlaciona snapshots fornecidos pelos owners:

| Fonte | Dados probatórios |
| --- | --- |
| PlaybackEvent | tempos, duração, checksums, versões, identidade e assinatura |
| Slot | Campaign, TV, Creative Asset, janela e PricingQuote aplicado |
| TV Network projection | vínculo TV/Device e condição operacional observada no instante |
| Pricing | preço calculado, preço final, fatores, floor/ceiling, policy/algorithm version |
| CampaignBudget | reserva/consumo correlacionado e valor autorizado |
| Tax Policy | linhas, bases, retenções e versão aplicável |
| Split Policy | cinco papéis, percentuais canônicos e versão |
| Continuity Service | não integra a prova de playback nem sua elegibilidade financeira; fatos de manutenção permanecem no contexto proprietário |
| Telemetry | sinais permitidos, confiança e proveniência; nunca substitui playback |

Ausência de uma fonte obrigatória não é preenchida com o valor atual. A Evidence aguarda, torna-se inválida ou entra em disputa conforme a natureza da lacuna.

### 6.3 Snapshot econômico

EvidenceRecord registra, sem calcular por conta própria:

- moeda;
- `calculatedPrice`;
- `finalPrice`;
- `chargedPrice` ou valor de CampaignBudget consumível correlacionado;
- diferença entre calculado e final;
- fatores dinâmicos e contribuição de cada fator;
- descontos/override autorizados, ator, motivo e policy version;
- impostos, retenções e bases conhecidas;
- valor bruto e valor líquido de referência;
- cinco percentuais do split;
- `SplitPolicyVersion`;
- valores esperados por papel quando a precisão e o arredondamento estiverem aprovados;
- `PricingPolicyVersion`;
- `PricingAlgorithmVersion`;
- `SettlementPolicyVersion`;
- `TaxPolicyVersion`;
- identificação da reserva de CampaignBudget.

Registrar esses dados não cria SplitShare nem PartnerCredit. Settlement revalida elegibilidade e cria direitos; Evidence preserva a explicação do valor.

Se precisão/arredondamento ainda estiverem `OPEN`, a Evidence deve preservar os valores de entrada e a versão da política que futuramente fechará o cálculo. Nenhuma implementação pode escolher arredondamento silenciosamente.

### 6.4 Conteúdo mínimo consolidado

Além do snapshot econômico, a Evidence contém:

- Evidence, PlaybackEvent, Attempt, PlayerSession e Slot identities;
- Campaign, TV, Device e Creative Asset references;
- instante original, duração e janela autorizada;
- assinatura, chave/versionamento e resultado da verificação;
- checksums do playback, criativo e pacote;
- versões operacionais relevantes;
- validações executadas, resultados e policy version;
- telemetria permitida e confidence;
- origem de cada campo;
- canonical schema version;
- correlation e causation;
- histórico de disputa/reversão;
- referência ao QuantumAnchor, por projection, sem misturar owners.

## 7. Construção

### 7.1 Pré-condições

`BuildEvidence` só pode ser aceito quando:

- o emissor é o Evidence Builder autorizado;
- o PlaybackEvent possui envelope reconhecível e identidade;
- o mesmo `playbackEventId` não produziu resultado diferente;
- as referências disponíveis podem ser correlacionadas sem ambiguidade;
- a versão do schema pode ser interpretada;
- as fontes utilizadas são identificadas.

Assinatura inválida não impede necessariamente a criação do registro; ela impede `VALID` e deve permanecer como evidência da rejeição.

### 7.2 Passos

1. Deduplicar a submissão.
2. Verificar integridade estrutural do envelope.
3. Resolver Slot e snapshots por identidade/revisão histórica, nunca pelo “estado atual”.
4. Congelar a proveniência de cada campo.
5. Calcular digest do conjunto construído.
6. Criar `EvidenceRecord` em `PENDING_VALIDATION`.
7. Publicar `EvidenceGenerated`.

Builder não declara `VALID`, não solicita pagamento e não ancora.

### 7.3 Falha de construção

Se o evento não puder formar sequer um registro identificável, a entrada permanece na trilha de ingestão com erro classificado e não é descartada. Se há identidade suficiente, o EvidenceRecord é criado e o Validator decide `INVALID` ou `DISPUTED`.

Retry usa a mesma identidade. Uma correção legítima do fato de origem exige novo PlaybackEvent/attempt correlacionado; não muda o payload assinado anterior.

## 8. Validação

### 8.1 Autoridade

Evidence Validator emite `ValidateEvidence`; o EvidenceRecord decide a transição aplicando `EvidenceValidationPolicyVersion`. O Validator não escreve status diretamente.

### 8.2 Matriz mínima

| Verificação | Resultado quando falha comprovadamente | Resultado quando informação é inconclusiva |
| --- | --- | --- |
| Assinatura e chave vigente no instante | `INVALID` | `DISPUTED`/aguarda reconciliação de identidade |
| TV/Device/Slot correlation | `INVALID` | `DISPUTED` |
| Janela temporal | `INVALID` | `DISPUTED` por clock drift não resolvido |
| Creative chegou ao final natural, duração observada e limites do Slot | `INVALID` se houve interrupção anterior | `DISPUTED` somente quando os fatos de conclusão forem conflitantes |
| Falha após o final natural, durante o frame congelado | preserva o resultado da execução | incidente posterior correlacionado; não desfaz cobrança ou repasse |
| Creative checksum | `INVALID` | `DISPUTED` |
| Playback checksum/integridade | `INVALID` | `DISPUTED` |
| Unicidade | duplicata sem novo efeito | `DISPUTED` quando há duas origens concorrentes |
| PricingQuote aplicado | `INVALID` se divergência comprovada | `DISPUTED` se snapshot histórico indisponível |
| Reserva/valor | `INVALID` se não autorizado | `DISPUTED` se confirmação está atrasada |
| Policy versions | `INVALID` se versão incompatível | permanece pendente se recuperável |
| Telemetria opcional | reduz confidence ou é ignorada | nunca substitui verificação obrigatória |

`INVALID` exige falha determinística. `DISPUTED` representa ambiguidade material ou contestação. Indisponibilidade temporária de uma fonte não deve ser convertida em invalidação definitiva por timeout.

### 8.3 Resultado

- `VALID`: todas as condições obrigatórias passaram sob uma policy version conhecida.
- `INVALID`: uma ou mais condições bloqueantes falharam de modo comprovado.
- `DISPUTED`: há contestação ou incerteza material que requer decisão.

`EvidenceValidated` não significa ancorada. `AnchoringConfirmed` não torna Evidence inválida em válida.

### 8.4 Confidence

`EvidenceConfidence` é explicável e derivado de sinais permitidos. Ele não substitui gates binários como assinatura, Slot e checksum. Os pesos e limiares quantitativos são política versionada; ausência de valor aprovado não autoriza um modelo opaco.

## 9. State machines independentes

### 9.1 Validade da Evidence

| Estado | Transição permitida | Command | Event | Observação |
| --- | --- | --- | --- | --- |
| `BUILDING` | `PENDING_VALIDATION` | `BuildEvidence` | `EvidenceGenerated` | fontes e proveniência congeladas |
| `PENDING_VALIDATION` | `VALID` | `ValidateEvidence` | `EvidenceValidated` | todos os gates passam |
| `PENDING_VALIDATION` | `INVALID` | `ValidateEvidence` | `EvidenceRejected` | falha comprovada |
| `PENDING_VALIDATION` | `DISPUTED` | `ValidateEvidence`/`OpenEvidenceDispute` | `EvidenceDisputed` | ambiguidade material |
| `VALID` | `DISPUTED` | `OpenEvidenceDispute` | `EvidenceDisputed` | suspende elegibilidade futura |
| `VALID` | `REVERSED` | `ReverseEvidence` | `EvidenceReversed` | compensação append-only |
| `DISPUTED` | `VALID` | `ResolveEvidenceDispute` | `EvidenceDisputeResolved` + decisão confirmada | resolução preserva histórico |
| `DISPUTED` | `INVALID` | `ResolveEvidenceDispute` | `EvidenceDisputeResolved` + rejeição | não apaga estado anterior |
| `DISPUTED` | `REVERSED` | `ReverseEvidence` | `EvidenceReversed` | quando direito anterior existiu |

`INVALID` e `REVERSED` são finais para aquela Evidence. Novo fato exige nova identidade e causation explícita.

### 9.2 QuantumAnchor

| Estado | Transição | Causa | Recuperação |
| --- | --- | --- | --- |
| `NOT_REQUESTED` | `REQUESTED` | pacote canônico válido e hash congelado | retry do mesmo Command retorna solicitação |
| `REQUESTED` | `CONFIRMED` | recibo válido | final para aquele hash |
| `REQUESTED` | `PENDING_CONFIRMATION` | timeout/resultado desconhecido | consultar ou repetir a mesma identidade |
| `REQUESTED/PENDING_CONFIRMATION` | `FAILED_RETRYABLE` | falha recuperável comprovada | nova tentativa correlacionada, mesmo hash |
| `FAILED_RETRYABLE` | `REQUESTED` | retry policy autoriza | preserva tentativas |
| `REQUESTED/PENDING_CONFIRMATION` | `FAILED_FINAL` | rejeição definitiva comprovada | diagnóstico; nova versão canônica só se causa legítima |

Anchor confirmado não é apagado. Se o pacote precisar ser substituído, uma nova versão/hash e nova relação são criados.

### 9.3 Eligibility projection

Uma Evidence é elegível somente quando:

`validity == VALID`

`AND reversed == false`

`AND openDispute == false`

`AND anchor.status == CONFIRMED`

A projection não altera Evidence nem QuantumAnchor. Settlement deve registrar a revisão de elegibilidade observada.

## 10. Commands

| Command | Owner | Emissor | Pré-condições | Pós-condições | Idempotência/falha |
| --- | --- | --- | --- | --- | --- |
| `BuildEvidence` | EvidenceRecord | Evidence Builder Cloud | PlaybackEvent identificável e não conflitante | `PENDING_VALIDATION`; `EvidenceGenerated` | por `playbackEventId`; payload divergente é incidente |
| `ValidateEvidence` | EvidenceRecord | Evidence Validator | pending; fontes/policy identificadas | VALID, INVALID ou DISPUTED | por Evidence + policy version + input digest |
| `OpenEvidenceDispute` | EvidenceRecord | parte/monitor autorizado | motivo e material correlacionados | DISPUTED | por dispute identity |
| `ResolveEvidenceDispute` | EvidenceRecord | autoridade segregada de Evidence | disputa de validade aberta; conclusão fundamentada sobre validade | resolução de validade append-only | retry retorna primeira resolução; nunca atribui culpa |
| `ReverseEvidence` | EvidenceRecord | autoridade segregada/política | causa material comprovada | REVERSED final | por reversal decision; nunca edita registro |
| `PrepareCanonicalEvidencePackage` | EvidenceRecord | Evidence Ledger | VALID; versão canônica disponível | pacote/hash associados | por Evidence + canonical version |
| `AnchorEvidence` | QuantumAnchor | Quantum Integration | hash permitido e ainda não confirmado | solicitação/tentativa registrada | por hash; timeout é desconhecido |

Todo Command registra ator/sistema, autorização, motivo, correlation, causation, revisão esperada, policy versions, timestamp e resultado.

## 11. Events

| Event | Produtor | Consumidores | Payload conceitual | Ordering e duplicidade | Compensação |
| --- | --- | --- | --- | --- | --- |
| `EvidenceGenerated` | EvidenceRecord | Validator, Analytics | Evidence, PlaybackEvent ref, fontes/digests, schema | Evidence revision; dedupe por origem | rejeição/disputa posterior |
| `EvidenceValidated` | EvidenceRecord | package builder, Campaign, eligibility | checks, policy, confidence, decisão | não repetir direito em replay | disputa/reversão |
| `EvidenceRejected` | EvidenceRecord | Campaign, Budget Saga, Analytics | regras falhas e versões | final por revisão | novo fato, nunca edição |
| `EvidenceDuplicateDetected` | EvidenceRecord/ingest authority | integridade, Operations | identidades, digests, classificação | por par conflitante | resolução explícita |
| `EvidenceDisputed` | EvidenceRecord | eligibility, Settlement, Operations | disputa, motivo e referências | por Evidence revision | resolução/reversão |
| `EvidenceDisputeResolved` | EvidenceRecord | mesmos consumidores | decisão e material permitido | por dispute revision | nova decisão compensatória |
| `EvidenceReversed` | EvidenceRecord | Settlement, Financial, CampaignBudget, Analytics | causa, decisão e refs afetadas | uma reversão lógica por decisão | linhas compensatórias downstream |
| `EvidenceHashed` | EvidenceRecord | Quantum Integration | hash e canonical version, sem payload proibido | por Evidence + canonical version | novo pacote/versionamento |
| `AnchoringRequested` | QuantumAnchor | adapter/observability | hash, tentativa, versão permitida | por anchor stream | retry |
| `AnchoringConfirmed` | QuantumAnchor | eligibility, Settlement, Analytics | receipt, hash, instante externo | repetição retorna mesmo recibo | não remove confirmação |
| `AnchoringFailed` | QuantumAnchor | retry/Operations | classificação, tentativa, known/unknown | não confundir timeout com rejeição | nova tentativa correlacionada |

Consumers deduplicam por `eventId`. Replay não solicita nova ancoragem, não cria Settlement e não consome CampaignBudget novamente.

## 12. Concorrência e ordering

### 12.1 Duas submissões idênticas

Ambas usam o mesmo PlaybackEvent. O primeiro `BuildEvidence` cria o registro; o segundo retorna a identidade e o resultado existentes.

### 12.2 Mesma identidade, payload diferente

Nenhum vence por ordem de chegada. O conflito é registrado, a prova não se torna válida automaticamente e o dispositivo pode ser encaminhado para diagnóstico/quarantine por Command ao TV Network.

### 12.3 Dois PlaybackEvents para o mesmo Slot

A política de unicidade determina qual tentativa, se alguma, é elegível. O Evidence Ledger preserva ambas as origens e publica detecção de duplicidade. Ele não soma duração nem escolhe a “mais favorável”.

### 12.4 Evento offline fora de ordem

Ordering usa a sequência da tentativa/TV. Um gap necessário mantém a validação pendente ou disputada apenas para o stream afetado. Outros Slots continuam.

### 12.5 Reversão concorrente com Settlement

Evidence e Settlement possuem owners distintos. Se Settlement ainda não fechou, a mudança de elegibilidade bloqueia a parcela afetada por Command próprio. Se já fechou, ele não reabre: Financial Platform e Settlement criam compensações correlacionadas conforme política.

## 13. Falhas, timeout e retry

| Falha | Estado | Retry | Consequência |
| --- | --- | --- | --- |
| Cloud indisponível na submissão | evento permanece na fila Edge | mesmo evento/assinatura | nenhuma Evidence local |
| Fonte Cloud temporariamente ausente | pending/disputed | recuperar snapshot histórico | não presumir INVALID |
| Assinatura comprovadamente inválida | INVALID | não muda a mesma Evidence | sem consumo/liquidação |
| Duplicidade de entrega | resultado original | acknowledgement idempotente | nenhum segundo efeito |
| Quantum indisponível | anchor pending/retryable | mesmo hash | Evidence VALID ainda não elegível |
| Timeout Quantum | pending confirmation | reconciliar antes de nova tentativa lógica | não presumir falha |
| Disputa aberta | DISPUTED | decisão humana/política | bloqueia somente escopo afetado |
| Reversão tardia | REVERSED | não reabre histórico | compensações downstream |
| Projection de eligibility atrasada | stale explícito | replay/rebuild | Settlement não usa revisão desconhecida |

Retries quantitativos e retenção local permanecem políticas versionadas ainda abertas. Não existe tolerância para omitir o final do Creative: a conclusão natural é obrigatória. A ausência dos demais números não permite retry infinito, descarte silencioso ou validade presumida.

## 14. Replay, reprocessamento e rebuild

### Replay

Replay de Evidence Events serve para reconstruir projections e auditoria. Ele não:

- cria nova Evidence;
- solicita nova ancoragem já confirmada;
- cria SplitShare;
- consome orçamento;
- envia notificação externa irreversível novamente.

### Reprocessamento

Reprocessar validação usa a policy version explicitamente escolhida e registra se o objetivo é reproduzir decisão histórica ou aplicar uma nova decisão compensatória. Uma policy nova não reescreve o resultado antigo.

### Rebuild

Eligibility projection é reconstruída em revisão nova a partir dos streams Evidence e QuantumAnchor. A revisão anterior permanece servindo até conferência de contagem, sequência, hashes e estados. Divergência abre diagnóstico; nunca edita os owners.

## 15. Disputa e reversão

Uma disputa deve informar:

- quem a abriu e sua autorização;
- motivo classificado;
- Evidence e itens contestados;
- material permitido;
- instante;
- escopo financeiro potencial;
- prazo/política aplicável;
- decisão e autoridade segregada.

Reversão exige motivo material e referência à decisão. Ela preserva:

- Evidence original;
- validações originais;
- anchor original;
- Settlements e direitos já criados;
- compensações geradas.

Cloud nunca altera uma prova para fazer o hash continuar igual. Qualquer representação corrigida possui nova versão e novo hash, ligada à anterior.

## 16. Auditoria

Para responder “por que paguei R$3,27?”, a trilha deve permitir reconstruir:

1. Slot e janela autorizados.
2. conteúdo e checksums.
3. fato assinado pelo Device.
4. validações e policy version.
5. preço calculado.
6. fatores dinâmicos.
7. override/desconto, se houver.
8. preço final e consumido.
9. impostos e retenções conhecidos.
10. split policy e cinco percentuais.
11. hash/pacote canônico.
12. QuantumAnchor.
13. Settlement e movimentos compensatórios posteriores.

A resposta não depende do estado atual das políticas.

## 17. Segurança e autorização

- somente identidade válida de Device assina PlaybackEvent;
- somente Evidence Builder Cloud emite BuildEvidence;
- somente Validator autorizado solicita validação;
- disputa pode ser aberta por papéis autorizados, mas resolução/reversão exige segregação;
- operador técnico não altera preço, status financeiro ou payload;
- Quantum não recebe Campaign, pessoa, preço ou PlaybackEvent;
- toda consulta sensível aplica minimização e autorização.

Os papéis exatos e a retenção são decisões abertas da matriz global; owner e segregação não são opcionais.

## 18. Exemplos

### Exemplo válido — reprodução online

Um Slot fixo de 15 segundos possui quote final de R$3,27 e reserva correspondente. O Advertiser forneceu Creative de 13 segundos. Player conclui o Creative, encerra o áudio e mantém o último frame visível pelos 2 segundos restantes, sem antecipar o conteúdo seguinte. Edge assina e submete o PlaybackEvent preservando duração do Creative, período do frame congelado e limites da janela. Builder correlaciona quote, reserva, políticas e cria Evidence pendente. Validator confirma identidade, janela, conclusão do Creative e checksums. O pacote é congelado, o hash é ancorado e a eligibility projection passa a verdadeira. Só então a Saga solicita consumo da reserva e Settlement pode considerar a Evidence.

### Exemplo válido — anchor atrasado

Evidence torna-se VALID enquanto Quantum está indisponível. Ela permanece não elegível. O mesmo hash é reenviado; o recibo tardio confirma o anchor. Nenhuma nova Evidence é criada.

### Contraexemplo — Edge declara validade

O Edge envia `{ status: VALID, amount: 3.27 }` e o Cloud cria crédito. Proibido: status e valor probatório não pertencem ao Edge, e ainda falta ancoragem e Settlement.

### Contraexemplo — política atual aplicada ao passado

Ao reconstruir uma Evidence antiga, o Builder usa o PricingPolicy atual porque a versão histórica não está disponível. Proibido: a Evidence deve aguardar recuperação ou entrar em disputa; nunca inventar a decisão passada.

### Contraexemplo — duplicate delivery

O consumidor recebe `EvidenceValidated` duas vezes e consome duas reservas. Proibido: o segundo Event tem a mesma identidade e não produz efeito.

## 19. Casos inválidos

São sempre inválidos:

- Evidence criada no Edge;
- Quantum recebendo PlaybackEvent;
- `VALID` sem assinatura, Slot, janela, duração e checksums aprovados;
- Evidence editada após qualquer decisão;
- anchor tratado como validação;
- validação tratada como anchor;
- timeout tratado como rejeição definitiva;
- duas Evidences elegíveis para a mesma unidade atômica;
- preço atual usado no lugar do quote congelado;
- split calculado pelo Edge;
- replay que repete efeito financeiro;
- reversão que apaga hash ou recibo anterior;
- Settlement lendo diretamente o Player.

## 20. Critérios de aceite

O Evidence Pipeline está implementável somente quando:

- owners e contratos acima estão preservados;
- conclusão natural do Creative e preservação da janela fixa são comprováveis;
- policy versions históricas são recuperáveis;
- todos os Commands e Events estão no catálogo;
- a máquina de validade não se mistura à máquina de anchor;
- duplicidade, gap, offline, disputa e reversão possuem testes de contrato;
- eligibility projection pode ser reconstruída;
- nenhuma etapa pode pular `PENDING_VALIDATION`, `VALID` e `CONFIRMED` quando aplicáveis;
- auditoria reconstrói integralmente preço e prova.
