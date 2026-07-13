"""Election endpoints — 6-month ambassador governance cycles."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.election import Election, ElectionCandidate

router = APIRouter()


@router.get("/")
async def list_elections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Election).order_by(Election.created_at.desc()))
    return result.scalars().all()


@router.get("/tv/{tv_id}")
async def by_tv(tv_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Election).where(Election.tv_id == tv_id).order_by(Election.cycle_number.desc())
    )
    return result.scalars().all()


@router.get("/{election_id}/results")
async def results(election_id: str, db: AsyncSession = Depends(get_db)):
    election = await db.execute(select(Election).where(Election.id == election_id))
    e = election.scalar_one_or_none()
    if not e:
        raise HTTPException(404, "Election not found")
    candidates = await db.execute(
        select(ElectionCandidate).where(ElectionCandidate.election_id == election_id)
    )
    return {
        "election": e,
        "candidates": [
            {"id": str(c.id), "user_id": str(c.user_id),
             "votes": c.vote_count, "weighted": c.weighted_score,
             "winner": c.is_winner}
            for c in candidates.scalars().all()
        ],
    }
