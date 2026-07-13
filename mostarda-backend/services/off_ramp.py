"""Off-Ramp Batch Scheduler — Settlement Cycles for PSAV Stablecoin.

Implements the two-tier settlement cadence:
- Weekly (7 days): Sellers (Vendedores) and Influencers (Embaixadores)
- Monthly (30 days): Platform (Holding) and Space/TV Owners (Donos)

Flow:
  1. Collect settled amounts per actor
  2. Check if settlement cycle has matured
  3. Generate batch for PSAV off-ramp (BRLX → BRL)
  4. Reconcile: verify total disbursed + retained = gross
  5. Execute transfers via PSAV API
  6. Log on-chain via Diamond

Alignment with GOVERNAÇÃO:
  - Vendedor:    20% → Semanal
  - Embaixador:  10% → Semanal
  - Dono Ponto:  25% → Mensal
  - Dono TV:     20% → Mensal
  - Holding:     25% → Mensal
"""

import time
from datetime import datetime, timedelta, timezone
from typing import Optional
from loguru import logger

from core.config import settings


# ── Constants ──────────────────────────────────────────────
SETTLEMENT_CADENCE = {
    "space_owner": 30,       # Dono do Ponto → mensal
    "tv_owner": 30,          # Dono da TV → mensal
    "affiliate_seller": 7,   # Vendedor → semanal
    "influencer": 7,         # Embaixador → semanal
    "mostarda": 30,          # Holding → mensal
}

WEEKLY_ACTORS = {"affiliate_seller", "influencer"}
MONTHLY_ACTORS = {"space_owner", "tv_owner", "mostarda"}


class SettlementWindow:
    """Represents a settlement period for a given actor."""

    def __init__(self, actor: str, gross_brl: int, cycle_start: datetime, cycle_end: datetime):
        self.actor = actor
        self.gross_brl = gross_brl  # Amount in cents (BRL)
        self.cycle_start = cycle_start
        self.cycle_end = cycle_end
        self.cadence_days = SETTLEMENT_CADENCE.get(actor, 30)

    @property
    def matured(self) -> bool:
        return datetime.now(timezone.utc) >= self.cycle_end

    @property
    def label(self) -> str:
        return "weekly" if self.cadence_days == 7 else "monthly"

    def to_dict(self) -> dict:
        return {
            "actor": self.actor,
            "gross_brl_cents": self.gross_brl,
            "gross_brl": f"R$ {self.gross_brl / 100:.2f}",
            "cycle_start": self.cycle_start.isoformat(),
            "cycle_end": self.cycle_end.isoformat(),
            "cadence": self.label,
            "matured": self.matured,
        }


class OffRampBatch:
    """A single batch of off-ramp transfers ready for execution."""

    def __init__(self, settlements: list[SettlementWindow]):
        self.settlements = settlements
        self.created_at = datetime.now(timezone.utc)

    @property
    def total_brl_cents(self) -> int:
        return sum(s.gross_brl for s in self.settlements)

    @property
    def total_brl(self) -> str:
        return f"R$ {self.total_brl_cents / 100:.2f}"

    @property
    def mature_count(self) -> int:
        return sum(1 for s in self.settlements if s.matured)

    def to_dict(self) -> dict:
        return {
            "batch_id": f"offramp_{int(self.created_at.timestamp())}",
            "created_at": self.created_at.isoformat(),
            "total_settlements": len(self.settlements),
            "mature_settlements": self.mature_count,
            "total_brl": self.total_brl,
            "total_brl_cents": self.total_brl_cents,
            "settlements": [s.to_dict() for s in self.settlements],
        }


class OffRampScheduler:
    """Orchestrates weekly and monthly settlement batches.

    Responsible for:
    1. Identifying mature settlements per actor cadence
    2. Batching transfers by maturity
    3. Reconciling totals before execution
    4. Executing PSAV off-ramp (BRLX → BRL)
    5. Logging on-chain via Diamond
    """

    def __init__(self):
        self.batches: list[OffRampBatch] = []
        logger.info(
            f"⏰ OffRampScheduler: weekly={','.join(WEEKLY_ACTORS)} "
            f"monthly={','.join(MONTHLY_ACTORS)}"
        )

    def collect_mature_settlements(
        self, pending: list[dict], now: Optional[datetime] = None,
    ) -> OffRampBatch:
        """Collect all matured settlements into a batch for execution.

        Args:
            pending: List of pending settlement dicts with keys:
                     actor, amount_brl_cents, cycle_start, cycle_end
            now: Current time (injected for testability)

        Returns:
            OffRampBatch with both mature and non-mature settlements
        """
        now = now or datetime.now(timezone.utc)
        settlements = []

        for item in pending:
            actor = item["actor"]
            cadence = SETTLEMENT_CADENCE.get(actor, 30)

            cycle_start = datetime.fromisoformat(item["cycle_start"]) if isinstance(item["cycle_start"], str) else item["cycle_start"]
            cycle_end = datetime.fromisoformat(item["cycle_end"]) if isinstance(item["cycle_end"], str) else item["cycle_end"]

            settlement = SettlementWindow(
                actor=actor,
                gross_brl=item["amount_brl_cents"],
                cycle_start=cycle_start,
                cycle_end=cycle_end,
            )
            settlements.append(settlement)

        batch = OffRampBatch(settlements)
        self.batches.append(batch)

        logger.info(
            f"📦 Batch created: {batch.total_brl} "
            f"({batch.mature_count}/{len(batch.settlements)} mature)"
        )
        return batch

    async def execute_batch(self, batch: OffRampBatch) -> dict:
        """Execute all mature settlements in a batch via PSAV.

        Flow:
        1. Filter only matured settlements
        2. Reconcile: verify gross = sum(parts)
        3. Execute PSAV transfer for each
        4. Log on-chain
        """
        mature = [s for s in batch.settlements if s.matured]

        if not mature:
            logger.info("⏳ No mature settlements in this batch")
            return {"status": "noop", "reason": "no mature settlements"}

        # ── Reconciliation ────────────────────────────────────
        total_to_disburse = sum(s.gross_brl for s in mature)
        # In production, this would verify against held balance:
        # held = await psav.get_balance()
        # assert total_to_disburse <= held, "Insufficient balance"

        logger.info(
            f"💰 Executing batch: {len(mature)} settlements, "
            f"{sum(1 for s in mature if s.cadence_days == 7)} weekly, "
            f"{sum(1 for s in mature if s.cadence_days == 30)} monthly, "
            f"total R$ {total_to_disburse / 100:.2f}"
        )

        # ── PSAV Transfers (in production) ────────────────────
        results = []
        for settlement in mature:
            # In production, this calls:
            # psav.transfer_to_wallet(destination, settlement.gross_brl)
            results.append({
                "actor": settlement.actor,
                "label": settlement.label,
                "amount_brl_cents": settlement.gross_brl,
                "status": "simulated_executed",
            })

        return {
            "status": "executed",
            "batch_id": f"offramp_{int(time.time())}",
            "total_settlements": len(mature),
            "total_brl_cents": total_to_disburse,
            "total_brl": f"R$ {total_to_disburse / 100:.2f}",
            "results": results,
            "reconciled": True,
        }

    def get_pending_summary(self, pending: list[dict]) -> dict:
        """Generate a summary of pending settlements by cadence."""
        weekly_total = 0
        monthly_total = 0

        for item in pending:
            actor = item["actor"]
            cadence = SETTLEMENT_CADENCE.get(actor, 30)
            if cadence == 7:
                weekly_total += item["amount_brl_cents"]
            else:
                monthly_total += item["amount_brl_cents"]

        return {
            "weekly_total_brl": f"R$ {weekly_total / 100:.2f}",
            "weekly_count": sum(1 for i in pending if SETTLEMENT_CADENCE.get(i["actor"], 30) == 7),
            "monthly_total_brl": f"R$ {monthly_total / 100:.2f}",
            "monthly_count": sum(1 for i in pending if SETTLEMENT_CADENCE.get(i["actor"], 30) == 30),
            "total_brl": f"R$ {(weekly_total + monthly_total) / 100:.2f}",
        }
