"""
MediaPipe Landmark Extraction Service
Extracts hand, pose, and face landmarks from video frames
RECOMMENDED: Free, offline, real-time performance
"""
import logging
import numpy as np
import cv2
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class MediaPipeExtractor:
    """
    Extract landmarks using MediaPipe Holistic
    Supports: Hands, Pose, Face landmarks
    """
    
    def __init__(self):
        """Initialize MediaPipe Holistic"""
        self.holistic = None
        self.mp_holistic = None
        self.mp_drawing = None
        self.available = False
        
        self._load_mediapipe()
    
    def _load_mediapipe(self):
        """Load MediaPipe Holistic"""
        try:
            import mediapipe as mp
            
            self.mp_holistic = mp.solutions.holistic
            self.mp_drawing = mp.solutions.drawing_utils
            self.mp_drawing_styles = mp.solutions.drawing_styles
            
            # Initialize Holistic model
            self.holistic = self.mp_holistic.Holistic(
                static_image_mode=False,
                model_complexity=1,  # 0=light, 1=full, 2=heavy (1 is balanced)
                smooth_landmarks=True,
                enable_segmentation=False,
                refine_face_landmarks=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            
            self.available = True
            logger.info("✅ MediaPipe Holistic loaded successfully")
        
        except ImportError:
            logger.warning("MediaPipe not available. Install with: pip install mediapipe")
            self.holistic = None
        except Exception as e:
            logger.error(f"Error loading MediaPipe: {e}")
            self.holistic = None
    
    def extract_landmarks(
        self,
        frame: np.ndarray
    ) -> Dict[str, Optional[np.ndarray]]:
        """
        Extract landmarks from a single frame
        
        Args:
            frame: RGB image frame (H, W, 3)
            
        Returns:
            Dict with 'left_hand', 'right_hand', 'pose', 'face' landmarks
            Each is a numpy array of shape (N, 3) where N is number of landmarks
            Returns None if not detected
        """
        if not self.available or self.holistic is None:
            return {
                'left_hand': None,
                'right_hand': None,
                'pose': None,
                'face': None
            }
        
        try:
            # MediaPipe expects RGB
            if len(frame.shape) == 3 and frame.shape[2] == 3:
                # Already RGB
                rgb_frame = frame
            else:
                # Convert BGR to RGB if needed
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process frame
            results = self.holistic.process(rgb_frame)
            
            # Extract landmarks
            landmarks = {
                'left_hand': self._extract_hand_landmarks(results.left_hand_landmarks),
                'right_hand': self._extract_hand_landmarks(results.right_hand_landmarks),
                'pose': self._extract_pose_landmarks(results.pose_landmarks),
                'face': self._extract_face_landmarks(results.face_landmarks)
            }
            
            return landmarks
        
        except Exception as e:
            logger.error(f"Error extracting landmarks: {e}")
            return {
                'left_hand': None,
                'right_hand': None,
                'pose': None,
                'face': None
            }
    
    def extract_landmarks_batch(
        self,
        frames: List[np.ndarray]
    ) -> List[Dict[str, Optional[np.ndarray]]]:
        """
        Extract landmarks from multiple frames
        
        Args:
            frames: List of RGB image frames
            
        Returns:
            List of landmark dictionaries
        """
        return [self.extract_landmarks(frame) for frame in frames]
    
    def _extract_hand_landmarks(
        self,
        hand_landmarks
    ) -> Optional[np.ndarray]:
        """Extract hand landmarks to numpy array"""
        if hand_landmarks is None:
            return None
        
        landmarks = []
        for landmark in hand_landmarks.landmark:
            landmarks.append([landmark.x, landmark.y, landmark.z])
        
        return np.array(landmarks, dtype=np.float32)
    
    def _extract_pose_landmarks(
        self,
        pose_landmarks
    ) -> Optional[np.ndarray]:
        """Extract pose landmarks to numpy array"""
        if pose_landmarks is None:
            return None
        
        landmarks = []
        for landmark in pose_landmarks.landmark:
            landmarks.append([landmark.x, landmark.y, landmark.z, landmark.visibility])
        
        return np.array(landmarks, dtype=np.float32)
    
    def _extract_face_landmarks(
        self,
        face_landmarks
    ) -> Optional[np.ndarray]:
        """Extract face landmarks to numpy array"""
        if face_landmarks is None:
            return None
        
        landmarks = []
        for landmark in face_landmarks.landmark:
            landmarks.append([landmark.x, landmark.y, landmark.z])
        
        return np.array(landmarks, dtype=np.float32)
    
    def landmarks_to_features(
        self,
        landmarks: Dict[str, Optional[np.ndarray]]
    ) -> np.ndarray:
        """
        Convert landmarks to feature vector for model input
        
        Args:
            landmarks: Dict with hand, pose, face landmarks
            
        Returns:
            Flattened feature vector
        """
        features = []
        
        # Left hand (21 landmarks * 3 coords = 63)
        if landmarks['left_hand'] is not None:
            features.extend(landmarks['left_hand'].flatten())
        else:
            features.extend([0.0] * 63)  # Zero padding if not detected
        
        # Right hand (21 landmarks * 3 coords = 63)
        if landmarks['right_hand'] is not None:
            features.extend(landmarks['right_hand'].flatten())
        else:
            features.extend([0.0] * 63)  # Zero padding if not detected
        
        # Pose (33 landmarks * 4 coords = 132)
        if landmarks['pose'] is not None:
            features.extend(landmarks['pose'].flatten())
        else:
            features.extend([0.0] * 132)  # Zero padding if not detected
        
        # Face (468 landmarks * 3 coords = 1404) - Optional, can be excluded for smaller features
        # For now, we'll exclude face to keep features smaller
        # if landmarks['face'] is not None:
        #     features.extend(landmarks['face'].flatten())
        # else:
        #     features.extend([0.0] * 1404)
        
        return np.array(features, dtype=np.float32)
    
    def get_feature_dimension(self) -> int:
        """Get the dimension of the feature vector"""
        # Left hand (63) + Right hand (63) + Pose (132) = 258
        return 258
    
    def is_available(self) -> bool:
        """Check if MediaPipe is available"""
        return self.available
    
    def close(self):
        """Close MediaPipe resources"""
        if self.holistic:
            self.holistic.close()
            self.holistic = None


# Global instance
_mediapipe_extractor: Optional[MediaPipeExtractor] = None


def get_mediapipe_extractor() -> MediaPipeExtractor:
    """Get global MediaPipe extractor instance"""
    global _mediapipe_extractor
    if _mediapipe_extractor is None:
        _mediapipe_extractor = MediaPipeExtractor()
    return _mediapipe_extractor

