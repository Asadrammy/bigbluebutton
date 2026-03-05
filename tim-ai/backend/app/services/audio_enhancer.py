"""
Audio Enhancement Service
Provides advanced audio processing and enhancement features
"""
import numpy as np
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

class AudioEnhancer:
    """Advanced audio processing and enhancement"""
    
    def __init__(self):
        self.sample_rate = 16000
        self.chunk_size = 1024
    
    def enhance_audio_quality(self, audio_data: np.ndarray) -> np.ndarray:
        """Enhance audio quality with noise reduction and normalization"""
        try:
            # Remove DC offset
            audio_data = audio_data - np.mean(audio_data)
            
            # Apply gentle noise gate
            audio_data = self._apply_noise_gate(audio_data)
            
            # Normalize audio
            audio_data = self._normalize_audio(audio_data)
            
            # Apply high-pass filter to remove low frequency noise
            audio_data = self._apply_high_pass_filter(audio_data)
            
            logger.info("✅ Audio enhanced successfully")
            return audio_data
            
        except Exception as e:
            logger.error(f"Audio enhancement failed: {e}")
            return audio_data
    
    def _apply_noise_gate(self, audio_data: np.ndarray, threshold: float = 0.01) -> np.ndarray:
        """Apply noise gate to remove low-level noise"""
        # Calculate RMS
        rms = np.sqrt(np.mean(audio_data**2))
        
        if rms < threshold:
            # If signal is too quiet, apply stronger gate
            gate_threshold = threshold * 2
            audio_data = np.where(np.abs(audio_data) < gate_threshold, 0, audio_data)
        
        return audio_data
    
    def _normalize_audio(self, audio_data: np.ndarray) -> np.ndarray:
        """Normalize audio to prevent clipping"""
        max_val = np.max(np.abs(audio_data))
        if max_val > 0:
            # Normalize to 80% of maximum to prevent clipping
            audio_data = audio_data / max_val * 0.8
        return audio_data
    
    def _apply_high_pass_filter(self, audio_data: np.ndarray, cutoff: float = 80) -> np.ndarray:
        """Apply simple high-pass filter to remove low frequency noise"""
        try:
            from scipy import signal
            
            # Design high-pass filter
            nyquist = self.sample_rate / 2
            normalized_cutoff = cutoff / nyquist
            b, a = signal.butter(4, normalized_cutoff, btype='high')
            
            # Apply filter
            filtered_audio = signal.filtfilt(b, a, audio_data)
            
            return filtered_audio
            
        except ImportError:
            # If scipy not available, return original audio
            logger.warning("scipy not available, skipping high-pass filter")
            return audio_data
    
    def detect_speech_activity(self, audio_data: np.ndarray) -> Tuple[bool, float]:
        """Detect if audio contains speech activity"""
        try:
            # Calculate energy
            energy = np.sum(audio_data**2) / len(audio_data)
            
            # Calculate zero crossing rate
            zero_crossings = np.sum(np.diff(np.sign(audio_data)) != 0) / len(audio_data)
            
            # Simple speech detection based on energy and zero crossings
            speech_threshold = 0.001
            zcr_threshold = 0.1
            
            has_speech = energy > speech_threshold and zero_crossings > zcr_threshold
            confidence = min(1.0, energy / speech_threshold)
            
            logger.info(f"🎵 Speech detection: {has_speech} (energy: {energy:.6f}, zcr: {zero_crossings:.3f})")
            
            return has_speech, confidence
            
        except Exception as e:
            logger.error(f"Speech detection failed: {e}")
            return True, 0.5  # Default to assuming speech
    
    def optimize_for_whisper(self, audio_data: np.ndarray) -> np.ndarray:
        """Optimize audio specifically for Whisper model"""
        try:
            # Ensure correct sample rate (Whisper expects 16kHz)
            if len(audio_data.shape) > 1:
                # Convert to mono if stereo
                audio_data = np.mean(audio_data, axis=1)
            
            # Ensure float32 format
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Apply enhancement
            audio_data = self.enhance_audio_quality(audio_data)
            
            # Pad or trim to optimal length (Whisper works best with 30-second chunks)
            max_length = 30 * self.sample_rate  # 30 seconds
            
            if len(audio_data) > max_length:
                # Trim to maximum length
                audio_data = audio_data[:max_length]
            elif len(audio_data) < self.sample_rate:  # Less than 1 second
                # Pad short audio
                padding = max_length - len(audio_data)
                audio_data = np.pad(audio_data, (0, padding), mode='constant')
            
            logger.info(f"✅ Audio optimized for Whisper: {len(audio_data)} samples")
            return audio_data
            
        except Exception as e:
            logger.error(f"Audio optimization failed: {e}")
            return audio_data
