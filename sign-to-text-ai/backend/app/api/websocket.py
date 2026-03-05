"""
WebSocket endpoints for real-time sign language recognition and speech processing
"""
import json
import base64
import logging
from typing import Dict, List
import asyncio

from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from app.models import Language, SignLanguage
from app.services.sign_recognition import SignRecognitionService
from app.services.stt import get_stt_service
from app.services.tts import get_tts_service
from app.services.translator import get_translation_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
sign_recognition_service = SignRecognitionService()
stt_service = get_stt_service()
tts_service = get_tts_service()
translator_service = get_translation_service()


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.frame_buffers: Dict[str, List] = {}  # Buffer frames per connection
    
    async def connect(self, websocket: WebSocket, connection_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.frame_buffers[connection_id] = []
        logger.info(f"WebSocket connected: {connection_id}")
    
    def disconnect(self, websocket: WebSocket, connection_id: str):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if connection_id in self.frame_buffers:
            del self.frame_buffers[connection_id]
        logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to a specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")


manager = ConnectionManager()


@router.websocket("/ws/sign-to-text")
async def websocket_sign_to_text(websocket: WebSocket):
    """
    WebSocket endpoint for real-time sign language recognition
    
    Client sends:
    - {"type": "frame", "data": "base64_frame"} - Video frame
    - {"type": "process", "sign_language": "DGS"} - Process buffered frames
    - {"type": "reset"} - Clear frame buffer
    
    Server sends:
    - {"type": "result", "text": "...", "confidence": 0.95, ...}
    - {"type": "error", "message": "..."}
    """
    connection_id = f"sign_{id(websocket)}"
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "frame":
                # Buffer frame
                frame_data = data.get("data")
                if frame_data:
                    manager.frame_buffers[connection_id].append(frame_data)
                    # Auto-process if buffer is full (e.g., 16 frames)
                    if len(manager.frame_buffers[connection_id]) >= 16:
                        await process_frames(websocket, connection_id, data.get("sign_language", "DGS"))
            
            elif message_type == "process":
                # Process buffered frames
                await process_frames(websocket, connection_id, data.get("sign_language", "DGS"))
            
            elif message_type == "reset":
                # Clear buffer
                manager.frame_buffers[connection_id] = []
                await manager.send_personal_message({
                    "type": "status",
                    "message": "Buffer cleared"
                }, websocket)
            
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket, connection_id)


async def process_frames(websocket: WebSocket, connection_id: str, sign_language: str):
    """Process buffered frames and send result"""
    try:
        frames = manager.frame_buffers[connection_id]
        if len(frames) == 0:
            await manager.send_personal_message({
                "type": "error",
                "message": "No frames to process"
            }, websocket)
            return
        
        # Process frames
        result = await sign_recognition_service.recognize_signs(
            frames=frames,
            sign_language=SignLanguage.DGS if sign_language == "DGS" else SignLanguage.DGS
        )
        
        # Send result
        await manager.send_personal_message({
            "type": "result",
            "text": result["text"],
            "confidence": result["confidence"],
            "language": result["language"],
            "inference_time": result.get("inference_time", 0),
            "frames_processed": len(frames)
        }, websocket)
        
        # Clear buffer after processing
        manager.frame_buffers[connection_id] = []
    
    except Exception as e:
        logger.error(f"Error processing frames: {e}", exc_info=True)
        await manager.send_personal_message({
            "type": "error",
            "message": str(e)
        }, websocket)


@router.websocket("/ws/speech-to-text")
async def websocket_speech_to_text(websocket: WebSocket):
    """
    WebSocket endpoint for real-time speech recognition
    
    Client sends:
    - {"type": "audio_chunk", "data": "base64_audio"} - Audio chunk
    - {"type": "process", "language": "de"} - Process buffered audio
    - {"type": "reset"} - Clear audio buffer
    
    Server sends:
    - {"type": "result", "text": "...", "language": "de", ...}
    - {"type": "partial", "text": "..."} - Partial transcription
    """
    connection_id = f"stt_{id(websocket)}"
    await manager.connect(websocket, connection_id)
    
    try:
        audio_buffer = []
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "audio_chunk":
                # Buffer audio chunk
                audio_data = data.get("data")
                if audio_data:
                    audio_buffer.append(audio_data)
            
            elif message_type == "process":
                # Process buffered audio
                if len(audio_buffer) > 0:
                    # Concatenate audio chunks
                    combined_audio = "".join(audio_buffer)
                    
                    # Transcribe
                    language = Language(data.get("language", "german"))
                    result = await stt_service.transcribe(
                        audio_data=combined_audio,
                        language=language
                    )
                    
                    await manager.send_personal_message({
                        "type": "result",
                        "text": result["text"],
                        "language": result["language"],
                        "confidence": result.get("confidence", 0.0)
                    }, websocket)
                    
                    audio_buffer = []
                else:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "No audio to process"
                    }, websocket)
            
            elif message_type == "reset":
                audio_buffer = []
                await manager.send_personal_message({
                    "type": "status",
                    "message": "Buffer cleared"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket, connection_id)


@router.websocket("/ws/text-to-sign")
async def websocket_text_to_sign(websocket: WebSocket):
    """
    WebSocket endpoint for real-time text-to-sign conversion
    
    Client sends:
    - {"type": "text", "text": "Hello", "source_language": "en"}
    
    Server sends:
    - {"type": "animation", "data": {...}} - Animation keyframes
    """
    connection_id = f"tts_{id(websocket)}"
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "text":
                text = data.get("text", "")
                source_language = Language(data.get("source_language", "english"))
                
                # Convert to sign language animation
                from app.services.avatar import get_avatar_service
                avatar_service = get_avatar_service()
                
                result = await avatar_service.text_to_sign(
                    text=text,
                    source_language=source_language,
                    sign_language=SignLanguage.DGS
                )
                
                await manager.send_personal_message({
                    "type": "animation",
                    "data": result.get("animation_data", {}),
                    "text": text
                }, websocket)
            
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket, connection_id)


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Unified WebSocket endpoint for bidirectional streaming
    
    Supports all operations: sign-to-text, speech-to-text, text-to-sign
    """
    connection_id = f"stream_{id(websocket)}"
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            operation = data.get("operation")
            
            if operation == "sign_to_text":
                # Handle sign recognition
                frames = data.get("frames", [])
                if frames:
                    result = await sign_recognition_service.recognize_signs(
                        frames=frames,
                        sign_language=SignLanguage.DGS
                    )
                    await manager.send_personal_message({
                        "type": "sign_result",
                        **result
                    }, websocket)
            
            elif operation == "speech_to_text":
                # Handle speech recognition
                audio_data = data.get("audio_data")
                language = Language(data.get("language", "german"))
                if audio_data:
                    result = await stt_service.transcribe(
                        audio_data=audio_data,
                        language=language
                    )
                    await manager.send_personal_message({
                        "type": "speech_result",
                        **result
                    }, websocket)
            
            elif operation == "text_to_speech":
                # Handle text-to-speech
                text = data.get("text", "")
                language = Language(data.get("language", "german"))
                if text:
                    result = await tts_service.synthesize(
                        text=text,
                        language=language
                    )
                    await manager.send_personal_message({
                        "type": "tts_result",
                        **result
                    }, websocket)
            
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Unknown operation: {operation}"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket, connection_id)

