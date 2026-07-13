"""Media Player Core — Video playback with offline support.

Runs on Smart TV browsers, Fire Stick, or ZEROONE Mini PC.
Caches playlist locally for resilience against internet drops.
"""

import hashlib
import json
import os
import time
import urllib.request
from pathlib import Path
from loguru import logger
from config import settings


class MediaPlayer:
    """Video playback engine with offline fallback."""

    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.cache_dir = Path(settings.PLAYLIST_CACHE_DIR)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.max_cache = settings.MEDIA_CACHE_SIZE_MB * 1024 * 1024
        self.instance = None
        self.player = None
        self._init_vlc()

    def _init_vlc(self):
        try:
            import vlc
            self.instance = vlc.Instance("--no-video-title-show", "--quiet")
            self.player = self.instance.media_player_new()
        except ImportError:
            logger.warning("VLC unavailable — HTTP-only mode")
            self.player = None

    def _cache_path(self, url: str) -> Path:
        return self.cache_dir / hashlib.sha256(url.encode()).hexdigest()

    def _ensure_cached(self, url: str) -> str:
        cached = self._cache_path(url)
        if cached.exists():
            return str(cached)
        try:
            urllib.request.urlretrieve(url, cached)
            self._evict()
            return str(cached)
        except Exception:
            return url

    def _evict(self):
        total = sum(f.stat().st_size for f in self.cache_dir.iterdir() if f.is_file())
        if total <= self.max_cache:
            return
        files = sorted(self.cache_dir.iterdir(), key=lambda f: f.stat().st_atime)
        while total > self.max_cache * 0.8 and files:
            f = files.pop(0)
            total -= f.stat().st_size
            f.unlink()

    def _play_url(self, url: str, duration: int = 30):
        path = self._ensure_cached(url)
        if self.player:
            media = self.instance.media_new(path)
            self.player.set_media(media)
            self.player.play()
            time.sleep(duration)
            self.player.stop()
        else:
            logger.info(f"📡 Playout: {url[:50]}... ({duration}s)")
            time.sleep(0.1)

    def _sync_playlist(self) -> list:
        try:
            url = f"{settings.BACKEND_URL}/api/v1/slots/tv/{settings.TV_IDENTIFIER}/available"
            req = urllib.request.Request(url)
            if settings.TV_TOKEN:
                req.add_header("Authorization", f"Bearer {settings.TV_TOKEN}")
            with urllib.request.urlopen(req, timeout=10) as r:
                return json.loads(r.read())
        except Exception:
            return []

    def run(self):
        logger.info("🎬 Playback loop started")
        while not self.stop_event.is_set():
            playlist = self._sync_playlist()
            for item in playlist:
                if self.stop_event.is_set():
                    break
                self._play_url(item.get("media_url", ""), item.get("duration", 30))
            time.sleep(10)
