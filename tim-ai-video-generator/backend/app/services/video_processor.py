"""
Video processing service for frame extraction and preprocessing
"""
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional, Generator
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class VideoMetadata:
    """Video metadata information"""
    width: int
    height: int
    fps: float
    frame_count: int
    duration_seconds: float
    codec: str
    size_mb: float


class VideoProcessor:
    """Process videos for ML training and inference"""
    
    def __init__(self):
        self.target_size = (224, 224)  # Default size for most models
        self.mean = [0.5, 0.5, 0.5]  # Normalization mean
        self.std = [0.5, 0.5, 0.5]   # Normalization std
    
    def get_video_metadata(self, video_path: str | Path) -> VideoMetadata:
        """
        Extract metadata from video file
        
        Args:
            video_path: Path to video file
            
        Returns:
            VideoMetadata object with video information
        """
        video_path = Path(video_path)
        
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        cap = cv2.VideoCapture(str(video_path))
        
        try:
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Get codec information
            fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
            codec = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])
            
            duration = frame_count / fps if fps > 0 else 0
            size_mb = video_path.stat().st_size / (1024 * 1024)
            
            return VideoMetadata(
                width=width,
                height=height,
                fps=fps,
                frame_count=frame_count,
                duration_seconds=duration,
                codec=codec,
                size_mb=round(size_mb, 2)
            )
        finally:
            cap.release()
    
    def extract_frames(
        self,
        video_path: str | Path,
        target_fps: Optional[float] = None,
        max_frames: Optional[int] = None,
        start_time: float = 0.0,
        end_time: Optional[float] = None
    ) -> Generator[np.ndarray, None, None]:
        """
        Extract frames from video as a generator
        
        Args:
            video_path: Path to video file
            target_fps: Target FPS for extraction (None = use original)
            max_frames: Maximum number of frames to extract
            start_time: Start time in seconds
            end_time: End time in seconds (None = until end)
            
        Yields:
            numpy arrays of frames (H, W, C)
        """
        cap = cv2.VideoCapture(str(video_path))
        
        try:
            original_fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Calculate frame skip for target FPS
            if target_fps and target_fps < original_fps:
                frame_skip = int(original_fps / target_fps)
            else:
                frame_skip = 1
            
            # Set start position
            if start_time > 0:
                start_frame = int(start_time * original_fps)
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
            
            # Calculate end frame
            if end_time:
                end_frame = int(end_time * original_fps)
            else:
                end_frame = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            frame_count = 0
            total_extracted = 0
            
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Check if we've reached end time
                if frame_count >= end_frame:
                    break
                
                # Extract frame based on skip rate
                if frame_count % frame_skip == 0:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    yield frame_rgb
                    total_extracted += 1
                    
                    # Check max frames limit
                    if max_frames and total_extracted >= max_frames:
                        break
                
                frame_count += 1
            
            logger.info(f"Extracted {total_extracted} frames from {video_path}")
            
        finally:
            cap.release()
    
    def extract_frames_list(
        self,
        video_path: str | Path,
        **kwargs
    ) -> List[np.ndarray]:
        """
        Extract frames and return as list (convenience method)
        
        Args:
            video_path: Path to video file
            **kwargs: Arguments passed to extract_frames
            
        Returns:
            List of frames as numpy arrays
        """
        return list(self.extract_frames(video_path, **kwargs))
    
    def preprocess_frame(
        self,
        frame: np.ndarray,
        target_size: Optional[Tuple[int, int]] = None,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Preprocess a single frame for model input
        
        Args:
            frame: Input frame (H, W, C)
            target_size: Target size (width, height), None = use default
            normalize: Whether to normalize pixel values
            
        Returns:
            Preprocessed frame
        """
        if target_size is None:
            target_size = self.target_size
        
        # Resize frame
        frame_resized = cv2.resize(frame, target_size, interpolation=cv2.INTER_LANCZOS4)
        
        # Convert to float
        frame_float = frame_resized.astype(np.float32) / 255.0
        
        # Normalize
        if normalize:
            frame_normalized = (frame_float - self.mean) / self.std
            return frame_normalized
        
        return frame_float
    
    def preprocess_frames_batch(
        self,
        frames: List[np.ndarray],
        target_size: Optional[Tuple[int, int]] = None,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Preprocess a batch of frames
        
        Args:
            frames: List of frames
            target_size: Target size for each frame
            normalize: Whether to normalize
            
        Returns:
            Numpy array of shape (N, H, W, C)
        """
        processed_frames = []
        
        for frame in frames:
            processed = self.preprocess_frame(frame, target_size, normalize)
            processed_frames.append(processed)
        
        return np.array(processed_frames)
    
    def create_video_from_frames(
        self,
        frames: List[np.ndarray],
        output_path: str | Path,
        fps: float = 30.0,
        codec: str = 'mp4v'
    ) -> Path:
        """
        Create video from list of frames
        
        Args:
            frames: List of frames (H, W, C) in RGB
            output_path: Output video path
            fps: Output video FPS
            codec: Video codec (mp4v, x264, etc.)
            
        Returns:
            Path to created video
        """
        output_path = Path(output_path)
        
        if not frames:
            raise ValueError("No frames provided")
        
        # Get frame dimensions
        height, width = frames[0].shape[:2]
        
        # Initialize video writer
        fourcc = cv2.VideoWriter_fourcc(*codec)
        out = cv2.VideoWriter(
            str(output_path),
            fourcc,
            fps,
            (width, height)
        )
        
        try:
            for frame in frames:
                # Convert RGB to BGR for OpenCV
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                out.write(frame_bgr)
            
            logger.info(f"Video created: {output_path} ({len(frames)} frames @ {fps} FPS)")
            
        finally:
            out.release()
        
        return output_path
    
    def sample_frames_uniform(
        self,
        video_path: str | Path,
        num_frames: int = 16
    ) -> List[np.ndarray]:
        """
        Sample N frames uniformly from video
        
        Args:
            video_path: Path to video
            num_frames: Number of frames to sample
            
        Returns:
            List of sampled frames
        """
        metadata = self.get_video_metadata(video_path)
        
        if metadata.frame_count < num_frames:
            # If video has fewer frames, extract all
            return self.extract_frames_list(video_path)
        
        # Calculate frame indices to sample
        indices = np.linspace(0, metadata.frame_count - 1, num_frames, dtype=int)
        
        cap = cv2.VideoCapture(str(video_path))
        frames = []
        
        try:
            for idx in indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if ret:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frames.append(frame_rgb)
        finally:
            cap.release()
        
        logger.info(f"Sampled {len(frames)} frames uniformly from {video_path}")
        return frames
    
    def resize_video(
        self,
        input_path: str | Path,
        output_path: str | Path,
        target_size: Tuple[int, int] = (640, 480),
        target_fps: Optional[float] = None
    ) -> Path:
        """
        Resize video to target dimensions
        
        Args:
            input_path: Input video path
            output_path: Output video path
            target_size: Target (width, height)
            target_fps: Target FPS (None = keep original)
            
        Returns:
            Path to resized video
        """
        output_path = Path(output_path)
        metadata = self.get_video_metadata(input_path)
        
        fps = target_fps if target_fps else metadata.fps
        
        # Extract, resize, and save
        frames = []
        for frame in self.extract_frames(input_path, target_fps=target_fps):
            resized = cv2.resize(frame, target_size, interpolation=cv2.INTER_AREA)
            frames.append(resized)
        
        return self.create_video_from_frames(frames, output_path, fps=fps)


# Singleton instance
video_processor = VideoProcessor()

