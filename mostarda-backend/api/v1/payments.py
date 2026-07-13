"""PSAV Payment processing endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from core.security import get_current_user
from services.psav import PSAVService, get_psav_service

router = APIRouter()


@router.post("/pix")
async def create_pix(
    amount: int, description: str, customer_document: str, customer_name: str,
    user: dict = Depends(get_current_user), psav: PSAVService = Depends(get_psav_service),
):
    """Create PIX payment → auto-converted to BRLX stablecoin."""
    return await psav.create_pix_payment(amount, description, customer_document, customer_name)


@router.post("/webhook")
async def webhook(request: Request, psav: PSAVService = Depends(get_psav_service)):
    """PSAV webhook callback for payment confirmations."""
    body = await request.body()
    sig = request.headers.get("X-Signature", "")
    if not await psav.verify_webhook(body, sig):
        raise HTTPException(401, "Invalid signature")
    return {"status": "processed"}


@router.get("/balance")
async def balance(psav: PSAVService = Depends(get_psav_service)):
    b = await psav.get_balance()
    return {"balance": b, "asset": psav.stablecoin}
