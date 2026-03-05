"""
Translation History API Endpoints
Manage user translation history
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.db_models import TranslationHistory, User
from app.auth.dependencies import get_current_user
from pydantic import BaseModel, Field


router = APIRouter()


# ============================================================================
# Pydantic Models
# ============================================================================

class TranslationHistoryCreate(BaseModel):
    """Create translation history entry"""
    source_text: str = Field(..., min_length=1, max_length=10000)
    target_text: str = Field(..., min_length=1, max_length=10000)
    source_language: str = Field(..., min_length=2, max_length=10)
    target_language: str = Field(..., min_length=2, max_length=10)
    translation_type: str = Field(..., pattern="^(text|speech|sign)$")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    processing_time: Optional[float] = Field(None, ge=0.0)


class TranslationHistoryResponse(BaseModel):
    """Translation history item response"""
    id: int
    source_text: str
    target_text: str
    source_language: str
    target_language: str
    translation_type: str
    confidence: Optional[float]
    processing_time: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class TranslationHistoryListResponse(BaseModel):
    """Paginated history list response"""
    items: List[TranslationHistoryResponse]
    total: int
    page: int
    per_page: int
    pages: int


class HistoryStatsResponse(BaseModel):
    """User history statistics"""
    total_translations: int
    total_by_type: dict
    total_by_language: dict
    avg_confidence: Optional[float]
    avg_processing_time: Optional[float]


# ============================================================================
# API Endpoints
# ============================================================================

@router.post(
    "/save",
    response_model=TranslationHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save translation to history"
)
async def save_translation(
    data: TranslationHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Save a translation to user's history
    
    - **source_text**: Original text/speech/sign
    - **target_text**: Translated result
    - **source_language**: Source language code (de, en, es, fr, ar, DGS)
    - **target_language**: Target language code
    - **translation_type**: Type of translation (text, speech, sign)
    - **confidence**: Optional confidence score (0.0 - 1.0)
    - **processing_time**: Optional processing time in seconds
    """
    try:
        # Create history entry
        history_entry = TranslationHistory(
            user_id=current_user.id,
            source_text=data.source_text,
            target_text=data.target_text,
            source_language=data.source_language,
            target_language=data.target_language,
            translation_type=data.translation_type,
            confidence=data.confidence,
            processing_time=data.processing_time,
        )
        
        db.add(history_entry)
        await db.commit()
        await db.refresh(history_entry)
        
        return history_entry
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save translation history: {str(e)}"
        )


@router.get(
    "/list",
    response_model=TranslationHistoryListResponse,
    summary="Get translation history"
)
async def get_translation_history(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    translation_type: Optional[str] = Query(None, description="Filter by type (text, speech, sign)"),
    language: Optional[str] = Query(None, description="Filter by source or target language"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated translation history for the current user
    
    - **page**: Page number (default: 1)
    - **per_page**: Items per page (default: 20, max: 100)
    - **translation_type**: Filter by translation type (optional)
    - **language**: Filter by language code (optional)
    
    Returns items sorted by most recent first
    """
    try:
        # Build query
        query = select(TranslationHistory).where(
            TranslationHistory.user_id == current_user.id
        )
        
        # Apply filters
        if translation_type:
            query = query.where(TranslationHistory.translation_type == translation_type)
        
        if language:
            query = query.where(
                (TranslationHistory.source_language == language) |
                (TranslationHistory.target_language == language)
            )
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar() or 0
        
        # Calculate pagination
        total_pages = (total + per_page - 1) // per_page
        offset = (page - 1) * per_page
        
        # Get paginated results
        query = query.order_by(desc(TranslationHistory.created_at)).offset(offset).limit(per_page)
        result = await db.execute(query)
        items = result.scalars().all()
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": total_pages,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch translation history: {str(e)}"
        )


@router.get(
    "/{history_id}",
    response_model=TranslationHistoryResponse,
    summary="Get single history item"
)
async def get_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific translation history item by ID
    
    - **history_id**: History entry ID
    """
    try:
        query = select(TranslationHistory).where(
            TranslationHistory.id == history_id,
            TranslationHistory.user_id == current_user.id
        )
        result = await db.execute(query)
        history_item = result.scalar_one_or_none()
        
        if not history_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )
        
        return history_item
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history item: {str(e)}"
        )


@router.delete(
    "/{history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete history item"
)
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific translation history item
    
    - **history_id**: History entry ID to delete
    """
    try:
        # Check if item exists and belongs to user
        query = select(TranslationHistory).where(
            TranslationHistory.id == history_id,
            TranslationHistory.user_id == current_user.id
        )
        result = await db.execute(query)
        history_item = result.scalar_one_or_none()
        
        if not history_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )
        
        # Delete the item
        await db.delete(history_item)
        await db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete history item: {str(e)}"
        )


@router.delete(
    "/clear-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear all history"
)
async def clear_all_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete all translation history for the current user
    
    **Warning:** This action cannot be undone!
    """
    try:
        # Delete all history for user
        query = delete(TranslationHistory).where(
            TranslationHistory.user_id == current_user.id
        )
        await db.execute(query)
        await db.commit()
        
        return None
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear history: {str(e)}"
        )


@router.get(
    "/stats/overview",
    response_model=HistoryStatsResponse,
    summary="Get history statistics"
)
async def get_history_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about user's translation history
    
    Returns:
    - Total number of translations
    - Breakdown by translation type
    - Breakdown by language
    - Average confidence score
    - Average processing time
    """
    try:
        query = select(TranslationHistory).where(
            TranslationHistory.user_id == current_user.id
        )
        result = await db.execute(query)
        history_items = result.scalars().all()
        
        # Calculate statistics
        total_translations = len(history_items)
        
        # By type
        total_by_type = {}
        for item in history_items:
            type_key = item.translation_type
            total_by_type[type_key] = total_by_type.get(type_key, 0) + 1
        
        # By language (source languages)
        total_by_language = {}
        for item in history_items:
            lang_key = item.source_language
            total_by_language[lang_key] = total_by_language.get(lang_key, 0) + 1
        
        # Average confidence
        confidences = [item.confidence for item in history_items if item.confidence is not None]
        avg_confidence = sum(confidences) / len(confidences) if confidences else None
        
        # Average processing time
        times = [item.processing_time for item in history_items if item.processing_time is not None]
        avg_processing_time = sum(times) / len(times) if times else None
        
        return {
            "total_translations": total_translations,
            "total_by_type": total_by_type,
            "total_by_language": total_by_language,
            "avg_confidence": avg_confidence,
            "avg_processing_time": avg_processing_time,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history statistics: {str(e)}"
        )

