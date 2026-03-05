from fastapi import APIRouter, HTTPException, status, Body, Depends
import logging
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import TextToSignRequest, TextToSignResponse, ErrorResponse
from app.services.avatar import get_avatar_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/text-to-sign",
    response_model=TextToSignResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def text_to_sign(
    request: TextToSignRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Convert text to sign language animation
    
    **Generates 3D avatar animations in Three.js format**
    
    **Parameters:**
    - **text**: Text to convert to sign language (max 500 characters)
    - **source_language**: Source language of the text
    - **sign_language**: Target sign language (currently only DGS supported)
    
    **Returns:**
    - Animation data (Three.js AnimationClip format)
    - Keyframes for each bone/joint
    - Duration and timing information
    
    **Features:**
    - Word-by-word animation sequencing
    - Smooth transitions between signs
    - Automatic pauses between words
    - Finger spelling for unknown words (planned)
    
    **Note:** Currently supports basic German Sign Language (DGS) signs.
    More signs can be added via the `/text-to-sign/sign` endpoint.
    """
    try:
        logger.info(f"Processing text-to-sign: '{request.text[:50]}...'")
        
        if not request.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        # Limit text length
        if len(request.text) > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text too long (max 500 characters)"
            )
        
        # Get avatar service
        avatar_service = get_avatar_service()
        
        # Generate animation
        result = await avatar_service.text_to_animation(
            text=request.text,
            language=request.source_language,
            sign_language=request.sign_language,
            db=db,
        )
        
        logger.info(f"Animation generated successfully (duration: {result['duration']:.2f}s)")
        
        # Map to response format
        return TextToSignResponse(
            animation_data=result.get("animation"),
            video_url=result.get("video_url"),
            sign_language=request.sign_language,
            resolved_signs=result.get("resolved_signs", [])
        )
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in text-to-sign: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate sign language animation"
        )


@router.get("/text-to-sign/signs")
async def list_available_signs():
    """
    List all available sign language signs in the database
    
    Returns a list of sign names that can be animated
    """
    try:
        avatar_service = get_avatar_service()
        signs = avatar_service.get_available_signs()
        
        return {
            "success": True,
            "data": {
                "signs": signs,
                "count": len(signs)
            }
        }
    
    except Exception as e:
        logger.error(f"Error listing signs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list signs"
        )


@router.get("/text-to-sign/sign/{sign_name}")
async def get_sign_info(sign_name: str):
    """
    Get information about a specific sign
    
    Returns animation data, description, and duration for a sign
    """
    try:
        avatar_service = get_avatar_service()
        sign_info = avatar_service.get_sign_info(sign_name)
        
        if not sign_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sign '{sign_name}' not found"
            )
        
        return {
            "success": True,
            "data": sign_info
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sign info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sign info"
        )


@router.post("/text-to-sign/sign")
async def create_sign(
    sign_name: str = Body(..., description="Name of the sign (e.g., 'hallo')"),
    description: str = Body(..., description="Description of the sign"),
    duration: float = Body(..., description="Animation duration in seconds"),
    keyframes: List[dict] = Body(..., description="Animation keyframes")
):
    """
    Create a new sign animation and add it to the database
    
    **Parameters:**
    - **sign_name**: Unique name for the sign (lowercase)
    - **description**: Human-readable description
    - **duration**: Total animation duration (seconds)
    - **keyframes**: List of keyframe objects with time, bone, position, rotation
    
    **Example keyframe:**
    ```json
    {
      "time": 0.5,
      "bone": "rightHand",
      "position": [0.3, 1.2, -0.2],
      "rotation": [0.0, 0.0, 0.0, 1.0]
    }
    ```
    """
    try:
        avatar_service = get_avatar_service()
        
        # Validate input
        if not sign_name or not sign_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sign name cannot be empty"
            )
        
        if duration <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duration must be positive"
            )
        
        if not keyframes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Keyframes cannot be empty"
            )
        
        # Create animation data
        animation_data = {
            "name": sign_name,
            "description": description,
            "duration": duration,
            "keyframes": keyframes
        }
        
        # Save to database
        success = avatar_service.save_sign_to_database(sign_name, animation_data)
        
        if success:
            return {
                "success": True,
                "message": f"Sign '{sign_name}' created successfully",
                "data": animation_data
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save sign to database"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sign: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create sign"
        )


@router.get("/text-to-sign/info")
async def get_avatar_service_info():
    """
    Get avatar service information
    
    Returns information about the avatar system, bone structure, and capabilities
    """
    try:
        from app.ml.avatar_config import AvatarConfig
        
        return {
            "success": True,
            "data": {
                "bone_count": len(AvatarConfig.get_all_bones()),
                "primary_bones": [bone.value for bone in AvatarConfig.get_primary_bones()],
                "finger_bones_left": len(AvatarConfig.get_finger_bones("left")),
                "finger_bones_right": len(AvatarConfig.get_finger_bones("right")),
                "animation_format": "threejs",
                "supported_sign_languages": ["DGS"],  # German Sign Language
                "features": {
                    "word_by_word_animation": True,
                    "smooth_transitions": True,
                    "finger_spelling": False,  # Planned
                    "facial_expressions": False  # Planned
                }
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting avatar info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get avatar info"
        )
