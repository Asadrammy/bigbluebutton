#!/usr/bin/env python3
"""
Test with proper audio format
"""
import asyncio
import websockets
import json
import base64
import numpy as np
import wave
import tempfile
import os

def create_test_audio():
    """Create a simple WAV file with test audio"""
    # Generate a simple sine wave (440 Hz for 1 second)
    sample_rate = 16000
    duration = 1.0
    frequency = 440  # A4 note
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio = np.sin(frequency * 2 * np.pi * t) * 0.3  # 30% volume
    
    # Convert to 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    
    # Create temporary WAV file
    tmp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    tmp_file.close()
    
    try:
        with wave.open(tmp_file.name, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_int16.tobytes())
        
        # Read and encode to base64
        with open(tmp_file.name, 'rb') as f:
            audio_data = f.read()
        
        return base64.b64encode(audio_data).decode()
    finally:
        try:
            os.unlink(tmp_file.name)
        except:
            pass

async def test_real_audio():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Create test audio
            print("🎵 Creating test audio...")
            audio_b64 = create_test_audio()
            print(f"📊 Audio size: {len(audio_b64)} characters")
            
            # Send audio for transcription
            print("🎤 Sending test audio for transcription...")
            message = {
                "type": "audio_data",
                "audio_data": audio_b64,
                "language": "en"
            }
            
            await websocket.send(json.dumps(message))
            
            # Wait for responses
            timeout = 15  # seconds
            responses = []
            
            try:
                while timeout > 0:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    responses.append(data)
                    print(f"📥 Received: {data['type']}")
                    
                    if data['type'] == 'status':
                        print(f"   Status: {data.get('message', '')}")
                    elif data['type'] == 'transcription':
                        print(f"   Text: '{data.get('text', '')}'")
                        print(f"   Confidence: {data.get('confidence', 0):.2f}")
                    elif data['type'] == 'sign_response':
                        print(f"   Sign: {data.get('message', '')}")
                        print("✅ Complete pipeline working!")
                        break
                    elif data['type'] == 'error':
                        print(f"   Error: {data.get('message', '')}")
                        break
                    
                    timeout -= 1
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
            
            print(f"\n📊 Summary:")
            for resp in responses:
                print(f"  - {resp['type']}: {resp.get('text', resp.get('message', ''))}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_real_audio())
