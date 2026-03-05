"""
Metrics for evaluating sign language recognition models
"""
import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class MetricsCalculator:
    """Calculate various metrics for model evaluation"""
    
    def __init__(self, num_classes: int, class_names: Optional[List[str]] = None):
        """
        Initialize metrics calculator
        
        Args:
            num_classes: Number of classes
            class_names: Optional list of class names
        """
        self.num_classes = num_classes
        self.class_names = class_names or [f"Class_{i}" for i in range(num_classes)]
        self.reset()
    
    def reset(self):
        """Reset all metrics"""
        self.predictions = []
        self.targets = []
        self.confidences = []
    
    def update(
        self,
        predictions: np.ndarray,
        targets: np.ndarray,
        confidences: Optional[np.ndarray] = None
    ):
        """
        Update metrics with new predictions
        
        Args:
            predictions: Predicted class indices (B,)
            targets: True class indices (B,)
            confidences: Prediction confidences (B, num_classes) or (B,)
        """
        self.predictions.extend(predictions.tolist())
        self.targets.extend(targets.tolist())
        
        if confidences is not None:
            if len(confidences.shape) == 1:
                self.confidences.extend(confidences.tolist())
            else:
                # Take max confidence per sample
                max_conf = np.max(confidences, axis=1)
                self.confidences.extend(max_conf.tolist())
    
    def compute(self) -> Dict[str, float]:
        """
        Compute all metrics
        
        Returns:
            Dict of metric name to value
        """
        predictions = np.array(self.predictions)
        targets = np.array(self.targets)
        
        metrics = {}
        
        # Accuracy
        metrics['accuracy'] = self.accuracy(predictions, targets)
        
        # Top-5 Accuracy (if we have confidence scores)
        if self.confidences:
            # Would need full probability distributions for true top-5
            pass
        
        # Per-class accuracy
        per_class_acc = self.per_class_accuracy(predictions, targets)
        for i, acc in enumerate(per_class_acc):
            metrics[f'accuracy_{self.class_names[i]}'] = acc
        
        # Confusion matrix metrics
        cm = self.confusion_matrix(predictions, targets)
        
        # Precision, Recall, F1 (macro average)
        precision_scores, recall_scores, f1_scores = self.precision_recall_f1(cm)
        
        metrics['precision_macro'] = np.mean(precision_scores)
        metrics['recall_macro'] = np.mean(recall_scores)
        metrics['f1_macro'] = np.mean(f1_scores)
        
        # Per-class F1
        for i, f1 in enumerate(f1_scores):
            metrics[f'f1_{self.class_names[i]}'] = f1
        
        # Average confidence
        if self.confidences:
            metrics['avg_confidence'] = np.mean(self.confidences)
        
        return metrics
    
    @staticmethod
    def accuracy(predictions: np.ndarray, targets: np.ndarray) -> float:
        """
        Calculate accuracy
        
        Args:
            predictions: Predicted classes
            targets: True classes
            
        Returns:
            Accuracy score
        """
        correct = np.sum(predictions == targets)
        total = len(targets)
        return correct / total if total > 0 else 0.0
    
    @staticmethod
    def top_k_accuracy(
        logits: np.ndarray,
        targets: np.ndarray,
        k: int = 5
    ) -> float:
        """
        Calculate top-k accuracy
        
        Args:
            logits: Model output logits (B, num_classes)
            targets: True classes (B,)
            k: Top k predictions to consider
            
        Returns:
            Top-k accuracy
        """
        # Get top-k predictions
        top_k_preds = np.argsort(logits, axis=1)[:, -k:]
        
        # Check if target is in top-k
        correct = 0
        for i, target in enumerate(targets):
            if target in top_k_preds[i]:
                correct += 1
        
        return correct / len(targets) if len(targets) > 0 else 0.0
    
    def per_class_accuracy(
        self,
        predictions: np.ndarray,
        targets: np.ndarray
    ) -> np.ndarray:
        """
        Calculate per-class accuracy
        
        Args:
            predictions: Predicted classes
            targets: True classes
            
        Returns:
            Array of per-class accuracies
        """
        accuracies = np.zeros(self.num_classes)
        
        for class_idx in range(self.num_classes):
            # Get samples for this class
            class_mask = (targets == class_idx)
            class_targets = targets[class_mask]
            class_predictions = predictions[class_mask]
            
            if len(class_targets) > 0:
                accuracies[class_idx] = np.mean(class_predictions == class_targets)
        
        return accuracies
    
    def confusion_matrix(
        self,
        predictions: np.ndarray,
        targets: np.ndarray
    ) -> np.ndarray:
        """
        Calculate confusion matrix
        
        Args:
            predictions: Predicted classes
            targets: True classes
            
        Returns:
            Confusion matrix (num_classes, num_classes)
            cm[i, j] = number of samples with true class i predicted as j
        """
        cm = np.zeros((self.num_classes, self.num_classes), dtype=int)
        
        for pred, target in zip(predictions, targets):
            cm[target, pred] += 1
        
        return cm
    
    @staticmethod
    def precision_recall_f1(
        confusion_matrix: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculate precision, recall, and F1 score from confusion matrix
        
        Args:
            confusion_matrix: Confusion matrix
            
        Returns:
            Tuple of (precision, recall, f1) arrays
        """
        num_classes = confusion_matrix.shape[0]
        
        precision = np.zeros(num_classes)
        recall = np.zeros(num_classes)
        f1 = np.zeros(num_classes)
        
        for i in range(num_classes):
            # True positives
            tp = confusion_matrix[i, i]
            
            # False positives (predicted as i but not i)
            fp = np.sum(confusion_matrix[:, i]) - tp
            
            # False negatives (actually i but not predicted as i)
            fn = np.sum(confusion_matrix[i, :]) - tp
            
            # Precision = TP / (TP + FP)
            if tp + fp > 0:
                precision[i] = tp / (tp + fp)
            
            # Recall = TP / (TP + FN)
            if tp + fn > 0:
                recall[i] = tp / (tp + fn)
            
            # F1 = 2 * (Precision * Recall) / (Precision + Recall)
            if precision[i] + recall[i] > 0:
                f1[i] = 2 * (precision[i] * recall[i]) / (precision[i] + recall[i])
        
        return precision, recall, f1
    
    def get_confusion_matrix_str(self, normalize: bool = False) -> str:
        """
        Get string representation of confusion matrix
        
        Args:
            normalize: Whether to normalize by row (true class)
            
        Returns:
            String representation
        """
        cm = self.confusion_matrix(
            np.array(self.predictions),
            np.array(self.targets)
        )
        
        if normalize:
            cm = cm.astype(float)
            row_sums = cm.sum(axis=1, keepdims=True)
            row_sums[row_sums == 0] = 1  # Avoid division by zero
            cm = cm / row_sums
        
        # Build string
        lines = ["Confusion Matrix:"]
        lines.append("")
        
        # Header
        header = "True\\Pred".ljust(12)
        for name in self.class_names:
            header += name[:8].rjust(10)
        lines.append(header)
        lines.append("-" * len(header))
        
        # Rows
        for i, name in enumerate(self.class_names):
            row = name[:10].ljust(12)
            for j in range(self.num_classes):
                if normalize:
                    row += f"{cm[i, j]:.2f}".rjust(10)
                else:
                    row += f"{cm[i, j]:d}".rjust(10)
            lines.append(row)
        
        return "\n".join(lines)


class AverageMeter:
    """Compute and store the average and current value"""
    
    def __init__(self, name: str):
        self.name = name
        self.reset()
    
    def reset(self):
        self.val = 0
        self.avg = 0
        self.sum = 0
        self.count = 0
    
    def update(self, val: float, n: int = 1):
        self.val = val
        self.sum += val * n
        self.count += n
        self.avg = self.sum / self.count if self.count > 0 else 0
    
    def __str__(self):
        return f"{self.name}: {self.avg:.4f} (current: {self.val:.4f})"


class MetricTracker:
    """Track multiple metrics over training"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
    
    def update(self, metrics: Dict[str, float], step: int):
        """
        Update metrics for a step
        
        Args:
            metrics: Dict of metric values
            step: Training step/epoch
        """
        for name, value in metrics.items():
            self.metrics[name].append((step, value))
    
    def get_latest(self, metric_name: str) -> Optional[float]:
        """Get latest value of a metric"""
        if metric_name not in self.metrics or len(self.metrics[metric_name]) == 0:
            return None
        return self.metrics[metric_name][-1][1]
    
    def get_best(self, metric_name: str, mode: str = "max") -> Tuple[int, float]:
        """
        Get best value of a metric
        
        Args:
            metric_name: Name of metric
            mode: "max" or "min"
            
        Returns:
            Tuple of (step, value)
        """
        if metric_name not in self.metrics or len(self.metrics[metric_name]) == 0:
            return -1, float('-inf') if mode == "max" else float('inf')
        
        values = self.metrics[metric_name]
        
        if mode == "max":
            best_idx = max(range(len(values)), key=lambda i: values[i][1])
        else:
            best_idx = min(range(len(values)), key=lambda i: values[i][1])
        
        return values[best_idx]
    
    def get_history(self, metric_name: str) -> List[Tuple[int, float]]:
        """Get full history of a metric"""
        return self.metrics.get(metric_name, [])
    
    def save(self, path: str):
        """Save metrics to file"""
        import json
        
        with open(path, 'w') as f:
            json.dump(dict(self.metrics), f, indent=2)
    
    @classmethod
    def load(cls, path: str) -> 'MetricTracker':
        """Load metrics from file"""
        import json
        
        tracker = cls()
        with open(path, 'r') as f:
            metrics = json.load(f)
        
        tracker.metrics = defaultdict(list, metrics)
        return tracker


def calculate_class_weights(targets: np.ndarray, num_classes: int) -> np.ndarray:
    """
    Calculate class weights for imbalanced datasets
    
    Args:
        targets: Array of target class indices
        num_classes: Total number of classes
        
    Returns:
        Array of class weights
    """
    # Count samples per class
    class_counts = np.bincount(targets, minlength=num_classes)
    
    # Calculate inverse frequency weights
    total_samples = len(targets)
    weights = total_samples / (num_classes * class_counts + 1e-6)
    
    # Normalize weights
    weights = weights / np.sum(weights) * num_classes
    
    return weights

