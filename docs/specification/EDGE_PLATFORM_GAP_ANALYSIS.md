# Edge Platform Gap Analysis

- **Status:** `AUDIT ARTIFACT — NÃO NORMATIVO`
- **Data-base:** 2026-08-09
- **Corte do repositório:** `main @ reconciliation-cycle` (commit final registrado no cross-audit)
- **Baseline:** [`CURRENT_ARCHITECTURE.md`](CURRENT_ARCHITECTURE.md)
- **Target candidate:** [`ADR-010`](../adr/ADR-010-Edge-Hardware-and-Provisioning.md) e [`EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md`](../tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md)

## 1. Objetivo e limite

Esta análise compara a arquitetura documentada hoje com a plataforma heterogênea proposta. Ela não aprova o target, não resolve `OPEN`s e não escolhe tecnologia, hardware ou política quantitativa.

Esta matriz preserva o diagnóstico do corte original e não é o gate atual de autorização. Os campos `Bloqueia implementação?` e `Bloqueia ADR-010?` descrevem o baseline anterior; a reconciliação e o gate vigente estão em [`EDGE_ARCHITECTURE_CROSS_AUDIT.md`](EDGE_ARCHITECTURE_CROSS_AUDIT.md). A matriz continua válida como histórico de dependências do target heterogêneo, enquanto a implementação dos contratos reconciliados é autorizada somente pelo resultado V2 desse cross-audit.

Um gap pode ser:

- **documental:** a informação precisa ser consolidada ou rastreada;
- **arquitetural:** ownership, boundary ou contrato ainda não são únicos;
- **comportamental:** o comportamento necessário ainda não foi decidido;
- **técnico:** a decisão existe em princípio, mas faltam especificações executáveis;
- **operacional:** a execução em produção exige parâmetros, controles ou homologação.

## 2. Matriz de gaps

Cada linha responde separadamente a situação atual, target candidato, documentação afetada, decisão necessária, dependências, risco, efeito sobre implementação e efeito sobre o ADR-010. “Pode ser resolvido depois” significa que não precisa bloquear a revisão do ADR-010; não significa que pode ser decidido silenciosamente por código.

| ID | Área | Situação atual | Situação desejada (target candidato) | Documento afetado | Decisão necessária | Dependências | Risco | Bloqueia implementação? | Bloqueia ADR-010? | Pode ser resolvido depois? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EDGE-GAP-001 | Autoridade | `PLATFORM_SPECIFICATION.md` é Draft; ADR-010 é Proposed | mudança de hardware possuir autoridade única | `PLATFORM_SPECIFICATION.md`, ADR-010, `TRACEABILITY.md` | aceitar/rejeitar ADR-010 | pacote de auditoria | implementação seguir premissa errada | sim, para target heterogêneo | sim | não |
| EDGE-GAP-002 | Fotografia atual | corte não possuía inventário factual dedicado | separar contrato, implementação e intenção | `CURRENT_ARCHITECTURE.md` | nenhuma regra; registrar fatos | `ARCHITECTURE_AUDIT.md` | confundir proposta com estado atual | sim, por ambiguidade | não | não; resolvido pelo pacote |
| EDGE-GAP-003 | Gaps e dependências | gaps estavam dispersos na auditoria e nos documentos | uma matriz de impacto rastreável | `EDGE_PLATFORM_GAP_ANALYSIS.md` | nenhuma regra; classificar gaps | `CURRENT_ARCHITECTURE.md` | executar tarefas fora de ordem | sim, por dependência | não | não; resolvido pelo pacote |
| EDGE-GAP-004 | Ordem de execução | não havia roadmap Edge dedicado | gates dependentes e verificáveis | `EDGE_TECHNICAL_ROADMAP.md` | nenhuma regra; ordenar trabalho | gaps classificados | installer ou player prematuros | sim, por dependência | não | não; resolvido pelo pacote |
| EDGE-GAP-005 | Hardware Profile | Mini PC é premissa aceita; catálogo heterogêneo é proposta | perfil determinístico por hardware homologado | ADR-010, hardware compatibility | definir catálogo e critério de perfil | discovery, segurança, recovery | hardware semelhante tratado como compatível | sim | sim | não |
| EDGE-GAP-006 | Hardware Discovery | fingerprint é exigido pelo Draft, sem contrato executável aprovado | identificação confiável e falha explícita | provisioning, device identity | definir campos, fonte e rejeição | Hardware Profile | spoofing ou instalação no perfil errado | sim | sim | não |
| EDGE-GAP-007 | Instalação Android → Edge OS | adapters são conceituais e não há método universal aceito | caminho seguro específico por família | installer, recovery | escolher mecanismo autorizado por perfil | discovery, boot, recovery | brick, instalação falsa ou perda de identidade | sim | sim | não |
| EDGE-GAP-008 | Boot e Secure Boot | verificação depende da capacidade do hardware; critérios abertos | cadeia de confiança declarada por perfil | security, OS, hardware profile | definir confiança, fallback e rejeição | Hardware Profile, assinatura | executar imagem adulterada ou não verificável | sim | sim | não |
| EDGE-GAP-009 | Imagem e base do sistema | Linux/Armbian aparecem como opções no Draft | imagem reprodutível e suportada por família | Edge OS, build | definir base e build por perfil | hardware, boot, player | divergência entre imagem e hardware | sim | sim | não |
| EDGE-GAP-010 | Player/Web engine | Web/HTML5 é prioridade; engine, RAM e codec não estão fechados | Player comprovadamente compatível com recursos do perfil | Player, capability, Edge OS | definir engine, RAM, storage e codecs | hardware, local store | travamento, consumo excessivo ou falha de playback | sim | sim | não |
| EDGE-GAP-011 | Local Content Store | cache/offline existem; retenção e pressão de storage estão abertas | armazenamento local com capacidade e política conhecidas | Player, offline storage | definir retenção, prioridade e escassez | RAM/storage, offline | tela sem conteúdo ou descarte indevido | sim | não | sim, após o contrato base |
| EDGE-GAP-012 | Provisioning e credenciais | identidade e substituição estão documentadas para Mini PC | identidade independente da família sem reutilizar credencial | provisioning, device identity | alinhar registro, revogação e replacement | ADR-010, discovery | colisão de identidade ou credencial órfã | sim | sim | não |
| EDGE-GAP-013 | Capability Manifest | `TVCapability` e inventário existem; target exige perfil por capability | manifesto versionado e observável por perfil | capability, TV Network | sincronizar capability, versão e suporte | Hardware Profile, Player | enviar workload não suportado | sim | não | sim, se não bloquear decisão de hardware |
| EDGE-GAP-014 | OTA | rollout/assinatura existem, mas artefato por perfil não está completo | update verificável e compatível com hardware | update, security | definir imagem, compatibilidade e falha | OS, profile, signing | atualização incompatível sem retorno | sim | sim | não |
| EDGE-GAP-015 | Rollback e Recovery | políticas existem; Recovery Plan e método são candidatos | recuperação verificável por perfil | rollback, recovery | definir baseline, restauração e limites | boot, storage, signing | equipamento inutilizado ou estado incompatível | sim | sim | não |
| EDGE-GAP-016 | Telemetry e Health | documentos existem e auditoria registra ownership sobreposto | fato local, ingestão, avaliação e projeção separados | telemetry, health, TV Network | owner e contratos únicos | architecture review, events | sinais duplicados ou decisões conflitantes | sim | sim | não |
| EDGE-GAP-017 | Offline prolongado | filas/replay/gaps existem; retenção, expiração e reentrada estão abertas | operação e reintegração auditáveis | runtime, heartbeat, offline | definir TTL, credenciais, backlog e quarantine | security, storage, health | executar intenção expirada ou perder fatos | sim | não | sim, para primeira decisão de hardware |
| EDGE-GAP-018 | Eventos e contratos | catálogos não cobrem integralmente adapters/perfis | producer único e schemas versionados | events, commands, traceability | fechar contratos após decisão | ADR-010 e owners | consumidores divergentes | sim | sim | não |
| EDGE-GAP-019 | Hardware não homologado | Draft menciona incompatível/não avaliado, sem fluxo completo | resultado explícito sem inferência de compatibilidade | compatibility, installer | definir registro, bloqueio e encaminhamento | discovery, catalog | instalar ou operar dispositivo não validado | sim | sim | não |
| EDGE-GAP-020 | Homologação | primeiro hardware experimental é intenção; critérios finais não aceitos | evidências reproduzíveis para promoção de perfil | hardware compatibility, tests | definir laboratório, testes e promoção | todos os gaps de perfil | homologação por opinião ou sem cobertura | sim | não | sim, até existir perfil escolhido |
| EDGE-GAP-021 | Segurança de operação | mTLS/assinatura/quarantine existem; legal, retenção e autorização têm gaps | controles de produção e segregação completos | security, platform, legal policies | fechar políticas de produção | authority baseline | exposição, fraude ou operação sem autoridade | sim para produção | não | sim para revisão do ADR, não para produção |
| EDGE-GAP-022 | Ownership transversal | auditoria registra sobreposição TV Network/Edge Runtime/Telemetry | owner, producer e consumer únicos | ownership, commands/events | aprovar matriz de responsabilidade | current architecture, contracts | command/event no contexto errado | sim | sim | não |

## 3. Dependências observáveis

As dependências abaixo são relações de ordem, não decisões de conteúdo:

```text
Baseline atual
    ↓
Auditoria e gap analysis
    ↓
Revisão do ADR-010
    ↓
Aceitação ou rejeição da mudança de hardware
    ↓
Sincronização da PLATFORM_SPECIFICATION e TRACEABILITY
    ↓
Especificações derivadas por perfil
    ↓
Homologação do primeiro HardwareProfile
    ↓
Contratos técnicos e implementação autorizada
```

Nenhuma especificação derivada deve transformar um item `aberto` da matriz acima em um valor escolhido por implementação.

## 4. O que a análise não conclui

Esta análise não conclui que:

- TV Box é `SUPPORTED`;
- Armbian é a base definitiva;
- Android será convertido por um método específico;
- Secure Boot estará disponível em todos os perfis;
- haverá um instalador único de baixo nível;
- a estratégia Web/HTML5 já possui engine homologada;
- retenção, timeout, retry, RAM ou armazenamento possuem valores aprovados;
- o Edge heterogêneo já substituiu o Mini PC normativo.

## 5. Fechamento requerido por tipo de gap

| Tipo | Evidência de fechamento necessária |
| --- | --- |
| Documental | fonte única, links válidos e rastreabilidade atualizada |
| Arquitetural | owner, boundary, producer e contrato únicos |
| Comportamental | regra explícita e teste de conformidade possível |
| Técnico | especificação independente de implementação concreta quando aplicável, com perfil e compatibilidade definidos |
| Operacional | política, autorização, observabilidade, recuperação e critérios de produção |

O fechamento de um gap não altera automaticamente os demais. Em especial, homologar um HardwareProfile não aprova todos os perfis nem altera a decisão de hardware da plataforma.
