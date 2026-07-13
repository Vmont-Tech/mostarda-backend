"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from models.user import User

router = APIRouter()


@router.post("/register")
async def register(name: str, email: str, password: str, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(name=name, email=email, password_hash=get_password_hash(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "id": str(user.id),
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
    }


@router.post("/login")
async def login(email: str, password: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
    }


@router.post("/refresh")
async def refresh(refresh_token: str):
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    return {"access_token": create_access_token({"sub": payload["sub"]})}
