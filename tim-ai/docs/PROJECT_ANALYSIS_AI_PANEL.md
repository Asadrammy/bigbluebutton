# STEP 1: Project Analysis for AI Sign Panel Integration

## Full Project Tree (tim-ai-video-generator – backend relevant to sign.tim-ai.com)

```
tim-ai-video-generator/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── config.py             # Settings, CORS allowed_origins
│   │   ├── static/
│   │   │   └── ai-panel/        # AI panel HTML + JS
│   │   ├── api/                  # speech_to_text, text_to_sign, etc.
│   │   ├── auth/
│   │   ├── ml/, services/, utils/
│   │   └── ...
│   ├── run.py                    # Uvicorn entry script
│   └── ...
├── deploy/                       # nginx + systemd examples
├── docs/                         # BBB integration, deployment guide
└── ...
```

## Entry point, routers, auth, CORS, uvicorn

- **Entry:** `backend/app/main.py` → `app` (FastAPI). Uvicorn: `app.main:app`.
- **Routers:** Under `/api/v1/*`; `speech_to_text` and `text_to_sign` do not use auth.
- **Auth:** JWT via `app.auth.dependencies`; only selected routes use `get_current_user`.
- **CORS:** `allowed_origins` in config; `https://sign.tim-ai.com` added for production (no wildcard).
- **Uvicorn:** `run.py` or `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

See repo for full tree and API details.
