"""Google MediaPipe Face Detection — Active Audience Measurement.

Zero-footprint privacy: no images stored (LGPD compliant).

MediaPipe Lifecycle (CRITICAL for ZEROONE Mini PC):
- FaceDetection() creates a C++ CalculatorGraph with thread pool
- WITHOUT .close(): threads orphan → CPU saturation
- WITH __exit__(): CalculatorGraph destroyed, threads released
"""

import gc
import time
import random
from loguru import logger
from config import settings

GC_INTERVAL = 30


class FaceDetector:
    """Real-time face detection via Google MediaPipe with context-managed lifecycle."""

    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.camera = settings.CAMERA_DEVICE
        self.confidence = settings.DETECTION_CONFIDENCE
        self.face_count = 0
        self.attention_score = 0.0
        self.cap = None
        self.mp = None
        self.detector_cm = None
        self.detector = None
        self._iteration = 0

    def __del__(self):
        self._close_detector()

    def _close_detector(self):
        """Release MediaPipe CalculatorGraph and thread pool."""
        if self.detector_cm is not None:
            try:
                self.detector_cm.__exit__(None, None, None)
                logger.debug("🧹 MediaPipe context exited (thread pool released)")
            except Exception:
                pass
            self.detector_cm = None
            self.detector = None

    def _init_detector(self):
        try:
            import mediapipe as mp
            self.mp = mp.solutions.face_detection
            self.detector_cm = self.mp.FaceDetection(
                model_selection=0, min_detection_confidence=self.confidence,
            )
            self.detector = self.detector_cm.__enter__()
            return True
        except ImportError:
            logger.warning("mediapipe not installed — simulation mode")
            return False

    def _init_camera(self):
        try:
            import cv2
            self.cap = cv2.VideoCapture(self.camera)
            return self.cap.isOpened()
        except ImportError:
            return False

    def _release_frame(self, frame, rgb):
        try:
            import numpy as np
            if rgb is not None:
                rgb = np.zeros_like(rgb)
                del rgb
        except (ImportError, NameError, ValueError):
            pass
        try:
            if frame is not None:
                del frame
        except (NameError, ValueError):
            pass

    def run(self):
        camera_ok = settings.CAMERA_ENABLED and self._init_camera()
        detector_ok = self._init_detector()

        if not camera_ok or not detector_ok:
            logger.info("👁️ Simulation mode (no camera or no MediaPipe)")
            self._close_detector()
            self._simulate()
            return

        import cv2

        try:
            while not self.stop_event.is_set():
                frame = None
                rgb = None
                try:
                    success, frame = self.cap.read()
                    if not success:
                        time.sleep(1)
                        continue
                    if self.detector:
                        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        results = self.detector.process(rgb)
                        self.face_count = len(results.detections) if results.detections else 0
                        del results
                    else:
                        self.face_count = 0
                    self.attention_score = min(1.0, self.face_count / 5.0)
                except Exception as e:
                    logger.error(f"❌ Face detection error (no data leaked): {e}")
                    self.face_count = 0
                    self.attention_score = 0.0
                finally:
                    self._release_frame(frame, rgb)

                self._iteration += 1
                if self._iteration % GC_INTERVAL == 0:
                    gc.collect()
                time.sleep(5)
        finally:
            # *** GUARANTEED C++ GRAPH CLEANUP ***
            self._close_detector()
            if self.cap:
                self.cap.release()

    def _simulate(self):
        while not self.stop_event.is_set():
            self.face_count = random.randint(0, 8)
            self.attention_score = self.face_count / 5.0
            time.sleep(5)

    def get_metrics(self) -> dict:
        return {
            "type": "face", "faces": self.face_count,
            "attention": self.attention_score, "zero_footprint": True,
        }
