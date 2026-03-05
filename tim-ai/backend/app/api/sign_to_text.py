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
    
    - **video_frames**: List of base64 encoded video frames
    - **sign_language**: Sign language type (default: DGS)
    
    Returns recognized text with confidence score.
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
            sign_language=request.sign_language
        )
        
        logger.info(f"Sign recognition successful: {result['text']}")
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

