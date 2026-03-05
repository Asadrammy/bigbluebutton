from fastapi import APIRouter, HTTPException, status, Query
import logging

from app.models import SpeechToTextRequest, SpeechToTextResponse, ErrorResponse
from app.services.stt import get_stt_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/speech-to-text",
    response_model=SpeechToTextResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def speech_to_text(
    request: SpeechToTextRequest,
    return_timestamps: bool = Query(False, description="Return word timestamps")
):
    """
    Convert speech audio to text using Whisper
    
    **Supports 5 languages:**
    - German (de)
    - English (en)
    - Spanish (es)
    - French (fr)
    - Arabic (ar)
    
    **Parameters:**
    - **audio_data**: Base64 encoded audio data (WAV, MP3, OGG, etc.)
    - **language**: Source language (optional, auto-detected if not provided)
    - **return_timestamps**: Include word-level timestamps
    
    **Returns:**
    - Transcribed text
    - Detected language
    - Confidence score
    - Optional timestamps
    """
    try:
        logger.info(f"Processing speech-to-text request (language: {request.language})")
        
        if not request.audio_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No audio data provided"
            )
        
        # Get STT service
        stt_service = get_stt_service()
        
        # Transcribe
        result = await stt_service.transcribe(
            audio_data=request.audio_data,
            language=request.language,
            return_timestamps=return_timestamps
        )
        
        logger.info(f"Speech recognition successful: '{result['text'][:50]}...'")
        
        return SpeechToTextResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in speech-to-text: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process speech"
        )


@router.get("/speech-to-text/info")
async def get_stt_info():
    """
    Get STT service information
    
    Returns information about the loaded model and supported languages
    """
    try:
        stt_service = get_stt_service()
        info = stt_service.get_model_info()
        
        return {
            "success": True,
            "data": info
        }
    
    except Exception as e:
        logger.error(f"Error getting STT info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get STT info"
        )

