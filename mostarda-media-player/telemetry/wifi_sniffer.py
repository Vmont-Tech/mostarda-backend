"""WiFi Probe Request Sniffer — Anonymous Audience Counting.

Hardware: WiFi interface in monitor mode (wlan0mon)
Library: scapy

Watchdog:
- Detects if wlan0mon loses monitor mode DURING operation
- Implements automatic reconnection (3 retries)
- Reports connectivity status in metrics
- Falls back to simulation with clear warning
"""

import hashlib
import time
from collections import deque
from typing import Optional
from loguru import logger
from config import settings

WATCHDOG_TIMEOUT = 60
WATCHDOG_MAX_RETRIES = 3


class WiFiSniffer:
    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.interface = settings.WIFI_INTERFACE
        self.rssi_threshold = settings.RSSI_THRESHOLD
        self.seen = deque(maxlen=1000)
        self.device_timeout = 300
        self.stats = {
            "total_probes": 0, "unique": 0, "current": 0,
            "last_packet_ts": 0.0, "interface_up": True, "reconnects": 0,
        }

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
                    self.stats["last_packet_ts"] = time.time()
                    self.stats["interface_up"] = True
        except AttributeError:
            pass  # Malformed packet
        except Exception:
            pass  # Never crash the sniffer

    def run(self):
        if not self._interface_available():
            logger.error("WiFi interface not available — simulation mode")
            self._simulate()
            return

        retries = 0
        while not self.stop_event.is_set() and retries < WATCHDOG_MAX_RETRIES:
            try:
                from scapy.all import sniff
                sniff(
                    iface=self.interface, prn=self.process, store=False,
                    stop_callback=lambda: self.stop_event.is_set() or self._watchdog_triggered(),
                )
            except ImportError:
                logger.error("scapy not installed — simulation mode")
                self._simulate()
                return
            except OSError as e:
                logger.warning(f"⚠️ Interface error: {e} — retry {retries + 1}/{WATCHDOG_MAX_RETRIES}")
                self.stats["interface_up"] = False
                retries += 1
                self.stats["reconnects"] = retries
                time.sleep(5)
            except Exception as e:
                logger.warning(f"⚠️ Sniff socket error: {e} — reconnecting...")
                self.stats["interface_up"] = False
                retries += 1
                self.stats["reconnects"] = retries
                time.sleep(3)

            if self._watchdog_triggered():
                logger.warning(f"⏱️ Watchdog: no packets for {WATCHDOG_TIMEOUT}s — reconnecting...")
                self.stats["interface_up"] = False
                retries += 1
                self.stats["reconnects"] = retries
                self._reset_watchdog()
                time.sleep(5)

        if retries >= WATCHDOG_MAX_RETRIES:
            logger.error(f"❌ Interface failed after {WATCHDOG_MAX_RETRIES} retries — simulation mode")
            self._simulate()

    def _interface_available(self) -> bool:
        import os
        return os.path.exists(f"/sys/class/net/{self.interface}")

    def _watchdog_triggered(self) -> bool:
        if self.stats["last_packet_ts"] == 0.0:
            return False
        return (time.time() - self.stats["last_packet_ts"]) > WATCHDOG_TIMEOUT

    def _reset_watchdog(self):
        self.stats["last_packet_ts"] = time.time()

    def _simulate(self):
        import random
        logger.warning("📡 Sniffer in SIMULATION mode (no real WiFi data)")
        while not self.stop_event.is_set():
            self.stats["current"] = random.randint(0, 15)
            self.stats["total_probes"] += self.stats["current"]
            self.stats["interface_up"] = False
            time.sleep(10)

    def get_metrics(self) -> dict:
        return {"type": "wifi", "current": self.stats["current"],
                "unique": self.stats["unique"], "total": self.stats["total_probes"],
                "interface_up": self.stats["interface_up"], "reconnects": self.stats["reconnects"]}
