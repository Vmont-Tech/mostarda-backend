# 🏗️ Arquitetura MOSTARDA

```
                    ┌──────────────────────────────────────────┐
                    │   Hardware (Smart TV / Fire Stick /      │
                    │   ZEROONE Mini PC)                       │
                    │   [mostarda-media-player]                │
                    │  ┌──────┐ ┌──────┐ ┌─────────┐         │
                    │  │ VLC  │ │ WiFi │ │ Camera  │         │
                    │  │Player│ │Sniffer│ │MediaPipe│         │
                    │  └──┬───┘ └──┬───┘ └────┬────┘         │
                    └─────┼────────┼───────────┼──────────────┘
                          │        │           │
                    (HTTPS)  (Métricas)  (Frame discard)
                          │        │           │
                          ▼        ▼           ▼
                    ┌──────────────────────────────────────────┐
                    │         FastAPI Application Core         │
                    │  [mostarda-backend]                      │
                    │  ┌──────┐ ┌──────┐ ┌────┐ ┌──────────┐ │
                    │  │Auth  │ │Revenue│ │PSAV│ │Eleições  │ │
                    │  └──────┘ └──────┘ └────┘ └──────────┘ │
                    └──────────────────┬───────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────┐
          │                            │                        │
          ▼                            ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   PostgreSQL    │    │  Diamond EIP-2535   │    │  PSAV (Stablecoin)  │
│   (Dados)       │    │  ┌──────┐ ┌──────┐  │    │  Depix / MB / Liqi  │
│                 │    │  │Stellar│ │Solana│  │    │  BRLX → Yield Pool  │
└─────────────────┘    │  │Primary│ │Fallb.│  │    └─────────────────────┘
                       │  └──────┘ └──────┘  │
                       └─────────────────────┘
```

## 📐 Padrões

| Padrão | Uso |
|--------|-----|
| **Diamond EIP-2535** | Smart contracts modulares (PoP, Revenue, Election, Governance) |
| **Saga Coreografada** | Pagamento PSAV → Conversão → Yield → Split → Notificação |
| **Fallback Automático** | Stellar → Solana quando fee > threshold |
| **Zero-Footprint** | Frames de câmera descartados, MACs hasheados |
