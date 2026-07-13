"""
MOSTARDA Backend — FastAPI Application
Protocolo de Mídia pDOOH Descentralizado

Revenue Split (5 atores):
  Dono do Ponto:       25% → Mensal
  Dono da TV:          20% → Mensal
  Vendedor:            20% → Semanal
  Embaixador:          10% → Semanal
  Mostarda (Holding):  25% → Mensal
                      ─────
  Total:              100%

Blockchain:
  Primária: Stellar (ancoragem proof-of-play, fee baixo e previsível)
  Fallback:  Solana (auto-ativação se fee Stellar > threshold)
  Padrão:    EIP-2535 Diamond (circuit breaker + replay queue)

Pagamentos:
  PSAV Direct (BRLX stablecoin → sem gateways tradicionais)
  DeFi Yield Pools durante retenção (24h mínimas)
  Off-ramp: lotes semanais (vendedores/embaixadores) e mensais (donos/holding)

Stacking:
  Máximo 50% por usuário (TV + Venda + Embaixador)
  Reconciliação contábil em toda distribuição
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from core.config import settings
from core.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 MOSTARDA Backend starting...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database ready")
    yield
    logger.info("🛑 Shutting down...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    MOSTARDA — Protocolo de Mídia pDOOH Descentralizado
    
    ## Revenue Split (5 Atores)
    | Ator | % | Cadência |
    |------|---|----------|
    | Dono do Ponto | 25% | Mensal |
    | Dono da TV | 20% | Mensal |
    | Vendedor | 20% | Semanal |
    | Embaixador | 10% | Semanal |
    | Mostarda (Holding) | 25% | Mensal |
    | **Total** | **100%** | — |
    
    Stacking máximo por usuário: 50% (TV + Venda + Embaixador)
    Reconciliação contábil: centavos retidos ≤ 2, absorvidos no primeiro split
    
    ## Blockchain
    - Primária: Stellar (ancoragem proof-of-play)
    - Fallback: Solana (auto-ativação se fee Stellar > threshold)
    - Circuit breaker: evita flapping entre chains (300s cooldown)
    - Replay queue: PoPs registrados na Solana são reenviados à Stellar quando recupera
    
    ## Pagamentos
    - PSAV Direct (BRLX stablecoin, sem gateways tradicionais)
    - DeFi Yield Pools durante retenção
    - Off-ramp: lotes semanais (vendedores/embaixadores) e mensais (donos/holding)
    """,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "revenue_split": {
            "dono_do_ponto": "25% (mensal)",
            "dono_da_tv": "20% (mensal)",
            "vendedor": "20% (semanal)",
            "embaixador": "10% (semanal)",
            "mostarda_holding": "25% (mensal)",
        },
        "stacking_cap": "50% (TV + Venda + Embaixador)",
        "blockchain": {
            "primaria": "stellar",
            "fallback": "solana",
            "padrao": "EIP-2535 Diamond",
            "circuit_breaker": "300s cooldown",
            "fee_threshold_xlm": 0.001,
        },
        "off_ramp": {
            "semanal": "vendedores + embaixadores (30%)",
            "mensal": "donos + holding (70%)",
        },
        "zero_footprint": True,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
