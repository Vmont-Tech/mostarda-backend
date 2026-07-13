"""Stellar Network — Primary Blockchain Layer.

Records proof-of-play, revenue splits, and election votes
with Stellar's low-cost, predictable fee architecture.

Fallback to Solana when Stellar is congested.
"""

from loguru import logger
from core.config import settings


class StellarService:
    """Stellar network operations for Proof of Play and revenue distribution."""

    def __init__(self):
        self.horizon = settings.STELLAR_HORIZON_URL
        self.network = settings.STELLAR_NETWORK_PASSPHRASE
        self.seed = settings.STELLAR_DISTRIBUTION_SEED
        self.asset = settings.STELLAR_ASSET_CODE
        logger.info(f"🌐 Stellar: {self.horizon}")

    async def health(self) -> dict:
        """Check Stellar network status and congestion."""
        return {
            "network": "stellar",
            "status": "simulated",
            "note": "Integrate stellar-sdk on production machine",
        }

    async def record_proof_of_play(self, tv_id: str, slot_id: str, campaign_id: str, audience: int, ts: int) -> dict:
        """Record immutable Proof of Play on Stellar.

        In production: uses stellar-sdk TransactionBuilder with
        memo containing POP metadata. Minimal XLM payment records
        the memo on-chain.
        """
        logger.info(f"📝 PoP: TV={tv_id} Slot={slot_id} Campaign={campaign_id}")
        return {
            "blockchain": "stellar",
            "status": "simulated",
            "tx_hash": f"sim_tx_{slot_id[:8]}_{ts}",
        }

    async def distribute(self, recipients: list[dict]) -> list[dict]:
        """Distribute revenue to multiple Stellar accounts."""
        results = []
        for r in recipients:
            results.append({
                "address": r["address"][:10] + "...",
                "amount": r["amount"],
                "status": "simulated_confirmed",
            })
        return results
