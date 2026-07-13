"""Stellar Network — Primary Blockchain Layer.

Records proof-of-play, revenue splits, and election votes
with Stellar's low-cost, predictable fee architecture.

Health checks include:
- RPC endpoint liveness (horizon status)
- Network congestion (base fee vs threshold)
- Latest ledger sequence (for ordering)

Fallback to Solana when:
- Horizon is unreachable
- Base fee > FEE_THRESHOLD_XLM
- 3+ consecutive failures (circuit breaker opens)
"""

from typing import Optional
from loguru import logger
from core.config import settings


FEE_THRESHOLD_XLM = 0.001  # Max base fee in XLM before triggering fallback


class StellarService:
    """Stellar network operations for Proof of Play and revenue distribution."""

    def __init__(self):
        self.horizon = settings.STELLAR_HORIZON_URL
        self.network = settings.STELLAR_NETWORK_PASSPHRASE
        self.seed = settings.STELLAR_DISTRIBUTION_SEED
        self.asset = settings.STELLAR_ASSET_CODE
        logger.info(f"🌐 Stellar: {self.horizon}")

    async def health(self) -> dict:
        """Check Stellar network status and congestion in real time.

        Returns:
            dict with keys:
            - status: "healthy" | "degraded" | "unreachable"
            - base_fee: current base fee in XLM (0.0 if unknown)
            - latest_ledger: latest synced ledger (0 if unknown)
            - note: human-readable diagnostic
        """
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.horizon}/")
                data = resp.json()

                # Extract core health metrics from Stellar Horizon
                core_version = data.get("core_version", "unknown")
                latest_ledger = data.get("history_latest_ledger", 0)

                # Base fee: Horizon reports it in stroops (1 XLM = 10^7 stroops)
                # Default Stellar base fee is 100 stroops = 0.00001 XLM
                base_fee_stroops = data.get(
                    "base_fee", data.get("fee_stats", {}).get("fee_charged", {}).get("max", 100)
                )
                base_fee_xlm = base_fee_stroops / 10_000_000

                # Determine health status
                if latest_ledger == 0 or "core_version" not in data:
                    return {
                        "status": "degraded",
                        "base_fee": base_fee_xlm,
                        "latest_ledger": latest_ledger,
                        "note": f"Horizon responding but incomplete data: {core_version}",
                    }

                if base_fee_xlm > FEE_THRESHOLD_XLM:
                    logger.warning(
                        f"⚠️ Stellar congested: base_fee={base_fee_xlm:.6f} XLM "
                        f"(threshold={FEE_THRESHOLD_XLM})"
                    )
                    return {
                        "status": "congested",
                        "base_fee": base_fee_xlm,
                        "latest_ledger": latest_ledger,
                        "note": f"Base fee {base_fee_xlm:.6f} XLM exceeds threshold",
                    }

                return {
                    "status": "healthy",
                    "base_fee": base_fee_xlm,
                    "latest_ledger": latest_ledger,
                    "note": f"Horizon {core_version}, ledger {latest_ledger}",
                }

        except ImportError:
            logger.warning("httpx not installed — using simulated health")
            return {
                "status": "healthy",
                "base_fee": 0.00001,
                "latest_ledger": 0,
                "note": "Simulated — install httpx for real health check",
            }
        except Exception as e:
            logger.error(f"❌ Stellar health check failed: {e}")
            return {
                "status": "unreachable",
                "base_fee": 0.0,
                "latest_ledger": 0,
                "note": f"Horizon unreachable: {str(e)[:60]}",
            }

    async def record_proof_of_play(
        self, tv_id: str, slot_id: str, campaign_id: str,
        audience: int, ts: int, sequence: int = 0,
    ) -> dict:
        """Record immutable Proof of Play on Stellar.

        In production: uses stellar-sdk TransactionBuilder with
        memo containing POP metadata. Minimal XLM payment records
        the memo on-chain.

        Args:
            sequence: Global sequence number from Diamond orchestrator
                      for cross-chain ordering guarantee
        """
        logger.info(
            f"📝 PoP: seq={sequence} TV={tv_id} Slot={slot_id} "
            f"Campaign={campaign_id} Audience={audience}"
        )
        return {
            "blockchain": "stellar",
            "status": "simulated",
            "tx_hash": f"sim_tx_{slot_id[:8]}_{ts}",
            "sequence": sequence,
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
