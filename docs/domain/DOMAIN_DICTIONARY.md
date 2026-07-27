# DOMAIN DICTIONARY — Mostarda

Vocabulário oficial da plataforma. **Um termo só existe se estiver aqui.** Qualquer código, documento ou conversa técnica deve usar exatamente estes nomes.

---

## TV
Dispositivo físico ativo no ecossistema Mostarda. Composto por **mini PC (Edge)** + **tela** + acessórios. Possui identidade única (`TV ID`), pertence a um **Dono da TV** e está instalada em um **Venue**. Emite telemetria e executa **Playback Events**.

## TV Network
Bounded Context proprietário do ciclo de vida e da disponibilidade operacional da frota física: TVs, dispositivos, Edge, capabilities, health, heartbeat, atualização e Fleet. Não conhece Campaign, anúncios, preço, Financeiro, Evidence ou Settlement.

## Edge
Camada de software que roda no mini PC acoplado à TV. Responsável por: reproduzir conteúdo (via Canvas), coletar telemetria, emitir heartbeat, operar offline por períodos limitados e assinar evidências localmente. **Não** contém regras complexas de negócio.

## Canvas
Camada de renderização/composição que decide **como** cada slot é apresentado visualmente na TV. Consome instruções do Edge e produz a saída final na tela. Isolada do restante do Edge para permitir evolução visual independente.

## Grão
Agente pessoal de IA associado a cada usuário do ecossistema. Aprende preferências, sugere ações, explica decisões. Pode ser **renomeado** pelo usuário. É a face conversacional da Mostarda.

## Campaign
Contrato de veiculação criado por um **Advertiser**. Define objetivo, criativos, público-alvo, orçamento, janela temporal e regras de segmentação. Gera N **Slots** ao longo do tempo.

## Slot
Unidade de intenção de exibição — reserva de um espaço/instante para uma **Campaign** em uma **TV**. Cada Slot, ao ser executado, gera um **Playback Event** que produz uma **Evidence**.

## Asset
Arquivo de mídia (vídeo de 15s, imagem, composição) associado a uma **Campaign**. Passa por validação de IA (formato, duração, conformidade) antes de tornar-se elegível para exibição.

## Evidence
Registro atômico e íntegro de que **um Asset foi exibido em uma TV em um dado instante**, correspondendo a um evento atômico de **15 segundos**. Contém, no mínimo: `TV ID`, `Campaign ID`, `Slot ID`, `timestamp`, `hash`, `conteúdo exibido`, `valor cobrado`, `status`. Ver [ADR-003](../adr/ADR-003-Evidence-Ledger.md).

## Evidence Ledger
Livro-razão append-only de todas as **Evidences** produzidas pela plataforma. Fonte da verdade para liquidação financeira. Uma evidência inválida ou ausente **bloqueia** qualquer pagamento associado. Pode ter hash ancorado em **blockchain institucional** para prova pública.

## Playback Event
Evento de domínio emitido pelo **Edge** ao concluir a reprodução de um Slot. Alimenta o **Evidence Ledger** e a **Telemetry**.

## Telemetry
Fluxo contínuo de dados operacionais emitidos pelo **Edge**: heartbeat, saúde do dispositivo, luminosidade, conectividade, ocorrências. Usada para SLA, seguro e recomendação de IA. **Não** substitui Evidence.

## Dynamic Pricing
Mecanismo que define o **valor cobrado** por Slot com base em demanda, contexto (horário, localização), performance histórica do inventário e recomendação de IA. Aplicado no momento da alocação do Slot.

## Split Payment
Divisão automática do valor líquido distribuível de uma Evidence entre participantes elegíveis, após taxas, impostos e retenções explícitas. A política canônica é **30% Mostarda, 20% Dono da TV, 20% Dono do Espaço, 20% Vendedor responsável e 10% Influenciador**. Fundo de Seguro não é sexto destinatário de split; seus créditos são lançamentos explícitos. Executada via **Asaas**.

## Settlement
Processo de liquidação financeira que consolida Evidences válidas em ciclos e dispara os **Split Payments** via **Asaas**. Nunca ocorre sem Evidence íntegra.

## Influencer
Participante que empresta imagem/conteúdo/audiência a Campaigns. Elegível a receber fatia do Split.

## Advertiser
Participante que contrata Campaigns. É debitado conforme Evidences válidas.

## Venue
Local físico onde uma **TV** está instalada. Pertence a um **Dono do espaço**. Possui atributos de contexto (categoria, tráfego, horário de operação) usados para segmentação e precificação.

## Quantum Registry
Registro público mantido via **Quantum Cert**. Guarda hashes de documentos e histórico de **NFC/QR Interactions**, permitindo verificação pública sem expor dados sensíveis.

## NFC Interaction
Interação física entre um usuário (via celular/tag NFC) e o ecossistema Mostarda. **Não** conversa diretamente com o **Edge** — consulta o **Quantum Registry**. Ver [ADR-004](../adr/ADR-004-Quantum-Integration.md).

## QR Interaction
Interação por leitura de QR Code. Mesma regra do NFC: passa pelo **Quantum Registry**, nunca direto ao Edge.

## Insurance Fund
Livro-razão append-only do fundo de seguro. Registra entrada de prêmios, reservas, saídas e saldo sem se confundir com receita ou split de campanha.

## Insurance Policy
Contrato de cobertura de hardware de uma TV: vigência, carência, elegibilidade, limites, exclusões e adimplência.

## Insurance Claim
Sinistro submetido para análise de cobertura, reparo ou reposição, com decisão e histórico auditáveis.

## Split Policy Version
Identificador imutável da regra de distribuição aplicada a uma Evidence e a uma linha de Settlement.

## Facet Asset
Ativo interno de uma Facet: política, capacidade, perfil, pipeline, estado operacional ou trilha de auditoria. Não é um Creative Asset.

## Canonical Evidence Package
Representação canônica, independente de formato, de uma prova oficial preparada pelo Cloud. É a origem do hash ancorado pelo Quantum; PDF, JSON, CBOR ou Protobuf são somente transportes.

## Desired State
Estado versionado que Cloud declara para uma TV/Edge: configuração e versões que devem estar vigentes.

## Current State
Estado observado e reportado pelo Edge, incluindo configuração, versões, saúde e divergências em relação ao Desired State.

## Observed State
Leitura independente que Cloud deriva de heartbeat, telemetria, HDMI, execução e confirmações de comando. É comparada ao Current State pelo reconciliador.

## Split Share Status
Estado individual de uma parcela: `READY`, `BLOCKED`, `UNCLAIMED`, `PAID` ou `FAILED`.

## Evidence Record
Registro de prova append-only criado no Cloud após validação de um Playback Event. É a unidade que pode tornar-se `VALID` e habilitar Settlement.

## Playback Collector
Componente do Edge que coleta, assina, armazena offline e reporta fatos de playback. Não cria Evidence Record nem atribui status de prova.

## TV Capability
Aggregate que representa uma capacidade instalada em uma TV, com estado, versão, owner, health, Facets, Assets, Services, Policies e Events.

## Financial Platform
Bounded Context que governa entrada compensada, orçamento disponível, ledger, carteira de parceiros, saque e políticas financeiras; não calcula preço, prova ou split.

## Campaign Available Budget
Saldo compensado e disponível para reservar/consumir em Slots. É distinto de Contract Value e a única fonte de autorização financeira de Campaign.

## Partner Ledger
Livro append-only de créditos, débitos, taxas, chargebacks e recuperações de um parceiro.

## Partner Wallet
Projeção dos saldos Pending, Available, Blocked, Withdrawable e Negative derivados do Partner Ledger.

## Withdrawal
Solicitação e ciclo de retirada de saldo de parceiro, governados por Withdrawal Policy e executados pelo provider somente após aprovação/batch.

## Slot Dispatched
Estado que confirma que o Edge aceitou a distribuição de um Slot e sua revisão. É distinto de playback concluído e define o cutoff de cancelamento imediato.

## Advertiser Account
Conta financeira do Advertiser que mantém crédito interno reutilizável e sua trilha append-only. Não pertence ao Aggregate Campaign.

## Slot Equivalence Policy
Política versionada que define tolerâncias obrigatórias de categoria, geografia, tela, horário, preço e audiência esperada para realocação.

## Configuration Service
Capacidade Cloud que distribui parâmetros e versões aprovadas de políticas operacionais. Não cria regra de negócio nem fornece default implícito.

## Campaign Execution Started
Fato publicado uma única vez quando o primeiro Slot da Campaign é reservado. É distinto da ativação comercial no início da janela.

## Governance & Dispute Management
Bounded Context que transforma fatos autoritativos em julgamentos oficiais, revisionados e auditáveis. É o único owner de responsabilidade.

## Governance Case
Aggregate que conduz abertura, investigação, revisão humana, decisão, recurso, reavaliação e fechamento sem alterar fatos externos.

## Responsibility Decision
Decisão append-only que contém responsável, categoria, severidade, confidence, policyVersion, razão e evidências. Torna-se oficial por `ResponsibilityDecisionPublished`.

## Governance Policy Version
Versão imutável da política aplicada a uma Responsibility Decision. Mudança de critérios cria nova versão e nunca reinterpreta decisão histórica.

## Responsibility Category
Causa normativa do incidente: `PLATFORM_BUG`, `OPERATIONAL_FAILURE`, `PARTNER_FAILURE`, `THIRD_PARTY_FAILURE`, `USER_MISUSE`, `FORCE_MAJEURE` ou `UNKNOWN`.

## Responsibility Severity
Impacto normativo independente da causa: `LOW`, `MEDIUM`, `HIGH` ou `CRITICAL`.

## Governance Confidence
Decimal `[0.00,1.00]` que registra robustez da conclusão diante da qualidade, completude e consistência das evidências. Não representa probabilidade de culpa nem controla efeitos.

## Governance Appeal
Contestação formal de uma revisão publicada. Preserva a decisão original e pode causar nova revisão após reavaliação.
