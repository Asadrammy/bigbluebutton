"""
Dataset management service for ML training
"""
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db_models import TrainingDataset, User
from app.services.storage import storage_service
from app.services.video_processor import video_processor
import random

logger = logging.getLogger(__name__)


class DatasetManager:
    """Manage ML training datasets"""
    
    def __init__(self):
        self.datasets_dir = Path("data/datasets")
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_dataset(
        self,
        db: AsyncSession,
        name: str,
        description: str,
        user_id: int,
        sign_labels: Optional[List[str]] = None,
        train_split: float = 0.7,
        val_split: float = 0.15,
        test_split: float = 0.15,
        sign_language: Optional[str] = None,
    ) -> TrainingDataset:
        """
        Create a new training dataset
        
        Args:
            db: Database session
            name: Dataset name (must be unique)
            description: Dataset description
            user_id: User creating the dataset
            sign_labels: List of sign labels in dataset
            train_split: Training set split ratio
            val_split: Validation set split ratio
            test_split: Test set split ratio
            
        Returns:
            Created TrainingDataset object
        """
        # Validate splits
        if abs(train_split + val_split + test_split - 1.0) > 0.01:
            raise ValueError("Train/val/test splits must sum to 1.0")
        
        # Check if dataset name already exists
        result = await db.execute(
            select(TrainingDataset).where(TrainingDataset.name == name)
        )
        if result.scalar_one_or_none():
            raise ValueError(f"Dataset with name '{name}' already exists")
        
        # Create dataset
        dataset = TrainingDataset(
            name=name,
            description=description,
            created_by=user_id,
            sign_language=sign_language,
            sign_labels=sign_labels or [],
            train_split=train_split,
            val_split=val_split,
            test_split=test_split,
            source="user_uploaded"
        )
        
        db.add(dataset)
        await db.commit()
        await db.refresh(dataset)
        
        # Create dataset directory
        dataset_path = self.datasets_dir / name
        dataset_path.mkdir(parents=True, exist_ok=True)
        (dataset_path / "train").mkdir(exist_ok=True)
        (dataset_path / "val").mkdir(exist_ok=True)
        (dataset_path / "test").mkdir(exist_ok=True)
        
        logger.info(f"Created dataset: {name} (ID: {dataset.id})")
        
        return dataset
    
    async def get_dataset(
        self,
        db: AsyncSession,
        dataset_id: int
    ) -> Optional[TrainingDataset]:
        """Get dataset by ID"""
        result = await db.execute(
            select(TrainingDataset).where(TrainingDataset.id == dataset_id)
        )
        return result.scalar_one_or_none()
    
    async def list_datasets(
        self,
        db: AsyncSession,
        user_id: Optional[int] = None,
        is_public: Optional[bool] = None
    ) -> List[TrainingDataset]:
        """
        List all datasets
        
        Args:
            db: Database session
            user_id: Filter by user (None = all users)
            is_public: Filter by public status (None = all)
            
        Returns:
            List of datasets
        """
        query = select(TrainingDataset)
        
        if user_id is not None:
            query = query.where(TrainingDataset.created_by == user_id)
        
        if is_public is not None:
            query = query.where(TrainingDataset.is_public == is_public)
        
        query = query.order_by(TrainingDataset.created_at.desc())
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def update_dataset(
        self,
        db: AsyncSession,
        dataset_id: int,
        **kwargs
    ) -> TrainingDataset:
        """
        Update dataset properties
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            **kwargs: Fields to update
            
        Returns:
            Updated dataset
        """
        dataset = await self.get_dataset(db, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(dataset, key):
                setattr(dataset, key, value)
        
        await db.commit()
        await db.refresh(dataset)
        
        logger.info(f"Updated dataset {dataset_id}: {kwargs}")
        
        return dataset
    
    async def delete_dataset(
        self,
        db: AsyncSession,
        dataset_id: int
    ) -> bool:
        """
        Delete a dataset
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            
        Returns:
            True if deleted
        """
        dataset = await self.get_dataset(db, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # Delete dataset directory
        dataset_path = self.datasets_dir / dataset.name
        if dataset_path.exists():
            import shutil
            shutil.rmtree(dataset_path)
        
        await db.delete(dataset)
        await db.commit()
        
        logger.info(f"Deleted dataset {dataset_id}: {dataset.name}")
        
        return True
    
    async def add_video_to_dataset(
        self,
        db: AsyncSession,
        dataset_id: int,
        video_filename: str,
        sign_label: str,
        split: str = "train"
    ) -> Dict:
        """
        Add a video to a dataset with a sign label
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            video_filename: Video file name
            sign_label: Sign label for this video
            split: Which split (train/val/test)
            
        Returns:
            Info about added video
        """
        dataset = await self.get_dataset(db, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        if split not in ["train", "val", "test"]:
            raise ValueError(f"Invalid split: {split}. Must be train/val/test")
        
        # Get video file
        video_path = await storage_service.get_video(video_filename)
        
        # Extract metadata
        metadata = video_processor.get_video_metadata(video_path)
        
        # Create entry in dataset manifest
        dataset_path = self.datasets_dir / dataset.name
        manifest_file = dataset_path / f"{split}_manifest.json"
        
        # Load existing manifest
        if manifest_file.exists():
            with open(manifest_file, 'r') as f:
                manifest = json.load(f)
        else:
            manifest = []
        
        # Add new entry
        entry = {
            "video_filename": video_filename,
            "sign_label": sign_label,
            "frame_count": metadata.frame_count,
            "duration": metadata.duration_seconds,
            "added_at": datetime.now().isoformat()
        }
        manifest.append(entry)
        
        # Save manifest
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        # Update dataset statistics
        dataset.video_count = (dataset.video_count or 0) + 1
        dataset.total_frames = (dataset.total_frames or 0) + metadata.frame_count
        
        # Add sign label if not already present
        if sign_label not in (dataset.sign_labels or []):
            labels = dataset.sign_labels or []
            labels.append(sign_label)
            dataset.sign_labels = labels
            dataset.sign_count = len(labels)
        
        await db.commit()
        await db.refresh(dataset)
        
        logger.info(f"Added video {video_filename} to dataset {dataset_id} ({split}/{sign_label})")
        
        return entry
    
    async def get_dataset_manifest(
        self,
        dataset_name: str,
        split: Optional[str] = None
    ) -> Dict[str, List[Dict]]:
        """
        Get dataset manifest
        
        Args:
            dataset_name: Dataset name
            split: Specific split or None for all
            
        Returns:
            Manifest data
        """
        dataset_path = self.datasets_dir / dataset_name
        
        if not dataset_path.exists():
            raise ValueError(f"Dataset directory not found: {dataset_name}")
        
        manifests = {}
        splits = [split] if split else ["train", "val", "test"]
        
        for s in splits:
            manifest_file = dataset_path / f"{s}_manifest.json"
            if manifest_file.exists():
                with open(manifest_file, 'r') as f:
                    manifests[s] = json.load(f)
            else:
                manifests[s] = []
        
        return manifests
    
    async def get_dataset_statistics(
        self,
        db: AsyncSession,
        dataset_id: int
    ) -> Dict:
        """
        Get detailed statistics about a dataset
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            
        Returns:
            Statistics dictionary
        """
        dataset = await self.get_dataset(db, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # Load manifests
        manifests = await self.get_dataset_manifest(dataset.name)
        
        # Calculate statistics
        stats = {
            "dataset_id": dataset.id,
            "dataset_name": dataset.name,
            "total_videos": dataset.video_count or 0,
            "total_frames": dataset.total_frames or 0,
            "sign_count": dataset.sign_count or 0,
            "sign_labels": dataset.sign_labels or [],
            "splits": {
                "train": {
                    "videos": len(manifests.get("train", [])),
                    "percentage": dataset.train_split * 100
                },
                "val": {
                    "videos": len(manifests.get("val", [])),
                    "percentage": dataset.val_split * 100
                },
                "test": {
                    "videos": len(manifests.get("test", [])),
                    "percentage": dataset.test_split * 100
                }
            },
            "created_at": dataset.created_at.isoformat() if dataset.created_at else None,
            "updated_at": dataset.updated_at.isoformat() if dataset.updated_at else None
        }
        
        # Count videos per sign
        sign_counts = {}
        for split_name, split_data in manifests.items():
            for entry in split_data:
                label = entry['sign_label']
                if label not in sign_counts:
                    sign_counts[label] = 0
                sign_counts[label] += 1
        
        stats["videos_per_sign"] = sign_counts
        
        return stats
    
    def auto_split_videos(
        self,
        video_list: List[Dict],
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        random_seed: int = 42
    ) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """
        Automatically split videos into train/val/test sets
        
        Args:
            video_list: List of video entries with sign labels
            train_ratio: Training set ratio
            val_ratio: Validation set ratio
            test_ratio: Test set ratio
            random_seed: Random seed for reproducibility
            
        Returns:
            Tuple of (train, val, test) lists
        """
        random.seed(random_seed)
        
        # Group by sign label for stratified split
        label_groups = {}
        for video in video_list:
            label = video.get('sign_label', 'unknown')
            if label not in label_groups:
                label_groups[label] = []
            label_groups[label].append(video)
        
        train, val, test = [], [], []
        
        # Split each label group
        for label, videos in label_groups.items():
            random.shuffle(videos)
            n = len(videos)
            
            train_end = int(n * train_ratio)
            val_end = train_end + int(n * val_ratio)
            
            train.extend(videos[:train_end])
            val.extend(videos[train_end:val_end])
            test.extend(videos[val_end:])
        
        # Shuffle final splits
        random.shuffle(train)
        random.shuffle(val)
        random.shuffle(test)
        
        logger.info(f"Split {len(video_list)} videos: train={len(train)}, val={len(val)}, test={len(test)}")
        
        return train, val, test


# Singleton instance
dataset_manager = DatasetManager()

