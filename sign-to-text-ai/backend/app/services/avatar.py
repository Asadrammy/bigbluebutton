"""
Avatar animation service for sign language
Generates 3D animations from text or sign labels
"""
import logging
import json
import math
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from app.ml.avatar_config import (
    BoneType, BoneTransform, Keyframe, AnimationClip, AvatarConfig
)
from app.models import Language

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
        
        logger.info(f"Avatar animation service initialized with {len(self.sign_database)} signs")
    
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
        
        # Return default database (limited vocabulary - can be expanded)
        logger.info("Using default sign database (limited vocabulary)")
        return self._create_default_sign_database()
    
    def _create_default_sign_database(self) -> Dict:
        """Create default sign database with common signs"""
        # This is a simplified database - in production, this would be much more comprehensive
        # Adding both German and English words
        return {
            # German words
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
            },
            # English words
            "hello": {
                "name": "Hello",
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
            "yes": {
                "name": "Yes",
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
            "no": {
                "name": "No",
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
            },
            "please": {
                "name": "Please",
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
            "thank": {
                "name": "Thank",
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
            "you": {
                "name": "You",
                "description": "Pointing gesture",
                "duration": 0.8,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.4,
                        "bone": "rightHand",
                        "position": [0.5, 1.3, 0.0],
                        "rotation": [0.0, 0.5, 0.0, 0.866]
                    },
                    {
                        "time": 0.8,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "can": {
                "name": "Can",
                "description": "Ability gesture",
                "duration": 1.0,
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
                        "position": [0.35, 1.35, -0.15],
                        "rotation": [0.2, 0.2, 0.0, 0.96]
                    },
                    {
                        "time": 1.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "we": {
                "name": "We",
                "description": "Group gesture",
                "duration": 0.8,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.4,
                        "bone": "rightHand",
                        "position": [0.25, 1.25, -0.1],
                        "rotation": [0.0, -0.3, 0.0, 0.95]
                    },
                    {
                        "time": 0.8,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "do": {
                "name": "Do",
                "description": "Action gesture",
                "duration": 0.9,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.45,
                        "bone": "rightHand",
                        "position": [0.4, 1.1, -0.25],
                        "rotation": [0.3, 0.0, 0.2, 0.93]
                    },
                    {
                        "time": 0.9,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "tomorrow": {
                "name": "Tomorrow",
                "description": "Future time gesture",
                "duration": 1.2,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.6,
                        "bone": "rightHand",
                        "position": [0.45, 1.4, 0.1],
                        "rotation": [0.0, 0.8, 0.0, 0.6]
                    },
                    {
                        "time": 1.2,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "meet": {
                "name": "Meet",
                "description": "Meeting gesture - hands together",
                "duration": 1.0,
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
                        "position": [0.0, 1.3, 0.0],
                        "rotation": [0.0, 0.5, 0.0, 0.87]
                    },
                    {
                        "time": 1.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "the": {
                "name": "The",
                "description": "Article gesture - pointing",
                "duration": 0.6,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.3,
                        "bone": "rightHand",
                        "position": [0.25, 1.25, -0.15],
                        "rotation": [0.1, 0.0, 0.0, 0.995]
                    },
                    {
                        "time": 0.6,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            },
            "model": {
                "name": "Model",
                "description": "Model gesture - demonstration",
                "duration": 1.1,
                "keyframes": [
                    {
                        "time": 0.0,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    },
                    {
                        "time": 0.35,
                        "bone": "rightHand",
                        "position": [0.4, 1.35, -0.1],
                        "rotation": [0.2, 0.3, 0.0, 0.92]
                    },
                    {
                        "time": 0.7,
                        "bone": "rightHand",
                        "position": [0.35, 1.3, -0.15],
                        "rotation": [0.1, 0.2, 0.0, 0.975]
                    },
                    {
                        "time": 1.1,
                        "bone": "rightHand",
                        "position": [0.3, 1.2, -0.2],
                        "rotation": [0.0, 0.0, 0.0, 1.0]
                    }
                ]
            }
        }
    
    async def text_to_animation(
        self,
        text: str,
        language: Language = Language.GERMAN
    ) -> Dict:
        """
        Convert text to avatar animation
        
        Args:
            text: Text to convert to sign language animation
            language: Language of the text
            
        Returns:
            Dict with animation data (Three.js compatible format)
        """
        try:
            logger.info(f"Generating animation for text: '{text}'")
            
            # Normalize text
            normalized_text = text.lower().strip()
            
            # Split into words
            words = normalized_text.split()
            
            # Generate animation for each word
            animations = []
            total_duration = 0.0
            
            for word in words:
                # Clean word (remove punctuation)
                clean_word = word.lower().strip('.,!?;:')
                # Try exact match first
                sign_animation = self._get_sign_animation(clean_word)
                # If not found and word has punctuation variant, try without it
                if not sign_animation and clean_word != word.lower():
                    sign_animation = self._get_sign_animation(word.lower().strip('.,!?;:'))
                if sign_animation:
                    # Offset animation by total duration
                    offset_animation = self._offset_animation(
                        sign_animation,
                        total_duration
                    )
                    animations.append(offset_animation)
                    total_duration += sign_animation["duration"]
                    # Add pause between signs
                    total_duration += 0.3
                else:
                    # Unknown word - create a simple gesture animation
                    logger.warning(f"No animation found for word: {word}, creating placeholder gesture")
                    placeholder_anim = self._create_word_placeholder(clean_word, total_duration)
                    animations.append(placeholder_anim)
                    total_duration += placeholder_anim["duration"] + 0.2
            
            # Combine animations
            combined_animation = self._combine_animations(animations, total_duration)
            
            logger.info(f"Generated animation with duration: {total_duration:.2f}s")
            
            return {
                "success": True,
                "text": text,
                "language": language,
                "animation": combined_animation,
                "duration": total_duration,
                "format": "threejs"
            }
        
        except Exception as e:
            logger.error(f"Error generating animation: {e}", exc_info=True)
            raise
    
    def _get_sign_animation(self, word: str) -> Optional[Dict]:
        """Get animation data for a specific sign/word"""
        # Normalize word
        word_key = word.lower().strip()
        
        if word_key in self.sign_database:
            return self.sign_database[word_key]
        
        return None
    
    def _offset_animation(self, animation: Dict, time_offset: float) -> Dict:
        """Offset all keyframes in an animation by a time offset"""
        offset_anim = animation.copy()
        offset_keyframes = []
        
        for kf in animation["keyframes"]:
            offset_kf = kf.copy()
            offset_kf["time"] = kf["time"] + time_offset
            offset_keyframes.append(offset_kf)
        
        offset_anim["keyframes"] = offset_keyframes
        return offset_anim
    
    def _combine_animations(self, animations: List[Dict], total_duration: float) -> Dict:
        """Combine multiple animations into a single animation clip"""
        all_keyframes = []
        
        for anim in animations:
            all_keyframes.extend(anim["keyframes"])
        
        # If no keyframes, create a default idle animation
        if not all_keyframes and total_duration > 0:
            all_keyframes = self._create_idle_animation(total_duration)
        elif not all_keyframes:
            # Minimum 1 second idle animation
            total_duration = 1.0
            all_keyframes = self._create_idle_animation(total_duration)
        
        # Sort keyframes by time
        all_keyframes.sort(key=lambda kf: kf["time"])
        
        return {
            "name": "combined_sign_sequence",
            "duration": total_duration,
            "loop": False,
            "keyframes": all_keyframes,
            "tracks": self._keyframes_to_tracks(all_keyframes)
        }
    
    def _create_idle_animation(self, duration: float) -> List[Dict]:
        """
        Create a simple idle animation (gentle breathing/movement)
        when no sign animations are available
        """
        keyframes = [
            {
                "time": 0.0,
                "bone": "rightHand",
                "position": [0.3, 1.2, -0.2],
                "rotation": [0.0, 0.0, 0.0, 1.0]
            },
            {
                "time": duration / 2,
                "bone": "rightHand",
                "position": [0.32, 1.22, -0.18],
                "rotation": [0.0, 0.05, 0.0, 0.998]
            },
            {
                "time": duration,
                "bone": "rightHand",
                "position": [0.3, 1.2, -0.2],
                "rotation": [0.0, 0.0, 0.0, 1.0]
            }
        ]
        return keyframes
    
    def _create_word_placeholder(self, word: str, time_offset: float) -> Dict:
        """
        Create a placeholder animation for unknown words
        A simple gesture that indicates the word is being processed
        """
        duration = 0.8
        keyframes = [
            {
                "time": time_offset,
                "bone": "rightHand",
                "position": [0.3, 1.2, -0.2],
                "rotation": [0.0, 0.0, 0.0, 1.0]
            },
            {
                "time": time_offset + duration / 3,
                "bone": "rightHand",
                "position": [0.35, 1.25, -0.15],
                "rotation": [0.1, 0.1, 0.1, 0.98]
            },
            {
                "time": time_offset + duration * 2 / 3,
                "bone": "rightHand",
                "position": [0.32, 1.22, -0.18],
                "rotation": [0.05, -0.05, 0.05, 0.99]
            },
            {
                "time": time_offset + duration,
                "bone": "rightHand",
                "position": [0.3, 1.2, -0.2],
                "rotation": [0.0, 0.0, 0.0, 1.0]
            }
        ]
        return {
            "name": f"placeholder_{word}",
            "description": f"Placeholder gesture for: {word}",
            "duration": duration,
            "keyframes": keyframes
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
