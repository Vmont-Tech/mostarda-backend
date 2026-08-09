# ADR-010 — Edge Hardware e Provisioning Universal

- **Status:** Proposed
- **Revisão:** candidata v2
- **Data:** 2026-08-08
- **Corte de análise:** `main @ ddad9bf`
- **Supersedes:** `ADR-002 — Arquitetura do Edge`, exclusivamente quanto à premissa de hardware padronizado em Mini PC, propondo a possibilidade futura de hardware físico não padronizado caso esta decisão seja aceita
- **Related:** `docs/tv-network/EDGE_RUNTIME.md`
- **Related:** `docs/tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md`
- **Analysis:** `docs/specification/EDGE_PLATFORM_GAP_ANALYSIS.md`
- **Roadmap:** `docs/specification/EDGE_TECHNICAL_ROADMAP.md`

---

## 1. Contexto

O [`ADR-002`](ADR-002-Edge-Architecture.md) aceito descreve o Edge sobre Mini PC homologado. Essa decisão continua sendo a arquitetura normativa vigente enquanto este ADR permanecer `Proposed`.

A expansão nacional pode, no futuro, exigir o uso controlado de mais de uma família de hardware. A existência de hardware heterogêneo, entretanto, não autoriza tratar nomes comerciais, SoCs ou imagens específicas como contratos de negócio nem autoriza uma instalação genérica sem verificação.

O problema arquitetural é separar:

```text
experiência de provisioning percebida pelo usuário
                         de
mecanismo de instalação e recuperação específico do hardware
```

Essa separação deve preservar identidade, segurança, operação offline, limites do Edge e ownership dos Bounded Contexts existentes.

## 2. Problema

Manter um único hardware físico pode aumentar custo de aquisição, logística e substituição. Aceitar qualquer hardware sem uma camada explícita de compatibilidade pode produzir instalação inconsistente, incompatibilidade de boot, vídeo, memória, armazenamento, atualização ou recuperação.

O ADR-010 precisa definir a direção arquitetural sem transformar decisões técnicas ainda não verificadas em fatos normativos.

## 3. Decisão arquitetural candidata

Se e quando aceito, este ADR estabelecerá que a plataforma Edge poderá suportar hardware físico heterogêneo por meio de uma camada explícita de compatibilidade composta por:

`Hardware Profiles + Installation Profiles + Installation Adapters`.

```text
Hardware Profile
        ↓
Installation Profile
        ↓
Installation Adapter
        ↓
Recovery Profile
        ↓
Mostarda Edge OS
        ↓
Edge Runtime
        ↓
Player
```

Esses elementos são contratos de infraestrutura separados. Hardware específico é uma implementação homologada de um perfil; não é um contrato de negócio da plataforma.

O princípio de produto é uma experiência de provisioning abstraída do hardware. Isso não significa que exista um método universal de baixo nível, uma imagem universal ou um APK capaz de regravar qualquer dispositivo.

O produto Mostarda Edge é composto conceitualmente por:

```text
Edge OS
Edge Runtime
Player
Local Content Store
Provisioning Agent
Hardware Discovery
Telemetry
OTA
Recovery
Security
```

Essa lista define fronteiras de capacidade do produto; não define processos, linguagens, imagens, engines, formatos ou serviços concretos.

## 4. O que este ADR decide

As decisões arquiteturais candidatas deste ADR são limitadas às seguintes:

1. hardware heterogêneo pode ser suportado como direção arquitetural, sem dependência permanente de um fabricante;
2. cada hardware suportado deve ser representado por um `HardwareProfile` versionado e homologado;
3. a forma de transformar um hardware em Edge deve ser representada por um `InstallationProfile`;
4. mecanismos específicos de instalação devem ficar isolados em `InstallationAdapters`;
5. recuperação deve ser representada por um `RecoveryProfile` associado ao hardware/profile;
6. o usuário deve consumir uma experiência coerente de provisioning sem precisar escolher SoC, kernel, DTB ou mecanismo de baixo nível;
7. `Mostarda Edge OS` é o envelope de produto do sistema Edge, separado da base técnica que eventualmente o materialize;
8. Edge OS, Edge Runtime e Player permanecem camadas distintas;
9. o provisioning deve possuir uma experiência única sobre três classes arquiteturais possíveis: `Full Provisioning`, `Assisted Provisioning` e `External Bootstrap`;
10. o Player deve operar em modelo local-first, usando um `Local Content Store` explícito para conteúdo previamente validado;
11. o Edge deve possuir direção de recuperabilidade automatizada quando o `HardwareProfile` suportar essa capacidade;
12. Android pode atuar como ambiente de bootstrap de determinados adapters, mas não é o sistema operacional de produção do Mostarda Edge;
13. operação offline, identidade, telemetria, heartbeat, segurança, update e rollback continuam submetidos aos contratos aceitos e derivados do ADR-002;
14. artefatos de OTA devem ser vinculados ao hardware/profile e validados antes da aplicação por um manifesto de atualização abstrato;
15. a identidade de instalação deve usar `EdgeInstallationId` e chave de dispositivo, sem usar endereço MAC como identidade primária;
16. nenhum desses elementos pode introduzir lógica de Campaign, Pricing, Financial, Evidence ou Settlement no Edge.

## 5. O que este ADR não decide

Os itens abaixo permanecem fora do escopo decisório do ADR-010 e continuam `OPEN` até possuírem especificação, evidência e aprovação próprias:

- Armbian como base definitiva;
- qualquer distribuição Linux específica;
- SoC, board, modelo comercial ou catálogo inicial de hardware;
- método Android → Edge OS;
- APK universal de instalação ou regravação;
- bootloader e mecanismo de desbloqueio;
- Secure Boot por família de hardware;
- mecanismo de assinatura de imagens e cadeia de confiança concreta;
- engine Web, engine de reprodução ou runtime HTML5 específico;
- RAM mínima, armazenamento mínimo e limites de codec;
- desenho definitivo do `Local Content Store`;
- mecanismo específico de OTA;
- mecanismo específico de rollback e recovery;
- protocolo definitivo de `Hardware Discovery`;
- critérios de `SUPPORTED`, `EXPERIMENTAL`, incompatível ou não avaliado;
- primeiro `HardwareProfile`, incluindo MXQ Pro 4K ou qualquer outro dispositivo;
- qualquer parâmetro de timeout, retry, retenção, backoff, janela ou pressão de armazenamento.

Uma implementação não pode preencher esses itens por inferência a partir deste ADR.

## 6. Camadas e fronteiras

### 6.1 Mostarda Edge OS

`Mostarda Edge OS` nomeia a camada de produto que entrega um sistema Edge dedicado. O nome não seleciona uma distribuição, kernel, BSP, bootloader, filesystem ou ferramenta de build.

A base técnica, a imagem e a cadeia de inicialização são decisões posteriores por `HardwareProfile` e `InstallationProfile`.

### 6.2 Edge Runtime

Edge Runtime é o envelope operacional identificado. Ele supervisiona processos, aplica Desired State autorizado, mantém identidade e inventário, executa sincronização, watchdog, fila offline, telemetria operacional, update e rollback conforme políticas aprovadas.

Edge Runtime não decide preço, elegibilidade, split, cobrança, Evidence ou direitos financeiros. Player e Canvas são dependências operacionais observadas, não regras comerciais do runtime.

### 6.3 Player

Player é a camada de reprodução, timeline, decode e renderização. Sua engine, perfil de memória, codecs, armazenamento e integração local ainda não são escolhidos por este ADR.

A reprodução offline de conteúdo previamente sincronizado permanece a direção já registrada no ADR-002; os detalhes técnicos continuam sujeitos ao contrato de Player e ao `HardwareProfile` homologado.

O caminho conceitual de execução é:

```text
Edge Runtime
      ↓
Local Content Store
      ↓
interface local de conteúdo
      ↓
Web/Player Runtime
      ↓
decode e renderização do hardware
```

O navegador não é tratado como repositório autoritativo de mídia e a reprodução não depende de conexão contínua com a Internet. A engine, o mecanismo local e os codecs permanecem decisões das especificações derivadas.

### 6.4 Installation Adapter

Um `InstallationAdapter` encapsula um mecanismo específico de instalação ou recuperação para um perfil. A existência do conceito não autoriza nenhum adapter concreto, nem permite que um adapter alegue sucesso sem provas de identidade, integridade e recuperação.

### 6.5 Recovery Profile

`RecoveryProfile` descreve, para um hardware/profile, como uma instalação ou atualização pode ser recuperada. O perfil ainda não define mídia, partições, bootloader, comandos, número de tentativas ou estratégia de fallback.

A direção arquitetural é que um update possa convergir por:

```text
ACTIVE → UPDATE → VALIDATE → ACTIVATE
ACTIVE → FAILURE → ROLLBACK → LAST_KNOWN_GOOD
```

A/B slots, partição de recovery, imagem conhecida ou qualquer mecanismo equivalente são opções técnicas posteriores. Um hardware sem caminho de recuperação comprovável não pode ser promovido como suportado apenas por iniciar o Player.

## 7. Hardware Discovery e compatibilidade

O target candidato exige que a compatibilidade seja baseada em atributos observáveis e confiáveis, e não apenas no nome comercial. A forma definitiva de coletar, normalizar, assinar, validar e rejeitar um `HardwareFingerprint` permanece aberta.

Nome comercial não constitui identidade de hardware. A identidade operacional deve resultar de características verificáveis do dispositivo e ser associada a `HardwareProfile`, `InstallationProfile`, `EdgeInstallationId` e chave de dispositivo. Os campos exatos, sua fonte e a forma de prova pertencem à especificação de Hardware Discovery.

O catálogo de compatibilidade deve ser versionado quando for especificado, mas este ADR não escolhe seu formato, autoridade de publicação, protocolo de distribuição, critério de promoção ou política para hardware desconhecido.

Nenhum dispositivo é considerado compatível somente porque possui SoC semelhante a outro perfil. A classificação deverá decorrer de um perfil homologado e de evidências conforme o roadmap.

## 8. Provisioning e identidade

O modelo preservado é:

```text
TVIdentifier ≠ DeviceIdentifier ≠ EdgeInstallationId
```

Uma substituição física não reutiliza credencial revogada nem apaga a linha do tempo. O mecanismo concreto de descoberta, associação, emissão, rotação e revogação de credenciais por perfil será especificado posteriormente.

Provisioning coordena TV, Device Registry, Installation, EdgeInstallation, TVCapability e Health Monitoring. Ele não cria um novo Bounded Context de negócio.

As classes de provisioning são uma classificação de experiência, não três implementações obrigatórias:

| Classe | Significado arquitetural |
| --- | --- |
| `Full Provisioning` | instalação concluída pelo ambiente existente, sem mídia externa, quando o perfil comprovar essa capacidade |
| `Assisted Provisioning` | ambiente existente prepara o dispositivo e o usuário executa uma ação controlada de reinício/recuperação |
| `External Bootstrap` | o perfil exige SD, USB, recovery media ou outro bootstrap físico |

O instalador não deve prometer instalação interna para qualquer dispositivo apenas porque o ambiente atual permite baixar um APK. A classe aplicável é determinada por `HardwareProfile` e `InstallationProfile`.

## 9. Relação com os 22 gaps

| Gap | Tratamento neste ADR-010 v2 | Estado após esta revisão |
| --- | --- | --- |
| `EDGE-GAP-001` | mantém este ADR `Proposed`; não altera a Specification | aberto |
| `EDGE-GAP-002..004` | reconhece o pacote de fotografia, gaps e roadmap como fonte de análise | documentado |
| `EDGE-GAP-005` | aceita o conceito de `HardwareProfile`, não um catálogo ou hardware específico | técnico aberto |
| `EDGE-GAP-006` | aceita a necessidade de discovery/fingerprint, não seu protocolo | técnico aberto |
| `EDGE-GAP-007` | aceita adapters por perfil, não o método Android → Edge OS | técnico aberto |
| `EDGE-GAP-008..009` | mantém boot, Secure Boot, imagem e base fora do ADR | técnico aberto |
| `EDGE-GAP-010..011` | preserva separação Player/offline, sem congelar engine, RAM, codec ou storage | técnico aberto |
| `EDGE-GAP-012..013` | preserva identidade e capability como fronteiras existentes; exige sincronização futura | parcialmente documentado |
| `EDGE-GAP-014..015` | mantém OTA, rollback e recovery como capacidades de plataforma, sem escolher mecanismos | técnico aberto |
| `EDGE-GAP-016` | não resolve a sobreposição TV Network/Edge Runtime/Telemetry; encaminha para gate arquitetural | arquitetural aberto |
| `EDGE-GAP-017` | preserva operação offline do ADR-002; mantém retenção, TTL e reentrada abertas | operacional aberto |
| `EDGE-GAP-018` | exige contratos posteriores e producers únicos, sem publicar schemas agora | dependente de decisão |
| `EDGE-GAP-019..020` | mantém classificação e homologação por perfil fora do escopo | técnico/operacional aberto |
| `EDGE-GAP-021` | não pretende fechar legal, retenção, autorização ou compliance | produção aberto |
| `EDGE-GAP-022` | preserva a necessidade de matriz única de ownership antes da aceitação | arquitetural aberto |

Esta tabela rastreia o tratamento dos gaps; não os encerra.

## 10. Relação com ADR-002

Até que este ADR seja aceito, o ADR-002 permanece integralmente vigente, incluindo a premissa de Mini PC homologado.

Mesmo se este ADR for aceito no futuro, o ADR-002 continuará vigente para tudo que não for explicitamente substituído. A substituição proposta limita-se à possibilidade arquitetural de hardware físico heterogêneo, preservando:

- Edge leve e separado de regras de negócio;
- identidade e assinatura de fatos operacionais;
- telemetria separada de Evidence;
- heartbeat;
- atualização segura;
- segurança;
- operação offline;
- watchdog e rollback;
- cache local de conteúdo autorizado.

O diagrama de autoridade é:

```text
ADR-002 (Accepted)
    │
    ├── continua vigente agora
    │
    ▼
Mini PC = arquitetura normativa atual

ADR-010 (Proposed)
    │
    ├── hardware heterogêneo = arquitetura candidata
    ├── Hardware Profile
    ├── Installation Profile
    ├── Installation Adapter
    └── Recovery Profile
            │
            ▼
    decisões técnicas ainda abertas
```

## 11. Alternativas consideradas

### 11.1 Mini PC único como estratégia permanente

Mantém a simplicidade de homologação, mas não atende à direção candidata de reduzir dependência de aquisição e fornecedor. Continua sendo a decisão normativa atual enquanto o ADR-010 não for aceito.

### 11.2 Hardware heterogêneo sem perfis

Não é compatível com a direção arquitetural porque não fornece uma fronteira verificável para instalação, compatibilidade, update e recovery.

### 11.3 Instalador universal de baixo nível

Não é assumido. A experiência pode ser uniforme, mas o mecanismo de instalação deve ser resolvido por perfil e só pode ser promovido após evidência de segurança e recuperação.

## 12. Consequências da direção candidata

### Positivas

- permite avaliar mais de uma família de hardware sem alterar contratos de negócio;
- concentra diferenças físicas em profiles e adapters;
- preserva a separação Edge OS / Runtime / Player;
- mantém operação offline e limites de domínio do ADR-002;
- permite homologação incremental por perfil.

### Negativas e riscos

- exige discovery, catálogo, segurança e testes por perfil;
- aumenta a complexidade de instalação, update e recovery;
- pode produzir divergência de capability, codec, memória ou armazenamento;
- exige resolver a sobreposição de ownership TV Network/Edge Runtime/Telemetry;
- não permite prometer compatibilidade de TV Box antes de homologação.

## 13. Gate para aceitação

Este ADR permanece `Proposed`. A aceitação futura exige, no mínimo:

1. aprovação explícita do fundador;
2. revisão da matriz dos 22 gaps;
3. confirmação de que nenhum texto do ADR congela as decisões listadas como abertas;
4. resolução ou encaminhamento formal dos owners sobrepostos;
5. atualização da `PLATFORM_SPECIFICATION.md` e `TRACEABILITY.md` somente após a aprovação;
6. sincronização dos documentos derivados;
7. atendimento dos gates do [`EDGE_TECHNICAL_ROADMAP.md`](../specification/EDGE_TECHNICAL_ROADMAP.md);
8. especificações derivadas para OS, discovery, compatibility, installer, provisioning, player, local storage, OTA, recovery, telemetry e security;
9. critérios de validação que demonstrem instalação, identidade, operação local-first, atualização e recuperação seguras;
10. homologação do primeiro `HardwareProfile` antes da autorização de implementação daquele perfil.

Nenhum código de produção, contrato público ou hardware específico deve tratar este ADR como `Accepted` antes desses gates.

## Status

Esta revisão é uma **candidata à aprovação**. Ela não aprova hardware heterogêneo, não escolhe Armbian, não aprova MXQ Pro 4K, não define APK universal, não escolhe Web Engine, não fecha RAM/storage/codec e não atualiza a Specification da Plataforma.

Nenhum código de produção deve assumir esta decisão como `ACCEPTED` antes da conclusão da governança documental e dos gates de aceitação.

A direção arquitetural registrada aqui pode orientar a elaboração das especificações derivadas, mas essa autorização de trabalho não altera o status `Proposed` nem transforma qualquer decisão técnica aberta em escolha implícita.

Até decisão posterior, o estado efetivo é:

```text
ADR-002 = Accepted
ADR-010 = Proposed
Hardware heterogêneo = intenção arquitetural candidata
Hardware específico = não homologado por este ADR
```
