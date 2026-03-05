# Deployment guide – sign.tim-ai.com

Use these steps on the **server** where the FastAPI backend and (optionally) BigBlueButton run.

---

## 1. Pull latest code

```bash
cd /var/www/sign-backend
git fetch origin
git checkout feature/ai-panel
git pull origin feature/ai-panel
```

(Adjust path and branch if your layout differs. Repo root is tim-ai-video-generator; backend is in `backend/`.)

---

## 2. Restart backend service

If the backend runs under systemd:

```bash
sudo systemctl restart sign-backend
```

Check status:

```bash
sudo systemctl status sign-backend
```

If you run uvicorn manually (no systemd), run from repo root:

```bash
cd /var/www/sign-backend/backend
source ../venv/bin/activate   # or venv in backend/
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 3. Reload nginx

After any nginx config change or to pick up app changes behind the same proxy:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Restart BigBlueButton (optional)

Only if you need BBB services restarted (e.g. after server or config changes):

```bash
sudo bbb-conf --restart
```

---

## Quick one-liner (after merge to main)

Assumes backend path `/var/www/sign-backend`, branch `main`, and systemd service `sign-backend`:

```bash
cd /var/www/sign-backend && git pull origin main && sudo systemctl restart sign-backend && sudo systemctl reload nginx
```

Optional BBB restart:

```bash
sudo bbb-conf --restart
```

---

## Verify

- Backend: `curl -s https://sign.tim-ai.com/health`
- AI panel: open `https://sign.tim-ai.com/ai-panel` in a browser and test mic → STT → text-to-sign.
