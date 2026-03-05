#!/usr/bin/env python3
"""
Model Download Script
Downloads all recommended lightweight models automatically:
- Whisper (small model)
- Coqui TTS models (German, English, Spanish, French, Arabic)
- NLLB (distilled-600M)
- MediaPipe (pre-installed with package)

All models are pretrained and lightweight for local machine use.
"""
import os
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def download_whisper_model():
    """Download Whisper small model (RECOMMENDED: lightweight, high accuracy)"""
    logger.info("=" * 60)
    logger.info("Downloading Whisper Model (small)")
    logger.info("=" * 60)
    
    try:
        # Try faster-whisper first (recommended - 4x faster)
        try:
            from faster_whisper import WhisperModel
            logger.info("Using faster-whisper (recommended - 4x faster)")
            
            logger.info("Downloading Whisper 'small' model...")
            model = WhisperModel(
                "small",
                device="cpu",
                compute_type="int8"  # Quantized for faster inference
            )
            logger.info("✅ Whisper 'small' model downloaded successfully")
            logger.info("   Model size: ~244M parameters")
            logger.info("   RAM needed: ~2GB")
            logger.info("   Accuracy: ⭐⭐⭐⭐ Great")
            return True
        
        except ImportError:
            logger.info("faster-whisper not available, trying openai-whisper...")
        
        # Fallback to openai-whisper
        try:
            import whisper
            logger.info("Downloading Whisper 'small' model...")
            model = whisper.load_model("small")
            logger.info("✅ Whisper 'small' model downloaded successfully")
            logger.info("   Model size: ~244M parameters")
            logger.info("   RAM needed: ~2GB")
            logger.info("   Accuracy: ⭐⭐⭐⭐ Great")
            return True
        
        except ImportError:
            logger.error("❌ Whisper not installed. Install with: pip install faster-whisper")
            return False
    
    except Exception as e:
        logger.error(f"❌ Error downloading Whisper model: {e}")
        return False


def download_coqui_tts_models():
    """Download Coqui TTS models for all supported languages"""
    logger.info("=" * 60)
    logger.info("Downloading Coqui TTS Models")
    logger.info("=" * 60)
    
    models = {
        "German": "tts_models/de/thorsten/tacotron2-DDC",
        "English": "tts_models/en/ljspeech/tacotron2-DDC",
        "Spanish": "tts_models/es/mai/tacotron2-DDC",
        "French": "tts_models/fr/mai/tacotron2-DDC",
        "Arabic": "tts_models/ar/css10/vits"
    }
    
    try:
        from TTS.api import TTS
        
        success_count = 0
        for lang, model_name in models.items():
            try:
                logger.info(f"Downloading {lang} TTS model: {model_name}")
                tts = TTS(model_name)
                logger.info(f"✅ {lang} TTS model downloaded successfully")
                success_count += 1
            except Exception as e:
                logger.warning(f"⚠️  Failed to download {lang} model: {e}")
        
        if success_count > 0:
            logger.info(f"✅ Downloaded {success_count}/{len(models)} TTS models")
            return True
        else:
            logger.error("❌ Failed to download any TTS models")
            return False
    
    except ImportError:
        logger.warning("⚠️  Coqui TTS not installed (may not support Python 3.12)")
        logger.info("   This is OK - the service will use gTTS as fallback")
        logger.info("   gTTS is already installed and works well")
        return False  # Not a critical failure, gTTS will be used
    except Exception as e:
        logger.warning(f"⚠️  Error with Coqui TTS: {e}")
        logger.info("   This is OK - the service will use gTTS as fallback")
        return False  # Not a critical failure


def download_nllb_model():
    """Download NLLB distilled-600M model (RECOMMENDED: lightweight, 200+ languages)"""
    logger.info("=" * 60)
    logger.info("Downloading NLLB Translation Model")
    logger.info("=" * 60)
    
    model_name = "facebook/nllb-200-distilled-600M"
    
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        
        logger.info(f"Downloading NLLB model: {model_name}")
        logger.info("This may take a few minutes (model size: ~600MB)...")
        
        # Download tokenizer
        logger.info("Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        logger.info("✅ Tokenizer downloaded")
        
        # Download model
        logger.info("Downloading model...")
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        logger.info("✅ Model downloaded")
        
        logger.info("✅ NLLB model downloaded successfully")
        logger.info("   Model size: ~600M parameters")
        logger.info("   RAM needed: ~2GB")
        logger.info("   Languages: 200+ languages")
        logger.info("   Accuracy: ⭐⭐⭐⭐⭐ Excellent")
        return True
    
    except ImportError:
        logger.error("❌ Transformers not installed. Install with: pip install transformers")
        return False
    except Exception as e:
        logger.error(f"❌ Error downloading NLLB model: {e}")
        return False


def verify_mediapipe():
    """Verify MediaPipe is installed (no download needed, comes with package)"""
    logger.info("=" * 60)
    logger.info("Verifying MediaPipe")
    logger.info("=" * 60)
    
    try:
        import mediapipe as mp
        
        # Try to initialize
        holistic = mp.solutions.holistic.Holistic(
            static_image_mode=False,
            model_complexity=1
        )
        holistic.close()
        
        logger.info("✅ MediaPipe is installed and working")
        logger.info("   MediaPipe models are included in the package")
        logger.info("   No separate download needed")
        logger.info("   Supports: Hands, Pose, Face landmarks")
        return True
    
    except ImportError:
        logger.error("❌ MediaPipe not installed. Install with: pip install mediapipe")
        return False
    except Exception as e:
        logger.error(f"❌ Error verifying MediaPipe: {e}")
        return False


def main():
    """Download all recommended models"""
    logger.info("=" * 60)
    logger.info("Model Download Script")
    logger.info("Downloading all recommended lightweight models")
    logger.info("=" * 60)
    logger.info("")
    
    results = {
        "Whisper": download_whisper_model(),
        "Coqui TTS": download_coqui_tts_models(),
        "NLLB": download_nllb_model(),
        "MediaPipe": verify_mediapipe()
    }
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("Download Summary")
    logger.info("=" * 60)
    
    for model_name, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        logger.info(f"{model_name}: {status}")
    
    all_success = all(results.values())
    
    if all_success:
        logger.info("")
        logger.info("🎉 All models downloaded successfully!")
        logger.info("You can now use all services with high-quality models.")
    else:
        logger.info("")
        logger.warning("⚠️  Some models failed to download.")
        logger.info("Please check the errors above and install missing dependencies.")
        logger.info("")
        logger.info("Install all dependencies with:")
        logger.info("  pip install -r requirements-ml.txt")
    
    return 0 if all_success else 1


if __name__ == "__main__":
    sys.exit(main())

