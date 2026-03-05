from pydantic_settings import BaseSettings
from typing import List, Dict
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "Sign Language Translator API"
    app_version: str = "1.0.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS (no wildcard in production; add origins via env ALLOWED_ORIGINS if needed)
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19000",
        "http://localhost:19006",
        "http://localhost:8000",  # For frontend served from same directory
        "http://127.0.0.1:8000",  # Alternative localhost
        "https://sign.tim-ai.com",  # Production + BBB iframe embedding
    ]
    frontend_url: str = "http://localhost:3000"
    hetzner_project_id: str | None = None
    hetzner_api_token: str | None = None
    hetzner_server_name: str | None = None
    hetzner_domain: str | None = None
    hetzner_ssl_email: str | None = None

    # Models
    sign_language_model_path: str = "./models/sign_language_model.h5"
    sign_language_models: Dict[str, str] = {
        "DGS": "./models/DGS/best_model.pth",
        "ASL": "./models/ASL/best_model.pth",
        "BSL": "./models/BSL/best_model.pth",
        "LSF": "./models/LSF/best_model.pth",
        "LIS": "./models/LIS/best_model.pth",
        "LSE": "./models/LSE/best_model.pth",
        "NGT": "./models/NGT/best_model.pth",
        "OGS": "./models/OGS/best_model.pth",
        "SSL": "./models/SSL/best_model.pth",
    }
    model_cache_size: int = 5
    whisper_model_size: str = "tiny"  # tiny, base, small, medium, large

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/signlanguage"
    
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

