# Sign Language AI MVP Demo

## Quick Start

### 1. Start Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### 2. Open Frontend
Open `frontend/index.html` in your browser (or serve with a simple HTTP server)

### 3. Test Demo
1. Click "Start Recording" 
2. Speak into microphone
3. See transcription and sign response

## What Works

✅ **WebSocket real-time communication**
✅ **Audio capture from browser**  
✅ **Speech-to-text processing** (dummy if Whisper not available)
✅ **Sign response generation** (text display)
✅ **Error handling and status updates**

## Pipeline Flow

```
Browser Microphone → WebSocket → Backend STT → Text → Sign Response → Browser Display
```

## Files Added/Modified

### Backend
- `app/api/websocket.py` - New WebSocket endpoint
- `app/main.py` - Added WebSocket route
- `app/services/stt.py` - Added `transcribe_audio_base64()` method
- `app/config.py` - Added CORS for frontend

### Frontend  
- `frontend/index.html` - Demo interface
- `frontend/app.js` - WebSocket client and audio capture
- `frontend/style.css` - Styling

## Notes

- Uses existing FastAPI backend structure
- Whisper integration ready but falls back to dummy responses
- Avatar service integration ready but displays text for now
- No authentication required for MVP
- Runs locally on Windows

## Next Steps

1. Install Whisper for real speech-to-text
2. Add avatar animations for sign display  
3. Deploy to server
4. Integrate with BigBlueButton
