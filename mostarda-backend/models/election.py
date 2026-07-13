"""Election models — 6-month ambassador governance cycles."""

import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Float, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class ElectionStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class Election(Base):
    __tablename__ = "elections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tv_id = Column(UUID(as_uuid=True), ForeignKey("tvs.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(ElectionStatus), default=ElectionStatus.PENDING)
    start_at = Column(BigInteger, nullable=False)
    end_at = Column(BigInteger, nullable=False)
    cycle_number = Column(Integer, nullable=False)
    total_votes = Column(Integer, default=0)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    candidates = relationship("ElectionCandidate", back_populates="election")
    votes = relationship("ElectionVote", back_populates="election")


class ElectionCandidate(Base):
    __tablename__ = "election_candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    election_id = Column(UUID(as_uuid=True), ForeignKey("elections.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    platform = Column(Text, nullable=True)
    vote_count = Column(Integer, default=0)
    weighted_score = Column(Float, default=0.0)
    is_incumbent = Column(Boolean, default=False)
    is_winner = Column(Boolean, default=False)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    election = relationship("Election", back_populates="candidates")
    user = relationship("User")


class ElectionVote(Base):
    __tablename__ = "election_votes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    election_id = Column(UUID(as_uuid=True), ForeignKey("elections.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("election_candidates.id"), nullable=False)
    voter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    voter_role = Column(String(50), nullable=False)
    weight = Column(Float, default=1.0)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))

    election = relationship("Election", back_populates="votes")
    candidate = relationship("ElectionCandidate")
