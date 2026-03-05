"""
Training management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.db_models import User, TrainingJob
from app.auth.dependencies import get_current_active_user
from app.ml.train import TrainingOrchestrator, start_training_job
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models
class TrainingJobCreate(BaseModel):
    """Request to create a training job"""
    dataset_id: int = Field(..., description="Dataset ID to train on")
    model_type: str = Field(default="MobileNet3D", description="Model type")
    job_name: Optional[str] = Field(None, description="Optional job name")
    
    # Config overrides
    batch_size: Optional[int] = Field(None, ge=1, le=64)
    learning_rate: Optional[float] = Field(None, ge=1e-6, le=1.0)
    num_epochs: Optional[int] = Field(None, ge=1, le=1000)
    dropout_rate: Optional[float] = Field(None, ge=0.0, le=1.0)
    patience: Optional[int] = Field(None, ge=1, le=100)


class TrainingJobResponse(BaseModel):
    """Training job response"""
    id: int
    job_name: str
    job_id: str
    dataset_id: int
    model_type: str
    status: str
    progress: float
    current_epoch: int
    total_epochs: int
    current_loss: Optional[float]
    current_accuracy: Optional[float]
    val_loss: Optional[float]
    val_accuracy: Optional[float]
    best_accuracy: Optional[float]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    
    class Config:
        from_attributes = True


@router.post("/start", response_model=dict, status_code=status.HTTP_201_CREATED)
async def start_training(
    job_data: TrainingJobCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Start a new training job
    
    **Parameters:**
    - dataset_id: ID of dataset to train on
    - model_type: Model architecture ("MobileNet3D", "I3D", "LSTM_CNN")
    - job_name: Optional name for the job
    - Config overrides: batch_size, learning_rate, num_epochs, dropout_rate, patience
    
    **Returns:**
    - Created training job with job_id for tracking
    """
    try:
        # Build config overrides
        config_overrides = {}
        if job_data.batch_size:
            config_overrides['batch_size'] = job_data.batch_size
        if job_data.learning_rate:
            config_overrides['learning_rate'] = job_data.learning_rate
        if job_data.num_epochs:
            config_overrides['num_epochs'] = job_data.num_epochs
        if job_data.dropout_rate:
            config_overrides['dropout_rate'] = job_data.dropout_rate
        if job_data.patience:
            config_overrides['patience'] = job_data.patience
        
        # Start training
        orchestrator = TrainingOrchestrator(db)
        job = await orchestrator.start_training(
            dataset_id=job_data.dataset_id,
            model_type=job_data.model_type,
            user_id=user.id,
            job_name=job_data.job_name,
            config_overrides=config_overrides
        )
        
        return {
            "success": True,
            "message": "Training job started",
            "data": {
                "job_id": job.job_id,
                "id": job.id,
                "job_name": job.job_name,
                "status": job.status,
                "dataset_id": job.dataset_id,
                "model_type": job.model_type
            }
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error starting training: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start training job"
        )


@router.get("/jobs", response_model=dict)
async def list_training_jobs(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    dataset_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    limit: int = 50
):
    """
    List training jobs
    
    **Parameters:**
    - dataset_id: Filter by dataset (optional)
    - status_filter: Filter by status (optional)
    - limit: Maximum number of jobs to return
    
    **Returns:**
    - List of training jobs
    """
    try:
        orchestrator = TrainingOrchestrator(db)
        jobs = await orchestrator.list_jobs(
            user_id=user.id,
            dataset_id=dataset_id,
            status=status_filter
        )
        
        # Limit results
        jobs = jobs[:limit]
        
        # Format response
        jobs_data = []
        for job in jobs:
            jobs_data.append({
                "id": job.id,
                "job_name": job.job_name,
                "job_id": job.job_id,
                "dataset_id": job.dataset_id,
                "model_type": job.model_type,
                "status": job.status,
                "progress": job.progress or 0.0,
                "current_epoch": job.current_epoch or 0,
                "total_epochs": job.total_epochs,
                "current_accuracy": job.current_accuracy,
                "val_accuracy": job.val_accuracy,
                "best_accuracy": job.best_accuracy,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None
            })
        
        return {
            "success": True,
            "count": len(jobs_data),
            "data": jobs_data
        }
    
    except Exception as e:
        logger.error(f"Error listing training jobs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list training jobs"
        )


@router.get("/jobs/{job_id}", response_model=dict)
async def get_training_job(
    job_id: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get training job details
    
    **Parameters:**
    - job_id: Training job ID
    
    **Returns:**
    - Training job details with metrics
    """
    try:
        orchestrator = TrainingOrchestrator(db)
        job = await orchestrator.get_job_status(job_id)
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Training job {job_id} not found"
            )
        
        # Check permission
        if job.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this training job"
            )
        
        # Format response
        job_data = {
            "id": job.id,
            "job_name": job.job_name,
            "job_id": job.job_id,
            "dataset_id": job.dataset_id,
            "model_type": job.model_type,
            "status": job.status,
            "progress": job.progress or 0.0,
            "current_epoch": job.current_epoch or 0,
            "total_epochs": job.total_epochs,
            "current_loss": job.current_loss,
            "current_accuracy": job.current_accuracy,
            "val_loss": job.val_loss,
            "val_accuracy": job.val_accuracy,
            "best_accuracy": job.best_accuracy,
            "training_history": job.training_history or {},
            "gpu_used": job.gpu_used,
            "memory_usage_mb": job.memory_usage_mb,
            "error_message": job.error_message,
            "model_version_id": job.model_version_id,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }
        
        return {
            "success": True,
            "data": job_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get training job"
        )


@router.post("/jobs/{job_id}/cancel", response_model=dict)
async def cancel_training_job(
    job_id: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a running training job
    
    **Parameters:**
    - job_id: Training job ID
    
    **Returns:**
    - Success message
    """
    try:
        orchestrator = TrainingOrchestrator(db)
        job = await orchestrator.get_job_status(job_id)
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Training job {job_id} not found"
            )
        
        # Check permission
        if job.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this training job"
            )
        
        # Check if job can be cancelled
        if job.status not in ["pending", "running"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel job with status: {job.status}"
            )
        
        # Cancel job
        await orchestrator.cancel_job(job_id)
        
        return {
            "success": True,
            "message": f"Training job {job_id} cancelled"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling training job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel training job"
        )


@router.get("/jobs/{job_id}/metrics", response_model=dict)
async def get_training_metrics(
    job_id: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed training metrics for a job
    
    **Parameters:**
    - job_id: Training job ID
    
    **Returns:**
    - Training metrics history
    """
    try:
        orchestrator = TrainingOrchestrator(db)
        job = await orchestrator.get_job_status(job_id)
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Training job {job_id} not found"
            )
        
        # Check permission
        if job.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this training job"
            )
        
        # Extract metrics from history
        history = job.training_history or {}
        
        metrics = {
            "epochs": [],
            "train_loss": [],
            "train_accuracy": [],
            "val_loss": [],
            "val_accuracy": []
        }
        
        for epoch_str, epoch_data in history.items():
            metrics["epochs"].append(int(epoch_str))
            metrics["train_loss"].append(epoch_data.get("loss"))
            metrics["train_accuracy"].append(epoch_data.get("accuracy"))
            metrics["val_loss"].append(epoch_data.get("val_loss"))
            metrics["val_accuracy"].append(epoch_data.get("val_accuracy"))
        
        return {
            "success": True,
            "data": {
                "job_id": job.job_id,
                "status": job.status,
                "current_epoch": job.current_epoch,
                "total_epochs": job.total_epochs,
                "best_accuracy": job.best_accuracy,
                "metrics": metrics
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get training metrics"
        )


@router.get("/models", response_model=dict)
async def list_trained_models(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    dataset_id: Optional[int] = None,
    is_active: Optional[bool] = None
):
    """
    List trained model versions
    
    **Parameters:**
    - dataset_id: Filter by dataset (optional)
    - is_active: Filter by active status (optional)
    
    **Returns:**
    - List of trained models
    """
    try:
        from sqlalchemy import select
        from app.db_models import ModelVersion
        
        query = select(ModelVersion)
        
        if dataset_id:
            query = query.where(ModelVersion.training_dataset_id == dataset_id)
        if is_active is not None:
            query = query.where(ModelVersion.is_active == is_active)
        
        query = query.order_by(ModelVersion.created_at.desc())
        
        result = await db.execute(query)
        models = list(result.scalars().all())
        
        # Format response
        models_data = []
        for model in models:
            models_data.append({
                "id": model.id,
                "name": model.name,
                "version": model.version,
                "model_type": model.model_type,
                "accuracy": model.accuracy,
                "val_accuracy": model.val_accuracy,
                "test_accuracy": model.test_accuracy,
                "f1_score": model.f1_score,
                "epochs_trained": model.epochs_trained,
                "training_dataset_id": model.training_dataset_id,
                "is_active": model.is_active,
                "is_deployed": model.is_deployed,
                "created_at": model.created_at.isoformat() if model.created_at else None
            })
        
        return {
            "success": True,
            "count": len(models_data),
            "data": models_data
        }
    
    except Exception as e:
        logger.error(f"Error listing models: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list models"
        )

