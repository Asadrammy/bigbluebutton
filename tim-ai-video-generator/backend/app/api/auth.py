"""
Authentication API endpoints
Register, Login, Forgot Password, Change Password, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from typing import Optional

from app.database import get_db
from app.db_models import User
from app import crud
from app.auth.models import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
)
from app.auth.utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
)
from app.auth.dependencies import get_current_active_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class TranslatorDefaults(BaseModel):
    sign_to_text_language: Optional[str] = None
    speech_to_sign_spoken_language: Optional[str] = None
    speech_to_sign_sign_language: Optional[str] = None
    text_source_language: Optional[str] = None
    text_target_language: Optional[str] = None


class UserSettingsRequest(BaseModel):
    preferred_language: Optional[str] = None
    sign_language: Optional[str] = None
    video_quality: Optional[str] = None
    audio_quality: Optional[str] = None
    translator_defaults: Optional[TranslatorDefaults] = None


class UserSettingsResponse(BaseModel):
    preferred_language: str
    sign_language: str
    video_quality: str
    audio_quality: str
    translator_defaults: Optional[TranslatorDefaults] = None
    extra_settings: dict | None = None



@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user
    """
    logger.info(f"Registration attempt for email: {user_data.email}")
    
    # Check if user already exists
    result = await db.execute(
        select(User).where(
            (User.email == user_data.email) | (User.username == user_data.username)
        )
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        preferred_language=user_data.preferred_language,
        sign_language=user_data.sign_language,
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create tokens
    access_token = create_access_token({"sub": new_user.id, "email": new_user.email})
    refresh_token = create_refresh_token({"sub": new_user.id})
    
    logger.info(f"User registered successfully: {new_user.id}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            preferred_language=new_user.preferred_language,
            sign_language=new_user.sign_language,
            created_at=new_user.created_at.isoformat(),
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login user with email and password
    """
    logger.info(f"Login attempt for email: {credentials.email}")
    
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})
    
    logger.info(f"User logged in successfully: {user.id}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            preferred_language=user.preferred_language,
            sign_language=user.sign_language,
            created_at=user.created_at.isoformat(),
        )
    )


@router.post("/refresh")
async def refresh_token(payload: RefreshRequest, authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using a valid refresh token.
    Expects: { "refresh_token": "<token>" }
    Returns: { access_token, refresh_token, expires_in }
    """
    refresh_token_str = payload.refresh_token
    # Support passing the refresh token via Authorization header as Bearer <token>
    if not refresh_token_str and authorization and authorization.lower().startswith("bearer "):
        refresh_token_str = authorization.split(" ", 1)[1].strip()
    if not refresh_token_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token is required")

    # Try decode and log specific errors
    from jose import JWTError, jwt
    from app.auth.utils import SECRET_KEY, ALGORITHM
    try:
        decoded = jwt.decode(refresh_token_str, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        import logging
        logging.getLogger(__name__).warning(f"Refresh decode failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    token_type = decoded.get("type")
    if token_type not in ("refresh", "access"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unsupported token type")

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    # Ensure user still exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Issue new tokens
    new_access = create_access_token({"sub": user.id, "email": user.email})
    new_refresh = create_refresh_token({"sub": user.id})

    # Match mobile expectation: include expires_in (seconds)
    from app.auth.utils import ACCESS_TOKEN_EXPIRE_MINUTES
    expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "expires_in": expires_in,
    }


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Request password reset
    Sends reset token to user's email
    """
    logger.info(f"Forgot password request for: {request.email}")
    
    # Find user
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    # Always return success even if user doesn't exist (security best practice)
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {request.email}")
        return {
            "message": "If your email is registered, you will receive a password reset link"
        }
    
    # Create reset token
    reset_token = create_reset_token()
    user.reset_token = reset_token
    user.reset_token_created_at = datetime.utcnow()
    
    await db.commit()
    
    # TODO: Send email with reset token
    # For now, we'll just log it (in production, send email)
    logger.info(f"Password reset token for {user.email}: {reset_token}")
    
    # In development, return the token (REMOVE IN PRODUCTION!)
    return {
        "message": "If your email is registered, you will receive a password reset link",
        "debug_token": reset_token  # REMOVE IN PRODUCTION
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Reset password with token
    """
    logger.info("Password reset attempt")
    
    # Find user with this reset token
    result = await db.execute(select(User).where(User.reset_token == request.token))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Verify token is not expired
    from app.auth.utils import verify_reset_token
    if not verify_reset_token(request.token, user.reset_token, user.reset_token_created_at):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    user.reset_token = None
    user.reset_token_created_at = None
    
    await db.commit()
    
    logger.info(f"Password reset successfully for user: {user.id}")
    
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change password for authenticated user
    """
    logger.info(f"Password change request for user: {current_user.id}")
    
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = hash_password(request.new_password)
    await db.commit()
    
    logger.info(f"Password changed successfully for user: {current_user.id}")
    
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user info
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        preferred_language=current_user.preferred_language,
        sign_language=current_user.sign_language,
        created_at=current_user.created_at.isoformat(),
    )


def _serialize_user_settings(user: User, settings) -> UserSettingsResponse:
    extra = settings.extra_settings or {}
    translator_defaults_data = extra.get("translator_defaults", {})
    translator_defaults = None
    if any(translator_defaults_data.values()):
        translator_defaults = TranslatorDefaults(**translator_defaults_data)

    return UserSettingsResponse(
        preferred_language=user.preferred_language,
        sign_language=user.sign_language,
        video_quality=settings.video_quality,
        audio_quality=settings.audio_quality,
        translator_defaults=translator_defaults,
        extra_settings=extra,
    )


@router.get("/settings", response_model=UserSettingsResponse)
async def get_user_settings_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    settings = await crud.get_user_settings(db, current_user.id)
    if not settings:
        settings = await crud.update_user_settings(db, current_user.id, {})
    return _serialize_user_settings(current_user, settings)


@router.put("/settings", response_model=UserSettingsResponse)
async def update_user_settings_endpoint(
    payload: UserSettingsRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    data = payload.dict(exclude_unset=True)

    user_updates = {}
    if "preferred_language" in data:
        user_updates["preferred_language"] = data.pop("preferred_language")
    if "sign_language" in data:
        user_updates["sign_language"] = data.pop("sign_language")

    if user_updates:
        for key, value in user_updates.items():
            setattr(current_user, key, value)
        await db.commit()
        await db.refresh(current_user)

    translator_defaults = data.pop("translator_defaults", None)
    if translator_defaults:
        settings = await crud.get_user_settings(db, current_user.id)
        if not settings:
            settings = await crud.update_user_settings(db, current_user.id, {})
        extra_settings = settings.extra_settings or {}
        existing_defaults = extra_settings.get("translator_defaults", {})
        merged_defaults = {**existing_defaults, **translator_defaults.model_dump(exclude_none=True)}
        extra_settings["translator_defaults"] = merged_defaults
        data["extra_settings"] = extra_settings

    settings = await crud.update_user_settings(db, current_user.id, data)
    return _serialize_user_settings(current_user, settings)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile information
    """
    logger.info(f"Profile update request for user: {current_user.id}")
    
    # Check if email or username is being changed and if it's already taken
    if profile_data.email and profile_data.email != current_user.email:
        result = await db.execute(select(User).where(User.email == profile_data.email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    if profile_data.username and profile_data.username != current_user.username:
        result = await db.execute(select(User).where(User.username == profile_data.username))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update user fields
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name
    if profile_data.email is not None:
        current_user.email = profile_data.email
    if profile_data.username is not None:
        current_user.username = profile_data.username
    if profile_data.preferred_language is not None:
        current_user.preferred_language = profile_data.preferred_language
    if profile_data.sign_language is not None:
        current_user.sign_language = profile_data.sign_language
    
    await db.commit()
    await db.refresh(current_user)
    
    logger.info(f"Profile updated successfully for user: {current_user.id}")
    
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        preferred_language=current_user.preferred_language,
        sign_language="DGS",
        created_at=current_user.created_at.isoformat(),
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout user (client should delete tokens)
    """
    logger.info(f"User logged out: {current_user.id}")
    
    # In a more advanced setup, you might want to blacklist the token
    # For now, client-side token deletion is sufficient
    
    return {"message": "Logged out successfully"}

