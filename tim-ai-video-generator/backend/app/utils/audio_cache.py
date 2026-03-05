"""
Audio caching system for TTS
"""
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict
import json
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class AudioCache:
    """
    File-based cache for TTS audio files
    """
    
    def __init__(self, cache_dir: str = "cache/tts", max_age_days: int = 30, max_size_mb: int = 500):
        """
        Initialize audio cache
        
        Args:
            cache_dir: Directory to store cached audio
            max_age_days: Maximum age for cached files (days)
            max_size_mb: Maximum total cache size (MB)
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self.max_age = timedelta(days=max_age_days)
        self.max_size_bytes = max_size_mb * 1024 * 1024
        
        # Load or create metadata
        self.metadata = self._load_metadata()
        
        # Cleanup on init
        self._cleanup_old_entries()
    
    def _load_metadata(self) -> Dict:
        """Load cache metadata"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache metadata: {e}")
        
        return {"entries": {}, "stats": {"hits": 0, "misses": 0}}
    
    def _save_metadata(self):
        """Save cache metadata"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache metadata: {e}")
    
    def _get_cache_key(self, text: str, language: str, slow: bool = False, tld: str = "com") -> str:
        """Generate cache key from parameters"""
        key_string = f"{text}|{language}|{slow}|{tld}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(
        self,
        text: str,
        language: str,
        slow: bool = False,
        tld: str = "com"
    ) -> Optional[bytes]:
        """
        Get cached audio
        
        Args:
            text: Text that was synthesized
            language: Language code
            slow: Whether slow speech was used
            tld: TLD for language variant
            
        Returns:
            Audio bytes or None if not cached
        """
        cache_key = self._get_cache_key(text, language, slow, tld)
        
        if cache_key not in self.metadata["entries"]:
            self.metadata["stats"]["misses"] += 1
            logger.debug(f"Cache MISS for: {text[:30]}...")
            return None
        
        entry = self.metadata["entries"][cache_key]
        file_path = self.cache_dir / entry["filename"]
        
        if not file_path.exists():
            # File was deleted, remove from metadata
            del self.metadata["entries"][cache_key]
            self._save_metadata()
            self.metadata["stats"]["misses"] += 1
            return None
        
        # Check if expired
        created_at = datetime.fromisoformat(entry["created_at"])
        if datetime.now() - created_at > self.max_age:
            logger.debug(f"Cache entry expired: {cache_key}")
            self._remove_entry(cache_key)
            self.metadata["stats"]["misses"] += 1
            return None
        
        # Read and return cached audio
        try:
            with open(file_path, 'rb') as f:
                audio_data = f.read()
            
            # Update access stats
            entry["last_accessed"] = datetime.now().isoformat()
            entry["access_count"] += 1
            self.metadata["stats"]["hits"] += 1
            self._save_metadata()
            
            logger.debug(f"Cache HIT for: {text[:30]}...")
            return audio_data
        
        except Exception as e:
            logger.error(f"Error reading cached audio: {e}")
            return None
    
    def put(
        self,
        audio_data: bytes,
        text: str,
        language: str,
        slow: bool = False,
        tld: str = "com"
    ):
        """
        Cache audio data
        
        Args:
            audio_data: Audio bytes to cache
            text: Original text
            language: Language code
            slow: Whether slow speech was used
            tld: TLD for language variant
        """
        cache_key = self._get_cache_key(text, language, slow, tld)
        filename = f"{cache_key}.mp3"
        file_path = self.cache_dir / filename
        
        try:
            # Write audio file
            with open(file_path, 'wb') as f:
                f.write(audio_data)
            
            # Add metadata
            self.metadata["entries"][cache_key] = {
                "filename": filename,
                "text": text[:100],  # Store first 100 chars
                "language": language,
                "slow": slow,
                "tld": tld,
                "size": len(audio_data),
                "created_at": datetime.now().isoformat(),
                "last_accessed": datetime.now().isoformat(),
                "access_count": 0
            }
            
            self._save_metadata()
            
            # Check and enforce size limit
            self._enforce_size_limit()
            
            logger.debug(f"Cached audio for: {text[:30]}...")
        
        except Exception as e:
            logger.error(f"Error caching audio: {e}")
    
    def _remove_entry(self, cache_key: str):
        """Remove cache entry"""
        if cache_key in self.metadata["entries"]:
            entry = self.metadata["entries"][cache_key]
            file_path = self.cache_dir / entry["filename"]
            
            if file_path.exists():
                file_path.unlink()
            
            del self.metadata["entries"][cache_key]
    
    def _cleanup_old_entries(self):
        """Remove expired entries"""
        to_remove = []
        
        for cache_key, entry in self.metadata["entries"].items():
            created_at = datetime.fromisoformat(entry["created_at"])
            if datetime.now() - created_at > self.max_age:
                to_remove.append(cache_key)
        
        for cache_key in to_remove:
            self._remove_entry(cache_key)
        
        if to_remove:
            self._save_metadata()
            logger.info(f"Removed {len(to_remove)} expired cache entries")
    
    def _enforce_size_limit(self):
        """Enforce cache size limit using LRU strategy"""
        total_size = sum(entry["size"] for entry in self.metadata["entries"].values())
        
        if total_size <= self.max_size_bytes:
            return
        
        # Sort by last accessed (LRU)
        entries = [
            (key, entry)
            for key, entry in self.metadata["entries"].items()
        ]
        entries.sort(key=lambda x: x[1]["last_accessed"])
        
        # Remove oldest until under limit
        while total_size > self.max_size_bytes and entries:
            cache_key, entry = entries.pop(0)
            total_size -= entry["size"]
            self._remove_entry(cache_key)
            logger.debug(f"Evicted cache entry (LRU): {entry['text'][:30]}...")
        
        self._save_metadata()
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total_size = sum(entry["size"] for entry in self.metadata["entries"].values())
        total_requests = self.metadata["stats"]["hits"] + self.metadata["stats"]["misses"]
        hit_rate = self.metadata["stats"]["hits"] / total_requests if total_requests > 0 else 0
        
        return {
            "entries": len(self.metadata["entries"]),
            "total_size_mb": total_size / (1024 * 1024),
            "max_size_mb": self.max_size_bytes / (1024 * 1024),
            "hits": self.metadata["stats"]["hits"],
            "misses": self.metadata["stats"]["misses"],
            "hit_rate": hit_rate,
            "max_age_days": self.max_age.days
        }
    
    def clear(self):
        """Clear all cache entries"""
        for cache_key in list(self.metadata["entries"].keys()):
            self._remove_entry(cache_key)
        
        self.metadata = {"entries": {}, "stats": {"hits": 0, "misses": 0}}
        self._save_metadata()
        logger.info("Cache cleared")


# Global cache instance
_audio_cache: Optional[AudioCache] = None


def get_audio_cache() -> AudioCache:
    """Get global audio cache instance"""
    global _audio_cache
    if _audio_cache is None:
        _audio_cache = AudioCache()
    return _audio_cache

