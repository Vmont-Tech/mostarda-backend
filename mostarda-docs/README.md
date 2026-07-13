# 🍅 MOSTARDA — Protocolo de Mídia pDOOH Descentralizado

**MOSTARDA** é um ecossistema descentralizado de mídia Digital Out-of-Home (pDOOH) que opera sob governança participativa e divisão automatizada de receitas baseada em papéis.

## 📊 Revenue Split (5 Atores)

| Ator | % | Função |
|------|---|--------|
| **Mostarda (Plataforma)** | **25%** | Software, infraestrutura, suporte |
| **Dono do Ponto (Espaço)** | **25%** | Parede, Wi-Fi, luz, local |
| **Dono da TV** | **20%** | Hardware, manutenção física |
| **Vendedor (Afiliado)** | **20%** | Captação de pontos comerciais |
| **Embaixador (Influenciador)** | **10%** | Curadoria, apresentação, engajamento |
| **Total** | **100%** | — |

> **Stacking:** Um mesmo usuário acumula múltiplos papéis. Máximo: 50% (TV+Venda+Embaixador).

## 🏗️ Repositórios

### `mostarda-backend/` — Motor de Negócio
**Stack:** Python 3.12+ / FastAPI / PostgreSQL / Stellar / Solana

- API RESTful com JWT auth
- Pagamentos PSAV (Depix/MB/Liqi) → stablecoin BRLX
- Revenue split 25/25/20/20/10
- Blockchain: Stellar (primária) + Solana (fallback)
- Diamond EIP-2535 (smart contracts modulares)
- DeFi yield pools durante retenção
- Eleições de embaixador (6 meses)

### `mostarda-media-player/` — Agente Edge
**Stack:** Python 3.12+ / VLC / scapy / MediaPipe / OpenCV

- Player de vídeo com cache offline
- Sniffer WiFi (scapy) — contagem anônima de público
- Detecção facial (Google MediaPipe) — atenção do espectador
- Heartbeat periódico
- Privacidade LGPD: MACs hasheados, frames descartados

### `mostarda-docs/` — Documentação
- Arquitetura, API, governança, calibração, deploy

## ⛓️ Blockchain

```
Proof of Play → Diamond EIP-2535 → Stellar (primária) → Solana (fallback)
```

| Rede | Função | Ativação |
|------|--------|----------|
| **Stellar** | Primária — ancoragem PoP, split, votos | Padrão |
| **Solana** | Fallback — contingência por congestão | Automática |

## 💳 Pagamentos

```
Anunciante → Pix/Cartão → PSAV API → BRLX stablecoin → Yield Pool → Split 5 vias
```

- **PSAV:** Depix, Mercado Bitcoin, ou Liqi
- **Stablecoin:** BRLX (lastreada em Real — sem enviar divisas ao exterior)
- **Yield:** Pool DeFi durante retenção (7-30 dias)
- **Off-ramp:** Semanal (vendedores/embaixadores) | Mensal (plataforma/donos)

## 🗳️ Governança

- Eleições a cada **6 meses**
- Votantes: Dono da TV, Dono do Ponto, Vendedor
- Peso = role_base × audience_multiplier (Proof of Audience)
- Vencedor assume como embaixador por 6 meses

## 🖥️ Hardware Homologado

| Dispositivo | Tipo |
|------------|------|
| Smart TV (navegador nativo) | Software |
| Fire Stick / Mi TV Stick | Dongle HDMI |
| **Mini PC ZEROONE Fanless** | Hardware oficial |
| ❌ Raspberry Pi | **Proibido** |

## 🚀 Início Rápido

```bash
# Backend
cd mostarda-backend
cp .env.example .env
# Edite .env com suas chaves
pip install -r requirements.txt
python main.py

# Media Player (no dispositivo)
cd mostarda-media-player
pip install -r requirements.txt
python main.py
```

## 📋 Documentação

| Documento | Descrição |
|-----------|-----------|
| `ARCHITECTURE.md` | Diagramas e fluxos |
| `API.md` | Referência REST |
| `DEPLOYMENT.md` | Deploy Docker/Oracle |
| `GOVERNANCE.md` | Regras de eleição |
| `CALIBRATION.md` | Calibração de sensores |
| `ROADMAP.md` | Roadmap de fases |
