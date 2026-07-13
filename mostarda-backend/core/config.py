"""Centralized configuration from environment variables.

Todos os settings documentados e com defaults seguros.

SECURITY (B1 fix):
- If DEBUG=False and SECRET_KEY is the default string, raises RuntimeError
  at import time, preventing accidental production deployment with weak keys
"""

from pydantic_settings import BaseSettings
from typing import Optional


_DEFAULT_SECRET_KEY = "change-me-to-random-32-char-min"


class Settings(BaseSettings):
    # ── App ─────────────────────────────────────────────────
    APP_NAME: str = "mostarda-backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
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
    SETTLEMENT_WEEKLY_DAYS: int = 7
    SETTLEMENT_MONTHLY_DAYS: int = 30

    # ── Blockchain ──────────────────────────────────────────
    BLOCKCHAIN_FEE_THRESHOLD_XLM: float = 0.001
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

    # ── Rate Limiting ───────────────────────────────────────
    RATE_LIMIT_WINDOW: int = 60
    RATE_LIMIT_MAX_ATTEMPTS: int = 10

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()


# ── SECURITY GUARD (B1 fix) ───────────────────────────
# If deploying to production without changing SECRET_KEY,
# the system refuses to boot. This prevents the #1 cause
# of JWT forgery in FastAPI applications.
if not settings.DEBUG and settings.SECRET_KEY == _DEFAULT_SECRET_KEY:
    raise RuntimeError(
        "🚨 SECURITY: SECRET_KEY is still the default value "
        "('change-me-to-random-32-char-min'). This is INSECURE for production. "
        "Generate a strong random key:\n"
        "  python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
        "Then set SECRET_KEY in .env or environment variables."
    )
