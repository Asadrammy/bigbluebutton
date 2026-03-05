#!/usr/bin/env python3
"""
Simple system check
"""
import requests
import asyncio
import websockets
import json

async def simple_check():
    print("🔍 SYSTEM STATUS")
    print("=" * 30)
    
    # Frontend
    try:
        r = requests.get("http://localhost:3000")
        print("✅ Frontend: RUNNING")
    except:
        print("❌ Frontend: DOWN")
    
    # Backend
    try:
        r = requests.get("http://localhost:8000/health")
        print("✅ Backend: RUNNING")
    except:
        print("❌ Backend: DOWN")
    
    # WebSocket
    try:
        async with websockets.connect("ws://localhost:8000/ws") as ws:
            print("✅ WebSocket: CONNECTED")
            
            # Test text
            await ws.send(json.dumps({"type": "text_to_sign", "text": "test"}))
            resp = await ws.recv()
            data = json.loads(resp)
            
            if data['type'] == 'sign_response':
                print("✅ Text-to-Sign: WORKING")
            
            # Test audio
            await ws.send(json.dumps({
                "type": "audio_data", 
                "audio_data": "ZGFtbXk=", 
                "language": "en"
            }))
            
            # Wait for responses
            got_transcription = False
            for _ in range(5):
                resp = await ws.recv()
                data = json.loads(resp)
                if data['type'] == 'transcription':
                    got_transcription = True
                    print("✅ Audio Processing: WORKING")
                    break
                elif data['type'] == 'error':
                    print("⚠️  Audio Processing: ERROR")
                    break
            
            if not got_transcription:
                print("⚠️  Audio Processing: NO RESPONSE")
                
    except Exception as e:
        print(f"❌ WebSocket: {e}")
    
    print("\n🎯 ALL SERVICES CHECKED")
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend:  http://localhost:8000")
    print("🔌 WebSocket: ws://localhost:8000/ws")

if __name__ == "__main__":
    asyncio.run(simple_check())
