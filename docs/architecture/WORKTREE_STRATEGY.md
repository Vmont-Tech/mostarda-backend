# Estratégia de Git Worktrees

## 1. Propósito

Este documento define o uso normativo de Git worktrees no repositório Mostarda.

Worktrees isolam iniciativas simultâneas sem duplicar o repositório, misturar alterações pendentes ou exigir trocas destrutivas de branch. Cada worktree representa uma iniciativa arquitetural identificável, com escopo, owner, branch e condição de encerramento próprios.

Worktree não representa um bounded context permanente nem uma cópia independente da plataforma. Ele é um ambiente temporário de trabalho ligado ao mesmo repositório Git.

## 2. Local normativo

Todos os worktrees locais do projeto devem ser criados sob:

```text
.worktrees/
```

O diretório é ignorado pelo Git no `.gitignore` raiz. Seu conteúdo nunca pode ser adicionado ao índice, incluído em commits ou tratado como fonte normativa.

Exemplo:

```text
.worktrees/
├── governance-sync/
├── financial-platform/
├── pricing-engine/
└── release/
```

## 3. Convenção de nomes

O nome deve representar a iniciativa, não o nome do colaborador ou uma descrição genérica.

Formato:

```text
<bounded-context-ou-iniciativa>[-<qualificador>]
```

Exemplos válidos:

- `governance-sync`;
- `financial-platform`;
- `pricing-engine`;
- `campaign-budget`;
- `edge-runtime`;
- `evidence-ledger`;
- `domain-freeze-review`;
- `release`.

Nomes como `temp`, `teste`, `vinicius`, `branch-2` ou `changes` são proibidos porque não comunicam propósito nem lifecycle.

## 4. Relação entre worktree e branch

Cada worktree deve possuir uma branch exclusiva. A mesma branch não pode estar ativa simultaneamente em dois worktrees.

Convenção recomendada:

```text
agent/<nome-do-worktree>
```

Exemplo:

```text
.worktrees/governance-sync
└── agent/governance-sync
```

O nome do diretório e o sufixo da branch devem permanecer semanticamente equivalentes.

## 5. Quando criar

Um novo worktree deve ser criado quando:

- uma iniciativa precisa evoluir isoladamente de alterações pendentes;
- duas frentes autorizadas podem avançar sem compartilhar arquivos mutáveis;
- uma auditoria precisa preservar um baseline reproduzível;
- uma sincronização normativa abrange múltiplos documentos;
- uma correção urgente precisa coexistir com trabalho de longa duração;
- uma release precisa de estabilização independente.

Não se cria novo worktree para:

- leitura ou diagnóstico sem alterações;
- uma edição trivial já pertencente à iniciativa ativa;
- fragmentar artificialmente mudanças que precisam ser atômicas;
- contornar conflitos que deveriam ser resolvidos no modelo de domínio.

## 6. Escopo permitido

Um worktree pode conter alterações de mais de um bounded context somente quando:

- existe um contrato transversal explícito;
- a mudança possui uma causa arquitetural única;
- a rastreabilidade identifica todos os documentos impactados;
- a revisão consegue verificar atomicamente produtores, consumidores e invariantes;
- separar os commits deixaria o repositório temporariamente incoerente.

Alterações independentes devem usar worktrees distintos.

É proibido misturar na mesma iniciativa:

- descoberta de regra de negócio não aprovada e implementação;
- refatoração não relacionada e sincronização normativa;
- mudanças de infraestrutura e alteração de contrato sem plano comum;
- correções experimentais e baseline destinado a Domain Freeze.

## 7. Criação

Antes da criação:

1. confirmar que o worktree de origem está limpo;
2. confirmar que `.worktrees/` está ignorado;
3. escolher um baseline commitado e identificável;
4. verificar que a branch pretendida não existe em outro worktree;
5. registrar objetivo, escopo e plano da iniciativa.

Comando conceitual:

```powershell
git worktree add .worktrees/<nome> -b agent/<nome>
```

Após a criação, executar as verificações de baseline aplicáveis ao projeto. Falhas preexistentes devem ser registradas antes de qualquer modificação.

## 8. Política de commits

Cada commit deve:

- possuir uma causa única e mensagem descritiva;
- preservar alterações alheias;
- separar tooling, baseline, decisão normativa e sincronização;
- evitar declarar conclusão sem verificação;
- manter Decision Registry e Traceability consistentes quando aplicável.

Um commit de baseline não aprova regras, não fecha decisões abertas e não transforma drafts em especificações vigentes.

## 9. Política de revisão e integração

Antes da integração:

1. executar as verificações previstas no plano;
2. revisar o diff completo contra o baseline;
3. confirmar ausência de decisões implícitas;
4. validar links e referências cruzadas;
5. validar owners de Aggregates, Commands e Events;
6. validar invariantes e contratos afetados;
7. registrar decisões abertas sem resolvê-las por inferência;
8. obter aprovação exigida pelo nível de mudança.

O merge deve preservar commits semanticamente úteis. Squash só é permitido quando não elimina rastreabilidade arquitetural necessária.

## 10. Relação com Domain Freeze

Antes do Domain Freeze, worktrees podem ser usados para fechar bounded contexts e corrigir inconsistências aprovadas.

Durante o `Domain Freeze Review (Architecture Lock)`:

- cada iniciativa relevante deve estar integrada ou explicitamente excluída;
- não pode existir decisão normativa apenas dentro de um worktree;
- o baseline certificado deve corresponder a um commit identificável;
- worktrees não integrados não fazem parte do domínio congelado.

Após o Architecture Lock, qualquer mudança de domínio exige novo processo decisório, análise de impacto, novo baseline e recertificação.

## 11. Remoção

Um worktree só pode ser removido quando:

- não possui alterações pendentes;
- seus commits foram integrados, preservados em branch ou explicitamente descartados com autorização;
- a verificação final foi registrada;
- não é necessário para auditoria ativa.

Remover o diretório manualmente não substitui `git worktree remove`. Após remoções ou falhas, executar `git worktree prune` quando necessário.

## 12. Invariantes operacionais

1. `.worktrees/` nunca é versionado.
2. Cada worktree possui uma branch exclusiva.
3. Cada worktree possui propósito e lifecycle explícitos.
4. Nenhuma decisão de domínio nasce implicitamente de uma separação de branches.
5. Nenhum baseline altera regras por si só.
6. Nenhum worktree não integrado participa do Domain Freeze.
7. Nenhum worktree com alterações pendentes é removido sem autorização.
8. Toda integração normativa preserva Decision Registry e Traceability.
