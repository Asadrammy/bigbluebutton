"""
Data augmentation strategies for video sign language data
"""
import numpy as np
import cv2
from typing import Tuple, Optional
import random


class VideoAugmentation:
    """Video-specific augmentation for sign language recognition"""
    
    def __init__(
        self,
        rotation_range: int = 10,
        shift_range: float = 0.1,
        zoom_range: float = 0.1,
        brightness_range: Tuple[float, float] = (0.8, 1.2),
        flip_horizontal: bool = False,  # Don't flip for sign language!
        augmentation_prob: float = 0.5
    ):
        """
        Initialize video augmentation
        
        Args:
            rotation_range: Max rotation in degrees
            shift_range: Max shift as fraction of image size
            zoom_range: Max zoom in/out as fraction
            brightness_range: Min/max brightness multiplier
            flip_horizontal: Whether to flip horizontally (NOT recommended for sign language)
            augmentation_prob: Probability of applying each augmentation
        """
        self.rotation_range = rotation_range
        self.shift_range = shift_range
        self.zoom_range = zoom_range
        self.brightness_range = brightness_range
        self.flip_horizontal = flip_horizontal
        self.augmentation_prob = augmentation_prob
    
    def __call__(self, frames: np.ndarray) -> np.ndarray:
        """
        Apply augmentation to video frames
        
        Args:
            frames: Array of shape (T, H, W, C) or (T, H, W)
            
        Returns:
            Augmented frames
        """
        if random.random() > self.augmentation_prob:
            return frames
        
        # Apply same transformation to all frames for temporal consistency
        frames = self._apply_rotation(frames)
        frames = self._apply_shift(frames)
        frames = self._apply_zoom(frames)
        frames = self._apply_brightness(frames)
        
        if self.flip_horizontal and random.random() < 0.5:
            frames = self._apply_flip(frames)
        
        return frames
    
    def _apply_rotation(self, frames: np.ndarray) -> np.ndarray:
        """Rotate frames by random angle"""
        if random.random() > self.augmentation_prob:
            return frames
        
        angle = random.uniform(-self.rotation_range, self.rotation_range)
        h, w = frames.shape[1:3]
        center = (w // 2, h // 2)
        
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        rotated_frames = []
        for frame in frames:
            rotated = cv2.warpAffine(frame, rotation_matrix, (w, h))
            rotated_frames.append(rotated)
        
        return np.array(rotated_frames)
    
    def _apply_shift(self, frames: np.ndarray) -> np.ndarray:
        """Shift frames horizontally and vertically"""
        if random.random() > self.augmentation_prob:
            return frames
        
        h, w = frames.shape[1:3]
        tx = int(random.uniform(-self.shift_range, self.shift_range) * w)
        ty = int(random.uniform(-self.shift_range, self.shift_range) * h)
        
        translation_matrix = np.float32([[1, 0, tx], [0, 1, ty]])
        
        shifted_frames = []
        for frame in frames:
            shifted = cv2.warpAffine(frame, translation_matrix, (w, h))
            shifted_frames.append(shifted)
        
        return np.array(shifted_frames)
    
    def _apply_zoom(self, frames: np.ndarray) -> np.ndarray:
        """Zoom in/out on frames"""
        if random.random() > self.augmentation_prob:
            return frames
        
        zoom_factor = 1.0 + random.uniform(-self.zoom_range, self.zoom_range)
        h, w = frames.shape[1:3]
        
        # Calculate new size
        new_h, new_w = int(h * zoom_factor), int(w * zoom_factor)
        
        zoomed_frames = []
        for frame in frames:
            # Resize
            resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            
            # Crop or pad to original size
            if zoom_factor > 1.0:
                # Crop center
                start_h = (new_h - h) // 2
                start_w = (new_w - w) // 2
                cropped = resized[start_h:start_h+h, start_w:start_w+w]
                zoomed_frames.append(cropped)
            else:
                # Pad edges
                pad_h = (h - new_h) // 2
                pad_w = (w - new_w) // 2
                if len(frame.shape) == 3:
                    padded = np.zeros((h, w, frame.shape[2]), dtype=frame.dtype)
                else:
                    padded = np.zeros((h, w), dtype=frame.dtype)
                padded[pad_h:pad_h+new_h, pad_w:pad_w+new_w] = resized
                zoomed_frames.append(padded)
        
        return np.array(zoomed_frames)
    
    def _apply_brightness(self, frames: np.ndarray) -> np.ndarray:
        """Adjust brightness"""
        if random.random() > self.augmentation_prob:
            return frames
        
        factor = random.uniform(*self.brightness_range)
        brightened = np.clip(frames * factor, 0, 255).astype(frames.dtype)
        
        return brightened
    
    def _apply_flip(self, frames: np.ndarray) -> np.ndarray:
        """Flip frames horizontally (use with caution for sign language!)"""
        return np.flip(frames, axis=2).copy()


class TemporalAugmentation:
    """Temporal augmentation for video sequences"""
    
    def __init__(
        self,
        time_stretch_range: Tuple[float, float] = (0.8, 1.2),
        temporal_jitter: bool = True,
        augmentation_prob: float = 0.5
    ):
        """
        Initialize temporal augmentation
        
        Args:
            time_stretch_range: Min/max time stretch factor
            temporal_jitter: Whether to add random temporal jitter
            augmentation_prob: Probability of applying augmentation
        """
        self.time_stretch_range = time_stretch_range
        self.temporal_jitter = temporal_jitter
        self.augmentation_prob = augmentation_prob
    
    def __call__(self, frames: np.ndarray, target_length: int) -> np.ndarray:
        """
        Apply temporal augmentation
        
        Args:
            frames: Array of shape (T, H, W, C)
            target_length: Desired number of frames
            
        Returns:
            Temporally augmented frames
        """
        if random.random() > self.augmentation_prob:
            return self._uniform_sample(frames, target_length)
        
        # Time stretch
        stretch_factor = random.uniform(*self.time_stretch_range)
        stretched_length = int(len(frames) * stretch_factor)
        
        # Sample frames
        if self.temporal_jitter:
            sampled = self._jittered_sample(frames, target_length)
        else:
            sampled = self._uniform_sample(frames, target_length)
        
        return sampled
    
    def _uniform_sample(self, frames: np.ndarray, target_length: int) -> np.ndarray:
        """Uniformly sample frames"""
        num_frames = len(frames)
        
        if num_frames >= target_length:
            # Sample uniformly
            indices = np.linspace(0, num_frames - 1, target_length, dtype=int)
        else:
            # Repeat frames if too short
            indices = np.array([i % num_frames for i in range(target_length)])
        
        return frames[indices]
    
    def _jittered_sample(self, frames: np.ndarray, target_length: int) -> np.ndarray:
        """Sample frames with temporal jitter"""
        num_frames = len(frames)
        
        if num_frames >= target_length:
            # Add random jitter to uniform sampling
            base_indices = np.linspace(0, num_frames - 1, target_length)
            jitter = np.random.randint(-2, 3, size=target_length)
            indices = np.clip(base_indices + jitter, 0, num_frames - 1).astype(int)
        else:
            # Repeat with jitter
            indices = np.array([i % num_frames for i in range(target_length)])
        
        return frames[indices]


class SignLanguageAugmentation:
    """
    Combined augmentation strategy specifically for sign language videos
    Preserves important features like hand shape and movement
    """
    
    def __init__(
        self,
        spatial_aug_prob: float = 0.5,
        temporal_aug_prob: float = 0.5,
        config: Optional[dict] = None
    ):
        """
        Initialize sign language augmentation
        
        Args:
            spatial_aug_prob: Probability of applying spatial augmentation
            temporal_aug_prob: Probability of applying temporal augmentation
            config: Optional config dict with augmentation parameters
        """
        config = config or {}
        
        # Spatial augmentation (mild to preserve hand details)
        self.spatial_aug = VideoAugmentation(
            rotation_range=config.get('rotation_range', 5),  # Reduced for sign language
            shift_range=config.get('shift_range', 0.05),     # Reduced
            zoom_range=config.get('zoom_range', 0.1),
            brightness_range=config.get('brightness_range', (0.9, 1.1)),
            flip_horizontal=False,  # NEVER flip sign language videos!
            augmentation_prob=spatial_aug_prob
        )
        
        # Temporal augmentation
        self.temporal_aug = TemporalAugmentation(
            time_stretch_range=config.get('time_stretch_range', (0.9, 1.1)),  # Mild
            temporal_jitter=config.get('temporal_jitter', True),
            augmentation_prob=temporal_aug_prob
        )
    
    def __call__(
        self,
        frames: np.ndarray,
        target_length: int
    ) -> np.ndarray:
        """
        Apply combined augmentation
        
        Args:
            frames: Video frames (T, H, W, C)
            target_length: Target number of frames
            
        Returns:
            Augmented frames
        """
        # Temporal first (sampling)
        frames = self.temporal_aug(frames, target_length)
        
        # Then spatial (transformations)
        frames = self.spatial_aug(frames)
        
        return frames


# Convenience function
def get_augmentation(
    augmentation_type: str = "sign_language",
    **kwargs
) -> callable:
    """
    Get augmentation strategy
    
    Args:
        augmentation_type: Type of augmentation ("sign_language", "video", "temporal")
        **kwargs: Additional parameters
        
    Returns:
        Augmentation callable
    """
    if augmentation_type == "sign_language":
        return SignLanguageAugmentation(**kwargs)
    elif augmentation_type == "video":
        return VideoAugmentation(**kwargs)
    elif augmentation_type == "temporal":
        return TemporalAugmentation(**kwargs)
    else:
        raise ValueError(f"Unknown augmentation type: {augmentation_type}")

