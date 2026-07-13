"""Campaign and CampaignSlot models."""

import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Text, Enum as SAEnum, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    advertiser_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=False)
    media_duration = Column(Integer, default=30)
    budget = Column(BigInteger, nullable=False)
    spent = Column(BigInteger, default=0)
    status = Column(SAEnum(CampaignStatus), default=CampaignStatus.DRAFT)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))


class CampaignSlot(Base):
    __tablename__ = "campaign_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("tv_slots.id"), nullable=False)
    price = Column(BigInteger, nullable=False)
    is_played = Column(Boolean, default=False)
    proof_of_play_id = Column(UUID(as_uuid=True), nullable=True)
    blockchain_tx_id = Column(String(255), nullable=True)
    played_at = Column(BigInteger, nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    campaign = relationship("Campaign")
