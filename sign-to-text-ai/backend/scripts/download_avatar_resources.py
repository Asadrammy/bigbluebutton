"""
Download and setup avatar animation resources
Expands sign language animation database with common DGS signs
"""
import json
import requests
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_expanded_sign_database() -> dict:
    """
    Create expanded sign database with common German Sign Language (DGS) signs
    Based on standard DGS gestures
    """
    logger.info("Creating expanded DGS sign database...")
    
    # Expanded database with common DGS signs
    expanded_database = {
        # Greetings
        "hallo": {
            "name": "Hallo",
            "description": "Greeting sign - wave hand",
            "duration": 1.5,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.4, 1.3, -0.2], "rotation": [0.0, 0.0, 0.3, 0.95]},
                {"time": 1.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, -0.3, 0.95]},
                {"time": 1.5, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "guten_tag": {
            "name": "Guten Tag",
            "description": "Good day greeting",
            "duration": 2.0,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.7, "bone": "rightHand", "position": [0.3, 1.3, -0.1], "rotation": [0.2, 0.0, 0.0, 0.98]},
                {"time": 1.4, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 2.0, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "auf_wiedersehen": {
            "name": "Auf Wiedersehen",
            "description": "Goodbye - waving gesture",
            "duration": 2.0,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.4, 1.3, -0.1], "rotation": [0.0, 0.0, 0.4, 0.92]},
                {"time": 1.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, -0.4, 0.92]},
                {"time": 1.5, "bone": "rightHand", "position": [0.4, 1.3, -0.1], "rotation": [0.0, 0.0, 0.4, 0.92]},
                {"time": 2.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        
        # Common words
        "danke": {
            "name": "Danke",
            "description": "Thank you - hand to chin",
            "duration": 1.0,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.1, 1.5, -0.1], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.2, 1.4, -0.2], "rotation": [0.3, 0.0, 0.0, 0.95]},
                {"time": 1.0, "bone": "rightHand", "position": [0.1, 1.5, -0.1], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "bitte": {
            "name": "Bitte",
            "description": "Please - open palm gesture",
            "duration": 1.2,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.2, 1.0, -0.3], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.6, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.7, 0.0, 0.7]},
                {"time": 1.2, "bone": "rightHand", "position": [0.2, 1.0, -0.3], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "ja": {
            "name": "Ja",
            "description": "Yes - nod head",
            "duration": 1.0,
            "keyframes": [
                {"time": 0.0, "bone": "head", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "head", "rotation": [0.3, 0.0, 0.0, 0.95]},
                {"time": 1.0, "bone": "head", "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "nein": {
            "name": "Nein",
            "description": "No - shake head",
            "duration": 1.0,
            "keyframes": [
                {"time": 0.0, "bone": "head", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.3, "bone": "head", "rotation": [0.0, 0.3, 0.0, 0.95]},
                {"time": 0.7, "bone": "head", "rotation": [0.0, -0.3, 0.0, 0.95]},
                {"time": 1.0, "bone": "head", "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        
        # Questions
        "wie": {
            "name": "Wie",
            "description": "How - question gesture",
            "duration": 1.0,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.2, 1.3, -0.1], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.3, 1.4, -0.1], "rotation": [0.0, 0.2, 0.0, 0.98]},
                {"time": 1.0, "bone": "rightHand", "position": [0.2, 1.3, -0.1], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "was": {
            "name": "Was",
            "description": "What - question gesture",
            "duration": 1.2,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.6, "bone": "rightHand", "position": [0.4, 1.3, -0.1], "rotation": [0.0, 0.3, 0.0, 0.95]},
                {"time": 1.2, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "wo": {
            "name": "Wo",
            "description": "Where - pointing gesture",
            "duration": 1.0,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.5, 1.2, -0.1], "rotation": [0.0, 0.5, 0.0, 0.87]},
                {"time": 1.0, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        
        # Numbers
        "eins": {
            "name": "Eins",
            "description": "One - index finger up",
            "duration": 0.8,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.4, "bone": "rightIndex1", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.8, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "zwei": {
            "name": "Zwei",
            "description": "Two - index and middle finger up",
            "duration": 0.8,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.4, "bone": "rightIndex1", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.4, "bone": "rightMiddle1", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.8, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "drei": {
            "name": "Drei",
            "description": "Three - three fingers up",
            "duration": 0.8,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.4, "bone": "rightIndex1", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.4, "bone": "rightMiddle1", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.4, "bone": "rightRing1", "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.8, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        
        # Common phrases
        "entschuldigung": {
            "name": "Entschuldigung",
            "description": "Sorry/Excuse me",
            "duration": 1.5,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.3, 1.3, -0.1], "rotation": [0.2, 0.0, 0.0, 0.98]},
                {"time": 1.0, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 1.5, "bone": "rightHand", "position": [0.2, 1.1, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "hilfe": {
            "name": "Hilfe",
            "description": "Help - assistance gesture",
            "duration": 1.2,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.2, 1.0, -0.3], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.6, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.5, 0.0, 0.87]},
                {"time": 1.2, "bone": "rightHand", "position": [0.2, 1.0, -0.3], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        },
        "warten": {
            "name": "Warten",
            "description": "Wait - hold gesture",
            "duration": 1.0,
            "keyframes": [
                {"time": 0.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 0.5, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]},
                {"time": 1.0, "bone": "rightHand", "position": [0.3, 1.2, -0.2], "rotation": [0.0, 0.0, 0.0, 1.0]}
            ]
        }
    }
    
    logger.info(f"Created expanded database with {len(expanded_database)} signs")
    return expanded_database


def save_sign_database(database: dict, output_path: Path):
    """Save sign database to JSON file"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Saved sign database to: {output_path}")


def main():
    """Main function to setup avatar resources"""
    logger.info("=" * 80)
    logger.info("Setting up Avatar Animation Resources")
    logger.info("=" * 80)
    
    # Create expanded sign database
    logger.info("\n[1/2] Creating expanded sign database...")
    database = create_expanded_sign_database()
    
    # Save to data directory
    output_path = Path("data/sign_mappings.json")
    logger.info("\n[2/2] Saving sign database...")
    save_sign_database(database, output_path)
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ Avatar Resources Setup Complete!")
    logger.info("=" * 80)
    logger.info(f"\n📊 Summary:")
    logger.info(f"   Total Signs: {len(database)}")
    logger.info(f"   Location: {output_path}")
    logger.info(f"\n📋 Available Signs:")
    for sign_name in sorted(database.keys()):
        logger.info(f"   - {sign_name}: {database[sign_name]['name']}")
    logger.info("\n🎯 Avatar service is ready to use!")
    logger.info("=" * 80)


if __name__ == "__main__":
    main()

