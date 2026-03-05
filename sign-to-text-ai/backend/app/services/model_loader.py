"""
Model loader with caching for efficient inference
"""
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple
from collections import OrderedDict
import time
import json

from app.ml.models.sign_recognition import SignRecognitionModel
from app.ml.config import InferenceConfig

logger = logging.getLogger(__name__)


class ModelCache:
    """
    LRU cache for loaded models
    Keeps frequently used models in memory
    """
    
    def __init__(self, max_size: int = 5):
        """
        Initialize model cache
        
        Args:
            max_size: Maximum number of models to keep in cache
        """
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()
        self.hit_count = 0
        self.miss_count = 0
        self.load_times: Dict[str, float] = {}
    
    def get(self, model_id: str) -> Optional[any]:
        """
        Get model from cache
        
        Args:
            model_id: Unique model identifier
            
        Returns:
            Model instance or None if not cached
        """
        if model_id in self.cache:
            self.hit_count += 1
            # Move to end (most recently used)
            self.cache.move_to_end(model_id)
            logger.debug(f"Cache HIT for model {model_id}")
            return self.cache[model_id]
        else:
            self.miss_count += 1
            logger.debug(f"Cache MISS for model {model_id}")
            return None
    
    def put(self, model_id: str, model: any, load_time: float = 0.0):
        """
        Add model to cache
        
        Args:
            model_id: Unique model identifier
            model: Model instance
            load_time: Time taken to load model
        """
        # Remove oldest if at capacity
        if len(self.cache) >= self.max_size and model_id not in self.cache:
            oldest_id = next(iter(self.cache))
            removed_model = self.cache.pop(oldest_id)
            logger.info(f"Evicted model {oldest_id} from cache")
            # Cleanup if needed
            del removed_model
        
        self.cache[model_id] = model
        self.load_times[model_id] = load_time
        logger.info(f"Cached model {model_id} (load time: {load_time:.2f}s)")
    
    def remove(self, model_id: str):
        """Remove model from cache"""
        if model_id in self.cache:
            del self.cache[model_id]
            logger.info(f"Removed model {model_id} from cache")
    
    def clear(self):
        """Clear all cached models"""
        self.cache.clear()
        self.hit_count = 0
        self.miss_count = 0
        logger.info("Cleared model cache")
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total_requests = self.hit_count + self.miss_count
        hit_rate = self.hit_count / total_requests if total_requests > 0 else 0
        
        return {
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_rate": hit_rate,
            "cached_models": list(self.cache.keys()),
            "avg_load_time": sum(self.load_times.values()) / len(self.load_times) if self.load_times else 0
        }


class ModelLoader:
    """
    Load and manage ML models with caching
    """
    
    def __init__(self, config: Optional[InferenceConfig] = None):
        """
        Initialize model loader
        
        Args:
            config: Inference configuration
        """
        self.config = config or InferenceConfig()
        self.cache = ModelCache(max_size=self.config.cache_size) if self.config.use_model_cache else None
        self.models_dir = Path("models/checkpoints")
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    def load_model(
        self,
        model_path: str,
        model_type: str = "MobileNet3D",
        force_reload: bool = False
    ) -> Tuple[any, Dict]:
        """
        Load a model from file
        
        Args:
            model_path: Path to model checkpoint
            model_type: Type of model architecture
            force_reload: Force reload even if cached
            
        Returns:
            Tuple of (model, metadata)
        """
        model_id = self._get_model_id(model_path)
        
        # Check cache first
        if self.cache and not force_reload:
            cached_model = self.cache.get(model_id)
            if cached_model is not None:
                return cached_model
        
        # Load model
        logger.info(f"Loading model from {model_path}")
        start_time = time.time()
        
        try:
            import torch
            from app.utils.gpu_utils import get_device
            
            # Load model metadata
            metadata_path = Path(model_path).with_suffix('.json')
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
            else:
                metadata = {}
            
            # Check if model file exists
            model_file = Path(model_path)
            if model_file.exists() and model_file.suffix == '.pth':
                # Load trained PyTorch model
                logger.info(f"Loading trained PyTorch model from {model_path}")
                device = get_device()
                # PyTorch 2.6+ requires weights_only=False for models with numpy objects
                # This is safe since we trust our own model files
                try:
                    # Try with weights_only=False first (for models with numpy objects)
                    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
                except Exception as e:
                    # Fallback: try with safe globals for numpy
                    try:
                        import numpy as np
                        torch.serialization.add_safe_globals([np._core.multiarray.scalar])
                        checkpoint = torch.load(model_path, map_location=device, weights_only=True)
                    except Exception as e2:
                        # Last resort: use weights_only=False
                        logger.warning(f"Using weights_only=False for model loading: {e2}")
                        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
                
                # Extract metadata from checkpoint if available
                if 'metadata' in checkpoint:
                    metadata.update(checkpoint['metadata'])
                if 'config' in checkpoint:
                    config = checkpoint['config']
                    metadata.update({
                        'num_classes': config.get('num_classes', metadata.get('num_classes', 50)),
                        'input_shape': config.get('input_shape', metadata.get('input_shape', [16, 224, 224, 3])),
                        'dropout_rate': config.get('dropout_rate', metadata.get('dropout_rate', 0.5)),
                        'use_batch_norm': config.get('use_batch_norm', metadata.get('use_batch_norm', True)),
                    })
                
                # Create model architecture
                model = self._create_model_instance(model_type, metadata)
                
                # Load weights
                if 'model_state_dict' in checkpoint:
                    model.load_state_dict(checkpoint['model_state_dict'])
                elif 'state_dict' in checkpoint:
                    model.load_state_dict(checkpoint['state_dict'])
                else:
                    model.load_state_dict(checkpoint)
                
                logger.info("✅ Model weights loaded successfully")
            else:
                # Create new model (for training or if no checkpoint exists)
                logger.info("Creating new model (no checkpoint found)")
                model = self._create_model_instance(model_type, metadata)
            
            load_time = time.time() - start_time
            
            # Cache model
            if self.cache:
                self.cache.put(model_id, (model, metadata), load_time)
            
            logger.info(f"Model loaded successfully in {load_time:.2f}s")
            
            return model, metadata
        
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            raise RuntimeError(f"Model loading failed: {e}")
    
    def load_model_by_id(self, model_version_id: int) -> Tuple[any, Dict]:
        """
        Load model by ModelVersion ID from database
        
        Args:
            model_version_id: Database ID of model version
            
        Returns:
            Tuple of (model, metadata)
        """
        # In production, fetch model path from database
        # For now, use default path
        model_path = self.models_dir / f"model_{model_version_id}.pth"
        return self.load_model(str(model_path))
    
    def load_best_model(self, dataset_id: Optional[int] = None) -> Tuple[any, Dict]:
        """
        Load the best performing model
        
        Args:
            dataset_id: Optional dataset ID to filter models
            
        Returns:
            Tuple of (model, metadata)
        """
        # In production, query database for best model
        best_model_path = self.models_dir / "best_model.pth"
        
        if not best_model_path.exists():
            raise FileNotFoundError("No trained model found. Please train a model first.")
        
        return self.load_model(str(best_model_path))
    
    def _create_model_instance(self, model_type: str, metadata: Dict) -> any:
        """
        Create model instance from architecture specification
        
        Args:
            model_type: Model type
            metadata: Model metadata
            
        Returns:
            Model instance
        """
        # Get model config from metadata
        num_classes = metadata.get('num_classes', 50)
        input_shape = tuple(metadata.get('input_shape', [16, 224, 224, 3]))
        dropout_rate = metadata.get('dropout_rate', 0.5)
        use_batch_norm = metadata.get('use_batch_norm', True)
        
        # Create PyTorch model
        from app.ml.models.pytorch_model import create_pytorch_model
        model = create_pytorch_model(
            num_classes=num_classes,
            model_type=model_type,
            input_shape=input_shape,
            dropout_rate=dropout_rate,
            use_batch_norm=use_batch_norm
        )
        
        return model
    
    def _get_model_id(self, model_path: str) -> str:
        """Generate unique model ID from path"""
        return Path(model_path).stem
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        if self.cache:
            return self.cache.get_stats()
        return {"cache_enabled": False}
    
    def clear_cache(self):
        """Clear model cache"""
        if self.cache:
            self.cache.clear()
            logger.info("Model cache cleared")


# Global model loader instance
_model_loader: Optional[ModelLoader] = None


def get_model_loader() -> ModelLoader:
    """Get global model loader instance"""
    global _model_loader
    if _model_loader is None:
        _model_loader = ModelLoader()
    return _model_loader


def load_active_model() -> Tuple[any, Dict]:
    """
    Load the currently active model
    
    Returns:
        Tuple of (model, metadata)
    """
    loader = get_model_loader()
    return loader.load_best_model()

