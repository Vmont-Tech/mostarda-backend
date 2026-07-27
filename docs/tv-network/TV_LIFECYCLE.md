# TV Lifecycle

## Identidade e significado

`TV` representa um nó lógico permanente da rede e possui `TVIdentifier` não reutilizável. O identificador não é serial do Display, do MiniPC nem identidade da instalação Edge. Trocar hardware não renomeia a TV; substituir o próprio nó lógico exige descomissionar o anterior e registrar outro.

## Estados

| Estado | Significado |
| --- | --- |
| `REGISTERED` | identidade criada; ainda não há instalação aceita |
| `INSTALLING` | existe instalação física planejada ou em execução |
| `INSTALLED` | instalação aceita; ainda não há garantia de runtime provisionado |
| `PROVISIONING` | identidade Edge, versões, Current State e Capabilities estão sendo validados |
| `ACTIVE` | política vigente confirma disponibilidade operacional |
| `SUSPENDED` | disponibilidade retirada por decisão operacional, segurança, saúde ou ausência de requisitos |
| `MAINTENANCE` | existe manutenção aberta aplicável à TV |
| `DECOMMISSIONED` | nó lógico encerrado definitivamente |

Fluxo nominal:

```text
REGISTERED → INSTALLING → INSTALLED → PROVISIONING → ACTIVE
                                                ↘ SUSPENDED
ACTIVE ↔ SUSPENDED
ACTIVE/SUSPENDED → MAINTENANCE → ACTIVE/SUSPENDED
qualquer estado não final → DECOMMISSIONED
```

## Regras

- `ACTIVE` exige instalação aceita, Edge identificado, identidade confiável, Capability mínima ativa, Current State recente e Health aprovado.
- Entrada em `SUSPENDED` retira disponibilidade sem apagar inventário, Health, vínculos ou eventos.
- Saída de `SUSPENDED` exige nova avaliação; não é mera reversão administrativa.
- Fechar manutenção restaura o estado anterior apenas se os gates atuais ainda forem satisfeitos; caso contrário, a TV vai para `SUSPENDED`.
- `DECOMMISSIONED` é final. Credenciais ativas devem ser revogadas, comandos pendentes invalidados e vínculos encerrados, preservando histórico.
- Nenhuma transição pode saltar instalação ou provisionamento.
- Toda transição exige Command autorizado, motivo, ator, instante, correlação, revisão esperada e evento resultante.

## Substituição

Substituição de Display, MiniPC ou instalação Edge mantém o `TVIdentifier`, fecha o vínculo anterior e abre um vínculo novo. Durante a substituição, a TV fica `MAINTENANCE` ou `SUSPENDED` e passa novamente pelos gates afetados.

Substituição da própria TV lógica não reutiliza identidade: o nó anterior é `DECOMMISSIONED` e o substituto inicia em `REGISTERED`.

## Recuperação

Falha de instalação cria nova tentativa de `Installation`; falha de provisionamento mantém `PROVISIONING` ou leva a `SUSPENDED`; falha de runtime usa diagnóstico, restart, update ou rollback conforme política. Recuperação nunca corrige ou exclui fatos passados.

## Ordering, idempotência e auditoria

Ordering é por TV/revisão. Todo Command declara revisão esperada; mensagem atrasada não pode reabrir estado nem aplicar transição a partir de origem diferente.

Repetir o mesmo Command é idempotente. Mesma chave com destino/motivo divergente é conflito. Relógio do Edge não governa lifecycle; transições preservam instante da observação e da decisão.

Eventos normativos: `TvRegistered`, `TvInstallationStarted`, `TvInstalled`, `TvProvisioningStarted`, `TvActivated`, `TvSuspended`, `TvReactivated`, `TvEnteredMaintenance`, `TvExitedMaintenance`, `TvLocationChanged`, `TvOwnerChanged` e `TvDecommissioned`.

## Exemplos

**Válido:** TV sai de manutenção para `SUSPENDED` porque Current State ficou antigo durante a janela.

**Válido:** troca de Display mantém a TV em manutenção até os gates afetados serem reavaliados.

**Contraexemplo:** reativar TV suspensa apenas por ordem administrativa sem Health e Capability atuais.

**Contraexemplo:** reutilizar o identificador de TV descomissionada para outro Venue.
