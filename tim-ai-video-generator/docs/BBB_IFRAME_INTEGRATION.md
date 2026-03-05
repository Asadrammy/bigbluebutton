# BigBlueButton – AI Sign Panel iframe integration

**Important:** Do **not** modify BBB core files under `/usr/share/bigbluebutton/html5-client`. This guide uses safe override/plugin approaches only.

---

## Panel URL

- **Panel (standalone):** `https://sign.tim-ai.com/ai-panel`
- **Static assets:** `https://sign.tim-ai.com/static/ai-panel/`

The panel provides: Start Microphone → Speech-to-Text → Text-to-Sign → Avatar animation (video or animation data).

---

## Option A: Custom client overlay (recommended)

1. **Custom HTML5 client build or overlay**
   - Use a custom build of the BBB HTML5 client that adds a right-side panel, or use a browser extension / userscript that injects an iframe into the meeting page.
   - In that custom UI, embed the panel in an iframe:

   ```html
   <iframe
     src="https://sign.tim-ai.com/ai-panel"
     title="AI Sign Translation"
     style="width: 400px; height: 100%; border: 0;"
     allow="microphone"
   ></iframe>
   ```

2. **Same-origin / CORS**
   - The panel is served from `https://sign.tim-ai.com` and calls the same origin for `/api/v1/speech-to-text` and `/api/v1/text-to-sign`. CORS already allows `https://sign.tim-ai.com`.
   - If the BBB meeting runs on another domain (e.g. `bbb.example.com`), the iframe is cross-origin; the panel still works inside the iframe because it loads from `sign.tim-ai.com` and uses that origin for API calls. Microphone permission is scoped to the iframe.

3. **Microphone**
   - Ensure the iframe has `allow="microphone"` (or `allow="microphone; camera"` if needed). For BBB's default client, the meeting may already request mic; the iframe will trigger a separate permission prompt for the panel unless the user has already granted mic to that origin.

---

## Option B: BBB 3.x plugin / injection (if applicable)

If you are on **BigBlueButton 3.x** and use a plugin or extension mechanism:

1. **Do not touch:** `/usr/share/bigbluebutton/html5-client` (core).
2. **Safe approach:** Use the official way to add a "custom component" or "plugin" that only adds a UI panel and an iframe pointing to `https://sign.tim-ai.com/ai-panel`. Refer to BBB 3.x docs for "custom client plugin" or "client extension" so your changes survive upgrades.
3. **If no plugin API exists:** Use a reverse proxy in front of BBB that injects a small script into the HTML5 client response, which creates a floating div with the iframe. This is a server-level override, not a direct edit of core files. Document the exact injection point and keep it minimal so it can be toggled or reverted.

---

## Optional: token for authenticated API

If you later protect `/api/v1/speech-to-text` or `/api/v1/text-to-sign` with auth:

- Have your app obtain a JWT (e.g. from `/api/v1/auth/login`) and pass it to the panel (e.g. via postMessage or URL fragment).
- The panel already sends `Authorization: Bearer <token>` when `localStorage.getItem('sign_token')` or `sessionStorage.getItem('sign_token')` is set. So you can set `sign_token` in the embedding page before opening the iframe, or use postMessage to send the token into the iframe and have the panel store it in `sessionStorage`.

---

## Summary

| Item | Action |
|------|--------|
| BBB core | Do **not** modify `/usr/share/bigbluebutton/html5-client` |
| Embed URL | `https://sign.tim-ai.com/ai-panel` in an iframe with `allow="microphone"` |
| CORS | Already allows `https://sign.tim-ai.com` (no wildcard) |
| Auth | Optional; panel supports `Authorization: Bearer` via `sign_token` in storage |
