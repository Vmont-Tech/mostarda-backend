#!/usr/bin/env python3
"""MOSTARDA Media Player — Edge Device Agent.

Smart TV / Fire Stick / ZEROONE Mini PC.
Capabilities:
  - Video playback with offline cache
  - WiFi probe request sniffing (anonymous audience count via scapy)
  - Google MediaPipe face detection (attention tracking)
  - Heartbeat/telemetry to backend

Usage:
  python main.py                    # Full mode
  python main.py --sniffer-only     # Only WiFi audience
  python main.py --face-only        # Only face detection
  python main.py --player-only      # Only video playback
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

    # Heartbeat (always on)
    from telemetry.heartbeat import HeartbeatSender
    hb = HeartbeatSender(stop)
    t = threading.Thread(target=hb.run, daemon=True)
    t.start()
    threads.append(t)

    # Player
    if not args.sniffer_only and not args.face_only:
        from player.core import MediaPlayer
        p = MediaPlayer(stop)
        t = threading.Thread(target=p.run, daemon=True)
        t.start()
        threads.append(t)

    # WiFi Sniffer
    if not args.player_only and not args.face_only:
        try:
            from telemetry.wifi_sniffer import WiFiSniffer
            s = WiFiSniffer(stop)
            t = threading.Thread(target=s.run, daemon=True)
            t.start()
            threads.append(t)
        except ImportError as e:
            logger.warning(f"WiFi sniffer unavailable: {e}")

    # Face Detection
    if not args.player_only and not args.sniffer_only:
        try:
            from telemetry.face_detection import FaceDetector
            d = FaceDetector(stop)
            t = threading.Thread(target=d.run, daemon=True)
            t.start()
            threads.append(t)
        except ImportError as e:
            logger.warning(f"Face detection unavailable: {e}")

    for t in threads:
        t.join()

    logger.info("✅ Player stopped")


if __name__ == "__main__":
    main()
