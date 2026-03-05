"""
Speech-to-Text Service using Whisper
Supports 5 languages: German, English, Spanish, French, Arabic
"""
import base64
import io
import logging
import os
import tempfile
from typing import Optional, Dict, List
import numpy as np
from pathlib import Path

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
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize STT service
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
        """
        self.model = None
        self.model_size = model_size or settings.whisper_model_size
        self.whisper_available = False
        
        logger.info(f"Initializing STT service with model size: {self.model_size}")
        
        # Try to load Whisper model
        self._load_model()
    
    def _load_model(self):
        """Load Whisper model"""
        try:
            # Try faster-whisper first (optimized)
            try:
                from faster_whisper import WhisperModel
                
                logger.info("Loading faster-whisper model...")
                self.model = WhisperModel(
                    self.model_size,
                    device="cpu",
                    compute_type="int8"  # Quantized for faster inference
                )
                self.whisper_available = True
                self.using_faster_whisper = True
                logger.info("✅ faster-whisper model loaded successfully")
                return
            
            except ImportError:
                logger.info("faster-whisper not available, trying openai-whisper...")
            
            # Try standard whisper
            try:
                import whisper
                
                logger.info("Loading openai-whisper model...")
                self.model = whisper.load_model(self.model_size)
                self.whisper_available = True
                self.using_faster_whisper = False
                logger.info("✅ openai-whisper model loaded successfully")
                return
            
            except ImportError:
                logger.warning("Whisper not available, using mock transcription")
        
        except Exception as e:
            logger.error(f"Error loading Whisper model: {e}")
            logger.warning("Falling back to mock transcription")
    
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
            logger.info(f"Transcribing audio (language hint: {language})")
            
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            
            if self.whisper_available:
                # Real transcription with Whisper
                result = await self._transcribe_with_whisper(
                    audio_bytes,
                    language,
                    return_timestamps
                )
            else:
                raise RuntimeError(
                    "Whisper not available. "
                    "Please install: pip install faster-whisper (recommended) or pip install openai-whisper"
                )
            
            logger.info(f"Transcription complete: '{result['text'][:50]}...'")
            
            return result
        
        except Exception as e:
            logger.error(f"Error in transcription: {e}", exc_info=True)
            raise
    
    async def _transcribe_with_whisper(
        self,
        audio_bytes: bytes,
        language: Optional[Language],
        return_timestamps: bool
    ) -> Dict:
        """Transcribe using Whisper model"""
        temp_file = None
        try:
            # Auto-detect audio format from file signature
            audio_format = self._detect_audio_format(audio_bytes)
            logger.info(f"Detected audio format: {audio_format}")
            
            # Get language code
            language_code = None
            if language:
                language_code = self.LANGUAGE_CODES.get(language)
            
            # For faster-whisper, try using temporary file first (handles M4A better)
            if self.using_faster_whisper:
                try:
                    # Save to temporary file and let faster-whisper handle it
                    import tempfile
                    import os
                    
                    # Create temporary file with correct extension
                    suffix = f".{audio_format}" if audio_format != "m4a" else ".m4a"
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                        tmp_file.write(audio_bytes)
                        temp_file = tmp_file.name
                    
                    logger.info(f"Using temporary file for faster-whisper: {temp_file}")
                    
                    # faster-whisper can handle file paths directly
                    segments, info = self.model.transcribe(
                        temp_file,
                        language=language_code,
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
                
                except Exception as e:
                    logger.warning(f"faster-whisper file path method failed: {e}, trying bytes method...")
                    # Fallback to bytes method
                    pass
            
            # Fallback: Load audio from bytes using pydub
            try:
                audio_array, sample_rate = audio_processor.load_audio_from_bytes(
                    audio_bytes,
                    format=audio_format
                )
                
                # Normalize audio
                audio_array = audio_processor.normalize_audio(audio_array)
                
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
            
            except FileNotFoundError as e:
                # FFmpeg not found error
                error_msg = (
                    "FFmpeg is required for audio processing but was not found. "
                    "Please install FFmpeg:\n"
                    "  Windows: Download from https://ffmpeg.org/download.html\n"
                    "  Or use: choco install ffmpeg (if Chocolatey is installed)\n"
                    "  After installation, restart the backend server."
                )
                logger.error(error_msg)
                raise RuntimeError(error_msg)
        
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            raise RuntimeError(f"Speech transcription failed: {e}")
        
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {temp_file}: {e}")
    
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
    
    @staticmethod
    def _detect_audio_format(audio_bytes: bytes) -> str:
        """
        Detect audio format from file signature (magic bytes)
        
        Args:
            audio_bytes: Audio file bytes
            
        Returns:
            Format string (m4a, mp3, wav, ogg, etc.)
        """
        # Check file signatures (magic bytes)
        if len(audio_bytes) < 12:
            return "wav"  # Default fallback
        
        # M4A/AAC (MP4 container)
        if audio_bytes[:4] == b'ftyp' or audio_bytes[4:8] in [b'M4A ', b'mp41', b'mp42', b'isom']:
            return "m4a"
        
        # MP3 (ID3v2 or MPEG frame sync)
        if audio_bytes[:3] == b'ID3' or audio_bytes[:2] == b'\xff\xfb' or audio_bytes[:2] == b'\xff\xf3':
            return "mp3"
        
        # WAV
        if audio_bytes[:4] == b'RIFF' and audio_bytes[8:12] == b'WAVE':
            return "wav"
        
        # OGG
        if audio_bytes[:4] == b'OggS':
            return "ogg"
        
        # FLAC
        if audio_bytes[:4] == b'fLaC':
            return "flac"
        
        # AAC (ADTS header)
        if audio_bytes[:2] in [b'\xff\xf1', b'\xff\xf9']:
            return "aac"
        
        # Default to m4a (common for mobile recordings)
        logger.warning("Could not detect audio format, defaulting to m4a")
        return "m4a"
    
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
            "variant": "faster-whisper" if self.using_faster_whisper else "openai-whisper" if self.whisper_available else "none",
            "ready": self.whisper_available,
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
