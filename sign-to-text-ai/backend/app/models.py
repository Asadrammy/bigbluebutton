from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum


class Language(str, Enum):
    GERMAN = "de"
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    ARABIC = "ar"


class SignLanguage(str, Enum):
    DGS = "DGS"  # German Sign Language


# Request Models
class SignToTextRequest(BaseModel):
    video_frames: List[str] = Field(..., description="Base64 encoded video frames")
    sign_language: SignLanguage = Field(default=SignLanguage.DGS)
    use_mediapipe: Optional[bool] = Field(
        default=None, 
        description="Use MediaPipe for landmark extraction (architecture-compliant). If None, auto-selects best available method."
    )


class SpeechToTextRequest(BaseModel):
    audio_data: str = Field(..., description="Base64 encoded audio data")
    language: Optional[Language] = Field(None, description="Source language (auto-detect if not provided)")


class TextToSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    target_language: Language = Field(default=Language.GERMAN)


class TextToSignRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    source_language: Language = Field(default=Language.GERMAN)
    sign_language: SignLanguage = Field(default=SignLanguage.DGS)


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: Language
    target_lang: Language


# Response Models
class SignToTextResponse(BaseModel):
    text: str
    language: Language
    confidence: float = Field(..., ge=0.0, le=1.0)
    method: Optional[str] = Field(None, description="Recognition method used: 'mediapipe' or '3dcnn'")
    inference_time: Optional[float] = Field(None, description="Inference time in seconds")
    frames_processed: Optional[int] = Field(None, description="Number of frames processed")


class SpeechToTextResponse(BaseModel):
    text: str
    language: Language
    confidence: float = Field(..., ge=0.0, le=1.0)


class TextToSpeechResponse(BaseModel):
    audio_url: Optional[str] = None
    audio_data: Optional[str] = None  # Base64 encoded audio


class BoneTransform(BaseModel):
    name: str
    position: List[float] = Field(..., min_items=3, max_items=3)
    rotation: List[float] = Field(..., min_items=4, max_items=4)  # Quaternion
    scale: List[float] = Field(..., min_items=3, max_items=3)


class Keyframe(BaseModel):
    time: float
    bones: List[BoneTransform]


class AnimationData(BaseModel):
    duration: float
    keyframes: List[Keyframe]
    format: Literal["gltf", "json"]


class TextToSignResponse(BaseModel):
    animation_data: Optional[AnimationData] = None
    video_url: Optional[str] = None


class TranslationResponse(BaseModel):
    translated_text: str
    source_lang: Language
    target_lang: Language


# Error Response
class ErrorResponse(BaseModel):
    message: str
    code: str
    details: Optional[dict] = None

