"""
Dataset management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.db_models import User
from app.auth.dependencies import get_current_active_user
from app.services.dataset_manager import dataset_manager
from app.models import SignLanguage as SignLanguageEnum
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for request/response
class DatasetCreate(BaseModel):
    """Request model for creating a dataset"""
    name: str = Field(..., min_length=3, max_length=100, description="Unique dataset name")
    description: str = Field(..., min_length=10, max_length=500, description="Dataset description")
    sign_labels: Optional[List[str]] = Field(default=None, description="List of sign labels")
    train_split: float = Field(default=0.7, ge=0.0, le=1.0, description="Training set ratio")
    val_split: float = Field(default=0.15, ge=0.0, le=1.0, description="Validation set ratio")
    test_split: float = Field(default=0.15, ge=0.0, le=1.0, description="Test set ratio")
    sign_language: Optional[SignLanguageEnum] = Field(
        default=None,
        description="Sign language code for this dataset (e.g., DGS, ASL)",
    )


class DatasetUpdate(BaseModel):
    """Request model for updating a dataset"""
    description: Optional[str] = None
    sign_labels: Optional[List[str]] = None
    is_public: Optional[bool] = None
    sign_language: Optional[SignLanguageEnum] = None


class VideoToDataset(BaseModel):
    """Request model for adding video to dataset"""
    video_filename: str = Field(..., description="Video filename from upload")
    sign_label: str = Field(..., min_length=1, max_length=50, description="Sign label for this video")
    split: str = Field(default="train", pattern="^(train|val|test)$", description="Dataset split")


class DatasetResponse(BaseModel):
    """Response model for dataset"""
    id: int
    name: str
    description: str
    sign_language: Optional[str]
    video_count: int
    sign_count: int
    total_frames: int
    sign_labels: List[str]
    train_split: float
    val_split: float
    test_split: float
    source: str
    version: str
    is_public: bool
    created_at: str
    created_by: int
    
    class Config:
        from_attributes = True


@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    dataset_data: DatasetCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new training dataset
    
    **Parameters:**
    - name: Unique dataset name (3-100 characters)
    - description: Dataset description
    - sign_labels: Optional list of sign labels
    - train_split: Training set ratio (default: 0.7)
    - val_split: Validation set ratio (default: 0.15)
    - test_split: Test set ratio (default: 0.15)
    
    **Returns:**
    - Created dataset information
    """
    try:
        dataset = await dataset_manager.create_dataset(
            db=db,
            name=dataset_data.name,
            description=dataset_data.description,
            user_id=user.id,
            sign_labels=dataset_data.sign_labels,
            train_split=dataset_data.train_split,
            val_split=dataset_data.val_split,
            test_split=dataset_data.test_split,
            sign_language=dataset_data.sign_language.value if dataset_data.sign_language else None,
        )
        
        return {
            "success": True,
            "message": "Dataset created successfully",
            "data": {
                "id": dataset.id,
                "name": dataset.name,
                "description": dataset.description,
                "sign_language": dataset.sign_language,
                "created_at": dataset.created_at.isoformat()
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating dataset"
        )


@router.get("/list", response_model=dict)
async def list_datasets(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    my_datasets: bool = True,
    include_public: bool = False
):
    """
    List training datasets
    
    **Parameters:**
    - my_datasets: Show only current user's datasets (default: True)
    - include_public: Also include public datasets (default: False)
    
    **Returns:**
    - List of datasets
    """
    try:
        datasets = []
        
        if my_datasets:
            # Get user's datasets
            user_datasets = await dataset_manager.list_datasets(
                db=db,
                user_id=user.id
            )
            datasets.extend(user_datasets)
        
        if include_public:
            # Get public datasets
            public_datasets = await dataset_manager.list_datasets(
                db=db,
                is_public=True
            )
            # Filter out duplicates
            existing_ids = {d.id for d in datasets}
            datasets.extend([d for d in public_datasets if d.id not in existing_ids])
        
        # Convert to response format
        dataset_list = []
        for d in datasets:
            dataset_list.append({
                "id": d.id,
                "name": d.name,
                "description": d.description,
                "video_count": d.video_count or 0,
                "sign_count": d.sign_count or 0,
                "total_frames": d.total_frames or 0,
                "sign_labels": d.sign_labels or [],
                "is_public": d.is_public,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "is_mine": d.created_by == user.id
            })
        
        return {
            "success": True,
            "count": len(dataset_list),
            "data": dataset_list
        }
    except Exception as e:
        logger.error(f"Error listing datasets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing datasets"
        )


@router.get("/{dataset_id}", response_model=dict)
async def get_dataset(
    dataset_id: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dataset details
    
    **Parameters:**
    - dataset_id: Dataset ID
    
    **Returns:**
    - Dataset information
    """
    try:
        dataset = await dataset_manager.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        # Check permission (must be owner or public)
        if dataset.created_by != user.id and not dataset.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this dataset"
            )
        
        return {
            "success": True,
            "data": {
                "id": dataset.id,
                "name": dataset.name,
                "description": dataset.description,
                "video_count": dataset.video_count or 0,
                "sign_count": dataset.sign_count or 0,
                "total_frames": dataset.total_frames or 0,
                "sign_labels": dataset.sign_labels or [],
                "train_split": dataset.train_split,
                "val_split": dataset.val_split,
                "test_split": dataset.test_split,
                "source": dataset.source,
                "version": dataset.version,
                "is_public": dataset.is_public,
                "created_at": dataset.created_at.isoformat() if dataset.created_at else None,
                "updated_at": dataset.updated_at.isoformat() if dataset.updated_at else None,
                "created_by": dataset.created_by,
                "is_mine": dataset.created_by == user.id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting dataset"
        )


@router.put("/{dataset_id}", response_model=dict)
async def update_dataset(
    dataset_id: int,
    dataset_data: DatasetUpdate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update dataset
    
    **Parameters:**
    - dataset_id: Dataset ID
    - Updates: description, sign_labels, is_public
    
    **Returns:**
    - Updated dataset information
    """
    try:
        dataset = await dataset_manager.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        # Check permission (must be owner)
        if dataset.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the dataset owner can update it"
            )
        
        # Update dataset
        update_data = dataset_data.dict(exclude_unset=True)
        if "sign_language" in update_data and update_data["sign_language"] is not None:
            update_data["sign_language"] = update_data["sign_language"].value
        updated_dataset = await dataset_manager.update_dataset(
            db=db,
            dataset_id=dataset_id,
            **update_data
        )
        
        return {
            "success": True,
            "message": "Dataset updated successfully",
            "data": {
                "id": updated_dataset.id,
                "name": updated_dataset.name,
                "description": updated_dataset.description,
                "sign_language": updated_dataset.sign_language,
                "sign_labels": updated_dataset.sign_labels,
                "is_public": updated_dataset.is_public
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating dataset"
        )


@router.delete("/{dataset_id}", response_model=dict)
async def delete_dataset(
    dataset_id: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a dataset
    
    **Parameters:**
    - dataset_id: Dataset ID
    
    **Returns:**
    - Success message
    """
    try:
        dataset = await dataset_manager.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        # Check permission (must be owner)
        if dataset.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the dataset owner can delete it"
            )
        
        await dataset_manager.delete_dataset(db, dataset_id)
        
        return {
            "success": True,
            "message": f"Dataset {dataset_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting dataset"
        )


@router.post("/{dataset_id}/add-video", response_model=dict)
async def add_video_to_dataset(
    dataset_id: int,
    video_data: VideoToDataset,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a video to a dataset with a sign label
    
    **Parameters:**
    - dataset_id: Dataset ID
    - video_filename: Video file name (from upload)
    - sign_label: Sign label for this video
    - split: Which split (train/val/test)
    
    **Returns:**
    - Video entry information
    """
    try:
        dataset = await dataset_manager.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        # Check permission (must be owner)
        if dataset.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the dataset owner can add videos"
            )
        
        # Check video belongs to user
        if not video_data.video_filename.startswith(f"user_{user.id}_"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add your own videos"
            )
        
        # Add video to dataset
        entry = await dataset_manager.add_video_to_dataset(
            db=db,
            dataset_id=dataset_id,
            video_filename=video_data.video_filename,
            sign_label=video_data.sign_label,
            split=video_data.split
        )
        
        return {
            "success": True,
            "message": f"Video added to {video_data.split} set",
            "data": entry
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error adding video to dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error adding video to dataset"
        )


@router.get("/{dataset_id}/statistics", response_model=dict)
async def get_dataset_statistics(
    dataset_id: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed statistics about a dataset
    
    **Parameters:**
    - dataset_id: Dataset ID
    
    **Returns:**
    - Detailed statistics
    """
    try:
        dataset = await dataset_manager.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        # Check permission
        if dataset.created_by != user.id and not dataset.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this dataset"
            )
        
        stats = await dataset_manager.get_dataset_statistics(db, dataset_id)
        
        return {
            "success": True,
            "data": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dataset statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting dataset statistics"
        )


@router.get("/{dataset_id}/manifest", response_model=dict)
async def get_dataset_manifest(
    dataset_id: int,
    split: Optional[str] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dataset manifest (list of videos with labels)
    
    **Parameters:**
    - dataset_id: Dataset ID
    - split: Optional split filter (train/val/test)
    
    **Returns:**
    - Dataset manifest
    """
    try:
        dataset = await dataset_manager.get_dataset(db, dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        # Check permission
        if dataset.created_by != user.id and not dataset.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this dataset"
            )
        
        manifest = await dataset_manager.get_dataset_manifest(
            dataset.name,
            split=split
        )
        
        return {
            "success": True,
            "dataset_name": dataset.name,
            "data": manifest
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dataset manifest: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting dataset manifest"
        )

