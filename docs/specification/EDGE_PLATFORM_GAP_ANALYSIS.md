# Edge Platform Gap Analysis

- **Status:** `AUDIT ARTIFACT — NÃO NORMATIVO`
- **Data-base:** 2026-08-08
- **Baseline:** [`CURRENT_ARCHITECTURE.md`](CURRENT_ARCHITECTURE.md)
- **Target candidate:** [`ADR-010`](../adr/ADR-010-Edge-Hardware-and-Provisioning.md) e [`EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md`](../tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md)

## 1. Objetivo e limite

Esta análise compara a arquitetura documentada hoje com a plataforma heterogênea proposta. Ela não aprova o target, não resolve `OPEN`s e não escolhe tecnologia, hardware ou política quantitativa.

Um gap pode ser:

- **documental:** a informação precisa ser consolidada ou rastreada;
- **arquitetural:** ownership, boundary ou contrato ainda não são únicos;
- **comportamental:** o comportamento necessário ainda não foi decidido;
- **técnico:** a decisão existe em princípio, mas faltam especificações executáveis;
- **operacional:** a execução em produção exige parâmetros, controles ou homologação.

## 2. Matriz de gaps

| ID | Área | Evidência do estado atual | Necessidade indicada pela proposta | Natureza do fechamento | Estado |
| --- | --- | --- | --- | --- | --- |
| EDGE-GAP-001 | Autoridade | `PLATFORM_SPECIFICATION.md` está Draft e ADR-010 está Proposed | declarar se a plataforma heterogênea passa a ser norma | decisão arquitetural e sincronização | aberto |
| EDGE-GAP-002 | Fotografia atual | não havia `CURRENT_ARCHITECTURE.md` | separar existente, planejado e ausente | documentação de auditoria | em fechamento por este pacote |
| EDGE-GAP-003 | Gaps e dependências | não havia análise dedicada | mapear impacto sem alterar contratos | documentação de auditoria | em fechamento por este pacote |
| EDGE-GAP-004 | Ordem de execução | não havia roadmap Edge específico | ordenar gates e dependências | planejamento governado | em fechamento por este pacote |
| EDGE-GAP-005 | Hardware Profile | ADR-002 aceita Mini PC; proposta prevê catálogo heterogêneo | identificar hardware determinístico e perfil compatível | decisão de catálogo e homologação | aberto |
| EDGE-GAP-006 | Hardware Discovery | a proposta exige fingerprint e identificação além do nome comercial | definir campos confiáveis, coleta e falha de identificação | contrato técnico e política de segurança | aberto |
| EDGE-GAP-007 | Instalação Android → Edge OS | os adaptadores são conceituais; não há método universal aceito | definir caminho seguro por família de hardware | decisão por perfil e recovery | aberto |
| EDGE-GAP-008 | Boot e Secure Boot | ADR-010 condiciona verificação à capacidade da plataforma; critérios não estão fechados | definir cadeia de confiança por perfil | decisão de segurança | aberto |
| EDGE-GAP-009 | Imagem e base do sistema | Armbian/Linux aparecem como opções técnicas no Draft | escolher base e ferramenta de build por família | especificação técnica por perfil | aberto |
| EDGE-GAP-010 | Player/Web engine | estratégia Web/HTML5 é prioritária, mas engine definitiva e limites de RAM permanecem abertos | definir perfil de player, compatibilidade e limites observáveis | contrato técnico e homologação | aberto |
| EDGE-GAP-011 | Local Content Store | cache/offline são previstos; retenção e pressão de armazenamento estão abertas | definir capacidade, retenção, prioridade e comportamento de escassez | política técnica/operacional | aberto |
| EDGE-GAP-012 | Provisioning e credenciais | identidade de EdgeInstallation e substituição estão documentadas para Mini PC | tornar registro independente de hardware e preservar revogação | contrato de identidade e processo | dependente do ADR-010 |
| EDGE-GAP-013 | Capability Manifest | TVCapability e inventário existem; o target inclui capacidades por perfil | alinhar manifesto, versão, capability efetiva e suporte | sincronização de contratos | parcialmente documentado |
| EDGE-GAP-014 | OTA | UpdateRollout e assinatura existem, mas catálogo/assinatura por imagem e perfil não estão completos | definir artefatos, compatibilidade e falha de atualização | especificação de update e segurança | aberto |
| EDGE-GAP-015 | Rollback e Recovery | políticas existem, mas Recovery Profile e método por hardware são candidatos | definir baseline, restauração e limites por perfil | especificação técnica e operacional | aberto |
| EDGE-GAP-016 | Telemetry e Health | Heartbeat, Health e Telemetry estão documentados em partes e há sobreposição de ownership na auditoria | separar fato local, ingestão, avaliação e projeção | decisão arquitetural e contratos | aberto |
| EDGE-GAP-017 | Offline prolongado | filas, replay e gaps existem; retenção, expiração, credenciais e quarentena prolongada estão abertas | definir como operar e reintegrar depois de desconexão longa | política operacional | aberto |
| EDGE-GAP-018 | Eventos e contratos | catálogos existentes não cobrem integralmente os novos perfis e adapters | publicar contratos versionados e producers únicos | sincronização normativa | dependente de decisão |
| EDGE-GAP-019 | Hardware não homologado | Draft indica incompatível ou não avaliado; fluxo operacional completo não está fechado | determinar somente após decisão como registrar, bloquear ou encaminhar | decisão de compatibilidade | aberto |
| EDGE-GAP-020 | Homologação | proposta lista primeiro hardware experimental, mas critérios e evidências finais não estão aceitos | definir laboratório, testes mínimos e promoção de perfil | processo de homologação | aberto |
| EDGE-GAP-021 | Segurança de operação | mTLS, assinatura e quarentena existem; retenção, LGPD, autorização e incidentes permanecem na auditoria | completar controles de produção e segregação | produção/compliance | aberto |
| EDGE-GAP-022 | Ownership transversal | auditoria registra sobreposição TV Network/Edge Runtime/Telemetry | produzir matriz única de owner, producer e consumer | decisão arquitetural | aberto |

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
