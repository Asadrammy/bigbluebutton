"""
Text-to-Speech Service using Coqui TTS (RECOMMENDED) with gTTS fallback
Supports 5 languages: German, English, Spanish, French, Arabic
"""
import base64
import io
import logging
from typing import Dict, Optional
import os
import tempfile

from app.models import Language
from app.config import settings
from app.utils.audio_cache import get_audio_cache

logger = logging.getLogger(__name__)


class TextToSpeechService:
    """
    Text-to-Speech service using Coqui TTS (primary) with gTTS fallback
    """
    
    # Language code mapping
    LANGUAGE_CODES = {
        Language.GERMAN: "de",
        Language.ENGLISH: "en",
        Language.SPANISH: "es",
        Language.FRENCH: "fr",
        Language.ARABIC: "ar"
    }
    
    # Coqui TTS model mapping (lightweight, high-quality models)
    COQUI_MODELS = {
        Language.GERMAN: "tts_models/de/thorsten/tacotron2-DDC",  # RECOMMENDED
        Language.ENGLISH: "tts_models/en/ljspeech/tacotron2-DDC",
        Language.SPANISH: "tts_models/es/mai/tacotron2-DDC",
        Language.FRENCH: "tts_models/fr/mai/tacotron2-DDC",
        Language.ARABIC: "tts_models/ar/css10/vits"  # Arabic support
    }
    
    # TLD options for gTTS fallback
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
        self.coqui_available = False
        self.gtts_available = False
        self.tts_models = {}  # Cache loaded Coqui models
        
        # Try to load Coqui TTS first (RECOMMENDED)
        self._load_coqui_tts()
        
        # Fallback to gTTS if Coqui not available
        if not self.coqui_available:
            self._load_gtts()
    
    def _load_coqui_tts(self):
        """Load Coqui TTS (RECOMMENDED - high quality, offline)"""
        try:
            from TTS.api import TTS
            self.TTS = TTS
            self.coqui_available = True
            logger.info("✅ Coqui TTS loaded successfully")
            logger.info("Coqui TTS models will be loaded on-demand (first use)")
        except ImportError:
            logger.warning("Coqui TTS not available, will try gTTS fallback")
            self.TTS = None
    
    def _load_gtts(self):
        """Load gTTS as fallback"""
        try:
            from gtts import gTTS
            self.gtts_class = gTTS
            self.gtts_available = True
            logger.info("✅ gTTS loaded as fallback")
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
            
            # Synthesize new audio (prefer Coqui TTS, fallback to gTTS)
            if self.coqui_available:
                audio_data = await self._synthesize_with_coqui(text, language)
            elif self.gtts_available:
                audio_data = await self._synthesize_with_gtts(text, lang_code, slow, tld)
            else:
                raise RuntimeError(
                    "No TTS backend available. "
                    "Please install: pip install TTS (for Coqui TTS) or pip install gTTS (for Google TTS)"
                )
            
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
    
    async def _synthesize_with_coqui(
        self,
        text: str,
        language: Language
    ) -> bytes:
        """
        Synthesize speech using Coqui TTS (RECOMMENDED - high quality, offline)
        
        Args:
            text: Text to synthesize
            language: Target language
            
        Returns:
            Audio bytes (WAV format)
        """
        try:
            # Get model name for language
            model_name = self.COQUI_MODELS.get(language)
            if not model_name:
                logger.warning(f"No Coqui model for {language}, falling back to gTTS")
                if self.gtts_available:
                    lang_code = self.LANGUAGE_CODES.get(language, "en")
                    tld = self.TLD_MAP.get(language, "com")
                    return await self._synthesize_with_gtts(text, lang_code, False, tld)
                raise RuntimeError(f"No TTS backend available for {language}. Install: pip install TTS or pip install gTTS")
            
            # Load model if not cached
            if model_name not in self.tts_models:
                logger.info(f"Loading Coqui TTS model: {model_name}")
                self.tts_models[model_name] = self.TTS(model_name)
                logger.info(f"✅ Model {model_name} loaded successfully")
            
            tts_model = self.tts_models[model_name]
            
            # Synthesize to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                output_path = tmp_file.name
            
            try:
                # Generate speech
                tts_model.tts_to_file(text=text, file_path=output_path)
                
                # Read audio file
                with open(output_path, "rb") as f:
                    audio_data = f.read()
                
                logger.info(f"Generated {len(audio_data)} bytes of audio with Coqui TTS")
                return audio_data
            
            finally:
                # Clean up temp file
                if os.path.exists(output_path):
                    os.remove(output_path)
        
        except Exception as e:
            logger.error(f"Coqui TTS synthesis error: {e}")
            # Fall back to gTTS if available
            if self.gtts_available:
                lang_code = self.LANGUAGE_CODES.get(language, "en")
                tld = self.TLD_MAP.get(language, "com")
                return await self._synthesize_with_gtts(text, lang_code, False, tld)
            raise RuntimeError(f"TTS synthesis failed: {e}. Install gTTS as fallback: pip install gTTS")
    
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
            raise RuntimeError(f"TTS synthesis failed: {e}")
    
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
        engine = "coqui-tts" if self.coqui_available else ("gTTS" if self.gtts_available else "mock")
        return {
            "engine": engine,
            "coqui_available": self.coqui_available,
            "gtts_available": self.gtts_available,
            "cache_enabled": self.use_cache,
            "supported_languages": self.get_supported_languages(),
            "loaded_models": list(self.tts_models.keys()),
            "ready": self.coqui_available or self.gtts_available,
            "features": {
                "offline": self.coqui_available,
                "high_quality": self.coqui_available,
                "slow_speech": self.gtts_available,  # Only gTTS supports slow
                "language_variants": True,
                "ssml": False,
                "multiple_voices": False
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
