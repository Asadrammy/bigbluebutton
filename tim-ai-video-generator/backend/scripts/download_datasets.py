"""
Dataset Download Scripts for Sign Language Recognition

Supports multiple sign language datasets:
- WLASL (ASL)
- Hugging Face datasets
- Custom datasets
"""
import os
import sys
import requests
import json
from pathlib import Path
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SignLanguageDatasetDownloader:
    """Download and prepare sign language datasets"""
    
    def __init__(self, output_dir: str = "data/datasets"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def download_wlasl(self, video_limit: Optional[int] = None):
        """
        Download WLASL dataset (American Sign Language)
        
        Args:
            video_limit: Limit number of videos (None = all)
        """
        logger.info("Downloading WLASL dataset...")
        
        # Clone WLASL repository
        wlasl_dir = self.output_dir / "WLASL"
        if not wlasl_dir.exists():
            logger.info("Cloning WLASL repository...")
            os.system(f"git clone https://github.com/dxli94/WLASL.git {wlasl_dir}")
        
        # Download metadata
        metadata_url = "https://raw.githubusercontent.com/dxli94/WLASL/master/start_kit/WLASL_v0.3.json"
        metadata_path = wlasl_dir / "metadata.json"
        
        if not metadata_path.exists():
            logger.info("Downloading metadata...")
            response = requests.get(metadata_url)
            with open(metadata_path, 'w') as f:
                json.dump(response.json(), f, indent=2)
        
        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        logger.info(f"WLASL contains {len(metadata)} sign classes")
        
        # Download videos using start_kit.py
        logger.info("Downloading videos... (This may take several hours)")
        logger.info("Run: cd data/datasets/WLASL && python code/start_kit.py --download-all")
        
        return wlasl_dir
    
    def download_huggingface_dataset(self, dataset_name: str = "sltAI/crowdsourced-text-to-sign-language-rule-based-translation-corpus"):
        """
        Download dataset from Hugging Face
        
        Args:
            dataset_name: HuggingFace dataset identifier
        """
        try:
            from datasets import load_dataset
            
            logger.info(f"Downloading {dataset_name} from Hugging Face...")
            
            # Download dataset
            dataset = load_dataset(dataset_name)
            
            # Save to disk
            output_path = self.output_dir / "huggingface" / dataset_name.replace("/", "_")
            output_path.mkdir(parents=True, exist_ok=True)
            
            dataset.save_to_disk(str(output_path))
            
            logger.info(f"Dataset saved to: {output_path}")
            logger.info(f"Dataset info: {dataset}")
            
            return output_path
        
        except ImportError:
            logger.error("Install datasets: pip install datasets")
            return None
        except Exception as e:
            logger.error(f"Error downloading dataset: {e}")
            return None
    
    def create_custom_dataset_structure(self):
        """
        Create directory structure for custom DGS dataset
        
        Structure:
        data/datasets/custom_dgs/
        ├── train/
        │   ├── hallo/
        │   │   ├── video_001.mp4
        │   │   └── video_002.mp4
        │   └── danke/
        │       └── video_001.mp4
        ├── val/
        └── test/
        """
        custom_dir = self.output_dir / "custom_dgs"
        
        for split in ['train', 'val', 'test']:
            split_dir = custom_dir / split
            split_dir.mkdir(parents=True, exist_ok=True)
            
            # Create README
            readme_path = split_dir / "README.md"
            with open(readme_path, 'w') as f:
                f.write(f"""# Custom DGS Dataset - {split.upper()} Split

## Instructions

1. Create a folder for each sign/word (e.g., `hallo`, `danke`, `bitte`)
2. Place video files in the corresponding folder
3. Naming convention: `<sign>_<signer>_<take>.mp4`

## Example:
```
{split}/
├── hallo/
│   ├── hallo_signer1_001.mp4
│   ├── hallo_signer1_002.mp4
│   └── hallo_signer2_001.mp4
├── danke/
│   └── danke_signer1_001.mp4
└── bitte/
    └── bitte_signer1_001.mp4
```

## Video Requirements:
- Format: MP4, AVI, MOV
- Resolution: 224x224 or higher
- FPS: 25-30
- Duration: 1-5 seconds per sign
- Clear view of signer (torso + hands visible)

## Recommended Samples:
- Minimum: 50 videos per sign
- Recommended: 200+ videos per sign
- Multiple signers for diversity
""")
        
        logger.info(f"Custom dataset structure created at: {custom_dir}")
        return custom_dir
    
    def download_rwth_phoenix_instructions(self):
        """
        Print instructions for downloading RWTH-PHOENIX dataset
        """
        instructions = """
╔══════════════════════════════════════════════════════════════════╗
║       RWTH-PHOENIX Weather 2014T Dataset (DGS)                   ║
╚══════════════════════════════════════════════════════════════════╝

This is the BEST dataset for German Sign Language (DGS)!

📊 Dataset Info:
   - 6,841 videos of German Sign Language
   - Weather forecast domain
   - Continuous signing (not isolated signs)
   - Gloss annotations
   - Research-grade quality

📥 How to Download:

1. Visit: https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-PHOENIX/

2. Fill out the download request form:
   - Name & Email
   - Institution/University
   - Research purpose
   - Accept license agreement

3. You will receive download instructions via email (usually within 1-2 weeks)

4. Once downloaded, place files in:
   data/datasets/rwth_phoenix/

5. Run our preprocessing script:
   python scripts/preprocess_rwth_phoenix.py

⚠️  NOTE: This dataset requires a research agreement.
    Make sure to cite their paper in any publications!

📄 Citation:
   Koller et al., "Continuous sign language recognition:
   Towards large vocabulary statistical recognition systems
   handling multiple signers", Computer Vision and Image Understanding, 2015
╚══════════════════════════════════════════════════════════════════╝
"""
        print(instructions)
        
        # Save instructions to file
        instructions_file = self.output_dir / "RWTH_PHOENIX_INSTRUCTIONS.txt"
        with open(instructions_file, 'w') as f:
            f.write(instructions)
        
        logger.info(f"Instructions saved to: {instructions_file}")


def main():
    """Main download script"""
    downloader = SignLanguageDatasetDownloader()
    
    print("""
╔══════════════════════════════════════════════════════════════════╗
║      Sign Language Dataset Downloader                            ║
╚══════════════════════════════════════════════════════════════════╝

Select dataset to download:

1. WLASL (ASL - 21K videos, publicly available)
2. Hugging Face sltAI dataset (text-based, rule-based)
3. Create custom DGS dataset structure
4. RWTH-PHOENIX instructions (DGS - requires research agreement)
5. Download all public datasets

Enter choice (1-5):
""")
    
    choice = input().strip()
    
    if choice == '1':
        logger.info("Downloading WLASL...")
        downloader.download_wlasl()
        logger.info("✅ WLASL metadata downloaded. Run the video download script manually.")
    
    elif choice == '2':
        logger.info("Downloading Hugging Face dataset...")
        downloader.download_huggingface_dataset()
        logger.info("✅ Hugging Face dataset downloaded.")
    
    elif choice == '3':
        logger.info("Creating custom DGS dataset structure...")
        custom_dir = downloader.create_custom_dataset_structure()
        logger.info(f"✅ Custom dataset structure created at: {custom_dir}")
        logger.info("You can now add your own DGS videos to this directory!")
    
    elif choice == '4':
        downloader.download_rwth_phoenix_instructions()
        logger.info("✅ RWTH-PHOENIX instructions displayed.")
    
    elif choice == '5':
        logger.info("Downloading all public datasets...")
        downloader.download_wlasl()
        downloader.download_huggingface_dataset()
        downloader.create_custom_dataset_structure()
        downloader.download_rwth_phoenix_instructions()
        logger.info("✅ All datasets processed!")
    
    else:
        logger.error("Invalid choice!")
    
    print("""
╔══════════════════════════════════════════════════════════════════╗
║                     Download Complete!                            ║
╚══════════════════════════════════════════════════════════════════╝

Next Steps:
1. Check data/datasets/ directory
2. For WLASL: cd data/datasets/WLASL && python code/start_kit.py --download-all
3. For custom DGS: Add your videos to data/datasets/custom_dgs/
4. For RWTH-PHOENIX: Follow email instructions

Then run: python scripts/preprocess_datasets.py
""")


if __name__ == "__main__":
    main()

