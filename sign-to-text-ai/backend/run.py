"""
Startup script for the Sign Language Translator API
"""
import uvicorn
import os
from app.config import settings

if __name__ == "__main__":
    # Allow port override via environment variable (for Windows port conflicts)
    port = int(os.getenv("PORT", settings.port))
    
    # Try to start on specified port, fallback to 8001 if 8000 fails
    try:
        uvicorn.run(
            "app.main:app",
            host=settings.host,
            port=port,
            reload=settings.debug,
            log_level="info" if settings.debug else "warning",
        )
    except OSError as e:
        if "10013" in str(e) or "permission" in str(e).lower():
            # Port permission error - try alternative port
            if port == 8000:
                print(f"⚠️  Port 8000 is blocked. Trying port 8001 instead...")
                print(f"   Update mobile app .env: API_BASE_URL=http://YOUR_IP:8001/api/v1")
                uvicorn.run(
                    "app.main:app",
                    host=settings.host,
                    port=8001,
                    reload=settings.debug,
                    log_level="info" if settings.debug else "warning",
                )
            else:
                raise
        else:
            raise

