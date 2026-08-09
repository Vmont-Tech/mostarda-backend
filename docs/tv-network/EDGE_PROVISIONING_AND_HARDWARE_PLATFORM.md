# Mostarda Edge — Provisioning e Plataforma de Hardware

- **Identificador:** `MOSTARDA-EDGE-PROVISIONING`
- **Status:** `DRAFT — aguardando decisão arquitetural`
- **Escopo:** TV Network, hardware Edge, provisionamento, instalação, compatibilidade, Edge OS, Player e operação offline
- **Relacionamento:** complementa `docs/tv-network/EDGE_RUNTIME.md`
- **Decisão relacionada:** `ADR-010 — Edge Hardware and Provisioning`
- **Supersede:** parte da premissa de hardware de `ADR-002 — Arquitetura do Edge`, conforme decisão posterior

---

## 1. Objetivo

A Mostarda DEVE possuir uma plataforma de Edge capaz de transformar dispositivos de hardware compatíveis em nós operacionais da rede de mídia sem exigir intervenção técnica especializada do usuário final.

O objetivo é permitir expansão nacional utilizando inicialmente hardware de baixo custo disponível no mercado, incluindo TV Boxes compatíveis, sem criar uma dependência arquitetural permanente de um fabricante, modelo comercial ou plataforma de hardware específica.

O usuário NÃO DEVE precisar conhecer:

- SoC;
- placa;
- DTB;
- kernel;
- bootloader;
- Armbian;
- método de instalação;
- particionamento;
- arquitetura de CPU;
- versão do firmware;
- método de recuperação.

Essas decisões pertencem ao sistema de provisioning da Mostarda.

---

## 2. Princípio central

A experiência do usuário DEVE ser:

```text
Baixar Mostarda Edge Installer
            ↓
Executar
            ↓
Detectar hardware
            ↓
Verificar compatibilidade
            ↓
Selecionar perfil de instalação
            ↓
Instalar Mostarda Edge OS
            ↓
Instalar/configurar Edge Runtime
            ↓
Configurar Player
            ↓
Provisionar identidade
            ↓
Validar operação
            ↓
Mostarda Edge operacional
````

A existência de diferentes plataformas de hardware NÃO DEVE ser exposta ao usuário final.

---

## 3. Hardware como plataforma heterogênea

A Mostarda NÃO DEVE assumir que todo dispositivo possui o mesmo método de instalação.

A plataforma DEVE separar:

1. descoberta de hardware;
2. catálogo de compatibilidade;
3. perfil de instalação;
4. imagem do sistema;
5. método de instalação;
6. perfil do Player;
7. capabilities;
8. política de recuperação.

O instalador é universal na experiência, mas utiliza adaptadores internos específicos por plataforma.

---

## 4. Hardware Discovery

O `Mostarda Edge Installer` DEVE obter, quando tecnicamente disponível, uma impressão de hardware suficiente para selecionar um perfil homologado.

A descoberta DEVE considerar, no mínimo:

* SoC;
* arquitetura;
* board identifier;
* revisão da placa;
* CPU;
* GPU;
* RAM;
* armazenamento;
* tipo de armazenamento;
* capacidade disponível;
* Wi-Fi;
* Ethernet;
* USB;
* HDMI/display;
* bootloader;
* método de boot disponível;
* versão do sistema atualmente instalado;
* ABI;
* capacidades observáveis de decodificação;
* capacidades observáveis de renderização.

A identificação NÃO DEVE depender somente do nome comercial informado pelo fabricante.

Exemplo:

```text
MXQ Pro 4K
```

não constitui identidade suficiente.

O sistema DEVE buscar uma identificação equivalente a:

```text
SoC
Board
Revision
RAM
Storage
Bootloader
Capabilities
```

---

## 5. Hardware Fingerprint

O Installer DEVE produzir um `HardwareFingerprint` determinístico a partir dos atributos observáveis e confiáveis do dispositivo.

Exemplo conceitual:

```json
{
  "platform": "rockchip",
  "soc": "rk3228a",
  "board": "r329q_v8.1",
  "board_revision": "2020.06.15",
  "architecture": "arm32",
  "ram_mb": 1024,
  "storage_type": "nand",
  "storage_capacity_mb": 8192,
  "ethernet": true,
  "wifi": true,
  "hdmi": true
}
```

Os campos reais DEVEM ser definidos pelo contrato de Hardware Discovery.

Valores reportados pelo sistema operacional que não possam ser considerados confiáveis DEVEM ser classificados como não verificados.

O Installer NÃO DEVE assumir que capacidade declarada pelo firmware corresponde à capacidade física real.

---

## 6. Hardware Compatibility Catalog

A Mostarda DEVE manter um catálogo versionado de hardware homologado.

Cada `HardwareProfile` DEVE associar:

```text
Hardware Profile
├── HardwareFingerprint rules
├── Edge OS image
├── Kernel
├── Device Tree / BSP
├── Bootloader requirements
├── Installation Adapter
├── Player Profile
├── Capability Manifest
├── Recovery Plan
└── Compatibility status
```

Estados mínimos:

```text
SUPPORTED
DEPRECATED
EXPERIMENTAL
UNSUPPORTED
```

Hardware não encontrado no catálogo DEVE ser tratado como incompatível ou não avaliado.

O sistema NÃO DEVE inferir compatibilidade de um hardware não homologado apenas porque o SoC é semelhante a outro dispositivo.

---

## 7. Installation Profile

O `InstallationProfile` representa a forma autorizada de transformar determinado hardware em Mostarda Edge.

Ele DEVE identificar:

* imagem;
* versão;
* hash;
* assinatura;
* kernel;
* DTB/BSP;
* bootloader quando aplicável;
* layout de partições;
* destino;
* método de instalação;
* pré-condições;
* pós-condições;
* recovery;
* rollback;
* versão mínima do Installer.

Exemplo conceitual:

```text
HardwareProfile:
    R329Q_V8.1 / RK3228A

InstallationProfile:
    OS: Mostarda Edge OS 1.x
    Base: Linux/Armbian-derived
    InstallAdapter: Rockchip-A
    Target: Internal Storage
    PlayerProfile: Web-Low-Memory
    RecoveryPlan: Rockchip-Recovery-A
```

---

## 8. Installation Adapters

O Installer DEVE possuir uma camada de adaptadores.

Conceitualmente:

```text
Mostarda Edge Installer
│
├── Hardware Discovery
├── Compatibility Engine
├── Image Manager
├── Provisioning
├── Validation
└── Installation Adapters
      ├── Android OTA Adapter
      ├── Android Recovery Adapter
      ├── ADB/Reboot Adapter
      ├── Rockchip Adapter
      ├── Amlogic Adapter
      ├── Allwinner Adapter
      └── Recovery Media Adapter
```

A lista é extensível e NÃO constitui contrato fechado.

O usuário final NÃO DEVE selecionar o adapter.

O Compatibility Engine seleciona o método autorizado pelo `InstallationProfile`.

---

## 9. Instalação sem intervenção especializada

Quando o hardware suportar instalação direta a partir do sistema atual, o Installer DEVE utilizar esse caminho.

Quando o hardware não permitir regravação segura diretamente a partir do sistema atual, o Installer DEVE informar explicitamente a limitação e utilizar o mecanismo de recuperação/provisionamento autorizado para aquele perfil.

O sistema NÃO DEVE simular uma instalação bem-sucedida quando a plataforma não fornece um caminho seguro para gravação.

A arquitetura deve suportar diferentes métodos sem alterar a experiência geral do produto.

---

## 10. Mostarda Edge OS

O usuário NÃO DEVE instalar uma imagem genérica de Armbian como produto final.

O produto é:

```text
Mostarda Edge OS
```

Armbian pode ser utilizado como base técnica quando for a opção adequada para determinada plataforma.

A base Linux é uma decisão de implementação e NÃO deve fazer parte da experiência de produto.

Conceitualmente:

```text
Base Linux
    ↓
BSP / Kernel / DTB
    ↓
Mostarda Edge OS
    ↓
Edge Runtime
    ↓
Player Runtime
    ↓
Mostarda Edge
```

A arquitetura DEVE permitir substituir a base Linux no futuro sem alterar o contrato do Installer ou a identidade do Edge.

---

## 11. Edge Runtime

O Edge Runtime permanece responsável pela execução operacional local.

Ele DEVE:

* manter identidade;
* supervisionar processos;
* controlar sincronização;
* manter fila offline;
* baixar conteúdo;
* verificar integridade;
* manter estado local;
* produzir Heartbeat;
* produzir Telemetry;
* supervisionar Player;
* executar Watchdog;
* executar atualização;
* executar rollback;
* executar recuperação;
* preservar fatos pendentes.

O Edge Runtime NÃO DEVE:

* calcular preço;
* calcular split;
* decidir elegibilidade comercial;
* liquidar pagamento;
* validar Evidence;
* decidir regras de Campaign;
* decidir direitos financeiros.

Esses limites permanecem alinhados ao `EDGE_RUNTIME.md`.

---

## 12. Player

O Player DEVE ser desacoplado do Edge Runtime.

O Edge supervisiona o Player, mas não contém sua lógica interna de renderização.

A estratégia inicial DEVE priorizar um Player baseado em tecnologia Web/HTML5 para reduzir a quantidade de lógica nativa específica por plataforma.

O perfil efetivamente utilizado DEVE ser selecionado pelo `HardwareProfile`.

Exemplo:

```text
PlayerProfile:
    WEB_LOW_MEMORY
```

ou outro perfil homologado.

O uso de Web/HTML5 NÃO significa que a aplicação deva depender da Internet para reprodução.

---

## 13. Local Content Store

A reprodução DEVE utilizar conteúdo previamente sincronizado e validado no armazenamento local.

Arquitetura:

```text
Cloud
  ↓
Edge Sync
  ↓
Local Content Store
  ↓
Local HTTP / Web Runtime
  ↓
HTML5 Player
  ↓
Display
```

O navegador NÃO DEVE depender diretamente de uma URL remota para reproduzir um Creative já autorizado.

O Edge DEVE realizar:

* download;
* checksum;
* validação;
* armazenamento;
* versionamento;
* retenção;
* remoção;
* recuperação.

---

## 14. Operação offline

A perda de conectividade NÃO DEVE interromper a reprodução de conteúdo válido previamente sincronizado.

Durante desconexão:

```text
Cloud
   X
   │
   │
Edge
 │
 ├── Local Content Store
 ├── Playback Queue
 └── Telemetry Queue
       │
       ▼
    Player
```

O Player continua reproduzindo conteúdo válido conforme a programação local autorizada.

O Edge preserva:

* Playback Events;
* Telemetry;
* Health;
* Current State;
* falhas;
* mudanças operacionais.

Os fatos são sincronizados após reconexão.

O Edge NÃO DEVE alterar o timestamp original para mascarar o período offline.

---

## 15. Browser Cache

Service Worker, Cache API ou mecanismos equivalentes PODEM ser utilizados para armazenar o shell da aplicação Web e recursos auxiliares.

Eles NÃO DEVEM ser a fonte primária de armazenamento de mídia da Mostarda.

A fonte primária DEVE ser o `Local Content Store` controlado pelo Edge.

Motivo:

* quotas de navegador;
* eviction;
* diferenças de implementação;
* controle limitado sobre retenção;
* arquivos grandes;
* necessidade de integridade;
* necessidade de versionamento;
* necessidade de políticas de limpeza.

A arquitetura deve separar:

```text
Web Application Cache
```

de:

```text
Authoritative Local Media Store
```

---

## 16. Local Content Server

Quando necessário para integração com o Player Web, o Edge DEVE fornecer uma interface local mínima para acesso aos assets previamente validados.

Conceitualmente:

```text
Player
  ↓
localhost
  ↓
Edge Local Content Service
  ↓
Local Content Store
```

O serviço local DEVE:

* servir somente conteúdo autorizado;
* impedir acesso administrativo;
* validar identidade da aplicação quando necessário;
* impedir traversal;
* limitar exposição;
* registrar operações relevantes.

Ele NÃO DEVE expor o Edge para a rede local do Venue.

---

## 17. Uso de memória

Dispositivos de baixa memória são alvo legítimo da plataforma.

O Edge DEVE ser projetado para baixo consumo.

O sistema NÃO DEVE executar simultaneamente serviços desnecessários.

Componentes não essenciais do sistema operacional DEVERÃO ser removidos ou desativados quando permitido pelo `HardwareProfile`.

O objetivo é maximizar:

```text
RAM disponível
CPU disponível
GPU disponível
armazenamento disponível
```

para:

```text
Edge Runtime
Player
Display
```

O processo de otimização DEVE ocorrer durante a construção da imagem do Mostarda Edge OS sempre que possível, e não depender de scripts destrutivos executados depois da instalação.

---

## 18. Limpeza do sistema anterior

A instalação do Mostarda Edge DEVE produzir um sistema dedicado.

Aplicativos do sistema anterior que não sejam necessários ao funcionamento do Edge NÃO DEVEM permanecer na imagem final quando a instalação substitui integralmente o sistema.

Não é objetivo manter o Android original em execução em paralelo com o Edge OS.

Quando o método de instalação permitir substituição integral do sistema:

```text
Android
   ↓
substituição controlada
   ↓
Mostarda Edge OS
```

O método de instalação DEVE possuir recuperação compatível com o hardware.

---

## 19. Provisionamento de identidade

Após a instalação, o dispositivo DEVE executar o provisioning automático.

Fluxo:

```text
Boot
 ↓
Hardware Identity
 ↓
Edge Installation Identity
 ↓
Device Registration
 ↓
Credential Provisioning
 ↓
Capability Registration
 ↓
Desired State
 ↓
Health Validation
 ↓
HEALTHY
```

A identidade operacional NÃO DEVE ser baseada somente em MAC Address.

A arquitetura existente de `EdgeInstallationId`, `DeviceIdentifier` e `TVIdentifier` permanece válida.

Uma reinstalação que revogue credenciais NÃO DEVE reutilizar credenciais antigas.

---

## 20. Capability Manifest

O dispositivo DEVE registrar um manifesto de capacidades observadas/homologadas.

Exemplo conceitual:

```json
{
  "display": {
    "hdmi": true,
    "max_resolution": "1920x1080"
  },
  "network": {
    "ethernet": true,
    "wifi": true
  },
  "video": {
    "h264": true,
    "hevc": true
  },
  "resources": {
    "ram_mb": 1024
  }
}
```

A capacidade declarada pelo dispositivo NÃO substitui homologação.

O Backend só deve enviar trabalho compatível com o `Capability Manifest` e o `HardwareProfile`.

---

## 21. Update

O Mostarda Edge OS DEVE suportar atualização remota assinada.

A atualização DEVE possuir:

* versão;
* hash;
* assinatura;
* hardware compatibility;
* versão mínima;
* maintenance window;
* health gate;
* rollback profile.

O Edge NÃO DEVE instalar imagem destinada a hardware incompatível.

---

## 22. Recovery

Cada `HardwareProfile` DEVE possuir um `Recovery Plan`.

Recovery DEVE permitir, conforme as capacidades do hardware:

* reinstalação;
* rollback;
* recuperação de boot;
* restauração de imagem conhecida;
* diagnóstico.

A estratégia de recuperação deve ser definida por plataforma.

Nenhum mecanismo de recovery pode depender de uma suposição universal sobre bootloader.

---

## 23. Segurança

Todos os artefatos de instalação e atualização DEVEM ser autenticados.

O Installer DEVE validar:

* origem;
* assinatura;
* hash;
* versão;
* compatibilidade;
* integridade.

O dispositivo NÃO DEVE executar uma imagem apenas porque seu nome ou URL corresponde ao HardwareProfile.

O catálogo de compatibilidade também DEVE ser versionado e protegido contra adulteração.

---

## 24. Primeiro hardware de homologação

A plataforma DEVE permitir homologação incremental.

O primeiro alvo experimental pode utilizar a família:

```text
R329Q_V8.1
Rockchip RK322x
```

quando sua identificação e configuração forem confirmadas.

Esse hardware DEVE ser tratado como `EXPERIMENTAL` até concluir os testes mínimos.

A homologação DEVE avaliar:

* boot;
* instalação;
* provisioning;
* Ethernet;
* Wi-Fi;
* HDMI;
* RAM;
* armazenamento;
* decodificação;
* reprodução;
* watchdog;
* reinício;
* perda de energia;
* perda de conectividade;
* operação offline;
* sincronização;
* telemetria;
* atualização;
* rollback;
* recovery;
* estabilidade prolongada.

---

## 25. Critério de produção

Um HardwareProfile só pode receber estado `SUPPORTED` quando:

1. o método de instalação for repetível;
2. o hardware for identificado deterministicamente;
3. o Edge OS inicializar de forma confiável;
4. o provisioning funcionar;
5. o Player funcionar;
6. o conteúdo offline funcionar;
7. a telemetria funcionar;
8. a recuperação funcionar;
9. o update funcionar;
10. rollback tiver sido validado;
11. estabilidade prolongada tiver sido validada.

Um teste de boot isolado NÃO constitui homologação.

---

## 26. Relação com TV Network

TV Network permanece owner de:

* TV;
* Device lifecycle;
* EdgeInstallation;
* hardware capability;
* health;
* update;
* fleet;
* disponibilidade operacional.

Edge Runtime permanece owner da execução local.

O Installer e o provisioning são mecanismos de infraestrutura do ciclo de vida da `EdgeInstallation`.

Eles NÃO criam um novo Bounded Context de negócio.

---

## 27. Relação com Evidence

O Installer, Edge OS e Player NÃO materializam Evidence.

O Edge produz fatos operacionais e Playback Events.

Evidence Ledger continua sendo o único contexto autorizado a materializar `EvidenceRecord`.

Falha de instalação, playback ou hardware NÃO pode ser convertida localmente em decisão financeira.

---

## 28. Relação com o modelo offline

Offline é uma propriedade operacional, não uma autorização para criar novos direitos.

O Edge pode continuar executando conteúdo previamente autorizado.

O Edge NÃO pode:

* criar novos Slots;
* alterar preço;
* criar direito financeiro;
* alterar Campaign;
* alterar split;
* validar Evidence.

---

## 29. Evolução de plataforma

A arquitetura DEVE permitir:

```text
TV Box de baixo custo
        ↓
hardware homologado
        ↓
Mostarda Edge OS
        ↓
mesmo contrato operacional
        ↓
hardware dedicado futuro
```

A troca de hardware NÃO DEVE exigir mudança no contrato de negócio da plataforma.

O objetivo é que o Backend enxergue:

```text
EdgeInstallation
```

e não:

```text
"MXQ Pro 4K"
"Mini PC"
"Raspberry Pi"
"Device X"
```

O hardware é uma implementação da capacidade física do Edge.

---

## 30. Decisões abertas

As seguintes decisões permanecem `OPEN` e NÃO devem ser resolvidas por implementação silenciosa:

* método universal de instalação Android → Edge OS;
* suporte a bootloader específico;
* estratégia de Secure Boot por plataforma;
* ferramenta de build definitiva do Edge OS;
* base Linux definitiva por família de hardware;
* engine Web definitiva;
* limites de RAM por PlayerProfile;
* política de retenção do Local Content Store;
* política de pressão de armazenamento;
* política de rollback;
* política de recovery;
* estratégia de assinatura de imagens;
* estratégia de catálogo de hardware;
* protocolo definitivo de Hardware Discovery;
* capacidade mínima de hardware para `SUPPORTED`.

---

## 31. Regra de ouro

A Mostarda NÃO DEVE construir um instalador universal fingindo que todos os hardwares são iguais.

Deve construir:

> **uma experiência universal de instalação sobre uma camada de compatibilidade específica por hardware.**

O usuário vê um botão.

A plataforma executa uma cadeia de decisões verificáveis:

```text
Discover
→ Identify
→ Match
→ Verify
→ Install
→ Provision
→ Validate
→ Operate
→ Update
→ Recover
```

Esse é o contrato operacional do Mostarda Edge.
