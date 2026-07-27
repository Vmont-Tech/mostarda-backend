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

## Estrutura obrigatória de uma especificação de contexto

Documentos de contexto não podem ser apenas inventários. Cada documento deve conter, quando aplicável:

1. **Propósito e razão arquitetural:** qual problema resolve, por que o conceito existe e quais alternativas foram recusadas.
2. **Escopo e fronteiras:** responsabilidades, não responsabilidades, owner e dependências permitidas.
3. **Modelo de domínio:** Aggregates, entidades, Value Objects, políticas, Services conceituais e ownership de cada informação.
4. **Invariantes:** regras verdadeiras antes e depois de qualquer transição.
5. **Commands:** owner único, emissor, pré-condições, pós-condições, falhas, autorização, idempotência e auditoria.
6. **Events:** produtor, consumidores, payload conceitual, ordering, versionamento, duplicidade, retry e compensações.
7. **Máquinas de estado:** todos os estados, transições, Command causador, Event resultante, timeout, retry, recuperação e estados finais.
8. **Fluxos:** happy path, falhas, concorrência, consistência eventual, indisponibilidade externa e recuperação.
9. **Exemplos e contraexemplos:** ao menos um cenário válido e um inválido para cada regra crítica.
10. **Decisões abertas:** somente valores ou políticas realmente não decididos; nunca usar `OPEN` para evitar definir comportamento estrutural.

Um engenheiro sênior deve conseguir implementar o comportamento do contexto sem precisar decidir ownership, ordem, transição, concorrência ou compensação. Valores quantitativos ainda não aprovados devem ser representados por políticas versionadas, com o ponto de decisão explicitamente identificado.

## Critério de profundidade

Uma especificação é considerada completa somente quando responde:

- quem pode iniciar a mudança;
- qual Aggregate decide;
- qual revisão/estado é esperado;
- o que ocorre sob concorrência;
- qual fato é publicado;
- como duplicidade e entrega fora de ordem são tratadas;
- quando ocorre timeout;
- o que é compensado e o que jamais é revertido;
- como auditoria, replay e rebuild preservam significado;
- por que a separação arquitetural existe.

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
