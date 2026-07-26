# Regras de Consistência e Governança

## Hierarquia

1. `PLATFORM_SPECIFICATION.md` é fonte normativa primária após status `ACCEPTED`.
2. ADRs registram por que uma decisão foi tomada e suas supersessões.
3. Documentos de `product/`, `domain/`, `execution/`, `financial/` e `tv-network/` são derivados normativos/detalhados.
4. A implementação futura é derivada e não pode redefinir a especificação.

Enquanto a especificação estiver `DRAFT`, os documentos aprovados existentes continuam operacionais e toda divergência deve aparecer no Decision Registry.

## Processo de mudança

1. Propor alteração com identificador de decisão e motivação.
2. Atualizar primeiro a especificação e marcar se há ADR novo/supersessão.
3. Atualizar `DECISION_REGISTRY.md` e `TRACEABILITY.md`.
4. Sincronizar todos os documentos derivados afetados.
5. Validar invariantes, links, termos e contradições.
6. Somente então alterar contratos de implementação.

## Regras de escrita

- Toda regra normativa possui ID estável (`SPEC-*`, `DEC-*`, `OPEN-*`).
- Decisão desconhecida é `OPEN`; nunca é completada por suposição.
- Termos do domínio usam o dicionário oficial.
- “Deve/nunca/somente” é reservado a regra normativa.
- Exemplos não alteram a regra e devem ser identificados como exemplos.
- Mudança de significado exige versão e registro; mudança editorial não reutiliza decisão para outro propósito.

## Validação mínima

- Nenhum Bounded Context possui dois owners.
- Command altera somente seu Aggregate owner.
- Event é passado, imutável, versionado e idempotente no consumo.
- Saga não decide regra.
- Estado final não retorna sem Aggregate/linha compensatória nova.
- Percentuais somam 100%.
- Evidence nasce no Cloud; Quantum não recebe PlaybackEvent.
- Settlement não paga; Campaign não consome ContractValue.
- TV Network não conhece domínios comerciais/financeiros/prova.
- Links Markdown resolvem e `git diff --check` passa.

## Estado de sincronização

Cada entrega deve registrar:

- versão da especificação;
- decisões adicionadas/alteradas;
- documentos derivados atualizados;
- documentos pendentes e motivo;
- validações executadas.
