"""Election Service — 6-Month Governance Cycles for Ambassador Selection.

Voters: TV Owner, Space Owner, Affiliate Seller
Vote Weight = base_role_weight × audience_multiplier
"""

from loguru import logger

VOTE_WEIGHTS = {"tv_owner": 1.0, "space_owner": 1.2, "affiliate_seller": 0.8}
AUDIENCE_MULT = {"low": 1.0, "medium": 1.25, "high": 1.5}


class ElectionService:
    """Ambassador election lifecycle and vote weighting."""

    def calculate_weight(self, voter_role: str, avg_audience: int | None = None) -> float:
        base = VOTE_WEIGHTS.get(voter_role, 1.0)
        if avg_audience is None:
            return base
        mult = AUDIENCE_MULT["high"] if avg_audience > 500 else AUDIENCE_MULT["medium"] if avg_audience > 100 else AUDIENCE_MULT["low"]
        return base * mult

    def determine_winner(self, candidates: list[dict]) -> dict:
        if not candidates:
            raise ValueError("No candidates")
        return max(candidates, key=lambda c: c.get("weighted_score", 0))

    def cycle_dates(self, cycle: int) -> dict:
        import time
        now = int(time.time() * 1000)
        cycle_ms = 182 * 24 * 60 * 60 * 1000
        return {"start": now, "end": now + cycle_ms, "cycle": cycle}

    def tally(self, votes: list[dict], audience: dict | None = None) -> float:
        score = sum(v.get("weight", 1.0) for v in votes)
        if audience and audience.get("avg_devices", 0) > 500:
            score *= AUDIENCE_MULT["high"]
        return score
