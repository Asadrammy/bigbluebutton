"""
Translation Service with multiple backends
Supports 5 languages: German, English, Spanish, French, Arabic
"""
import logging
from typing import Dict, Optional, List, Tuple
from enum import Enum

from app.models import Language
from app.config import settings
from app.utils.translation_cache import get_translation_cache

logger = logging.getLogger(__name__)


class TranslationBackend(str, Enum):
    """Available translation backends"""
    ARGOS = "argos"  # Offline, free
    MOCK = "mock"  # For testing


class TranslationService:
    """
    Translation service with multiple backend support
    """
    
    # Language code mapping
    LANGUAGE_CODES = {
        Language.GERMAN: "de",
        Language.ENGLISH: "en",
        Language.SPANISH: "es",
        Language.FRENCH: "fr",
        Language.ARABIC: "ar"
    }
    
    CODE_TO_LANGUAGE = {v: k for k, v in LANGUAGE_CODES.items()}
    
    def __init__(self, use_cache: bool = True):
        """
        Initialize translation service
        
        Args:
            use_cache: Whether to use translation caching
        """
        logger.info("Initializing Translation service")
        self.use_cache = use_cache
        self.cache = get_translation_cache() if use_cache else None
        self.backend = TranslationBackend.MOCK
        self.argos_available = False
        
        # Try to load Argos Translate
        self._load_argos()
    
    def _load_argos(self):
        """Load Argos Translate models"""
        try:
            import argostranslate.package
            import argostranslate.translate
            
            self.argostranslate = argostranslate.translate
            self.argos_package = argostranslate.package
            
            # Update package index
            self.argos_package.update_package_index()
            
            # Get installed packages
            installed_packages = self.argos_package.get_installed_packages()
            
            if len(installed_packages) > 0:
                self.argos_available = True
                self.backend = TranslationBackend.ARGOS
                logger.info(f"✅ Argos Translate loaded with {len(installed_packages)} language packages")
            else:
                logger.warning("Argos Translate available but no language packages installed")
                logger.info("Using mock translation")
        
        except ImportError:
            logger.warning("Argos Translate not available, using mock translation")
        except Exception as e:
            logger.error(f"Error loading Argos Translate: {e}")
    
    async def translate(
        self,
        text: str,
        source_lang: Language,
        target_lang: Language
    ) -> Dict:
        """
        Translate text from source to target language
        
        Args:
            text: Text to translate
            source_lang: Source language
            target_lang: Target language
            
        Returns:
            Dict with translated_text, source_lang, target_lang, cached flag
        """
        try:
            logger.info(f"Translating: '{text[:50]}...' ({source_lang} -> {target_lang})")
            
            if not text.strip():
                raise ValueError("Text cannot be empty")
            
            # Same language, no translation needed
            if source_lang == target_lang:
                return {
                    "translated_text": text,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "cached": False,
                    "backend": "none"
                }
            
            # Get language codes
            source_code = self.LANGUAGE_CODES.get(source_lang)
            target_code = self.LANGUAGE_CODES.get(target_lang)
            
            if not source_code or not target_code:
                raise ValueError(f"Unsupported language pair: {source_lang} -> {target_lang}")
            
            # Check cache first
            if self.cache:
                cached_translation = self.cache.get(text, source_code, target_code)
                if cached_translation:
                    logger.info("Using cached translation")
                    return {
                        "translated_text": cached_translation,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                        "cached": True,
                        "backend": self.backend.value
                    }
            
            # Perform translation
            if self.argos_available:
                translated_text = self._translate_with_argos(text, source_code, target_code)
            else:
                translated_text = self._mock_translation(text, source_lang, target_lang)
            
            # Cache the translation
            if self.cache:
                self.cache.put(text, source_code, target_code, translated_text)
            
            return {
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "cached": False,
                "backend": self.backend.value
            }
        
        except Exception as e:
            logger.error(f"Error in translation: {e}", exc_info=True)
            raise
    
    def _translate_with_argos(
        self,
        text: str,
        source_code: str,
        target_code: str
    ) -> str:
        """
        Translate using Argos Translate
        
        Args:
            text: Text to translate
            source_code: Source language code
            target_code: Target language code
            
        Returns:
            Translated text
        """
        try:
            # Try direct translation
            translated = self.argostranslate.translate(text, source_code, target_code)
            
            if translated and translated != text:
                logger.info(f"Translated with Argos: {source_code} -> {target_code}")
                return translated
            
            # Try pivot translation through English
            if source_code != "en" and target_code != "en":
                logger.info(f"Using pivot translation through English")
                # Translate to English first
                intermediate = self.argostranslate.translate(text, source_code, "en")
                # Then to target language
                translated = self.argostranslate.translate(intermediate, "en", target_code)
                
                if translated and translated != text:
                    return translated
            
            # If all fails, return original text
            logger.warning(f"Argos translation failed for {source_code} -> {target_code}")
            return self._mock_translation(text, self.CODE_TO_LANGUAGE[source_code], self.CODE_TO_LANGUAGE[target_code])
        
        except Exception as e:
            logger.error(f"Argos translation error: {e}")
            # Fallback to mock
            return self._mock_translation(text, self.CODE_TO_LANGUAGE[source_code], self.CODE_TO_LANGUAGE[target_code])
    
    def _mock_translation(
        self,
        text: str,
        source_lang: Language,
        target_lang: Language
    ) -> str:
        """Mock translation for testing"""
        # Common phrases for testing
        mock_translations = {
            # German to English
            ("Hallo, wie geht es dir?", Language.GERMAN, Language.ENGLISH): "Hello, how are you?",
            ("Danke", Language.GERMAN, Language.ENGLISH): "Thank you",
            ("Guten Morgen", Language.GERMAN, Language.ENGLISH): "Good morning",
            
            # English to German
            ("Hello, how are you?", Language.ENGLISH, Language.GERMAN): "Hallo, wie geht es dir?",
            ("Thank you", Language.ENGLISH, Language.GERMAN): "Danke",
            ("Good morning", Language.ENGLISH, Language.GERMAN): "Guten Morgen",
            
            # English to Spanish
            ("Hello, how are you?", Language.ENGLISH, Language.SPANISH): "Hola, ¿cómo estás?",
            ("Thank you", Language.ENGLISH, Language.SPANISH): "Gracias",
            ("Good morning", Language.ENGLISH, Language.SPANISH): "Buenos días",
            
            # English to French
            ("Hello, how are you?", Language.ENGLISH, Language.FRENCH): "Bonjour, comment allez-vous?",
            ("Thank you", Language.ENGLISH, Language.FRENCH): "Merci",
            ("Good morning", Language.ENGLISH, Language.FRENCH): "Bonjour",
            
            # English to Arabic
            ("Hello, how are you?", Language.ENGLISH, Language.ARABIC): "مرحبا، كيف حالك؟",
            ("Thank you", Language.ENGLISH, Language.ARABIC): "شكراً",
            ("Good morning", Language.ENGLISH, Language.ARABIC): "صباح الخير",
        }
        
        # Check if we have a mock translation
        key = (text, source_lang, target_lang)
        if key in mock_translations:
            return mock_translations[key]
        
        # Otherwise, return prefixed text
        return f"[{target_lang.value.upper()}] {text}"
    
    def get_supported_language_pairs(self) -> List[Tuple[str, str]]:
        """Get list of supported language pairs"""
        if self.argos_available:
            # Get from installed Argos packages
            installed = self.argos_package.get_installed_packages()
            pairs = [
                (pkg.from_code, pkg.to_code)
                for pkg in installed
            ]
            return pairs
        else:
            # Return all possible pairs for mock
            codes = list(self.LANGUAGE_CODES.values())
            pairs = [
                (src, tgt)
                for src in codes
                for tgt in codes
                if src != tgt
            ]
            return pairs
    
    def install_language_package(self, source_code: str, target_code: str) -> bool:
        """
        Install Argos Translate language package
        
        Args:
            source_code: Source language code
            target_code: Target language code
            
        Returns:
            True if successful
        """
        if not self.argos_available:
            logger.warning("Argos Translate not available")
            return False
        
        try:
            # Update package index
            self.argos_package.update_package_index()
            
            # Find package
            available_packages = self.argos_package.get_available_packages()
            package_to_install = None
            
            for pkg in available_packages:
                if pkg.from_code == source_code and pkg.to_code == target_code:
                    package_to_install = pkg
                    break
            
            if package_to_install:
                # Download and install
                download_path = self.argos_package.download_and_install_package(package_to_install)
                logger.info(f"Installed package: {source_code} -> {target_code}")
                return True
            else:
                logger.warning(f"Package not found: {source_code} -> {target_code}")
                return False
        
        except Exception as e:
            logger.error(f"Error installing package: {e}")
            return False
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        if self.cache:
            return self.cache.get_stats()
        return {"cache_enabled": False}
    
    def clear_cache(self):
        """Clear translation cache"""
        if self.cache:
            self.cache.clear()
            logger.info("Translation cache cleared")
    
    def get_service_info(self) -> Dict:
        """Get translation service information"""
        return {
            "backend": self.backend.value,
            "argos_available": self.argos_available,
            "cache_enabled": self.use_cache,
            "supported_languages": list(self.LANGUAGE_CODES.keys()),
            "supported_pairs": len(self.get_supported_language_pairs())
        }


# Global service instance
_translation_service: Optional[TranslationService] = None


def get_translation_service() -> TranslationService:
    """Get global translation service instance"""
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
