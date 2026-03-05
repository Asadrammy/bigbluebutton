# TIM-AI Implementation Plan

## Overview

This document provides a phased, step-by-step implementation plan. Each phase has clear deliverables, file changes, and acceptance criteria. The plan is ordered by dependency — later phases build on earlier ones.

---

## Phase 0: Cleanup & Foundation (Week 1)

### 0.1 Remove Unused Frontend Code

The frontend is currently an AI SaaS starter template. Strip everything not relevant to the sign language system.

**Files/Folders to DELETE:**
```
frontend/src/app/(generator)/                  — AI text generator pages
frontend/src/app/api/chat/                     — OpenAI chat API route
frontend/src/components/generator/             — AI generator components
frontend/src/lib/ai/                           — OpenAI model + prompts
frontend/src/components/sections/benefits-grid.tsx      — Generic SaaS benefits
frontend/src/components/sections/client-testimonial.tsx — Generic testimonials
frontend/src/components/sections/faq-accordion.tsx      — Generic FAQ
frontend/src/components/sections/hero-logos.tsx          — Generic partner logos
frontend/src/components/sections/tools-tab.tsx           — Generic AI tools showcase
frontend/src/components/sections/pricing/               — Stripe pricing (remove for now)
frontend/src/components/sections/hero-section/          — Replace with sign-language hero
frontend/src/components/sections/core-features/         — Replace with sign-language features
frontend/ai-starter-kit.png                             — Template screenshot
frontend/LICENSE                                        — Template license
```

**npm Dependencies to REMOVE:**
```
@ai-sdk/openai
@ai-sdk/react
ai
openai
```

**npm Dependencies to ADD:**
```
axios                  — HTTP client (match mobile app pattern)
three                  — 3D avatar rendering
@react-three/fiber     — React Three.js bindings
@react-three/drei      — Three.js helpers
zustand                — Lightweight state management (or use React Context)
```

**Files to UPDATE:**
- `frontend/src/app/(site)/page.tsx` — Replace generic sections with sign-language landing
- `frontend/src/app/layout.tsx` — Update metadata (title, description)
- `frontend/src/components/layout/header/header.tsx` — Update nav links
- `frontend/src/components/layout/footer.tsx` — Update footer content
- `frontend/.env.example` — Remove OPENAI_API_KEY, add NEXT_PUBLIC_API_URL
- `frontend/package.json` — Remove unused deps, add new ones

### 0.2 Update Backend Enums & Models

**File: `backend/app/models.py`**
```python
# UPDATE SignLanguage enum:
class SignLanguage(str, Enum):
    DGS = "DGS"   # Deutsche Gebärdensprache (Germany)
    ASL = "ASL"   # American Sign Language (USA/Canada)
    BSL = "BSL"   # British Sign Language (UK)
    LSF = "LSF"   # Langue des Signes Française (France)
    LIS = "LIS"   # Lingua dei Segni Italiana (Italy)
    LSE = "LSE"   # Lengua de Signos Española (Spain)
    NGT = "NGT"   # Nederlandse Gebarentaal (Netherlands)
    OGS = "OGS"   # Österreichische Gebärdensprache (Austria)
    SSL = "SSL"   # Svenskt teckenspråk (Sweden)
```

**File: `backend/app/db_models.py`**
- Add `sign_languages` table (registry of supported sign languages with metadata)
- Add `sign_language_models` table (maps sign language → model version)
- Update `sign_dictionary` to support multiple sign languages properly

**File: `backend/app/config.py`**
- Add `FRONTEND_URL` setting
- Add `HETZNER_*` production settings
- Ensure `database_url` defaults to SQLite for local dev

### 0.3 Align Backend .env for Local Dev

**File: `backend/.env`** — Ensure it uses SQLite for local development:
```
DATABASE_URL="sqlite+aiosqlite:///./sqlitedb.db"
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8081","http://localhost:19006"]
```

### 0.4 Run Migrations
```bash
cd backend
alembic revision --autogenerate -m "add multi sign language support"
alembic upgrade head
```

### Deliverables
- [ ] Frontend stripped of AI SaaS template code
- [ ] Backend enums support all sign languages
- [ ] Database schema updated with multi-language support
- [ ] Both services run locally without errors

---

## Phase 1: Web Frontend — Core Structure (Week 1–2)

### 1.1 Create API Service Layer

**New file: `frontend/src/lib/api/client.ts`**
- Axios instance configured with `NEXT_PUBLIC_API_URL`
- JWT token interceptor (read from cookie/localStorage)
- Error handling interceptor
- Mirror the mobile app's `services/api.ts` pattern

**New file: `frontend/src/lib/api/auth.ts`**
- `login()`, `register()`, `logout()`, `getCurrentUser()`, `forgotPassword()`, `resetPassword()`, `changePassword()`, `updateProfile()`
- Mirror mobile's `services/authService.ts`

**New file: `frontend/src/lib/api/translation.ts`**
- `signToText()`, `speechToText()`, `textToSpeech()`, `textToSign()`, `translate()`
- `uploadVideo()`, `uploadAudio()`
- Mirror mobile's `services/api.ts`

**New file: `frontend/src/lib/api/types.ts`**
- TypeScript interfaces matching backend Pydantic models
- Mirror mobile's `types/index.ts`

### 1.2 Auth Integration

**Update: `frontend/src/app/(site)/(auth)/signin/`**
- Wire to backend `/api/v1/auth/login`
- Store JWT token
- Redirect to dashboard on success

**Update: `frontend/src/app/(site)/(auth)/signup/`**
- Wire to backend `/api/v1/auth/register`
- Include sign language + spoken language preference fields

**Update: `frontend/src/app/(site)/(auth)/reset-password/`**
- Wire to backend `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password`

### 1.3 Create Dashboard Layout

**New: `frontend/src/app/(dashboard)/layout.tsx`**
- Sidebar navigation (Translator, Dictionary, History, Settings, Profile)
- Top bar (user info, logout)
- Responsive (collapsible sidebar on mobile)

**New: `frontend/src/app/(dashboard)/page.tsx`**
- Dashboard home: quick-access cards for Sign→Text and Speech→Sign
- Recent translations summary
- Language selector

### Deliverables
- [ ] API service layer complete (auth + translation + types)
- [ ] Auth pages wired to backend
- [ ] Dashboard layout with sidebar navigation
- [ ] Protected routes (redirect to login if not authenticated)

---

## Phase 2: Web Frontend — Translation Features (Week 2–3)

### 2.1 Sign Language → Text Page

**New: `frontend/src/app/(dashboard)/translator/sign-to-text/page.tsx`**
- Webcam capture using `navigator.mediaDevices.getUserMedia()`
- Frame extraction at configured FPS
- Send frames to backend `/api/v1/videos/upload-and-process` or `/api/v1/sign-to-text`
- Display recognized text with confidence
- Language selector (sign language input, spoken language output)
- Play TTS audio of result

**New: `frontend/src/components/webcam-capture.tsx`**
- Reusable webcam component
- Start/stop recording
- Frame extraction logic
- Preview window

### 2.2 Speech → Sign Language Page

**New: `frontend/src/app/(dashboard)/translator/speech-to-sign/page.tsx`**
- Microphone recording using Web Audio API
- Send audio to backend `/api/v1/speech-to-text`
- Display transcribed text
- Request avatar animation from `/api/v1/text-to-sign`
- Render 3D avatar playing sign animation

**New: `frontend/src/components/audio-recorder.tsx`**
- Reusable microphone recording component
- Start/stop/pause controls
- Audio visualization (waveform)
- Export as base64

### 2.3 3D Avatar Viewer

**New: `frontend/src/components/avatar-viewer.tsx`**
- Three.js canvas component
- Load glTF/glb avatar model
- Play keyframe animations from backend
- Camera controls (orbit, zoom)
- Playback controls (play, pause, speed)

### 2.4 Text Translation Page

**New: `frontend/src/app/(dashboard)/translator/text/page.tsx`**
- Simple text input/output translation
- Source/target language selectors
- Call `/api/v1/translate`
- Copy result to clipboard

### Deliverables
- [ ] Sign-to-text page with webcam capture
- [ ] Speech-to-sign page with audio recording + avatar
- [ ] 3D avatar viewer component working
- [ ] Text translation page
- [ ] All pages connected to backend API

---

## Phase 3: Web Frontend — Supporting Pages (Week 3–4)

### 3.1 Dictionary Page

**New: `frontend/src/app/(dashboard)/dictionary/page.tsx`**
- Browse sign language dictionary
- Filter by sign language (DGS, ASL, etc.)
- Filter by category (greetings, numbers, etc.)
- Search by word
- Show animation preview for each sign

### 3.2 History Page

**New: `frontend/src/app/(dashboard)/history/page.tsx`**
- List of past translations
- Filter by type (sign→text, speech→sign, text translation)
- Filter by date
- Delete entries
- Replay translation

### 3.3 Settings & Profile Pages

**New: `frontend/src/app/(dashboard)/settings/page.tsx`**
- Preferred spoken language
- Preferred sign language
- Video quality settings
- Audio quality settings
- Theme selection

**New: `frontend/src/app/(dashboard)/profile/page.tsx`**
- View/edit profile (name, email, username)
- Change password
- Delete account

### 3.4 Landing Page Redesign

**Update: `frontend/src/app/(site)/page.tsx`**
- Hero section: Sign language translation system tagline + demo video
- Features section: Sign→Speech, Speech→Sign, Multi-language, Avatar
- Supported languages grid
- CTA to sign up / try demo
- About section

### Deliverables
- [ ] Dictionary page with search and filtering
- [ ] History page with filtering
- [ ] Settings and profile pages
- [ ] Landing page redesigned for sign language system

---

## Phase 4: Backend — Multi-Language Sign Recognition (Week 3–5)

### 4.1 Multi-Model Architecture

**Update: `backend/app/services/sign_recognition.py`**
- Support loading different models per sign language
- Model registry: `{ "DGS": "models/dgs/best_model.pth", "ASL": "models/asl/best_model.pth", ... }`
- Lazy loading: load model on first request for that language

**Update: `backend/app/ml/inference.py`**
- Support multiple model instances (one per sign language)
- Model selection based on request sign_language parameter

**Update: `backend/app/services/model_loader.py`**
- Per-language model loading
- Model version management

### 4.2 Dataset Strategy

**New: `backend/data/README.md`** — Dataset sourcing guide

For each sign language, we need:
1. **DGS**: DGS Corpus, SIGNUM dataset, custom collection
2. **ASL**: WLASL, MS-ASL, ASL-LEX datasets
3. **BSL**: BSL Corpus, BOBSL dataset
4. **LSF**: Dicta-Sign-LSF, custom
5. **Other European**: Research datasets + custom collection

### 4.3 Training Pipeline Updates

**Update: `backend/app/ml/train.py`** and **`backend/app/ml/trainer.py`**
- Support training for any sign language (parameterized by sign_language code)
- Dataset configuration per language
- Model output directory per language: `models/{sign_language_code}/`

### 4.4 Avatar Animation Database

**Update: `backend/app/services/avatar.py`**
- Per-sign-language animation database
- Lookup: `(word, sign_language) → animation_data`
- Fingerspelling fallback per sign language
- Animation composition (sequence multiple signs)

### Deliverables
- [ ] Multi-model inference working (at least DGS + ASL)
- [ ] Training pipeline supports per-language training
- [ ] Avatar animations per sign language
- [ ] Dataset sourcing strategy documented

---

## Phase 5: Mobile App Updates (Week 4–5)

### 5.1 Multi-Language Support

**Update: `mobile-app/src/types/index.ts`**
- Expand `SignLanguage` type to include all European languages

**Update: `mobile-app/src/screens/SettingsScreen.tsx`**
- Sign language picker with all supported languages
- Group by region (German, American, European)

**Update: `mobile-app/src/screens/SignToSpeechScreen.tsx`**
- Pass selected sign language to API calls
- Display recognized text with correct language

**Update: `mobile-app/src/screens/SpeechToSignScreen.tsx`**
- Target sign language selection
- Request correct sign language animations

### 5.2 Sync with Backend Changes

- Ensure all API calls match updated backend endpoints
- Handle new response fields
- Test full flow: mobile → backend → response

### Deliverables
- [ ] Mobile app supports all sign language selections
- [ ] API calls updated for multi-language
- [ ] Full translation flow tested (DGS + ASL minimum)

---

## Phase 6: Deployment — Hetzner (Week 5–6)

### 6.1 Docker Configuration

**Update: `backend/docker-compose.prod.yml`**
- PostgreSQL container
- Redis container
- FastAPI container (with GPU support if available)
- Next.js container
- Nginx container (reverse proxy + SSL)
- Shared volumes for ML models

**New: `frontend/Dockerfile`**
- Multi-stage build (build Next.js → serve with Node)

**New: `nginx/nginx.conf`**
- SSL termination
- Proxy pass to FastAPI and Next.js
- Static file caching
- Rate limiting

### 6.2 Server Setup

1. Provision Hetzner server (dedicated or cloud, with GPU if budget allows)
2. Install Docker + Docker Compose
3. Configure firewall (80, 443 only)
4. Set up domain DNS → Hetzner IP
5. Obtain SSL cert with Certbot
6. Deploy with `docker-compose -f docker-compose.prod.yml up -d`

### 6.3 CI/CD (Optional)

- GitHub Actions → SSH deploy to Hetzner on push to `main`
- Or manual deploy via `git pull` + `docker-compose up --build`

### Deliverables
- [ ] All services containerized
- [ ] Nginx configured with SSL
- [ ] Deployed and accessible on Hetzner
- [ ] Health checks passing

---

## Phase 7: ML Model Training (Ongoing, Week 4+)

### 7.1 DGS Model (Priority 1)
1. Source DGS dataset (DGS Corpus, SIGNUM, or custom)
2. Preprocess: extract frames, normalize, augment
3. Train 3D CNN / LSTM model
4. Evaluate: accuracy, F1, confusion matrix
5. Deploy model to `models/dgs/`

### 7.2 ASL Model (Priority 2)
1. Source ASL dataset (WLASL-2000, MS-ASL)
2. Same training pipeline
3. Deploy to `models/asl/`

### 7.3 European Sign Languages (Priority 3)
- Per-language: source data → train → evaluate → deploy
- Start with BSL (most data available), then LSF, LIS, LSE

### Deliverables
- [ ] DGS model trained and deployed
- [ ] ASL model trained and deployed
- [ ] At least 2 additional European languages started

---

## Phase 8: Polish & QA (Week 6–7)

### 8.1 Web Frontend Polish
- Responsive design testing (mobile, tablet, desktop)
- Accessibility (ARIA labels, keyboard navigation, screen reader)
- Error states and loading skeletons
- Toast notifications for all operations
- Consistent dark/light theme

### 8.2 End-to-End Testing
- Auth flow: register → login → use features → logout
- Sign→Text: camera → frames → recognition → text display
- Speech→Sign: audio → transcription → avatar animation
- Translation: text → translated text
- History: operations logged and viewable
- Settings: preferences persist

### 8.3 Performance Optimization
- Image/video compression before upload
- Lazy loading for heavy components (Three.js, webcam)
- API response caching where appropriate
- Bundle size optimization (tree-shaking unused deps)

### 8.4 Documentation
- Update `docs/README.md` with current project state
- Update `docs/SETUP.md` with local dev and deployment instructions
- API documentation via FastAPI `/docs` endpoint
- User guide for web and mobile apps

### Deliverables
- [ ] All features working end-to-end
- [ ] Responsive and accessible web UI
- [ ] Performance within targets
- [ ] Documentation updated

---

## File Change Summary

### Files to DELETE (Frontend)
| Path | Reason |
|------|--------|
| `src/app/(generator)/*` | AI text generator — not relevant |
| `src/app/api/chat/*` | OpenAI chat route — not relevant |
| `src/components/generator/*` | AI generator components — not relevant |
| `src/lib/ai/*` | OpenAI model config — not relevant |
| `src/components/sections/benefits-grid.tsx` | Generic SaaS content |
| `src/components/sections/client-testimonial.tsx` | Generic SaaS content |
| `src/components/sections/faq-accordion.tsx` | Generic SaaS content |
| `src/components/sections/hero-logos.tsx` | Generic SaaS content |
| `src/components/sections/tools-tab.tsx` | Generic SaaS content |
| `src/components/sections/pricing/*` | Stripe billing — not needed now |
| `src/components/sections/hero-section/*` | Replace with custom |
| `src/components/sections/core-features/*` | Replace with custom |
| `ai-starter-kit.png` | Template image |
| `LICENSE` | Template license |

### Files to CREATE (Frontend)
| Path | Purpose |
|------|---------|
| `src/lib/api/client.ts` | Axios API client |
| `src/lib/api/auth.ts` | Auth API functions |
| `src/lib/api/translation.ts` | Translation API functions |
| `src/lib/api/types.ts` | TypeScript interfaces |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout |
| `src/app/(dashboard)/page.tsx` | Dashboard home |
| `src/app/(dashboard)/translator/sign-to-text/page.tsx` | Sign→Text |
| `src/app/(dashboard)/translator/speech-to-sign/page.tsx` | Speech→Sign |
| `src/app/(dashboard)/translator/text/page.tsx` | Text translation |
| `src/app/(dashboard)/dictionary/page.tsx` | Dictionary |
| `src/app/(dashboard)/history/page.tsx` | History |
| `src/app/(dashboard)/settings/page.tsx` | Settings |
| `src/app/(dashboard)/profile/page.tsx` | Profile |
| `src/components/webcam-capture.tsx` | Webcam component |
| `src/components/audio-recorder.tsx` | Audio recorder |
| `src/components/avatar-viewer.tsx` | 3D avatar viewer |
| `src/components/sign-language-selector.tsx` | Language picker |
| `src/components/dashboard/sidebar.tsx` | Dashboard sidebar |
| `src/components/dashboard/topbar.tsx` | Dashboard top bar |

### Files to UPDATE (Backend)
| Path | Change |
|------|--------|
| `app/models.py` | Expand SignLanguage enum |
| `app/db_models.py` | Add sign_languages, sign_language_models tables |
| `app/services/sign_recognition.py` | Multi-model support |
| `app/services/avatar.py` | Per-language animations |
| `app/ml/inference.py` | Multi-model inference |
| `app/config.py` | Add FRONTEND_URL, Hetzner settings |
| `docker-compose.prod.yml` | Add Next.js, Nginx containers |

### Files to UPDATE (Mobile)
| Path | Change |
|------|--------|
| `src/types/index.ts` | Expand SignLanguage type |
| `src/screens/SettingsScreen.tsx` | All sign language options |
| `src/screens/SignToSpeechScreen.tsx` | Pass sign language param |
| `src/screens/SpeechToSignScreen.tsx` | Target sign language selection |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| DGS dataset scarcity | High — core feature | Use DGS Corpus + custom data collection + transfer learning from ASL |
| European sign language data | Medium | Start with languages that have public datasets (BSL, LSF) |
| GPU not available on Hetzner | Medium — slow inference | Use CPU-optimized models (ONNX, quantized). Consider Hetzner GPU servers |
| Three.js avatar complexity | Medium | Start with simple avatar, iterate. Use ReadyPlayerMe for quick prototyping |
| Real-time streaming latency | Medium | Use WebSocket + frame batching. Optimize model inference time |
| GDPR compliance gaps | High — legal | Implement data deletion, consent flows, privacy policy early |

---

## Timeline Summary

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Phase 0 + Phase 1 start | Cleanup, foundation, API layer |
| 2 | Phase 1 + Phase 2 start | Auth, dashboard, translator pages |
| 3 | Phase 2 + Phase 3 | Translation features, supporting pages |
| 4 | Phase 4 + Phase 5 | Multi-language backend, mobile updates |
| 5 | Phase 5 + Phase 6 | Mobile completion, Hetzner deployment |
| 6 | Phase 6 + Phase 8 | Deployment finalization, QA |
| 7+ | Phase 7 (ongoing) | ML model training, expanding languages |
