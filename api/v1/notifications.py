"""Notification API endpoints — internal push notifications.

Endpoints:
  GET    /notifications          — List with pagination
  GET    /notifications/unread   — Unread count (for bell badge)
  POST   /notifications/{id}/read — Mark single as read
  POST   /notifications/read-all — Mark all as read
  GET    /notifications/stream   — SSE real-time stream
"""

import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.security import get_current_user
from services.notification import NotificationService, get_notification_service

router = APIRouter()


@router.get("/")
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    svc: NotificationService = Depends(get_notification_service),
):
    """List notifications with pagination and optional unread filter."""
    return await svc.list_notifications(
        db, user["sub"], limit=limit, offset=offset, unread_only=unread_only,
    )


@router.get("/unread")
async def unread_count(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    svc: NotificationService = Depends(get_notification_service),
):
    """Get unread notification count for the bell badge."""
    count = await svc.unread_count(db, user["sub"])
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    svc: NotificationService = Depends(get_notification_service),
):
    """Mark a single notification as read."""
    ok = await svc.mark_read(db, notification_id, user["sub"])
    if not ok:
        raise HTTPException(404, "Notification not found")
    return {"status": "read"}


@router.post("/read-all")
async def mark_all_read(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    svc: NotificationService = Depends(get_notification_service),
):
    """Mark all notifications as read for the current user."""
    count = await svc.mark_all_read(db, user["sub"])
    return {"status": "all_read", "count": count}


@router.get("/stream")
async def stream(
    request: Request,
    user: dict = Depends(get_current_user),
    svc: NotificationService = Depends(get_notification_service),
):
    """Server-Sent Events endpoint for real-time notifications.

    Client connects via EventSource:
      const evt = new EventSource('/api/v1/notifications/stream', {
        headers: { Authorization: 'Bearer <token>' }
      });
      evt.onmessage = (e) => { const n = JSON.parse(e.data); };

    SSE spec:
    - Content-Type: text/event-stream
    - Cache-Control: no-cache
    - Connection: keep-alive (auto by FastAPI StreamingResponse)
    - Each event is: data: {json}\n\n
    """
    queue = svc.subscribe(user["sub"])

    async def event_generator():
        try:
            # Send initial keepalive
            yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE connected'})}\n\n"
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                try:
                    # Wait for notification with 30s timeout
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event
                except asyncio.TimeoutError:
                    # Send keepalive ping every 30s
                    yield ": keepalive\n\n"
        finally:
            svc.unsubscribe(user["sub"], queue)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
