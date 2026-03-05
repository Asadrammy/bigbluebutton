"""
Translation caching system
"""
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Tuple
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TranslationCache:
    """
    Cache for translation results
    """
    
    def __init__(
        self,
        cache_dir: str = "cache/translations",
        max_age_days: int = 90,
        max_entries: int = 10000
    ):
        """
        Initialize translation cache
        
        Args:
            cache_dir: Directory to store cached translations
            max_age_days: Maximum age for cached translations (days)
            max_entries: Maximum number of cache entries
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.cache_dir / "translations.json"
        self.max_age = timedelta(days=max_age_days)
        self.max_entries = max_entries
        
        # Load cache
        self.cache = self._load_cache()
    
    def _load_cache(self) -> Dict:
        """Load cache from file"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    logger.info(f"Loaded {len(data.get('entries', {}))} cached translations")
                    return data
            except Exception as e:
                logger.warning(f"Failed to load translation cache: {e}")
        
        return {
            "entries": {},
            "stats": {
                "hits": 0,
                "misses": 0,
                "total_translations": 0
            }
        }
    
    def _save_cache(self):
        """Save cache to file"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save translation cache: {e}")
    
    def _get_cache_key(self, text: str, source_lang: str, target_lang: str) -> str:
        """Generate cache key"""
        # Normalize text (lowercase, strip whitespace)
        normalized_text = text.lower().strip()
        key_string = f"{normalized_text}|{source_lang}|{target_lang}"
        return hashlib.md5(key_string.encode('utf-8')).hexdigest()
    
    def get(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> Optional[str]:
        """
        Get cached translation
        
        Args:
            text: Source text
            source_lang: Source language code
            target_lang: Target language code
            
        Returns:
            Translated text or None if not cached
        """
        cache_key = self._get_cache_key(text, source_lang, target_lang)
        
        if cache_key not in self.cache["entries"]:
            self.cache["stats"]["misses"] += 1
            logger.debug(f"Cache MISS for: {text[:30]}...")
            return None
        
        entry = self.cache["entries"][cache_key]
        
        # Check if expired
        created_at = datetime.fromisoformat(entry["created_at"])
        if datetime.now() - created_at > self.max_age:
            logger.debug(f"Cache entry expired: {cache_key}")
            del self.cache["entries"][cache_key]
            self._save_cache()
            self.cache["stats"]["misses"] += 1
            return None
        
        # Update access stats
        entry["last_accessed"] = datetime.now().isoformat()
        entry["access_count"] += 1
        self.cache["stats"]["hits"] += 1
        
        logger.debug(f"Cache HIT for: {text[:30]}...")
        return entry["translation"]
    
    def put(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        translation: str
    ):
        """
        Cache translation
        
        Args:
            text: Source text
            source_lang: Source language code
            target_lang: Target language code
            translation: Translated text
        """
        cache_key = self._get_cache_key(text, source_lang, target_lang)
        
        self.cache["entries"][cache_key] = {
            "source_text": text[:200],  # Store first 200 chars
            "translation": translation,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "created_at": datetime.now().isoformat(),
            "last_accessed": datetime.now().isoformat(),
            "access_count": 0
        }
        
        self.cache["stats"]["total_translations"] += 1
        
        # Enforce entry limit
        self._enforce_entry_limit()
        
        self._save_cache()
        logger.debug(f"Cached translation for: {text[:30]}...")
    
    def _enforce_entry_limit(self):
        """Enforce maximum entry limit using LRU"""
        if len(self.cache["entries"]) <= self.max_entries:
            return
        
        # Sort by last accessed (LRU)
        entries = [
            (key, entry)
            for key, entry in self.cache["entries"].items()
        ]
        entries.sort(key=lambda x: x[1]["last_accessed"])
        
        # Remove oldest entries
        num_to_remove = len(self.cache["entries"]) - self.max_entries
        for i in range(num_to_remove):
            cache_key, entry = entries[i]
            del self.cache["entries"][cache_key]
            logger.debug(f"Evicted cache entry (LRU): {entry['source_text'][:30]}...")
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total_requests = self.cache["stats"]["hits"] + self.cache["stats"]["misses"]
        hit_rate = self.cache["stats"]["hits"] / total_requests if total_requests > 0 else 0
        
        return {
            "entries": len(self.cache["entries"]),
            "max_entries": self.max_entries,
            "hits": self.cache["stats"]["hits"],
            "misses": self.cache["stats"]["misses"],
            "hit_rate": hit_rate,
            "total_translations": self.cache["stats"]["total_translations"],
            "max_age_days": self.max_age.days
        }
    
    def clear(self):
        """Clear all cache entries"""
        self.cache = {
            "entries": {},
            "stats": {
                "hits": 0,
                "misses": 0,
                "total_translations": 0
            }
        }
        self._save_cache()
        logger.info("Translation cache cleared")


# Global cache instance
_translation_cache: Optional[TranslationCache] = None


def get_translation_cache() -> TranslationCache:
    """Get global translation cache instance"""
    global _translation_cache
    if _translation_cache is None:
        _translation_cache = TranslationCache()
    return _translation_cache

