# Mostarda Digital Network (MDN) — Backend Engine

A **Mostarda Digital Network (MDN)** é uma infraestrutura descentralizada e resiliente para orquestração, auditoria e veiculação de mídia **Digital Out-Of-Home (DOOH)**. O ecossistema conecta reprodutores de borda (Edge Media Players) inteligentes a uma camada de backend de alta performance, garantindo a validação imutável de veiculação de anúncios (Proof-of-Play) e governança descentralizada de conteúdo através de redes blockchain.

---

## 👁️ Visão Geral do Sistema

O motor backend opera como o núcleo de processamento lógico de uma rede distribuída de telas públicas, dividindo-se em três pilares fundamentais:

**Ingestão Inteligente na Borda (Edge Analytics):** Processamento em tempo real de métricas de audiência capturadas por sensores locais (visão computacional e densidade de radiofrequência), transmitidas via protocolos criptografados de telemetria.

**Auditoria e Consensualidade Cross-Chain:** Registro e ordenação cronológica estrita de exibições (Proofs-of-Play) ancorados nativamente nas redes **Solana Devnet** e **Stellar Testnet**, blindando o ecossistema contra fraudes de relatórios de métricas.

**Barramento de API Autônomo:** Camada abstrata de dados de alta velocidade via **PostgREST** sobre uma base **PostgreSQL** estável, permitindo que dispositivos de hardware consumam e atualizem configurações globais com latência ultra-baixa.

---

## 🏗️ Arquitetura do Repositório

O projeto adota uma infraestrutura conteinerizada e modular para espelhamento e desenvolvimento ágil:

```
mostarda-backend/
├── docker-compose.yml           # Orquestração local do ambiente (DB + API Gateway)
├── Dockerfile                   # Build multi-estágio otimizado para produção
├── scripts/
│   ├── generate_test_keys.py    # Utilitário de provisionamento criptográfico nas redes de teste
│   └── stress_test.py           # Motor de estresse concorrente e validação de Rate Limiting
├── main.py                      # Entrypoint FastAPI
├── core/                        # Config, segurança, database engine
├── api/v1/                      # Endpoints REST
├── services/                    # PSAV, Revenue, Blockchain, Elections, Off-Ramp
├── models/                      # Modelos SQLAlchemy
└── supabase/volumes/db/init/    # Inicialização axiomática do banco de dados
    ├── 00-schema.sql            # Definição das 21 tabelas relacionais, enums e políticas RLS
    ├── 01-functions.sql         # Abstração de regras de negócio em mais de 35 funções RPC
    └── 02-seed.sql              # Massa de dados estruturada para simulações locais
```

---

## 🛠️ Recursos de Engenharia e Hardening

**Isolamento de Dados (Row-Level Security):** Políticas estritas de RLS diretamente nas tabelas de banco de dados, isolando o acesso de leitura e escrita por chaves de API e perfis autenticados.

**Fila de Sequenciamento Atômica:** Engine `SequenceService` integrada ao banco de dados que garante a ordenação e integridade dos registros digitais entre cadeias, eliminando riscos de condições de corrida ou deadlocks sob cargas massivas de múltiplos players simultâneos.

**Sanitização de Logs Sensíveis:** Mecanismo ativo de filtragem de consultas que impede a escrita ou vazamento acidental de chaves de API, segredos corporativos ou hashes de autenticação nas saídas de console do servidor.

**Rate Limiting Local:** Barreiras em memória integradas aos fluxos de autenticação que mitigam ataques coordenados de força bruta e garantem o escoamento estável de requisições legítimas.

---

## 🚦 Protocolos de API (Endpoints RPC)

A camada de serviço expõe funções de chamada remota de procedimento (RPC) em `http://localhost:3001` projetadas para hardware embarcado:

### Gerenciamento de Hardware

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/tvs` | Recupera o inventário ativo de telas mapeadas na rede e sua distribuição geográfica |
| `POST` | `/rpc/get_device_config` | Provisionamento dinâmico de parâmetros operacionais e políticas locais de reprodução |
| `POST` | `/rpc/get_tv_health_status` | Interface de telemetria para validação de integridade e pulso (heartbeat) dos nós |

### Precificação e Liquidação Programática

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/rpc/calculate_dynamic_price` | Motor algorítmico que avalia densidade de audiência para tarifar CPM em tempo real |
| `POST` | `/rpc/distribute_slot_revenue` | Rotina autônoma de liquidação (Settlement Distribuído) com partilha programática de direitos econômicos |
| `GET` | `/rpc/revenue_split` | Consulta analítica do balanço e histórico de liquidações por lote de veiculação |

---

## 🚀 Inicialização do Ambiente de Desenvolvimento

### Pré-requisitos

- Docker & Docker Compose instalados
- Python 3.10+ (apenas se for rodar os scripts auxiliares fora do container)

### 1. Provisionamento de Credenciais Criptográficas

Antes de subir os serviços, execute o script utilitário para gerar chaves legítimas operantes em redes de testes (Testnet/Devnet), evitando erros de falta de variáveis no barramento da blockchain:

```bash
cd mostarda-backend
pip install stellar-sdk solana solders requests
python scripts/generate_test_keys.py --fund
```

Este comando criará o arquivo `.env.dev` configurado e injetará fundos de teste via Friendbot nas contas geradas.

### 2. Orquestração dos Containers

Inicie os serviços de banco de dados estruturado e o gateway da API:

```bash
docker compose up -d --build
```

### 3. Validação de Sanidade

Para auditar se o banco de dados e os esquemas foram montados corretamente:

```bash
docker compose exec db psql -U postgres -d mostarda \
  -c "SELECT 'Infraestrutura Operacional' as status;"
```

Para monitorar a telemetria e o tráfego de requisições do gateway em tempo real:

```bash
docker compose logs -f
```

---

## 🧪 Testes de Estresse

Após o ambiente estar rodando, valide a resiliência dos módulos críticos:

```bash
# Teste completo: 50 PoPs concorrentes + 20 logins em 4s
python scripts/stress_test.py

# Apenas validação de sequência atômica (100 workers)
python scripts/stress_test.py --users 100 --scenario pop

# Apenas validação de rate limit
python scripts/stress_test.py --scenario ratelimit
```

---

## 📊 Revenue Split (5 Atores)

| Ator | % | Cadência |
|------|:-:|:--------:|
| Dono do Ponto | 25% | Mensal |
| Dono da TV | 20% | Mensal |
| Vendedor | 20% | Semanal |
| Embaixador | 10% | Semanal |
| Mostarda (Holding) | 25% | Mensal |
| **Total** | **100%** | — |

> Stacking máximo por usuário: **50%** (TV + Venda + Embaixador)

---

## ⛓️ Blockchain — Redundância Automática

| Rede | Função | Ativação | Gatilho |
|------|--------|:--------:|---------|
| **Stellar** | Primária — ancoragem PoP, split, votos | ✅ Padrão | Fee baixo e previsível |
| **Solana** | Fallback — contingência | ⚡ Auto | Fee Stellar > 0.001 XLM |

- Circuit breaker: 3 falhas consecutivas → 300s cooldown
- Replay queue: PoPs da Solana reenviados à Stellar quando recupera
- Sequence numbers globais DB-backed (sobrevivem a restart)

---

## 📚 Documentação Adicional

| Documento | Descrição |
|-----------|-----------|
| `mostarda-docs/ARCHITECTURE.md` | Diagramas e fluxos completos |
| `mostarda-docs/API.md` | Referência REST completa |
| `mostarda-docs/DEPLOYMENT.md` | Deploy Docker/Oracle |
| `mostarda-docs/GOVERNANCE.md` | Regras de eleição e votação |
| `mostarda-docs/CALIBRATION.md` | Calibração de sensores |
| `mostarda-docs/ROADMAP.md` | Roadmap de fases |
