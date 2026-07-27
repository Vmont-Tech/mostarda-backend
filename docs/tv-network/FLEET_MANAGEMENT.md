# Fleet Management

## Propósito e owner

`Fleet` é Aggregate de definição e versionamento de grupos operacionais. Pode agrupar TVs por região, Venue, owner, modelo, versão, Capability, Connectivity, Health ou finalidade operacional.

Fleet não é owner das TVs, Devices ou EdgeInstallations. Uma ação de frota emite Commands individuais e acompanha resultados.

## Definição e membership

Uma revisão de Fleet contém:

- `fleetId`, nome e finalidade;
- critério declarativo ou lista explícita;
- membros incluídos/excluídos;
- origem dos dados;
- revisão e vigência;
- ator/policy;
- relação com revisão anterior.

Membership dinâmica pode mudar entre avaliações. Toda operação congela `FleetSnapshot` imutável com membros e revisão usados; mudanças posteriores não alteram a população da ação.

## Lifecycle

```text
ACTIVE → ACTIVE, por nova membership revision
ACTIVE → RETIRED
```

`RETIRED` é final. Nova finalidade incompatível usa nova Fleet.

## Operação em Fleet

1. selecionar revisão da Fleet;
2. congelar snapshot;
3. validar policy, escopo, maintenance windows e limite de impacto;
4. criar plano por membro;
5. emitir Command individual ao owner;
6. registrar ACK, execução, timeout e resultado por membro;
7. agregar sem ocultar `UNKNOWN`, falhas ou quarentenas;
8. concluir a operação com cobertura e impacto explícitos.

Fleet action nunca executa mutação em massa direta.

## Ordering, duplicidade e retry

Ordering de membership é por Fleet/revisão. Ordering de ação é por `fleetOperationId`; cada membro mantém ordering em seu próprio Aggregate.

Duplicata de operação com mesmo snapshot/payload é idempotente. Mesma chave com snapshot ou intenção diferente é conflito.

Retry é individual quando seguro. Reexecutar a Fleet inteira não pode duplicar efeito nos membros já concluídos. Resultado tardio é reconciliado e não reabre conclusão silenciosamente.

Timeouts, concorrência, tamanho máximo de onda e política de retry são `OPEN`.

## Fleet Health

Fleet Health é projeção sobre snapshot e janela. Preserva população, cobertura, distribuição de estados, score/confiança, versões de policy e dimensões críticas.

TV `UNKNOWN` não é removida do denominador sem declaração. Média saudável não compensa dimensão crítica bloqueante. Fórmula, pesos e limiares permanecem `OPEN`.

## Spoofing e quarentena

Membro com identidade conflitante ou quarentenado é explicitamente classificado e excluído de ações não permitidas pela política; nunca é removido silenciosamente do resultado.

## Eventos

`FleetCreated`, `FleetMembershipChanged`, `FleetSnapshotFrozen`, `FleetOperationRequested`, `FleetMemberOperationCompleted`, `FleetOperationCompleted`, `FleetRetired`, `FleetHealthAssessed` e `FleetHealthChanged`.

## Exemplos

**Válido:** rollout congela 20 membros; uma TV muda de região depois. Ela continua no snapshot daquela onda, e a mudança vale para futuras ações.

**Válido:** 18 membros concluem, um falha e um fica `UNKNOWN`; resultado informa os três grupos e a cobertura.

**Contraexemplo:** recalcular members durante a onda para excluir TVs que falharam.

**Contraexemplo:** Fleet escreve `SUSPENDED` diretamente em todas as TVs em vez de emitir `SuspendTV` individual.
