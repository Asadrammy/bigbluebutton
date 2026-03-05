"""
Speech-to-Text Service using Whisper
Supports 5 languages: German, English, Spanish, French, Arabic
"""
import base64
import io
import logging
from typing import Optional, Dict, List
import numpy as np
from pathlib import Path
import tempfile

from app.models import Language
from app.config import settings
from app.utils.audio_processor import audio_processor

logger = logging.getLogger(__name__)


class SpeechToTextService:
    """
    Speech-to-Text service using OpenAI Whisper
    """
    
    # Language mapping
    LANGUAGE_CODES = {
        Language.GERMAN: "de",
        Language.ENGLISH: "en",
        Language.SPANISH: "es",
        Language.FRENCH: "fr",
        Language.ARABIC: "ar"
    }
    
    CODE_TO_LANGUAGE = {v: k for k, v in LANGUAGE_CODES.items()}
    
    def __init__(self, model_size: str = "tiny"):
        """
        Initialize STT service
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
        """
        self.model = None
        self.model_size = "tiny"  # Force tiny model for real transcription
        self.whisper_available = False
        
        logger.info(f"Initializing STT service with model size: {self.model_size}")
        
        # Try to load Whisper model
        self._load_model()
    
    def _load_model(self):
        """Load Whisper model"""
        try:
            # Try standard whisper (now installed)
            try:
                import whisper
                
                logger.info("Loading openai-whisper model...")
                self.model = whisper.load_model(self.model_size)
                self.whisper_available = True
                self.using_faster_whisper = False
                logger.info(f"✅ openai-whisper model '{self.model_size}' loaded successfully")
                return
            
            except ImportError:
                logger.error("openai-whisper not available")
        
        except Exception as e:
            logger.error(f"Error loading Whisper model: {e}")
            # NO FALLBACK TO MOCK - force real transcription
            raise RuntimeError(f"Failed to load Whisper model: {e}")
    
    async def transcribe_audio_base64(
        self,
        audio_data: str,
        language: str = "en"
    ) -> Dict:
        """
        Simple transcription for WebSocket use
        
        Args:
            audio_data: Base64 encoded audio
            language: Language code (en, de, es, fr, ar)
            
        Returns:
            Dict with text and confidence
        """
        try:
            # Convert string language code to Language enum if needed
            lang_enum = None
            for lang, code in self.LANGUAGE_CODES.items():
                if code == language:
                    lang_enum = lang
                    break
            
            result = await self.transcribe(audio_data, lang_enum)
            
            # Check for error in result
            if 'error' in result:
                logger.error(f"Transcription failed: {result['error']}")
                return {
                    'text': 'Transcription failed',
                    'confidence': 0.0,
                    'language': language,
                    'error': result['error']
                }
            
            logger.info(f"✅ Transcription result: '{result['text']}'")
            return {
                'text': result.get('text', ''),
                'confidence': result.get('confidence', 0.8),
                'language': language
            }
            
        except Exception as e:
            logger.error(f"Error in simple transcription: {e}")
            # Return error instead of dummy text
            return {
                'text': 'Transcription error',
                'confidence': 0.0,
                'language': language,
                'error': str(e)
            }
    
    async def transcribe(
        self,
        audio_data: str,
        language: Optional[Language] = None,
        return_timestamps: bool = False
    ) -> Dict:
        """
        Transcribe audio to text
        
        Args:
            audio_data: Base64 encoded audio (WAV, MP3, OGG, etc.)
            language: Optional language hint (improves accuracy)
            return_timestamps: Whether to return word timestamps
            
        Returns:
            Dict with text, language, confidence, and optional timestamps
        """
        try:
            logger.info(f"Transcribing real audio (language hint: {language})")
            
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            logger.info(f"🎵 Audio decoded: {len(audio_bytes)} bytes")
            
            if self.whisper_available:
                # Real transcription with Whisper
                result = await self._transcribe_with_whisper(
                    audio_bytes,
                    language,
                    return_timestamps
                )
                logger.info(f"✅ Real transcription complete: '{result['text'][:50]}...'")
                return result
            else:
                # No fallback - raise error
                raise RuntimeError("Whisper model not available")
        
        except Exception as e:
            logger.error(f"Error in transcription: {e}", exc_info=True)
            # NO MOCK FALLBACK - return error
            return {
                'text': '',
                'language': language or 'en',
                'confidence': 0.0,
                'error': str(e)
            }
    
    async def _transcribe_with_whisper(
        self,
        audio_bytes: bytes,
        language: Optional[Language],
        return_timestamps: bool
    ) -> Dict:
        """Transcribe using Whisper model"""
        try:
            # Load audio from bytes - try multiple formats
            audio_array = None
            sample_rate = 16000
            
            logger.info(f"🎵 Processing audio: {len(audio_bytes)} bytes")
            
            # Try to detect format and process accordingly
            if audio_bytes.startswith(b'\x1a\x45\xdf\xa3'):
                # WebM format - try to extract audio data
                logger.info("🔧 Detected WebM format")
                try:
                    # Try using pydub with WebM
                    audio_array, sample_rate = audio_processor.load_audio_from_bytes(
                        audio_bytes,
                        format="webm"
                    )
                    logger.info(f"✅ WebM processed: {len(audio_array)} samples")
                except Exception as e:
                    logger.warning(f"WebM processing failed: {e}")
                    # Try raw extraction
                    try:
                        # Skip WebM header and extract raw audio data
                        # This is a simplified approach - WebM is complex
                        import struct
                        # Look for audio data patterns (simplified)
                        audio_data = np.frombuffer(audio_bytes[200:], dtype=np.int16).astype(np.float32) / 32768.0
                        audio_array = audio_data[:160000]  # Limit to 10 seconds
                        sample_rate = 16000
                        logger.info(f"✅ Raw WebM extraction: {len(audio_array)} samples")
                    except Exception as e2:
                        logger.error(f"Raw extraction failed: {e2}")
                        raise RuntimeError("Could not process WebM audio")
            
            elif audio_bytes.startswith(b'RIFF'):
                # WAV format
                logger.info("🔧 Detected WAV format")
                audio_array, sample_rate = audio_processor.load_audio_from_bytes(
                    audio_bytes,
                    format="wav"
                )
                logger.info(f"✅ WAV processed: {len(audio_array)} samples")
            
            else:
                # Unknown format - try different approaches
                logger.warning("🔧 Unknown format, trying multiple methods")
                
                # Try soundfile first
                try:
                    import soundfile as sf
                    import io
                    audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
                    if audio_data.dtype != np.float32:
                        audio_data = audio_data.astype(np.float32)
                    if len(audio_data.shape) > 1:
                        audio_data = np.mean(audio_data, axis=1)
                    audio_array = audio_data
                    logger.info(f"✅ soundfile success: {len(audio_array)} samples")
                except:
                    # Try pydub with different formats
                    for format in ["webm", "wav", "mp3", "ogg"]:
                        try:
                            audio_array, sample_rate = audio_processor.load_audio_from_bytes(
                                audio_bytes,
                                format=format
                            )
                            logger.info(f"✅ pydub {format} success: {len(audio_array)} samples")
                            break
                        except:
                            continue
            
            if audio_array is None:
                raise RuntimeError("Could not process audio in any format")
            
            # Normalize audio
            audio_array = audio_processor.normalize_audio(audio_array)
            
            # Get language code
            language_code = None
            if language:
                language_code = self.LANGUAGE_CODES.get(language)
            
            # Transcribe based on Whisper variant
            if self.using_faster_whisper:
                result = self._transcribe_faster_whisper(
                    audio_array,
                    language_code,
                    return_timestamps
                )
            else:
                result = self._transcribe_openai_whisper(
                    audio_array,
                    language_code,
                    return_timestamps
                )
            
            return result
        
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            # NO FALLBACK TO MOCK - return error
            return {
                'text': '',
                'language': language.value if language else 'en',
                'confidence': 0.0,
                'error': f'Whisper transcription failed: {str(e)}'
            }
    
    def _transcribe_faster_whisper(
        self,
        audio: np.ndarray,
        language: Optional[str],
        return_timestamps: bool
    ) -> Dict:
        """Transcribe using faster-whisper"""
        segments, info = self.model.transcribe(
            audio,
            language=language,
            word_timestamps=return_timestamps
        )
        
        # Collect segments
        text_segments = []
        timestamps = []
        
        for segment in segments:
            text_segments.append(segment.text)
            if return_timestamps:
                timestamps.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text
                })
        
        text = " ".join(text_segments).strip()
        detected_language = self.CODE_TO_LANGUAGE.get(
            info.language,
            Language.ENGLISH
        )
        
        result = {
            "text": text,
            "language": detected_language,
            "confidence": info.language_probability,
            "duration": info.duration
        }
        
        if return_timestamps:
            result["timestamps"] = timestamps
        
        return result
    
    def _transcribe_openai_whisper(
        self,
        audio: np.ndarray,
        language: Optional[str],
        return_timestamps: bool
    ) -> Dict:
        """Transcribe using openai-whisper"""
        result = self.model.transcribe(
            audio,
            language=language,
            word_timestamps=return_timestamps
        )
        
        text = result["text"].strip()
        detected_language = self.CODE_TO_LANGUAGE.get(
            result["language"],
            Language.ENGLISH
        )
        
        response = {
            "text": text,
            "language": detected_language,
            "confidence": self._calculate_confidence(result),
            "duration": result.get("duration", 0)
        }
        
        if return_timestamps and "segments" in result:
            timestamps = [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"]
                }
                for seg in result["segments"]
            ]
            response["timestamps"] = timestamps
        
        return response
    
    def _mock_transcription(self, language: Optional[Language]) -> Dict:
        """Mock transcription for testing"""
        mock_texts = {
            Language.GERMAN: "Hallo, wie geht es dir?",
            Language.ENGLISH: "Hello, how are you?",
            Language.SPANISH: "Hola, ¿cómo estás?",
            Language.FRENCH: "Bonjour, comment allez-vous?",
            Language.ARABIC: "مرحبا، كيف حالك؟"
        }
        
        target_lang = language or Language.ENGLISH
        text = mock_texts.get(target_lang, mock_texts[Language.ENGLISH])
        
        return {
            "text": text,
            "language": target_lang,
            "confidence": 0.95,
            "duration": 2.5,
            "mock": True
        }
    
    @staticmethod
    def _calculate_confidence(result: dict) -> float:
        """
        Calculate confidence from Whisper result
        
        Whisper doesn't provide direct confidence scores,
        so we estimate from token probabilities
        """
        if "segments" in result and len(result["segments"]) > 0:
            # Average the no_speech_prob across segments
            avg_prob = np.mean([
                1.0 - seg.get("no_speech_prob", 0.5)
                for seg in result["segments"]
            ])
            return float(avg_prob)
        
        return 0.85  # Default confidence
    
    async def transcribe_file(
        self,
        file_path: str,
        language: Optional[Language] = None,
        return_timestamps: bool = False
    ) -> Dict:
        """
        Transcribe audio file
        
        Args:
            file_path: Path to audio file
            language: Optional language hint
            return_timestamps: Whether to return timestamps
            
        Returns:
            Transcription result
        """
        try:
            # Load audio file
            audio_array, sample_rate = audio_processor.load_audio(file_path)
            
            # Convert to base64 for consistency
            audio_bytes = (audio_array * (2 ** 15)).astype(np.int16).tobytes()
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # Transcribe
            return await self.transcribe(audio_b64, language, return_timestamps)
        
        except Exception as e:
            logger.error(f"Error transcribing file: {e}")
            raise
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes"""
        return list(self.LANGUAGE_CODES.values())
    
    def get_model_info(self) -> Dict:
        """Get model information"""
        return {
            "model_size": self.model_size,
            "whisper_available": self.whisper_available,
            "variant": "faster-whisper" if self.using_faster_whisper else "openai-whisper" if self.whisper_available else "mock",
            "supported_languages": self.get_supported_languages()
        }


# Global service instance
_stt_service: Optional[SpeechToTextService] = None


def get_stt_service() -> SpeechToTextService:
    """Get global STT service instance"""
    global _stt_service
    if _stt_service is None:
        _stt_service = SpeechToTextService()
    return _stt_service
