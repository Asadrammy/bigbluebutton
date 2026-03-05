"""
Audio processing utilities for speech recognition
"""
import io
import logging
import numpy as np
from typing import Tuple, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Audio preprocessing for speech recognition"""
    
    # Standard audio parameters for Whisper
    SAMPLE_RATE = 16000  # 16 kHz required by Whisper
    CHANNELS = 1  # Mono
    BIT_DEPTH = 16
    
    @staticmethod
    def load_audio(audio_path: str) -> Tuple[np.ndarray, int]:
        """
        Load audio file
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Tuple of (audio_data, sample_rate)
        """
        try:
            # Try pydub first (supports more formats)
            try:
                from pydub import AudioSegment
                
                audio = AudioSegment.from_file(audio_path)
                
                # Convert to required format
                audio = audio.set_frame_rate(AudioProcessor.SAMPLE_RATE)
                audio = audio.set_channels(AudioProcessor.CHANNELS)
                audio = audio.set_sample_width(AudioProcessor.BIT_DEPTH // 8)
                
                # Convert to numpy array
                samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
                samples = samples / (2 ** 15)  # Normalize to [-1, 1]
                
                return samples, AudioProcessor.SAMPLE_RATE
            
            except ImportError:
                logger.warning("pydub not available, falling back to basic audio loading")
                # Fallback to basic loading (requires wave for WAV files)
                import wave
                
                with wave.open(audio_path, 'rb') as wav_file:
                    sample_rate = wav_file.getframerate()
                    n_frames = wav_file.getnframes()
                    audio_data = wav_file.readframes(n_frames)
                    
                    # Convert to numpy array
                    samples = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
                    samples = samples / (2 ** 15)  # Normalize
                    
                    # Resample if needed
                    if sample_rate != AudioProcessor.SAMPLE_RATE:
                        samples = AudioProcessor.resample(samples, sample_rate, AudioProcessor.SAMPLE_RATE)
                    
                    return samples, AudioProcessor.SAMPLE_RATE
        
        except Exception as e:
            logger.error(f"Error loading audio: {e}")
            raise
    
    @staticmethod
    def load_audio_from_bytes(audio_bytes: bytes, format: str = "wav") -> Tuple[np.ndarray, int]:
        """
        Load audio from bytes
        
        Args:
            audio_bytes: Audio data as bytes
            format: Audio format (wav, mp3, ogg, etc.)
            
        Returns:
            Tuple of (audio_data, sample_rate)
        """
        try:
            # Try soundfile first (doesn't require ffmpeg)
            try:
                import soundfile as sf
                import io
                
                audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
                
                # Convert to float32 if needed
                if audio_data.dtype != np.float32:
                    audio_data = audio_data.astype(np.float32)
                
                # Convert to mono if stereo
                if len(audio_data.shape) > 1:
                    audio_data = np.mean(audio_data, axis=1)
                
                return audio_data, sample_rate
                
            except Exception as sf_error:
                logger.debug(f"soundfile failed: {sf_error}")
                
                # Fallback to pydub
                from pydub import AudioSegment
                
                audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=format)
                
                # Convert to required format
                audio = audio.set_frame_rate(AudioProcessor.SAMPLE_RATE)
                audio = audio.set_channels(AudioProcessor.CHANNELS)
                audio = audio.set_sample_width(AudioProcessor.BIT_DEPTH // 8)
                
                # Convert to numpy array
                samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
                samples = samples / (2 ** 15)  # Normalize to [-1, 1]
                
                return samples, AudioProcessor.SAMPLE_RATE
        
        except ImportError:
            logger.error("Neither soundfile nor pydub available")
            raise RuntimeError("Audio processing library not available")
    
    @staticmethod
    def resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
        """
        Resample audio to target sample rate
        
        Args:
            audio: Audio samples
            orig_sr: Original sample rate
            target_sr: Target sample rate
            
        Returns:
            Resampled audio
        """
        if orig_sr == target_sr:
            return audio
        
        try:
            from scipy import signal
            
            # Calculate resampling ratio
            ratio = target_sr / orig_sr
            n_samples = int(len(audio) * ratio)
            
            # Resample using scipy
            resampled = signal.resample(audio, n_samples)
            
            return resampled.astype(np.float32)
        
        except ImportError:
            logger.warning("scipy not available, using basic resampling")
            # Simple linear interpolation fallback
            ratio = target_sr / orig_sr
            n_samples = int(len(audio) * ratio)
            
            indices = np.linspace(0, len(audio) - 1, n_samples)
            resampled = np.interp(indices, np.arange(len(audio)), audio)
            
            return resampled.astype(np.float32)
    
    @staticmethod
    def normalize_audio(audio: np.ndarray) -> np.ndarray:
        """
        Normalize audio amplitude
        
        Args:
            audio: Audio samples
            
        Returns:
            Normalized audio
        """
        # Peak normalization
        peak = np.abs(audio).max()
        if peak > 0:
            audio = audio / peak * 0.95  # Scale to 95% to avoid clipping
        
        return audio
    
    @staticmethod
    def remove_silence(
        audio: np.ndarray,
        sample_rate: int,
        threshold: float = 0.01,
        min_silence_duration: float = 0.3
    ) -> np.ndarray:
        """
        Remove silence from audio
        
        Args:
            audio: Audio samples
            sample_rate: Sample rate
            threshold: Amplitude threshold for silence
            min_silence_duration: Minimum silence duration to remove (seconds)
            
        Returns:
            Audio with silence removed
        """
        # Calculate energy
        energy = np.abs(audio)
        
        # Find non-silent regions
        is_speech = energy > threshold
        
        # Remove short silent gaps
        min_samples = int(min_silence_duration * sample_rate)
        
        # Simple implementation: keep samples above threshold
        non_silent_indices = np.where(is_speech)[0]
        
        if len(non_silent_indices) == 0:
            return audio  # Return original if no speech detected
        
        # Keep audio from first to last non-silent sample
        start_idx = non_silent_indices[0]
        end_idx = non_silent_indices[-1] + 1
        
        return audio[start_idx:end_idx]
    
    @staticmethod
    def split_into_chunks(
        audio: np.ndarray,
        sample_rate: int,
        chunk_duration: float = 30.0,
        overlap: float = 0.5
    ) -> list:
        """
        Split audio into chunks for processing
        
        Args:
            audio: Audio samples
            sample_rate: Sample rate
            chunk_duration: Chunk duration in seconds
            overlap: Overlap ratio between chunks (0-1)
            
        Returns:
            List of audio chunks
        """
        chunk_samples = int(chunk_duration * sample_rate)
        overlap_samples = int(chunk_samples * overlap)
        step = chunk_samples - overlap_samples
        
        chunks = []
        start = 0
        
        while start < len(audio):
            end = min(start + chunk_samples, len(audio))
            chunk = audio[start:end]
            
            # Pad last chunk if needed
            if len(chunk) < chunk_samples:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)), mode='constant')
            
            chunks.append(chunk)
            start += step
        
        return chunks
    
    @staticmethod
    def get_duration(audio: np.ndarray, sample_rate: int) -> float:
        """Get audio duration in seconds"""
        return len(audio) / sample_rate
    
    @staticmethod
    def save_audio(audio: np.ndarray, output_path: str, sample_rate: int = 16000):
        """
        Save audio to file
        
        Args:
            audio: Audio samples
            output_path: Output file path
            sample_rate: Sample rate
        """
        try:
            from pydub import AudioSegment
            
            # Convert to int16
            audio_int16 = (audio * (2 ** 15)).astype(np.int16)
            
            # Create AudioSegment
            audio_segment = AudioSegment(
                audio_int16.tobytes(),
                frame_rate=sample_rate,
                sample_width=2,  # 16-bit
                channels=1
            )
            
            # Export
            audio_segment.export(output_path, format=Path(output_path).suffix[1:])
            
        except ImportError:
            # Fallback to wave for WAV files
            import wave
            
            audio_int16 = (audio * (2 ** 15)).astype(np.int16)
            
            with wave.open(output_path, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_int16.tobytes())


# Global instance
audio_processor = AudioProcessor()

