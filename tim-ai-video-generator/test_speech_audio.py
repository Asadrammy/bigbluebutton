#!/usr/bin/env python3
"""
Test with real speech audio - create a simple speech pattern
"""
import asyncio
import websockets
import json
import base64
import numpy as np
import wave
import tempfile
import os

def create_speech_like_audio():
    """Create audio that mimics speech patterns"""
    sample_rate = 16000
    duration = 2.0  # 2 seconds
    
    # Create a more complex signal that resembles speech
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Mix multiple frequencies to simulate speech formants
    frequencies = [200, 400, 800, 1200, 2000]  # Typical speech frequencies
    audio = np.zeros_like(t)
    
    # Add frequency components with varying amplitudes
    for i, freq in enumerate(frequencies):
        amplitude = 0.1 * (1.0 / (i + 1))  # Decreasing amplitude
        phase = np.random.random() * 2 * np.pi
        audio += amplitude * np.sin(2 * np.pi * freq * t + phase)
    
    # Add some noise to make it more realistic
    noise = np.random.normal(0, 0.02, len(t))
    audio += noise
    
    # Apply envelope to simulate speech dynamics
    envelope = np.exp(-t * 0.5)  # Decay envelope
    audio *= envelope
    
    # Normalize and convert to 16-bit PCM
    audio = audio / np.max(np.abs(audio)) * 0.8  # Normalize to 80% volume
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

async def test_speech_transcription():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Create speech-like audio
            print("🎵 Creating speech-like audio...")
            audio_b64 = create_speech_like_audio()
            print(f"📊 Audio size: {len(audio_b64)} characters")
            
            # Send audio for transcription
            print("🎤 Sending speech-like audio for transcription...")
            message = {
                "type": "audio_data",
                "audio_data": audio_b64,
                "language": "en"
            }
            
            await websocket.send(json.dumps(message))
            
            # Wait for responses
            timeout = 20  # seconds
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
                        text = data.get('text', '')
                        confidence = data.get('confidence', 0)
                        print(f"   Text: '{text}'")
                        print(f"   Confidence: {confidence:.2f}")
                        if text.strip():  # If we got actual text
                            print("✅ Real transcription working!")
                        else:
                            print("⚠️  Empty transcription - audio may not contain speech")
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
                if resp['type'] == 'transcription':
                    print(f"  - {resp['type']}: '{resp.get('text', '')}' (confidence: {resp.get('confidence', 0):.2f})")
                else:
                    print(f"  - {resp['type']}: {resp.get('text', resp.get('message', ''))}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_speech_transcription())
