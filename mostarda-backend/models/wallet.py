"""Wallet, Transaction, and RevenueDistribution models.

REVENUE_SPLIT is defined ONLY in services/revenue.py.
This module imports it to prevent drift between models and services.
"""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, Float, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class TxStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class Blockchain(str, enum.Enum):
    STELLAR = "stellar"
    SOLANA = "solana"


class RevenueActor(str, enum.Enum):
    """Actor keys must match services/revenue.py REVENUE_SPLIT keys."""
    MOSTARDA = "mostarda"
    SPACE_OWNER = "space_owner"
    TV_OWNER = "tv_owner"
    AFFILIATE_SELLER = "affiliate_seller"
    INFLUENCER = "influencer"


# REVENUE_SPLIT is defined ONLY in services/revenue.py
# DO NOT redefine it here — import at runtime:
#   from services.revenue import REVENUE_SPLIT


class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    balance_stablecoin = Column(BigInteger, default=0)
    balance_pending = Column(BigInteger, default=0)
    balance_yield = Column(BigInteger, default=0)
    stellar_address = Column(String(255), nullable=True)
    solana_address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    updated_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    user = relationship("User")
    transactions = relationship("Transaction", back_populates="wallet")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False)
    type = Column(String(50), nullable=False)
    amount = Column(BigInteger, nullable=False)
    currency = Column(String(20), default="BRLX")
    status = Column(SAEnum(TxStatus), default=TxStatus.PENDING)
    blockchain_network = Column(SAEnum(Blockchain), nullable=True)
    blockchain_tx_id = Column(String(255), nullable=True)
    reference_id = Column(String(255), nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    confirmed_at = Column(BigInteger, nullable=True)
    wallet = relationship("Wallet", back_populates="transactions")


class RevenueDistribution(Base):
    __tablename__ = "revenue_distributions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False)
    actor = Column(SAEnum(RevenueActor), nullable=False)
    percentage = Column(Float, nullable=False)
    gross_amount = Column(BigInteger, nullable=False)
    net_amount = Column(BigInteger, nullable=False)
    status = Column(SAEnum(TxStatus), default=TxStatus.PENDING)
    blockchain_tx_id = Column(String(255), nullable=True)
    created_at = Column(BigInteger, default=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))
    settled_at = Column(BigInteger, nullable=True)
    wallet = relationship("Wallet")
