# Merge request: AI Sign Translation panel for BBB integration

## Summary
Adds a standalone AI Sign Translation panel at `GET /ai-panel` for safe embedding inside BigBlueButton (or any iframe) without modifying BBB core files.

## Changes
- **Backend**
  - New route `GET /ai-panel` serving a static HTML page.
  - Static files under `backend/app/static/ai-panel/` (index.html, panel.js): microphone capture → POST `/api/v1/speech-to-text` → POST `/api/v1/text-to-sign` → display avatar response (video or animation info).
  - CORS: added `https://sign.tim-ai.com` to `allowed_origins` (no wildcard).
- **Docs / Deploy**
  - `docs/PROJECT_ANALYSIS_AI_PANEL.md` – project structure and API summary.
  - `docs/BBB_IFRAME_INTEGRATION.md` – how to embed the panel in BBB via iframe.
  - `docs/DEPLOYMENT_GUIDE.md` – SSH commands for deploy (git pull, restart service, nginx reload, optional bbb-conf --restart).
  - `deploy/nginx-sign.tim-ai.com.conf.example` – example nginx reverse proxy for sign.tim-ai.com.
  - `deploy/sign-backend.service.example` – example systemd unit for uvicorn (host 0.0.0.0, port 8000).

## Testing
- [ ] Open `https://sign.tim-ai.com/ai-panel`, allow microphone, record, confirm STT and sign response.
- [ ] Load panel in iframe from another origin; confirm CORS and mic prompt.
- [ ] Confirm existing APIs and auth are unchanged.

## Deployment
After merge, on server:
```bash
cd /var/www/sign-backend
git pull origin main
sudo systemctl restart sign-backend
sudo systemctl reload nginx
# Optional: sudo bbb-conf --restart
```

## Rollback
Revert this MR; restart backend and reload nginx. No DB or BBB core changes.
