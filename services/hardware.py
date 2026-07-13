"""Hardware integration service — backend-facing API layer.

This module handles ONLY the backend responsibilities for hardware:
  1. Pairing session management (QR code generation, code validation)
  2. OTA update manifest storage and retrieval
  3. Telemetry payload receive (from media-player telemetry reports)

Hardware detection, display management, and systemd service generation
have been moved to mostarda-media-player/services/hardware.py.
"""

import hashlib
import json
import time
import uuid
from pathlib import Path
from typing import Optional
from loguru import logger


# ── Constants ──────────────────────────────────────────
PAIRING_CODE_TTL = 600  # 10 minutes
OTA_MANIFEST_DIR = Path("/var/lib/mostarda/updates")


class PairingSession:
    """A TV pairing session initiated by QR code scan."""

    def __init__(self, identifier: str):
        self.identifier = identifier
        self.pairing_code = self._generate_code()
        self.created_at = time.time()
        self.token: Optional[str] = None
        self.completed = False

    def _generate_code(self) -> str:
        raw = f"{self.identifier}:{uuid.uuid4()}:{time.time()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:12].upper()

    @property
    def expired(self) -> bool:
        return (time.time() - self.created_at) > PAIRING_CODE_TTL

    def to_dict(self) -> dict:
        return {
            "identifier": self.identifier,
            "pairing_code": self.pairing_code,
            "expires_at": int((self.created_at + PAIRING_CODE_TTL) * 1000),
            "expired": self.expired,
            "completed": self.completed,
        }


class HardwareService:
    """Backend API for hardware management.

    Responsibilities:
      - Generate and validate TV pairing sessions (QR code flow)
      - Manage OTA update manifests and binaries
      - Store telemetry reports from media players (via API endpoint)

    NOT responsible for:
      - Hardware detection (xrandr, DMI) → moved to media-player
      - Display management → moved to media-player
      - Systemd service generation → moved to media-player
      - HDMI CEC → moved to media-player
    """

    def __init__(self):
        self._pairing_sessions: dict[str, PairingSession] = {}

    # ── Pairing Flow ───────────────────────────────────

    def create_pairing_session(self, tv_identifier: str) -> PairingSession:
        """Create a pairing session for a TV. Returns QR-compatible code."""
        session = PairingSession(tv_identifier)
        self._pairing_sessions[session.pairing_code] = session
        logger.info(f"🔗 Pairing session created: tv={tv_identifier[:8]} code={session.pairing_code}")
        return session

    def validate_pairing(self, pairing_code: str, token: str) -> Optional[dict]:
        """Validate a pairing code and complete the pairing.

        Called by the TV after the user scans the QR code and
        the backend generates a JWT token for the device.
        """
        session = self._pairing_sessions.get(pairing_code)
        if not session:
            return {"valid": False, "error": "Invalid pairing code"}
        if session.expired:
            del self._pairing_sessions[pairing_code]
            return {"valid": False, "error": "Pairing code expired"}
        if session.completed:
            return {"valid": False, "error": "Already paired"}

        session.token = token
        session.completed = True
        logger.info(f"✅ TV paired: identifier={session.identifier[:8]}")
        return {
            "valid": True,
            "identifier": session.identifier,
            "token": token,
        }

    def get_pairing_qr_data(self, pairing_code: str, backend_url: str) -> dict:
        """Generate QR code data for TV pairing.

        The QR code encodes a JSON payload that the mobile app scans:
        {
          "action": "pair_tv",
          "url": "https://api.mostarda.io/pair",
          "code": "A1B2C3D4E5F6",
          "ttl": 600
        }
        """
        session = self._pairing_sessions.get(pairing_code)
        if not session:
            raise ValueError("Pairing session not found")

        return {
            "action": "pair_tv",
            "url": f"{backend_url}/api/v1/tvs/pair",
            "code": pairing_code,
            "ttl": PAIRING_CODE_TTL,
        }

    # ── OTA Manifest ───────────────────────────────────

    def check_ota_update(self, current_version: str) -> dict:
        """Check if a newer version is available.

        Reads the update manifest from the server's update directory.
        Returns the latest version info or current version if none available.
        """
        manifest_path = OTA_MANIFEST_DIR / "latest.json"
        if manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text())
                return {
                    "current_version": current_version,
                    "update_available": manifest.get("version", "") != current_version,
                    "latest_version": manifest.get("version", current_version),
                    "update_url": manifest.get("package_url"),
                    "checksum": manifest.get("checksum"),
                    "changelog": manifest.get("changelog"),
                }
            except (IOError, json.JSONDecodeError):
                pass

        return {
            "current_version": current_version,
            "update_available": False,
            "latest_version": current_version,
            "update_url": None,
            "checksum": None,
            "changelog": None,
        }

    def register_ota_release(self, version: str, package_url: str, checksum: str, changelog: str = ""):
        """Register a new OTA release manifest on the server.

        Called by admin to publish a new firmware version.
        """
        OTA_MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
        manifest = {
            "version": version,
            "package_url": package_url,
            "checksum": checksum,
            "changelog": changelog,
            "published_at": int(time.time() * 1000),
        }
        manifest_path = OTA_MANIFEST_DIR / "latest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        logger.info(f"📦 OTA release registered: v{version}")
        return manifest

    # ── Telemetry Ingest ───────────────────────────────

    async def ingest_telemetry(self, payload: dict) -> dict:
        """Process telemetry payload received from a media player.

        The hardware manager on the edge device sends:
        {
          "hostname": "zeroone-001",
          "is_zeroone": true,
          "display": { "resolution": "1920x1080", ... },
          "system": { "cpu_temp_celsius": 45.2, ... },
          "timestamp_ms": ...
        }

        Returns a confirmation response.
        """
        hostname = payload.get("hostname", "unknown")
        logger.info(
            f"📡 Telemetry received: host={hostname} "
            f"temp={payload.get('system', {}).get('cpu_temp_celsius', 'N/A')}°C "
            f"uptime={payload.get('system', {}).get('uptime_seconds', 0)}s"
        )
        return {
            "status": "received",
            "hostname": hostname,
            "received_at_ms": int(time.time() * 1000),
        }


# Singleton
_hardware_service: Optional[HardwareService] = None


def get_hardware_service() -> HardwareService:
    global _hardware_service
    if _hardware_service is None:
        _hardware_service = HardwareService()
    return _hardware_service
