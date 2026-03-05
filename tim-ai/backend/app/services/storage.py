"""
File storage service for video uploads and management
"""
import os
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import logging
from fastapi import UploadFile, HTTPException, status
import aiofiles

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Handle file upload, storage, and retrieval"""
    
    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.videos_dir = self.upload_dir / "videos"
        self.audios_dir = self.upload_dir / "audio"
        self.frames_dir = self.upload_dir / "frames"
        self.models_dir = Path(settings.models_dir)
        
        # Create directories if they don't exist
        self.videos_dir.mkdir(parents=True, exist_ok=True)
        self.audios_dir.mkdir(parents=True, exist_ok=True)
        self.frames_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    async def upload_video(
        self, 
        file: UploadFile, 
        user_id: int,
        max_size_mb: int = 50
    ) -> dict:
        """
        Upload and save a video file
        
        Args:
            file: Video file from request
            user_id: ID of user uploading
            max_size_mb: Maximum file size in MB
            
        Returns:
            dict with file_id, file_path, size, etc.
        """
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        # Check file extension
        allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed. Allowed: {allowed_extensions}"
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"user_{user_id}_{timestamp}{file_ext}"
        file_path = self.videos_dir / unique_filename
        
        # Save file with size check
        total_size = 0
        max_size_bytes = max_size_mb * 1024 * 1024
        
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                while chunk := await file.read(8192):  # 8KB chunks
                    total_size += len(chunk)
                    if total_size > max_size_bytes:
                        # Remove partial file
                        await f.close()
                        file_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File too large. Maximum size: {max_size_mb}MB"
                        )
                    await f.write(chunk)
        except Exception as e:
            # Clean up on error
            file_path.unlink(missing_ok=True)
            logger.error(f"Error uploading file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file: {str(e)}"
            )
        
        logger.info(f"Video uploaded: {unique_filename} ({total_size / 1024 / 1024:.2f} MB)")
        
        return {
            "file_id": unique_filename.replace(file_ext, ""),
            "file_name": unique_filename,
            "file_path": str(file_path),
            "size_bytes": total_size,
            "size_mb": round(total_size / 1024 / 1024, 2),
            "extension": file_ext,
            "uploaded_at": datetime.now().isoformat(),
            "user_id": user_id
        }
    
    async def get_video(self, file_name: str) -> Path:
        """
        Get video file path
        
        Args:
            file_name: Name of the video file
            
        Returns:
            Path object to the file
        """
        file_path = self.videos_dir / file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video file not found: {file_name}"
            )
        
        return file_path
    
    async def delete_video(self, file_name: str) -> bool:
        """
        Delete a video file
        
        Args:
            file_name: Name of the video file
            
        Returns:
            True if deleted successfully
        """
        file_path = self.videos_dir / file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video file not found: {file_name}"
            )
        
        try:
            file_path.unlink()
            logger.info(f"Video deleted: {file_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting video: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting file: {str(e)}"
            )
    
    async def list_videos(self, user_id: Optional[int] = None) -> List[dict]:
        """
        List all videos, optionally filtered by user
        
        Args:
            user_id: Optional user ID to filter by
            
        Returns:
            List of video info dicts
        """
        videos = []
        pattern = f"user_{user_id}_*" if user_id else "*"
        
        for file_path in self.videos_dir.glob(pattern):
            if file_path.is_file():
                stat = file_path.stat()
                videos.append({
                    "file_name": file_path.name,
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / 1024 / 1024, 2),
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return sorted(videos, key=lambda x: x['created_at'], reverse=True)
    
    def get_storage_stats(self) -> dict:
        """Get storage statistics"""
        total_size = 0
        video_count = 0
        
        for file_path in self.videos_dir.glob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size
                video_count += 1
        
        return {
            "total_videos": video_count,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "total_size_gb": round(total_size / 1024 / 1024 / 1024, 2),
            "upload_dir": str(self.upload_dir),
            "videos_dir": str(self.videos_dir)
        }
    
    async def cleanup_old_files(self, days: int = 7):
        """
        Clean up files older than specified days
        
        Args:
            days: Delete files older than this many days
        """
        cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
        deleted_count = 0
        freed_space = 0
        
        for file_path in self.videos_dir.glob("*"):
            if file_path.is_file():
                if file_path.stat().st_mtime < cutoff_time:
                    size = file_path.stat().st_size
                    file_path.unlink()
                    deleted_count += 1
                    freed_space += size
        
        logger.info(
            f"Cleanup: Deleted {deleted_count} files, "
            f"freed {freed_space / 1024 / 1024:.2f} MB"
        )
        
        return {
            "deleted_count": deleted_count,
            "freed_space_mb": round(freed_space / 1024 / 1024, 2)
        }
    
    async def upload_audio(
        self,
        audio_data: bytes,
        user_id: int = 0,
        file_extension: str = ".m4a",
        max_size_mb: int = 10
    ) -> dict:
        """
        Upload and save an audio file from base64 data
        
        Args:
            audio_data: Audio file bytes (decoded from base64)
            user_id: ID of user uploading (0 for anonymous)
            file_extension: File extension (.m4a, .mp3, .wav, etc.)
            max_size_mb: Maximum file size in MB
            
        Returns:
            dict with file_id, file_path, size, etc.
        """
        # Validate file size
        total_size = len(audio_data)
        max_size_bytes = max_size_mb * 1024 * 1024
        
        if total_size > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {max_size_mb}MB"
            )
        
        # Validate file extension
        allowed_extensions = {'.m4a', '.mp3', '.wav', '.aac', '.ogg', '.flac', '.wma'}
        file_ext = file_extension.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed. Allowed: {allowed_extensions}"
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if user_id > 0:
            unique_filename = f"user_{user_id}_{timestamp}{file_ext}"
        else:
            unique_filename = f"anon_{timestamp}{file_ext}"
        file_path = self.audios_dir / unique_filename
        
        # Save file
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(audio_data)
        except Exception as e:
            # Clean up on error
            file_path.unlink(missing_ok=True)
            logger.error(f"Error uploading audio file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file: {str(e)}"
            )
        
        logger.info(f"Audio uploaded: {unique_filename} ({total_size / 1024 / 1024:.2f} MB)")
        
        return {
            "file_id": unique_filename.replace(file_ext, ""),
            "file_name": unique_filename,
            "file_path": str(file_path),
            "size_bytes": total_size,
            "size_mb": round(total_size / 1024 / 1024, 2),
            "extension": file_ext,
            "uploaded_at": datetime.now().isoformat(),
            "user_id": user_id
        }


# Singleton instance
storage_service = StorageService()

