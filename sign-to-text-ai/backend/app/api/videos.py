"""
Video upload and management API endpoints
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import aiofiles

from app.database import get_db
from app.db_models import User
from app.auth.dependencies import get_current_active_user
from app.auth.utils import decode_token
from app.services.storage import storage_service
from app.services.video_processor import video_processor
from app.services.sign_recognition import SignRecognitionService
from app.utils.file_handler import validate_video_file
from app.models import Language
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    user: User = Depends(get_current_active_user)
):
    """
    Upload a video file
    
    **Parameters:**
    - file: Video file (mp4, avi, mov, mkv, webm)
    - max size: 50MB
    
    **Returns:**
    - file_id: Unique identifier
    - file_name: Stored filename
    - size_mb: File size in MB
    - metadata: Video metadata (resolution, fps, duration)
    """
    # Validate file type
    if not validate_video_file(file.filename or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video file type"
        )
    
    # Upload file
    upload_result = await storage_service.upload_video(
        file=file,
        user_id=user.id
    )
    
    # Extract metadata
    try:
        metadata = video_processor.get_video_metadata(upload_result['file_path'])
        upload_result['metadata'] = {
            'width': metadata.width,
            'height': metadata.height,
            'fps': metadata.fps,
            'frame_count': metadata.frame_count,
            'duration_seconds': metadata.duration_seconds,
            'codec': metadata.codec
        }
    except Exception as e:
        logger.error(f"Error extracting video metadata: {e}")
        upload_result['metadata'] = None
    
    logger.info(f"Video uploaded by user {user.id}: {upload_result['file_name']}")
    
    return {
        "success": True,
        "message": "Video uploaded successfully",
        "data": upload_result
    }


@router.get("/list")
async def list_videos(
    user: User = Depends(get_current_active_user)
):
    """
    List all videos for current user
    
    **Returns:**
    - List of video information
    """
    videos = await storage_service.list_videos(user_id=user.id)
    
    return {
        "success": True,
        "count": len(videos),
        "data": videos
    }


@router.get("/{file_name}")
async def get_video(
    file_name: str,
    user: User = Depends(get_current_active_user)
):
    """
    Get video file
    
    **Parameters:**
    - file_name: Name of the video file
    
    **Returns:**
    - Video file stream
    """
    # Check if user owns this video (basic security)
    if not file_name.startswith(f"user_{user.id}_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this video"
        )
    
    file_path = await storage_service.get_video(file_name)
    
    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=file_name
    )


@router.delete("/{file_name}")
async def delete_video(
    file_name: str,
    user: User = Depends(get_current_active_user)
):
    """
    Delete a video file
    
    **Parameters:**
    - file_name: Name of the video file
    
    **Returns:**
    - Success message
    """
    # Check if user owns this video
    if not file_name.startswith(f"user_{user.id}_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this video"
        )
    
    await storage_service.delete_video(file_name)
    
    return {
        "success": True,
        "message": "Video deleted successfully"
    }


@router.post("/{file_name}/extract-frames")
async def extract_frames(
    file_name: str,
    target_fps: Optional[float] = None,
    max_frames: Optional[int] = None,
    user: User = Depends(get_current_active_user)
):
    """
    Extract frames from video
    
    **Parameters:**
    - file_name: Name of the video file
    - target_fps: Target FPS for extraction (optional)
    - max_frames: Maximum frames to extract (optional)
    
    **Returns:**
    - Frame count and extraction info
    """
    # Check if user owns this video
    if not file_name.startswith(f"user_{user.id}_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this video"
        )
    
    file_path = await storage_service.get_video(file_name)
    
    # Extract frames
    frames = video_processor.extract_frames_list(
        file_path,
        target_fps=target_fps,
        max_frames=max_frames
    )
    
    return {
        "success": True,
        "frame_count": len(frames),
        "target_fps": target_fps,
        "max_frames": max_frames,
        "message": f"Extracted {len(frames)} frames"
    }


@router.get("/{file_name}/metadata")
async def get_video_metadata(
    file_name: str,
    user: User = Depends(get_current_active_user)
):
    """
    Get video metadata
    
    **Parameters:**
    - file_name: Name of the video file
    
    **Returns:**
    - Detailed video metadata
    """
    # Check if user owns this video
    if not file_name.startswith(f"user_{user.id}_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this video"
        )
    
    file_path = await storage_service.get_video(file_name)
    metadata = video_processor.get_video_metadata(file_path)
    
    return {
        "success": True,
        "data": {
            "width": metadata.width,
            "height": metadata.height,
            "fps": metadata.fps,
            "frame_count": metadata.frame_count,
            "duration_seconds": metadata.duration_seconds,
            "codec": metadata.codec,
            "size_mb": metadata.size_mb
        }
    }


@router.post("/upload-and-process")
async def upload_and_process_video(
    request: Request,
    file: UploadFile = File(...),
    output_language: str = Form("en"),  # Output language code (en, de, etc.)
):
    """
    Upload video to uploads folder and process for sign-to-text with output language
    
    **Parameters:**
    - file: Video file (mp4, avi, mov, mkv, webm)
    - output_language: Target language for output (en, de, es, fr, ar)
    - max size: 50MB
    
    **Returns:**
    - Recognized text with confidence
    - Language information
    """
    # Debug: log auth header presence
    # Determine user (optional). If no valid token, proceed as anonymous
    user_id_for_storage = 0
    try:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id_for_storage = int(payload.get("sub") or 0)
        logger.info(f"Upload auth header present: {bool(auth_header)}; resolved user_id={user_id_for_storage}")
    except Exception as e:
        logger.warning(f"Auth header parse error: {e}")

    # Validate file type
    if not validate_video_file(file.filename or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video file type"
        )
    
    # Validate output language
    try:
        target_lang = Language(output_language.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid output language: {output_language}. Supported: en, de, es, fr, ar"
        )
    
    # Save file to uploads/videos directory (create if missing)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_filename = file.filename or "video.mp4"
    file_ext = Path(original_filename).suffix.lower()
    stored_filename = (
        f"user_{user_id_for_storage}_{timestamp}{file_ext}" if user_id_for_storage else f"anon_{timestamp}{file_ext}"
    )
    
    videos_dir = storage_service.videos_dir
    videos_dir.mkdir(parents=True, exist_ok=True)
    stored_file_path = videos_dir / stored_filename
    
    # Save file to uploads/videos folder
    total_size = 0
    max_size_bytes = 50 * 1024 * 1024  # 50MB
    
    try:
        async with aiofiles.open(stored_file_path, 'wb') as f:
            while chunk := await file.read(8192):
                total_size += len(chunk)
                if total_size > max_size_bytes:
                    stored_file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File too large. Maximum size: 50MB"
                    )
                await f.write(chunk)
    except Exception as e:
        stored_file_path.unlink(missing_ok=True)
        logger.error(f"Error saving uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )
    
    logger.info(f"Video saved: {stored_filename} by user_id {user_id_for_storage}")

    # Process video: Extract frames and run sign recognition
    try:
        # Extract frames from video (sample uniformly for sign recognition)
        frames = video_processor.sample_frames_uniform(
            stored_file_path,
            num_frames=16  # Standard number for 3D CNN models
        )
        
        if not frames:
            raise ValueError("No frames extracted from video")
        
        logger.info(f"Extracted {len(frames)} frames from video")
        
        # Convert frames to base64 for sign recognition service
        import base64
        import io
        from PIL import Image
        
        base64_frames = []
        for frame in frames:
            # Convert numpy array to PIL Image
            img = Image.fromarray(frame)
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            img_bytes = buffer.getvalue()
            base64_frame = base64.b64encode(img_bytes).decode('utf-8')
            base64_frames.append(base64_frame)
        
        # Run sign recognition
        sign_recognition_service = SignRecognitionService()
        recognition_result = await sign_recognition_service.recognize_signs(
            frames=base64_frames,
            sign_language="DGS"
        )
        
        recognized_text = recognition_result.get('text', '')
        confidence = recognition_result.get('confidence', 0.0)
        
        # Translate if needed (if output language is different from recognized language)
        # For now, recognized text is in German (DGS -> German)
        # If output language is not German, translate
        final_text = recognized_text
        if target_lang != Language.GERMAN and recognized_text:
            try:
                from app.services.translator import get_translation_service
                translation_service = get_translation_service()
                translation_result = await translation_service.translate(
                    text=recognized_text,
                    source_lang="de",
                    target_lang=target_lang.value
                )
                final_text = translation_result.get('translated_text', recognized_text)
            except Exception as e:
                logger.warning(f"Translation failed: {e}, using original text")
                final_text = recognized_text
        
        logger.info(f"Sign recognition successful: '{final_text}' (confidence: {confidence:.2%})")
        
        return {
            "success": True,
            "message": "Video processed successfully",
            "text": final_text,
            "confidence": confidence,
            "language": target_lang.value,
            "source_sign_language": "DGS",
            "data": {
                "stored_file": stored_filename,
                "file_path": str(stored_file_path),
                "size_bytes": total_size,
                "size_mb": round(total_size / 1024 / 1024, 2),
                "user_id": user_id_for_storage,
                "output_language": target_lang.value,
                "frames_extracted": len(frames),
                "original_text": recognized_text,
            },
        }
    
    except Exception as e:
        logger.error(f"Error processing video: {e}", exc_info=True)
        # Return error but keep the uploaded file
        return {
            "success": False,
            "message": f"Video uploaded but processing failed: {str(e)}",
            "text": "",
            "confidence": 0.0,
            "language": target_lang.value,
            "source_sign_language": "DGS",
            "data": {
                "stored_file": stored_filename,
                "file_path": str(stored_file_path),
                "size_bytes": total_size,
                "size_mb": round(total_size / 1024 / 1024, 2),
                "user_id": user_id_for_storage,
                "output_language": target_lang.value,
                "error": str(e),
            },
        }


@router.get("/stats/storage")
async def get_storage_stats(
    user: User = Depends(get_current_active_user)
):
    """
    Get storage statistics
    
    **Returns:**
    - Storage usage information
    """
    stats = storage_service.get_storage_stats()
    
    return {
        "success": True,
        "data": stats
    }

