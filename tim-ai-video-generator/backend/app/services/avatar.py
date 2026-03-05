"""
Avatar animation service for sign language
Generates 3D animations from text or sign labels
"""
import logging
import json
import re
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

from app.ml.avatar_config import (
    BoneType, BoneTransform, Keyframe, AnimationClip, AvatarConfig
)
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db_models import SignDictionary
from app.models import Language, SignLanguage, ResolvedSign

logger = logging.getLogger(__name__)


class AvatarAnimationService:
    """
    Service for generating 3D avatar animations for sign language
    """
    
    def __init__(self, sign_database_path: Optional[str] = None):
        """
        Initialize avatar animation service
        
        Args:
            sign_database_path: Path to sign language animation database
        """
        self.sign_database_path = sign_database_path or "data/sign_mappings.json"
        self.sign_database = self._load_sign_database()
        self.avatar_config = AvatarConfig()
        self.base_avatar_dir = Path(settings.avatar_dir)
        self.base_avatar_dir.mkdir(parents=True, exist_ok=True)
        self.language_cache: Dict[str, Dict[str, Any]] = {}
        self.fingerspelling_cache: Dict[str, Dict[str, Any]] = {}
        self.default_sign_language = SignLanguage.DGS
        
        logger.info(
            "Avatar animation service initialized with %d default signs (assets dir: %s)",
            len(self.sign_database),
            self.base_avatar_dir
        )
    
    def _load_sign_database(self) -> Dict:
        """Load sign language animation database"""
        sign_db_path = Path(self.sign_database_path)
        
        if sign_db_path.exists():
            try:
                with open(sign_db_path, 'r', encoding='utf-8') as f:
                    database = json.load(f)
                    logger.info(f"Loaded {len(database)} signs from database")
                    return database
            except Exception as e:
                logger.warning(f"Failed to load sign database: {e}")
        
        # Return default/mock database
        return self._create_default_sign_database()
    
    def _create_default_sign_database(self) -> Dict:
        """Create default sign database with common signs"""
        # This is a simplified database - in production, this would be much more comprehensive
        return {
            "hallo": {
                "name": "Hallo",
                "description": "Greeting sign - wave hand",
                "duration": 1.5,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.5,
                        "bone": "rightHand",
                        "position": [0.4, 1.3, -0.2],
                        "rotation": [0.0, 0.0, 0.3, 0.95]
                    },
                    {
                        "time": 1.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, -0.3, 0.95]
                    },
                    {
                        "time": 1.5,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "danke": {
                "name": "Danke",
                "description": "Thank you - hand to chin",
                "duration": 1.0,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.1, 1.5, -0.1],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.5,
                        "bone": "rightHand",
                        "position": [0.2, 1.4, -0.2],
                        "rotation": [0.3, 0.0, 0.0, 0.95]
                    },
                    {
                        "time": 1.0,
                        "bone": "rightHand",
                        "position": [0.1, 1.5, -0.1],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "bitte": {
                "name": "Bitte",
                "description": "Please - open palm gesture",
                "duration": 1.2,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.2, 1.0, -0.3],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.6,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.7, 0.0, 0.7]
                    },
                    {
                        "time": 1.2,
                        "bone": "rightHand",
                        "position": [0.2, 1.0, -0.3],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "ja": {
                "name": "Ja",
                "description": "Yes - nod head",
                "duration": 1.0,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "head",
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.5,
                        "bone": "head",
                        "rotation": [0.3, 0.0, 0.0, 0.95]
                    },
                    {
                        "time": 1.0,
                        "bone": "head",
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "nein": {
                "name": "Nein",
                "description": "No - shake head",
                "duration": 1.0,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "head",
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.3,
                        "bone": "head",
                        "rotation": [0.0, 0.3, 0.0, 0.95]
                    },
                    {
                        "time": 0.7,
                        "bone": "head",
                        "rotation": [0.0, -0.3, 0.0, 0.95]
                    },
                    {
                        "time": 1.0,
                        "bone": "head",
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            }
        }
    
    def _normalize_token(self, token: str) -> str:
        """Normalize token for lookup (lowercase + alphanumeric)."""
        normalized = re.sub(r"[^a-z0-9äöüß]", "", token.lower())
        return normalized

    def _tokenize_text(self, text: str) -> List[str]:
        """Split text into tokens keeping unicode letters."""
        return [match for match in re.findall(r"[\wäöüß]+", text, flags=re.UNICODE) if match.strip()]

    def _get_language_cache(self, sign_language: SignLanguage) -> Dict[str, Any]:
        """Return or initialize cache for a specific sign language."""
        key = sign_language.value
        if key not in self.language_cache:
            self.language_cache[key] = {}
        return self.language_cache[key]

    def _load_json_file(self, path: Path) -> Optional[Dict[str, Any]]:
        """Load JSON animation file from disk."""
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception as exc:
            logger.warning("Failed to load animation file %s: %s", path, exc)
            return None

    def _load_animation_from_asset_path(self, asset_path: Optional[str]) -> Optional[Dict[str, Any]]:
        """Load animation data given an asset path (relative or absolute)."""
        if not asset_path:
            return None
        path = Path(asset_path)
        if not path.is_absolute():
            path = self.base_avatar_dir / path
        return self._load_json_file(path)

    def _load_language_asset(self, sign_language: SignLanguage, token: str) -> Optional[Dict[str, Any]]:
        """Load animation asset from avatar/{LANG}/TOKEN.json with caching."""
        cache = self._get_language_cache(sign_language)
        if token in cache:
            return cache[token]
        lang_dir = self.base_avatar_dir / sign_language.value
        candidate = lang_dir / f"{token}.json"
        animation = self._load_json_file(candidate)
        cache[token] = animation
        return animation

    async def _get_sign_record(
        self,
        token: str,
        sign_language: SignLanguage,
        db: Optional[AsyncSession]
    ) -> Optional[SignDictionary]:
        """Fetch sign dictionary record from DB if session available."""
        if db is None:
            return None
        result = await db.execute(
            select(SignDictionary)
            .where(
                SignDictionary.word == token,
                SignDictionary.sign_language == sign_language.value
            )
        )
        return result.scalar_one_or_none()

    def _generate_fingerspelling_animation(self, token: str, sign_language: SignLanguage) -> Optional[Dict[str, Any]]:
        """Create a basic fingerspelling animation for a token."""
        normalized = self._normalize_token(token)
        if not normalized:
            return None
        cache_key = sign_language.value
        letter_cache = self.fingerspelling_cache.setdefault(cache_key, {})
        if normalized in letter_cache:
            return letter_cache[normalized]
        letters = list(normalized.upper())
        if not letters:
            return None
        keyframes: List[Dict[str, Any]] = []
        time_cursor = 0.0
        step = 0.6
        for letter in letters:
            keyframes.append({
                "time": time_cursor,
                "bone": "rightHand",
                "position": [0.2, 1.2, -0.2],
                "rotation": [0.0, 0.0, 0.0, 1.0],
                "letter": letter
            })
            keyframes.append({
                "time": time_cursor + 0.3,
                "bone": "rightHand",
                "position": [0.25, 1.25, -0.15],
                "rotation": [0.0, 0.0, 0.2, 0.98],
                "letter": letter
            })
            time_cursor += step
        animation = {
            "name": f"fingerspell_{normalized}",
            "description": f"Fingerspelling for '{token}' ({sign_language.value})",
            "duration": max(time_cursor, 0.6),
            "keyframes": keyframes
        }
        letter_cache[normalized] = animation
        return animation

    def _build_resolved_sign(
        self,
        token: str,
        sign_language: SignLanguage,
        *,
        source: str,
        is_fallback: bool = False,
        asset_path: Optional[str] = None,
        description: Optional[str] = None,
        letters: Optional[List[str]] = None
    ) -> ResolvedSign:
        """Construct ResolvedSign metadata entry."""
        return ResolvedSign(
            token=token,
            sign_language=sign_language,
            source=source,  # type: ignore[arg-type]
            is_fallback=is_fallback,
            asset_path=asset_path,
            description=description,
            letters=letters
        )

    async def _resolve_sign(
        self,
        token: str,
        sign_language: SignLanguage,
        db: Optional[AsyncSession]
    ) -> Tuple[Optional[Dict[str, Any]], Optional[ResolvedSign]]:
        """Resolve a token to animation data and metadata."""
        normalized = self._normalize_token(token)
        if not normalized:
            return None, None

        # 1) Database record
        record = await self._get_sign_record(normalized, sign_language, db)
        if record:
            animation = record.animation_data or self._load_animation_from_asset_path(record.asset_path)
            if animation:
                metadata = (record.metadata or {}).copy()
                description = metadata.get("description") if isinstance(metadata, dict) else None
                resolved = self._build_resolved_sign(
                    token=token,
                    sign_language=sign_language,
                    source="database",
                    is_fallback=bool(record.is_fallback),
                    asset_path=record.asset_path,
                    description=description
                )
                return animation, resolved

        # 2) Filesystem asset per language
        animation = self._load_language_asset(sign_language, normalized)
        if animation:
            resolved = self._build_resolved_sign(
                token=token,
                sign_language=sign_language,
                source="filesystem",
                asset_path=str(self.base_avatar_dir / sign_language.value / f"{normalized}.json")
            )
            return animation, resolved

        # 3) Default in-memory database (legacy)
        if normalized in self.sign_database:
            animation = self.sign_database[normalized]
            resolved = self._build_resolved_sign(
                token=token,
                sign_language=sign_language,
                source="default"
            )
            return animation, resolved

        # 4) Fingerspelling fallback
        animation = self._generate_fingerspelling_animation(token, sign_language)
        if animation:
            resolved = self._build_resolved_sign(
                token=token,
                sign_language=sign_language,
                source="fingerspelling",
                is_fallback=True,
                letters=list(self._normalize_token(token).upper())
            )
            return animation, resolved

        return None, None

    async def text_to_animation(
        self,
        text: str,
        language: Language = Language.GERMAN,
        sign_language: SignLanguage = SignLanguage.DGS,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Convert text to avatar animation
        
        Args:
            text: Text to convert to sign language animation
            language: Language of the text
            sign_language: Target sign language for avatar assets
            db: Optional database session for dictionary lookups
            
        Returns:
            Dict with animation data (Three.js compatible format)
        """
        try:
            logger.info(
                "Generating animation for text '%s' (%s -> %s)",
                text[:50],
                language.value if isinstance(language, Language) else language,
                sign_language.value
            )
            tokens = self._tokenize_text(text)
            
            # Generate animation for each word
            animations = []
            total_duration = 0.0
            resolved_signs: List[ResolvedSign] = []
            
            for raw_token in tokens:
                animation_data, resolved = await self._resolve_sign(raw_token, sign_language, db)
                if animation_data:
                    offset_animation = self._offset_animation(animation_data, total_duration)
                    animations.append(offset_animation)
                    duration = float(animation_data.get("duration", 0.0))
                    total_duration += duration
                    total_duration += 0.3  # Pause between signs
                    if resolved:
                        resolved_signs.append(resolved)
                else:
                    logger.warning("No animation found for token '%s'", raw_token)
                    total_duration += 0.5
            
            # Combine animations
            combined_animation = self._combine_animations(animations, total_duration)
            
            logger.info(f"Generated animation with duration: {total_duration:.2f}s")
            
            return {
                "success": True,
                "text": text,
                "language": language,
                "sign_language": sign_language,
                "animation": combined_animation,
                "duration": total_duration,
                "format": "threejs",
                "resolved_signs": [sign.model_dump() for sign in resolved_signs]
            }
        
        except Exception as e:
            logger.error(f"Error generating animation: {e}", exc_info=True)
            raise
    
    def _offset_animation(self, animation: Dict, time_offset: float) -> Dict:
        """Offset all keyframes in an animation by a time offset"""
        offset_anim = deepcopy(animation)
        keyframes = offset_anim.get("keyframes", [])
        offset_keyframes = []
        
        for kf in keyframes:
            offset_kf = kf.copy()
            offset_kf["time"] = float(kf.get("time", 0.0)) + time_offset
            offset_keyframes.append(offset_kf)
        
        offset_anim["keyframes"] = offset_keyframes
        return offset_anim
    
    def _combine_animations(self, animations: List[Dict], total_duration: float) -> Dict:
        """Combine multiple animations into a single animation clip"""
        all_keyframes = []
        
        for anim in animations:
            all_keyframes.extend(anim["keyframes"])
        
        # Sort keyframes by time
        all_keyframes.sort(key=lambda kf: kf["time"])
        
        return {
            "name": "combined_sign_sequence",
            "duration": total_duration,
            "loop": False,
            "keyframes": all_keyframes,
            "tracks": self._keyframes_to_tracks(all_keyframes) if all_keyframes else {}
        }
    
    def _keyframes_to_tracks(self, keyframes: List[Dict]) -> Dict:
        """
        Convert keyframes to Three.js animation tracks format
        
        Three.js AnimationClip format expects separate tracks for each bone/property
        """
        tracks = {}
        
        # Group keyframes by bone
        bone_keyframes = {}
        for kf in keyframes:
            bone = kf["bone"]
            if bone not in bone_keyframes:
                bone_keyframes[bone] = []
            bone_keyframes[bone].append(kf)
        
        # Create tracks for each bone
        for bone, kf_list in bone_keyframes.items():
            # Position track
            if "position" in kf_list[0]:
                position_times = [kf["time"] for kf in kf_list if "position" in kf]
                position_values = []
                for kf in kf_list:
                    if "position" in kf:
                        position_values.extend(kf["position"])
                
                tracks[f"{bone}.position"] = {
                    "type": "VectorKeyframeTrack",
                    "times": position_times,
                    "values": position_values
                }
            
            # Rotation track (quaternion)
            if "rotation" in kf_list[0]:
                rotation_times = [kf["time"] for kf in kf_list if "rotation" in kf]
                rotation_values = []
                for kf in kf_list:
                    if "rotation" in kf:
                        rotation_values.extend(kf["rotation"])
                
                tracks[f"{bone}.quaternion"] = {
                    "type": "QuaternionKeyframeTrack",
                    "times": rotation_times,
                    "values": rotation_values
                }
        
        return tracks
    
    def create_custom_animation(
        self,
        sign_name: str,
        keyframes_data: List[Dict],
        duration: float
    ) -> AnimationClip:
        """
        Create a custom animation clip from keyframe data
        
        Args:
            sign_name: Name of the sign
            keyframes_data: List of keyframe dictionaries
            duration: Total animation duration
            
        Returns:
            AnimationClip object
        """
        keyframes = []
        
        for kf_data in keyframes_data:
            bone = BoneType(kf_data["bone"])
            transform = BoneTransform(
                position=tuple(kf_data.get("position", (0.0, 0.0, 0.0))),
                rotation=tuple(kf_data.get("rotation", (0.0, 0.0, 0.0, 1.0))),
                scale=tuple(kf_data.get("scale", (1.0, 1.0, 1.0)))
            )
            
            keyframe = Keyframe(
                time=kf_data["time"],
                bone=bone,
                transform=transform
            )
            keyframes.append(keyframe)
        
        return AnimationClip(
            name=sign_name,
            duration=duration,
            keyframes=keyframes,
            loop=False
        )
    
    def save_sign_to_database(
        self,
        sign_name: str,
        animation_data: Dict
    ) -> bool:
        """
        Save a new sign animation to the database
        
        Args:
            sign_name: Name of the sign (e.g., "hallo")
            animation_data: Animation data dictionary
            
        Returns:
            True if successful
        """
        try:
            # Add to in-memory database
            self.sign_database[sign_name.lower()] = animation_data
            
            # Save to file
            sign_db_path = Path(self.sign_database_path)
            sign_db_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(sign_db_path, 'w', encoding='utf-8') as f:
                json.dump(self.sign_database, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Saved sign '{sign_name}' to database")
            return True
        
        except Exception as e:
            logger.error(f"Error saving sign to database: {e}")
            return False
    
    def get_available_signs(self) -> List[str]:
        """Get list of all available signs in the database"""
        return list(self.sign_database.keys())
    
    def get_sign_info(self, sign_name: str) -> Optional[Dict]:
        """Get information about a specific sign"""
        return self.sign_database.get(sign_name.lower())


# Global service instance
_avatar_service: Optional[AvatarAnimationService] = None


def get_avatar_service() -> AvatarAnimationService:
    """Get global avatar animation service instance"""
    global _avatar_service
    if _avatar_service is None:
        _avatar_service = AvatarAnimationService()
    return _avatar_service
