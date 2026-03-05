from fastapi import APIRouter, HTTPException, status
import logging

from app.models import SignToTextRequest, SignToTextResponse, ErrorResponse
from app.services.sign_recognition import SignRecognitionService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize service (will be loaded on startup)
sign_recognition_service = SignRecognitionService()


@router.post(
    "/sign-to-text",
    response_model=SignToTextResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def sign_to_text(request: SignToTextRequest):
    """
    Convert sign language gestures to text.
    
    **Supports two recognition approaches:**
    - **MediaPipe + LSTM** (architecture-compliant): Extracts landmarks, then classifies
    - **3D CNN** (alternative): Direct frame processing (faster, requires trained model)
    
    **Parameters:**
    - **video_frames**: List of base64 encoded video frames
    - **sign_language**: Sign language type (default: DGS)
    - **use_mediapipe**: If True, use MediaPipe approach. If None, auto-selects best method.
    
    Returns recognized text with confidence score and method used.
    """
    try:
        logger.info(f"Processing sign-to-text request with {len(request.video_frames)} frames")
        
        if not request.video_frames:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No video frames provided"
            )
        
        result = await sign_recognition_service.recognize_signs(
            frames=request.video_frames,
            sign_language=request.sign_language,
            use_mediapipe=request.use_mediapipe
        )
        
        logger.info(f"Sign recognition successful: {result['text']} (method: {result.get('method', 'unknown')})")
        return SignToTextResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in sign-to-text: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process sign language"
        )

