#!/usr/bin/env python3
"""
Complete system status check
"""
import asyncio
import websockets
import json
import requests
import time

async def check_all_services():
    print("🔍 SYSTEM STATUS CHECK")
    print("=" * 50)
    
    # 1. Check Frontend
    print("\n📱 FRONTEND (http://localhost:3000)")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend: RUNNING")
            print(f"   Content-Type: {response.headers.get('content-type')}")
            print(f"   Page Size: {len(response.text)} bytes")
        else:
            print(f"❌ Frontend: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend: {e}")
    
    # 2. Check Backend Health
    print("\n🔧 BACKEND (http://localhost:8000)")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend Health: OK")
            data = response.json()
            print(f"   Status: {data.get('status')}")
        else:
            print(f"❌ Backend Health: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Backend Health: {e}")
    
    # 3. Check WebSocket
    print("\n🔌 WEBSOCKET (ws://localhost:8000/ws)")
    try:
        async with websockets.connect("ws://localhost:8000/ws", timeout=5) as websocket:
            print("✅ WebSocket: CONNECTED")
            
            # Test text message
            await websocket.send(json.dumps({
                "type": "text_to_sign",
                "text": "system check"
            }))
            
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)
            
            if data['type'] == 'sign_response':
                print("✅ WebSocket Text Test: PASS")
            else:
                print(f"⚠️  WebSocket Text Test: {data['type']}")
                
    except Exception as e:
        print(f"❌ WebSocket: {e}")
    
    # 4. Test Audio Pipeline
    print("\n🎤 AUDIO PIPELINE TEST")
    try:
        async with websockets.connect("ws://localhost:8000/ws", timeout=5) as websocket:
            print("🔄 Testing audio processing...")
            
            # Send test audio
            test_audio = "ZGFtbXkgYXVkaW8gZGF0YSBmb3IgdGVzdGluZw=="  # base64 dummy audio
            
            await websocket.send(json.dumps({
                "type": "audio_data",
                "audio_data": test_audio,
                "language": "en"
            }))
            
            # Collect responses
            responses = []
            timeout = 10
            while timeout > 0:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    responses.append(data)
                    
                    if data['type'] == 'error':
                        print(f"❌ Audio Error: {data.get('message', '')}")
                        break
                    elif data['type'] == 'transcription':
                        print(f"✅ Transcription: '{data.get('text', '')}'")
                        print(f"   Confidence: {data.get('confidence', 0):.2f}")
                    elif data['type'] == 'sign_response':
                        print("✅ Complete Pipeline: WORKING")
                        break
                        
                    timeout -= 1
                except asyncio.TimeoutError:
                    break
            
            if len(responses) >= 2:
                print("✅ Audio Pipeline: FUNCTIONAL")
            else:
                print("⚠️  Audio Pipeline: INCOMPLETE")
                
    except Exception as e:
        print(f"❌ Audio Pipeline: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 READY FOR TESTING:")
    print("   1. Open http://localhost:3000")
    print("   2. Click 'Start Recording'")
    print("   3. Speak clearly")
    print("   4. Click 'Stop Recording'")
    print("   5. Check transcription results")

if __name__ == "__main__":
    asyncio.run(check_all_services())
