# Rollback Policy

## Natureza

Rollback é uma nova operação que tenta convergir um componente para uma versão anteriormente aprovada e compatível. Não apaga update, falha, versão, HealthRecord ou diagnóstico.

`UpdateRollout` coordena rollback de onda; `EdgeInstallation` é owner da tentativa individual.

## Baseline elegível

A versão de destino deve:

- existir no histórico confiável do dispositivo ou da política;
- ter sido aprovada;
- ser compatível com hardware, OS, Firmware, manifesto e dependências atuais;
- não estar revogada;
- possuir condição de instalação e validação;
- ser acompanhada por estratégia caso não possa ser aplicada.

“Última versão saudável” significa a versão mais recente que satisfaz esses critérios sob a política vigente; não é simplesmente o número anterior.

Quando não existe baseline elegível, rollback é proibido. A resposta segura é pausar, suspender ou quarentenar e solicitar intervenção.

## Gatilhos

Rollback pode ser solicitado por:

- Health gate crítico após update;
- violação de segurança ou integridade;
- falha de inicialização/estabilização;
- incompatibilidade observada;
- decisão autorizada durante rollout.

Rollback automático só é permitido quando política pré-aprovada define gatilho, escopo, baseline, janela e limites. “Automático” não significa sem autorização normativa.

## Ciclo de vida

```text
REQUESTED → ELIGIBILITY_CHECKED → AUTHORIZED → EXECUTING → OBSERVING
OBSERVING → SUCCEEDED | DEGRADED | FAILED
REQUESTED/ELIGIBILITY_CHECKED → REJECTED
AUTHORIZED → EXPIRED | CANCELLED
```

Todos os resultados são finais para a tentativa. `DEGRADED` significa que a versão foi restaurada, mas Health não recuperou integralmente.

## Processo

1. congelar o escopo e a versão falha;
2. registrar causa, sintomas e política;
3. selecionar e validar baseline;
4. verificar conflito com emergência/manutenção;
5. emitir `RollbackUpdate` idempotente;
6. observar Version Inventory e Current State;
7. executar Health gate pós-rollback;
8. concluir com estado observado;
9. decidir separadamente a situação da TV e do rollout.

Rollback nunca coloca a TV automaticamente em `ACTIVE`.

## Ordering, duplicidade e retry

- A chave idempotente inclui EdgeInstallation, rollout/onda, componente, versão falha e baseline.
- Mesma chave com baseline diferente é conflito.
- Apenas um rollback incompatível executa por componente.
- Retry mantém baseline e causa; mudança de baseline exige nova decisão.
- Timeout de ACK, execução e observação são distintos.
- Resultado tardio gera reconciliação, não reabertura silenciosa.

Máximo de tentativas, timeouts, período de observação e condições de nova tentativa são `OPEN`.

## Rollback parcial e dependências

Quando vários componentes mudaram, a ordem é declarada pela política de compatibilidade. Um componente não pode ser restaurado isoladamente se isso criar combinação não aprovada.

O estado final registra exatamente quais componentes voltaram, falharam ou permaneceram. “Sucesso parcial” não pode ser publicado como sucesso integral.

## Emergência e quarentena

Rollback é bloqueado quando conflita com operação de emergência superior ou quando seu baseline é inseguro. Nesse caso, o equipamento permanece indisponível, suspenso ou quarentenado conforme política.

Spoofing de versão, conflito de identidade ou integridade inválida torna o resultado não confiável e impede conclusão `SUCCEEDED`.

## Auditoria

`UpdateRolledBack` preserva versão falha, baseline, componentes, política, gatilho, diagnóstico, tentativas, atores, timestamps, Current/Observed State e HealthRecords anteriores/posteriores.

## Exemplos

**Válido:** versão anterior é compatível, rollback aplica e Health fica `DEGRADED`. A tentativa termina `DEGRADED` e a TV não é ativada automaticamente.

**Válido:** não existe baseline compatível. O rollback é `REJECTED`, o Edge fica quarentenado e o histórico explica a impossibilidade.

**Contraexemplo:** apagar o registro da versão falha para que o inventário mostre apenas a restaurada.

**Contraexemplo:** trocar para qualquer versão “mais antiga” sem validar compatibilidade e revogação.
