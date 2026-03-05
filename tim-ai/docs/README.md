# Sign Language Translator

A comprehensive mobile and hardware solution for real-time sign language (DGS) ↔ speech translation across multiple languages.

## 🌟 Overview

This project enables seamless communication between sign language users and spoken language users through:

- **Sign Language Recognition**: Camera-based DGS gesture recognition with AI
- **Speech Translation**: Multi-language speech-to-text and text-to-speech
- **3D Avatar**: Realistic avatar displaying sign language gestures
- **Multi-platform**: Mobile app (iOS/Android) and hardware device (Raspberry Pi)

### Supported Languages

- **Spoken Languages**: German, Spanish, French, English, Arabic
- **Sign Languages**: Deutsche Gebärdensprache (DGS)

## 🎯 Features

### Mobile Application
- 📱 React Native app for iOS and Android
- 🤟 Sign language to speech conversion
- 🗣️ Speech to sign language with 3D avatar
- 🌍 Real-time translation between 5 languages
- ⚙️ Customizable settings and preferences
- 🎨 Modern, accessible UI with light theme

### Backend API
- 🚀 FastAPI-based REST API
- 🤖 ML-powered gesture recognition
- 🔊 Multi-language TTS/STT
- 🎭 3D avatar animation generation
- 📡 WebSocket support for real-time streaming

## 📁 Project Structure

```
Deaf-Person/
├── mobile-app/          # React Native mobile application
│   ├── src/
│   │   ├── screens/     # UI screens
│   │   ├── navigation/  # Navigation setup
│   │   ├── services/    # API services
│   │   ├── components/  # Reusable components
│   │   └── utils/       # Utilities and constants
│   ├── package.json
│   └── README.md
│
├── backend/             # Python FastAPI backend
│   ├── app/
│   │   ├── api/        # REST endpoints
│   │   ├── services/   # Business logic
│   │   ├── config.py   # Configuration
│   │   └── main.py     # FastAPI app
│   ├── models/         # ML model files
│   ├── avatar/         # 3D avatar assets
│   ├── requirements.txt
│   └── README.md
│
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- **Mobile App**:
  - Node.js >= 16
  - React Native development environment
  - iOS: Xcode + CocoaPods
  - Android: Android Studio + SDK

- **Backend**:
  - Python >= 3.9
  - pip or conda
  - (Optional) CUDA for GPU acceleration

### Installation

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp env.example .env
# Edit .env with your settings

# Run the server
python run.py
```

The API will be available at http://localhost:8000

#### 2. Mobile App Setup

```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install

# For iOS, install pods
cd ios && pod install && cd ..

# Configure backend URL in src/utils/constants.ts
# Update API_BASE_URL to your backend URL

# Run the app
npm run ios     # For iOS
npm run android # For Android
```

## 📱 Using the Mobile App

### Home Screen
- Choose between "Gebärdensprache" (Sign Language mode) or "Sprachübersetzung" (Speech Translation mode)
- Access settings via the gear icon

### Sign Language to Speech
1. Tap "Start Camera"
2. Perform DGS signs in front of the camera
3. App recognizes gestures and converts to text
4. Select output language
5. Tap play button to hear the translation

### Speech to Sign Language
1. Select input language
2. Tap microphone button to start recording
3. Speak your message
4. App displays text and shows 3D avatar performing DGS signs

## 🔧 Development

### Mobile App Development

```bash
cd mobile-app

# Start Metro bundler
npm start

# Run with live reload
npm run ios -- --simulator="iPhone 15"
npm run android

# Run tests
npm test

# Lint code
npm run lint
```

### Backend Development

```bash
cd backend

# Run with auto-reload
uvicorn app.main:app --reload

# Run tests
pytest

# Format code
black app/

# Lint
flake8 app/
```

## 🤖 ML Models

### Sign Language Recognition
Place your trained DGS recognition model in `backend/models/`:
- TensorFlow/Keras: `sign_language_model.h5`
- PyTorch: `sign_language_model.pth`

The model should:
- Accept video frame sequences
- Output recognized German text
- Provide confidence scores

### Integration Steps
1. Train your model on DGS dataset (MS-ASL, WLASL, DGS Corpus)
2. Export model in compatible format
3. Place in `backend/models/` directory
4. Update loading logic in `backend/app/services/sign_recognition.py`

## 🎨 3D Avatar

### Avatar Setup
1. Create or download a rigged 3D character (Mixamo, ReadyPlayerMe)
2. Export as glTF/glb format
3. Place in `backend/avatar/` directory
4. Create sign animations (keyframe data)
5. Map German words/phrases to animations

### Animation Format
```json
{
  "duration": 2.0,
  "keyframes": [
    {
      "time": 0.0,
      "bones": [
        {
          "name": "RightHand",
          "position": [0.3, 0.5, 0.0],
          "rotation": [0.0, 0.0, 0.0, 1.0],
          "scale": [1.0, 1.0, 1.0]
        }
      ]
    }
  ]
}
```

## 🐳 Docker Deployment

### Backend Only
```bash
cd backend
docker-compose up -d
```

### Full Stack (Backend + Redis)
```bash
cd backend
docker-compose up
```

Access API at http://localhost:8000/docs

## 📊 API Documentation

Once the backend is running, access interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/v1/sign-to-text` - Sign language recognition
- `POST /api/v1/speech-to-text` - Speech recognition
- `POST /api/v1/text-to-speech` - Speech synthesis
- `POST /api/v1/text-to-sign` - Avatar animation
- `POST /api/v1/translate` - Text translation

## 🔒 Security Notes

- Configure CORS in `.env` for production
- Use HTTPS in production
- Implement rate limiting
- Validate and sanitize all inputs
- Secure model files and API keys

## 🛠️ Troubleshooting

### Mobile App Issues
- **Metro bundler errors**: `npm start -- --reset-cache`
- **iOS build fails**: `cd ios && pod install && cd ..`
- **Android build fails**: `cd android && ./gradlew clean && cd ..`

### Backend Issues
- **Module import errors**: Check virtual environment is activated
- **Model loading fails**: Verify model path in `.env`
- **Port already in use**: Change PORT in `.env`

## 🗺️ Roadmap

### Phase 1: Mobile App Prototype (Current)
- ✅ Basic UI and navigation
- ✅ Mock data integration
- ✅ Backend API structure
- 🔄 Real API integration
- 🔄 ML model integration

### Phase 2: Full Implementation
- ⏳ Sign language recognition with trained model
- ⏳ 3D avatar with full DGS vocabulary
- ⏳ Camera and audio integration
- ⏳ Real-time processing optimization

### Phase 3: Hardware Version
- ⏳ Raspberry Pi 5 implementation
- ⏳ 4" round display integration
- ⏳ Camera module setup
- ⏳ Standalone device functionality

## 📄 License

Copyright © 2025 - Sign Language Translator

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions, issues, or contributions:
- Review the documentation in each subdirectory
- Check the API docs at `/docs`
- Create an issue for bugs or feature requests

---

**Note**: This project uses mock data for development and testing. Real ML models need to be trained and integrated for production use.

