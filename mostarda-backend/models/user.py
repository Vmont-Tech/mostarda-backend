"""User model — actors in the Mostarda ecosystem."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    email_verified_at = Column(BigInteger, nullable=True)
    phone = Column(String(20), nullable=True)
    document_id = Column(String(20), unique=True, nullable=True)
    role = Column(String(50), default="user")
    password_hash = Column(String(255), nullable=False)
    total_earned = Column(BigInteger, default=0)
    reputation_score = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    push_token = Column(String(255), nullable=True)
    wallet_address_stellar = Column(String(255), nullable=True)
    wallet_address_solana = Column(String(255), nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
