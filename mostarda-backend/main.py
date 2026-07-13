"""
MOSTARDA Backend — FastAPI Application
Protocolo de Mídia pDOOH Descentralizado
Revenue Split: 25/25/20/20/10

Blockchain: Stellar (primary) → Solana (fallback)
Payments: PSAV Direct (BRLX stablecoin)
Governance: Elections every 6 months
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
    
    ## Revenue Split
    - Mostarda (Platform): 25%
    - Space Owner: 25%
    - TV Owner: 20%
    - Affiliate Seller: 20%
    - Influencer: 10%
    
    ## Blockchain
    - Primary: Stellar (anchor proof-of-play)
    - Fallback: Solana (auto-activation on congestion)
    
    ## Payments
    - PSAV Direct (BRLX stablecoin, no traditional gateways)
    - DeFi Yield Pools during settlement retention
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
            "mostarda": "25%",
            "space_owner": "25%",
            "tv_owner": "20%",
            "affiliate_seller": "20%",
            "influencer": "10%"
        },
        "blockchain": {
            "primary": "stellar",
            "fallback": "solana",
            "pattern": "EIP-2535 Diamond"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
