# Avatar Assets Directory

This directory stores the 3D avatar model and sign language animation data.

## Required Files

Place the following files here to enable avatar rendering:

### 3D Avatar Model
- `avatar_model.glb` or `avatar_model.gltf` — A rigged 3D character model
  - Sources: [Mixamo](https://www.mixamo.com), [ReadyPlayerMe](https://readyplayer.me)
  - Must have proper bone structure for hand/arm animations

### Sign Language Animations

Organize animation files by sign language code:

```
avatar/
├── DGS/                    # German Sign Language
│   ├── hallo.json          # Animation for "Hallo"
│   ├── danke.json          # Animation for "Danke"
│   ├── ja.json             # Animation for "Ja"
│   └── ...
├── ASL/                    # American Sign Language
│   ├── hello.json          # Animation for "Hello"
│   ├── thank_you.json      # Animation for "Thank you"
│   ├── yes.json            # Animation for "Yes"
│   └── ...
├── avatar_model.glb        # 3D avatar model file
└── README.md               # This file
```

### Animation JSON Format

Each animation file should follow this structure:

```json
{
  "duration": 2.0,
  "keyframes": [
    {
      "time": 0.0,
      "bones": [
        {
          "name": "RightHand",
          "position": [0.3, 0.5, 0.0],
          "rotation": [0.0, 0.0, 0.0, 1.0],
          "scale": [1.0, 1.0, 1.0]
        }
      ]
    }
  ]
}
```

## Creating Animations

1. **Motion Capture**: Record real sign language performers
2. **Manual Keyframing**: Use Blender or similar 3D software
3. **MediaPipe Export**: Record hand landmarks and convert to bone transforms

## Notes

- Animations for unknown words will fall back to fingerspelling
- The system auto-creates subdirectories for each sign language code
- JSON files are cached in memory after first load for performance
