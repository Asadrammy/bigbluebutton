"""
Preprocess RWTH-PHOENIX-Weather 2014 Dataset for Sign Language Recognition

This script extracts and preprocesses the Phoenix-2014 dataset to match
the project's data format and creates manifest files for training.
"""
import os
import sys
import tarfile
import json
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
from collections import defaultdict
import shutil

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PhoenixDatasetPreprocessor:
    """Preprocess Phoenix-2014 dataset"""
    
    def __init__(
        self,
        tar_path: str,
        output_dir: str = "data/datasets/phoenix_2014",
        extract_dir: Optional[str] = None
    ):
        """
        Initialize preprocessor
        
        Args:
            tar_path: Path to phoenix-2014.v3.tar.gz file
            output_dir: Output directory for processed dataset
            extract_dir: Temporary directory for extraction (None = auto)
        """
        self.tar_path = Path(tar_path)
        self.output_dir = Path(output_dir)
        self.extract_dir = Path(extract_dir) if extract_dir else self.output_dir.parent / "phoenix_extracted"
        
        # Create directories
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.extract_dir.mkdir(parents=True, exist_ok=True)
        
        logger = logging.getLogger(__name__)
        logger.info(f"Tar file: {self.tar_path}")
        logger.info(f"Extract directory: {self.extract_dir}")
        logger.info(f"Output directory: {self.output_dir}")
    
    def extract_dataset(self) -> Path:
        """
        Extract tar.gz file
        
        Returns:
            Path to extracted dataset root
        """
        if not self.tar_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {self.tar_path}")
        
        logger.info(f"Extracting {self.tar_path.name}...")
        
        # Try different formats: gz, tar, or already extracted
        try:
            # Try gzip format first
            with tarfile.open(self.tar_path, 'r:gz') as tar:
                tar.extractall(self.extract_dir)
        except (tarfile.ReadError, OSError):
            try:
                # Try regular tar format
                logger.info("Trying regular tar format...")
                with tarfile.open(self.tar_path, 'r') as tar:
                    tar.extractall(self.extract_dir)
            except (tarfile.ReadError, OSError):
                # Maybe it's already extracted or a directory
                if self.tar_path.is_dir():
                    logger.info("Path is already a directory, using it directly")
                    return self.tar_path
                else:
                    raise ValueError(f"Could not extract {self.tar_path}. File may be corrupted or in unsupported format.")
        
        # Find the actual dataset directory (usually phoenix2014-release or similar)
        extracted_dirs = list(self.extract_dir.iterdir())
        if len(extracted_dirs) == 1 and extracted_dirs[0].is_dir():
            dataset_root = extracted_dirs[0]
        else:
            # Look for common Phoenix dataset directory names
            for name in ['phoenix2014-release', 'phoenix2014', 'PHOENIX-2014-T-release-v3']:
                potential = self.extract_dir / name
                if potential.exists():
                    dataset_root = potential
                    break
            else:
                dataset_root = self.extract_dir
        
        logger.info(f"Dataset extracted to: {dataset_root}")
        return dataset_root
    
    def find_video_files(self, dataset_root: Path) -> Dict[str, List[Path]]:
        """
        Find all video files in the dataset
        
        Args:
            dataset_root: Root directory of extracted dataset
            
        Returns:
            Dictionary mapping split names to video file paths
        """
        videos = defaultdict(list)
        
        # Common Phoenix dataset structure:
        # - videos/ (or sequences/)
        # - annotations/ (or glosses/)
        # - splits: dev, test, train
        
        # Look for video directory
        video_dirs = ['videos', 'sequences', 'video', 'mp4']
        video_dir = None
        for vdir in video_dirs:
            potential = dataset_root / vdir
            if potential.exists():
                video_dir = potential
                break
        
        if not video_dir:
            # Try root directory
            video_dir = dataset_root
        
        logger.info(f"Searching for videos in: {video_dir}")
        
        # Find all video files
        video_extensions = ['.mp4', '.avi', '.mov', '.mkv']
        for ext in video_extensions:
            for video_file in video_dir.rglob(f'*{ext}'):
                # Determine split from path
                split = self._determine_split(video_file, dataset_root)
                videos[split].append(video_file)
        
        logger.info(f"Found videos: train={len(videos['train'])}, "
                   f"dev={len(videos['dev'])}, test={len(videos['test'])}")
        
        return dict(videos)
    
    def _determine_split(self, video_path: Path, dataset_root: Path) -> str:
        """Determine dataset split from file path"""
        path_str = str(video_path.relative_to(dataset_root))
        
        if 'train' in path_str.lower() or 'training' in path_str.lower():
            return 'train'
        elif 'dev' in path_str.lower() or 'val' in path_str.lower() or 'validation' in path_str.lower():
            return 'dev'
        elif 'test' in path_str.lower():
            return 'test'
        else:
            # Default to train if unclear
            return 'train'
    
    def find_annotations(self, dataset_root: Path) -> Dict[str, Dict]:
        """
        Find annotation files (glosses/text)
        
        Args:
            dataset_root: Root directory of extracted dataset
            
        Returns:
            Dictionary mapping video names to annotations
        """
        annotations = {}
        
        # Look for annotation directories
        annotation_dirs = ['annotations', 'glosses', 'annotations/manual', 'annotations/automatic']
        
        for ann_dir_name in annotation_dirs:
            ann_dir = dataset_root / ann_dir_name
            if ann_dir.exists():
                logger.info(f"Found annotations in: {ann_dir}")
                
                # Look for common annotation file formats
                for ann_file in ann_dir.rglob('*.txt'):
                    # Try to parse annotation file
                    try:
                        video_name = ann_file.stem
                        with open(ann_file, 'r', encoding='utf-8') as f:
                            content = f.read().strip()
                        
                        # Store annotation
                        annotations[video_name] = {
                            'gloss': content,
                            'text': content,  # For now, assume gloss = text
                            'source': str(ann_file)
                        }
                    except Exception as e:
                        logger.warning(f"Could not parse annotation {ann_file}: {e}")
        
        logger.info(f"Found {len(annotations)} annotations")
        return annotations
    
    def get_video_metadata(self, video_path: Path) -> Dict:
        """
        Extract metadata from video file
        
        Args:
            video_path: Path to video file
            
        Returns:
            Dictionary with video metadata
        """
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        
        cap.release()
        
        return {
            'frame_count': frame_count,
            'fps': fps,
            'width': width,
            'height': height,
            'duration_seconds': duration
        }
    
    def create_manifest(
        self,
        videos: Dict[str, List[Path]],
        annotations: Dict[str, Dict],
        output_name: str = "phoenix_2014"
    ):
        """
        Create manifest files for train/val/test splits
        
        Args:
            videos: Dictionary of videos by split
            annotations: Dictionary of annotations
            output_name: Name for the dataset
        """
        # Create dataset directory structure
        dataset_path = self.output_dir / output_name
        dataset_path.mkdir(parents=True, exist_ok=True)
        
        # Process each split
        all_sign_labels = set()
        
        for split in ['train', 'dev', 'test']:
            split_videos = videos.get(split, [])
            if not split_videos:
                logger.warning(f"No videos found for split: {split}")
                continue
            
            manifest = []
            
            logger.info(f"Processing {split} split ({len(split_videos)} videos)...")
            
            for i, video_path in enumerate(split_videos):
                if (i + 1) % 100 == 0:
                    logger.info(f"  Processed {i + 1}/{len(split_videos)} videos...")
                
                try:
                    # Get video metadata
                    metadata = self.get_video_metadata(video_path)
                    
                    # Get annotation
                    video_name = video_path.stem
                    annotation = annotations.get(video_name, {})
                    
                    # Extract sign label from annotation
                    # Phoenix uses gloss annotations - we'll use the first word as label
                    gloss_text = annotation.get('gloss', '') or annotation.get('text', '')
                    
                    if not gloss_text:
                        # Try to extract from filename
                        gloss_text = video_name.split('_')[0] if '_' in video_name else video_name
                    
                    # Clean and normalize label
                    sign_label = self._normalize_label(gloss_text)
                    all_sign_labels.add(sign_label)
                    
                    # Copy video to output directory (optional - can use symlinks)
                    output_video_path = dataset_path / split / f"{video_name}.mp4"
                    output_video_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Copy video file
                    if not output_video_path.exists():
                        shutil.copy2(video_path, output_video_path)
                    
                    # Create manifest entry
                    manifest_entry = {
                        'video_filename': f"{video_name}.mp4",
                        'sign_label': sign_label,
                        'gloss': gloss_text,
                        'frame_count': metadata['frame_count'],
                        'duration': metadata['duration_seconds'],
                        'fps': metadata['fps'],
                        'width': metadata['width'],
                        'height': metadata['height'],
                        'source_path': str(video_path)
                    }
                    
                    manifest.append(manifest_entry)
                
                except Exception as e:
                    logger.error(f"Error processing video {video_path}: {e}")
                    continue
            
            # Save manifest
            manifest_file = dataset_path / f"{split}_manifest.json"
            with open(manifest_file, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Created {split} manifest with {len(manifest)} entries")
        
        # Save dataset info
        dataset_info = {
            'dataset_name': output_name,
            'source': 'RWTH-PHOENIX-Weather-2014',
            'total_videos': sum(len(v) for v in videos.values()),
            'sign_labels': sorted(list(all_sign_labels)),
            'sign_count': len(all_sign_labels),
            'splits': {
                'train': len(videos.get('train', [])),
                'dev': len(videos.get('dev', [])),
                'test': len(videos.get('test', []))
            }
        }
        
        info_file = dataset_path / "dataset_info.json"
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(dataset_info, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Dataset preprocessing complete!")
        logger.info(f"  Total videos: {dataset_info['total_videos']}")
        logger.info(f"  Unique signs: {dataset_info['sign_count']}")
        logger.info(f"  Output: {dataset_path}")
        
        return dataset_path, dataset_info
    
    def _normalize_label(self, label: str) -> str:
        """Normalize sign label"""
        # Remove extra whitespace
        label = ' '.join(label.split())
        
        # Convert to uppercase for consistency
        label = label.upper()
        
        # Remove special characters (keep alphanumeric and spaces)
        label = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in label)
        
        # Take first word if multiple words (for isolated sign recognition)
        # For continuous signing, you might want to keep the full sequence
        words = label.split()
        if words:
            return words[0]  # Use first word as primary label
        
        return label or "UNKNOWN"
    
    def process(self, output_name: str = "phoenix_2014") -> Tuple[Path, Dict]:
        """
        Complete preprocessing pipeline
        
        Args:
            output_name: Name for processed dataset
            
        Returns:
            Tuple of (dataset_path, dataset_info)
        """
        logger.info("=" * 60)
        logger.info("Phoenix-2014 Dataset Preprocessing")
        logger.info("=" * 60)
        
        # Step 1: Extract dataset
        logger.info("\n[1/4] Extracting dataset...")
        dataset_root = self.extract_dataset()
        
        # Step 2: Find videos
        logger.info("\n[2/4] Finding video files...")
        videos = self.find_video_files(dataset_root)
        
        # Step 3: Find annotations
        logger.info("\n[3/4] Finding annotations...")
        annotations = self.find_annotations(dataset_root)
        
        # Step 4: Create manifests
        logger.info("\n[4/4] Creating manifest files...")
        dataset_path, dataset_info = self.create_manifest(
            videos, annotations, output_name
        )
        
        logger.info("\n" + "=" * 60)
        logger.info("Preprocessing Complete!")
        logger.info("=" * 60)
        
        return dataset_path, dataset_info


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Preprocess Phoenix-2014 dataset for sign language recognition"
    )
    parser.add_argument(
        '--tar-path',
        type=str,
        default='D:/projects/sign text/Sign-To-Text-Ai/ml/data/phoenix-2014.v3.tar.gz',
        help='Path to phoenix-2014.v3.tar.gz file'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='data/datasets',
        help='Output directory for processed dataset'
    )
    parser.add_argument(
        '--extract-dir',
        type=str,
        default=None,
        help='Temporary directory for extraction (optional)'
    )
    parser.add_argument(
        '--dataset-name',
        type=str,
        default='phoenix_2014',
        help='Name for the processed dataset'
    )
    
    args = parser.parse_args()
    
    # Create preprocessor
    preprocessor = PhoenixDatasetPreprocessor(
        tar_path=args.tar_path,
        output_dir=args.output_dir,
        extract_dir=args.extract_dir
    )
    
    # Process dataset
    try:
        dataset_path, dataset_info = preprocessor.process(
            output_name=args.dataset_name
        )
        
        print("\n✅ Success! Dataset preprocessed successfully.")
        print(f"\n📁 Dataset location: {dataset_path}")
        print(f"📊 Dataset info saved to: {dataset_path / 'dataset_info.json'}")
        print(f"\n📈 Statistics:")
        print(f"   - Total videos: {dataset_info['total_videos']}")
        print(f"   - Unique signs: {dataset_info['sign_count']}")
        print(f"   - Train videos: {dataset_info['splits']['train']}")
        print(f"   - Dev videos: {dataset_info['splits']['dev']}")
        print(f"   - Test videos: {dataset_info['splits']['test']}")
        
        print("\n🎯 Next steps:")
        print("   1. Register dataset in database using API:")
        print(f"      POST /api/v1/datasets/create")
        print(f"      {{'name': '{args.dataset_name}', ...}}")
        print("   2. Start training job:")
        print(f"      POST /api/v1/training/start")
        print(f"      {{'dataset_id': <id>, 'model_type': 'MobileNet3D', ...}}")
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

