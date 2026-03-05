import os
import time
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api import sign_to_text, speech_to_text, text_to_speech, text_to_sign, translation, auth, videos, audio, dataset, training, history, websocket

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API for real-time sign language and speech translation",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware for request timing
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "code": "INTERNAL_ERROR",
            "details": str(exc) if settings.debug else None,
        },
    )


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(history.router, prefix="/api/v1/history", tags=["Translation History"])
app.include_router(videos.router, prefix="/api/v1/videos", tags=["Video Management"])
app.include_router(audio.router, prefix="/api/v1/audio", tags=["Audio Management"])
app.include_router(dataset.router, prefix="/api/v1/datasets", tags=["Dataset Management"])
app.include_router(training.router, prefix="/api/v1/training", tags=["Training Management"])
app.include_router(sign_to_text.router, prefix="/api/v1", tags=["Sign Language"])
app.include_router(speech_to_text.router, prefix="/api/v1", tags=["Speech Recognition"])
app.include_router(text_to_speech.router, prefix="/api/v1", tags=["Text-to-Speech"])
app.include_router(text_to_sign.router, prefix="/api/v1", tags=["Avatar Animation"])
app.include_router(translation.router, prefix="/api/v1", tags=["Translation"])

# WebSocket endpoint
app.websocket("/ws")(websocket.websocket_endpoint)

# Static files for AI panel (no auth required; optional token in panel JS)
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.get("/ai-panel")
async def ai_panel_page():
    """
    AI Sign Translation panel: microphone -> speech-to-text -> text-to-sign -> avatar.
    Safe for iframe embedding (e.g. BigBlueButton). Auth optional via token header in API calls.
    """
    path = os.path.join(os.path.dirname(__file__), "static", "ai-panel", "index.html")
    if not os.path.isfile(path):
        return JSONResponse(status_code=404, content={"detail": "AI panel not found"})
    return FileResponse(path, media_type="text/html")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs" if settings.debug else "disabled",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
    }


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Models directory: {settings.models_dir}")
    
    # Initialize database tables (use SQLite for MVP)
    from app.database_sqlite import init_db
    await init_db()
    logger.info("Database tables initialized")
    
    # TODO: Load ML models here
    # await load_sign_language_model()
    # await load_whisper_model()


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down application...")
    # TODO: Cleanup resources

