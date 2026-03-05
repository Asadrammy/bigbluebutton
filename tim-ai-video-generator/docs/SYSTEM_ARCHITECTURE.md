# TIM-AI System Architecture

## 1. Project Overview

**TIM-AI** is a multi-platform (web + mobile + server) system for real-time **sign language ↔ spoken language** translation. The client is a German startup (Ulrich Baumann, Grömitz, Germany) building an app-and-web-based system hosted on **Hetzner** servers in Germany.

### Scope
- **Sign Languages Supported**: German Sign Language (DGS), American Sign Language (ASL), and all European sign languages (BSL, LSF, LIS, LSE, NGT, ÖGS, SSL, etc.)
- **Spoken Languages**: German, English, Spanish, French, Arabic (and expandable)
- **Platforms**: Web (Next.js), Mobile (React Native), Backend API (FastAPI)
- **Hosting**: Hetzner dedicated server (Germany) — self-hosted, not cloud PaaS
- **ML/AI**: Custom-trained sign language recognition models, avatar animation, STT, TTS, translation

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│                                                                         │
│  ┌──────────────────────┐          ┌──────────────────────────┐        │
│  │   Web Application    │          │   Mobile Application     │        │
│  │   (Next.js 15)       │          │   (React Native/Expo)    │        │
│  │                      │          │                          │        │
│  │  • Landing/Marketing │          │  • Sign→Speech Screen    │        │
│  │  • Dashboard         │          │  • Speech→Sign Screen    │        │
│  │  • Sign Translator   │          │  • Dictionary            │        │
│  │  • Avatar Viewer     │          │  • History               │        │
│  │  • User Auth         │          │  • Settings/Profile      │        │
│  │  • Admin Panel       │          │  • Auth (Login/Register) │        │
│  └──────────┬───────────┘          └───────────┬──────────────┘        │
│             │                                   │                       │
│             └───────────────┬───────────────────┘                       │
│                             │ HTTPS / WSS                               │
└─────────────────────────────┼───────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API LAYER                                │
│                      (FastAPI + Python 3.11+)                           │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    API Gateway / Routes                         │    │
│  │  /api/v1/auth/*        – Authentication (JWT)                  │    │
│  │  /api/v1/sign-to-text  – Sign language recognition             │    │
│  │  /api/v1/speech-to-text– Speech recognition (Whisper)          │    │
│  │  /api/v1/text-to-speech– Speech synthesis (gTTS/Coqui)         │    │
│  │  /api/v1/text-to-sign  – Avatar animation generation           │    │
│  │  /api/v1/translate     – Text translation                      │    │
│  │  /api/v1/videos/*      – Video upload & processing             │    │
│  │  /api/v1/audio/*       – Audio upload & processing             │    │
│  │  /api/v1/datasets/*    – ML dataset management                 │    │
│  │  /api/v1/training/*    – ML training job management            │    │
│  │  /api/v1/history/*     – Translation history                   │    │
│  │  /api/v1/dictionary/*  – Sign language dictionary              │    │
│  │  /ws/*                 – WebSocket real-time streams            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     SERVICE LAYER                               │    │
│  │  SignRecognitionService  – ML model inference per sign lang     │    │
│  │  STTService              – Whisper-based speech-to-text         │    │
│  │  TTSService              – gTTS / Coqui text-to-speech          │    │
│  │  TranslationService      – Argos / HuggingFace translation      │    │
│  │  AvatarService           – 3D avatar animation generation       │    │
│  │  VideoProcessorService   – Video frame extraction               │    │
│  │  StorageService          – File storage management              │    │
│  │  DatasetManagerService   – ML dataset CRUD                      │    │
│  │  ModelLoaderService      – ML model loading & version mgmt      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   ML / AI LAYER                                 │    │
│  │  • Sign Recognition Models (per language: DGS, ASL, BSL, etc.) │    │
│  │  • Whisper STT (multi-language)                                 │    │
│  │  • Translation Models (Argos / MarianMT / NLLB)                │    │
│  │  • Avatar Animation Engine (keyframe / video)                   │    │
│  │  • Training Pipeline (data loader → augmentation → trainer)     │    │
│  │  • Inference Pipeline (preprocess → model → postprocess)        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└──────────┬──────────────────────────────────────────┬───────────────────┘
           │                                          │
           ▼                                          ▼
┌─────────────────────┐               ┌──────────────────────────┐
│   PostgreSQL DB     │               │   Redis Cache            │
│   (User accounts,   │               │   (Translation cache,    │
│    history, models,  │               │    session data,          │
│    datasets, etc.)   │               │    audio cache)           │
└─────────────────────┘               └──────────────────────────┘
```

---

## 3. Technology Stack

### Backend
| Component          | Technology                          | Purpose                              |
|--------------------|-------------------------------------|--------------------------------------|
| Framework          | FastAPI (Python 3.11+)              | REST API + WebSocket                 |
| Server             | Uvicorn                             | ASGI server                          |
| Database           | PostgreSQL + SQLAlchemy (async)     | Persistent storage                   |
| Migrations         | Alembic                             | Database schema management           |
| Cache              | Redis                               | Translation/audio caching            |
| Auth               | JWT (python-jose + passlib)         | Token-based authentication           |
| STT                | OpenAI Whisper / Faster-Whisper     | Speech recognition                   |
| TTS                | gTTS / Coqui TTS                    | Speech synthesis                     |
| Translation        | Argos Translate / MarianMT          | Text translation                     |
| ML Framework       | PyTorch                             | Sign language model training         |
| Computer Vision    | OpenCV                              | Video/frame processing               |
| Deployment         | Docker + Docker Compose             | Containerized deployment on Hetzner  |

### Frontend (Web)
| Component          | Technology                          | Purpose                              |
|--------------------|-------------------------------------|--------------------------------------|
| Framework          | Next.js 15 (App Router)             | Web application                      |
| Styling            | Tailwind CSS v4                     | UI styling                           |
| Auth               | NextAuth.js v5                      | Web authentication                   |
| State              | React Context + Server Components   | State management                     |
| 3D Rendering       | Three.js (to add)                   | Avatar animation playback            |
| API Client         | Fetch / Axios (to add)              | Backend communication                |

### Mobile
| Component          | Technology                          | Purpose                              |
|--------------------|-------------------------------------|--------------------------------------|
| Framework          | React Native + Expo                 | Cross-platform mobile app            |
| Navigation         | React Navigation                    | Screen navigation                    |
| State              | Redux Toolkit                       | Global state management              |
| Auth               | JWT via AuthContext                  | Authentication                       |
| Camera             | expo-camera                         | Video capture for sign recognition   |
| Audio              | expo-av                             | Audio recording/playback             |
| API Client         | Axios                               | Backend communication                |

### Infrastructure (Hetzner)
| Component          | Technology                          | Purpose                              |
|--------------------|-------------------------------------|--------------------------------------|
| Server             | Hetzner Dedicated/Cloud             | Hosting all services                 |
| Reverse Proxy      | Nginx                               | SSL termination, routing             |
| Containerization   | Docker + Docker Compose             | Service orchestration                |
| SSL                | Let's Encrypt (Certbot)             | HTTPS certificates                   |
| GPU (optional)     | NVIDIA GPU on server                | ML inference acceleration            |

---

## 4. Supported Sign Languages

### Phase 1 (MVP)
| Sign Language                | Code  | Region         |
|------------------------------|-------|----------------|
| Deutsche Gebärdensprache     | DGS   | Germany        |
| American Sign Language       | ASL   | USA/Canada     |

### Phase 2 (European Expansion)
| Sign Language                        | Code  | Region         |
|--------------------------------------|-------|----------------|
| British Sign Language                | BSL   | UK             |
| Langue des Signes Française          | LSF   | France         |
| Lingua dei Segni Italiana            | LIS   | Italy          |
| Lengua de Signos Española            | LSE   | Spain          |
| Nederlandse Gebarentaal              | NGT   | Netherlands    |
| Österreichische Gebärdensprache      | ÖGS   | Austria        |
| Svenskt teckenspråk                  | SSL   | Sweden         |

### Phase 3 (Full Coverage)
- All remaining European sign languages
- Additional spoken language support

---

## 5. Database Schema (Existing — to be updated)

### Core Tables
- `users` — User accounts with auth, preferences
- `user_settings` — Extended user preferences
- `translation_history` — Logs of all translations
- `sign_dictionary` — Sign language gesture database (per sign language)
- `cached_translations` — Translation cache entries
- `app_analytics` — Usage tracking
- `error_logs` — Error tracking

### ML Tables
- `training_datasets` — Dataset metadata
- `model_versions` — Trained model versions & metrics
- `training_jobs` — Training job tracking

### To Be Added
- `sign_languages` — Registry of supported sign languages with metadata
- `sign_language_models` — Per-language model registry (links sign language → model version)
- `avatar_animations` — Animation data per sign per sign language

---

## 6. Authentication Flow

```
┌──────────┐     POST /auth/register      ┌──────────┐
│  Client   │ ──────────────────────────▶  │  Backend  │
│ (Web/App) │                              │  FastAPI  │
│           │  ◀── { access_token,         │           │
│           │       refresh_token, user }   │           │
│           │                              │           │
│           │     POST /auth/login         │           │
│           │ ──────────────────────────▶  │           │
│           │  ◀── { access_token,         │           │
│           │       refresh_token, user }   │           │
│           │                              │           │
│           │     GET /auth/me             │           │
│           │  (Authorization: Bearer)     │           │
│           │ ──────────────────────────▶  │           │
│           │  ◀── { user profile }        │           │
└──────────┘                              └──────────┘
```

Both **web** and **mobile** share the same backend auth endpoints. Web uses NextAuth.js wrapping backend JWT tokens. Mobile uses Redux + AsyncStorage.

---

## 7. Core Translation Flows

### 7.1 Sign Language → Speech (Camera → Text → Audio)
```
1. User opens camera (mobile) or webcam (web)
2. Client captures video frames at 30 FPS
3. Frames batched (e.g., 16–30 frames per inference)
4. POST /api/v1/videos/upload-and-process  OR  POST /api/v1/sign-to-text
5. Backend:
   a. Decode frames
   b. Select model for sign language (DGS/ASL/BSL...)
   c. Run ML inference → recognized text (German/English/etc.)
   d. Optionally translate to target language
   e. Optionally generate speech (TTS)
6. Return: { text, language, confidence, audio_data? }
7. Client displays text and plays audio
```

### 7.2 Speech → Sign Language (Mic → Text → Avatar)
```
1. User speaks into microphone
2. Client records audio
3. POST /api/v1/speech-to-text (with audio_data base64)
4. Backend:
   a. Whisper transcribes audio → text
   b. Detect language
   c. Translate to target sign language's base language if needed
   d. Look up sign animations in dictionary
5. POST /api/v1/text-to-sign (with text + sign_language)
6. Backend:
   a. Parse text into words/phrases
   b. Map each to sign animation (keyframes or video)
   c. Compose animation sequence
7. Return: { animation_data, video_url? }
8. Client renders 3D avatar performing signs
```

### 7.3 Text Translation
```
1. User enters text
2. POST /api/v1/translate { text, source_lang, target_lang }
3. Backend: Argos/MarianMT translation
4. Return: { translated_text }
```

---

## 8. Frontend (Web) — Current State vs Target

### Current State (AI Starter Kit Template)
The frontend is a **generic AI SaaS template** (AIStarterKit OSS). It has:

**KEEP (with modifications)**:
- Next.js 15 App Router structure
- Tailwind CSS v4 styling
- Dark/light theme support (next-themes)
- Auth pages structure: `/signin`, `/signup`, `/reset-password`
- Layout components: Header, Footer
- Toast notifications (Sonner)

**REMOVE (not relevant to sign language system)**:
- AI chat/text generator (`src/app/(generator)/*`, `src/components/generator/*`)
- OpenAI integration (`src/lib/ai/*`, `src/app/api/chat/*`)
- AI SaaS pricing/billing (`src/components/sections/pricing/*`, Stripe refs)
- Generic SaaS sections: Benefits grid, testimonials, FAQ, tools tabs, hero (replace with sign-language-specific content)
- `@ai-sdk/*`, `openai` npm dependencies
- `.env.example` (OPENAI_API_KEY)

**ADD (new for sign language system)**:
- Dashboard page (sign language translator interface)
- Camera/Webcam capture component (for sign→text)
- Audio recorder component (for speech→sign)
- 3D Avatar viewer component (Three.js)
- Sign language dictionary browser
- Translation history page
- Settings/preferences page
- API service layer (calls to FastAPI backend)
- WebSocket connection for real-time streaming
- Sign language selector (DGS, ASL, European languages)
- Admin panel (dataset management, model management)

### Target Pages
```
src/app/
├── (site)/
│   ├── page.tsx                   — Landing page (sign language focused)
│   ├── (auth)/
│   │   ├── signin/                — Login
│   │   ├── signup/                — Register
│   │   └── reset-password/        — Password reset
│   ├── pricing/                   — Pricing plans
│   ├── about/                     — About the project
│   ├── contact/                   — Contact form
│   └── privacy/                   — Privacy policy
├── (dashboard)/
│   ├── layout.tsx                 — Dashboard layout (sidebar + header)
│   ├── page.tsx                   — Dashboard home
│   ├── translator/
│   │   ├── sign-to-text/          — Camera → Sign recognition
│   │   └── speech-to-sign/        — Audio → Avatar animation
│   ├── dictionary/                — Sign language dictionary
│   ├── history/                   — Translation history
│   ├── settings/                  — User settings
│   └── profile/                   — User profile
├── (admin)/
│   ├── datasets/                  — Manage ML datasets
│   ├── models/                    — Manage ML models
│   └── users/                     — User management
└── api/
    ├── auth/                      — NextAuth.js routes (wrapping backend)
    └── proxy/                     — Optional proxy to backend API
```

---

## 9. Mobile App — Current State vs Target

### Current State
The mobile app is **well-built** and closely matches requirements:

**KEEP (working)**:
- Full auth flow (Login, Register, Forgot Password, Change Password)
- SignToSpeechScreen (camera capture → sign recognition)
- SpeechToSignScreen (audio record → avatar)
- DictionaryScreen
- HistoryScreen
- SettingsScreen (with language/sign language selection)
- ProfileScreen
- API service layer (Axios, JWT auth)
- Redux store (auth state)
- Theming system

**UPDATE**:
- `SignLanguage` enum — currently only `DGS`, must add ASL + all European
- `Language` enum — add more spoken languages as needed
- API service — ensure all endpoints match backend
- Settings — add sign language selection for all supported languages
- Dictionary — per sign language filtering

**The mobile app is the reference implementation** — the web app should mirror its features.

---

## 10. Backend — Current State vs Target

### Current State
Backend is **comprehensive** with most core services in place:

**KEEP (working)**:
- All API routes (auth, sign-to-text, speech-to-text, TTS, text-to-sign, translation, videos, audio, datasets, training, history)
- Services: sign_recognition, stt, tts, translator, avatar, video_processor, storage, dataset_manager, model_loader
- ML pipeline: config, data_loader, augmentation, train, trainer, inference, metrics
- Database models (users, history, dictionary, analytics, ML tables)
- Auth system (JWT, password hashing, token refresh)
- Docker + Docker Compose configs
- Alembic migrations

**UPDATE**:
- `SignLanguage` enum in `models.py` — add ASL, BSL, LSF, LIS, LSE, NGT, ÖGS, SSL
- `Language` enum — potentially add more spoken languages
- `sign_recognition.py` — support per-sign-language model selection
- `model_loader.py` — load different models per sign language
- `avatar.py` — animation database per sign language
- `translator.py` — ensure all required language pairs work
- `config.py` — add Hetzner-specific production settings
- Database: add `sign_languages` table, update `sign_dictionary` for multi-language
- Docker configs — optimize for Hetzner deployment

---

## 11. Deployment Architecture (Hetzner)

```
┌──────────────────────────────────────────────────────────┐
│                    Hetzner Server                          │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │                    Nginx                           │    │
│  │  • SSL termination (Let's Encrypt)                │    │
│  │  • Reverse proxy                                  │    │
│  │  • Static file serving                            │    │
│  │  • api.domain.com → FastAPI :8000                 │    │
│  │  • app.domain.com → Next.js :3000                 │    │
│  └──────────────────────┬───────────────────────────┘    │
│                          │                                │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ FastAPI  │   │ Next.js  │   │  Redis   │            │
│  │ Backend  │   │ Frontend │   │  Cache   │            │
│  │  :8000   │   │  :3000   │   │  :6379   │            │
│  └────┬─────┘   └──────────┘   └──────────┘            │
│       │                                                   │
│  ┌────┴─────┐   ┌──────────────────────────┐            │
│  │PostgreSQL│   │   ML Models Volume       │            │
│  │  :5432   │   │  /opt/models/            │            │
│  └──────────┘   │  ├── dgs/                │            │
│                  │  ├── asl/                │            │
│                  │  ├── bsl/                │            │
│                  │  └── ...                 │            │
│                  └──────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

---

## 12. Security & Compliance

### GDPR Compliance (Required — German/EU)
- User data stored in Germany (Hetzner)
- Right to data deletion
- No long-term storage of user videos/audio (process and delete)
- Privacy policy required
- Cookie consent for web

### API Security
- HTTPS everywhere (Let's Encrypt)
- JWT tokens with refresh mechanism
- Rate limiting per user/IP
- Input validation (Pydantic models)
- CORS whitelist

### Data Privacy
- Temporary files deleted after processing
- User consent for translation history storage
- Encrypted passwords (bcrypt)
- Secure token storage

---

## 13. Performance Targets

| Operation              | Target Latency | Notes                                    |
|------------------------|----------------|------------------------------------------|
| Sign Recognition       | < 2s           | Per gesture sequence (16 frames)         |
| Speech-to-Text         | < 1s           | For 5-second audio clip                  |
| Text Translation       | < 500ms        | Cached translations near-instant         |
| Text-to-Speech         | < 1s           | For short sentences                      |
| Avatar Animation Gen   | < 500ms        | Keyframe lookup + composition            |
| API Response (general) | < 200ms        | Non-ML endpoints                         |

---

## 14. Key Design Decisions

1. **Multi-model architecture**: Each sign language gets its own trained ML model. A model registry maps sign language code → model file path → inference config.
2. **Shared backend for web + mobile**: Both platforms use the same FastAPI REST API. No platform-specific endpoints.
3. **Self-hosted on Hetzner**: No dependency on cloud ML services (AWS Sagemaker, GCP, etc.). Everything runs on-premise for data sovereignty.
4. **Datasets are developer responsibility**: Client expects the developer to source/create training datasets for DGS, ASL, and European sign languages.
5. **Avatar-based sign output**: Text→Sign uses 3D avatar animation, not video playback of real signers.
6. **Offline translation**: Argos Translate for text translation — no dependency on Google/DeepL APIs.
