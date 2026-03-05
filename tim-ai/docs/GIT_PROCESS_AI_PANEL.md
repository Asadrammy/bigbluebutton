# Git process for AI panel (feature/ai-panel)

Run from the **tim-ai-video-generator** repo root (GitLab: krachbummNT/tim-ai-video-generator).

## 1. Create branch
```bash
git checkout -b feature/ai-panel
```

## 2. Stage and commit
```bash
git add backend/app/main.py backend/app/config.py backend/app/static/
git add deploy/ docs/PROJECT_ANALYSIS_AI_PANEL.md docs/BBB_IFRAME_INTEGRATION.md docs/DEPLOYMENT_GUIDE.md docs/MERGE_REQUEST_TEMPLATE_AI_PANEL.md docs/GIT_PROCESS_AI_PANEL.md
git status
git commit -m "feat: add AI Sign panel at /ai-panel for BBB iframe integration"
```

## 3. Push to GitLab (no force)
```bash
git push -u origin feature/ai-panel
```

## 4. Create merge request
In GitLab (https://gitlab.com/krachbummNT/tim-ai-video-generator), open a new Merge Request from `feature/ai-panel` into `main` (or your default branch). Use the body from `docs/MERGE_REQUEST_TEMPLATE_AI_PANEL.md`.

Do **not** use `--force` or `force push`.
