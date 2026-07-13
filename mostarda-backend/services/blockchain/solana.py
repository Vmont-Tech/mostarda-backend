"""Solana Network — Fallback Blockchain Layer.

Auto-activated when Stellar is congested (fee > threshold).
Provides redundancy for proof-of-play and revenue recording.
"""

from loguru import logger
from core.config import settings


class SolanaService:
    """Solana fallback operations when Stellar is congested."""

    def __init__(self):
        self.rpc = settings.SOLANA_RPC_URL
        self.program = settings.SOLANA_PROGRAM_ID
        logger.info(f"🌐 Solana fallback: {self.rpc}")

    async def health(self) -> dict:
        return {"network": "solana", "status": "simulated"}

    async def record_fallback(self, tv_id: str, slot_id: str, campaign_id: str, audience: int, ts: int) -> dict:
        """Record Proof of Play on Solana (activated when Stellar is congested)."""
        logger.warning(f"⚠️ Solana fallback: TV={tv_id} Slot={slot_id}")
        return {
            "blockchain": "solana",
            "status": "simulated",
            "reason": "Stellar congestion fallback",
        }
