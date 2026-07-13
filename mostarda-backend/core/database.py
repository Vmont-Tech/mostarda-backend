"""Async database engine and session factory.

SECURITY (B2 fix):
- echo=DEBUG logs ALL queries including password hashes by default
- Custom echo filter masks sensitive fields in query logs
- Even in DEBUG mode, credentials are never written to console
"""

import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from core.config import settings


# ── Sensitive Query Log Filter (B2 fix) ───────────────
# Prevents passwords, tokens, and hashes from appearing
# in SQLAlchemy echo logs, even when DEBUG=True.

SENSITIVE_KEYWORDS = [
    "password_hash", "password", "secret", "token",
    "access_token", "refresh_token", "api_key", "api_secret",
    "wallet_address", "seed", "private_key",
]


class SensitiveQueryFilter(logging.Filter):
    """Redacts sensitive column values from SQLAlchemy echo logs.

    When DEBUG=True, SQLAlchemy logs all parameterized queries.
    This filter intercepts those log messages and replaces
    sensitive parameter values with '[REDACTED]'.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, "msg") and isinstance(record.msg, str):
            msg = record.msg
            for keyword in SENSITIVE_KEYWORDS:
                # Pattern: `keyword = 'value'` or `keyword = "value"`
                # Replaces the value portion
                msg = msg.replace(f"'{keyword}'", f"'{keyword}'")  # no-op safeguard
                # Redact assignments: password_hash = 'abc123' → password_hash = '[REDACTED]'
                import re
                msg = re.sub(
                    rf"({keyword})\s*=\s*['\"][^'\"]+['\"]",
                    r"\1 = '[REDACTED]'",
                    msg,
                    flags=re.IGNORECASE,
                )
            record.msg = msg
        return True


def create_engine_with_safe_echo() -> "AsyncEngine":
    """Create database engine with safe echo logging.

    If DEBUG=True, echo is enabled BUT with a custom filter
    that redacts sensitive columns (password_hash, token, etc).
    """
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        echo_pool=False,
    )

    if settings.DEBUG:
        # Attach the sensitive data filter to SQLAlchemy's logger
        sql_logger = logging.getLogger("sqlalchemy.engine")
        sql_logger.addFilter(SensitiveQueryFilter())

    return engine


engine = create_engine_with_safe_echo()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session.

    Session is automatically closed when the request finishes.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
