"""
Real PyTorch implementation of Sign Language Recognition Model
3D CNN architecture optimized for real-time inference
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class Conv3DBlock(nn.Module):
    """3D Convolutional block with batch norm and activation"""
    
    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: Tuple[int, int, int] = (3, 3, 3),
        stride: Tuple[int, int, int] = (1, 1, 1),
        padding: Tuple[int, int, int] = (1, 1, 1),
        use_batch_norm: bool = True,
        activation: str = "relu"
    ):
        super().__init__()
        self.conv = nn.Conv3d(
            in_channels, out_channels,
            kernel_size=kernel_size,
            stride=stride,
            padding=padding
        )
        self.bn = nn.BatchNorm3d(out_channels) if use_batch_norm else None
        
        if activation == "relu":
            self.activation = nn.ReLU(inplace=True)
        elif activation == "gelu":
            self.activation = nn.GELU()
        elif activation == "swish":
            self.activation = nn.SiLU()  # Swish is SiLU in PyTorch
        else:
            self.activation = nn.ReLU(inplace=True)
    
    def forward(self, x):
        x = self.conv(x)
        if self.bn is not None:
            x = self.bn(x)
        x = self.activation(x)
        return x


class DepthwiseSeparableConv3D(nn.Module):
    """Depthwise separable 3D convolution (MobileNet style)"""
    
    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: Tuple[int, int, int] = (3, 3, 3),
        stride: Tuple[int, int, int] = (1, 1, 1),
        padding: Tuple[int, int, int] = (1, 1, 1),
        use_batch_norm: bool = True
    ):
        super().__init__()
        # Depthwise convolution
        self.depthwise = nn.Conv3d(
            in_channels, in_channels,
            kernel_size=kernel_size,
            stride=stride,
            padding=padding,
            groups=in_channels  # Depthwise: each input channel has its own filter
        )
        self.bn1 = nn.BatchNorm3d(in_channels) if use_batch_norm else None
        
        # Pointwise convolution
        self.pointwise = nn.Conv3d(in_channels, out_channels, kernel_size=1)
        self.bn2 = nn.BatchNorm3d(out_channels) if use_batch_norm else None
        
        self.activation = nn.ReLU(inplace=True)
    
    def forward(self, x):
        x = self.depthwise(x)
        if self.bn1 is not None:
            x = self.bn1(x)
        x = self.activation(x)
        
        x = self.pointwise(x)
        if self.bn2 is not None:
            x = self.bn2(x)
        x = self.activation(x)
        
        return x


class SignRecognitionModel3D(nn.Module):
    """
    Real PyTorch 3D CNN for sign language recognition
    Lightweight architecture optimized for real-time inference
    """
    
    def __init__(
        self,
        num_classes: int,
        input_shape: Tuple[int, int, int, int] = (16, 224, 224, 3),
        dropout_rate: float = 0.5,
        use_batch_norm: bool = True
    ):
        """
        Initialize model
        
        Args:
            num_classes: Number of sign classes
            input_shape: Input shape (T, H, W, C) - frames, height, width, channels
            dropout_rate: Dropout rate
            use_batch_norm: Use batch normalization
        """
        super().__init__()
        
        T, H, W, C = input_shape
        self.num_classes = num_classes
        self.input_shape = input_shape
        
        # Input: (B, C, T, H, W) - PyTorch conv3d expects channels first
        # Initial conv block
        self.conv1 = Conv3DBlock(
            in_channels=C,
            out_channels=32,
            kernel_size=(3, 7, 7),
            stride=(1, 2, 2),
            padding=(1, 3, 3),
            use_batch_norm=use_batch_norm
        )
        
        self.pool1 = nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1))
        
        # Depthwise separable conv blocks (MobileNet-style for efficiency)
        self.ds_conv1 = DepthwiseSeparableConv3D(32, 64, stride=(1, 1, 1), use_batch_norm=use_batch_norm)
        self.ds_conv2 = DepthwiseSeparableConv3D(64, 128, stride=(2, 2, 2), use_batch_norm=use_batch_norm)
        self.ds_conv3 = DepthwiseSeparableConv3D(128, 256, stride=(1, 1, 1), use_batch_norm=use_batch_norm)
        
        # Global average pooling
        self.global_pool = nn.AdaptiveAvgPool3d((1, 1, 1))
        
        # Flatten
        self.flatten = nn.Flatten()
        
        # Classifier
        self.dropout = nn.Dropout(dropout_rate)
        self.fc = nn.Linear(256, num_classes)
        
        # Initialize weights
        self._initialize_weights()
        
        logger.info(f"Created SignRecognitionModel3D with {num_classes} classes")
        logger.info(f"Model parameters: {sum(p.numel() for p in self.parameters()):,}")
    
    def _initialize_weights(self):
        """Initialize model weights"""
        for m in self.modules():
            if isinstance(m, nn.Conv3d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm3d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                nn.init.constant_(m.bias, 0)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass
        
        Args:
            x: Input tensor (B, C, T, H, W) or (B, T, H, W, C)
            
        Returns:
            Logits (B, num_classes)
        """
        # Handle different input formats
        if x.dim() == 5:
            # Check if channels are last: (B, T, H, W, C)
            if x.shape[-1] == 3 or x.shape[-1] == 1:
                # Convert to channels first: (B, C, T, H, W)
                x = x.permute(0, 4, 1, 2, 3)
        
        # Ensure input is in correct format: (B, C, T, H, W)
        B, C, T, H, W = x.shape
        
        # Forward through network
        x = self.conv1(x)  # (B, 32, T, H/2, W/2)
        x = self.pool1(x)  # (B, 32, T, H/4, W/4)
        
        x = self.ds_conv1(x)  # (B, 64, T, H/4, W/4)
        x = self.ds_conv2(x)  # (B, 128, T/2, H/8, W/8)
        x = self.ds_conv3(x)  # (B, 256, T/2, H/8, W/8)
        
        # Global pooling
        x = self.global_pool(x)  # (B, 256, 1, 1, 1)
        x = self.flatten(x)  # (B, 256)
        
        # Classifier
        x = self.dropout(x)
        x = self.fc(x)  # (B, num_classes)
        
        return x
    
    def get_model_size_mb(self) -> float:
        """Get model size in MB"""
        param_size = sum(p.numel() * p.element_size() for p in self.parameters())
        buffer_size = sum(b.numel() * b.element_size() for b in self.buffers())
        total_size = (param_size + buffer_size) / (1024 ** 2)
        return total_size


def create_pytorch_model(
    num_classes: int,
    model_type: str = "MobileNet3D",
    input_shape: Tuple[int, int, int, int] = (16, 224, 224, 3),
    dropout_rate: float = 0.5,
    use_batch_norm: bool = True,
    **kwargs
) -> nn.Module:
    """
    Factory function to create PyTorch sign recognition model
    
    Args:
        num_classes: Number of sign classes
        model_type: Model type (currently only "MobileNet3D" supported)
        input_shape: Input shape (T, H, W, C)
        dropout_rate: Dropout rate
        use_batch_norm: Use batch normalization
        **kwargs: Additional parameters
        
    Returns:
        PyTorch model instance
    """
    if model_type == "MobileNet3D":
        model = SignRecognitionModel3D(
            num_classes=num_classes,
            input_shape=input_shape,
            dropout_rate=dropout_rate,
            use_batch_norm=use_batch_norm
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}. Supported: 'MobileNet3D'")
    
    return model

