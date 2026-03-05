#!/usr/bin/env python3
"""
Complete pipeline test - WebSocket with audio simulation
"""
import asyncio
import websockets
import json
import base64

async def test_complete_pipeline():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Test 1: Text to Sign
            print("\n📝 Test 1: Text to Sign")
            message = {
                "type": "text_to_sign",
                "text": "hello world"
            }
            
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 Response: {data['type']} - {data.get('message', '')}")
            
            # Test 2: Audio to Text to Sign (simulate audio)
            print("\n🎤 Test 2: Audio to Text to Sign")
            dummy_audio = base64.b64encode(b"dummy audio content for testing").decode()
            
            message = {
                "type": "audio_data",
                "audio_data": dummy_audio,
                "language": "en"
            }
            
            await websocket.send(json.dumps(message))
            print("📤 Sent dummy audio data")
            
            # Wait for multiple responses
            responses = []
            timeout = 8
            
            try:
                while timeout > 0 and len(responses) < 3:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    responses.append(data)
                    print(f"📥 Received: {data['type']}")
                    
                    if data['type'] == 'transcription':
                        print(f"   Text: {data.get('text', '')}")
                        print(f"   Confidence: {data.get('confidence', 0):.2f}")
                    elif data['type'] == 'sign_response':
                        print(f"   Sign: {data.get('message', '')}")
                        break
                    
                    timeout -= 1
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for audio response")
            
            print(f"\n✅ Pipeline test complete!")
            print(f"   Received {len(responses)} responses")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_complete_pipeline())
