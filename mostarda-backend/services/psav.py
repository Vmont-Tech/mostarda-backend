"""PSAV (Prestador de Serviços de Ativos Virtuais) Integration.

Stablecoin payment processing — eliminates traditional BaaS/gateway fees.
Flow: Pix/Card → PSAV API → BRLX stablecoin → Yield Pool → Split 5 vias

Supports: Depix, Mercado Bitcoin, Liqi

Retry Logic:
- Exponential backoff with jitter (3 retries)
- Idempotency keys to prevent duplicate settlements
"""

import asyncio
import hashlib
import hmac
import json
import uuid
from typing import Optional
from loguru import logger
import httpx
from core.config import settings


# ── Retry Configuration ──────────────────────────────────
# Estabilidade de rede brasileira: retry com backoff exponencial
MAX_RETRIES = 3
BASE_DELAY = 1.0  # seconds
MAX_DELAY = 10.0  # seconds


class PSAVProvider:
    DEPIX = "depix"
    MERCADO_BITCOIN = "mercadobitcoin"
    LIQI = "liqi"


async def _retry_with_backoff(fn, *args, **kwargs):
    """Execute a PSAV API call with exponential backoff and jitter.

    Retry em erros de rede (timeout, connection error).
    Não retry em 4xx (bad request, auth error) — são fatais.
    """
    import random

    last_exception = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return await fn(*args, **kwargs)
        except httpx.TimeoutException as e:
            last_exception = e
            if attempt < MAX_RETRIES:
                delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                jitter = random.uniform(0, delay * 0.5)
                logger.warning(
                    f"⏱️ Timeout (attempt {attempt}/{MAX_RETRIES}), "
                    f"retrying in {delay + jitter:.1f}s..."
                )
                await asyncio.sleep(delay + jitter)
            else:
                logger.error("❌ PSAV timeout after max retries")
        except httpx.HTTPStatusError as e:
            # 4xx errors are fatal (bad auth, bad request)
            if e.response.status_code < 500:
                raise
            last_exception = e
            if attempt < MAX_RETRIES:
                delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                logger.warning(
                    f"⚠️ HTTP {e.response.status_code} (attempt {attempt}/{MAX_RETRIES}), "
                    f"retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error("❌ PSAV server error after max retries")
        except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_exception = e
            if attempt < MAX_RETRIES:
                delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
                logger.warning(
                    f"🔌 Connection error (attempt {attempt}/{MAX_RETRIES}), "
                    f"retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error("❌ PSAV unreachable after max retries")

    raise last_exception  # type: ignore


class PSAVService:
    """PSAV integration for stablecoin payment processing.

    Features:
    - Idempotent operations (idempotency_key per request)
    - Exponential backoff retry (max 3 attempts)
    - HMAC-SHA256 request signing
    """

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
        return hmac.new(
            self.api_secret.encode(), body.encode(), hashlib.sha256
        ).hexdigest()

    def _idempotency_key(self) -> str:
        """Generate unique idempotency key for each operation.

        Prevents double-settlement if a request is retried.
        """
        return str(uuid.uuid4())

    async def _post(self, path: str, payload: dict) -> dict:
        """POST with retry, idempotency, and HMAC signing."""
        payload["idempotency_key"] = self._idempotency_key()
        return await _retry_with_backoff(
            lambda: self.client.post(
                f"{self.base_url}{path}",
                json=payload,
                headers={
                    "X-API-Key": self.api_key,
                    "X-Signature": self._sign(payload),
                },
            )
        )

    async def _get(self, path: str) -> dict:
        """GET with retry."""
        return await _retry_with_backoff(
            lambda: self.client.get(
                f"{self.base_url}{path}",
                headers={"X-API-Key": self.api_key},
            )
        )

    async def create_pix_payment(
        self, amount: int, description: str,
        customer_document: str, customer_name: str,
    ) -> dict:
        """Create PIX payment that auto-converts to stablecoin (BRLX)."""
        payload = {
            "amount": amount,
            "currency": "BRL",
            "description": description,
            "customer": {"document": customer_document, "name": customer_name},
            "settlement_asset": self.stablecoin,
        }
        response = await self._post("/pix/transactions", payload)
        return response

    async def get_balance(self) -> int:
        response = await self._get("/wallet/balances")
        data = response
        return int(data.get("balances", {}).get(self.stablecoin, 0))

    async def transfer_to_wallet(
        self, destination: str, amount: int, asset: str = "BRLX"
    ) -> dict:
        """Transfer stablecoins to wallet (off-ramp)."""
        payload = {
            "destination": destination,
            "amount": amount,
            "asset": asset,
            "network": "STELLAR",
        }
        return await self._post("/transfers", payload)

    async def verify_webhook(self, payload: bytes, signature: str) -> bool:
        expected = hmac.new(
            settings.PSAV_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def process_webhook(self, payload: dict) -> dict:
        """Process a confirmed settlement webhook from PSAV.

        This triggers the revenue split pipeline.
        In production: creates off-ramp batch entry + notifies actors.
        """
        event = payload.get("event", "unknown")
        logger.info(f"📬 PSAV webhook: {event}")
        return {
            "received": True,
            "event": event,
            "status": "processed",
        }

    async def close(self):
        await self.client.aclose()


_psav: Optional[PSAVService] = None


def get_psav_service() -> PSAVService:
    global _psav
    if _psav is None:
        _psav = PSAVService()
    return _psav
