#!/usr/bin/env python3
"""MOSTARDA Media Player — Edge Device Agent.

Usage:
  python main.py                    # Full mode
  python main.py --sniffer-only
  python main.py --face-only
  python main.py --player-only
"""

import argparse
import signal
import sys
import threading
from loguru import logger


def main():
    parser = argparse.ArgumentParser(description="MOSTARDA Media Player")
    parser.add_argument("--player-only", action="store_true")
    parser.add_argument("--sniffer-only", action="store_true")
    parser.add_argument("--face-only", action="store_true")
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    logger.add("mostarda-player.log", rotation="10 MB", level="INFO")
    logger.info("🚀 MOSTARDA Media Player starting...")

    stop = threading.Event()

    def handler(sig, frame):
        logger.info("🛑 Shutting down...")
        stop.set()
        sys.exit(0)

    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)

    threads = []
    sensors = {}  # Shared references for heartbeat wiring

    # Heartbeat (always on)
    from telemetry.heartbeat import HeartbeatSender
    hb = HeartbeatSender(stop)
    threads.append(threading.Thread(target=hb.run, daemon=True))

    # Player
    if not args.sniffer_only and not args.face_only:
        from player.core import MediaPlayer
        p = MediaPlayer(stop)
        threads.append(threading.Thread(target=p.run, daemon=True))

    # WiFi Sniffer
    if not args.player_only and not args.face_only:
        try:
            from telemetry.wifi_sniffer import WiFiSniffer
            sniffer = WiFiSniffer(stop)
            threads.append(threading.Thread(target=sniffer.run, daemon=True))
            sensors["wifi"] = sniffer  # ← WIRED: heartbeat reads live metrics
        except ImportError as e:
            logger.warning(f"WiFi sniffer unavailable: {e}")

    # Face Detection
    if not args.player_only and not args.sniffer_only:
        try:
            from telemetry.face_detection import FaceDetector
            detector = FaceDetector(stop)
            threads.append(threading.Thread(target=detector.run, daemon=True))
            sensors["face"] = detector  # ← WIRED: heartbeat reads live metrics
        except ImportError as e:
            logger.warning(f"Face detection unavailable: {e}")

    # Connect sensors to heartbeat
    hb.wifi_sensor = sensors.get("wifi")
    hb.face_sensor = sensors.get("face")
    logger.info(
        f"🔌 Telemetry wired: wifi={'✅' if hb.wifi_sensor else '❌'} "
        f"face={'✅' if hb.face_sensor else '❌'}"
    )

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    logger.info("✅ Player stopped")


if __name__ == "__main__":
    main()
