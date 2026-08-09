# Edge Technical Roadmap

- **Status:** `ROADMAP CANDIDATE — NÃO NORMATIVO`
- **Data-base:** 2026-08-09
- **Corte do repositório:** `main @ reconciliation-cycle` (commit final registrado no cross-audit)
- **Objetivo:** ordenar o fechamento da arquitetura Edge sem antecipar decisões do ADR-010
- **Não autoriza:** implementação de hardware heterogêneo, geração de contratos públicos ou alteração de regras de domínio

## 1. Princípio de execução

O roadmap separa análise, decisão, sincronização, especificação, homologação e implementação. Uma fase posterior não pode usar uma hipótese da fase anterior como se fosse uma decisão aceita.

A ordem de autoridade permanece:

```text
ADR aceito / PLATFORM_SPECIFICATION aceita
        ↓
Specifications derivadas
        ↓
Contratos técnicos certificados
        ↓
Código e infraestrutura
```

No estado atual, `ADR-002` continua aceito, `ADR-010` continua Proposed e `PLATFORM_SPECIFICATION` continua Draft.

Após a execução da reconciliação, [`EDGE_ARCHITECTURE_CROSS_AUDIT.md`](EDGE_ARCHITECTURE_CROSS_AUDIT.md) é o gate de consistência transversal. Ele não aceita ADR-010 nem substitui a autoridade dos contratos; apenas autoriza implementação quando ownership, estados, handoffs, eventos e parâmetros de perfil estão reconciliados.

## 1.1 Dependências que precisam ser respeitadas

O roadmap não permite implementar um artefato antes das decisões das quais ele depende. A ordem mínima do target candidato é:

```text
Estado atual
    ↓
CURRENT_ARCHITECTURE
    ↓
EDGE_PLATFORM_GAP_ANALYSIS
    ↓
EDGE_TECHNICAL_ROADMAP
    ↓
Revisão do ADR-010
    ↓
Hardware Discovery
    ↓
Hardware Profile
    ↓
Installation Profile
    ↓
Recovery Plan
```

O Player possui uma cadeia independente de pré-requisitos:

```text
RAM
  + Storage
  + Offline Content Store
  + Web Engine
  + Codec Capability
        ↓
Player Profile
        ↓
Homologação do Player no Hardware Profile
```

O ADR-010 é revisado somente depois que o pacote de auditoria e suas dependências estiverem explícitos. Nenhum dos dois grafos escolhe valores; eles apenas impedem que uma decisão posterior seja usada como premissa anterior.

## 2. Fases e gates

### Fase 0 — Baseline forense

**Entradas:** `ARCHITECTURE_AUDIT.md` e documentos TV Network existentes.

**Entregáveis:**

- `CURRENT_ARCHITECTURE.md`;
- `EDGE_PLATFORM_GAP_ANALYSIS.md`;
- `EDGE_TECHNICAL_ROADMAP.md`.

**Saída necessária:** fotografia factual com links para as fontes, separação entre aceito/proposto e inventário dos gaps.

**Permitido:** auditoria, comparação, rastreabilidade e documentação de lacunas.

**Não permitido:** escolher hardware, método de instalação, base Linux, engine Web ou política quantitativa.

### Fase 1 — Gate de dependências e gaps

Esta fase é a revisão interna do pacote produzido na Fase 0. Ela confirma que cada gap possui fonte, risco, dependência e indicação de bloqueio antes que o ADR-010 seja apreciado.

**Saída necessária:** `EDGE_PLATFORM_GAP_ANALYSIS.md` e este roadmap não contêm escolhas silenciosas e a ordem `Discovery → Hardware Profile → Installation Profile → Recovery Plan` está preservada.

**Não permitido:** revisar o ADR-010 por inferência, homologar hardware ou escrever especificação derivada.

### Fase 2 — Revisão do ADR-010

**Entrada:** pacote de auditoria e [`ADR-010`](../adr/ADR-010-Edge-Hardware-and-Provisioning.md).

**Perguntas de gate:**

- a proposta contradiz algum contrato aceito além da premissa que declara substituir?
- o ownership continua único entre TV Network, Edge Runtime e Telemetry?
- o target é uma decisão de domínio/arquitetura ou ainda uma coleção de hipóteses técnicas?
- todos os impactos listados na análise de gaps possuem fonte e escopo?

**Saída possível:** aprovação, rejeição ou devolução para revisão. Nenhuma dessas saídas pode ser presumida pelo roadmap.

### Fase 3 — Sincronização normativa

Esta fase só inicia se o ADR-010 for formalmente aceito.

**Arquivos potencialmente afetados:**

- [`PLATFORM_SPECIFICATION.md`](PLATFORM_SPECIFICATION.md);
- [`TRACEABILITY.md`](TRACEABILITY.md);
- [`TV_NETWORK_ARCHITECTURE.md`](../tv-network/TV_NETWORK_ARCHITECTURE.md);
- [`EDGE_RUNTIME.md`](../tv-network/EDGE_RUNTIME.md);
- [`EDGE_RUNTIME_SPECIFICATION.md`](EDGE_RUNTIME_SPECIFICATION.md);
- `PROVISIONING.md`, `DEVICE_REGISTRY.md`, `CAPABILITY_MANAGEMENT.md` e catálogos de Events/Commands afetados.

**Saída necessária:** uma fonte normativa única, referências cruzadas atualizadas e nenhum documento derivado tratando a proposta como aceitação parcial.

**Não fazer nesta fase:** inventar payloads técnicos, escolher engine, publicar imagem de OS ou implementar adapter.

### Fase 4 — Especificações derivadas

Somente após a sincronização normativa, produzir as especificações especializadas necessárias:

1. Edge OS;
2. Edge Runtime;
3. Installer;
4. Hardware Compatibility;
5. Provisioning e Device Identity;
6. Player e Local Content Store;
7. OTA;
8. Recovery;
9. Telemetry e integração com Health;
10. Security.

Cada documento deve declarar fonte superior, owner, boundary, estados, contratos, falhas, compatibilidade e decisões ainda abertas. Nenhum documento derivado pode criar Bounded Context ou alterar o significado de Evidence, Pricing, Campaign ou Financial.

### Fase 5 — Primeiro HardwareProfile

Esta fase trata um único perfil por vez. O perfil não é promovido por semelhança comercial ou por inferência de SoC.

**Evidências necessárias antes de promoção:**

- identificação determinística;
- método de instalação seguro;
- caminho de recovery;
- integridade e assinatura verificáveis;
- recursos de CPU, RAM e armazenamento medidos;
- renderização e player validados;
- provisioning e revogação testados;
- operação offline e ressincronização testadas;
- telemetria/health e ausência de capability explicitamente observadas;
- atualização e rollback exercitados;
- contratos e compatibilidade registrados.

O conjunto acima é um checklist de homologação; os valores mínimos e o estado final (`SUPPORTED`, `EXPERIMENTAL` ou outro) só podem ser definidos pela decisão e política correspondentes.

### Fase 6 — Vertical Slice controlado

Depois da homologação do primeiro perfil, validar ponta a ponta somente o caminho autorizado:

```text
Discovery → Identify → Match → Verify → Install → Provision
→ Validate → Operate offline/online → Update → Recover
```

O slice deve provar identidade, armazenamento local, replay de fatos operacionais, atualização assinada, falha controlada, rollback/recovery e integração com TV Network. Ele não deve introduzir lógica comercial no Edge.

### Fase 7 — Implementação incremental

Somente após as fases anteriores e a certificação dos contratos:

- implementar adapters por HardwareProfile;
- implementar a imagem e os serviços do Edge OS;
- implementar provisioning e identidade;
- implementar Player/Local Content Store;
- implementar OTA, rollback e recovery;
- conectar Telemetry/Health conforme ownership aprovado;
- expandir a homologação perfil por perfil.

Nenhuma implementação de um perfil pode ser usada como autorização implícita para outro.

## 3. Dependências e bloqueios atuais

| Atividade | Pode iniciar agora? | Dependência que bloqueia avanço |
| --- | --- | --- |
| auditoria e fotografia atual | sim | nenhuma além das fontes existentes |
| gap analysis e roadmap | sim | fotografia atual |
| gate de dependências e gaps | sim | `CURRENT_ARCHITECTURE.md` e `EDGE_PLATFORM_GAP_ANALYSIS.md` |
| revisão do ADR-010 | sim | gate de dependências e gaps |
| atualizar Specification/Traceability | não | ADR-010 aceito |
| escrever especificações derivadas | não como norma | ADR-010 aceito e fontes sincronizadas |
| homologar TV Box/Armbian | não | perfil, método de instalação, segurança e critérios aprovados |
| gerar contratos públicos do Edge heterogêneo | não | decisões normativas e schemas certificados |
| implementar installer/OS/adapters | não | especificações derivadas e primeiro perfil homologado |

## 4. Regras de não antecipação

Durante este roadmap:

- `ADR-002` não é editado para acomodar a proposta;
- `ADR-010` não é marcado como aceito por commit de documentação;
- `PLATFORM_SPECIFICATION.md` não é alterada para refletir uma decisão ainda Proposed;
- `TRACEABILITY.md` não recebe referências de uma decisão não aceita;
- um teste de protótipo não é tratado como homologação;
- um hardware que inicializa não é automaticamente um hardware compatível;
- uma ausência de sensor ou capability não é convertida em dado positivo;
- um fallback técnico não cria autorização comercial ou financeira;
- nenhuma falha operacional é transformada em Evidence, Pricing ou responsabilidade financeira pelo Edge.

## 5. Critérios de saída do pacote de auditoria

O pacote pode ser encaminhado para revisão do ADR-010 quando:

1. o estado atual estiver descrito apenas por fontes versionadas;
2. cada gap possuir evidência e categoria de fechamento;
3. as dependências de ordem estiverem explícitas;
4. nenhum dos três documentos promover a proposta a norma;
5. links e referências forem verificáveis;
6. testes documentais e validações de Markdown passarem.

O atendimento desses critérios não equivale à aprovação do ADR-010. Ele apenas torna a decisão posterior revisável e rastreável.
