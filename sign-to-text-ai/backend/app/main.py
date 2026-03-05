from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging

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
# For mobile apps, allow all origins (mobile apps don't have same-origin restrictions)
cors_origins = settings.allowed_origins
if "*" in cors_origins:
    # Allow all origins (disable credentials when using wildcard)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Cannot use credentials with wildcard
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Use specific origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
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
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


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


@app.get("/api/health")
async def api_health_check():
    """API health check endpoint (for compatibility)"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
    }


@app.get("/api/config")
async def get_config():
    """Get API configuration (non-sensitive)"""
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "debug": settings.debug,
        "allowed_origins": settings.allowed_origins,
    }


@app.get("/api/license/usage")
async def get_license_usage():
    """Get license usage information"""
    return {
        "license_type": "open_source",
        "status": "active",
        "usage": {
            "requests_today": 0,
            "requests_limit": None,
        }
    }


# Versioned API endpoints
@app.get("/api/v1/health")
async def api_v1_health_check():
    """API v1 health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "v1",
    }


@app.get("/api/v1/config")
async def get_v1_config():
    """Get API v1 configuration (non-sensitive)"""
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "debug": settings.debug,
        "api_version": "v1",
    }


@app.get("/api/v1/license/usage")
async def get_v1_license_usage():
    """Get license usage information (v1)"""
    return {
        "license_type": "open_source",
        "status": "active",
        "usage": {
            "requests_today": 0,
            "requests_limit": None,
        }
    }


@app.get("/api/v1/system/gpu-info")
async def get_gpu_info():
    """Get GPU information"""
    from app.utils.gpu_utils import get_device_info
    return get_device_info()


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Models directory: {settings.models_dir}")
    
    # Initialize database tables
    from app.database import init_db
    await init_db()
    logger.info("Database tables initialized")
    
    # Log GPU information
    try:
        from app.utils.gpu_utils import get_device_info
        gpu_info = get_device_info()
        logger.info(f"GPU Info: {gpu_info}")
        if gpu_info["cuda_available"]:
            logger.info(f"✅ GPU available: {gpu_info.get('gpu_name', 'Unknown')} ({gpu_info.get('gpu_memory_gb', 0):.1f} GB)")
        else:
            logger.warning("⚠️ No GPU detected - using CPU (training will be slow)")
    except Exception as e:
        logger.warning(f"Could not get GPU info: {e}")
    
    # TODO: Pre-load models here for faster inference
    # await load_sign_language_model()
    # await load_whisper_model()


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down application...")
    # TODO: Cleanup resources

