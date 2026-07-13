"""Heartbeat sender — periodic device status to backend.

Receives wired references to WiFiSniffer and FaceDetector instances
from main.py so that .send() transmits REAL telemetry, not None.
"""

import json
import time
import urllib.request
from typing import Optional
from loguru import logger
from config import settings


class HeartbeatSender:
    """Periodic heartbeat with system metrics + live audience data.

    wifi_sensor and face_sensor are wired by main.py after the
    respective detector threads are started.
    """

    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.wifi_sensor: Optional[object] = None  # Wired by main.py
        self.face_sensor: Optional[object] = None  # Wired by main.py

    def _system(self) -> dict:
        try:
            import psutil
            return {"cpu": psutil.cpu_percent(), "mem": psutil.virtual_memory().percent,
                    "uptime": int(time.time() - psutil.boot_time())}
        except ImportError:
            return {"cpu": 0, "mem": 0, "uptime": 0}

    def send(self):
        payload = {
            "tv_identifier": settings.TV_IDENTIFIER,
            "timestamp": int(time.time() * 1000),
            "system": self._system(),
        }

        # Pull LIVE metrics from wired sensors (not None)
        if self.wifi_sensor is not None:
            payload["wifi"] = self.wifi_sensor.get_metrics()
        if self.face_sensor is not None:
            payload["face"] = self.face_sensor.get_metrics()

        try:
            data = json.dumps(payload).encode()
            req = urllib.request.Request(
                f"{settings.BACKEND_URL}/api/v1/tvs/heartbeat",
                data=data, headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10):
                logger.debug("💓 Heartbeat sent")
        except Exception as e:
            logger.debug(f"💔 Heartbeat failed: {e}")

    def run(self):
        while not self.stop_event.is_set():
            self.send()
            time.sleep(settings.HEARTBEAT_INTERVAL)
