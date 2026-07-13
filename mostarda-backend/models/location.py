"""Location model — physical spaces where TVs are installed."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    space_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    operating_start = Column(String(5), default="08:00")
    operating_end = Column(String(5), default="22:00")
    timezone = Column(String(50), default="America/Sao_Paulo")
    average_foot_traffic = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    space_owner = relationship("User")
    tvs = relationship("TV")
