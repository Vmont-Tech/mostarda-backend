"""Wallet management endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import get_current_user
from models.wallet import Wallet, Transaction

router = APIRouter()


@router.get("/")
async def get_wallet(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wallet).where(Wallet.user_id == user["sub"]))
    w = result.scalar_one_or_none()
    if not w:
        w = Wallet(user_id=user["sub"])
        db.add(w)
        await db.commit()
        await db.refresh(w)
    return w


@router.get("/transactions")
async def transactions(limit: int = 20, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    w = await db.execute(select(Wallet).where(Wallet.user_id == user["sub"]))
    w = w.scalar_one_or_none()
    if not w:
        return []
    result = await db.execute(
        select(Transaction).where(Transaction.wallet_id == w.id)
        .order_by(Transaction.created_at.desc()).limit(limit)
    )
    return result.scalars().all()
