from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "Sign Language Translator API"
    app_version: str = "1.0.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8000"))  # Allow PORT override via .env

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS - Allow all origins for mobile app development (restrict in production)
    # Note: "*" means allow all origins (handled specially in main.py)
    allowed_origins: List[str] = [
        "*",  # Allow all origins for mobile app compatibility
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19000",
        "http://localhost:19006",
    ]

    # Models
    sign_language_model_path: str = "./models/sign_language_model.h5"
    whisper_model_size: str = "small"  # tiny, base, small, medium, large (RECOMMENDED: small)
    nllb_model_size: str = "nllb-200-distilled-600M"  # RECOMMENDED: distilled-600M (lightweight)
    tts_model: str = "tts_models/de/thorsten/tacotron2-DDC"  # Coqui TTS German model

    # Database
    database_url: str = "sqlite+aiosqlite:///./signlanguage.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379"

    # File Upload
    max_file_size: int = 10485760  # 10MB
    upload_dir: str = "./uploads"

    # Paths
    base_dir: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir: str = os.path.join(base_dir, "models")
    avatar_dir: str = os.path.join(base_dir, "avatar")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Create necessary directories
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.models_dir, exist_ok=True)
os.makedirs(settings.avatar_dir, exist_ok=True)

