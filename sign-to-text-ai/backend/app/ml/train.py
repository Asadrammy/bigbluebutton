"""
Training orchestration with database integration
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.trainer import Trainer
from app.ml.config import ModelConfig, get_model_config
from app.ml.data_loader import create_data_loaders
from app.ml.models.sign_recognition import create_sign_recognition_model
from app.ml.metrics import MetricTracker
from app.db_models import TrainingJob, TrainingDataset, ModelVersion
from app.services.dataset_manager import dataset_manager

logger = logging.getLogger(__name__)


class TrainingOrchestrator:
    """
    Orchestrate model training with database tracking
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize orchestrator
        
        Args:
            db: Database session
        """
        self.db = db
    
    async def start_training(
        self,
        dataset_id: int,
        model_type: str,
        user_id: int,
        job_name: Optional[str] = None,
        config_overrides: Optional[Dict] = None
    ) -> TrainingJob:
        """
        Start a new training job
        
        Args:
            dataset_id: Dataset ID to train on
            model_type: Type of model ("MobileNet3D", etc.)
            user_id: User starting the job
            job_name: Optional job name
            config_overrides: Optional config overrides
            
        Returns:
            Created TrainingJob
        """
        # Get dataset
        dataset = await dataset_manager.get_dataset(self.db, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # Create configuration
        config = get_model_config(
            num_classes=dataset.sign_count or len(dataset.sign_labels or []),
            model_type=model_type,
            **(config_overrides or {})
        )
        
        # Create training job in database
        job = TrainingJob(
            job_name=job_name or f"train_{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            job_id=str(uuid.uuid4()),
            dataset_id=dataset_id,
            model_type=model_type,
            model_config=config_overrides or {},
            status="pending",
            total_epochs=config.num_epochs,
            created_by=user_id
        )
        
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.info(f"Created training job {job.job_id} for dataset {dataset.name}")
        
        # Start training in background
        asyncio.create_task(self._run_training(job.id, dataset_id, config))
        
        return job
    
    async def _run_training(
        self,
        job_id: int,
        dataset_id: int,
        config: ModelConfig
    ):
        """
        Run training (background task)
        
        Args:
            job_id: Training job ID
            dataset_id: Dataset ID
            config: Model configuration
        """
        try:
            # Update job status
            await self._update_job_status(job_id, "running", started_at=datetime.now())
            
            # Get dataset info
            dataset = await dataset_manager.get_dataset(self.db, dataset_id)
            
            # Create data loaders
            logger.info(f"Loading dataset: {dataset.name}")
            train_loader, val_loader, test_loader = create_data_loaders(
                dataset_name=dataset.name,
                batch_size=config.batch_size,
                num_frames=config.num_frames,
                frame_size=(config.input_shape[1], config.input_shape[2])
            )
            
            # Create model (real PyTorch implementation)
            logger.info(f"Creating model: {config.model_type}")
            from app.ml.models.pytorch_model import create_pytorch_model
            model = create_pytorch_model(
                num_classes=config.num_classes,
                model_type=config.model_type,
                input_shape=config.input_shape,
                dropout_rate=config.dropout_rate,
                use_batch_norm=config.use_batch_norm
            )
            
            # Create trainer (optimizer and scheduler will be auto-created)
            trainer = Trainer(
                model=model,
                train_loader=train_loader,
                val_loader=val_loader,
                config=config,
                optimizer=None,  # Auto-created in Trainer
                scheduler=None,  # Auto-created in Trainer
                device=None  # Auto-detect in Trainer
            )
            
            # Add callback to update database
            class DatabaseCallback:
                def __init__(self, orchestrator, job_id):
                    self.orchestrator = orchestrator
                    self.job_id = job_id
                
                async def on_epoch_end(self, epoch: int, trainer: Trainer, metrics: Dict):
                    # Update job in database
                    await self.orchestrator._update_job_progress(
                        self.job_id,
                        current_epoch=epoch + 1,
                        current_loss=metrics.get('loss'),
                        current_accuracy=metrics.get('accuracy'),
                        val_loss=metrics.get('loss'),
                        val_accuracy=metrics.get('accuracy'),
                        best_accuracy=trainer.best_metric
                    )
            
            # Train model
            logger.info(f"Starting training for {config.num_epochs} epochs")
            training_result = trainer.train()
            
            # Save model version
            model_version = await self._create_model_version(
                job_id=job_id,
                dataset_id=dataset_id,
                model_type=config.model_type,
                config=config,
                metrics=training_result
            )
            
            # Update job status
            await self._update_job_status(
                job_id,
                "completed",
                completed_at=datetime.now(),
                model_version_id=model_version.id,
                progress=100.0
            )
            
            logger.info(f"Training job {job_id} completed successfully")
        
        except Exception as e:
            logger.error(f"Training job {job_id} failed: {e}", exc_info=True)
            await self._update_job_status(
                job_id,
                "failed",
                error_message=str(e),
                error_traceback=str(e.__traceback__)
            )
    
    async def _update_job_status(
        self,
        job_id: int,
        status: str,
        **kwargs
    ):
        """Update training job status"""
        # Get job
        from sqlalchemy import select
        result = await self.db.execute(
            select(TrainingJob).where(TrainingJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        # Update fields
        job.status = status
        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
        
        await self.db.commit()
        logger.info(f"Updated job {job_id} status to {status}")
    
    async def _update_job_progress(
        self,
        job_id: int,
        current_epoch: int,
        current_loss: Optional[float] = None,
        current_accuracy: Optional[float] = None,
        val_loss: Optional[float] = None,
        val_accuracy: Optional[float] = None,
        best_accuracy: Optional[float] = None
    ):
        """Update training progress"""
        from sqlalchemy import select
        result = await self.db.execute(
            select(TrainingJob).where(TrainingJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        
        if not job:
            return
        
        job.current_epoch = current_epoch
        job.progress = (current_epoch / job.total_epochs) * 100
        
        if current_loss is not None:
            job.current_loss = current_loss
        if current_accuracy is not None:
            job.current_accuracy = current_accuracy
        if val_loss is not None:
            job.val_loss = val_loss
        if val_accuracy is not None:
            job.val_accuracy = val_accuracy
        if best_accuracy is not None:
            job.best_accuracy = best_accuracy
        
        # Update training history
        if not job.training_history:
            job.training_history = {}
        job.training_history[str(current_epoch)] = {
            'loss': current_loss,
            'accuracy': current_accuracy,
            'val_loss': val_loss,
            'val_accuracy': val_accuracy
        }
        
        await self.db.commit()
    
    async def _create_model_version(
        self,
        job_id: int,
        dataset_id: int,
        model_type: str,
        config: ModelConfig,
        metrics: Dict
    ) -> ModelVersion:
        """Create model version record"""
        model_version = ModelVersion(
            name=f"{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            version="1.0",
            model_type=model_type,
            model_path=str(config.model_dir / "best_model.pth"),
            config_path=str(config.model_dir / "config.json"),
            training_dataset_id=dataset_id,
            accuracy=metrics.get('train_history', [{}])[-1].get('accuracy'),
            val_accuracy=metrics.get('val_history', [{}])[-1].get('accuracy'),
            test_accuracy=None,  # Run test separately
            loss=metrics.get('train_history', [{}])[-1].get('loss'),
            f1_score=metrics.get('val_history', [{}])[-1].get('f1_macro'),
            epochs_trained=metrics.get('total_epochs'),
            training_duration=metrics.get('training_time'),
            hyperparameters={
                'learning_rate': config.learning_rate,
                'batch_size': config.batch_size,
                'num_epochs': config.num_epochs,
                'dropout_rate': config.dropout_rate
            },
            num_classes=config.num_classes,
            input_shape=list(config.input_shape),
            model_size_mb=0.0,  # Calculate from file
            is_active=False,
            is_deployed=False
        )
        
        self.db.add(model_version)
        await self.db.commit()
        await self.db.refresh(model_version)
        
        logger.info(f"Created model version {model_version.id}")
        
        return model_version
    
    async def get_job_status(self, job_id: int) -> Optional[TrainingJob]:
        """Get training job status"""
        from sqlalchemy import select
        result = await self.db.execute(
            select(TrainingJob).where(TrainingJob.id == job_id)
        )
        return result.scalar_one_or_none()
    
    async def cancel_job(self, job_id: int) -> bool:
        """Cancel a training job"""
        await self._update_job_status(job_id, "cancelled")
        # TODO: Actually stop the training process
        return True
    
    async def list_jobs(
        self,
        user_id: Optional[int] = None,
        dataset_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> list:
        """List training jobs"""
        from sqlalchemy import select
        
        query = select(TrainingJob)
        
        if user_id:
            query = query.where(TrainingJob.created_by == user_id)
        if dataset_id:
            query = query.where(TrainingJob.dataset_id == dataset_id)
        if status:
            query = query.where(TrainingJob.status == status)
        
        query = query.order_by(TrainingJob.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())


# Convenience function
async def start_training_job(
    db: AsyncSession,
    dataset_id: int,
    model_type: str = "MobileNet3D",
    user_id: int = 1,
    **config_overrides
) -> TrainingJob:
    """
    Start a training job
    
    Args:
        db: Database session
        dataset_id: Dataset ID
        model_type: Model type
        user_id: User ID
        **config_overrides: Config overrides
        
    Returns:
        Training job
    """
    orchestrator = TrainingOrchestrator(db)
    return await orchestrator.start_training(
        dataset_id=dataset_id,
        model_type=model_type,
        user_id=user_id,
        config_overrides=config_overrides
    )

