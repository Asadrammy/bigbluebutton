# Sign Language Translator - Backend API

Python FastAPI backend for real-time sign language (DGS) ↔ speech translation with ML models.

## Features

- 🤟 **Sign Language Recognition**: Video-based DGS gesture recognition using custom trained models
- 🗣️ **Speech-to-Text**: Multi-language speech recognition using Whisper
- 🔊 **Text-to-Speech**: Multi-language speech synthesis
- 🌍 **Translation**: Text translation between German, Spanish, French, English, and Arabic
- 🎭 **Avatar Animation**: 3D avatar animation generation for sign language output
- 📡 **REST API**: Clean REST API with automatic documentation

## Tech Stack

- **Framework**: FastAPI
- **Speech Recognition**: OpenAI Whisper / Faster-Whisper
- **Text-to-Speech**: gTTS / Coqui TTS
- **Translation**: Argos Translate / HuggingFace Transformers
- **Computer Vision**: OpenCV, MediaPipe
- **ML Framework**: TensorFlow / PyTorch
- **Server**: Uvicorn

## Prerequisites

- Python 3.9 or higher
- pip or conda for package management
- (Optional) CUDA for GPU acceleration
- (Optional) Redis for caching

## Installation

1. Create a virtual environment:
```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Create necessary directories:
```bash
mkdir -p models uploads avatar
```

## Running the Server

### Development Mode
```bash
python run.py
```

Or using uvicorn directly:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## API Endpoints

### Sign Language Recognition
```http
POST /api/v1/sign-to-text
Content-Type: application/json

{
  "video_frames": ["base64_frame1", "base64_frame2", ...],
  "sign_language": "DGS"
}
```

### Speech Recognition
```http
POST /api/v1/speech-to-text
Content-Type: application/json

{
  "audio_data": "base64_audio_data",
  "language": "de"
}
```

### Text-to-Speech
```http
POST /api/v1/text-to-speech
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "target_language": "en"
}
```

### Sign Language Animation
```http
POST /api/v1/text-to-sign
Content-Type: application/json

{
  "text": "Hallo, wie geht es dir?",
  "source_language": "de",
  "sign_language": "DGS"
}
```

### Translation
```http
POST /api/v1/translate
Content-Type: application/json

{
  "text": "Hello",
  "source_lang": "en",
  "target_lang": "de"
}
```

## Project Structure

```
backend/
├── app/
│   ├── api/              # API endpoints/routers
│   │   ├── sign_to_text.py
│   │   ├── speech_to_text.py
│   │   ├── text_to_speech.py
│   │   ├── text_to_sign.py
│   │   └── translation.py
│   ├── services/         # Business logic
│   │   ├── sign_recognition.py
│   │   ├── stt.py
│   │   ├── tts.py
│   │   ├── translator.py
│   │   └── avatar.py
│   ├── config.py         # Configuration
│   ├── models.py         # Pydantic models
│   └── main.py           # FastAPI app
├── models/               # ML model files
├── avatar/               # 3D avatar assets
├── uploads/              # Temporary uploads
├── requirements.txt      # Dependencies
├── run.py               # Startup script
└── README.md
```

## Model Integration

### Sign Language Recognition Model

Place your trained DGS recognition model in `models/` directory:
```bash
# TensorFlow/Keras model
models/sign_language_model.h5

# Or PyTorch model
models/sign_language_model.pth
```

Update the model loading in `app/services/sign_recognition.py`.

### Whisper Model

The Whisper model will be downloaded automatically on first use. Configure the model size in `.env`:
```
WHISPER_MODEL_SIZE=base  # Options: tiny, base, small, medium, large
```

### Translation Models

For offline translation with HuggingFace models:
```python
# Models will download automatically from HuggingFace Hub
# Cache location: ~/.cache/huggingface/
```

For Argos Translate:
```bash
# Install language packages
python -c "import argostranslate.package; argostranslate.package.update_package_index()"
```

## Configuration

Edit `.env` file:

```bash
# Application
DEBUG=True
HOST=0.0.0.0
PORT=8000

# CORS (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081

# Models
SIGN_LANGUAGE_MODEL_PATH=./models/sign_language_model.h5
WHISPER_MODEL_SIZE=base

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t sign-language-api .

# Run container
docker run -p 8000:8000 -v $(pwd)/models:/app/models sign-language-api
```

Or use Docker Compose:

```bash
docker-compose up
```

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
```

### Linting
```bash
flake8 app/
```

## Performance Optimization

### Model Optimization
- Convert models to ONNX format for faster inference
- Use TensorRT for NVIDIA GPUs
- Quantize models (INT8) for CPU deployment

### Caching
- Enable Redis caching for common translations
- Cache avatar animations for frequent phrases

### Scaling
- Use multiple Uvicorn workers: `--workers 4`
- Deploy behind Nginx reverse proxy
- Use load balancing for multiple instances

## Troubleshooting

### Model Loading Issues
```bash
# Check model path
ls -la models/

# Verify model format
python -c "import tensorflow as tf; tf.keras.models.load_model('models/sign_language_model.h5')"
```

### Memory Issues
- Reduce Whisper model size (use 'tiny' or 'base')
- Limit concurrent requests
- Enable model quantization

### Import Errors
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

## Contributing

When adding new features:
1. Add service in `app/services/`
2. Create API endpoint in `app/api/`
3. Update `app/main.py` to include new router
4. Add tests in `tests/`
5. Update documentation

## License

Copyright © 2025 - Sign Language Translator

## Support

For issues and questions:
- Check the `/docs` endpoint for API documentation
- Review service logs for error details
- Ensure all dependencies are correctly installed

