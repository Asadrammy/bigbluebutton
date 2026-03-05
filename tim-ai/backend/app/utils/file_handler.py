"""
File handling utilities
"""
import os
import hashlib
import mimetypes
from pathlib import Path
from typing import Optional
from datetime import datetime
import uuid


def validate_video_file(filename: str, content: Optional[bytes] = None) -> bool:
    """
    Validate if file is a valid video
    
    Args:
        filename: Name of the file
        content: Optional file content for MIME type detection
        
    Returns:
        True if valid video file
    """
    # Check extension
    allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'}
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        return False
    
    # Check MIME type if content provided
    if content:
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type and not mime_type.startswith('video/'):
            return False
    
    return True


def validate_image_file(filename: str) -> bool:
    """
    Validate if file is a valid image
    
    Args:
        filename: Name of the file
        
    Returns:
        True if valid image file
    """
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    file_ext = Path(filename).suffix.lower()
    return file_ext in allowed_extensions


def validate_audio_file(filename: str, content: Optional[bytes] = None) -> bool:
    """
    Validate if file is a valid audio file
    
    Args:
        filename: Name of the file
        content: Optional file content for MIME type detection
        
    Returns:
        True if valid audio file
    """
    # Check extension
    allowed_extensions = {'.m4a', '.mp3', '.wav', '.aac', '.ogg', '.flac', '.wma', '.opus'}
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        return False
    
    # Check MIME type if content provided
    if content:
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type and not mime_type.startswith('audio/'):
            return False
    
    return True


def get_file_extension(filename: str) -> str:
    """
    Get file extension
    
    Args:
        filename: Name of the file
        
    Returns:
        File extension (e.g., '.mp4')
    """
    return Path(filename).suffix.lower()


def generate_unique_filename(
    original_filename: str,
    user_id: Optional[int] = None,
    prefix: str = ""
) -> str:
    """
    Generate unique filename
    
    Args:
        original_filename: Original file name
        user_id: Optional user ID to include
        prefix: Optional prefix
        
    Returns:
        Unique filename
    """
    file_ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    
    parts = [prefix] if prefix else []
    if user_id:
        parts.append(f"user_{user_id}")
    parts.extend([timestamp, unique_id])
    
    filename = "_".join(parts) + file_ext
    return filename


def calculate_file_hash(file_path: str | Path, algorithm: str = 'md5') -> str:
    """
    Calculate hash of file
    
    Args:
        file_path: Path to file
        algorithm: Hash algorithm (md5, sha256, etc.)
        
    Returns:
        Hex digest of file hash
    """
    hash_obj = hashlib.new(algorithm)
    
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192):
            hash_obj.update(chunk)
    
    return hash_obj.hexdigest()


def get_file_size(file_path: str | Path) -> dict:
    """
    Get file size in various units
    
    Args:
        file_path: Path to file
        
    Returns:
        Dict with size in bytes, KB, MB, GB
    """
    size_bytes = Path(file_path).stat().st_size
    
    return {
        'bytes': size_bytes,
        'kb': round(size_bytes / 1024, 2),
        'mb': round(size_bytes / (1024 * 1024), 2),
        'gb': round(size_bytes / (1024 * 1024 * 1024), 2)
    }


def cleanup_old_files(
    directory: str | Path,
    days: int = 7,
    pattern: str = "*",
    dry_run: bool = False
) -> dict:
    """
    Delete files older than specified days
    
    Args:
        directory: Directory to clean
        days: Delete files older than this
        pattern: Glob pattern for files
        dry_run: If True, don't actually delete
        
    Returns:
        Dict with cleanup statistics
    """
    directory = Path(directory)
    cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
    
    deleted_count = 0
    freed_space = 0
    files_to_delete = []
    
    for file_path in directory.glob(pattern):
        if file_path.is_file():
            if file_path.stat().st_mtime < cutoff_time:
                size = file_path.stat().st_size
                files_to_delete.append(str(file_path))
                
                if not dry_run:
                    file_path.unlink()
                
                deleted_count += 1
                freed_space += size
    
    return {
        'deleted_count': deleted_count,
        'freed_space_mb': round(freed_space / (1024 * 1024), 2),
        'files': files_to_delete if dry_run else []
    }


def ensure_directory(directory: str | Path) -> Path:
    """
    Ensure directory exists, create if not
    
    Args:
        directory: Directory path
        
    Returns:
        Path object
    """
    dir_path = Path(directory)
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def is_path_safe(file_path: str | Path, base_directory: str | Path) -> bool:
    """
    Check if file path is safe (no path traversal)
    
    Args:
        file_path: File path to check
        base_directory: Base directory that should contain the file
        
    Returns:
        True if path is safe
    """
    try:
        file_path = Path(file_path).resolve()
        base_directory = Path(base_directory).resolve()
        
        # Check if file_path is within base_directory
        return str(file_path).startswith(str(base_directory))
    except (ValueError, OSError):
        return False


def get_directory_size(directory: str | Path) -> dict:
    """
    Calculate total size of directory
    
    Args:
        directory: Directory path
        
    Returns:
        Dict with total size and file count
    """
    directory = Path(directory)
    total_size = 0
    file_count = 0
    
    for file_path in directory.rglob("*"):
        if file_path.is_file():
            total_size += file_path.stat().st_size
            file_count += 1
    
    return {
        'total_files': file_count,
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'total_size_gb': round(total_size / (1024 * 1024 * 1024), 2)
    }

