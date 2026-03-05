"""
Data loaders for sign language video datasets
Uses NumPy arrays for compatibility with both PyTorch and TensorFlow
"""
import json
import numpy as np
import cv2
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Union
import logging

from app.ml.config import DataConfig
from app.ml.augmentation import get_augmentation
from app.services.video_processor import video_processor

logger = logging.getLogger(__name__)


class SignLanguageDataset:
    """
    Dataset class for sign language videos
    Compatible with both PyTorch and TensorFlow
    """
    
    def __init__(
        self,
        dataset_name: str,
        split: str = "train",
        config: Optional[DataConfig] = None,
        transform: Optional[callable] = None,
        num_frames: int = 16,
        frame_size: Tuple[int, int] = (224, 224),
        augment: bool = True
    ):
        """
        Initialize dataset
        
        Args:
            dataset_name: Name of the dataset
            split: Data split ("train", "val", "test")
            config: Data configuration
            transform: Custom transformation function
            num_frames: Number of frames to sample
            frame_size: Target frame size (H, W)
            augment: Whether to apply augmentation
        """
        self.dataset_name = dataset_name
        self.split = split
        self.config = config or DataConfig()
        self.transform = transform
        self.num_frames = num_frames
        self.frame_size = frame_size
        self.augment = augment and (split == "train")
        
        # Load manifest
        self.manifest_path = self.config.data_dir / dataset_name / f"{split}_manifest.json"
        self.samples = self._load_manifest()
        
        # Build label mapping
        self.label_to_idx = self._build_label_mapping()
        self.idx_to_label = {v: k for k, v in self.label_to_idx.items()}
        self.num_classes = len(self.label_to_idx)
        
        # Setup augmentation
        if self.augment:
            self.augmentation = get_augmentation(
                "sign_language",
                spatial_aug_prob=0.5,
                temporal_aug_prob=0.5
            )
        else:
            self.augmentation = None
        
        logger.info(
            f"Loaded {len(self.samples)} samples from {dataset_name}/{split} "
            f"with {self.num_classes} classes"
        )
    
    def _load_manifest(self) -> List[Dict]:
        """Load manifest file"""
        if not self.manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {self.manifest_path}")
        
        with open(self.manifest_path, 'r') as f:
            manifest = json.load(f)
        
        return manifest
    
    def _build_label_mapping(self) -> Dict[str, int]:
        """Build mapping from sign labels to indices"""
        unique_labels = sorted(set(sample['sign_label'] for sample in self.samples))
        return {label: idx for idx, label in enumerate(unique_labels)}
    
    def __len__(self) -> int:
        """Get dataset size"""
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Tuple[np.ndarray, int, Dict]:
        """
        Get a sample
        
        Args:
            idx: Sample index
            
        Returns:
            Tuple of (frames, label_idx, metadata)
            frames: (T, H, W, C) numpy array
            label_idx: Integer class index
            metadata: Dict with additional info
        """
        sample = self.samples[idx]
        
        # Get video path
        video_filename = sample['video_filename']
        video_path = self._get_video_path(video_filename)
        
        # Load video frames
        frames = self._load_video(video_path)
        
        # Apply augmentation/sampling
        if self.augmentation:
            frames = self.augmentation(frames, self.num_frames)
        else:
            frames = self._sample_frames(frames, self.num_frames)
        
        # Resize frames
        frames = self._resize_frames(frames, self.frame_size)
        
        # Normalize
        frames = self._normalize_frames(frames)
        
        # Apply custom transform
        if self.transform:
            frames = self.transform(frames)
        
        # Get label
        label_str = sample['sign_label']
        label_idx = self.label_to_idx[label_str]
        
        # Metadata
        metadata = {
            'video_filename': video_filename,
            'sign_label': label_str,
            'duration': sample.get('duration', 0),
            'frame_count': sample.get('frame_count', 0)
        }
        
        return frames, label_idx, metadata
    
    def _get_video_path(self, video_filename: str) -> Path:
        """Get full path to video file"""
        # Extract user_id from filename (format: user_X_timestamp_hash.mp4)
        parts = video_filename.split('_')
        if len(parts) >= 2 and parts[0] == 'user':
            user_id = parts[1]
            video_path = Path("uploads/videos") / user_id / video_filename
        else:
            # Fallback
            video_path = Path("uploads/videos") / video_filename
        
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        return video_path
    
    def _load_video(self, video_path: Path) -> np.ndarray:
        """
        Load video frames
        
        Args:
            video_path: Path to video file
            
        Returns:
            Frames array (T, H, W, C)
        """
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            raise IOError(f"Could not open video: {video_path}")
        
        frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Convert BGR to RGB
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
        
        cap.release()
        
        if len(frames) == 0:
            raise ValueError(f"No frames loaded from video: {video_path}")
        
        return np.array(frames)
    
    def _sample_frames(self, frames: np.ndarray, num_frames: int) -> np.ndarray:
        """Uniformly sample frames"""
        total_frames = len(frames)
        
        if total_frames >= num_frames:
            indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)
        else:
            # Repeat frames if too short
            indices = np.array([i % total_frames for i in range(num_frames)])
        
        return frames[indices]
    
    def _resize_frames(self, frames: np.ndarray, size: Tuple[int, int]) -> np.ndarray:
        """Resize frames to target size"""
        resized = []
        for frame in frames:
            resized_frame = cv2.resize(frame, size, interpolation=cv2.INTER_LINEAR)
            resized.append(resized_frame)
        
        return np.array(resized)
    
    def _normalize_frames(self, frames: np.ndarray) -> np.ndarray:
        """Normalize frames to [0, 1] range"""
        return frames.astype(np.float32) / 255.0
    
    def get_class_weights(self) -> np.ndarray:
        """Calculate class weights for imbalanced datasets"""
        label_counts = {}
        for sample in self.samples:
            label = sample['sign_label']
            label_counts[label] = label_counts.get(label, 0) + 1
        
        # Calculate inverse frequency weights
        total_samples = len(self.samples)
        weights = np.zeros(self.num_classes)
        
        for label, idx in self.label_to_idx.items():
            count = label_counts.get(label, 1)
            weights[idx] = total_samples / (self.num_classes * count)
        
        return weights


class DataLoaderWrapper:
    """
    Simple data loader wrapper for batch iteration
    Provides a consistent interface similar to PyTorch DataLoader
    """
    
    def __init__(
        self,
        dataset: SignLanguageDataset,
        batch_size: int = 8,
        shuffle: bool = True,
        drop_last: bool = False
    ):
        """
        Initialize data loader
        
        Args:
            dataset: SignLanguageDataset instance
            batch_size: Batch size
            shuffle: Whether to shuffle data
            drop_last: Whether to drop last incomplete batch
        """
        self.dataset = dataset
        self.batch_size = batch_size
        self.shuffle = shuffle
        self.drop_last = drop_last
        
        self.indices = np.arange(len(dataset))
        if self.shuffle:
            np.random.shuffle(self.indices)
        
        self.num_batches = len(dataset) // batch_size
        if not drop_last and len(dataset) % batch_size != 0:
            self.num_batches += 1
    
    def __len__(self) -> int:
        """Get number of batches"""
        return self.num_batches
    
    def __iter__(self):
        """Iterate over batches"""
        if self.shuffle:
            np.random.shuffle(self.indices)
        
        for i in range(self.num_batches):
            start_idx = i * self.batch_size
            end_idx = min(start_idx + self.batch_size, len(self.dataset))
            
            batch_indices = self.indices[start_idx:end_idx]
            
            # Collect batch samples
            batch_frames = []
            batch_labels = []
            batch_metadata = []
            
            for idx in batch_indices:
                frames, label, metadata = self.dataset[idx]
                batch_frames.append(frames)
                batch_labels.append(label)
                batch_metadata.append(metadata)
            
            # Stack into arrays
            batch_frames = np.stack(batch_frames, axis=0)  # (B, T, H, W, C)
            batch_labels = np.array(batch_labels)           # (B,)
            
            yield batch_frames, batch_labels, batch_metadata


def create_data_loaders(
    dataset_name: str,
    batch_size: int = 8,
    num_frames: int = 16,
    frame_size: Tuple[int, int] = (224, 224),
    num_workers: int = 0,
    config: Optional[DataConfig] = None
) -> Tuple[DataLoaderWrapper, DataLoaderWrapper, DataLoaderWrapper]:
    """
    Create train, validation, and test data loaders
    
    Args:
        dataset_name: Name of the dataset
        batch_size: Batch size
        num_frames: Number of frames per video
        frame_size: Frame size (H, W)
        num_workers: Number of workers (not used in simple wrapper)
        config: Data configuration
        
    Returns:
        Tuple of (train_loader, val_loader, test_loader)
    """
    config = config or DataConfig()
    
    # Create datasets
    train_dataset = SignLanguageDataset(
        dataset_name=dataset_name,
        split="train",
        config=config,
        num_frames=num_frames,
        frame_size=frame_size,
        augment=True
    )
    
    val_dataset = SignLanguageDataset(
        dataset_name=dataset_name,
        split="val",
        config=config,
        num_frames=num_frames,
        frame_size=frame_size,
        augment=False
    )
    
    test_dataset = SignLanguageDataset(
        dataset_name=dataset_name,
        split="test",
        config=config,
        num_frames=num_frames,
        frame_size=frame_size,
        augment=False
    )
    
    # Create loaders
    train_loader = DataLoaderWrapper(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        drop_last=True
    )
    
    val_loader = DataLoaderWrapper(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        drop_last=False
    )
    
    test_loader = DataLoaderWrapper(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        drop_last=False
    )
    
    logger.info(
        f"Created data loaders: "
        f"train={len(train_dataset)}, "
        f"val={len(val_dataset)}, "
        f"test={len(test_dataset)}"
    )
    
    return train_loader, val_loader, test_loader


def get_dataset_info(dataset_name: str, config: Optional[DataConfig] = None) -> Dict:
    """
    Get information about a dataset
    
    Args:
        dataset_name: Name of the dataset
        config: Data configuration
        
    Returns:
        Dict with dataset information
    """
    config = config or DataConfig()
    
    # Load all splits
    info = {
        'dataset_name': dataset_name,
        'splits': {}
    }
    
    for split in ['train', 'val', 'test']:
        try:
            dataset = SignLanguageDataset(
                dataset_name=dataset_name,
                split=split,
                config=config,
                augment=False
            )
            
            info['splits'][split] = {
                'num_samples': len(dataset),
                'num_classes': dataset.num_classes,
                'class_names': list(dataset.label_to_idx.keys())
            }
        except FileNotFoundError:
            info['splits'][split] = None
    
    # Overall info
    train_split = info['splits'].get('train')
    if train_split:
        info['num_classes'] = train_split['num_classes']
        info['class_names'] = train_split['class_names']
    
    return info

