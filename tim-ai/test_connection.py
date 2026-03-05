#!/usr/bin/env python3
"""
Test WebSocket connection and basic functionality
"""
import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Test 1: Send text message
            print("📝 Testing text message...")
            message = {
                "type": "text_to_sign",
                "text": "hello world"
            }
            
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 Response: {data['type']} - {data.get('message', '')}")
            
            # Test 2: Send dummy audio
            print("\n🎤 Testing audio message...")
            dummy_audio = "ZGFtbXkgYXVkaW8gZGF0YQ=="  # base64 for "dummy audio data"
            
            message = {
                "type": "audio_data",
                "audio_data": dummy_audio,
                "language": "en"
            }
            
            await websocket.send(json.dumps(message))
            
            # Wait for multiple responses
            timeout = 10
            responses = []
            
            try:
                while timeout > 0:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    responses.append(data)
                    print(f"📥 Received: {data['type']}")
                    
                    if data['type'] == 'error':
                        print(f"❌ Error: {data.get('message', '')}")
                        break
                    elif data['type'] == 'transcription':
                        print(f"📝 Transcription: '{data.get('text', '')}'")
                    elif data['type'] == 'sign_response':
                        print(f"🤟 Sign: {data.get('message', '')}")
                        break
                    
                    timeout -= 1
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
            
            print(f"\n📊 Total responses: {len(responses)}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
