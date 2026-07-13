"""EIP-2535 Diamond Standard — Smart Contract Modular Orchestration.

Coordinates between Stellar (primary) and Solana (fallback) chains,
implementing the Diamond pattern with domain-specific facets.

Features:
- Real RPC health check with congestion detection
- DB-backed sequence numbers (survive restarts, support concurrent workers)
- Automatic fallback to Solana when Stellar fee > threshold
- Circuit breaker: prevents flapping between chains
- Re-sync queue: replays Solana PoPs to Stellar when recovered
- NO simulated transactions: raises ConfigurationError if chains not configured
"""

import time
import asyncio
from collections import deque
from typing import Optional
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from services.blockchain.stellar import StellarService, StellarNotConfigured
from services.blockchain.solana import SolanaService, SolanaNotConfigured
from services.sequence import SequenceService


# ── Constants ──────────────────────────────────────────────
FEE_THRESHOLD_XLM = 0.001
CIRCUIT_BREAKER_COOLDOWN = 300
MAX_REPLAY_BATCH = 50


class CircuitBreaker:
    """Prevents flapping between chains when Stellar is unstable."""

    def __init__(self, cooldown: int = CIRCUIT_BREAKER_COOLDOWN):
        self.cooldown = cooldown
        self.last_failure: float = 0.0
        self.consecutive_failures: int = 0
        self.state: str = "closed"

    def record_success(self):
        self.consecutive_failures = 0
        self.state = "closed"

    def record_failure(self):
        self.consecutive_failures += 1
        self.last_failure = time.time()
        if self.consecutive_failures >= 3:
            self.state = "open"
            logger.warning("⛔ Circuit breaker OPEN — Stellar unavailable")

    def is_open(self) -> bool:
        if self.state == "open":
            elapsed = time.time() - self.last_failure
            if elapsed >= self.cooldown:
                self.state = "half-open"
                logger.info("🔄 Circuit breaker HALF-OPEN — retrying Stellar")
                return False
            return True
        return False


class ReplayQueue:
    """Queue of PoPs recorded on Solana waiting to be replayed to Stellar."""

    def __init__(self):
        self._queue: deque[dict] = deque(maxlen=10_000)

    def push(self, pop_data: dict):
        pop_data["_queued_at"] = time.time()
        self._queue.append(pop_data)
        logger.debug(f"📦 ReplayQueue: {len(self._queue)} pending")

    def drain(self, max_items: int = MAX_REPLAY_BATCH) -> list[dict]:
        batch = []
        for _ in range(min(max_items, len(self._queue))):
            batch.append(self._queue.popleft())
        return batch

    @property
    def pending(self) -> int:
        return len(self._queue)


class DiamondStandard:
    """Diamond EIP-2535 orchestrator — routing between chains.

    Primary → Stellar (low fees, predictable)
    Fallback → Solana (when Stellar congested or down)
    Replay → When Stellar recovers, batched PoPs are replayed

    Sequence numbers are DB-backed via SequenceService, surviving
    server restarts and supporting concurrent async workers.
    """

    def __init__(self):
        self.stellar = StellarService()
        self.solana = SolanaService()
        self.sequence_service = SequenceService()
        self.circuit_breaker = CircuitBreaker()
        self.replay_queue = ReplayQueue()
        self._replay_task: Optional[asyncio.Task] = None

    async def execute_proof_of_play(self, data: dict, db: AsyncSession) -> dict:
        """Record PoP via Diamond: try Stellar, fallback to Solana.

        Args:
            data: dict with tv_id, slot_id, campaign_id, audience, ts
            db: AsyncSession for persistent sequence generation

        Returns:
            dict with chain, sequence, fallback, tx_hash
        """
        seq = await self.sequence_service.next_pop_sequence(db)

        tv_id = data["tv_id"]
        slot_id = data["slot_id"]
        campaign_id = data["campaign_id"]
        audience = data.get("audience", 0)
        ts = data.get("ts", int(time.time()))

        # Check circuit breaker first
        if self.circuit_breaker.is_open():
            logger.warning(f"⛔ Circuit open — routing PoP seq={seq} to Solana")
            result = await self.solana.record_fallback(
                tv_id, slot_id, campaign_id, audience, ts, sequence=seq,
            )
            self.replay_queue.push({
                "tv_id": tv_id, "slot_id": slot_id,
                "campaign_id": campaign_id, "audience": audience,
                "ts": ts, "sequence": seq,
            })
            result["fallback"] = True
            result["sequence"] = seq
            result["replay_pending"] = self.replay_queue.pending
            return result

        # Try Stellar with real health check
        try:
            health = await self.stellar.health()
        except StellarNotConfigured as e:
            logger.warning(f"⚠️ {e} — routing to Solana")
            return await self._fallback(tv_id, slot_id, campaign_id, audience, ts, seq, str(e))

        is_congested = health.get("base_fee", 0) > FEE_THRESHOLD_XLM
        is_down = health.get("status") != "healthy"

        if is_congested or is_down:
            reason = "congested" if is_congested else health.get("status", "unreachable")
            logger.warning(f"⚠️ Stellar {reason} — routing PoP seq={seq} to Solana")
            if is_down:
                self.circuit_breaker.record_failure()
            return await self._fallback(tv_id, slot_id, campaign_id, audience, ts, seq, reason)

        # Record on Stellar (primary chain)
        try:
            result = await self.stellar.record_proof_of_play(
                tv_id, slot_id, campaign_id, audience, ts, sequence=seq,
            )
            self.circuit_breaker.record_success()
            result["fallback"] = False
            result["sequence"] = seq
            result["replay_pending"] = self.replay_queue.pending

            logger.info(
                f"💎 Diamond: seq={seq} chain=stellar "
                f"tx={result.get('tx_hash', '')[:16]}..."
            )
            return result

        except (StellarNotConfigured, Exception) as e:
            logger.error(f"❌ Stellar error: {e} — routing to Solana")
            self.circuit_breaker.record_failure()
            return await self._fallback(tv_id, slot_id, campaign_id, audience, ts, seq, str(e))

    async def _fallback(self, tv_id, slot_id, campaign_id, audience, ts, seq, reason):
        try:
            result = await self.solana.record_fallback(
                tv_id, slot_id, campaign_id, audience, ts, sequence=seq,
            )
        except SolanaNotConfigured as e:
            logger.critical(f"❌ No blockchain available: {e}")
            raise

        self.replay_queue.push({
            "tv_id": tv_id, "slot_id": slot_id,
            "campaign_id": campaign_id, "audience": audience,
            "ts": ts, "sequence": seq,
        })
        result["fallback"] = True
        result["sequence"] = seq
        result["fallback_reason"] = reason
        result["replay_pending"] = self.replay_queue.pending

        logger.info(
            f"💎 Diamond: seq={seq} chain=solana fallback={reason} "
            f"replay_pending={self.replay_queue.pending}"
        )
        return result

    async def sync_replay_queue(self, db: AsyncSession) -> dict:
        """Replay queued PoPs from Solana back to Stellar."""
        if self.circuit_breaker.is_open():
            return {"status": "skipped", "reason": "circuit_open"}

        replayed = 0
        failed = 0
        batch = self.replay_queue.drain()

        for pop in batch:
            try:
                await self.stellar.record_proof_of_play(
                    pop["tv_id"], pop["slot_id"], pop["campaign_id"],
                    pop["audience"], pop["ts"], pop["sequence"],
                )
                replayed += 1
            except Exception as e:
                logger.error(f"❌ Replay failed seq={pop['sequence']}: {e}")
                self.replay_queue.push(pop)
                self.circuit_breaker.record_failure()
                failed += 1
                break

        return {
            "status": "completed",
            "replayed": replayed,
            "failed": failed,
            "remaining": self.replay_queue.pending,
        }
