"""
Translation Service with multiple backends
Supports 5 languages: German, English, Spanish, French, Arabic
RECOMMENDED: NLLB (Meta's No Language Left Behind) - 200+ languages, high quality
"""
import logging
from typing import Dict, Optional, List, Tuple
from enum import Enum
import torch

from app.models import Language
from app.config import settings
from app.utils.translation_cache import get_translation_cache

logger = logging.getLogger(__name__)


class TranslationBackend(str, Enum):
    """Available translation backends"""
    NLLB = "nllb"  # Meta's NLLB (RECOMMENDED - best quality, 200+ languages)
    ARGOS = "argos"  # Offline, free (fallback)


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
        self.backend = None
        self.nllb_available = False
        self.argos_available = False
        self.nllb_model = None
        self.nllb_tokenizer = None
        
        # Try to load NLLB first (RECOMMENDED)
        self._load_nllb()
        
        # Fallback to Argos if NLLB not available
        if not self.nllb_available:
            self._load_argos()
    
    def _load_nllb(self):
        """Load NLLB (Meta's No Language Left Behind) - RECOMMENDED"""
        try:
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            
            model_name = f"facebook/{settings.nllb_model_size}"
            logger.info(f"Loading NLLB model: {model_name}")
            
            # Load tokenizer and model
            self.nllb_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.nllb_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            
            self.nllb_available = True
            self.backend = TranslationBackend.NLLB
            logger.info(f"✅ NLLB model {settings.nllb_model_size} loaded successfully")
            logger.info("NLLB supports 200+ languages including all required languages")
        
        except ImportError:
            logger.warning("Transformers not available, will try Argos Translate fallback")
        except Exception as e:
            logger.error(f"Error loading NLLB model: {e}")
            logger.warning("Will try Argos Translate fallback")
    
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
                logger.warning("Install packages with: python -c 'import argostranslate.package; argostranslate.package.update_package_index(); argostranslate.package.install_from_path(...)'")
        
        except ImportError:
            logger.warning("Argos Translate not available. Install with: pip install argostranslate")
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
                        "backend": self.backend.value if self.backend else None
                    }
            
            # Perform translation (prefer NLLB, fallback to Argos)
            if self.nllb_available:
                translated_text = self._translate_with_nllb(text, source_code, target_code)
            elif self.argos_available:
                translated_text = self._translate_with_argos(text, source_code, target_code)
            else:
                raise RuntimeError(
                    "No translation backend available. "
                    "Please install: pip install transformers (for NLLB) or pip install argostranslate (for Argos)"
                )
            
            # Cache the translation
            if self.cache:
                self.cache.put(text, source_code, target_code, translated_text)
            
            return {
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "cached": False,
                "backend": self.backend.value if self.backend else None
            }
        
        except Exception as e:
            logger.error(f"Error in translation: {e}", exc_info=True)
            raise
    
    def _translate_with_nllb(
        self,
        text: str,
        source_code: str,
        target_code: str
    ) -> str:
        """
        Translate using NLLB (Meta's No Language Left Behind) - RECOMMENDED
        
        Args:
            text: Text to translate
            source_code: Source language code (e.g., "de", "en")
            target_code: Target language code (e.g., "de", "en")
            
        Returns:
            Translated text
        """
        try:
            # NLLB uses specific language codes (ISO 639-3 with script)
            # Map our 2-letter codes to NLLB codes
            nllb_lang_map = {
                "de": "deu_Latn",  # German
                "en": "eng_Latn",  # English
                "es": "spa_Latn",  # Spanish
                "fr": "fra_Latn",  # French
                "ar": "arb_Arab"   # Arabic
            }
            
            src_nllb = nllb_lang_map.get(source_code, "eng_Latn")
            tgt_nllb = nllb_lang_map.get(target_code, "eng_Latn")
            
            # Set source language
            self.nllb_tokenizer.src_lang = src_nllb
            
            # Tokenize
            inputs = self.nllb_tokenizer(text, return_tensors="pt")
            
            # Get target language ID
            forced_bos_token_id = self.nllb_tokenizer.lang_code_to_id[tgt_nllb]
            
            # Translate
            with torch.no_grad():
                translated_tokens = self.nllb_model.generate(
                    **inputs,
                    forced_bos_token_id=forced_bos_token_id,
                    max_length=512
                )
            
            # Decode
            translated_text = self.nllb_tokenizer.batch_decode(
                translated_tokens,
                skip_special_tokens=True
            )[0]
            
            logger.info(f"Translated with NLLB: {source_code} -> {target_code}")
            return translated_text
        
        except Exception as e:
            logger.error(f"NLLB translation error: {e}")
            # Fallback to Argos if available
            if self.argos_available:
                return self._translate_with_argos(text, source_code, target_code)
            raise RuntimeError(f"Translation failed: {e}. Install Argos Translate as fallback: pip install argostranslate")
    
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
            
            # If all fails, raise error
            logger.error(f"Argos translation failed for {source_code} -> {target_code}")
            raise RuntimeError(f"Translation failed: Could not translate from {source_code} to {target_code}")
        
        except Exception as e:
            logger.error(f"Argos translation error: {e}")
            raise RuntimeError(f"Translation failed: {e}")
    
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
        elif self.nllb_available:
            # NLLB supports all language pairs
            codes = list(self.LANGUAGE_CODES.values())
            pairs = [
                (src, tgt)
                for src in codes
                for tgt in codes
                if src != tgt
            ]
            return pairs
        else:
            # No backend available
            logger.warning("No translation backend available")
            return []
    
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
            "nllb_available": self.nllb_available,
            "argos_available": self.argos_available,
            "nllb_model": settings.nllb_model_size if self.nllb_available else None,
            "cache_enabled": self.use_cache,
            "supported_languages": list(self.LANGUAGE_CODES.keys()),
            "supported_pairs": len(self.get_supported_language_pairs()),
            "features": {
                "offline": True,
                "high_quality": self.nllb_available,
                "200_plus_languages": self.nllb_available
            }
        }


# Global service instance
_translation_service: Optional[TranslationService] = None


def get_translation_service() -> TranslationService:
    """Get global translation service instance"""
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
