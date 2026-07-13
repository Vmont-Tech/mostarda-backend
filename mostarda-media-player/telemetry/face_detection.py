"""Google MediaPipe Face Detection — Active Audience Measurement.

Counts viewers looking at the screen using on-device AI.
Zero-footprint privacy: no images stored (LGPD compliant).
Only aggregate counts are transmitted.
"""

import time
from loguru import logger
from config import settings


class FaceDetector:
    """Real-time face detection via Google MediaPipe."""

    def __init__(self, stop_event):
        self.stop_event = stop_event
        self.camera = settings.CAMERA_DEVICE
        self.confidence = settings.DETECTION_CONFIDENCE
        self.face_count = 0
        self.attention_score = 0.0
        self.cap = None
        self.detector = None
        self._init()
        logger.info("👁️ FaceDetector initialized")

    def _init(self):
        try:
            import mediapipe as mp
            self.mp = mp.solutions.face_detection
            self.detector = self.mp.FaceDetection(
                model_selection=0, min_detection_confidence=self.confidence)
        except ImportError:
            logger.warning("mediapipe not installed")
            self.detector = None

    def _init_camera(self):
        try:
            import cv2
            self.cap = cv2.VideoCapture(self.camera)
            return self.cap.isOpened()
        except ImportError:
            return False

    def run(self):
        if not settings.CAMERA_ENABLED or not self._init_camera():
            logger.info("👁️ Simulation mode (no camera)")
            self._simulate()
            return

        import cv2
        while not self.stop_event.is_set():
            success, frame = self.cap.read()
            if not success:
                time.sleep(1)
                continue

            if self.detector:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.detector.process(rgb)
                self.face_count = len(results.detections) if results.detections else 0
            else:
                self.face_count = 0

            self.attention_score = min(1.0, self.face_count / 5.0)
            del frame  # Zero-footprint — frame discarded immediately
            time.sleep(5)

        if self.cap:
            self.cap.release()

    def _simulate(self):
        import random
        while not self.stop_event.is_set():
            self.face_count = random.randint(0, 8)
            self.attention_score = self.face_count / 5.0
            time.sleep(5)

    def get_metrics(self) -> dict:
        return {"type": "face", "faces": self.face_count, "attention": self.attention_score}
