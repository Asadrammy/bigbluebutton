"""
Automated Dataset Processing Script
Processes Phoenix-2014 dataset automatically when GPU is available
"""
import sys
import logging
from pathlib import Path
import asyncio

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.preprocess_phoenix import PhoenixDatasetPreprocessor
from app.services.dataset_manager import dataset_manager
from app.database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def process_phoenix_dataset(
    tar_path: str,
    output_dir: str = "data/datasets",
    dataset_name: str = "phoenix_2014"
):
    """
    Automatically process Phoenix-2014 dataset
    
    Args:
        tar_path: Path to phoenix-2014.v3.tar.gz
        output_dir: Output directory for processed dataset
        dataset_name: Name for the dataset
    """
    logger.info("=" * 80)
    logger.info("🚀 Automated Phoenix-2014 Dataset Processing")
    logger.info("=" * 80)
    
    # Step 1: Preprocess dataset
    logger.info("\n[1/3] Preprocessing Phoenix-2014 dataset...")
    preprocessor = PhoenixDatasetPreprocessor(
        tar_path=tar_path,
        output_dir=output_dir
    )
    
    dataset_path, dataset_info = preprocessor.process(output_name=dataset_name)
    
    logger.info(f"✅ Dataset preprocessed successfully!")
    logger.info(f"   Location: {dataset_path}")
    logger.info(f"   Videos: {dataset_info['total_videos']}")
    logger.info(f"   Signs: {dataset_info['sign_count']}")
    
    # Step 2: Register in database
    logger.info("\n[2/3] Registering dataset in database...")
    
    async for db in get_db():
        try:
            # Check if dataset already exists
            from sqlalchemy import select
            from app.db_models import TrainingDataset
            
            result = await db.execute(
                select(TrainingDataset).where(TrainingDataset.name == dataset_name)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                logger.info(f"Dataset '{dataset_name}' already exists (ID: {existing.id})")
                dataset_id = existing.id
            else:
                # Create new dataset using dataset_manager
                dataset = await dataset_manager.create_dataset(
                    db=db,
                    name=dataset_name,
                    description=f"Phoenix-2014 DGS dataset - {dataset_info['total_videos']} videos, {dataset_info['sign_count']} signs",
                    user_id=1,  # System user
                    sign_labels=dataset_info.get('sign_labels', []),
                    train_split=0.7,
                    val_split=0.15,
                    test_split=0.15
                )
                
                # Update additional fields
                dataset.video_count = dataset_info['total_videos']
                dataset.sign_count = dataset_info['sign_count']
                dataset.source = "rwth_phoenix"
                dataset.is_public = False
                
                await db.commit()
                await db.refresh(dataset)
                dataset_id = dataset.id
                logger.info(f"✅ Dataset registered (ID: {dataset_id})")
            
            break
        except Exception as e:
            logger.error(f"Error registering dataset: {e}", exc_info=True)
            raise
    
    # Step 3: Verify dataset structure
    logger.info("\n[3/3] Verifying dataset structure...")
    
    train_manifest = dataset_path / "train_manifest.json"
    val_manifest = dataset_path / "val_manifest.json"
    test_manifest = dataset_path / "test_manifest.json"
    
    if train_manifest.exists():
        logger.info(f"✅ Train manifest: {train_manifest}")
    else:
        logger.warning(f"⚠️ Train manifest not found: {train_manifest}")
    
    if val_manifest.exists():
        logger.info(f"✅ Val manifest: {val_manifest}")
    else:
        logger.warning(f"⚠️ Val manifest not found: {val_manifest}")
    
    if test_manifest.exists():
        logger.info(f"✅ Test manifest: {test_manifest}")
    else:
        logger.warning(f"⚠️ Test manifest not found: {test_manifest}")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ Dataset Processing Complete!")
    logger.info("=" * 80)
    logger.info(f"\n📊 Dataset Summary:")
    logger.info(f"   Name: {dataset_name}")
    logger.info(f"   ID: {dataset_id}")
    logger.info(f"   Location: {dataset_path}")
    logger.info(f"   Total Videos: {dataset_info['total_videos']}")
    logger.info(f"   Unique Signs: {dataset_info['sign_count']}")
    logger.info(f"   Train: {dataset_info['splits']['train']} videos")
    logger.info(f"   Val: {dataset_info['splits']['dev']} videos")
    logger.info(f"   Test: {dataset_info['splits']['test']} videos")
    logger.info(f"\n🎯 Ready for training!")
    logger.info(f"   Use dataset_id={dataset_id} when starting training")
    logger.info("=" * 80)
    
    return dataset_id, dataset_path, dataset_info


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Automated Phoenix-2014 dataset processing"
    )
    parser.add_argument(
        '--tar-path',
        type=str,
        default=r'D:\projects\sign text\Sign-To-Text-Ai\ml\data\phoenix-2014.v3.tar.gz',
        help='Path to phoenix-2014.v3.tar.gz file'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='data/datasets',
        help='Output directory for processed dataset'
    )
    parser.add_argument(
        '--dataset-name',
        type=str,
        default='phoenix_2014',
        help='Name for the processed dataset'
    )
    
    args = parser.parse_args()
    
    # Check if tar file exists
    tar_path = Path(args.tar_path)
    if not tar_path.exists():
        logger.error(f"❌ Dataset file not found: {tar_path}")
        logger.error("Please check the path and try again.")
        return 1
    
    logger.info(f"📁 Dataset file found: {tar_path}")
    logger.info(f"   Size: {tar_path.stat().st_size / (1024**3):.2f} GB")
    
    # Process dataset
    try:
        dataset_id, dataset_path, dataset_info = asyncio.run(
            process_phoenix_dataset(
                tar_path=str(tar_path),
                output_dir=args.output_dir,
                dataset_name=args.dataset_name
            )
        )
        
        print("\n" + "=" * 80)
        print("✅ SUCCESS! Dataset is ready for training!")
        print("=" * 80)
        print(f"\n📋 Next Steps:")
        print(f"   1. Dataset ID: {dataset_id}")
        print(f"   2. Start training with:")
        print(f"      python -m app.ml.train --dataset-id {dataset_id}")
        print(f"   3. Or use training API:")
        print(f"      POST /api/v1/training/jobs")
        print(f"      {{'dataset_id': {dataset_id}, 'model_type': 'MobileNet3D'}}")
        print("=" * 80)
        
        return 0
    
    except Exception as e:
        logger.error(f"❌ Error processing dataset: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())

