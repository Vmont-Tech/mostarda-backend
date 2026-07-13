"""Wallet management endpoints with cursor-based pagination.

FEATURES:
- Auto-creates wallet on first access (no pre-registration needed)
- Transactions list with offset/limit pagination (B3 fix)
- Pagination metadata in response for client-side navigation
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from core.database import get_db
from core.security import get_current_user
from models.wallet import Wallet, Transaction

router = APIRouter()


@router.get("/")
async def get_wallet(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's wallet. Auto-creates if it doesn't exist."""
    result = await db.execute(select(Wallet).where(Wallet.user_id == user["sub"]))
    w = result.scalar_one_or_none()
    if not w:
        w = Wallet(user_id=user["sub"])
        db.add(w)
        await db.commit()
        await db.refresh(w)
    return w


@router.get("/transactions")
async def transactions(
    limit: int = Query(default=20, ge=1, le=100, description="Max items per page"),
    offset: int = Query(default=0, ge=0, description="Number of items to skip"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List wallet transactions with offset/limit pagination (B3 fix).

    Returns:
    - items: list of transactions
    - total: total number of transactions (for client-side pagination)
    - limit: requested page size
    - offset: requested offset
    - has_more: whether more items exist beyond this page
    """
    w = await db.execute(select(Wallet).where(Wallet.user_id == user["sub"]))
    w = w.scalar_one_or_none()
    if not w:
        return {"items": [], "total": 0, "limit": limit, "offset": offset, "has_more": False}

    # Get total count for pagination metadata
    count_result = await db.execute(
        select(func.count(Transaction.id)).where(Transaction.wallet_id == w.id)
    )
    total = count_result.scalar() or 0

    # Get paginated items
    result = await db.execute(
        select(Transaction)
        .where(Transaction.wallet_id == w.id)
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }
