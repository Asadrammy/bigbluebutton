"""
Training class for sign language recognition models
Real PyTorch implementation with GPU support
"""
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.cuda.amp import autocast, GradScaler
import json
import logging
from pathlib import Path
from typing import Dict, Optional, Callable, List
from datetime import datetime
import time

from app.ml.config import ModelConfig
from app.ml.metrics import MetricsCalculator, MetricTracker, AverageMeter
from app.ml.data_loader import DataLoaderWrapper
from app.utils.gpu_utils import get_device, set_seed, clear_gpu_cache

logger = logging.getLogger(__name__)


class Trainer:
    """
    Base trainer class for sign language recognition
    This is a framework-agnostic specification that should be implemented
    with PyTorch or TensorFlow in production
    """
    
    def __init__(
        self,
        model: nn.Module,  # PyTorch model
        train_loader: DataLoaderWrapper,
        val_loader: DataLoaderWrapper,
        config: ModelConfig,
        optimizer: Optional[optim.Optimizer] = None,
        scheduler: Optional[any] = None,
        device: Optional[str] = None
    ):
        """
        Initialize trainer
        
        Args:
            model: PyTorch model instance
            train_loader: Training data loader
            val_loader: Validation data loader
            config: Model configuration
            optimizer: PyTorch optimizer (auto-created if None)
            scheduler: Learning rate scheduler (auto-created if None)
            device: Device to train on (auto-detect if None)
        """
        # Set random seed for reproducibility
        set_seed(config.seed)
        
        # Device setup
        if device is None:
            self.device = get_device() if config.device == "auto" else config.device
        else:
            self.device = device
        
        # Move model to device
        self.model = model.to(self.device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.config = config
        
        # Create optimizer if not provided
        if optimizer is None:
            if config.optimizer == "Adam":
                self.optimizer = optim.Adam(
                    self.model.parameters(),
                    lr=config.learning_rate,
                    weight_decay=config.weight_decay
                )
            elif config.optimizer == "AdamW":
                self.optimizer = optim.AdamW(
                    self.model.parameters(),
                    lr=config.learning_rate,
                    weight_decay=config.weight_decay
                )
            elif config.optimizer == "SGD":
                self.optimizer = optim.SGD(
                    self.model.parameters(),
                    lr=config.learning_rate,
                    momentum=config.momentum,
                    weight_decay=config.weight_decay
                )
            else:
                self.optimizer = optim.Adam(self.model.parameters(), lr=config.learning_rate)
        else:
            self.optimizer = optimizer
        
        # Create scheduler if not provided
        if scheduler is None and config.use_scheduler:
            if config.scheduler_type == "ReduceLROnPlateau":
                self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                    self.optimizer,
                    mode='max' if config.checkpoint_mode == 'max' else 'min',
                    factor=config.scheduler_factor,
                    patience=config.scheduler_patience,
                    min_lr=config.min_lr
                )
            elif config.scheduler_type == "CosineAnnealing":
                self.scheduler = optim.lr_scheduler.CosineAnnealingLR(
                    self.optimizer,
                    T_max=config.num_epochs
                )
            elif config.scheduler_type == "StepLR":
                self.scheduler = optim.lr_scheduler.StepLR(
                    self.optimizer,
                    step_size=config.scheduler_patience,
                    gamma=config.scheduler_factor
                )
            else:
                self.scheduler = None
        else:
            self.scheduler = scheduler
        
        # Mixed precision training
        self.use_amp = config.use_mixed_precision and self.device.startswith("cuda")
        self.scaler = GradScaler() if self.use_amp else None
        
        # Loss function
        self.criterion = nn.CrossEntropyLoss()
        
        # Training state
        self.current_epoch = 0
        self.global_step = 0
        self.best_metric = float('-inf') if config.checkpoint_mode == 'max' else float('inf')
        self.patience_counter = 0
        
        # Metrics tracking
        self.num_classes = train_loader.dataset.num_classes
        self.class_names = train_loader.dataset.idx_to_label
        self.metrics_tracker = MetricTracker()
        
        # Checkpoint directory
        self.checkpoint_dir = config.model_dir
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        # Training history
        self.train_history = []
        self.val_history = []
        
        logger.info(f"Initialized Trainer with {self.num_classes} classes")
        logger.info(f"Train samples: {len(train_loader.dataset)}, Val samples: {len(val_loader.dataset)}")
    
    def train(self) -> Dict:
        """
        Main training loop
        
        Returns:
            Training history and final metrics
        """
        logger.info("=" * 80)
        logger.info(f"Starting training for {self.config.num_epochs} epochs")
        logger.info("=" * 80)
        
        start_time = time.time()
        
        try:
            for epoch in range(self.config.num_epochs):
                self.current_epoch = epoch
                
                # Train one epoch
                train_metrics = self.train_epoch()
                
                # Validate
                val_metrics = self.validate()
                
                # Update learning rate scheduler
                if self.scheduler:
                    if self.config.scheduler_type == "ReduceLROnPlateau":
                        metric_key = self.config.checkpoint_metric.replace('val_', '')
                        metric_value = val_metrics.get(metric_key, val_metrics.get('accuracy', 0))
                        self.scheduler.step(metric_value)
                    else:
                        self.scheduler.step()
                
                # Track metrics
                self.metrics_tracker.update(
                    {**{f"train_{k}": v for k, v in train_metrics.items()},
                     **{f"val_{k}": v for k, v in val_metrics.items()}},
                    step=epoch
                )
                
                # Save history
                self.train_history.append(train_metrics)
                self.val_history.append(val_metrics)
                
                # Log epoch summary
                self._log_epoch_summary(epoch, train_metrics, val_metrics)
                
                # Checkpoint
                metric_key = self.config.checkpoint_metric.replace('val_', '')
                checkpoint_metric = val_metrics.get(metric_key, val_metrics.get('accuracy', 0))
                is_best = self._is_best_metric(checkpoint_metric)
                
                if is_best:
                    logger.info(f"✅ New best {self.config.checkpoint_metric}: {checkpoint_metric:.4f}")
                    self.best_metric = checkpoint_metric
                    self.patience_counter = 0
                    self.save_checkpoint(is_best=True)
                else:
                    self.patience_counter += 1
                    if not self.config.save_best_only:
                        self.save_checkpoint(is_best=False)
                
                # Early stopping
                if self.patience_counter >= self.config.patience:
                    logger.info(f"Early stopping triggered after {epoch + 1} epochs")
                    break
        
        except KeyboardInterrupt:
            logger.warning("Training interrupted by user")
        
        except Exception as e:
            logger.error(f"Training error: {e}", exc_info=True)
            raise
        
        finally:
            # Training complete
            training_time = time.time() - start_time
            logger.info("=" * 80)
            logger.info(f"Training completed in {training_time / 3600:.2f} hours")
            logger.info(f"Best {self.config.checkpoint_metric}: {self.best_metric:.4f}")
            logger.info("=" * 80)
            
            # Clear GPU cache
            if self.device.startswith("cuda"):
                clear_gpu_cache()
            
            # Save final metrics
            self._save_training_history()
        
        return {
            'train_history': self.train_history,
            'val_history': self.val_history,
            'best_metric': self.best_metric,
            'total_epochs': self.current_epoch + 1,
            'training_time': training_time
        }
    
    def train_epoch(self) -> Dict[str, float]:
        """
        Train for one epoch with real PyTorch implementation
        
        Returns:
            Training metrics for this epoch
        """
        # Set model to training mode
        self.model.train()
        
        # Meters for tracking
        loss_meter = AverageMeter('loss')
        metrics_calc = MetricsCalculator(self.num_classes, list(self.class_names.values()))
        
        epoch_start = time.time()
        
        # Iterate over batches
        for batch_idx, (frames, labels, metadata) in enumerate(self.train_loader):
            self.global_step += 1
            
            # Move data to device
            if isinstance(frames, np.ndarray):
                frames = torch.from_numpy(frames).float()
            if isinstance(labels, np.ndarray):
                labels = torch.from_numpy(labels).long()
            
            frames = frames.to(self.device)
            labels = labels.to(self.device)
            
            # Zero gradients
            self.optimizer.zero_grad()
            
            # Forward pass with mixed precision if enabled
            if self.use_amp:
                with autocast():
                    logits = self.model(frames)
                    loss = self.criterion(logits, labels)
                
                # Backward pass with gradient scaling
                self.scaler.scale(loss).backward()
                self.scaler.step(self.optimizer)
                self.scaler.update()
            else:
                logits = self.model(frames)
                loss = self.criterion(logits, labels)
                
                # Backward pass
                loss.backward()
                self.optimizer.step()
            
            # Get predictions
            predictions = torch.argmax(logits, dim=1).cpu().numpy()
            labels_np = labels.cpu().numpy()
            
            # Update loss meter
            loss_value = loss.item()
            loss_meter.update(loss_value, len(labels))
            
            # Update metrics
            metrics_calc.update(predictions, labels_np)
            
            # Log progress
            if batch_idx % 10 == 0:
                logger.info(
                    f"Epoch [{self.current_epoch + 1}/{self.config.num_epochs}] "
                    f"Batch [{batch_idx}/{len(self.train_loader)}] "
                    f"Loss: {loss_value:.4f}"
                )
        
        # Compute epoch metrics
        metrics = metrics_calc.compute()
        metrics['loss'] = loss_meter.avg
        metrics['epoch_time'] = time.time() - epoch_start
        
        return metrics
    
    def validate(self) -> Dict[str, float]:
        """
        Validate model with real PyTorch implementation
        
        Returns:
            Validation metrics
        """
        # Set model to eval mode
        self.model.eval()
        
        # Meters
        loss_meter = AverageMeter('val_loss')
        metrics_calc = MetricsCalculator(self.num_classes, list(self.class_names.values()))
        
        # No gradient computation
        with torch.no_grad():
            for frames, labels, metadata in self.val_loader:
                # Move to device
                if isinstance(frames, np.ndarray):
                    frames = torch.from_numpy(frames).float()
                if isinstance(labels, np.ndarray):
                    labels = torch.from_numpy(labels).long()
                
                frames = frames.to(self.device)
                labels = labels.to(self.device)
                
                # Forward pass
                logits = self.model(frames)
                loss = self.criterion(logits, labels)
                
                # Get predictions
                predictions = torch.argmax(logits, dim=1).cpu().numpy()
                labels_np = labels.cpu().numpy()
                
                # Update meters
                loss_meter.update(loss.item(), len(labels))
                metrics_calc.update(predictions, labels_np)
        
        # Compute metrics
        metrics = metrics_calc.compute()
        metrics['loss'] = loss_meter.avg
        
        return metrics
    
    def _training_step(self, frames: torch.Tensor, labels: torch.Tensor):
        """
        Single training step (PyTorch implementation)
        
        Args:
            frames: Input frames tensor
            labels: Target labels tensor
            
        Returns:
            Loss and logits
        """
        # Forward pass
        logits = self.model(frames)
        loss = self.criterion(logits, labels)
        
        return loss, logits
    
    def _validation_step(self, frames: torch.Tensor, labels: torch.Tensor):
        """
        Single validation step (PyTorch implementation)
        
        Args:
            frames: Input frames tensor
            labels: Target labels tensor
            
        Returns:
            Loss and logits
        """
        # Forward pass
        logits = self.model(frames)
        loss = self.criterion(logits, labels)
        
        return loss, logits
    
    def _is_best_metric(self, current_metric: float) -> bool:
        """Check if current metric is best"""
        if self.config.checkpoint_mode == 'max':
            return current_metric > self.best_metric
        else:
            return current_metric < self.best_metric
    
    def _log_epoch_summary(
        self,
        epoch: int,
        train_metrics: Dict[str, float],
        val_metrics: Dict[str, float]
    ):
        """Log epoch summary"""
        logger.info("")
        logger.info("=" * 80)
        logger.info(f"Epoch {epoch + 1}/{self.config.num_epochs} Summary:")
        logger.info("-" * 80)
        logger.info(f"  Train Loss: {train_metrics['loss']:.4f}")
        logger.info(f"  Train Accuracy: {train_metrics['accuracy']:.2%}")
        logger.info(f"  Val Loss: {val_metrics['loss']:.4f}")
        logger.info(f"  Val Accuracy: {val_metrics['accuracy']:.2%}")
        if 'f1_macro' in val_metrics:
            logger.info(f"  Val F1 Score: {val_metrics['f1_macro']:.2%}")
        logger.info(f"  Epoch Time: {train_metrics['epoch_time']:.2f}s")
        if self.optimizer:
            lr = self._get_learning_rate()
            logger.info(f"  Learning Rate: {lr:.6f}")
        logger.info("=" * 80)
        logger.info("")
    
    def _get_learning_rate(self) -> float:
        """Get current learning rate"""
        return self.optimizer.param_groups[0]['lr']
    
    def save_checkpoint(self, is_best: bool = False):
        """
        Save model checkpoint with real PyTorch implementation
        
        Args:
            is_best: Whether this is the best model so far
        """
        checkpoint = {
            'epoch': self.current_epoch,
            'global_step': self.global_step,
            'best_metric': self.best_metric,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'train_history': self.train_history,
            'val_history': self.val_history,
            'config': {
                'num_classes': self.num_classes,
                'input_shape': list(self.config.input_shape),
                'dropout_rate': self.config.dropout_rate,
                'use_batch_norm': self.config.use_batch_norm,
                'model_type': self.config.model_type,
            },
            'metadata': {
                'class_names': list(self.class_names.values()) if self.class_names else [],
                'num_classes': self.num_classes,
            }
        }
        
        # Add scheduler state if available
        if self.scheduler is not None:
            checkpoint['scheduler_state_dict'] = self.scheduler.state_dict()
        
        # Add scaler state if using mixed precision
        if self.scaler is not None:
            checkpoint['scaler_state_dict'] = self.scaler.state_dict()
        
        # Save checkpoint
        if is_best:
            checkpoint_path = self.checkpoint_dir / 'best_model.pth'
            logger.info(f"Saving best model to {checkpoint_path}")
        else:
            checkpoint_path = self.checkpoint_dir / f'checkpoint_epoch_{self.current_epoch}.pth'
            logger.info(f"Saving checkpoint to {checkpoint_path}")
        
        # Save PyTorch checkpoint
        torch.save(checkpoint, checkpoint_path)
        
        # Also save metadata as JSON for easy reading
        metadata_path = checkpoint_path.with_suffix('.json')
        metadata = {
            'epoch': self.current_epoch,
            'best_metric': self.best_metric,
            'timestamp': datetime.now().isoformat(),
            'num_classes': self.num_classes,
            'model_type': self.config.model_type,
        }
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def load_checkpoint(self, checkpoint_path: Path):
        """
        Load model checkpoint with real PyTorch implementation
        
        Args:
            checkpoint_path: Path to checkpoint
        """
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.current_epoch = checkpoint['epoch']
        self.best_metric = checkpoint['best_metric']
        
        if 'scheduler_state_dict' in checkpoint and self.scheduler is not None:
            self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        
        if 'scaler_state_dict' in checkpoint and self.scaler is not None:
            self.scaler.load_state_dict(checkpoint['scaler_state_dict'])
        
        if 'train_history' in checkpoint:
            self.train_history = checkpoint['train_history']
        if 'val_history' in checkpoint:
            self.val_history = checkpoint['val_history']
        
        logger.info(f"Loaded checkpoint from {checkpoint_path} (epoch {self.current_epoch}, best metric: {self.best_metric:.4f})")
    
    def _save_training_history(self):
        """Save training history to file"""
        history_path = self.checkpoint_dir / 'training_history.json'
        
        history = {
            'train': self.train_history,
            'val': self.val_history,
            'config': {
                'num_epochs': self.config.num_epochs,
                'batch_size': self.config.batch_size,
                'learning_rate': self.config.learning_rate,
                'num_classes': self.num_classes
            },
            'best_metric': self.best_metric,
            'total_epochs': self.current_epoch + 1
        }
        
        with open(history_path, 'w') as f:
            json.dump(history, f, indent=2)
        
        logger.info(f"Saved training history to {history_path}")


class TrainingCallback:
    """Base callback class for training events"""
    
    def on_epoch_start(self, epoch: int, trainer: Trainer):
        """Called at the start of each epoch"""
        pass
    
    def on_epoch_end(self, epoch: int, trainer: Trainer, metrics: Dict):
        """Called at the end of each epoch"""
        pass
    
    def on_batch_start(self, batch_idx: int, trainer: Trainer):
        """Called at the start of each batch"""
        pass
    
    def on_batch_end(self, batch_idx: int, trainer: Trainer, loss: float):
        """Called at the end of each batch"""
        pass
    
    def on_training_start(self, trainer: Trainer):
        """Called at the start of training"""
        pass
    
    def on_training_end(self, trainer: Trainer):
        """Called at the end of training"""
        pass


class ProgressCallback(TrainingCallback):
    """Callback for logging training progress"""
    
    def __init__(self, log_interval: int = 10):
        self.log_interval = log_interval
    
    def on_batch_end(self, batch_idx: int, trainer: Trainer, loss: float):
        if batch_idx % self.log_interval == 0:
            logger.info(
                f"Epoch [{trainer.current_epoch + 1}] "
                f"Batch [{batch_idx}] "
                f"Loss: {loss:.4f}"
            )


class CheckpointCallback(TrainingCallback):
    """Callback for saving checkpoints"""
    
    def __init__(self, save_interval: int = 5):
        self.save_interval = save_interval
    
    def on_epoch_end(self, epoch: int, trainer: Trainer, metrics: Dict):
        if (epoch + 1) % self.save_interval == 0:
            trainer.save_checkpoint(is_best=False)

