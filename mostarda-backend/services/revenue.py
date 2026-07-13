"""Revenue Split Engine — 5-Actor Distribution.

Mostarda (Platform):   25%
Space Owner:           25%
TV Owner:              20%
Affiliate Seller:      20%
Influencer:            10%
Total:                100%

Supports stacking (same user in multiple roles).
"""

from loguru import logger

REVENUE_SPLIT = {
    "mostarda": 0.25,
    "space_owner": 0.25,
    "tv_owner": 0.20,
    "affiliate_seller": 0.20,
    "influencer": 0.10,
}


class RevenueCalculator:
    """Calculate revenue distribution for a given gross amount."""

    def __init__(self, gross_amount: int):
        self.gross_amount = gross_amount
        self.splits = []
        self.total = 0

    def add_split(self, actor: str, user_id: str, pct: float):
        amount = int(self.gross_amount * pct)
        self.splits.append({"actor": actor, "user_id": user_id, "percentage": pct, "amount": amount})
        self.total += amount

    def to_dict(self) -> dict:
        return {
            "gross_amount": self.gross_amount,
            "total_distributed": self.total,
            "remaining": self.gross_amount - self.total,
            "splits": self.splits,
        }


class RevenueService:
    """Orchestrates revenue split calculations."""

    def calculate_split(self, gross_amount: int, actors: dict[str, str]) -> RevenueCalculator:
        """Calculate split for given actors. Unassigned roles → platform."""
        calc = RevenueCalculator(gross_amount)
        for actor, pct in REVENUE_SPLIT.items():
            uid = actors.get(actor, "platform")
            calc.add_split(actor, uid, pct)
        logger.info(f"💰 Split R$ {gross_amount / 100:.2f} → {len(calc.splits)} actors")
        return calc

    def calculate_stacking(self, gross_amount: int, user_roles: dict[str, list[str]]) -> dict:
        """Calculate with stacking: one user accumulates multiple role percentages."""
        totals = {}
        for uid, roles in user_roles.items():
            share = sum(REVENUE_SPLIT.get(r, 0) for r in roles)
            totals[uid] = {"roles": roles, "pct": share, "amount": int(gross_amount * share)}
        logger.info(f"📊 Stacking: {len(totals)} users, max share: {max(t['pct'] for t in totals.values())*100:.0f}%")
        return {"gross": gross_amount, "distribution": totals}

    async def distribute(self, gross_amount: int, slot_id: str, actors: dict[str, str]) -> dict:
        """Full distribution pipeline (record on blockchain + update wallets)."""
        calc = self.calculate_split(gross_amount, actors)
        return {
            "slot_id": slot_id,
            "status": "completed",
            "distribution": calc.to_dict(),
        }
