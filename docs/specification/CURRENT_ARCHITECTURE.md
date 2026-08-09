# Current Architecture — Edge e TV Network

- **Status:** `AUDIT BASELINE — NÃO NORMATIVO`
- **Data-base:** 2026-08-09
- **Corte do repositório:** `main @ 7f16926c5060cb94772b688a80eb0ec3ea975c16`
- **Finalidade:** registrar, de forma factual, como a arquitetura Edge está descrita hoje no repositório
- **Não é:** uma aceitação do ADR-010, uma substituição da `PLATFORM_SPECIFICATION.md` ou uma autorização de implementação

## 1. Como este documento deve ser lido

Este documento é uma fotografia da documentação versionada. Ele separa quatro situações que não podem ser confundidas:

1. **Aceito:** decisão com autoridade vigente no repositório.
2. **Draft/Proposed:** proposta que ainda não substitui uma decisão aceita.
3. **Derivado:** documento que detalha uma fonte superior.
4. **Lacuna ou conflito:** informação que a própria auditoria registra como insuficiente ou sobreposta.

Nenhuma lacuna é preenchida por inferência neste documento. Quando duas fontes descrevem responsabilidades diferentes, ambas são registradas e o conflito é encaminhado para a análise de gaps.

Este documento continua sendo uma fotografia histórica do corte indicado no cabeçalho. Ele não substitui a reconciliação posterior nem o gate de autorização vigente, que é registrado em [`EDGE_ARCHITECTURE_CROSS_AUDIT.md`](EDGE_ARCHITECTURE_CROSS_AUDIT.md).

## 1.1 Eixos de classificação

Uma arquitetura documentada não é automaticamente uma arquitetura implementada. Cada item abaixo usa três eixos independentes:

| Eixo | Valores usados | Significado |
| --- | --- | --- |
| Contrato | `ACCEPTED`, `PROPOSED`, `DRAFT`, `OPEN` | força documental da regra ou contrato no corte |
| Implementação | `IMPLEMENTED`, `PARTIALLY IMPLEMENTED`, `NOT IMPLEMENTED` | evidência de código e testes no repositório; ausência de código não é tratada como implementação |
| Intenção | `CURRENT`, `CANDIDATE INTENT`, `NOT APPLICABLE` | se o item descreve o estado vigente ou um target pretendido |

`ACCEPTED` não significa `IMPLEMENTED`. `PROPOSED` e `DRAFT` não autorizam implementação. `OPEN` significa que a decisão necessária não está fechada. Quando não existe evidência de código, o estado de implementação é `NOT IMPLEMENTED`, ainda que exista documentação detalhada.

## 2. Fontes e autoridade observadas

| Fonte | Estado observado | Papel nesta fotografia |
| --- | --- | --- |
| [`PLATFORM_SPECIFICATION.md`](PLATFORM_SPECIFICATION.md) | `0.2.0-draft` / `DRAFT` | fonte normativa primária candidata; declara que não autoriza implementação antes de aceitação |
| [`ADR-002 — Arquitetura do Edge`](../adr/ADR-002-Edge-Architecture.md) | `Aceito` | decisão vigente sobre o Edge, inclusive a premissa de Mini PC |
| [`ADR-010 — Edge Hardware e Provisioning`](../adr/ADR-010-Edge-Hardware-and-Provisioning.md) | `Proposed` | proposta de plataforma heterogênea; ainda não supersede ADR-002 |
| [`EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md`](../tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md) | `DRAFT` | detalhamento candidato da proposta do ADR-010 |
| [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md) | parecer de auditoria | baseline de achados, conflitos e condições de aprovação |
| [`TRACEABILITY.md`](TRACEABILITY.md) | matriz existente | rastreabilidade anterior; ainda não sincronizada com ADR-010 |

### 2.1 Consequência de autoridade

Enquanto o ADR-010 permanecer `Proposed`, o estado normativo atual continua sendo o descrito pelo ADR-002. A proposta de hardware heterogêneo pode ser analisada, mas não pode ser tratada como premissa aceita por código, contrato público ou documento derivado.

## 2.2 Estado factual por área

| Área | Contrato | Implementação no corte | Intenção | Evidência factual |
| --- | --- | --- | --- | --- |
| Edge baseado em Mini PC | `ACCEPTED` | `PARTIALLY IMPLEMENTED` | `CURRENT` | ADR-002 aceito; há contratos e componentes transversais no repositório, mas não há um pacote completo de Edge Runtime |
| TV Network e lifecycles | `DRAFT`/derivado | `NOT IMPLEMENTED` como serviço de frota | `CURRENT` | documentos de TV Network, mas nenhum serviço correspondente identificado no corte |
| Edge Runtime | `ACCEPTED` no ADR-002; parâmetros `OPEN` | `NOT IMPLEMENTED` como aplicação Edge | `CURRENT` | `EDGE_RUNTIME.md` e `EDGE_RUNTIME_SPECIFICATION.md`; não existe `apps/edge` ou `packages/edge` no corte |
| Telemetry Ledger e identidades | contratos especializados existentes | `IMPLEMENTED` em escopo limitado | `CURRENT` | `packages/telemetry`, `packages/kernel`, testes de conformance e gates documentais |
| Persistence/Event Store/Projection Store | contratos TBS e persistência existentes | `PARTIALLY IMPLEMENTED` | `CURRENT` | pacotes `persistence`, `persistence-postgres`, migrações e testes de integração |
| Provisioning e Device Registry | `DRAFT`/derivado | `NOT IMPLEMENTED` como fluxo executável | `CURRENT` | `PROVISIONING.md`, `DEVICE_REGISTRY.md` e `INSTALLATION.md` são documentação |
| Hardware heterogêneo, Edge OS e Installer | `PROPOSED`/`DRAFT` | `NOT IMPLEMENTED` | `CANDIDATE INTENT` | ADR-010 e especificação Draft |
| OTA, Recovery e Hardware Compatibility por perfil | parcialmente documentados; decisões `OPEN` | `NOT IMPLEMENTED` como plataforma por perfil | `CANDIDATE INTENT` | `UPDATE_MANAGEMENT.md`, `ROLLBACK_POLICY.md` e proposta ADR-010 |
| Contracts públicos específicos do target heterogêneo | `OPEN`/não sincronizados | `NOT IMPLEMENTED` | `CANDIDATE INTENT` | `TRACEABILITY.md` ainda não referencia a mudança proposta |

Esta tabela não afirma que componentes transversais já entregam a plataforma Edge. Ela diferencia código existente no repositório de serviços e contratos que ainda não foram materializados.

## 3. Bounded Context e fronteira atual

O Bounded Context `TV Network` é descrito como owner da infraestrutura física e da disponibilidade operacional. A fronteira inclui identidade de TV e dispositivos, instalação, provisionamento, runtime operacional, conectividade, capabilities, heartbeat, health, manutenção, atualização, rollback, frota e inventário operacional.

O contexto não possui autoridade sobre Campaign, Slot comercial, criativo, preço, orçamento, Finance, Evidence ou Settlement. Player e Canvas são conhecidos pelo TV Network como processos, versões e dependências observáveis; o conteúdo reproduzido permanece fora dessa fronteira.

O fluxo operacional atualmente descrito é:

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

Fonte: [`TV_NETWORK_ARCHITECTURE.md`](../tv-network/TV_NETWORK_ARCHITECTURE.md).

## 4. Owners e artefatos atuais

| Owner declarado | O que a documentação atribui a ele | Natureza |
| --- | --- | --- |
| `TV` | identidade lógica permanente, Venue, localização, proprietário referenciado e lifecycle operacional | Aggregate |
| `DeviceRegistry` | identidade de Display, Mini PC e periféricos, vínculos e substituições | Aggregate |
| `Installation` | plano, execução, verificação e aceite da instalação física | Aggregate |
| `EdgeInstallation` | identidade Edge, versões instaladas, estado do runtime e revisões Desired/Current aceitas | Aggregate |
| `TVCapability` | declaração, validação, ativação e retirada de capability operacional | Aggregate |
| `HealthRecord` | observação ou avaliação de saúde imutável e explicável | Aggregate/fato de saúde |
| `MaintenanceWindow` | autorização temporal e de escopo para manutenção | Aggregate/política operacional |
| `UpdateRollout` | plano, ondas, gates, resultados e compensações de atualização | Aggregate |
| `Fleet` | agrupamento versionado e snapshot de membros de uma ação | Aggregate |
| `NetworkInventory` | visão reconstruível do inventário | Projeção |
| `ObservedState` | visão independente do estado observado | Projeção |
| `OperationalHealth` | projeção de sinais de saúde | Projeção |
| `FleetHealth` | projeção agregada de saúde da frota | Projeção |

Essas atribuições são a fotografia dos documentos atuais; a auditoria existente registra sobreposição adicional entre TV Network, Edge Runtime e Telemetry que ainda precisa ser resolvida.

## 5. Edge Runtime atual

`Edge Runtime` é descrito como o envelope operacional executado no Mini PC. Seu owner de domínio é `EdgeInstallation`. Ele supervisiona processos autorizados, mantém inventário de versões, aplica Commands operacionais, reporta Current State e Heartbeat, conserva backlog offline e executa restart, diagnóstico, update e rollback conforme política.

O runtime não contém lógica de Campaign, anúncio, Pricing, Finance, Evidence ou Settlement. Player e Canvas são dependências operacionais; o runtime não interpreta a fila comercial nem conclui que um anúncio foi exibido.

Componentes conceituais atualmente documentados:

- Runtime Controller;
- Supervisor;
- Watchdog;
- Restart Policy;
- State Reporter;
- Sync Manager;
- Version Inventory;
- Security Guard.

Os estados de `EdgeInstallation` atualmente descritos são:

```text
UNINSTALLED → INSTALLING → HEALTHY
HEALTHY ↔ DEGRADED
HEALTHY/DEGRADED → UPDATING → HEALTHY/DEGRADED/FAILED
UPDATING/FAILED → ROLLING_BACK → HEALTHY/DEGRADED/FAILED
qualquer não final → QUARANTINED
FAILED/QUARANTINED → INSTALLING, somente por recuperação autorizada
qualquer não final → DECOMMISSIONED
```

`DECOMMISSIONED` é terminal. Parâmetros quantitativos de restart, backoff, timeout, período de estabilidade, retenção e pressão de armazenamento permanecem marcados como `OPEN` no documento do runtime.

Fonte: [`EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md).

## 6. TV Lifecycle atual

`TV` possui um `TVIdentifier` permanente e não reutilizável. O identificador lógico é distinto do serial do Display, do Mini PC e da `EdgeInstallation`.

Estados documentados:

```text
REGISTERED → INSTALLING → INSTALLED → PROVISIONING → ACTIVE
                                                ↘ SUSPENDED
ACTIVE ↔ SUSPENDED
ACTIVE/SUSPENDED → MAINTENANCE → ACTIVE/SUSPENDED
qualquer estado não final → DECOMMISSIONED
```

`ACTIVE` depende de instalação aceita, Edge identificado, identidade confiável, capability mínima, Current State recente e Health aprovado. `DECOMMISSIONED` é terminal; credenciais são revogadas e fatos históricos são preservados.

Substituição de Display, Mini PC ou instalação Edge mantém o `TVIdentifier`, encerra o vínculo anterior e cria vínculo novo. Substituição da TV lógica cria nova identidade.

Fonte: [`TV_LIFECYCLE.md`](../tv-network/TV_LIFECYCLE.md).

## 7. Installation e Provisioning atuais

Installation descreve o plano, a execução, a verificação e o aceite físico. Provisioning é um workflow que coordena `TV`, `DeviceRegistry`, `Installation`, `EdgeInstallation`, `TVCapability`, Health Monitoring e Reconciler.

O fluxo registrado é, em alto nível:

```text
TV INSTALLED
  + Installation ACCEPTED
  + Venue/localização/owner referenciados
  + Display e Mini PC registrados
  + dispositivos essenciais não quarentenados
  + ator, policy e revisão definidos
        ↓
criação da EdgeInstallation
        ↓
registro de identidade e credencial
        ↓
aplicação de Desired State
        ↓
Current State / Capabilities / Health
        ↓
convergência ou falha auditada
```

Uma substituição física encerra a instalação Edge anterior e cria nova identidade/credencial, preservando a linha do tempo. O documento de Provisioning não transforma esse workflow em um novo Bounded Context.

Fontes: [`INSTALLATION.md`](../tv-network/INSTALLATION.md), [`PROVISIONING.md`](../tv-network/PROVISIONING.md) e [`DEVICE_REGISTRY.md`](../tv-network/DEVICE_REGISTRY.md).

## 8. Desired, Current e Observed State

- `DesiredState` é intenção versionada publicada pelo Cloud.
- `CurrentState` é declaração autenticada do Edge sobre o que ele aplicou e executa.
- `ObservedState` é projeção independente do TV Network.
- O Reconciler compara os três e emite Commands; não altera Aggregate diretamente.

O Edge só aplica uma revisão destinada à sua identidade, posterior à última aplicada, íntegra, autorizada, não expirada e compatível com a política e a janela de manutenção. Divergências são preservadas e tratadas por reconciliação.

Fonte: [`TV_NETWORK_ARCHITECTURE.md`](../tv-network/TV_NETWORK_ARCHITECTURE.md) e [`EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md).

## 9. Heartbeat, Health e Telemetry na documentação atual

Heartbeat é uma declaração operacional periódica de uma `EdgeInstallation`. Ele prova que uma identidade reconhecida reportou estado em um instante; não prova playback, audiência ou saúde integral.

O envelope conceitual inclui identidade, sessão de boot, sequência, instantes emitido/recebido, Current State, Desired aplicado, conectividade, processos, inventário de versões, sinais de saúde, sincronização e prova de identidade.

TV Network autentica e registra o fato; Health Monitoring consome fatos aceitos, gaps e anomalias; Reconciler compara estados; Fleet usa projeções. Duplicidade idempotente, conflito de conteúdo, gaps, clock drift, replay e ausência são explicitamente tratados.

Edge coleta sinais locais autorizados e fecha buckets de telemetria. Telemetry Context valida, aceita e mantém o Telemetry Ledger e produz `AudienceProjection`. Telemetry e Audience não materializam Evidence; Playback e Evidence Ledger permanecem responsáveis por fatos e registros de execução segundo seus próprios contratos.

Fontes: [`HEARTBEAT_PROTOCOL.md`](../tv-network/HEARTBEAT_PROTOCOL.md), [`HEALTH_MONITORING.md`](../tv-network/HEALTH_MONITORING.md), [`EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md) e [`TELEMETRY.md`](../domain/TELEMETRY.md).

## 10. Operação offline atual

O ADR-002 aceito prevê fila local de Slots por janela limitada, cache local de Assets, armazenamento local de Playback Events e ressincronização posterior. O Edge não interrompe imediatamente a reprodução válida por perda do Cloud.

Os documentos derivados acrescentam que Playback Events e Telemetry são filas separadas, que fatos preservam identidade e instante original, que duplicatas são ignoradas deterministicamente e que gaps ou descarte inevitável permanecem explícitos.

Ainda não existe uma política única aceita para retenção, capacidade de backlog, prioridade de classes, pressão de armazenamento, credenciais expiradas, comandos obsoletos ou offline prolongado. A auditoria registra esses pontos como lacunas.

## 11. Update, Rollback e Recovery atuais

`UpdateRollout` trabalha com ondas e membership snapshot imutável. ACK, aplicação e observação são resultados distintos. Retry mantém a identidade da intenção; resultado tardio gera reconciliação, não reabertura silenciosa.

Rollback é uma nova operação, não apagamento do update. O baseline precisa ser elegível, compatível, aprovado e não revogado. Não existe ativação automática da TV apenas porque uma versão foi restaurada.

Os documentos registram a necessidade de políticas quantitativas de timeout, tentativas, backoff, observação e promoção. Esses valores continuam `OPEN`.

Fontes: [`UPDATE_MANAGEMENT.md`](../tv-network/UPDATE_MANAGEMENT.md) e [`ROLLBACK_POLICY.md`](../tv-network/ROLLBACK_POLICY.md).

## 12. Segurança e identidade atuais

O ADR-002 aceita comunicação mTLS, assinatura de Playback Events por chave local, software assinado quando suportado, boot verificado quando o hardware permite e ausência de porta administrativa aberta no Venue.

Os documentos de runtime e provisioning distinguem `TVIdentifier`, `DeviceIdentifier` e `EdgeInstallationId`; `bootSessionId` não é reutilizável; credenciais revogadas não são reutilizadas.

A proposta do ADR-010 acrescenta catálogo de hardware, assinatura de imagem, Recovery Plan e instalação por adaptadores, mas esses elementos ainda não são aceitos normativamente.

## 13. O que está vigente e o que é apenas candidato

| Assunto | Estado factual atual |
| --- | --- |
| Hardware normativo do Edge | Mini PC homologado, conforme ADR-002 aceito |
| Edge offline com cache local | previsto no ADR-002 e detalhado em documentos derivados |
| Separação entre Edge Runtime e lógica comercial | vigente nos documentos atuais |
| TV como container de capabilities | complemento registrado no ADR-002 |
| Hardware heterogêneo / TV Box | proposta do ADR-010, ainda `Proposed` |
| Mostarda Edge OS | proposta no documento Draft de provisioning |
| Installer universal por adapters | proposta, sem decisão aceita |
| Catálogo e critérios `SUPPORTED` | proposta com decisões abertas |
| OTA, Recovery e assinatura de imagens por perfil | parcialmente documentados; detalhes críticos abertos |
| Atualização de `PLATFORM_SPECIFICATION` e `TRACEABILITY` | ainda não sincronizada |

## 14. Achados que precisam ser carregados para a análise de gaps

Sem resolvê-los neste documento, a auditoria existente registra:

- sobreposição de ownership entre TV Network, Edge Runtime e Telemetry;
- ausência de baseline normativa aceita para a plataforma inteira;
- política de offline prolongado, retenção, TTL, retry e clock ainda aberta;
- lacunas de catálogo executável de Commands, Events e State Machines;
- contratos Edge–Evidence ainda dependentes de ordering, gap, attempt e session;
- segurança, retenção, LGPD e matriz de autorização não fechadas para produção;
- conflitos e `SYNC-*` que precisam ser sincronizados antes do freeze.

Fonte: [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md).

Este inventário não escolhe owner novo, não aprova hardware heterogêneo e não altera nenhum contrato. Ele serve somente como baseline para [`EDGE_PLATFORM_GAP_ANALYSIS.md`](EDGE_PLATFORM_GAP_ANALYSIS.md).
