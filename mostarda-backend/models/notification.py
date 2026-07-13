"""Notification model — internal push notification system.

Delivered via SSE (Server-Sent Events) for real-time display
in the user dashboard. Persisted in PostgreSQL for history.

Types:
  - revenue_split:    New revenue distribution processed
  - campaign_status:  Campaign approved/paused/completed
  - election:         Election started/ended, new candidate
  - payment:          PIX payment received, withdrawal processed
  - system_alert:     Hardware offline, anomaly detected
  - hardware:         TV pairing complete, OTA update available
"""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, Text,
    Enum as SAEnum, ForeignKey, JSON, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class NotificationType(str, enum.Enum):
    REVENUE_SPLIT = "revenue_split"
    CAMPAIGN_STATUS = "campaign_status"
    ELECTION = "election"
    PAYMENT = "payment"
    SYSTEM_ALERT = "system_alert"
    HARDWARE = "hardware"


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class Notification(Base):
    """Persisted notification with delivery tracking.

    Each notification is:
    - Tied to a specific user (user_id)
    - Typed for UI rendering (type enum)
    - Prioritized (low → critical)
    - Tracked for read/unread status
    - Optionally linked to a resource (reference_type + reference_id)
    """

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SAEnum(NotificationType), nullable=False)
    priority = Column(SAEnum(NotificationPriority), default=NotificationPriority.NORMAL)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(BigInteger, nullable=True)

    # Resource linking (e.g., click notification → go to campaign)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(255), nullable=True)

    # Payload for UI rendering (extra data)
    payload = Column(JSON, nullable=True)

    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    user = relationship("User")

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
        Index("ix_notifications_created", "user_id", "created_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "type": self.type.value,
            "priority": self.priority.value,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "read_at": self.read_at,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "payload": self.payload,
            "created_at": self.created_at,
        }
