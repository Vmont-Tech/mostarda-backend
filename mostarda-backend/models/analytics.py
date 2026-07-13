"""Audience metrics, Proof of Play, and anomaly models."""

import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Float, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class AnomalySeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AudienceMetric(Base):
    __tablename__ = "audience_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tv_id = Column(UUID(as_uuid=True), ForeignKey("tvs.id"), nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    slot_id = Column(UUID(as_uuid=True), nullable=True)
    timestamp = Column(BigInteger, nullable=False)
    device_count = Column(Integer, nullable=False)
    probe_requests = Column(Integer, nullable=True)
    signal_strength_avg = Column(Float, nullable=True)
    dwell_time_avg = Column(Float, nullable=True)
    face_count = Column(Integer, nullable=True)
    attention_score = Column(Float, nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    tv = relationship("TV")


class ProofOfPlay(Base):
    __tablename__ = "proofs_of_play"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("tv_slots.id"), nullable=False)
    tv_id = Column(UUID(as_uuid=True), ForeignKey("tvs.id"), nullable=False)
    campaign_slot_id = Column(UUID(as_uuid=True), nullable=False)
    played_at = Column(BigInteger, nullable=False)
    duration = Column(Integer, default=30)
    wifi_audience_count = Column(Integer, nullable=True)
    face_audience_count = Column(Integer, nullable=True)
    blockchain_tx_id = Column(String(255), nullable=True)
    blockchain_network = Column(String(50), nullable=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tv_id = Column(UUID(as_uuid=True), ForeignKey("tvs.id"), nullable=False)
    location_id = Column(UUID(as_uuid=True), nullable=True)
    type = Column(String(100), nullable=False)
    severity = Column(SAEnum(AnomalySeverity), default=AnomalySeverity.LOW)
    description = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(BigInteger, nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
