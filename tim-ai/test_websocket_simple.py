#!/usr/bin/env python3
"""
Simple WebSocket test - text only
"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Send a text message instead of audio
            message = {
                "type": "text_to_sign",
                "text": "hello world"
            }
            
            await websocket.send(json.dumps(message))
            print("📤 Sent test text message")
            
            # Wait for responses
            timeout = 5  # seconds
            responses = []
            
            try:
                while timeout > 0:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    responses.append(data)
                    print(f"📥 Received: {data['type']} - {data.get('message', '')}")
                    
                    if data['type'] == 'sign_response':
                        print("✅ Complete pipeline working!")
                        break
                    
                    timeout -= 1
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
            
            print(f"\n📊 Summary:")
            for resp in responses:
                print(f"  - {resp['type']}: {resp.get('text', resp.get('message', ''))}")
                
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
