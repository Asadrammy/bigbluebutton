"""
Database models (SQLAlchemy ORM)
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SignLanguage(Base):
    """Registry of supported sign languages"""
    __tablename__ = "sign_languages"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)  # e.g., DGS, ASL
    name = Column(String, nullable=False)
    region = Column(String, nullable=True)  # Geographic/linguistic grouping
    country_codes = Column(JSON, default=[])  # ["DE", "AT", ...]
    is_active = Column(Boolean, default=True)
    dataset_source = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    models = relationship("SignLanguageModel", back_populates="sign_language")


class SignLanguageModel(Base):
    """Map sign languages to deployed model versions"""
    __tablename__ = "sign_language_models"

    id = Column(Integer, primary_key=True, index=True)
    sign_language_id = Column(Integer, ForeignKey("sign_languages.id"), nullable=False)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    model_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    accuracy = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    sign_language = relationship("SignLanguage", back_populates="models")
    model_version = relationship("ModelVersion", backref="sign_language_models")


class User(Base):
    """User accounts with authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_created_at = Column(DateTime(timezone=True), nullable=True)
    
    # Preferences
    preferred_language = Column(String, default="de")
    sign_language = Column(String, default="DGS")
    
    # Relationships
    translations = relationship("TranslationHistory", back_populates="user")
    settings = relationship("UserSettings", back_populates="user", uselist=False)


class UserSettings(Base):
    """User preferences and settings"""
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    preferred_language = Column(String, default="de")
    sign_language = Column(String, default="DGS")
    video_quality = Column(String, default="high")
    audio_quality = Column(String, default="high")
    
    # JSON field for additional settings
    extra_settings = Column(JSON, default={})
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="settings")


class TranslationHistory(Base):
    """Store translation history for analytics and quick retrieval"""
    __tablename__ = "translation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Translation details
    source_text = Column(Text, nullable=False)
    target_text = Column(Text, nullable=False)
    source_language = Column(String, nullable=False)
    target_language = Column(String, nullable=False)
    translation_type = Column(String)  # "text", "speech", "sign"
    
    # Metadata
    confidence = Column(Float, nullable=True)
    processing_time = Column(Float, nullable=True)  # seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="translations")


class SignDictionary(Base):
    """Dictionary of sign language gestures"""
    __tablename__ = "sign_dictionary"

    id = Column(Integer, primary_key=True, index=True)
    
    # Word/phrase
    word = Column(String, nullable=False, index=True)
    language = Column(String, default="de")  # German word
    sign_language = Column(String, default="DGS")
    
    # Animation data
    animation_data = Column(JSON, nullable=True)  # Keyframe data
    video_url = Column(String, nullable=True)  # Or video URL
    asset_path = Column(String, nullable=True)  # Path to GLTF/JSON file
    is_fallback = Column(Boolean, default=False)
    source = Column(String, default="filesystem")
    meta_data = Column("metadata", JSON, default={})

    # Metadata
    category = Column(String, nullable=True)  # greeting, question, etc.
    difficulty = Column(String, nullable=True)  # basic, intermediate, advanced
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CachedTranslation(Base):
    """Cache for frequently used translations"""
    __tablename__ = "cached_translations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Cache key (hash of source text + languages)
    cache_key = Column(String, unique=True, index=True, nullable=False)
    
    # Translation
    source_text = Column(Text, nullable=False)
    target_text = Column(Text, nullable=False)
    source_language = Column(String, nullable=False)
    target_language = Column(String, nullable=False)
    
    # Cache metadata
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)


class AppAnalytics(Base):
    """Track app usage and performance"""
    __tablename__ = "app_analytics"

    id = Column(Integer, primary_key=True, index=True)
    
    # Event details
    event_type = Column(String, nullable=False)  # "translation", "sign_recognition", etc.
    endpoint = Column(String, nullable=True)
    
    # Performance
    processing_time = Column(Float, nullable=True)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Metadata
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_metadata = Column(JSON, default={})  # Renamed from 'metadata' (reserved word)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ErrorLog(Base):
    """Store error logs for debugging"""
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Error details
    error_type = Column(String, nullable=False)
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    
    # Context
    endpoint = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    request_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved = Column(Boolean, default=False)


# ============================================================================
# BigBlueButton Meeting Tables
# ============================================================================

class Meeting(Base):
    """Track BigBlueButton meetings created through the platform"""
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)

    # Meeting identification
    meeting_id = Column(String, unique=True, index=True, nullable=False)
    meeting_name = Column(String, nullable=False)

    # Passwords
    attendee_password = Column(String, default="ap")
    moderator_password = Column(String, default="mp")

    # Configuration
    max_participants = Column(Integer, default=50)
    is_recorded = Column(Boolean, default=False)
    welcome_message = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    meeting_metadata = Column(JSON, default={})


# ============================================================================
# ML Training Tables (Phase 1.3)
# ============================================================================

class TrainingDataset(Base):
    """Manage ML training datasets for sign language recognition"""
    __tablename__ = "training_datasets"

    id = Column(Integer, primary_key=True, index=True)
    
    # Dataset info
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    sign_language = Column(String, nullable=True)  # e.g., DGS, ASL
    
    # Statistics
    video_count = Column(Integer, default=0)
    sign_count = Column(Integer, default=0)  # Number of unique signs
    total_frames = Column(Integer, default=0)
    
    # Split information
    train_split = Column(Float, default=0.7)  # 70% for training
    val_split = Column(Float, default=0.15)   # 15% for validation
    test_split = Column(Float, default=0.15)  # 15% for testing
    
    # Sign labels (list of signs in this dataset)
    sign_labels = Column(JSON, default=[])  # ["HALLO", "DANKE", etc.]
    
    # Dataset metadata
    source = Column(String, nullable=True)  # "user_uploaded", "public_dataset", etc.
    version = Column(String, default="1.0")
    is_public = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    model_versions = relationship("ModelVersion", back_populates="dataset")
    training_jobs = relationship("TrainingJob", back_populates="dataset")


class ModelVersion(Base):
    """Track versions of trained ML models"""
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Model identification
    name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # "I3D", "LSTM_CNN", "Transformer"
    
    # Model file location
    model_path = Column(String, nullable=False)  # Path to saved model weights
    config_path = Column(String, nullable=True)  # Path to model config
    
    # Training dataset
    training_dataset_id = Column(Integer, ForeignKey("training_datasets.id"), nullable=False)
    
    # Performance metrics
    accuracy = Column(Float, nullable=True)
    val_accuracy = Column(Float, nullable=True)
    test_accuracy = Column(Float, nullable=True)
    loss = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    
    # Training details
    epochs_trained = Column(Integer, nullable=True)
    training_duration = Column(Float, nullable=True)  # seconds
    hyperparameters = Column(JSON, default={})  # learning_rate, batch_size, etc.
    
    # Model metadata
    num_classes = Column(Integer, nullable=True)  # Number of sign classes
    input_shape = Column(JSON, nullable=True)  # [frames, height, width, channels]
    model_size_mb = Column(Float, nullable=True)
    sign_language_code = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=False)  # Active/deployed model
    is_deployed = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    dataset = relationship("TrainingDataset", back_populates="model_versions")


class TrainingJob(Base):
    """Track ML model training jobs"""
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Job identification
    job_name = Column(String, nullable=False)
    job_id = Column(String, unique=True, index=True, nullable=False)  # UUID
    
    # Dataset
    dataset_id = Column(Integer, ForeignKey("training_datasets.id"), nullable=False)
    sign_language_code = Column(String, nullable=True)
    
    # Model configuration
    model_type = Column(String, nullable=False)  # "I3D", "LSTM_CNN", etc.
    model_config = Column(JSON, default={})
    
    # Training status
    status = Column(String, default="pending")  # pending, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)  # 0-100%
    
    # Training progress
    current_epoch = Column(Integer, default=0)
    total_epochs = Column(Integer, nullable=False)
    
    # Metrics (updated during training)
    current_loss = Column(Float, nullable=True)
    current_accuracy = Column(Float, nullable=True)
    val_loss = Column(Float, nullable=True)
    val_accuracy = Column(Float, nullable=True)
    best_accuracy = Column(Float, nullable=True)
    
    # Training history (metrics per epoch)
    training_history = Column(JSON, default={})  # {"epoch": 1, "loss": 0.5, ...}
    
    # Resource usage
    gpu_used = Column(Boolean, default=False)
    memory_usage_mb = Column(Float, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)
    
    # Resulting model
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # User
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    dataset = relationship("TrainingDataset", back_populates="training_jobs")

