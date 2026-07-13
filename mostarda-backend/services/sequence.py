"""DB-backed sequence generator for cross-chain PoP ordering.

Uses PoPCounter model (PostgreSQL) with SELECT ... FOR UPDATE for
atomic increments. Survives server restarts and supports multiple
workers via row-level locking.

Architecture Decision:
  - NOT in-memory: in-memory counters reset on restart, corrupting ordering
  - NOT Redis: avoids external dependency for a simple counter
  - NOT MAX(id)+1: race conditions under concurrent inserts
  - PoPCounter with FOR UPDATE: correct, atomic, survives restarts
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.analytics import PoPCounter


class SequenceService:
    """Persistent atomic sequence generator.

    Usage:
        seq = SequenceService()
        next_n = await seq.next_pop_sequence(db)
    """

    async def next_pop_sequence(self, db: AsyncSession) -> int:
        """Atomically get the next Proof of Play sequence number.

        Locks the single counter row (id=1) for the duration of the
        transaction. Safe under concurrent async workers.
        """
        result = await db.execute(
            select(PoPCounter).where(PoPCounter.id == 1).with_for_update()
        )
        counter = result.scalar_one_or_none()

        if counter is None:
            # First call ever — create the counter row starting at 1
            counter = PoPCounter(id=1, counter=1)
            db.add(counter)
        else:
            counter.counter += 1

        await db.flush()
        return counter.counter

    async def peek(self, db: AsyncSession) -> int:
        """Read current sequence without incrementing (no lock)."""
        result = await db.execute(select(PoPCounter.counter).where(PoPCounter.id == 1))
        val = result.scalar()
        return val or 0
