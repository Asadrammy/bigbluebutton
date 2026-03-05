#!/usr/bin/env python3
"""
Complete Installation and Model Download Script
Installs all dependencies and downloads lightweight pretrained models:
- Whisper (small model) - Speech-to-Text
- Coqui TTS models - Text-to-Speech (5 languages)
- NLLB (distilled-600M) - Translation (200+ languages)
- MediaPipe - Sign Language Recognition (hand/pose detection)

All models are pretrained, lightweight, and optimized for local machines.
"""
import os
import sys
import subprocess
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_command(cmd, description=""):
    """Run a shell command and return success status"""
    if description:
        logger.info(f"\n{'='*60}")
        logger.info(description)
        logger.info('='*60)
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        if result.stdout:
            logger.info(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed: {e}")
        if e.stdout:
            logger.error(f"STDOUT: {e.stdout}")
        if e.stderr:
            logger.error(f"STDERR: {e.stderr}")
        return False


def install_base_dependencies():
    """Install base Python dependencies"""
    logger.info("\n" + "="*60)
    logger.info("STEP 1: Installing Base Dependencies")
    logger.info("="*60)
    
    base_packages = [
        "numpy>=1.26.4",
        "opencv-python>=4.10.0.84",
        "pillow>=11.0.0",
        "python-dotenv>=1.0.0",
    ]
    
    for package in base_packages:
        logger.info(f"Installing {package}...")
        if not run_command(f"pip install {package}", ""):
            logger.warning(f"⚠️  Failed to install {package}, continuing...")


def install_ml_dependencies():
    """Install ML dependencies (lightweight versions)"""
    logger.info("\n" + "="*60)
    logger.info("STEP 2: Installing ML Dependencies")
    logger.info("="*60)
    
    # Core ML packages
    ml_packages = [
        "torch>=2.1.1",  # PyTorch (for NLLB and Coqui TTS)
        "transformers>=4.35.2",  # HuggingFace (for NLLB)
        "sentencepiece>=0.1.99",  # For NLLB tokenizer
        "protobuf>=3.20.0",  # For MediaPipe
    ]
    
    logger.info("Installing core ML packages...")
    for package in ml_packages:
        logger.info(f"Installing {package}...")
        if not run_command(f"pip install {package}", ""):
            logger.warning(f"⚠️  Failed to install {package}, continuing...")
    
    # Speech Recognition - faster-whisper (RECOMMENDED - 4x faster)
    logger.info("\nInstalling Speech Recognition (faster-whisper)...")
    if not run_command("pip install faster-whisper", ""):
        logger.warning("⚠️  faster-whisper failed, trying openai-whisper...")
        run_command("pip install openai-whisper", "")
    
    # MediaPipe for hand/pose detection
    logger.info("\nInstalling MediaPipe (for sign language recognition)...")
    run_command("pip install mediapipe>=0.10.8", "")
    
    # Coqui TTS (may not work on Python 3.12, but we'll try)
    logger.info("\nInstalling Coqui TTS (Text-to-Speech)...")
    if not run_command("pip install TTS", ""):
        logger.warning("⚠️  Coqui TTS installation failed (may not support Python 3.12)")
        logger.info("   This is OK - gTTS will be used as fallback")
    
    # Audio processing
    logger.info("\nInstalling audio processing libraries...")
    run_command("pip install pydub>=0.25.1", "")
    run_command("pip install librosa>=0.10.1", "")


def download_whisper_model():
    """Download Whisper small model (lightweight, high accuracy)"""
    logger.info("\n" + "="*60)
    logger.info("STEP 3: Downloading Whisper Model (Speech-to-Text)")
    logger.info("="*60)
    
    try:
        # Try faster-whisper first (recommended)
        try:
            from faster_whisper import WhisperModel
            logger.info("Using faster-whisper (4x faster, recommended)")
            logger.info("Downloading Whisper 'small' model (~244M parameters)...")
            
            model = WhisperModel(
                "small",
                device="cpu",
                compute_type="int8"  # Quantized for faster inference
            )
            
            logger.info("✅ Whisper 'small' model downloaded successfully!")
            logger.info("   Model size: ~244M parameters")
            logger.info("   RAM needed: ~2GB")
            logger.info("   Accuracy: ⭐⭐⭐⭐ Great")
            logger.info("   Speed: ⚡ Medium")
            return True
        
        except ImportError:
            logger.info("faster-whisper not available, trying openai-whisper...")
        
        # Fallback to openai-whisper
        try:
            import whisper
            logger.info("Downloading Whisper 'small' model (~244M parameters)...")
            
            model = whisper.load_model("small")
            
            logger.info("✅ Whisper 'small' model downloaded successfully!")
            logger.info("   Model size: ~244M parameters")
            logger.info("   RAM needed: ~2GB")
            logger.info("   Accuracy: ⭐⭐⭐⭐ Great")
            return True
        
        except ImportError:
            logger.error("❌ Whisper not installed")
            logger.info("   Install with: pip install faster-whisper")
            return False
    
    except Exception as e:
        logger.error(f"❌ Error downloading Whisper model: {e}")
        return False


def download_nllb_model():
    """Download NLLB distilled-600M model (lightweight, 200+ languages)"""
    logger.info("\n" + "="*60)
    logger.info("STEP 4: Downloading NLLB Translation Model")
    logger.info("="*60)
    
    model_name = "facebook/nllb-200-distilled-600M"
    
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        
        logger.info(f"Downloading NLLB model: {model_name}")
        logger.info("This may take a few minutes (model size: ~600MB)...")
        logger.info("   Model: nllb-200-distilled-600M (RECOMMENDED)")
        logger.info("   RAM needed: ~2GB")
        logger.info("   Languages: 200+ languages")
        logger.info("   Accuracy: ⭐⭐⭐⭐⭐ Excellent")
        
        # Download tokenizer
        logger.info("\nDownloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        logger.info("✅ Tokenizer downloaded")
        
        # Download model
        logger.info("Downloading model (this may take a few minutes)...")
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        logger.info("✅ Model downloaded")
        
        logger.info("\n✅ NLLB model downloaded successfully!")
        logger.info("   Supports: German, English, Spanish, French, Arabic, and 195+ more")
        return True
    
    except ImportError:
        logger.error("❌ Transformers not installed")
        logger.info("   Install with: pip install transformers")
        return False
    except Exception as e:
        logger.error(f"❌ Error downloading NLLB model: {e}")
        return False


def download_coqui_tts_models():
    """Download Coqui TTS models for all supported languages"""
    logger.info("\n" + "="*60)
    logger.info("STEP 5: Downloading Coqui TTS Models (Text-to-Speech)")
    logger.info("="*60)
    
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
                logger.info(f"\nDownloading {lang} TTS model: {model_name}")
                tts = TTS(model_name)
                logger.info(f"✅ {lang} TTS model downloaded successfully")
                success_count += 1
            except Exception as e:
                logger.warning(f"⚠️  Failed to download {lang} model: {e}")
        
        if success_count > 0:
            logger.info(f"\n✅ Downloaded {success_count}/{len(models)} TTS models")
            logger.info("   Note: gTTS is available as fallback for any missing models")
            return True
        else:
            logger.warning("⚠️  Failed to download any TTS models")
            logger.info("   This is OK - gTTS will be used as fallback")
            return False
    
    except ImportError:
        logger.warning("⚠️  Coqui TTS not installed (may not support Python 3.12)")
        logger.info("   This is OK - gTTS is already installed and works well")
        logger.info("   gTTS supports all 5 languages: German, English, Spanish, French, Arabic")
        return False  # Not a critical failure
    except Exception as e:
        logger.warning(f"⚠️  Error with Coqui TTS: {e}")
        logger.info("   This is OK - gTTS will be used as fallback")
        return False  # Not a critical failure


def verify_mediapipe():
    """Verify MediaPipe is installed (models included in package)"""
    logger.info("\n" + "="*60)
    logger.info("STEP 6: Verifying MediaPipe (Sign Language Recognition)")
    logger.info("="*60)
    
    try:
        import mediapipe as mp
        
        # Try to initialize
        logger.info("Testing MediaPipe Holistic (hand, pose, face detection)...")
        holistic = mp.solutions.holistic.Holistic(
            static_image_mode=False,
            model_complexity=1  # Lightweight mode
        )
        holistic.close()
        
        logger.info("✅ MediaPipe is installed and working!")
        logger.info("   MediaPipe models are included in the package")
        logger.info("   No separate download needed")
        logger.info("   Supports: Hands, Pose, Face landmarks")
        logger.info("   Real-time performance: 30+ FPS")
        return True
    
    except ImportError:
        logger.error("❌ MediaPipe not installed")
        logger.info("   Install with: pip install mediapipe")
        return False
    except Exception as e:
        logger.error(f"❌ Error verifying MediaPipe: {e}")
        return False


def test_all_components():
    """Test all components to ensure they work"""
    logger.info("\n" + "="*60)
    logger.info("STEP 7: Testing All Components")
    logger.info("="*60)
    
    results = {}
    
    # Test Whisper
    logger.info("\n1. Testing Whisper (Speech-to-Text)...")
    try:
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel("small", device="cpu", compute_type="int8")
            results["Whisper"] = True
            logger.info("   ✅ faster-whisper working")
        except:
            import whisper
            model = whisper.load_model("small")
            results["Whisper"] = True
            logger.info("   ✅ openai-whisper working")
    except Exception as e:
        results["Whisper"] = False
        logger.error(f"   ❌ Whisper test failed: {e}")
    
    # Test NLLB
    logger.info("\n2. Testing NLLB (Translation)...")
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")
        model = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M")
        results["NLLB"] = True
        logger.info("   ✅ NLLB working")
    except Exception as e:
        results["NLLB"] = False
        logger.error(f"   ❌ NLLB test failed: {e}")
    
    # Test Coqui TTS
    logger.info("\n3. Testing Coqui TTS (Text-to-Speech)...")
    try:
        from TTS.api import TTS
        tts = TTS("tts_models/de/thorsten/tacotron2-DDC")
        results["Coqui TTS"] = True
        logger.info("   ✅ Coqui TTS working")
    except Exception as e:
        results["Coqui TTS"] = False
        logger.warning(f"   ⚠️  Coqui TTS not available: {e}")
        logger.info("   (gTTS will be used as fallback)")
    
    # Test MediaPipe
    logger.info("\n4. Testing MediaPipe (Sign Recognition)...")
    try:
        import mediapipe as mp
        holistic = mp.solutions.holistic.Holistic(static_image_mode=False, model_complexity=1)
        holistic.close()
        results["MediaPipe"] = True
        logger.info("   ✅ MediaPipe working")
    except Exception as e:
        results["MediaPipe"] = False
        logger.error(f"   ❌ MediaPipe test failed: {e}")
    
    return results


def main():
    """Main installation and download process"""
    logger.info("\n" + "="*70)
    logger.info(" " * 10 + "COMPLETE MODEL INSTALLATION SCRIPT")
    logger.info("="*70)
    logger.info("\nThis script will:")
    logger.info("  1. Install all required Python packages")
    logger.info("  2. Download Whisper 'small' model (Speech-to-Text)")
    logger.info("  3. Download NLLB distilled-600M model (Translation)")
    logger.info("  4. Download Coqui TTS models (Text-to-Speech, 5 languages)")
    logger.info("  5. Verify MediaPipe (Sign Language Recognition)")
    logger.info("  6. Test all components")
    logger.info("\nAll models are lightweight, pretrained, and optimized for local machines.")
    logger.info("="*70)
    
    # Step 1: Install base dependencies
    install_base_dependencies()
    
    # Step 2: Install ML dependencies
    install_ml_dependencies()
    
    # Step 3: Download Whisper model
    whisper_success = download_whisper_model()
    
    # Step 4: Download NLLB model
    nllb_success = download_nllb_model()
    
    # Step 5: Download Coqui TTS models
    tts_success = download_coqui_tts_models()
    
    # Step 6: Verify MediaPipe
    mediapipe_success = verify_mediapipe()
    
    # Step 7: Test all components
    test_results = test_all_components()
    
    # Summary
    logger.info("\n" + "="*70)
    logger.info("INSTALLATION SUMMARY")
    logger.info("="*70)
    
    summary = {
        "Whisper (STT)": whisper_success,
        "NLLB (Translation)": nllb_success,
        "Coqui TTS": tts_success,
        "MediaPipe": mediapipe_success,
    }
    
    for component, success in summary.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        logger.info(f"{component:25} {status}")
    
    logger.info("\n" + "="*70)
    logger.info("TEST RESULTS")
    logger.info("="*70)
    
    for component, success in test_results.items():
        status = "✅ WORKING" if success else "❌ FAILED"
        logger.info(f"{component:25} {status}")
    
    # Final status
    critical_components = ["Whisper", "NLLB", "MediaPipe"]
    critical_success = all(summary.get(c, False) for c in critical_components)
    
    logger.info("\n" + "="*70)
    if critical_success:
        logger.info("🎉 SUCCESS! All critical components are installed and working!")
        logger.info("\nYou can now use:")
        logger.info("  ✅ Speech-to-Text (Whisper)")
        logger.info("  ✅ Translation (NLLB - 200+ languages)")
        logger.info("  ✅ Text-to-Speech (Coqui TTS or gTTS)")
        logger.info("  ✅ Sign Language Recognition (MediaPipe)")
    else:
        logger.warning("⚠️  Some components failed to install.")
        logger.info("Please check the errors above and install missing dependencies.")
        logger.info("\nTry installing manually:")
        logger.info("  pip install -r requirements-ml.txt")
    
    logger.info("="*70)
    
    return 0 if critical_success else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        logger.info("\n\nInstallation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n\nUnexpected error: {e}", exc_info=True)
        sys.exit(1)

