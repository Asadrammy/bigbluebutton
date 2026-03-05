"""
WebSocket endpoint for real-time speech-to-text-to-sign pipeline
"""
import base64
import io
import json
import logging
from typing import Dict, Any
import asyncio

from fastapi import WebSocket, WebSocketDisconnect
from app.services.stt import SpeechToTextService
from app.config import settings

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message: {e}")

manager = WebSocketManager()

# Initialize services (lazy loading to avoid startup issues)
stt_service = None

def get_services():
    global stt_service
    if stt_service is None:
        try:
            stt_service = SpeechToTextService()
            logger.info("STT service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize STT service: {e}")
            stt_service = None
    
    return stt_service

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            logger.info(f"Received message type: {message.get('type')}")
            
            # Handle different message types
            if message.get('type') == 'audio_data':
                await handle_audio_data(message, websocket)
            elif message.get('type') == 'text_to_sign':
                await handle_text_to_sign(message, websocket)
            else:
                await manager.send_personal_message({
                    'type': 'error',
                    'message': f'Unknown message type: {message.get("type")}'
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.send_personal_message({
            'type': 'error',
            'message': str(e)
        }, websocket)
        manager.disconnect(websocket)

async def handle_audio_data(message: dict, websocket: WebSocket):
    """Handle audio data and transcribe"""
    try:
        audio_data = message.get('audio_data', '')
        language = message.get('language', 'en')
        
        logger.info(f"🎤 Received audio data: {len(audio_data)} chars, language: {language}")
        
        if not audio_data:
            await manager.send_personal_message({
                'type': 'error',
                'message': 'No audio data provided'
            }, websocket)
            return
        
        # Get services
        stt_svc = get_services()
        logger.info(f"🔧 STT service available: {stt_svc is not None}")
        
        # Send processing status with progress
        await manager.send_personal_message({
            'type': 'status',
            'message': 'Processing speech...',
            'progress': 25
        }, websocket)
        
        # Process speech-to-text
        if stt_svc:
            try:
                logger.info("🔄 Starting transcription...")
                
                # Send progress update
                await manager.send_personal_message({
                    'type': 'status',
                    'message': 'Loading AI model...',
                    'progress': 50
                }, websocket)
                
                result = await stt_svc.transcribe_audio_base64(audio_data, language)
                logger.info(f"📝 Transcription result: {result}")
                
                # Send progress update
                await manager.send_personal_message({
                    'type': 'status',
                    'message': 'Generating response...',
                    'progress': 75
                }, websocket)
                
                text = result.get('text', '')
                confidence = result.get('confidence', 0.0)
                
                # Send transcription result
                await manager.send_personal_message({
                    'type': 'transcription',
                    'text': text,
                    'confidence': confidence,
                    'language': language,
                    'processing_time': result.get('processing_time', 0)
                }, websocket)
                
                # Generate enhanced sign response
                await manager.send_personal_message({
                    'type': 'sign_response',
                    'text': text,
                    'sign_type': 'text_display',
                    'message': f'Sign for: "{text}"',
                    'confidence': confidence,
                    'timestamp': time.time()
                }, websocket)
                
                # Send completion status
                await manager.send_personal_message({
                    'type': 'status',
                    'message': 'Complete!',
                    'progress': 100
                }, websocket)
                    
            except Exception as e:
                logger.error(f"Speech-to-text error: {e}", exc_info=True)
                # Send error response
                await manager.send_personal_message({
                    'type': 'error',
                    'message': f'Speech transcription failed: {str(e)}',
                    'error_code': 'TRANSCRIPTION_ERROR'
                }, websocket)
                return
        else:
            # No STT service - send error
            await manager.send_personal_message({
                'type': 'error',
                'message': 'Speech-to-text service not available',
                'error_code': 'SERVICE_UNAVAILABLE'
            }, websocket)
            
    except Exception as e:
        logger.error(f"handle_audio_data error: {e}")
        await manager.send_personal_message({
            'type': 'error',
            'message': f'Audio processing failed: {str(e)}'
        }, websocket)

async def handle_text_to_sign(message: dict, websocket: WebSocket):
    """Handle text-to-sign conversion"""
    try:
        text = message.get('text', '')
        
        if not text:
            await manager.send_personal_message({
                'type': 'error',
                'message': 'No text provided'
            }, websocket)
            return
        
        # Dummy response
        await manager.send_personal_message({
            'type': 'sign_response',
            'text': text,
            'sign_type': 'text_display',
            'message': f'Sign for: "{text}"'
        }, websocket)
            
    except Exception as e:
        logger.error(f"handle_text_to_sign error: {e}")
        await manager.send_personal_message({
            'type': 'error',
            'message': f'Text-to-sign failed: {str(e)}'
        }, websocket)
