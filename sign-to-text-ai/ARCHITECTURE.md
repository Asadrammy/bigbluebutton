
# Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Application                        │
│                      (React Native - iOS/Android)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Home      │  │  Sign-to-    │  │  Speech-to-  │          │
│  │   Screen     │─▶│   Speech     │  │    Sign      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                           │                   │                  │
│                           ▼                   ▼                  │
│                    ┌──────────────────────────┐                 │
│                    │   API Service Layer      │                 │
│                    └──────────────────────────┘                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API Server                          │
│                     (FastAPI + Python)                          │
│                    │  (Axios, WebSocket)      │                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              API Layer (FastAPI Routes)               │       │
│  ├─────────┬─────────┬──────────┬──────────┬───────────┤       │
│  │ Sign-to-│Speech-to│ Text-to- │ Text-to- │Translation│       │
│  │  Text   │  Text   │  Speech  │   Sign   │           │       │
│  └────┬────┴────┬────┴─────┬────┴────┬─────┴─────┬─────┘       │
│       │         │          │         │           │              │
│       ▼         ▼          ▼         ▼           ▼              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │               Service Layer                           │       │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┤       │
│  │   Sign   │   STT    │   TTS    │  Avatar  │Translator│       │
│  │Recognition│ Service  │ Service  │ Service  │ Service  │       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘       │
│       │         │          │         │           │              │
│       ▼         ▼          ▼         ▼           ▼              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │               ML Models & Resources                   │       │
│  ├────────────┬──────────┬──────────┬─────────┬─────────┤       │
│  │ DGS Model  │ Whisper  │  gTTS    │ Avatar  │HuggingFace│     │
│  │(TF/PyTorch)│  Model   │Coqui TTS │3D Model │  Models  │      │
│  └────────────┴──────────┴──────────┴─────────┴─────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   File Cache     │
                    │  (Translations,  │
                    │   TTS Audio)     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Redis Cache    │
                    │  (Optional,      │
                    │   for distributed│
                    │   deployments)   │
                    └──────────────────┘
```

## Component Details

### Mobile Application Layer

#### Screens
- **HomeScreen**: Entry point with mode selection
- **SignToSpeechScreen**: Camera capture → Sign recognition → Speech output
- **SpeechToSignScreen**: Audio recording → Text → Avatar animation
- **SettingsScreen**: User preferences and configuration

#### Services
- **ApiService**: HTTP client for backend communication
- **MockDataService**: Testing with simulated responses

#### Navigation
- Stack-based navigation using React Navigation
- Type-safe navigation with TypeScript

### Backend API Layer

#### API Routes
Each route handles a specific translation direction:

1. **Sign-to-Text** (`/api/v1/sign-to-text`)
   - Input: Video frames (base64)
   - Output: Recognized text + confidence
   
2. **Speech-to-Text** (`/api/v1/speech-to-text`)
   - Input: Audio data (base64)
   - Output: Transcribed text + language
   
3. **Text-to-Speech** (`/api/v1/text-to-speech`)
   - Input: Text + target language
   - Output: Audio data (base64)
   
4. **Text-to-Sign** (`/api/v1/text-to-sign`)
   - Input: Text + source language
   - Output: Animation data or video URL
   
5. **Translation** (`/api/v1/translate`)
   - Input: Text + source/target languages
   - Output: Translated text

### Service Layer

#### Sign Recognition Service
```python
SignRecognitionService
├── Approach 1: MediaPipe + LSTM (Architecture-Compliant)
│   ├── MediaPipe: Hand/pose landmark detection
│   ├── Feature Extraction: Convert landmarks to features
│   ├── Model Inference: LSTM/Transformer for sequence classification
│   └── Post-processing: Convert gestures to German text
│
└── Approach 2: 3D CNN (Alternative, Faster)
    ├── Direct Frame Processing: Process video frames directly
    ├── 3D CNN Model: Spatiotemporal feature extraction
    └── Post-processing: Convert predictions to German text
```

**Pipeline (MediaPipe Approach - Default)**:
1. Decode video frames
2. Extract hand/body landmarks using MediaPipe Holistic
3. Normalize and prepare features (258-dim feature vector)
4. Feed landmark sequences to trained LSTM/Transformer model
5. Classify gesture sequences
6. Map to German vocabulary

**Pipeline (3D CNN Approach - Alternative)**:
1. Decode video frames
2. Preprocess frames (resize, normalize)
3. Feed directly to 3D CNN model
4. Classify gesture sequences
5. Map to German vocabulary

**Note**: The service automatically selects the best available approach. MediaPipe approach is preferred when available (architecture-compliant).

#### Speech-to-Text Service
```python
SpeechToTextService
├── Whisper Model: Multi-language ASR
├── Audio Preprocessing: Format conversion
└── Language Detection: Auto-detect or use hint
```

**Pipeline**:
1. Decode audio (base64 → bytes)
2. Convert to WAV if needed
3. Feed to Whisper model
4. Return transcription + detected language

#### Text-to-Speech Service
```python
TextToSpeechService
├── gTTS: Simple, cloud-based (Google)
└── Coqui TTS: Advanced, local synthesis
```

**Pipeline**:
1. Select voice for target language
2. Synthesize speech
3. Encode audio as base64
4. Return to client

#### Translation Service
```python
TranslationService
├── Argos Translate: Offline, open-source
└── HuggingFace Models: Helsinki-NLP MarianMT
```

**Pipeline**:
1. Check for direct translation model
2. If not available, pivot through English
3. Return translated text

#### Avatar Animation Service
```python
AvatarAnimationService
├── Animation Database: Pre-created sign animations
├── Word-to-Sign Mapping: German vocabulary → DGS
└── Animation Composition: Sequence builder
```

**Pipeline**:
1. Parse input text into words
2. Look up each word in animation database
3. For unknown words: fingerspell or skip
4. Concatenate animations
5. Export as keyframe data (JSON) or render video

## Data Flow

### Sign Language → Speech

```
User performs sign
      ↓
Camera captures frames (30 FPS)
      ↓
Batch frames (e.g., 30 frames = 1 second)
      ↓
Send to backend as base64 array
      ↓
MediaPipe extracts landmarks
      ↓
Model classifies gesture sequence
      ↓
Convert gesture IDs to German words
      ↓
Translate to target language (if needed)
      ↓
Synthesize speech (TTS)
      ↓
Return audio to app
      ↓
Play audio to user
```

### Speech → Sign Language

```
User speaks into microphone
      ↓
Record audio buffer
      ↓
Send to backend as base64
      ↓
Whisper transcribes to text
      ↓
Detect/confirm language
      ↓
Translate to German (if needed)
      ↓
Parse into words
      ↓
Look up DGS animations for each word
      ↓
Compose animation sequence
      ↓
Return animation data (keyframes)
      ↓
Render 3D avatar in app
      ↓
Display animation to user
```

## ML Models

### Sign Language Recognition

**Architecture Options** (All Supported):

1. **LSTM + MediaPipe** ✅ (Default, Architecture-Compliant):
   - MediaPipe Holistic for landmarks
   - LSTM/GRU for sequence classification
   - Input: Sequence of (pose + hands) landmarks (258-dim features)
   - Output: Gesture class
   - **Status**: Implemented and active when MediaPipe is available

2. **3D CNN** ✅ (Alternative, Faster):
   - Direct video frame processing
   - 3D CNN architecture (PyTorch)
   - Input: Video clip (frames)
   - Output: Gesture class
   - **Status**: Implemented as fallback/alternative

3. **Transformer** (Future Enhancement):
   - Self-attention on landmark sequences
   - Better for long-range dependencies
   - Input: Landmark sequences
   - Output: Gesture class
   - **Status**: Can be integrated using MediaPipe features

**Training Data**:
- DGS Corpus
- Custom collected dataset
- Data augmentation for robustness

### Speech Recognition

**Whisper Models**:
- `tiny`: 39M params, fast, less accurate
- `base`: 74M params, balanced
- `small`: 244M params, good quality
- `medium`: 769M params, better quality
- `large`: 1550M params, best quality

Choose based on hardware constraints.

### Translation

**Options**:
1. **Argos Translate**: Offline, free, good for basic use
2. **Helsinki-NLP**: Better quality, requires download
3. **NLLB (Meta)**: State-of-the-art, large models

### Avatar Animation

**Approaches**:

1. **Pre-rendered Videos**:
   - Pros: Realistic, simple playback
   - Cons: Limited vocabulary, large storage

2. **Keyframe Animation**:
   - Pros: Flexible, small data size
   - Cons: Requires 3D rendering

3. **Motion Capture**:
   - Pros: Most realistic
   - Cons: Expensive to create

## Performance Considerations

### Latency Targets

- **Sign Recognition**: < 2 seconds per gesture
- **Speech Recognition**: < 1 second for 5-second audio
- **Translation**: < 500ms
- **TTS**: < 1 second
- **Avatar Animation**: < 500ms generation

### Optimization Strategies

1. **Model Optimization**:
   - Quantization (INT8)
   - ONNX conversion
   - TensorRT on NVIDIA GPUs

2. **Caching**:
   - File-based cache for translations and TTS (default, works offline)
   - Redis cache (optional, for distributed deployments)
   - Pre-computed avatar animations
   - In-memory model cache (LRU)

3. **Batch Processing**:
   - Process multiple frames together
   - Batch translation requests

4. **Async Processing**:
   - WebSocket for streaming
   - Background tasks with Celery

## Scalability

### Horizontal Scaling
```
Load Balancer (Nginx)
      ↓
┌─────┴─────┬─────────┬─────────┐
│  API      │  API    │  API    │
│ Server 1  │ Server 2│ Server 3│
└─────┬─────┴─────┬───┴────┬────┘
      └───────────┴────────┘
              ↓
      ┌──────────────┐
      │ Redis Cluster│ (Optional)
      │ or File Cache │ (Default)
      └──────────────┘
```

**Note**: File-based caching is used by default (works offline, compatible with Expo Go). Redis is optional for distributed deployments requiring shared cache.

### Vertical Scaling
- GPU for model inference
- More RAM for larger models
- SSD for faster model loading

## Security

### API Security
- HTTPS/TLS encryption
- API key authentication (optional)
- Rate limiting per user/IP
- Input validation and sanitization

### Data Privacy
- No storage of user videos/audio
- Temporary files deleted after processing
- GDPR compliance considerations

### Model Security
- Model files protected (not publicly accessible)
- Version control for models
- Checksums to verify model integrity

## Implementation Status

### ✅ Implemented Features
- ✅ All 5 core API endpoints (Sign-to-Text, Speech-to-Text, Text-to-Speech, Text-to-Sign, Translation)
- ✅ MediaPipe landmark extraction (architecture-compliant)
- ✅ 3D CNN alternative approach
- ✅ WebSocket support for real-time streaming
- ✅ File-based caching (compatible with Expo Go)
- ✅ Authentication system with JWT
- ✅ Translation history tracking
- ✅ Model training endpoints

### 🔄 Current Implementation Details
- **Sign Recognition**: Supports both MediaPipe+LSTM and 3D CNN approaches
- **Caching**: File-based by default (works offline), Redis optional for distributed deployments
- **Mobile App**: React Native with Expo Go compatibility
- **Backend**: FastAPI with async support

## Future Enhancements

1. **Real-time Streaming**: WebRTC for low-latency video
2. **Offline Mode**: On-device models for mobile (Expo Go compatible)
3. **Multi-user Support**: ✅ User accounts and history (implemented)
4. **Continuous Recognition**: No manual start/stop
5. **Expanded Vocabulary**: More signs and gestures
6. **Emotion Recognition**: Facial expressions in avatar
7. **Context Awareness**: Better translation with context
8. **Transformer Model**: Full Transformer implementation for sign recognition

## Technology Alternatives

### Backend Framework
- **Current**: FastAPI
- **Alternatives**: Flask, Django, Express.js

### ML Framework
- **Current**: TensorFlow/PyTorch
- **Alternatives**: ONNX Runtime, TensorFlow Lite

### 3D Rendering
- **Current**: Three.js
- **Alternatives**: Babylon.js, Unity WebGL

### Mobile Framework
- **Current**: React Native
- **Alternatives**: Flutter, Native (Swift/Kotlin)

