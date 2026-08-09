# ADR-010 — Edge Hardware e Provisioning Universal

- **Status:** Proposed
- **Data:** 2026-08-08
- **Supersedes:** `ADR-002 — Arquitetura do Edge`, exclusivamente quanto à premissa de hardware padronizado em Mini PC
- **Related:** `docs/tv-network/EDGE_RUNTIME.md`
- **Related:** `docs/tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md`

---

## Contexto

A arquitetura anterior do Edge assumia Mini PC como hardware padronizado da rede.

Essa abordagem simplifica a homologação inicial, mas cria custo de aquisição, logística, manutenção e implantação incompatível com a estratégia de expansão nacional da Mostarda.

A Mostarda precisa ser capaz de utilizar hardware de baixo custo já existente no mercado, inclusive TV Boxes compatíveis, sem transformar o produto em uma coleção de implementações específicas por fabricante.

Também existe necessidade de reduzir a intervenção técnica no onboarding.

O usuário final deve ser capaz de transformar um dispositivo compatível em Mostarda Edge sem precisar conhecer detalhes de Linux, Armbian, bootloader, DTB ou particionamento.

---

## Problema

Uma estratégia baseada em um único hardware:

- aumenta CAPEX;
- limita escala;
- cria dependência de fornecedor;
- aumenta custo logístico;
- dificulta substituição;
- impede reaproveitamento de dispositivos existentes;
- reduz flexibilidade da frota.

Por outro lado, aceitar hardware heterogêneo sem uma camada de compatibilidade cria:

- instalação inconsistente;
- risco de brick;
- incompatibilidade de kernel;
- incompatibilidade de vídeo;
- incompatibilidade de memória;
- suporte técnico elevado;
- dificuldade de atualização.

Portanto, a Mostarda precisa separar:

**experiência universal**

de:

**método específico de hardware.**

---

## Decisão

A Mostarda adotará uma arquitetura de **Hardware Profiles + Installation Profiles + Installation Adapters**.

O produto passa a ser o:

> **Mostarda Edge OS**

e não uma distribuição genérica de Armbian.

Armbian pode ser utilizado como base técnica quando apropriado, mas fica oculto atrás do contrato do Mostarda Edge OS.

---

## Hardware Discovery

O `Mostarda Edge Installer` deverá identificar automaticamente o hardware disponível e construir um `HardwareFingerprint`.

O usuário não selecionará manualmente:

- modelo;
- SoC;
- kernel;
- DTB;
- imagem;
- método de instalação.

A identificação utilizará os atributos confiáveis disponíveis no dispositivo.

---

## Hardware Compatibility Catalog

A Mostarda manterá catálogo versionado de hardware homologado.

Cada perfil associa:

- fingerprint;
- Edge OS image;
- kernel/BSP;
- DTB;
- Installation Adapter;
- Player Profile;
- Capability Manifest;
- Recovery Profile.

Hardware desconhecido não será automaticamente considerado compatível.

---

## Installation Adapters

A experiência do usuário será única, mas o método de instalação será específico por plataforma.

Exemplos conceituais:

```text
Android OTA
Android Recovery
ADB/Reboot
Rockchip
Amlogic
Allwinner
Recovery Media
````

O Compatibility Engine selecionará o método apropriado.

O usuário não deverá conhecer o mecanismo utilizado.

---

## Mostarda Edge OS

A Mostarda não distribuirá uma imagem genérica de Armbian como produto final.

O Edge OS será construído a partir de uma base Linux adequada à plataforma, podendo utilizar Armbian quando tecnicamente apropriado.

Isso preserva liberdade futura para substituir a base sem alterar a experiência de instalação.

---

## Player

O Player será desacoplado do Edge Runtime.

A estratégia inicial priorizará um runtime Web/HTML5 para reduzir dependência de implementações nativas específicas.

A reprodução não dependerá diretamente da Internet.

Assets autorizados serão previamente sincronizados para o `Local Content Store`.

O navegador acessará conteúdo local.

---

## Operação offline

A perda de conectividade não deverá interromper conteúdo válido previamente sincronizado.

O Edge manterá:

* Local Content Store;
* Playback Queue;
* Telemetry Queue;
* Current State;
* Health;
* fatos operacionais pendentes.

A sincronização será retomada após reconexão.

Browser Cache não será considerado armazenamento primário da mídia.

---

## Responsabilidades

### Edge OS

* sistema operacional;
* boot;
* hardware;
* drivers;
* recursos;
* segurança;
* recovery.

### Edge Runtime

* identidade;
* sincronização;
* supervisão;
* watchdog;
* telemetria;
* fila offline;
* conteúdo local;
* update;
* rollback.

### Player

* reprodução;
* timeline;
* decode;
* renderização;
* Canvas.

### Cloud

* regras;
* Campaign;
* Pricing;
* autorização;
* Desired State;
* Evidence;
* Settlement.

---

## Limites

O Edge continua proibido de:

* calcular preço;
* calcular split;
* decidir elegibilidade;
* liquidar;
* materializar Evidence;
* criar direitos financeiros.

A mudança de hardware não altera esses limites.

---

## Consequências positivas

* menor CAPEX inicial;
* maior escala potencial;
* reaproveitamento de hardware;
* menor dependência de fabricante;
* experiência de instalação única;
* possibilidade de adicionar novas famílias de hardware sem reescrever o produto;
* possibilidade de substituir a base Linux;
* operação offline robusta;
* atualização e recovery centralizados.

---

## Consequências negativas

* maior complexidade do Installer;
* necessidade de catálogo de hardware;
* necessidade de homologação por perfil;
* necessidade de múltiplos Installation Adapters;
* necessidade de testes específicos de vídeo;
* necessidade de recovery específico por plataforma;
* maior complexidade de segurança.

Essa complexidade é aceita porque fica concentrada na plataforma de infraestrutura e não é transferida ao usuário final nem aos contextos de negócio.

---

## Rejeitadas

### Hardware único como requisito

Rejeitado como estratégia de longo prazo por custo e dependência de fornecedor.

### Instalação manual por SD/USB como experiência de produto

Rejeitado como fluxo principal porque não escala nacionalmente e exige intervenção técnica.

SD/USB continuam permitidos como mecanismos de laboratório, recovery e homologação quando necessários.

### APK universal que sempre grava o sistema

Rejeitado como pressuposto técnico.

Nem todo hardware permite regravação segura a partir de um aplicativo Android comum.

A arquitetura deve esconder essa diferença através de Installation Adapters.

### Player dependente da Internet

Rejeitado.

A mídia previamente autorizada deve existir no Local Content Store.

### Browser Cache como armazenamento principal

Rejeitado.

Cache Web pode ser utilizado para recursos auxiliares, mas não é o repositório autoritativo de mídia.

---

## Relação com ADR-002

O ADR-002 permanece válido para:

* Edge leve;
* separação entre Edge e regras de negócio;
* identidade;
* telemetria;
* heartbeat;
* atualização;
* segurança;
* operação offline;
* rollback;
* watchdog.

O ADR-010 substitui somente a premissa de:

```text
hardware padronizado = Mini PC
```

por:

```text
hardware físico heterogêneo
+
Hardware Profiles
+
Installation Profiles
+
Installation Adapters
+
Mostarda Edge OS
```

---

## Status

Esta decisão permanece `PROPOSED` até que:

1. o fundador aprove;
2. a especificação de plataforma seja atualizada;
3. a matriz de rastreabilidade seja atualizada;
4. os documentos derivados sejam sincronizados;
5. o primeiro HardwareProfile seja homologado.

Nenhum código de produção deve assumir esta decisão como `ACCEPTED` antes da conclusão da governança documental.

````

---

# Onde exatamente colocar

Eu faria assim:

```text
mostarda-backend/
└── docs/
    ├── adr/
    │   └── ADR-010-Edge-Hardware-and-Provisioning.md
    │
    └── tv-network/
        ├── EDGE_RUNTIME.md
        └── EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md
````

**Não coloque em `docs/edge/` neste momento.** O próprio índice do repositório define `tv-network/` como responsável por ciclo de vida, dispositivos Edge, capacidade, saúde e frota, enquanto `edge/` é uma área documental mais específica para Player, mini PC, telemetria, heartbeat e operação offline.

### E existe um terceiro passo, mas não faça ainda

Como o `PLATFORM_SPECIFICATION.md` é a fonte normativa primária e está atualmente em `DRAFT`, a decisão depois precisará ser refletida nele e na `TRACEABILITY.md`.

**Eu não recomendo você editar esses dois agora.**

Primeiro coloque os dois documentos acima. Depois fazemos uma revisão crítica do ADR-010 e, se você aprovar, eu te forneço o patch exato para:

```text
docs/specification/PLATFORM_SPECIFICATION.md
docs/specification/TRACEABILITY.md
