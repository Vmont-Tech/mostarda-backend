"""Hardware API endpoints — telemetry receive, OTA updates, and pairing.

Endpoints:
  POST /hardware/telemetry    — Receive telemetry from media players
  GET  /hardware/ota/check    — Check OTA update availability
  GET  /hardware/ota/download — Serve OTA update binary
  POST /hardware/pair         — Create pairing session (QR code)
  POST /hardware/pair/validate — Validate pairing code

Hardware detection NOT in this file — moved to mostarda-media-player/services/hardware.py.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.security import get_current_user, get_current_admin
from services.hardware import get_hardware_service, HardwareService

router = APIRouter()


@router.post("/telemetry")
async def receive_telemetry(
    payload: dict,
    service: HardwareService = Depends(get_hardware_service),
):
    """Receive telemetry payload from a media player.

    The ZEROONE hardware manager sends a periodic heartbeat with
    display info, system metrics, and availability status.

    Authentication: device JWT or admin token.
    No persisted storage — processed and acknowledged immediately.
    """
    return await service.ingest_telemetry(payload)


@router.get("/ota/check")
async def check_ota(
    current_version: str = Query(..., description="Current firmware version on the device"),
    service: HardwareService = Depends(get_hardware_service),
):
    """Check if a newer OTA firmware version is available.

    The media player calls this periodically, passing its current version.
    If a newer version is registered, the response includes the update URL.
    """
    return service.check_ota_update(current_version)


@router.get("/ota/download/{version}")
async def download_ota(
    version: str,
    admin: dict = Depends(get_current_admin),
):
    """Serve the OTA update binary for a specific version.

    Protected: admin token required. The binary is served as
    a streaming download for the media player to apply.
    """
    from pathlib import Path
    binary_path = Path(f"/var/lib/mostarda/updates/{version}/update.bin")
    if not binary_path.exists():
        raise HTTPException(404, f"OTA package for version {version} not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        str(binary_path),
        media_type="application/octet-stream",
        filename=f"mostarda-update-{version}.bin",
    )


@router.post("/pair")
async def create_pairing(
    tv_identifier: str = Query(..., description="TV serial or MAC address"),
    admin: dict = Depends(get_current_admin),
    service: HardwareService = Depends(get_hardware_service),
):
    """Create a TV pairing session. Returns a QR-code-compatible payload.

    Protected: admin token required.
    The pairing code expires after 10 minutes (PAIRING_CODE_TTL).
    """
    session = service.create_pairing_session(tv_identifier)
    backend_url = "https://api.mostarda.io"  # In production, derive from request
    qr_data = service.get_pairing_qr_data(session.pairing_code, backend_url)
    return {
        "session": session.to_dict(),
        "qr_data": qr_data,
    }


@router.post("/pair/validate")
async def validate_pairing(
    pairing_code: str = Query(..., description="The 12-char pairing code from QR"),
    device_token: str = Query(..., description="JWT generated for the device"),
    service: HardwareService = Depends(get_hardware_service),
):
    """Validate a pairing code and complete the TV registration.

    Called by the TV after the user scans the QR code.
    Returns the device JWT if pairing is successful.
    """
    result = service.validate_pairing(pairing_code, device_token)
    if not result.get("valid"):
        raise HTTPException(400, result.get("error", "Pairing failed"))
    return result
