"""Revenue split and distribution endpoints."""

from fastapi import APIRouter, Depends
from services.revenue import RevenueService, REVENUE_SPLIT

router = APIRouter()
svc = RevenueService()


@router.get("/split")
async def get_split():
    return {"splits": REVENUE_SPLIT, "total": sum(REVENUE_SPLIT.values()), "stacking_max": 0.50}


@router.post("/simulate")
async def simulate(gross_amount: int, actors: dict[str, str]):
    return svc.calculate_split(gross_amount, actors).to_dict()


@router.post("/distribute")
async def distribute(gross_amount: int, slot_id: str, actors: dict[str, str]):
    return await svc.distribute(gross_amount, slot_id, actors)
