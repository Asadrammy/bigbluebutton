"""
ML model configuration and hyperparameters
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from pathlib import Path


@dataclass
class ModelConfig:
    """Configuration for sign recognition model"""
    
    # Model Architecture
    model_type: str = "MobileNet3D"  # Options: "MobileNet3D", "I3D", "LSTM_CNN"
    num_classes: int = 50  # Number of sign classes
    input_shape: Tuple[int, int, int, int] = (16, 224, 224, 3)  # (frames, height, width, channels)
    sign_language_code: Optional[str] = None
    
    # Training Hyperparameters
    batch_size: int = 8
    learning_rate: float = 0.001
    num_epochs: int = 100
    patience: int = 15  # Early stopping patience
    
    # Optimizer
    optimizer: str = "Adam"  # Options: "Adam", "SGD", "AdamW"
    weight_decay: float = 0.0001
    momentum: float = 0.9  # For SGD
    
    # Learning Rate Scheduler
    use_scheduler: bool = True
    scheduler_type: str = "ReduceLROnPlateau"  # Options: "ReduceLROnPlateau", "CosineAnnealing", "StepLR"
    scheduler_factor: float = 0.5
    scheduler_patience: int = 5
    min_lr: float = 1e-7
    
    # Data Augmentation
    use_augmentation: bool = True
    augmentation_prob: float = 0.5
    rotation_range: int = 10  # degrees
    shift_range: float = 0.1  # fraction of image
    zoom_range: float = 0.1
    brightness_range: Tuple[float, float] = (0.8, 1.2)
    
    # Frame Sampling
    num_frames: int = 16  # Number of frames to sample from video
    frame_sampling: str = "uniform"  # Options: "uniform", "random", "center"
    
    # Model Performance
    dropout_rate: float = 0.5
    use_batch_norm: bool = True
    activation: str = "relu"  # Options: "relu", "gelu", "swish"
    
    # Transfer Learning
    use_pretrained: bool = False
    freeze_backbone: bool = False
    pretrained_path: Optional[str] = None
    
    # Checkpointing
    save_best_only: bool = True
    checkpoint_metric: str = "val_accuracy"  # Options: "val_accuracy", "val_loss"
    checkpoint_mode: str = "max"  # Options: "max" for accuracy, "min" for loss
    
    # Paths
    model_dir: Path = Path("models/checkpoints")
    log_dir: Path = Path("logs/training")
    
    # Device
    device: str = "cpu"  # Will be auto-detected in trainer
    use_mixed_precision: bool = False  # FP16 training
    
    # Validation
    val_split: float = 0.15
    test_split: float = 0.15
    
    # Metrics
    metrics: List[str] = field(default_factory=lambda: ["accuracy", "top5_accuracy", "f1_score"])
    
    # Reproducibility
    seed: int = 42
    deterministic: bool = True
    
    def __post_init__(self):
        """Create directories if they don't exist"""
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)


@dataclass
class InferenceConfig:
    """Configuration for model inference"""
    
    # Model Loading
    model_path: str = "models/checkpoints/best_model.pth"
    device: str = "cpu"
    
    # Input Processing
    num_frames: int = 16
    frame_size: Tuple[int, int] = (224, 224)
    normalize: bool = True
    
    # Prediction
    batch_size: int = 1
    top_k: int = 5  # Return top-k predictions
    confidence_threshold: float = 0.3  # Minimum confidence for prediction
    
    # Performance
    use_model_cache: bool = True
    cache_size: int = 5  # Number of models to keep in memory
    
    # Post-processing
    smooth_predictions: bool = True  # Temporal smoothing
    smoothing_window: int = 5  # Frames to average


@dataclass
class DataConfig:
    """Configuration for data loading and preprocessing"""
    
    # Dataset
    dataset_name: str = "DGS_Basic_Signs"
    data_dir: Path = Path("data/datasets")
    
    # Data Loading
    num_workers: int = 4
    pin_memory: bool = True
    prefetch_factor: int = 2
    
    # Preprocessing
    resize_shape: Tuple[int, int] = (224, 224)
    normalize_mean: Tuple[float, float, float] = (0.485, 0.456, 0.406)  # ImageNet mean
    normalize_std: Tuple[float, float, float] = (0.229, 0.224, 0.225)   # ImageNet std
    
    # Video Processing
    fps: int = 15  # Frames per second to extract
    max_video_length: int = 300  # Maximum frames to consider
    min_video_length: int = 8    # Minimum frames required
    
    # Class Balancing
    use_class_weights: bool = True
    oversample_minority: bool = False
    
    # Cache
    cache_videos: bool = False  # Cache extracted frames in memory


# Default configurations
DEFAULT_MODEL_CONFIG = ModelConfig()
DEFAULT_INFERENCE_CONFIG = InferenceConfig()
DEFAULT_DATA_CONFIG = DataConfig()


def get_model_config(
    num_classes: int,
    model_type: str = "MobileNet3D",
    **kwargs
) -> ModelConfig:
    """
    Get model configuration with custom parameters
    
    Args:
        num_classes: Number of sign classes
        model_type: Type of model architecture
        **kwargs: Additional config overrides
        
    Returns:
        ModelConfig instance
    """
    config = ModelConfig(
        num_classes=num_classes,
        model_type=model_type
    )
    
    # Apply overrides
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    return config


def get_inference_config(
    model_path: str,
    **kwargs
) -> InferenceConfig:
    """
    Get inference configuration with custom parameters
    
    Args:
        model_path: Path to trained model
        **kwargs: Additional config overrides
        
    Returns:
        InferenceConfig instance
    """
    config = InferenceConfig(model_path=model_path)
    
    # Apply overrides
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    return config


def save_config(config: ModelConfig, path: str):
    """Save configuration to file"""
    import json
    from dataclasses import asdict
    
    config_dict = asdict(config)
    
    # Convert Path objects to strings
    for key, value in config_dict.items():
        if isinstance(value, Path):
            config_dict[key] = str(value)
    
    with open(path, 'w') as f:
        json.dump(config_dict, f, indent=2)


def load_config(path: str) -> ModelConfig:
    """Load configuration from file"""
    import json
    
    with open(path, 'r') as f:
        config_dict = json.load(f)
    
    # Convert string paths back to Path objects
    if 'model_dir' in config_dict:
        config_dict['model_dir'] = Path(config_dict['model_dir'])
    if 'log_dir' in config_dict:
        config_dict['log_dir'] = Path(config_dict['log_dir'])
    
    return ModelConfig(**config_dict)

