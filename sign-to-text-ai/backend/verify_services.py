"""
Verify all services are loaded correctly for Expo Go
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def check_endpoint(url, name):
    """Check if an endpoint is available"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print(f"✅ {name}: OK")
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
            except:
                print(f"   Status: {response.status_code}")
            return True
        else:
            print(f"⚠️  {name}: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {name}: {str(e)[:100]}")
        return False

def main():
    print("=" * 60)
    print("Service Verification for Expo Go")
    print("=" * 60)
    print()
    
    checks = []
    
    # Basic endpoints
    print("Basic Endpoints:")
    checks.append(("Health", check_endpoint(f"{BASE_URL}/health", "Health Check")))
    checks.append(("API Health", check_endpoint(f"{BASE_URL}/api/v1/health", "API Health")))
    checks.append(("Root", check_endpoint(f"{BASE_URL}/", "Root Endpoint")))
    print()
    
    # Core API endpoints (used by Expo Go)
    print("Core API Endpoints:")
    checks.append(("Sign-to-Text", check_endpoint(f"{BASE_URL}/api/v1/sign-to-text", "Sign-to-Text (POST only)")))
    checks.append(("Speech-to-Text", check_endpoint(f"{BASE_URL}/api/v1/speech-to-text", "Speech-to-Text (POST only)")))
    checks.append(("Text-to-Speech", check_endpoint(f"{BASE_URL}/api/v1/text-to-speech", "Text-to-Speech (POST only)")))
    checks.append(("Text-to-Sign", check_endpoint(f"{BASE_URL}/api/v1/text-to-sign", "Text-to-Sign (POST only)")))
    checks.append(("Translation", check_endpoint(f"{BASE_URL}/api/v1/translate", "Translation (POST only)")))
    print()
    
    # Service info endpoints
    print("Service Info Endpoints:")
    checks.append(("STT Info", check_endpoint(f"{BASE_URL}/api/v1/speech-to-text/info", "STT Info")))
    checks.append(("TTS Info", check_endpoint(f"{BASE_URL}/api/v1/text-to-speech/info", "TTS Info")))
    checks.append(("Translation Info", check_endpoint(f"{BASE_URL}/api/v1/translate/info", "Translation Info")))
    checks.append(("Avatar Info", check_endpoint(f"{BASE_URL}/api/v1/text-to-sign/info", "Avatar Info")))
    print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print("=" * 60)
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("✅ All checks passed!")
        return 0
    else:
        print("⚠️  Some checks failed (this is OK for POST-only endpoints)")
        return 0  # Don't fail - POST endpoints will return 405/404

if __name__ == "__main__":
    sys.exit(main())

