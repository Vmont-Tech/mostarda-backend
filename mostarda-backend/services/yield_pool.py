"""DeFi Yield Pool — Generate yield on stablecoin during settlement retention.

Funds are allocated to yield pools (Aave/Compound) between
collection and distribution to maximize capital efficiency.

Enforces YIELD_MIN_HOLD_HOURS before withdrawals are permitted.
"""

from datetime import datetime, timezone, timedelta
from loguru import logger
from core.config import settings


class YieldPosition:
    """A position in the yield pool with retention tracking."""

    def __init__(self, amount: int, asset: str, pool: str):
        self.amount = amount
        self.asset = asset
        self.pool = pool
        self.allocated_at = datetime.now(timezone.utc)
        self.yield_earned = 0

    @property
    def hours_held(self) -> float:
        return (datetime.now(timezone.utc) - self.allocated_at).total_seconds() / 3600

    @property
    def can_withdraw(self) -> bool:
        return self.hours_held >= settings.YIELD_MIN_HOLD_HOURS

    def to_dict(self) -> dict:
        return {
            "amount": self.amount,
            "asset": self.asset,
            "pool": f"{settings.YIELD_POOL_PROTOCOL}:{settings.YIELD_POOL_ADDRESS}",
            "allocated_at": self.allocated_at.isoformat(),
            "hours_held": round(self.hours_held, 1),
            "min_hold_hours": settings.YIELD_MIN_HOLD_HOURS,
            "can_withdraw": self.can_withdraw,
            "yield_earned": self.yield_earned,
        }


class YieldPoolService:
    """Manage stablecoin yield during settlement cycles.

    Enforces:
    - Minimum hold period before withdrawal (YIELD_MIN_HOLD_HOURS)
    - Yield estimation with eligibility check
    """

    def __init__(self):
        self.pool = settings.YIELD_POOL_ADDRESS
        self.protocol = settings.YIELD_POOL_PROTOCOL
        self._positions: dict[str, YieldPosition] = {}
        logger.info(
            f"🏦 YieldPool: {self.protocol} / {self.pool or 'not configured'}, "
            f"min_hold={settings.YIELD_MIN_HOLD_HOURS}h"
        )

    async def allocate(self, amount: int, asset: str = "BRLX") -> dict:
        """Allocate funds to yield pool.

        Creates a tracked position with retention timer.
        """
        position_id = f"pos_{datetime.now(timezone.utc).timestamp()}_{amount}"

        if not self.pool:
            logger.warning("No yield pool configured — holding in PSAV wallet")
            return {
                "status": "held",
                "amount": amount,
                "position_id": position_id,
                "yield_rate": 0,
                "note": "No pool configured — funds held in PSAV wallet",
            }

        position = YieldPosition(amount, asset, f"{self.protocol}:{self.pool}")
        self._positions[position_id] = position

        logger.info(
            f"🏦 Allocated {amount} {asset} to {self.protocol}:{self.pool} "
            f"(position={position_id}, min_hold={settings.YIELD_MIN_HOLD_HOURS}h)"
        )
        return {
            "status": "allocated",
            "amount": amount,
            "asset": asset,
            "position_id": position_id,
            "pool": f"{self.protocol}:{self.pool}",
            "estimated_apr": 8.5,
            "min_hold_hours": settings.YIELD_MIN_HOLD_HOURS,
            "allocated_at": position.allocated_at.isoformat(),
        }

    async def withdraw(self, amount: int, position_id: str) -> dict:
        """Withdraw from yield pool with enforcement of minimum hold.

        Raises:
            ValueError: If position is not mature (min hold not reached)
            KeyError: If position_id not found
        """
        position = self._positions.get(position_id)
        if not position:
            raise KeyError(f"Position not found: {position_id}")

        # ── Enforce minimum hold ─────────────────────────────
        if not position.can_withdraw:
            remaining = settings.YIELD_MIN_HOLD_HOURS - position.hours_held
            raise ValueError(
                f"Cannot withdraw yet. Position held for {position.hours_held:.1f}h, "
                f"minimum {settings.YIELD_MIN_HOLD_HOURS}h. "
                f"Wait {remaining:.1f}h more."
            )

        yield_earned = int(amount * 0.001)  # Simulated yield
        position.yield_earned += yield_earned
        del self._positions[position_id]

        logger.info(
            f"💳 Withdrawn {amount} from {position_id}, "
            f"yield earned: {yield_earned} ({position.hours_held:.1f}h held)"
        )
        return {
            "status": "withdrawn",
            "amount": amount,
            "yield_earned": yield_earned,
            "hours_held": round(position.hours_held, 1),
        }

    async def estimate_yield(self, amount: int, hours: int) -> dict:
        """Estimate yield for a potential allocation.

        Returns eligible=False if below minimum hold period — the caller
        should use this to warn users or adjust strategy.
        """
        if hours < settings.YIELD_MIN_HOLD_HOURS:
            return {
                "eligible": False,
                "reason": (
                    f"Below minimum hold period. "
                    f"Requested: {hours}h, minimum: {settings.YIELD_MIN_HOLD_HOURS}h"
                ),
                "estimated_yield": 0,
            }

        daily_rate = 0.00023  # ~8.5% APR
        estimated = int(amount * daily_rate * hours / 24)
        return {
            "eligible": True,
            "estimated_yield_cents": estimated,
            "estimated_yield_brl": f"R$ {estimated / 100:.2f}",
            "apr": 8.5,
            "annual_rate": daily_rate * 365,
        }

    async def get_positions(self) -> list[dict]:
        """List all active yield positions with maturity status."""
        return [
            pos.to_dict()
            for pos_id, pos in self._positions.items()
        ]
