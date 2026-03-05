"""
Inference service for sign language recognition
Real PyTorch implementation with GPU support
"""
import numpy as np
import torch
import logging
from typing import Dict, List, Tuple, Optional
import time

from app.ml.config import InferenceConfig
from app.services.model_loader import get_model_loader
from app.services.video_processor import video_processor
from app.utils.gpu_utils import get_device, optimize_for_inference

logger = logging.getLogger(__name__)


class SignLanguageInference:
    """
    Inference service for sign language recognition
    """
    
    def __init__(self, config: Optional[InferenceConfig] = None):
        """
        Initialize inference service
        
        Args:
            config: Inference configuration
        """
        self.config = config or InferenceConfig()
        self.model_loader = get_model_loader()
        self.model = None
        self.metadata = None
        self.class_names = []
        
        # Device setup
        self.device = get_device()
        if self.config.device == "cpu":
            self.device = "cpu"
        elif self.config.device.startswith("cuda"):
            if torch.cuda.is_available():
                self.device = self.config.device
            else:
                logger.warning("CUDA requested but not available, using CPU")
                self.device = "cpu"
        else:
            self.device = get_device()  # Auto-detect
        
        # Performance tracking
        self.inference_times = []
    
    def load_model(self, model_path: Optional[str] = None):
        """
        Load model for inference
        
        Args:
            model_path: Path to model checkpoint (None = load best model)
        """
        try:
            if model_path:
                self.model, self.metadata = self.model_loader.load_model(model_path)
            else:
                self.model, self.metadata = self.model_loader.load_best_model()
        except FileNotFoundError:
            logger.warning("No trained model found. Creating new model for inference.")
            # Create a new model if none exists (for testing)
            from app.ml.models.pytorch_model import create_pytorch_model
            num_classes = self.config.top_k if hasattr(self.config, 'top_k') else 50
            self.model = create_pytorch_model(
                num_classes=num_classes,
                input_shape=(self.config.num_frames, *self.config.frame_size, 3)
            )
            self.metadata = {'num_classes': num_classes, 'class_names': []}
        
        # Move model to device and optimize
        if isinstance(self.model, torch.nn.Module):
            self.model = self.model.to(self.device)
            self.model = optimize_for_inference(self.model, self.device)
            self.model.eval()
            logger.info(f"Model loaded on {self.device}")
        else:
            logger.warning("Model is not a PyTorch module, inference may be slow")
        
        # Get class names
        self.class_names = self.metadata.get('class_names', [])
        if not self.class_names:
            # Generate default class names
            num_classes = self.metadata.get('num_classes', 50)
            self.class_names = [f"Sign_{i}" for i in range(num_classes)]
        
        logger.info(f"Model loaded with {len(self.class_names)} classes on {self.device}")
    
    def predict(
        self,
        video_frames: np.ndarray,
        return_probabilities: bool = False
    ) -> Dict:
        """
        Predict sign from video frames
        
        Args:
            video_frames: Video frames (T, H, W, C) or (T, H, W)
            return_probabilities: Whether to return full probability distribution
            
        Returns:
            Prediction dictionary with sign label, confidence, etc.
        """
        if self.model is None:
            self.load_model()
        
        start_time = time.time()
        
        try:
            # Preprocess frames
            processed_frames = self._preprocess_frames(video_frames)
            
            # Run inference
            logits = self._run_inference(processed_frames)
            
            # Get predictions
            predictions = self._postprocess_predictions(
                logits,
                return_probabilities=return_probabilities
            )
            
            inference_time = time.time() - start_time
            self.inference_times.append(inference_time)
            
            predictions['inference_time'] = inference_time
            
            logger.info(
                f"Prediction: {predictions['predicted_sign']} "
                f"(confidence: {predictions['confidence']:.2%}, "
                f"time: {inference_time:.3f}s)"
            )
            
            return predictions
        
        except Exception as e:
            logger.error(f"Inference error: {e}", exc_info=True)
            raise RuntimeError(f"Prediction failed: {e}")
    
    def predict_batch(
        self,
        video_frames_list: List[np.ndarray],
        return_probabilities: bool = False
    ) -> List[Dict]:
        """
        Predict signs from multiple videos
        
        Args:
            video_frames_list: List of video frame arrays
            return_probabilities: Whether to return probabilities
            
        Returns:
            List of prediction dictionaries
        """
        if self.model is None:
            self.load_model()
        
        predictions = []
        
        for i, video_frames in enumerate(video_frames_list):
            try:
                pred = self.predict(video_frames, return_probabilities)
                predictions.append(pred)
            except Exception as e:
                logger.error(f"Batch prediction {i} failed: {e}")
                predictions.append({
                    'error': str(e),
                    'predicted_sign': None,
                    'confidence': 0.0
                })
        
        return predictions
    
    def predict_from_video_file(
        self,
        video_path: str,
        return_probabilities: bool = False
    ) -> Dict:
        """
        Predict sign from video file
        
        Args:
            video_path: Path to video file
            return_probabilities: Whether to return probabilities
            
        Returns:
            Prediction dictionary
        """
        # Extract frames from video
        frames = video_processor.extract_frames_list(
            video_path,
            target_fps=self.config.frame_size[0],  # Use config fps
            max_frames=self.config.num_frames * 2  # Get more frames for sampling
        )
        
        if len(frames) == 0:
            raise ValueError("No frames extracted from video")
        
        # Convert to numpy array
        frames_array = np.array(frames)
        
        # Predict
        return self.predict(frames_array, return_probabilities)
    
    def _preprocess_frames(self, frames: np.ndarray) -> np.ndarray:
        """
        Preprocess video frames for inference
        
        Args:
            frames: Raw video frames (T, H, W, C) or (T, H, W)
            
        Returns:
            Preprocessed frames (1, T, H, W, C) - batch dimension added
        """
        # Ensure 4D (add channel if grayscale)
        if len(frames.shape) == 3:
            frames = np.expand_dims(frames, axis=-1)
            frames = np.repeat(frames, 3, axis=-1)  # Convert to RGB
        
        # Sample to target number of frames
        frames = self._sample_frames(frames, self.config.num_frames)
        
        # Resize to target size
        resized_frames = []
        for frame in frames:
            resized = video_processor._resize_frame(
                frame,
                self.config.frame_size
            )
            resized_frames.append(resized)
        
        frames = np.array(resized_frames)
        
        # Normalize
        if self.config.normalize:
            frames = frames.astype(np.float32) / 255.0
        
        # Add batch dimension
        frames = np.expand_dims(frames, axis=0)  # (1, T, H, W, C)
        
        return frames
    
    def _sample_frames(self, frames: np.ndarray, num_frames: int) -> np.ndarray:
        """Sample frames uniformly"""
        total_frames = len(frames)
        
        if total_frames >= num_frames:
            indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)
        else:
            # Repeat frames if too few
            indices = np.array([i % total_frames for i in range(num_frames)])
        
        return frames[indices]
    
    def _run_inference(self, frames: np.ndarray) -> np.ndarray:
        """
        Run model inference with real PyTorch model
        
        Args:
            frames: Preprocessed frames (B, T, H, W, C) or (B, C, T, H, W)
            
        Returns:
            Logits (B, num_classes)
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        # Convert numpy to torch tensor
        if isinstance(frames, np.ndarray):
            frames_tensor = torch.from_numpy(frames).float()
        else:
            frames_tensor = frames
        
        # Move to device
        frames_tensor = frames_tensor.to(self.device)
        
        # Run inference
        with torch.no_grad():
            logits = self.model(frames_tensor)
            logits = logits.cpu().numpy()
        
        return logits
    
    def _postprocess_predictions(
        self,
        logits: np.ndarray,
        return_probabilities: bool = False
    ) -> Dict:
        """
        Postprocess model output to predictions
        
        Args:
            logits: Model output logits (B, num_classes)
            return_probabilities: Whether to return all probabilities
            
        Returns:
            Prediction dictionary
        """
        # Convert logits to probabilities (softmax)
        probabilities = self._softmax(logits[0])  # Remove batch dimension
        
        # Get top-k predictions
        top_k_indices = np.argsort(probabilities)[-self.config.top_k:][::-1]
        
        # Build predictions
        predictions = {
            'predicted_sign': self.class_names[top_k_indices[0]],
            'confidence': float(probabilities[top_k_indices[0]]),
            'top_k_predictions': []
        }
        
        # Add top-k
        for idx in top_k_indices:
            predictions['top_k_predictions'].append({
                'sign': self.class_names[idx],
                'confidence': float(probabilities[idx])
            })
        
        # Apply confidence threshold
        if predictions['confidence'] < self.config.confidence_threshold:
            predictions['below_threshold'] = True
            predictions['warning'] = f"Confidence {predictions['confidence']:.2%} below threshold {self.config.confidence_threshold:.2%}"
        
        # Add full probabilities if requested
        if return_probabilities:
            predictions['probabilities'] = {
                self.class_names[i]: float(probabilities[i])
                for i in range(len(self.class_names))
            }
        
        return predictions
    
    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        """Apply softmax to logits"""
        exp_logits = np.exp(logits - np.max(logits))  # Subtract max for numerical stability
        return exp_logits / np.sum(exp_logits)
    
    def get_performance_stats(self) -> Dict:
        """Get inference performance statistics"""
        if not self.inference_times:
            return {"no_inferences": True}
        
        return {
            "total_inferences": len(self.inference_times),
            "avg_inference_time": np.mean(self.inference_times),
            "min_inference_time": np.min(self.inference_times),
            "max_inference_time": np.max(self.inference_times),
            "std_inference_time": np.std(self.inference_times),
            "inferences_per_second": 1.0 / np.mean(self.inference_times) if np.mean(self.inference_times) > 0 else 0
        }
    
    def reset_stats(self):
        """Reset performance statistics"""
        self.inference_times = []


# Global inference service
_inference_service: Optional[SignLanguageInference] = None


def get_inference_service() -> SignLanguageInference:
    """Get global inference service instance"""
    global _inference_service
    if _inference_service is None:
        _inference_service = SignLanguageInference()
    return _inference_service


def predict_sign(
    video_frames: np.ndarray,
    return_probabilities: bool = False
) -> Dict:
    """
    Convenience function to predict sign
    
    Args:
        video_frames: Video frames
        return_probabilities: Return full probabilities
        
    Returns:
        Prediction dictionary
    """
    service = get_inference_service()
    return service.predict(video_frames, return_probabilities)


def predict_sign_from_file(
    video_path: str,
    return_probabilities: bool = False
) -> Dict:
    """
    Convenience function to predict from video file
    
    Args:
        video_path: Path to video file
        return_probabilities: Return full probabilities
        
    Returns:
        Prediction dictionary
    """
    service = get_inference_service()
    return service.predict_from_video_file(video_path, return_probabilities)

