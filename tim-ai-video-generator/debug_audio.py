#!/usr/bin/env python3
"""
Debug audio format from browser
"""
import asyncio
import websockets
import json
import base64

async def debug_audio():
    uri = "ws://localhost:8000/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            print("🎤 Please record audio in browser now...")
            
            # Wait for any message
            while True:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(response)
                    
                    if data['type'] == 'audio_data':
                        audio_data = data.get('audio_data', '')
                        print(f"📊 Received audio data: {len(audio_data)} characters")
                        print(f"📊 First 100 chars: {audio_data[:100]}")
                        
                        # Try to decode and analyze
                        try:
                            audio_bytes = base64.b64decode(audio_data)
                            print(f"📊 Decoded bytes: {len(audio_bytes)}")
                            print(f"📊 First 20 bytes: {audio_bytes[:20].hex()}")
                            
                            # Check for file signatures
                            if audio_bytes.startswith(b'\x1a\x45\xdf\xa3'):
                                print("📋 Format: WebM")
                            elif audio_bytes.startswith(b'RIFF'):
                                print("📋 Format: WAV")
                            elif audio_bytes.startswith(b'ID3'):
                                print("📋 Format: MP3")
                            else:
                                print("📋 Format: Unknown")
                                
                        except Exception as e:
                            print(f"❌ Failed to decode: {e}")
                    
                    elif data['type'] == 'error':
                        print(f"❌ Error: {data.get('message', '')}")
                        break
                    
                    print(f"📥 Message type: {data['type']}")
                    
                except asyncio.TimeoutError:
                    print("⏰ No message received in 30 seconds")
                    break
                    
    except Exception as e:
        print(f"❌ Debug failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug_audio())
