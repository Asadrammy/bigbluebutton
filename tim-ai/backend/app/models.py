from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Literal
from enum import Enum


class Language(str, Enum):
    GERMAN = "de"
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    ARABIC = "ar"


class SignLanguage(str, Enum):
    DGS = "DGS"  # German Sign Language
    ASL = "ASL"  # American Sign Language
    JSL = "JSL"  # Japanese Sign Language
    ÖGS = "ÖGS"  # Austrian Sign Language
    DSGS = "DSGS"  # Swiss German Sign Language
    LSF = "LSF"  # French Sign Language
    LSFB = "LSFB"  # French Belgian Sign Language
    LSL = "LSL"  # Luxemburgish Sign Language
    LSR = "LSR"  # Swiss French Sign Language
    BSL = "BSL"  # British Sign Language
    ISL = "ISL"  # Irish Sign Language
    NGT = "NGT"  # Dutch Sign Language
    VGT = "VGT"  # Flemish Sign Language
    LSE = "LSE"  # Spanish Sign Language
    LSC = "LSC"  # Catalan Sign Language
    LSCV = "LSCV"  # Valencian Sign Language
    LGP = "LGP"  # Portuguese Sign Language
    LIS = "LIS"  # Italian Sign Language
    SMSL = "SMSL"  # San Marino Sign Language
    STS = "STS"  # Swedish Sign Language
    FSL = "FSL"  # Finnish Sign Language
    FSGL = "FSGL"  # Finnish-Swedish Sign Language
    NSL = "NSL"  # Norwegian Sign Language
    DTS = "DTS"  # Danish Sign Language
    ÍTM = "ÍTM"  # Icelandic Sign Language
    PJM = "PJM"  # Polish Sign Language
    ČZJ = "ČZJ"  # Czech Sign Language
    SPJ = "SPJ"  # Slovak Sign Language
    MJNY = "MJNY"  # Hungarian Sign Language
    RSL_RO = "RSL-RO"  # Romanian Sign Language
    BSL_BG = "BSL-BG"  # Bulgarian Sign Language
    GSL = "GSL"  # Greek Sign Language
    TID = "TID"  # Turkish Sign Language
    RSL = "RSL"  # Russian Sign Language
    USL = "USL"  # Ukrainian Sign Language
    BSL_BY = "BSL-BY"  # Belarusian Sign Language
    LSL_LT = "LSL-LT"  # Lithuanian Sign Language
    LSL_LV = "LSL-LV"  # Latvian Sign Language
    ESL = "ESL"  # Estonian Sign Language
    SSL = "SSL"  # Swedish (Alt)
    OGS = "OGS"  # Austrian (Alt)


# Request Models
class SignToTextRequest(BaseModel):
    video_frames: List[str] = Field(..., description="Base64 encoded video frames")
    sign_language: SignLanguage = Field(default=SignLanguage.DGS)


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


class ResolvedSign(BaseModel):
    token: str
    sign_language: SignLanguage
    source: Literal["database", "filesystem", "default", "fingerspelling"]
    is_fallback: bool = False
    asset_path: Optional[str] = None
    letter: Optional[str] = None
    letters: Optional[List[str]] = None
    description: Optional[str] = None


class TextToSignResponse(BaseModel):
    animation_data: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None
    sign_language: SignLanguage = Field(default=SignLanguage.DGS)
    resolved_signs: List[ResolvedSign] = Field(default_factory=list)


class TranslationResponse(BaseModel):
    translated_text: str
    source_lang: Language
    target_lang: Language


# Error Response
class ErrorResponse(BaseModel):
    message: str
    code: str
    details: Optional[dict] = None

