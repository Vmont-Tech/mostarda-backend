"""Notification service — internal push notification engine.

Architecture:
  1. Notification.create() → persists to PostgreSQL
  2. NotificationService.broadcast() → pushes to SSE queue
  3. SSE endpoint /api/v1/notifications/stream → delivers to connected clients
  4. Client receives event → updates UI in real-time

Trigger points (integrated with existing services):
  - RevenueService.distribute() → revenue_split notification
  - CampaignService → campaign_status notification
  - ElectionService → election notification
  - PSAVService → payment notification
  - Heartbeat watcher → hardware/system notification

Storage: Notifications are persisted in PostgreSQL for history.
Delivery: SSE for real-time, REST for poll fallback.
"""

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional
from loguru import logger

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification, NotificationType, NotificationPriority


# ── SSE Event Bus ────────────────────────────────────
# Maps user_id → list of asyncio.Queue for active SSE connections

_sse_queues: dict[str, list[asyncio.Queue]] = defaultdict(list)


class NotificationService:
    """Create, list, and deliver notifications via SSE.

    Thread-safe: uses asyncio.Queue per connected client.
    Persisted: all notifications saved to PostgreSQL.
    """

    # ── Creation ──────────────────────────────────────

    async def create(
        self,
        db: AsyncSession,
        user_id: str,
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> Notification:
        """Create a notification, persist it, and broadcast via SSE."""
        notification = Notification(
            user_id=user_id,
            type=type,
            priority=priority,
            title=title,
            message=message,
            reference_type=reference_type,
            reference_id=reference_id,
            payload=payload or {},
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        # Broadcast to SSE clients
        await self._broadcast(user_id, notification.to_dict())

        logger.info(f"🔔 Notification: user={user_id[:8]} type={type.value} title={title[:40]}")
        return notification

    async def create_broadcast(
        self,
        db: AsyncSession,
        user_ids: list[str],
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> list[Notification]:
        """Create the same notification for multiple users (e.g., election start)."""
        notifications = []
        for uid in user_ids:
            n = await self.create(
                db, uid, type, title, message,
                priority, reference_type, reference_id, payload,
            )
            notifications.append(n)
        return notifications

    # ── Querying ──────────────────────────────────────

    async def list_notifications(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
    ) -> dict:
        """List notifications for a user with pagination."""
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(Notification.is_read == False)
            count_query = count_query.where(Notification.is_read == False)

        total = (await db.execute(count_query)).scalar() or 0
        unread_count = (
            await db.execute(
                select(func.count(Notification.id))
                .where(Notification.user_id == user_id, Notification.is_read == False)
            )
        ).scalar() or 0

        result = await db.execute(
            query.order_by(Notification.created_at.desc())
            .offset(offset).limit(limit)
        )
        items = [n.to_dict() for n in result.scalars().all()]

        return {
            "items": items,
            "total": total,
            "unread_count": unread_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        }

    async def unread_count(self, db: AsyncSession, user_id: str) -> int:
        """Get unread notification count for bell badge."""
        result = await db.execute(
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id, Notification.is_read == False)
        )
        return result.scalar() or 0

    # ── Mutation ──────────────────────────────────────

    async def mark_read(self, db: AsyncSession, notification_id: str, user_id: str) -> bool:
        """Mark a single notification as read."""
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        result = await db.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .values(is_read=True, read_at=now)
        )
        await db.commit()
        return result.rowcount > 0

    async def mark_all_read(self, db: AsyncSession, user_id: str) -> int:
        """Mark all notifications as read for a user. Returns count."""
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        result = await db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True, read_at=now)
        )
        await db.commit()
        return result.rowcount

    # ── SSE Delivery ──────────────────────────────────

    def subscribe(self, user_id: str) -> asyncio.Queue:
        """Create an SSE queue for a user connection."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        _sse_queues[user_id].append(queue)
        logger.debug(f"📡 SSE subscribed: user={user_id[:8]} (total: {len(_sse_queues[user_id])})")
        return queue

    def unsubscribe(self, user_id: str, queue: asyncio.Queue):
        """Remove an SSE queue on client disconnect."""
        if user_id in _sse_queues:
            _sse_queues[user_id] = [q for q in _sse_queues[user_id] if q is not queue]
            if not _sse_queues[user_id]:
                del _sse_queues[user_id]
        logger.debug(f"📡 SSE unsubscribed: user={user_id[:8]}")

    async def _broadcast(self, user_id: str, data: dict):
        """Push notification data to all SSE queues for a user."""
        if user_id not in _sse_queues:
            return
        event = f"data: {json.dumps(data, default=str)}\n\n"
        dead = []
        for queue in _sse_queues[user_id]:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(queue)
        for q in dead:
            self.unsubscribe(user_id, q)


# Singleton
_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
