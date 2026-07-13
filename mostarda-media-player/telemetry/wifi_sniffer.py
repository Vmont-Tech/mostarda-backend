"""WiFi Probe Request Sniffer — Anonymous Audience Counting.

Captures Dot11ProbeReq frames from smartphones scanning for known
networks. Anonymizes MACs via SHA-256 (LGPD compliance).
Filters by RSSI proximity (< -70 dBm = outside venue).

Hardware: WiFi interface in monitor mode (wlan0mon)
Library: scapy
"""

import hashlib
import json
import time
from collections import deque
from typing import Optional
from loguru import logger
from config import settings


class WiFiSniffer:
    """Passive probe request sniffer for audience measurement."""

    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.interface = settings.WIFI_INTERFACE
        self.rssi_threshold = settings.RSSI_THRESHOLD
        self.seen = deque(maxlen=1000)
        self.device_timeout = 300
        self.stats = {"total_probes": 0, "unique": 0, "current": 0}
        logger.info(f"📡 WiFiSniffer: {self.interface} (RSSI > {self.rssi_threshold})")

    def _anonymize(self, mac: str) -> str:
        return hashlib.sha256(mac.encode()).hexdigest()

    def _in_range(self, rssi: Optional[int]) -> bool:
        return rssi is not None and rssi > self.rssi_threshold

    def _count_recent(self) -> int:
        cutoff = time.time() - self.device_timeout
        return len([t for _, t in self.seen if t > cutoff])

    def process(self, pkt):
        try:
            if pkt.haslayer("Dot11ProbeReq"):
                mac = pkt.addr2
                rssi = getattr(pkt, "dBm_AntSignal", None)
                if mac and self._in_range(rssi):
                    h = self._anonymize(mac)
                    self.seen.append((h, time.time()))
                    self.stats["total_probes"] += 1
                    self.stats["unique"] = len(set(d for d, _ in self.seen))
                    self.stats["current"] = self._count_recent()
        except Exception:
            pass

    def run(self):
        logger.info("📡 Sniffer starting (requires root/monitor mode)")
        try:
            from scapy.all import sniff
            sniff(iface=self.interface, prn=self.process, store=False,
                  stop_callback=lambda: self.stop_event.is_set())
        except ImportError:
            logger.error("scapy not installed — simulation mode")
            self._simulate()
        except OSError:
            logger.error("WiFi interface not available — simulation mode")
            self._simulate()

    def _simulate(self):
        import random
        while not self.stop_event.is_set():
            self.stats["current"] = random.randint(0, 15)
            self.stats["total_probes"] += self.stats["current"]
            time.sleep(10)

    def get_metrics(self) -> dict:
        return {"type": "wifi", "current": self.stats["current"],
                "unique": self.stats["unique"], "total": self.stats["total_probes"]}
