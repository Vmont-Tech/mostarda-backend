"""TV and TVSlot models."""

import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Text, Enum as SAEnum, ForeignKey, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class TVStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class SlotStatus(str, enum.Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TV(Base):
    __tablename__ = "tvs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    identifier = Column(String(255), unique=True, nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    screen_size = Column(Integer, nullable=True)
    resolution = Column(String(50), nullable=True)
    status = Column(SAEnum(TVStatus), default=TVStatus.ACTIVE)
    is_online = Column(Boolean, default=False)
    last_heartbeat = Column(BigInteger, nullable=True)
    base_price = Column(BigInteger, default=100)
    slot_duration = Column(Integer, default=30)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    owner = relationship("User", foreign_keys=[owner_id])
    slots = relationship("TVSlot", back_populates="tv")


class TVSlot(Base):
    __tablename__ = "tv_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tv_id = Column(UUID(as_uuid=True), ForeignKey("tvs.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    status = Column(SAEnum(SlotStatus), default=SlotStatus.AVAILABLE)
    base_price = Column(BigInteger, default=0)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    tv = relationship("TV", back_populates="slots")
