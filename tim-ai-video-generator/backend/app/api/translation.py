from fastapi import APIRouter, HTTPException, status, Body
import logging
from typing import List, Tuple

from app.models import TranslationRequest, TranslationResponse, ErrorResponse
from app.services.translator import get_translation_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/translate",
    response_model=TranslationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def translate(request: TranslationRequest):
    """
    Translate text between languages
    
    **Supports 5 languages:**
    - German (de)
    - English (en)
    - Spanish (es)
    - French (fr)
    - Arabic (ar)
    
    **Parameters:**
    - **text**: Text to translate (max 5000 characters)
    - **source_lang**: Source language
    - **target_lang**: Target language
    
    **Returns:**
    - Translated text
    - Source and target languages
    - Cache status
    - Backend used (argos or mock)
    
    **Features:**
    - Offline translation with Argos Translate
    - Intelligent caching for repeated translations
    - Automatic pivot translation through English
    - Fallback to mock for unsupported pairs
    """
    try:
        logger.info(f"Translating from {request.source_lang} to {request.target_lang}")
        
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
        
        # Get translation service
        translation_service = get_translation_service()
        
        # Translate
        result = await translation_service.translate(
            text=request.text,
            source_lang=request.source_lang,
            target_lang=request.target_lang
        )
        
        logger.info(f"Translation successful (cached: {result.get('cached', False)})")
        
        return TranslationResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in translation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to translate text"
        )


@router.get("/translate/info")
async def get_translation_info():
    """
    Get translation service information
    
    Returns information about the translation backend, supported languages, and cache status
    """
    try:
        translation_service = get_translation_service()
        info = translation_service.get_service_info()
        
        return {
            "success": True,
            "data": info
        }
    
    except Exception as e:
        logger.error(f"Error getting translation info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get translation info"
        )


@router.get("/translate/language-pairs")
async def get_language_pairs():
    """
    Get list of supported language pairs
    
    Returns all available translation pairs (e.g., de->en, en->es)
    """
    try:
        translation_service = get_translation_service()
        pairs = translation_service.get_supported_language_pairs()
        
        return {
            "success": True,
            "data": {
                "pairs": pairs,
                "count": len(pairs)
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting language pairs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get language pairs"
        )


@router.get("/translate/cache/stats")
async def get_cache_stats():
    """
    Get translation cache statistics
    
    Returns cache hit rate, entry count, and total translations
    """
    try:
        translation_service = get_translation_service()
        stats = translation_service.get_cache_stats()
        
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


@router.post("/translate/cache/clear")
async def clear_cache():
    """
    Clear translation cache
    
    Removes all cached translations to free up space
    """
    try:
        translation_service = get_translation_service()
        translation_service.clear_cache()
        
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


@router.post("/translate/install-package")
async def install_language_package(
    source_code: str = Body(..., description="Source language code (e.g., 'de')"),
    target_code: str = Body(..., description="Target language code (e.g., 'en')")
):
    """
    Install Argos Translate language package
    
    Downloads and installs a language package for offline translation.
    Only works if Argos Translate is available.
    
    **Parameters:**
    - **source_code**: Source language code (de, en, es, fr, ar)
    - **target_code**: Target language code (de, en, es, fr, ar)
    """
    try:
        translation_service = get_translation_service()
        
        success = translation_service.install_language_package(source_code, target_code)
        
        if success:
            return {
                "success": True,
                "message": f"Language package {source_code}->{target_code} installed successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to install package {source_code}->{target_code}"
            )
    
    except Exception as e:
        logger.error(f"Error installing language package: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to install language package"
        )
