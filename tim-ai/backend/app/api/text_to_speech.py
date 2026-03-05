from fastapi import APIRouter, HTTPException, status, Query
import logging

from app.models import TextToSpeechRequest, TextToSpeechResponse, ErrorResponse
from app.services.tts import get_tts_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/text-to-speech",
    response_model=TextToSpeechResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def text_to_speech(
    request: TextToSpeechRequest,
    slow: bool = Query(False, description="Use slower speech rate (better for learning)")
):
    """
    Convert text to speech using gTTS
    
    **Supports 5 languages:**
    - German (de)
    - English (en)
    - Spanish (es)
    - French (fr)
    - Arabic (ar)
    
    **Parameters:**
    - **text**: Text to convert to speech (max 5000 characters)
    - **target_language**: Target language for speech output
    - **slow**: Use slower, clearer speech (recommended for deaf learners)
    
    **Returns:**
    - Base64 encoded audio (MP3 format)
    - Or audio URL (if file-based response is enabled)
    
    **Features:**
    - Intelligent caching (repeated phrases return instantly)
    - Natural-sounding voices
    - Language-specific accents (TLD variants)
    """
    try:
        logger.info(f"Processing text-to-speech: '{request.text[:50]}...' in {request.target_language}")
        
        if not request.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        # Limit text length
        if len(request.text) > 5000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text too long (max 5000 characters)"
            )
        
        # Get TTS service
        tts_service = get_tts_service()
        
        # Synthesize speech
        result = await tts_service.synthesize(
            text=request.text,
            language=request.target_language,
            slow=slow,
            return_base64=True
        )
        
        logger.info(f"Text-to-speech successful (cached: {result.get('cached', False)})")
        
        return TextToSpeechResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in text-to-speech: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to synthesize speech"
        )


@router.get("/text-to-speech/info")
async def get_tts_info():
    """
    Get TTS service information
    
    Returns information about the TTS engine, supported languages, and cache status
    """
    try:
        tts_service = get_tts_service()
        info = tts_service.get_service_info()
        
        return {
            "success": True,
            "data": info
        }
    
    except Exception as e:
        logger.error(f"Error getting TTS info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get TTS info"
        )


@router.get("/text-to-speech/cache/stats")
async def get_cache_stats():
    """
    Get TTS cache statistics
    
    Returns cache hit rate, size, and entry count
    """
    try:
        tts_service = get_tts_service()
        stats = tts_service.get_cache_stats()
        
        return {
            "success": True,
            "data": stats
        }
    
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cache stats"
        )


@router.post("/text-to-speech/cache/clear")
async def clear_cache():
    """
    Clear TTS audio cache
    
    Removes all cached audio files to free up space
    """
    try:
        tts_service = get_tts_service()
        tts_service.clear_cache()
        
        return {
            "success": True,
            "message": "Cache cleared successfully"
        }
    
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache"
        )
