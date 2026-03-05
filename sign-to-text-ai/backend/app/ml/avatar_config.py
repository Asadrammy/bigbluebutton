"""
Avatar configuration and bone structure for sign language animation
"""
from enum import Enum
from typing import List, Dict, Tuple
from dataclasses import dataclass


class BoneType(str, Enum):
    """Bone types for avatar skeleton"""
    # Core
    HIPS = "hips"
    SPINE = "spine"
    CHEST = "chest"
    NECK = "neck"
    HEAD = "head"
    
    # Left Arm
    LEFT_SHOULDER = "leftShoulder"
    LEFT_UPPER_ARM = "leftUpperArm"
    LEFT_LOWER_ARM = "leftLowerArm"
    LEFT_HAND = "leftHand"
    
    # Right Arm
    RIGHT_SHOULDER = "rightShoulder"
    RIGHT_UPPER_ARM = "rightUpperArm"
    RIGHT_LOWER_ARM = "rightLowerArm"
    RIGHT_HAND = "rightHand"
    
    # Left Hand Fingers
    LEFT_THUMB_1 = "leftThumb1"
    LEFT_THUMB_2 = "leftThumb2"
    LEFT_THUMB_3 = "leftThumb3"
    LEFT_INDEX_1 = "leftIndex1"
    LEFT_INDEX_2 = "leftIndex2"
    LEFT_INDEX_3 = "leftIndex3"
    LEFT_MIDDLE_1 = "leftMiddle1"
    LEFT_MIDDLE_2 = "leftMiddle2"
    LEFT_MIDDLE_3 = "leftMiddle3"
    LEFT_RING_1 = "leftRing1"
    LEFT_RING_2 = "leftRing2"
    LEFT_RING_3 = "leftRing3"
    LEFT_PINKY_1 = "leftPinky1"
    LEFT_PINKY_2 = "leftPinky2"
    LEFT_PINKY_3 = "leftPinky3"
    
    # Right Hand Fingers
    RIGHT_THUMB_1 = "rightThumb1"
    RIGHT_THUMB_2 = "rightThumb2"
    RIGHT_THUMB_3 = "rightThumb3"
    RIGHT_INDEX_1 = "rightIndex1"
    RIGHT_INDEX_2 = "rightIndex2"
    RIGHT_INDEX_3 = "rightIndex3"
    RIGHT_MIDDLE_1 = "rightMiddle1"
    RIGHT_MIDDLE_2 = "rightMiddle2"
    RIGHT_MIDDLE_3 = "rightMiddle3"
    RIGHT_RING_1 = "rightRing1"
    RIGHT_RING_2 = "rightRing2"
    RIGHT_RING_3 = "rightRing3"
    RIGHT_PINKY_1 = "rightPinky1"
    RIGHT_PINKY_2 = "rightPinky2"
    RIGHT_PINKY_3 = "rightPinky3"
    
    # Face (optional, for facial expressions)
    LEFT_EYE = "leftEye"
    RIGHT_EYE = "rightEye"
    JAW = "jaw"


@dataclass
class BoneTransform:
    """3D transformation for a bone"""
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)  # x, y, z
    rotation: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 1.0)  # quaternion (x, y, z, w)
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)  # x, y, z
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "position": list(self.position),
            "rotation": list(self.rotation),
            "scale": list(self.scale)
        }


@dataclass
class Keyframe:
    """Animation keyframe at a specific time"""
    time: float  # Time in seconds
    bone: BoneType
    transform: BoneTransform
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "time": self.time,
            "bone": self.bone.value,
            "transform": self.transform.to_dict()
        }


@dataclass
class AnimationClip:
    """Complete animation clip"""
    name: str
    duration: float  # Total duration in seconds
    keyframes: List[Keyframe]
    loop: bool = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "name": self.name,
            "duration": self.duration,
            "loop": self.loop,
            "keyframes": [kf.to_dict() for kf in self.keyframes]
        }


class AvatarConfig:
    """Avatar configuration and default bone hierarchy"""
    
    # Bone hierarchy (parent -> children)
    BONE_HIERARCHY = {
        BoneType.HIPS: [BoneType.SPINE],
        BoneType.SPINE: [BoneType.CHEST],
        BoneType.CHEST: [BoneType.NECK, BoneType.LEFT_SHOULDER, BoneType.RIGHT_SHOULDER],
        BoneType.NECK: [BoneType.HEAD],
        BoneType.HEAD: [BoneType.LEFT_EYE, BoneType.RIGHT_EYE, BoneType.JAW],
        
        # Left arm chain
        BoneType.LEFT_SHOULDER: [BoneType.LEFT_UPPER_ARM],
        BoneType.LEFT_UPPER_ARM: [BoneType.LEFT_LOWER_ARM],
        BoneType.LEFT_LOWER_ARM: [BoneType.LEFT_HAND],
        BoneType.LEFT_HAND: [
            BoneType.LEFT_THUMB_1,
            BoneType.LEFT_INDEX_1,
            BoneType.LEFT_MIDDLE_1,
            BoneType.LEFT_RING_1,
            BoneType.LEFT_PINKY_1
        ],
        
        # Left hand fingers
        BoneType.LEFT_THUMB_1: [BoneType.LEFT_THUMB_2],
        BoneType.LEFT_THUMB_2: [BoneType.LEFT_THUMB_3],
        BoneType.LEFT_INDEX_1: [BoneType.LEFT_INDEX_2],
        BoneType.LEFT_INDEX_2: [BoneType.LEFT_INDEX_3],
        BoneType.LEFT_MIDDLE_1: [BoneType.LEFT_MIDDLE_2],
        BoneType.LEFT_MIDDLE_2: [BoneType.LEFT_MIDDLE_3],
        BoneType.LEFT_RING_1: [BoneType.LEFT_RING_2],
        BoneType.LEFT_RING_2: [BoneType.LEFT_RING_3],
        BoneType.LEFT_PINKY_1: [BoneType.LEFT_PINKY_2],
        BoneType.LEFT_PINKY_2: [BoneType.LEFT_PINKY_3],
        
        # Right arm chain
        BoneType.RIGHT_SHOULDER: [BoneType.RIGHT_UPPER_ARM],
        BoneType.RIGHT_UPPER_ARM: [BoneType.RIGHT_LOWER_ARM],
        BoneType.RIGHT_LOWER_ARM: [BoneType.RIGHT_HAND],
        BoneType.RIGHT_HAND: [
            BoneType.RIGHT_THUMB_1,
            BoneType.RIGHT_INDEX_1,
            BoneType.RIGHT_MIDDLE_1,
            BoneType.RIGHT_RING_1,
            BoneType.RIGHT_PINKY_1
        ],
        
        # Right hand fingers
        BoneType.RIGHT_THUMB_1: [BoneType.RIGHT_THUMB_2],
        BoneType.RIGHT_THUMB_2: [BoneType.RIGHT_THUMB_3],
        BoneType.RIGHT_INDEX_1: [BoneType.RIGHT_INDEX_2],
        BoneType.RIGHT_INDEX_2: [BoneType.RIGHT_INDEX_3],
        BoneType.RIGHT_MIDDLE_1: [BoneType.RIGHT_MIDDLE_2],
        BoneType.RIGHT_MIDDLE_2: [BoneType.RIGHT_MIDDLE_3],
        BoneType.RIGHT_RING_1: [BoneType.RIGHT_RING_2],
        BoneType.RIGHT_RING_2: [BoneType.RIGHT_RING_3],
        BoneType.RIGHT_PINKY_1: [BoneType.RIGHT_PINKY_2],
        BoneType.RIGHT_PINKY_2: [BoneType.RIGHT_PINKY_3],
    }
    
    # Default rest pose (T-pose)
    DEFAULT_REST_POSE = {
        BoneType.HIPS: BoneTransform(position=(0.0, 1.0, 0.0)),
        BoneType.SPINE: BoneTransform(position=(0.0, 0.1, 0.0)),
        BoneType.CHEST: BoneTransform(position=(0.0, 0.15, 0.0)),
        BoneType.NECK: BoneTransform(position=(0.0, 0.15, 0.0)),
        BoneType.HEAD: BoneTransform(position=(0.0, 0.1, 0.0)),
        
        # Left arm (extended to side)
        BoneType.LEFT_SHOULDER: BoneTransform(position=(-0.15, 0.0, 0.0)),
        BoneType.LEFT_UPPER_ARM: BoneTransform(position=(-0.25, 0.0, 0.0)),
        BoneType.LEFT_LOWER_ARM: BoneTransform(position=(-0.25, 0.0, 0.0)),
        BoneType.LEFT_HAND: BoneTransform(position=(-0.15, 0.0, 0.0)),
        
        # Right arm (extended to side)
        BoneType.RIGHT_SHOULDER: BoneTransform(position=(0.15, 0.0, 0.0)),
        BoneType.RIGHT_UPPER_ARM: BoneTransform(position=(0.25, 0.0, 0.0)),
        BoneType.RIGHT_LOWER_ARM: BoneTransform(position=(0.25, 0.0, 0.0)),
        BoneType.RIGHT_HAND: BoneTransform(position=(0.15, 0.0, 0.0)),
    }
    
    # Animation constraints (min/max rotation limits in radians)
    ROTATION_LIMITS = {
        BoneType.LEFT_SHOULDER: (-3.14, 3.14),  # Full rotation
        BoneType.RIGHT_SHOULDER: (-3.14, 3.14),
        BoneType.LEFT_UPPER_ARM: (-3.14, 3.14),
        BoneType.RIGHT_UPPER_ARM: (-3.14, 3.14),
        BoneType.LEFT_LOWER_ARM: (0.0, 2.7),  # Elbow bend
        BoneType.RIGHT_LOWER_ARM: (0.0, 2.7),
        BoneType.LEFT_HAND: (-1.57, 1.57),  # Wrist rotation
        BoneType.RIGHT_HAND: (-1.57, 1.57),
        BoneType.NECK: (-0.79, 0.79),  # Limited neck rotation
        BoneType.HEAD: (-0.79, 0.79),
    }
    
    @staticmethod
    def get_bone_children(bone: BoneType) -> List[BoneType]:
        """Get all children bones of a given bone"""
        return AvatarConfig.BONE_HIERARCHY.get(bone, [])
    
    @staticmethod
    def get_all_bones() -> List[BoneType]:
        """Get all bones in the skeleton"""
        return list(BoneType)
    
    @staticmethod
    def get_primary_bones() -> List[BoneType]:
        """Get primary bones important for sign language (arms, hands, head)"""
        return [
            BoneType.HEAD,
            BoneType.NECK,
            BoneType.LEFT_SHOULDER,
            BoneType.LEFT_UPPER_ARM,
            BoneType.LEFT_LOWER_ARM,
            BoneType.LEFT_HAND,
            BoneType.RIGHT_SHOULDER,
            BoneType.RIGHT_UPPER_ARM,
            BoneType.RIGHT_LOWER_ARM,
            BoneType.RIGHT_HAND,
        ]
    
    @staticmethod
    def get_finger_bones(hand: str = "left") -> List[BoneType]:
        """Get all finger bones for a given hand"""
        if hand.lower() == "left":
            return [
                BoneType.LEFT_THUMB_1, BoneType.LEFT_THUMB_2, BoneType.LEFT_THUMB_3,
                BoneType.LEFT_INDEX_1, BoneType.LEFT_INDEX_2, BoneType.LEFT_INDEX_3,
                BoneType.LEFT_MIDDLE_1, BoneType.LEFT_MIDDLE_2, BoneType.LEFT_MIDDLE_3,
                BoneType.LEFT_RING_1, BoneType.LEFT_RING_2, BoneType.LEFT_RING_3,
                BoneType.LEFT_PINKY_1, BoneType.LEFT_PINKY_2, BoneType.LEFT_PINKY_3,
            ]
        else:
            return [
                BoneType.RIGHT_THUMB_1, BoneType.RIGHT_THUMB_2, BoneType.RIGHT_THUMB_3,
                BoneType.RIGHT_INDEX_1, BoneType.RIGHT_INDEX_2, BoneType.RIGHT_INDEX_3,
                BoneType.RIGHT_MIDDLE_1, BoneType.RIGHT_MIDDLE_2, BoneType.RIGHT_MIDDLE_3,
                BoneType.RIGHT_RING_1, BoneType.RIGHT_RING_2, BoneType.RIGHT_RING_3,
                BoneType.RIGHT_PINKY_1, BoneType.RIGHT_PINKY_2, BoneType.RIGHT_PINKY_3,
            ]

