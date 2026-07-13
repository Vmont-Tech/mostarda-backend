#!/usr/bin/env python3
"""Hardware detection and management for the ZEROONE Mini PC.

Moved from mostarda-backend/services/hardware.py to the player repository.
The backend only keeps:
  - API endpoints for telemetry receive
  - OTA manifest serving
  - Pairing session management

This module:
  1. Detects ZEROONE hardware (DMI, config file)
  2. Manages display resolution via xrandr
  3. Checks HDMI CEC availability
  4. Generates systemd service files
  5. Provides system health metrics (CPU temp, storage, memory, uptime)
"""

import hashlib
import os
import platform
import subprocess
import time
import uuid
from pathlib import Path
from typing import Optional
from loguru import logger


# ── Constants ──────────────────────────────────────────
ZEROONE_MODEL = "ZEROONE Fanless Mini PC"
HARDWARE_CONFIG_DIR = Path("/etc/mostarda")
HARDWARE_LOG_DIR = Path("/var/log/mostarda")
SYSTEMD_SERVICE_PATH = Path("/etc/systemd/system/mostarda-player.service")


class HardwareManager:
    """ZEROONE Mini PC hardware detection and management.

    Pure hardware operations — no database, no network.
    All methods are safe to call on non-ZEROONE hardware (graceful fallback).

    Detection checks:
      - /sys/class/dmi/id/product_name contains 'ZEROONE'
      - /etc/mostarda/hardware.conf exists with ZEROONE marker
    """

    def __init__(self):
        self._detect_hardware()

    def _detect_hardware(self):
        """Detect hardware platform and capabilities."""
        self.is_zeroone = self._detect_zeroone()
        self.hostname = platform.node()
        self.machine = platform.machine()
        self.system = platform.system()
        self.processor = platform.processor()

        logger.info(
            f"🖥️ Hardware: ZEROONE={'✅' if self.is_zeroone else '❌'} "
            f"host={self.hostname} arch={self.machine}"
        )

    def _detect_zeroone(self) -> bool:
        """Detect if running on ZEROONE Mini PC.

        Checks:
        1. /sys/class/dmi/id/product_name contains 'ZEROONE'
        2. /etc/mostarda/hardware.conf exists
        """
        try:
            product = Path("/sys/class/dmi/id/product_name")
            if product.exists():
                name = product.read_text().strip()
                if "ZEROONE" in name.upper():
                    return True
        except (IOError, OSError):
            pass

        if HARDWARE_CONFIG_DIR.exists():
            config_file = HARDWARE_CONFIG_DIR / "hardware.conf"
            if config_file.exists():
                try:
                    with open(config_file) as f:
                        if "ZEROONE" in f.read().upper():
                            return True
                except (IOError, OSError):
                    pass

        return False

    # ── Display Management ─────────────────────────────

    def get_display_info(self) -> dict:
        """Get current display resolution and connected monitors.

        Uses xrandr on Linux, falls back to environment detection.
        """
        display = {
            "resolution": "1920x1080",
            "connected_monitors": 1,
            "supports_hdmi_cec": self._check_hdmi_cec(),
            "is_zeroone": self.is_zeroone,
        }

        if self.is_zeroone:
            try:
                result = subprocess.run(
                    ["xrandr", "--current"],
                    capture_output=True, text=True, timeout=5,
                )
                if result.returncode == 0:
                    for line in result.stdout.split("\n"):
                        if " connected" in line:
                            parts = line.split()
                            for p in parts:
                                if "x" in p and "+" in p:
                                    display["resolution"] = p.split("+")[0]
                            # First ' connected' line increments to 1+; normalize
                            display["connected_monitors"] += 1

                    display["connected_monitors"] = max(
                        1,
                        sum(1 for l in result.stdout.split("\n") if " connected" in l),
                    )
            except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.CalledProcessError):
                logger.warning("xrandr not available — using default resolution")

        return display

    def _check_hdmi_cec(self) -> bool:
        """Check if HDMI CEC is available on this device."""
        if not self.is_zeroone:
            return False
        try:
            result = subprocess.run(
                ["cec-ctl", "--devices"],
                capture_output=True, text=True, timeout=5,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def get_system_info(self) -> dict:
        """Get system health metrics for telemetry reports."""
        info = {
            "hostname": self.hostname,
            "platform": f"{self.system} {self.machine}",
            "is_zeroone": self.is_zeroone,
            "uptime_seconds": int(time.time() - self._boot_time()),
        }

        # CPU temperature
        try:
            temp_path = Path("/sys/class/thermal/thermal_zone0/temp")
            if temp_path.exists():
                temp_raw = int(temp_path.read_text().strip())
                info["cpu_temp_celsius"] = temp_raw / 1000.0
        except (IOError, OSError, ValueError):
            info["cpu_temp_celsius"] = None

        # Storage
        try:
            stat = os.statvfs("/")
            total = stat.f_frsize * stat.f_blocks
            free = stat.f_frsize * stat.f_bfree
            info["storage_total_gb"] = round(total / (1024**3), 1)
            info["storage_free_gb"] = round(free / (1024**3), 1)
            info["storage_used_pct"] = round((1 - free / total) * 100, 1)
        except OSError:
            info["storage_total_gb"] = info["storage_free_gb"] = info["storage_used_pct"] = None

        # Memory
        try:
            with open("/proc/meminfo") as f:
                for line in f:
                    if "MemTotal" in line:
                        kb = int(line.split()[1])
                        info["memory_total_mb"] = round(kb / 1024, 0)
                    elif "MemAvailable" in line:
                        kb = int(line.split()[1])
                        info["memory_available_mb"] = round(kb / 1024, 0)
        except (IOError, OSError):
            info["memory_total_mb"] = info["memory_available_mb"] = None

        return info

    def to_telemetry_payload(self) -> dict:
        """Produce a telemetry payload ready for POST to backend API."""
        display = self.get_display_info()
        system = self.get_system_info()
        return {
            "hostname": self.hostname,
            "is_zeroone": self.is_zeroone,
            "display": display,
            "system": system,
            "timestamp_ms": int(time.time() * 1000),
        }

    def _boot_time(self) -> float:
        """Get system boot time via /proc/stat."""
        try:
            with open("/proc/stat") as f:
                for line in f:
                    if line.startswith("btime"):
                        return float(line.split()[1])
        except (IOError, OSError):
            pass
        return time.time()

    # ── Systemd Service ────────────────────────────────

    def generate_systemd_service(self) -> str:
        """Generate a hardened systemd service file for the media player.

        Security: NoNewPrivileges, ProtectSystem, PrivateTmp
        Watchdog: 30s hardware watchdog
        Restart: always with rate limiting (5 in 300s)

        Install:
          sudo python -c "from services.hardware import HardwareManager; \\
              h=HardwareManager(); \\
              Path('/etc/systemd/system/mostarda-player.service').write_text(h.generate_systemd_service())"
          sudo systemctl daemon-reload
          sudo systemctl enable mostarda-player
          sudo systemctl start mostarda-player
        """
        service = f"""[Unit]
Description=MOSTARDA Media Player — Edge Device Agent
Documentation=https://github.com/Vmont-Tech/mostarda-media-player
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mostarda
Group=mostarda
WorkingDirectory=/opt/mostarda/media-player
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /opt/mostarda/media-player/main.py
Restart=always
RestartSec=10
StartLimitIntervalSec=300
StartLimitBurst=5

# Hardware watchdog
WatchdogSec=30

# Security hardening
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
"""
        return service
