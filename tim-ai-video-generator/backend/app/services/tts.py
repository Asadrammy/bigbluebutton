"""
Text-to-Speech Service using gTTS with caching
Supports 5 languages: German, English, Spanish, French, Arabic
"""
import base64
import io
import logging
from typing import Dict, Optional
import os

from app.models import Language
from app.config import settings
from app.utils.audio_cache import get_audio_cache

logger = logging.getLogger(__name__)


class TextToSpeechService:
    """
    Text-to-Speech service using gTTS
    """
    
    # Language code mapping for gTTS
    LANGUAGE_CODES = {
        Language.GERMAN: "de",
        Language.ENGLISH: "en",
        Language.SPANISH: "es",
        Language.FRENCH: "fr",
        Language.ARABIC: "ar"
    }
    
    # TLD options for language variants
    TLD_MAP = {
        Language.GERMAN: "de",
        Language.ENGLISH: "com",
        Language.SPANISH: "es",
        Language.FRENCH: "fr",
        Language.ARABIC: "com"
    }
    
    def __init__(self, use_cache: bool = True):
        """
        Initialize TTS service
        
        Args:
            use_cache: Whether to use audio caching
        """
        logger.info("Initializing TTS service")
        self.use_cache = use_cache
        self.cache = get_audio_cache() if use_cache else None
        self.gtts_available = False
        
        # Try to import gTTS
        try:
            from gtts import gTTS
            self.gtts_class = gTTS
            self.gtts_available = True
            logger.info("✅ gTTS loaded successfully")
        except ImportError:
            logger.warning("gTTS not available, using mock TTS")
            self.gtts_class = None
    
    async def synthesize(
        self,
        text: str,
        language: Language,
        slow: bool = False,
        return_base64: bool = True
    ) -> Dict:
        """
        Convert text to speech
        
        Args:
            text: Text to synthesize
            language: Target language
            slow: Whether to use slow speech (clearer for learners)
            return_base64: Whether to return base64 encoded audio
            
        Returns:
            Dict with audio_data (base64) or audio_url
        """
        try:
            logger.info(f"Synthesizing speech: '{text[:50]}...' in {language}")
            
            if not text.strip():
                raise ValueError("Text cannot be empty")
            
            # Get language code
            lang_code = self.LANGUAGE_CODES.get(language)
            if not lang_code:
                raise ValueError(f"Unsupported language: {language}")
            
            tld = self.TLD_MAP.get(language, "com")
            
            # Check cache first
            if self.cache:
                cached_audio = self.cache.get(text, lang_code, slow, tld)
                if cached_audio:
                    logger.info("Using cached audio")
                    if return_base64:
                        audio_b64 = base64.b64encode(cached_audio).decode('utf-8')
                        return {"audio_data": audio_b64, "audio_url": None, "cached": True}
                    else:
                        return {"audio_data": cached_audio, "audio_url": None, "cached": True}
            
            # Synthesize new audio
            if self.gtts_available:
                audio_data = await self._synthesize_with_gtts(text, lang_code, slow, tld)
            else:
                audio_data = self._mock_synthesis(text, language)
            
            # Cache the audio
            if self.cache:
                self.cache.put(audio_data, text, lang_code, slow, tld)
            
            # Return audio
            if return_base64:
                audio_b64 = base64.b64encode(audio_data).decode('utf-8')
                return {
                    "audio_data": audio_b64,
                    "audio_url": None,
                    "cached": False,
                    "format": "mp3"
                }
            else:
                return {
                    "audio_data": audio_data,
                    "audio_url": None,
                    "cached": False,
                    "format": "mp3"
                }
        
        except Exception as e:
            logger.error(f"Error in speech synthesis: {e}", exc_info=True)
            raise
    
    async def _synthesize_with_gtts(
        self,
        text: str,
        lang_code: str,
        slow: bool,
        tld: str
    ) -> bytes:
        """
        Synthesize speech using gTTS
        
        Args:
            text: Text to synthesize
            lang_code: Language code (de, en, es, fr, ar)
            slow: Whether to use slow speech
            tld: TLD for language variant
            
        Returns:
            Audio bytes (MP3 format)
        """
        try:
            # Create gTTS object
            tts = self.gtts_class(
                text=text,
                lang=lang_code,
                slow=slow,
                tld=tld
            )
            
            # Write to BytesIO
            audio_fp = io.BytesIO()
            tts.write_to_fp(audio_fp)
            audio_fp.seek(0)
            
            audio_data = audio_fp.read()
            logger.info(f"Generated {len(audio_data)} bytes of audio")
            
            return audio_data
        
        except Exception as e:
            logger.error(f"gTTS synthesis error: {e}")
            # Fall back to mock
            return self._mock_synthesis(text, Language.ENGLISH)
    
    def _mock_synthesis(self, text: str, language: Language) -> bytes:
        """Mock synthesis for testing"""
        mock_data = f"[MOCK TTS: {text[:50]} in {language.value}]".encode('utf-8')
        return mock_data
    
    async def synthesize_ssml(
        self,
        ssml: str,
        language: Language
    ) -> Dict:
        """
        Synthesize speech from SSML (Speech Synthesis Markup Language)
        
        Note: gTTS doesn't support SSML, this is a placeholder for future enhancement
        
        Args:
            ssml: SSML markup
            language: Target language
            
        Returns:
            Dict with audio data
        """
        # Extract text from SSML (simple implementation)
        import re
        text = re.sub(r'<[^>]+>', '', ssml)
        
        return await self.synthesize(text, language)
    
    def get_supported_languages(self) -> list:
        """Get list of supported language codes"""
        return list(self.LANGUAGE_CODES.values())
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        if self.cache:
            return self.cache.get_stats()
        return {"cache_enabled": False}
    
    def clear_cache(self):
        """Clear audio cache"""
        if self.cache:
            self.cache.clear()
            logger.info("TTS cache cleared")
    
    def get_service_info(self) -> Dict:
        """Get TTS service information"""
        return {
            "engine": "gTTS" if self.gtts_available else "mock",
            "cache_enabled": self.use_cache,
            "supported_languages": self.get_supported_languages(),
            "features": {
                "slow_speech": True,
                "language_variants": True,
                "ssml": False,  # gTTS doesn't support SSML
                "multiple_voices": False  # gTTS uses single voice per language
            }
        }


# Global service instance
_tts_service: Optional[TextToSpeechService] = None


def get_tts_service() -> TextToSpeechService:
    """Get global TTS service instance"""
    global _tts_service
    if _tts_service is None:
        _tts_service = TextToSpeechService()
    return _tts_service
