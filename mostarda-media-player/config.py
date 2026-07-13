"""Media Player configuration from environment."""

import os
from dotenv import load_dotenv
load_dotenv()


class Settings:
    # Device identity
    TV_IDENTIFIER = os.getenv("TV_IDENTIFIER", "unknown")
    TV_TOKEN = os.getenv("TV_TOKEN", "")

    # Backend
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "30"))
    SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "300"))

    # Playback
    PLAYLIST_CACHE_DIR = os.getenv("PLAYLIST_CACHE_DIR", "/tmp/mostarda/cache")
    MEDIA_CACHE_SIZE_MB = int(os.getenv("MEDIA_CACHE_SIZE_MB", "500"))
    DEFAULT_SLOT_DURATION = 30

    # WiFi Sniffer
    WIFI_INTERFACE = os.getenv("WIFI_INTERFACE", "wlan0mon")
    SNIFFER_ENABLED = os.getenv("SNIFFER_ENABLED", "true").lower() == "true"
    RSSI_THRESHOLD = int(os.getenv("RSSI_THRESHOLD", "-70"))

    # Face Detection
    CAMERA_ENABLED = os.getenv("CAMERA_ENABLED", "true").lower() == "true"
    CAMERA_DEVICE = int(os.getenv("CAMERA_DEVICE", "0"))
    DETECTION_CONFIDENCE = float(os.getenv("DETECTION_CONFIDENCE", "0.5"))

    # Privacy (LGPD)
    HASH_MAC_ADDRESSES = True
    DELETE_FRAMES_IMMEDIATELY = True
    STORE_RAW_IMAGES = False


settings = Settings()
