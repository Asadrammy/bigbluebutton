"""
GPU utilities for device detection and management
"""
import logging
import torch
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


def get_device() -> str:
    """
    Get the best available device (GPU if available, else CPU)
    
    Returns:
        Device string: 'cuda', 'cuda:0', 'cpu', etc.
    """
    if torch.cuda.is_available():
        device = f"cuda:{torch.cuda.current_device()}"
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"✅ GPU detected: {gpu_name} ({gpu_memory:.1f} GB)")
        return device
    else:
        logger.warning("⚠️ No GPU detected, using CPU")
        return "cpu"


def get_device_info() -> dict:
    """
    Get detailed device information
    
    Returns:
        Dictionary with device information
    """
    info = {
        "cuda_available": torch.cuda.is_available(),
        "device": get_device(),
        "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
    }
    
    if torch.cuda.is_available():
        info["gpu_name"] = torch.cuda.get_device_name(0)
        info["gpu_memory_gb"] = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        info["cuda_version"] = torch.version.cuda
        info["cudnn_version"] = torch.backends.cudnn.version() if torch.backends.cudnn.is_available() else None
        
        # Current memory usage
        info["memory_allocated_gb"] = torch.cuda.memory_allocated(0) / (1024**3)
        info["memory_reserved_gb"] = torch.cuda.memory_reserved(0) / (1024**3)
        info["memory_free_gb"] = info["gpu_memory_gb"] - info["memory_reserved_gb"]
    
    return info


def clear_gpu_cache():
    """Clear GPU memory cache"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        logger.debug("GPU cache cleared")


def set_seed(seed: int = 42):
    """
    Set random seed for reproducibility
    
    Args:
        seed: Random seed
    """
    import random
    import numpy as np
    
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    logger.info(f"Random seed set to {seed}")


def optimize_for_inference(model: torch.nn.Module, device: str = None) -> torch.nn.Module:
    """
    Optimize model for inference
    
    Args:
        model: PyTorch model
        device: Target device (auto-detect if None)
        
    Returns:
        Optimized model
    """
    if device is None:
        device = get_device()
    
    model = model.to(device)
    model.eval()  # Set to evaluation mode
    
    # Enable optimizations
    if device.startswith("cuda"):
        torch.backends.cudnn.benchmark = True  # Optimize for consistent input sizes
    
    # Use torch.jit.script or torch.jit.trace for further optimization if needed
    # model = torch.jit.script(model)  # Uncomment for JIT compilation
    
    logger.info(f"Model optimized for inference on {device}")
    return model

