"""
CRUD operations (Create, Read, Update, Delete)
Database operations for all models
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from typing import Optional, List
import hashlib

from app.db_models import (
    User, UserSettings, TranslationHistory, 
    SignDictionary, CachedTranslation, AppAnalytics
)


# ============== User Operations ==============

async def create_user(db: AsyncSession, username: str, email: Optional[str] = None) -> User:
    """Create a new user"""
    user = User(username=username, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get user by ID"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """Get user by username"""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


# ============== Settings Operations ==============

async def get_user_settings(db: AsyncSession, user_id: int) -> Optional[UserSettings]:
    """Get user settings"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_user_settings(
    db: AsyncSession, 
    user_id: int, 
    settings_data: dict
) -> UserSettings:
    """Update user settings"""
    settings = await get_user_settings(db, user_id)
    
    if not settings:
        # Create new settings
        settings = UserSettings(user_id=user_id, **settings_data)
        db.add(settings)
    else:
        # Update existing settings
        for key, value in settings_data.items():
            setattr(settings, key, value)
    
    await db.commit()
    await db.refresh(settings)
    return settings


# ============== Translation History ==============

async def create_translation_history(
    db: AsyncSession,
    source_text: str,
    target_text: str,
    source_language: str,
    target_language: str,
    translation_type: str = "text",
    user_id: Optional[int] = None,
    confidence: Optional[float] = None,
    processing_time: Optional[float] = None,
) -> TranslationHistory:
    """Save translation to history"""
    history = TranslationHistory(
        user_id=user_id,
        source_text=source_text,
        target_text=target_text,
        source_language=source_language,
        target_language=target_language,
        translation_type=translation_type,
        confidence=confidence,
        processing_time=processing_time,
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)
    return history


async def get_user_translation_history(
    db: AsyncSession,
    user_id: int,
    limit: int = 50
) -> List[TranslationHistory]:
    """Get user's translation history"""
    result = await db.execute(
        select(TranslationHistory)
        .where(TranslationHistory.user_id == user_id)
        .order_by(TranslationHistory.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# ============== Sign Dictionary ==============

async def get_sign_by_word(
    db: AsyncSession,
    word: str,
    sign_language: str = "DGS"
) -> Optional[SignDictionary]:
    """Get sign animation for a word"""
    result = await db.execute(
        select(SignDictionary)
        .where(
            SignDictionary.word == word.lower(),
            SignDictionary.sign_language == sign_language
        )
    )
    sign = result.scalar_one_or_none()
    
    # Increment usage count
    if sign:
        sign.usage_count += 1
        await db.commit()
    
    return sign


async def create_sign(
    db: AsyncSession,
    word: str,
    animation_data: dict,
    language: str = "de",
    sign_language: str = "DGS",
    **kwargs
) -> SignDictionary:
    """Add a new sign to dictionary"""
    sign = SignDictionary(
        word=word.lower(),
        language=language,
        sign_language=sign_language,
        animation_data=animation_data,
        **kwargs
    )
    db.add(sign)
    await db.commit()
    await db.refresh(sign)
    return sign


async def get_all_signs(db: AsyncSession, sign_language: str = "DGS") -> List[SignDictionary]:
    """Get all signs in dictionary"""
    result = await db.execute(
        select(SignDictionary)
        .where(SignDictionary.sign_language == sign_language)
        .order_by(SignDictionary.word)
    )
    return result.scalars().all()


# ============== Cached Translations ==============

def _generate_cache_key(source_text: str, source_lang: str, target_lang: str) -> str:
    """Generate cache key from translation parameters"""
    key_string = f"{source_text}:{source_lang}:{target_lang}"
    return hashlib.md5(key_string.encode()).hexdigest()


async def get_cached_translation(
    db: AsyncSession,
    source_text: str,
    source_lang: str,
    target_lang: str
) -> Optional[str]:
    """Get cached translation if exists"""
    cache_key = _generate_cache_key(source_text, source_lang, target_lang)
    
    result = await db.execute(
        select(CachedTranslation).where(CachedTranslation.cache_key == cache_key)
    )
    cached = result.scalar_one_or_none()
    
    if cached:
        # Update hit count and last accessed
        cached.hit_count += 1
        await db.commit()
        return cached.target_text
    
    return None


async def cache_translation(
    db: AsyncSession,
    source_text: str,
    target_text: str,
    source_lang: str,
    target_lang: str
) -> CachedTranslation:
    """Cache a translation"""
    cache_key = _generate_cache_key(source_text, source_lang, target_lang)
    
    cached = CachedTranslation(
        cache_key=cache_key,
        source_text=source_text,
        target_text=target_text,
        source_language=source_lang,
        target_language=target_lang,
    )
    db.add(cached)
    await db.commit()
    await db.refresh(cached)
    return cached


# ============== Analytics ==============

async def log_event(
    db: AsyncSession,
    event_type: str,
    processing_time: Optional[float] = None,
    success: bool = True,
    **kwargs
) -> AppAnalytics:
    """Log an analytics event"""
    event = AppAnalytics(
        event_type=event_type,
        processing_time=processing_time,
        success=success,
        **kwargs
    )
    db.add(event)
    await db.commit()
    return event


async def get_analytics(
    db: AsyncSession,
    event_type: Optional[str] = None,
    limit: int = 100
):
    """Get analytics data"""
    query = select(AppAnalytics).order_by(AppAnalytics.created_at.desc())
    
    if event_type:
        query = query.where(AppAnalytics.event_type == event_type)
    
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

