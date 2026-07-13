"""PSAV (Prestador de Serviços de Ativos Virtuais) Integration.

Stablecoin payment processing — eliminates traditional BaaS/gateway fees.
Flow: Pix/Card → PSAV API → BRLX stablecoin → Yield Pool → Split 5 ways

Supports: Depix, Mercado Bitcoin, Liqi
"""

import hashlib
import hmac
import json
from typing import Optional
from loguru import logger
import httpx
from core.config import settings


class PSAVProvider:
    DEPIX = "depix"
    MERCADO_BITCOIN = "mercadobitcoin"
    LIQI = "liqi"


class PSAVService:
    """PSAV integration for stablecoin payment processing."""

    def __init__(self):
        self.provider = settings.PSAV_PROVIDER
        self.api_key = settings.PSAV_API_KEY
        self.api_secret = settings.PSAV_API_SECRET
        self.stablecoin = settings.PSAV_STABLECOIN
        self.base_url = self._get_base_url()
        self.client = httpx.AsyncClient(timeout=30.0)

    def _get_base_url(self) -> str:
        urls = {
            PSAVProvider.DEPIX: "https://api.depix.com.br/v1",
            PSAVProvider.MERCADO_BITCOIN: "https://api.mercadobitcoin.com.br/api/v4",
            PSAVProvider.LIQI: "https://api.liqi.com.br/v1",
        }
        return urls.get(self.provider, urls[PSAVProvider.DEPIX])

    def _sign(self, payload: dict) -> str:
        body = json.dumps(payload, separators=(",", ":"))
        return hmac.new(self.api_secret.encode(), body.encode(), hashlib.sha256).hexdigest()

    async def create_pix_payment(self, amount: int, description: str, customer_document: str, customer_name: str) -> dict:
        """Create PIX payment that auto-converts to stablecoin (BRLX)."""
        payload = {
            "amount": amount,
            "currency": "BRL",
            "description": description,
            "customer": {"document": customer_document, "name": customer_name},
            "settlement_asset": self.stablecoin,
        }
        response = await self.client.post(
            f"{self.base_url}/pix/transactions",
            json=payload,
            headers={"X-API-Key": self.api_key, "X-Signature": self._sign(payload)},
        )
        response.raise_for_status()
        return response.json()

    async def get_balance(self) -> int:
        response = await self.client.get(
            f"{self.base_url}/wallet/balances",
            headers={"X-API-Key": self.api_key},
        )
        data = response.json()
        return int(data.get("balances", {}).get(self.stablecoin, 0))

    async def transfer_to_wallet(self, destination: str, amount: int, asset: str = "BRLX") -> dict:
        """Transfer stablecoins to wallet (off-ramp)."""
        payload = {"destination": destination, "amount": amount, "asset": asset, "network": "STELLAR"}
        response = await self.client.post(
            f"{self.base_url}/transfers", json=payload,
            headers={"X-API-Key": self.api_key, "X-Signature": self._sign(payload)},
        )
        return response.json()

    async def verify_webhook(self, payload: bytes, signature: str) -> bool:
        expected = hmac.new(settings.PSAV_WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def close(self):
        await self.client.aclose()


_psav: Optional[PSAVService] = None


def get_psav_service() -> PSAVService:
    global _psav
    if _psav is None:
        _psav = PSAVService()
    return _psav
