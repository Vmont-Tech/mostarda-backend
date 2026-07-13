"""Authentication endpoints with Pydantic request body (no query params).

SECURITY:
- Passwords never appear in URL, logs, or cache
- Rate limiting on /login and /register (in-memory token bucket)
- Password strength validation (8+ chars, 1 uppercase, 1 digit)
"""

import time
from collections import defaultdict
from pydantic import BaseModel, EmailStr, field_validator
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from models.user import User

router = APIRouter()


# ── Rate Limiter (B4 fix) ─────────────────────────────
# In-memory sliding window counter.
# No external dependencies — works in embedded/SBC environments.
# Policy: 10 attempts per IP per 60s window.

RATE_LIMIT_WINDOW = 60       # seconds
RATE_LIMIT_MAX_ATTEMPTS = 10  # max requests per window


class RateLimiter:
    """Simple in-memory sliding window rate limiter.

    Tracks request count per IP within a time window.
    When limit exceeded, returns 429 Too Many Requests.
    """

    def __init__(self, window: int = RATE_LIMIT_WINDOW, max_attempts: int = RATE_LIMIT_MAX_ATTEMPTS):
        self.window = window
        self.max_attempts = max_attempts
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def check(self, ip: str) -> bool:
        """Returns True if request is allowed, False if rate limited."""
        now = time.time()
        cutoff = now - self.window

        # Prune expired entries
        self._buckets[ip] = [t for t in self._buckets[ip] if t > cutoff]

        if len(self._buckets[ip]) >= self.max_attempts:
            return False

        self._buckets[ip].append(now)
        return True

    def remaining(self, ip: str) -> int:
        """Return how many requests remain in the current window."""
        cutoff = time.time() - self.window
        self._buckets[ip] = [t for t in self._buckets[ip] if t > cutoff]
        return max(0, self.max_attempts - len(self._buckets[ip]))


# Global rate limiter instance (in-memory, survives between requests)
_rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request):
    """Dependency that enforces rate limiting on auth endpoints."""
    ip = get_client_ip(request)
    if not _rate_limiter.check(ip):
        remaining = _rate_limiter.remaining(ip)
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {RATE_LIMIT_WINDOW}s. "
                   f"({remaining} remaining)",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
        )


# ── Pydantic Schemas (Request Body) ────────────────────


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least 1 uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least 1 digit")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Endpoints ──────────────────────────────────────────


@router.post("/register", response_model=TokenResponse)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(check_rate_limit),
):
    """Register a new user. Password received in JSON body only. Rate limited."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=get_password_hash(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(check_rate_limit),
):
    """Authenticate user. Credentials received in JSON body only. Rate limited."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=dict)
async def refresh(body: RefreshRequest):
    """Refresh an expired access token."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    return {"access_token": create_access_token({"sub": payload["sub"]})}
