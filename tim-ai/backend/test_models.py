import sys
import os
from pathlib import Path
from app.config import settings

def test_models():
    print("Testing ML Model Paths...")
    # Check default model
    default_path = Path(settings.models_dir) / "checkpoints" / "best_model.pth"
    print(f"Default Model Path: {default_path}")
    if default_path.exists():
        print("✅ Default Model Best.pth Exists!")
    else:
        print("❌ Default Model NOT FOUND!")
        
    print("\nInitialization Complete. Test Passed if ✅ above.")

if __name__ == "__main__":
    test_models()
