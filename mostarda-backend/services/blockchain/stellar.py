"""Stellar Network — Primary Blockchain Layer.

NO simulated responses:
- Raises StellarNotConfigured if STELLAR_DISTRIBUTION_SEED is not set
- Health check uses real Horizon API REST endpoint
- PoP recording uses stellar-sdk TransactionBuilder
"""

from loguru import logger
from core.config import settings

FEE_THRESHOLD_XLM = 0.001


class StellarNotConfigured(Exception):
    """Stellar keys not set — the system NEVER silently simulates."""
    pass


class StellarService:
    def __init__(self):
        self.horizon = settings.STELLAR_HORIZON_URL
        self.network = settings.STELLAR_NETWORK_PASSPHRASE
        self.seed = settings.STELLAR_DISTRIBUTION_SEED
        self.asset = settings.STELLAR_ASSET_CODE
        if not self.seed:
            logger.warning("⚠️ Stellar not configured — set STELLAR_DISTRIBUTION_SEED")
        logger.info(f"🌐 Stellar: {self.horizon} | asset={self.asset} | configured={bool(self.seed)}")

    def _require_configured(self):
        if not self.seed:
            raise StellarNotConfigured(
                "STELLAR_DISTRIBUTION_SEED not configured. Set it in .env"
            )

    async def health(self) -> dict:
        self._require_configured()
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.horizon}/")
                data = resp.json()
                latest_ledger = data.get("history_latest_ledger", 0)
                base_fee_stroops = data.get("base_fee", data.get("fee_stats", {}).get("fee_charged", {}).get("max", 100))
                base_fee_xlm = base_fee_stroops / 10_000_000

                if latest_ledger == 0:
                    return {"status": "degraded", "base_fee": base_fee_xlm, "latest_ledger": 0}
                if base_fee_xlm > FEE_THRESHOLD_XLM:
                    return {"status": "congested", "base_fee": base_fee_xlm, "latest_ledger": latest_ledger}
                return {"status": "healthy", "base_fee": base_fee_xlm, "latest_ledger": latest_ledger}
        except httpx.TimeoutException:
            return {"status": "unreachable", "base_fee": 0.0, "latest_ledger": 0}
        except httpx.ConnectError:
            return {"status": "unreachable", "base_fee": 0.0, "latest_ledger": 0}
        except ImportError:
            raise StellarNotConfigured("httpx not installed: pip install httpx")

    async def record_proof_of_play(self, tv_id, slot_id, campaign_id, audience, ts, sequence=0):
        self._require_configured()
        try:
            from stellar_sdk import Server, Keypair, TransactionBuilder, Network
        except ImportError:
            raise StellarNotConfigured("stellar-sdk not installed: pip install stellar-sdk")

        server = Server(horizon_url=self.horizon)
        keypair = Keypair.from_secret(self.seed)
        account = await server.load_account(keypair.public_key)
        memo = f"POP:seq={sequence}:tv={tv_id[:8]}:slot={slot_id[:8]}"
        tx = (
            TransactionBuilder(
                source_account=account,
                network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE if "testnet" in self.horizon else Network.PUBLIC_NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_payment_op(destination=keypair.public_key, amount="0.00001", asset_code=self.asset, asset_issuer=keypair.public_key)
            .add_text_memo(memo)
            .set_timeout(30)
            .build()
        )
        tx.sign(keypair)
        response = await server.submit_transaction(tx)
        return {"blockchain": "stellar", "tx_hash": response.get("hash", ""), "sequence": sequence, "ledger": response.get("ledger", 0)}

    async def distribute(self, recipients):
        self._require_configured()
        try:
            from stellar_sdk import Server, Keypair, TransactionBuilder, Network
        except ImportError:
            raise StellarNotConfigured("stellar-sdk not installed")
        server = Server(horizon_url=self.horizon)
        keypair = Keypair.from_secret(self.seed)
        account = await server.load_account(keypair.public_key)
        tx = TransactionBuilder(source_account=account, network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE if "testnet" in self.horizon else Network.PUBLIC_NETWORK_PASSPHRASE, base_fee=100)
        for r in recipients:
            tx.append_payment_op(destination=r["address"], amount=str(r["amount"]), asset_code=self.asset, asset_issuer=keypair.public_key)
        tx.set_timeout(30).build()
        tx.sign(keypair)
        await server.submit_transaction(tx)
        return [{"address": r["address"][:10] + "...", "amount": r["amount"], "status": "confirmed"} for r in recipients]
