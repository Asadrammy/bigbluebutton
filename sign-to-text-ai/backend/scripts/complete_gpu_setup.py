"""
Complete GPU Setup and Training Script
Automatically sets up everything when GPU is available
"""
import sys
import subprocess
import logging
from pathlib import Path
import asyncio

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def run_command(cmd: str, check: bool = True) -> tuple[bool, str]:
    """
    Run a shell command and return success status and output
    
    Args:
        cmd: Command to run
        check: Whether to raise exception on failure
        
    Returns:
        Tuple of (success, output)
    """
    try:
        logger.info(f"Running: {cmd}")
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=check
        )
        output = result.stdout + result.stderr
        if result.returncode == 0:
            logger.info(f"✅ Success")
            return True, output
        else:
            logger.warning(f"⚠️ Command returned {result.returncode}")
            return False, output
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Command failed: {e}")
        return False, str(e)


def check_gpu():
    """Check if GPU is available"""
    logger.info("Checking GPU availability...")
    
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        
        if cuda_available:
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            logger.info(f"✅ GPU detected: {gpu_name} ({gpu_memory:.1f} GB)")
            return True, gpu_name, gpu_memory
        else:
            logger.warning("⚠️ No GPU detected")
            return False, None, None
    except ImportError:
        logger.warning("⚠️ PyTorch not installed")
        return False, None, None


def install_gpu_dependencies():
    """Install GPU-enabled PyTorch and dependencies"""
    logger.info("\n" + "=" * 80)
    logger.info("📦 Phase 1: Installing GPU Dependencies")
    logger.info("=" * 80)
    
    commands = [
        # GPU PyTorch (CUDA 11.8)
        "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118",
        
        # ML dependencies
        "pip install -r requirements-ml.txt",
        
        # Translation
        "pip install transformers sentencepiece",
        
        # TTS
        "pip install TTS",
        
        # STT
        "pip install faster-whisper",
        
        # Additional
        "pip install datasets",  # For HuggingFace datasets
    ]
    
    for cmd in commands:
        success, output = run_command(cmd, check=False)
        if not success:
            logger.warning(f"⚠️ Command may have failed, but continuing: {cmd}")
            logger.warning(f"Output: {output[:200]}")
    
    # Verify GPU
    gpu_available, gpu_name, gpu_memory = check_gpu()
    if gpu_available:
        logger.info(f"✅ GPU ready: {gpu_name} ({gpu_memory:.1f} GB)")
        return True
    else:
        logger.error("❌ GPU not available after installation")
        logger.error("Please check CUDA installation")
        return False


def process_dataset():
    """Process Phoenix-2014 dataset"""
    logger.info("\n" + "=" * 80)
    logger.info("📥 Phase 2: Processing Dataset")
    logger.info("=" * 80)
    
    tar_path = r"D:\projects\sign text\Sign-To-Text-Ai\ml\data\phoenix-2014.v3.tar.gz"
    
    if not Path(tar_path).exists():
        logger.error(f"❌ Dataset not found: {tar_path}")
        return None
    
    logger.info(f"📁 Found dataset: {tar_path}")
    
    # Run preprocessing script
    script_path = Path(__file__).parent / "process_dataset_automated.py"
    cmd = f"python {script_path} --tar-path {tar_path}"
    
    success, output = run_command(cmd, check=False)
    
    if success:
        # Extract dataset ID from output
        import re
        match = re.search(r'Dataset ID: (\d+)', output)
        if match:
            dataset_id = int(match.group(1))
            logger.info(f"✅ Dataset processed! ID: {dataset_id}")
            return dataset_id
    
    logger.error("❌ Dataset processing failed")
    return None


async def train_model(dataset_id: int):
    """Train the model on GPU"""
    logger.info("\n" + "=" * 80)
    logger.info("🎓 Phase 3: Training Model")
    logger.info("=" * 80)
    
    from app.ml.train import start_training_job
    from app.database import get_db
    
    async for db in get_db():
        try:
            logger.info(f"Starting training job for dataset {dataset_id}...")
            
            job = await start_training_job(
                db=db,
                dataset_id=dataset_id,
                model_type="MobileNet3D",
                user_id=1,
                num_epochs=50,
                batch_size=8,
                learning_rate=0.001
            )
            
            logger.info(f"✅ Training job started!")
            logger.info(f"   Job ID: {job.job_id}")
            logger.info(f"   Status: {job.status}")
            logger.info(f"   This will take 2-4 hours on GPU...")
            logger.info(f"   Monitor progress at: /api/v1/training/jobs/{job.id}")
            
            return job.id
        
        except Exception as e:
            logger.error(f"❌ Training failed: {e}", exc_info=True)
            return None


def optimize_model():
    """Optimize model for real-time inference"""
    logger.info("\n" + "=" * 80)
    logger.info("⚡ Phase 4: Optimizing Model")
    logger.info("=" * 80)
    
    model_path = Path("models/checkpoints/best_model.pth")
    
    if not model_path.exists():
        logger.warning(f"⚠️ Model not found: {model_path}")
        logger.warning("   Skipping optimization (will optimize after training)")
        return False
    
    logger.info(f"Optimizing model: {model_path}")
    # Optimization will be done after training completes
    logger.info("✅ Model optimization ready (will run after training)")
    
    return True


def main():
    """Main automated setup"""
    logger.info("=" * 80)
    logger.info("🚀 Complete GPU Setup and Training")
    logger.info("=" * 80)
    
    # Phase 1: Install dependencies
    if not install_gpu_dependencies():
        logger.error("❌ GPU setup failed. Please check GPU availability.")
        return 1
    
    # Phase 2: Process dataset
    dataset_id = process_dataset()
    if not dataset_id:
        logger.error("❌ Dataset processing failed")
        return 1
    
    # Phase 3: Train model
    logger.info("\n" + "=" * 80)
    logger.info("⚠️  TRAINING WILL START NOW")
    logger.info("=" * 80)
    logger.info("This will take 2-4 hours on GPU.")
    logger.info("Training runs in background - you can monitor progress via API.")
    logger.info("=" * 80)
    
    job_id = asyncio.run(train_model(dataset_id))
    
    if job_id:
        logger.info("\n" + "=" * 80)
        logger.info("✅ SETUP COMPLETE!")
        logger.info("=" * 80)
        logger.info(f"\n📊 Summary:")
        logger.info(f"   ✅ GPU: Ready")
        logger.info(f"   ✅ Dataset: Processed (ID: {dataset_id})")
        logger.info(f"   ✅ Training: Started (Job ID: {job_id})")
        logger.info(f"\n🎯 Next Steps:")
        logger.info(f"   1. Monitor training: GET /api/v1/training/jobs/{job_id}")
        logger.info(f"   2. Wait for training to complete (2-4 hours)")
        logger.info(f"   3. Model will be saved to: models/checkpoints/best_model.pth")
        logger.info(f"   4. Test real-time performance after training completes")
        logger.info("=" * 80)
        return 0
    else:
        logger.error("❌ Training failed to start")
        return 1


if __name__ == "__main__":
    exit(main())

