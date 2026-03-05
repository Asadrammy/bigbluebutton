# Phase 2 Translator Progress & Remaining Work

_Last updated: 2026-02-17_

## 1. Context
- **Objective:** Build end-to-end translator experiences (Sign→Text, Speech→Sign, Text↔Text) for the TIM-AI web dashboard, reusing media capture components and ensuring parity with the mobile experience.
- **Scope covered:** Frontend API integration, auth-aware dashboard routing, translator UI flows, shared webcam/audio/avatar components, history persistence calls, and UX polish (status badges, capture summaries, clearer error states).

## 2. What We Implemented
### 2.1 Shared Infrastructure & State
| Area | Details |
| --- | --- |
| API layer | `src/lib/api` now exposes typed clients for auth, translation, and history (axios-based, token aware). |
| Auth context | `AuthProvider` handles login/signup, token storage, refresh (where supported), and guards dashboard routes. |
| User defaults hook | `useUserSettings` hydrates translator defaults (spoken/sign languages) and exposes setters for persistence (pending backend endpoints). |
| Dashboard layout | `(dashboard)/layout.tsx` enforces auth, renders sidebar/top bar, and provides consistent theming. |

### 2.2 Translator Components
| Component | Key Implementation |
| --- | --- |
| `WebcamCapture` | MediaStream wrapper batching frames locally, respecting configurable interval/frame caps, surfacing permission errors, new `onRecordingChange` callback so parent screens can lock inputs and update status banners. |
| `AudioRecorder` | Microphone capture using MediaRecorder, base64 encoding, shared error handling, `onRecordingChange` support, auto-cleanup of media tracks. |
| `AvatarViewer` | `react-three-fiber` scene that consumes keyframe animation payloads, exposes playback controls, speed adjustments, and placeholder rendering when no animation is present. |

### 2.3 Sign → Text Page (`(dashboard)/translator/sign-to-text`)
- Applies user defaults (sign language) on initial render.
- Streams frames from `WebcamCapture`, posts to `/sign-to-text`, renders transcript + confidence.
- Persists successful/error attempts via `saveHistory` when auth tokens exist.
- New UX polish: status chip (“Recording…/Processing/Ready”), capture summary line (frame count + timestamps or error text), disabled language selector while recording, inline error panel.

### 2.4 Speech → Sign Page (`(dashboard)/translator/speech-to-sign`)
- Applies both spoken + sign defaults from settings.
- Records audio, calls `/speech-to-text`, then pipes transcript into `/text-to-sign` to fetch avatar animation.
- Saves history on success/error.
- UX polish: recording/processing indicators, word-count summaries, auto-clear of previous transcript + avatar payload, buttons to reveal raw animation JSON and clear preview, AvatarViewer renders latest animation.

### 2.5 Text ↔ Text Page (`(dashboard)/translator/text`)
- Language defaults from settings, swap button, copy/clear helpers.
- Calls `/translate` with validation and history persistence.
- Inline error block for last failure, char counters for both panes.

### 2.6 Backend & Mobile Touchpoints
| Area | Implementation |
| --- | --- |
| Backend config | Added Hetzner + frontend URL env variables and multi-model paths in `app/config.py`, `.env`, `env.example`. |
| Database | Created `sign_languages` + `sign_language_models` tables and Alembic migration (`787ee3d4b76c`). |
| Mobile | Fixed lint/type imports, ensured sign language selection flows through API service and SignToSpeech screen after defaults were added to settings UI. |

## 3. Remaining Work / Gaps
### 3.1 Frontend Translator Enhancements (Phase 2 follow-ups)
1. **History surfacing inside translator pages**
   - Mini history list or “last 5 translations” cards per mode.
   - Ability to retry from history entry.
2. **User settings persistence**
   - Backend endpoint for translator defaults; hook `useUserSettings` setters to save changes (currently read-only).
3. **Error UI depth**
   - Map backend error codes to friendlier copy and “retry” suggestions.
   - Add per-field validation states on dropdowns (e.g., unsupported language pairs).
4. **Offline / permission states**
   - Dedicated empty states when webcam/mic blocked, with CTA to open browser settings.
5. **Accessibility & localization**
   - Keyboard shortcuts for recording toggles.
   - Translate UI chrome (labels, toasts) using i18n library targeted for Phase 3.

### 3.2 Backend Alignment
- **Translator defaults API**: CRUD endpoints tied to the new sign language tables.
- **Avatar payload validation**: Schema contract for `/text-to-sign` responses (currently inferred).
- **Metrics endpoints**: Dashboard home references stats; ensure backend aggregate endpoints are populated.

### 3.3 Testing & QA
- **Unit/integration tests** for hooks (`useUserSettings`), API layer, and translator flows (mocking media APIs).
- **E2E tests** (Playwright/Cypress) simulating full translator runs with mocked backend.
- **Performance profiling** for webcam/audio capture in throttled devices.

### 3.4 Deployment Prep
- Update docs on required browser permissions.
- Add feature flags/env toggles for enabling translator pages in staging vs production.
- Finalize Hetzner deployment scripts (Docker + CI) once backend endpoints stabilized.

## 4. Next Milestones
1. **Implement translator history side panel** with pagination + retry.
2. **Persist translator defaults** via new backend endpoints (both UI and API client work).
3. **Introduce structured error catalog** shared across web + mobile.
4. **Author comprehensive test suite** for translator components.
5. **Draft Phase 3 plan** (deployment readiness + monitoring).

---
_For any clarifications or to reprioritize the remaining items, let me know which area to tackle next._
