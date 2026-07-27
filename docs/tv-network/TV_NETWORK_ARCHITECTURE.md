# TV Network — Arquitetura da Frota

## Status e linguagem normativa

Este documento define a fronteira oficial do Bounded Context `TV Network`. Os termos **DEVE**, **NÃO DEVE**, **PODE** e **OPEN** são normativos:

- **DEVE/NÃO DEVE** expressam obrigação ou proibição;
- **PODE** expressa comportamento permitido, mas não obrigatório;
- **OPEN** identifica decisão ainda não aprovada. Um item `OPEN` não pode ser preenchido por conveniência de implementação.

## Propósito

TV Network é proprietário da infraestrutura física e da disponibilidade operacional da Mostarda: identidade de TVs e dispositivos, instalação, provisionamento, Edge Runtime operacional, conectividade, Capability Registry, Heartbeat, Health, manutenção, atualização, rollback, agrupamento de frota e inventário operacional.

Sua responsabilidade termina na publicação de fatos verificáveis sobre **o que existe**, **onde está**, **qual versão executa**, **o que suporta** e **se está operacionalmente disponível**.

TV Network:

- nunca conhece Campaign, Slot comercial, anúncio, criativo, preço, orçamento, Financial Platform, Evidence ou Settlement;
- não interpreta consequência comercial de indisponibilidade;
- não decide elegibilidade publicitária;
- não instrui cobrança, crédito ou pagamento;
- não constrói prova de exibição;
- recebe somente intenções operacionais compatíveis com sua fronteira;
- publica fatos operacionais para que outros contextos tomem suas próprias decisões.

## Modelo operacional

```text
TV / Device Registry
        ↓
Installation
        ↓
Provisioning / Edge Identity
        ↓
Capability Registry / Version Inventory
        ↓
Edge Runtime
        ↓
Heartbeat / Current State
        ↓
Observed State / Health / Diagnosis
        ↓
Fleet / Maintenance / Update / Rollback
```

## Ownership

| Owner | Responsabilidade exclusiva |
| --- | --- |
| `TV` | identidade lógica permanente, Venue/localização/proprietário referenciados e ciclo de vida operacional |
| `DeviceRegistry` | identidade permanente de Display, MiniPC e periféricos; vínculos e substituições |
| `Installation` | plano, execução, verificação e aceite da instalação física |
| `EdgeInstallation` | identidade da instalação Edge, versões instaladas, estado do runtime e revisões Desired/Current aceitas |
| `TVCapability` | declaração, validação, ativação e retirada de uma capacidade operacional |
| `HealthRecord` | observação ou avaliação de saúde imutável e explicável |
| `MaintenanceWindow` | autorização temporal e de escopo para manutenção |
| `UpdateRollout` | plano, ondas, gates, resultados e compensações de atualização |
| `Fleet` | definição versionada de agrupamento e snapshot de membros usado por uma ação |

`NetworkInventory`, `ObservedState`, `OperationalHealth` e `FleetHealth` são **projeções derivadas**, não Aggregates e não fontes de comando. Elas podem ser reconstruídas a partir dos fatos proprietários.

## Fronteira do Edge

TV Network conhece o Player e o Canvas apenas como processos supervisionados e como itens de inventário de versão. Ele pode observar se estão presentes, responsivos e compatíveis, mas não conhece sua fila, conteúdo, Slot, criativo ou resultado comercial.

`Edge Runtime` é o envelope operacional; reprodução e composição mantêm ownership em seus contextos próprios. Uma falha de processo pode gerar diagnóstico e indisponibilidade operacional, nunca uma decisão sobre Campaign ou Evidence.

## Modelo de consistência

- Todo Command possui exatamente um owner.
- Um Aggregate só muda ao aceitar Command válido de seu próprio contexto.
- Eventos são fatos imutáveis; projeções não podem retroagir e reescrever fatos.
- Operações distribuídas convergem por Commands e Events, sem mutação transversal.
- `DesiredState` é intenção versionada; `CurrentState` é declaração do Edge; `ObservedState` é inferência independente.
- O Reconciler compara os três estados e emite Commands específicos. Ele nunca altera Aggregate diretamente.
- Duplicidade, atraso, replay e ausência de sinal são condições normais do domínio e devem produzir resultado determinístico e auditável.

## Disponibilidade operacional

Uma TV só pode ser anunciada como operacional quando sua política vigente confirmar, no mínimo:

- ciclo de vida compatível;
- instalação aceita;
- Edge identificado e não quarentenado;
- Current State suficientemente recente;
- Health conhecido e dentro da política;
- Capability exigida ativa e não degradada;
- versões compatíveis;
- ausência de bloqueio operacional ou manutenção incompatível.

Os limiares quantitativos, pesos e janelas que compõem essa decisão são `OPEN` até aprovação de uma `OperationalAvailabilityPolicy` versionada.

## Exemplos

**Válido:** TV Network publica que uma TV está `SUSPENDED`, com Capability indisponível e HealthRecord causal. Outro contexto decide o impacto sobre seu próprio trabalho.

**Válido:** TV Network inventaria a versão do Player e observa seu processo, sem acessar fila ou conteúdo reproduzido.

**Contraexemplo:** TV Network suspende uma Campaign ao detectar HDMI desconectado. Ele deve publicar o fato operacional e permanecer dentro de sua fronteira.

**Contraexemplo:** NetworkInventory altera diretamente uma EdgeInstallation para refletir uma versão desejada.
