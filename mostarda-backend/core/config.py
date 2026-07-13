"""Centralized configuration from environment variables.

Todos os settings documentados e com defaults seguros.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── App ─────────────────────────────────────────────────
    APP_NAME: str = "mostarda-backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-to-random-32-char-min"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mostarda"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/mostarda"

    # ── PSAV (Depix / Mercado Bitcoin / Liqi) ───────────────
    PSAV_PROVIDER: str = "depix"
    PSAV_API_KEY: str = ""
    PSAV_API_SECRET: str = ""
    PSAV_WEBHOOK_SECRET: str = ""
    PSAV_STABLECOIN: str = "BRLX"

    # ── Settlement Cycles ───────────────────────────────────
    # Off-ramp: weekly (7 days) for sellers/influencers
    #           monthly (30 days) for space owners/tv owners/platform
    SETTLEMENT_WEEKLY_DAYS: int = 7
    SETTLEMENT_MONTHLY_DAYS: int = 30

    # ── Blockchain Fee Threshold ────────────────────────────
    # Max fee in XLM before triggering Solana fallback
    BLOCKCHAIN_FEE_THRESHOLD_XLM: float = 0.001
    # Circuit breaker cooldown in seconds before retrying Stellar
    BLOCKCHAIN_CIRCUIT_COOLDOWN_SECONDS: int = 300

    # ── Stellar (Primary) ───────────────────────────────────
    STELLAR_HORIZON_URL: str = "https://horizon-testnet.stellar.org"
    STELLAR_NETWORK_PASSPHRASE: str = "Test SDF Network ; September 2015"
    STELLAR_DISTRIBUTION_SEED: Optional[str] = None
    STELLAR_ASSET_CODE: str = "BRLX"

    # ── Solana (Fallback) ───────────────────────────────────
    SOLANA_RPC_URL: str = "https://api.devnet.solana.com"
    SOLANA_PROGRAM_ID: Optional[str] = None
    SOLANA_FALLBACK_WALLET: Optional[str] = None

    # ── DeFi Yield ──────────────────────────────────────────
    YIELD_POOL_ADDRESS: Optional[str] = None
    YIELD_POOL_PROTOCOL: str = "aave"
    YIELD_MIN_HOLD_HOURS: int = 24

    # ── Telemetry ───────────────────────────────────────────
    AUDIENCE_CONFIDENCE_THRESHOLD: float = 0.5
    PROXIMITY_RSSI_THRESHOLD: int = -70

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
