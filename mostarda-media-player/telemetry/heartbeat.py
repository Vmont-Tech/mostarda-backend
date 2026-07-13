"""Heartbeat sender — periodic device status to backend."""

import json
import time
import urllib.request
from loguru import logger
from config import settings


class HeartbeatSender:
    """Periodic heartbeat with system metrics + audience data."""

    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.wifi = None
        self.face = None

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
        if self.wifi:
            payload["wifi"] = self.wifi.get_metrics()
        if self.face:
            payload["face"] = self.face.get_metrics()

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
