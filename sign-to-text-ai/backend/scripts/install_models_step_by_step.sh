#!/bin/bash
# Step-by-step model installation script for Linux/Mac
# This installs packages one by one to show progress

echo "========================================"
echo "Model Installation Script"
echo "========================================"
echo ""

echo "Step 1/6: Installing faster-whisper (recommended - 4x faster)..."
python -m pip install faster-whisper || {
    echo "WARNING: faster-whisper installation failed, will try openai-whisper"
    python -m pip install openai-whisper
}
echo ""

echo "Step 2/6: Installing MediaPipe (hand/pose detection)..."
python -m pip install mediapipe
echo ""

echo "Step 3/6: Installing Transformers (for NLLB translation)..."
python -m pip install transformers sentencepiece protobuf
echo ""

echo "Step 4/6: Installing PyTorch (this may take 5-10 minutes)..."
python -m pip install torch torchvision
echo ""

echo "Step 5/6: Installing audio processing libraries..."
python -m pip install pydub librosa
echo ""

echo "Step 6/6: Attempting to install Coqui TTS (may fail on Python 3.12)..."
python -m pip install TTS || {
    echo "NOTE: TTS installation failed - this is OK, gTTS fallback will be used"
    echo "TTS may not support Python 3.12 yet. The service will use gTTS instead."
}
echo ""

echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next step: Run the model download script:"
echo "  python scripts/download_models.py"
echo ""

