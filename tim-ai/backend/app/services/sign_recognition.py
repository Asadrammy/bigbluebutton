"""
Sign Language Recognition Service
Uses trained 3D CNN model for sign language recognition
"""
import base64
import io
import logging
from typing import List, Dict, Optional
import numpy as np
import cv2

from sqlalchemy import select

from app.models import SignLanguage, Language
from app.config import settings
from app.ml.inference import get_inference_service
from app.database import AsyncSessionLocal
from app.db_models import (
    SignLanguage as SignLanguageEntity,
    SignLanguageModel,
    ModelVersion,
)

logger = logging.getLogger(__name__)


class SignRecognitionService:
    def __init__(self):
        logger.info("Initializing Sign Recognition service")
        self.inference_service = get_inference_service()
        
        # Try to load model on initialization
        try:
            self.inference_service.load_model()
            logger.info("Sign recognition model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load model on init: {e}. Will load on first request.")
    
    async def recognize_signs(
        self,
        frames: List,  # accepts list of base64 strings or numpy arrays
        sign_language: SignLanguage
    ) -> Dict:
        """
        Recognize sign language from video frames.
        
        Args:
            frames: List of base64 encoded video frames
            sign_language: Sign language type (DGS)
            
        Returns:
            Dict with recognized text, language, and confidence
        """
        try:
            logger.info(f"Processing {len(frames)} frames for sign recognition")
            
            # Decode frames only if they are base64 strings; if numpy arrays provided, use directly
            decoded_frames = None
            if len(frames) > 0 and isinstance(frames[0], np.ndarray):
                decoded_frames = np.array(frames)
            else:
                decoded_frames = self._decode_frames(frames)
            
            if len(decoded_frames) == 0:
                raise ValueError("No valid frames could be decoded")
            
            logger.info(f"Successfully prepared {len(decoded_frames)} frames for inference")
            
            model_path = await self._resolve_model_path(sign_language)
            if model_path:
                logger.info(
                    "Routing sign language %s to model %s",
                    sign_language.value,
                    model_path,
                )
            else:
                logger.info(
                    "Using default model mapping for sign language %s",
                    sign_language.value,
                )
            
            # Run inference
            prediction = self.inference_service.predict(
                decoded_frames,
                return_probabilities=False,
                sign_language=sign_language.value,
                model_path=model_path,
            )
            
            # Format response
            return {
                "text": prediction['predicted_sign'],
                "language": self._map_sign_language_to_spoken(sign_language),
                "sign_language": sign_language,
                "confidence": prediction['confidence'],
                "top_predictions": prediction.get('top_k_predictions', []),
                "inference_time": prediction.get('inference_time', 0),
                "frames_processed": len(decoded_frames),
                "below_threshold": prediction.get('below_threshold', False)
            }
        
        except Exception as e:
            logger.error(f"Error in sign recognition: {e}", exc_info=True)
            raise
    
    def _decode_frames(self, frames: List[str]) -> np.ndarray:
        """
        Decode base64 frames to numpy array
        
        Args:
            frames: List of base64 encoded frames
            
        Returns:
            Numpy array of frames (T, H, W, C)
        """
        decoded = []
        
        for i, frame_b64 in enumerate(frames):
            try:
                # Remove data URL prefix if present
                if "," in frame_b64:
                    frame_b64 = frame_b64.split(",")[1]
                
                # Decode base64
                frame_bytes = base64.b64decode(frame_b64)
                
                # Convert to numpy array
                frame_array = np.frombuffer(frame_bytes, dtype=np.uint8)
                
                # Decode image
                frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
                
                if frame is not None:
                    # Convert BGR to RGB
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    decoded.append(frame)
                else:
                    logger.warning(f"Frame {i} could not be decoded")
            
            except Exception as e:
                logger.warning(f"Failed to decode frame {i}: {e}")
                continue
        
        if len(decoded) == 0:
            raise ValueError("No frames could be decoded successfully")
        
        return np.array(decoded)
    
    def get_performance_stats(self) -> Dict:
        """Get inference performance statistics"""
        return self.inference_service.get_performance_stats()

    async def _resolve_model_path(self, sign_language: SignLanguage) -> Optional[str]:
        """Lookup the most recent active model path for a sign language."""
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(
                        SignLanguageModel.model_path,
                        ModelVersion.model_path.label("version_path"),
                    )
                    .join(
                        SignLanguageEntity,
                        SignLanguageEntity.id == SignLanguageModel.sign_language_id,
                    )
                    .outerjoin(
                        ModelVersion,
                        ModelVersion.id == SignLanguageModel.model_version_id,
                    )
                    .where(SignLanguageEntity.code == sign_language.value)
                    .where(SignLanguageModel.is_active.is_(True))
                    .order_by(SignLanguageModel.updated_at.desc())
                    .limit(1)
                )

                row = result.first()
                if row:
                    return row.model_path or row.version_path
        except Exception as db_error:
            logger.warning(
                "Could not resolve DB-backed model for %s: %s",
                sign_language.value,
                db_error,
            )
        return None

    def _map_sign_language_to_spoken(self, sign_language: SignLanguage) -> Language:
        mapping = {
            SignLanguage.DGS: Language.GERMAN,
            SignLanguage.OGS: Language.GERMAN,
            SignLanguage.ASL: Language.ENGLISH,
            SignLanguage.BSL: Language.ENGLISH,
            SignLanguage.NGT: Language.ENGLISH,
            SignLanguage.LSF: Language.FRENCH,
            SignLanguage.LSE: Language.SPANISH,
        }
        return mapping.get(sign_language, Language.ENGLISH)
