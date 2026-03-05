"""
Audio upload and management API endpoints
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pathlib import Path
from datetime import datetime
import base64
import aiofiles
import logging

from app.database import get_db
from app.db_models import User
from app.auth.dependencies import get_current_active_user
from app.auth.utils import decode_token
from app.services.storage import storage_service
from app.utils.file_handler import validate_audio_file
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_audio(
    request: Request,
    audio_data: str = Form(...),  # Base64 encoded audio
    file_extension: str = Form(".m4a"),  # File extension
):
    """
    Upload an audio file from base64 data
    
    **Parameters:**
    - audio_data: Base64 encoded audio data
    - file_extension: File extension (.m4a, .mp3, .wav, etc.)
    - max size: 10MB
    
    **Returns:**
    - file_id: Unique identifier
    - file_name: Stored filename
    - size_mb: File size in MB
    """
    # Determine user (optional). If no valid token, proceed as anonymous
    user_id_for_storage = 0
    try:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id_for_storage = int(payload.get("sub") or 0)
        logger.info(f"Audio upload auth header present: {bool(auth_header)}; resolved user_id={user_id_for_storage}")
    except Exception as e:
        logger.warning(f"Auth header parse error: {e}")
    
    # Validate file extension
    if not validate_audio_file(f"audio{file_extension}"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid audio file type: {file_extension}"
        )
    
    # Decode base64 audio data
    try:
        # Remove data URI prefix if present (data:audio/m4a;base64,...)
        if ';base64,' in audio_data:
            audio_data = audio_data.split(';base64,')[1]
        elif ',' in audio_data and audio_data.startswith('data:'):
            audio_data = audio_data.split(',')[1]
        
        audio_bytes = base64.b64decode(audio_data)
    except Exception as e:
        logger.error(f"Error decoding base64 audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 audio data"
        )
    
    # Upload file
    try:
        upload_result = await storage_service.upload_audio(
            audio_data=audio_bytes,
            user_id=user_id_for_storage,
            file_extension=file_extension
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading audio: {str(e)}"
        )
    
    logger.info(f"Audio uploaded by user {user_id_for_storage}: {upload_result['file_name']}")
    
    return {
        "success": True,
        "message": "Audio uploaded successfully",
        "data": upload_result
    }


@router.post("/upload-file", status_code=status.HTTP_201_CREATED)
async def upload_audio_file(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Upload an audio file directly (multipart/form-data)
    
    **Parameters:**
    - file: Audio file (m4a, mp3, wav, aac, ogg, flac, wma)
    - max size: 10MB
    
    **Returns:**
    - file_id: Unique identifier
    - file_name: Stored filename
    - size_mb: File size in MB
    """
    # Determine user (optional)
    user_id_for_storage = 0
    try:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id_for_storage = int(payload.get("sub") or 0)
    except Exception as e:
        logger.warning(f"Auth header parse error: {e}")
    
    # Validate file type
    if not validate_audio_file(file.filename or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio file type"
        )
    
    # Get file extension
    file_ext = Path(file.filename or "audio.m4a").suffix.lower()
    
    # Read file content
    total_size = 0
    max_size_bytes = 10 * 1024 * 1024  # 10MB
    audio_bytes = b""
    
    try:
        while chunk := await file.read(8192):
            total_size += len(chunk)
            if total_size > max_size_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large. Maximum size: 10MB"
                )
            audio_bytes += chunk
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading audio file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Upload file
    try:
        upload_result = await storage_service.upload_audio(
            audio_data=audio_bytes,
            user_id=user_id_for_storage,
            file_extension=file_ext
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading audio: {str(e)}"
        )
    
    logger.info(f"Audio file uploaded by user {user_id_for_storage}: {upload_result['file_name']}")
    
    return {
        "success": True,
        "message": "Audio uploaded successfully",
        "data": upload_result
    }


@router.get("/{file_name}")
async def get_audio(
    file_name: str,
    user: User = Depends(get_current_active_user)
):
    """
    Get audio file
    
    **Parameters:**
    - file_name: Name of the audio file
    
    **Returns:**
    - Audio file stream
    """
    # Check if user owns this audio (basic security)
    if not file_name.startswith(f"user_{user.id}_") and not file_name.startswith("anon_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this audio file"
        )
    
    file_path = storage_service.audios_dir / file_name
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file not found: {file_name}"
        )
    
    # Determine content type based on extension
    file_ext = Path(file_name).suffix.lower()
    content_types = {
        '.m4a': 'audio/mp4',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac',
        '.wma': 'audio/x-ms-wma',
    }
    media_type = content_types.get(file_ext, 'audio/mpeg')
    
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=file_name
    )


@router.delete("/{file_name}")
async def delete_audio(
    file_name: str,
    user: User = Depends(get_current_active_user)
):
    """
    Delete an audio file
    
    **Parameters:**
    - file_name: Name of the audio file
    
    **Returns:**
    - Success message
    """
    # Check if user owns this audio
    if not file_name.startswith(f"user_{user.id}_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this audio file"
        )
    
    file_path = storage_service.audios_dir / file_name
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file not found: {file_name}"
        )
    
    try:
        file_path.unlink()
        logger.info(f"Audio deleted: {file_name}")
    except Exception as e:
        logger.error(f"Error deleting audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file: {str(e)}"
        )
    
    return {
        "success": True,
        "message": "Audio deleted successfully"
    }

