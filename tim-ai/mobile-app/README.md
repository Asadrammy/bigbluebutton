# Sign Language Translator - Mobile App

A React Native mobile application for real-time sign language (DGS) ↔ speech translation across multiple languages.

## Features

- 🤟 **Sign Language to Speech**: Camera-based gesture recognition with real-time translation
- 🗣️ **Speech to Sign Language**: Voice input with 3D avatar animation output
- 🌍 **Multi-language Support**: German, Spanish, French, English, Arabic
- 🎯 **User-Friendly Interface**: Clean, accessible design with light theme
- ⚙️ **Customizable Settings**: Quality controls and language preferences

## Tech Stack

- **Framework**: React Native 0.72
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Camera**: react-native-vision-camera
- **Audio**: react-native-audio-recorder-player
- **3D Rendering**: @react-three/fiber, expo-gl
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client

## Prerequisites

- Node.js >= 16
- React Native development environment set up
- iOS: Xcode and CocoaPods
- Android: Android Studio and SDK

## Installation

1. Install dependencies:
```bash
cd mobile-app
npm install
```

2. For iOS, install pods:
```bash
cd ios
pod install
cd ..
```

3. Configure backend URL in `src/utils/constants.ts`:
```typescript
export const API_BASE_URL = 'http://YOUR_BACKEND_URL:8000/api/v1';
```

## Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Development Server
```bash
npm start
```

## Project Structure

```
mobile-app/
├── src/
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── SignToSpeechScreen.tsx
│   │   ├── SpeechToSignScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/       # Navigation setup
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── services/         # API and backend communication
│   │   ├── api.ts
│   │   └── mockData.ts
│   ├── utils/            # Utilities and constants
│   │   ├── constants.ts
│   │   └── translations.ts
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   └── App.tsx          # Root component
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Permissions

Make sure to add camera and microphone permissions:

**iOS (Info.plist)**:
```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera for sign language recognition</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for speech recognition</string>
```

**Android (AndroidManifest.xml)**:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Development Notes

### Mock Data

The app currently uses mock data for testing the UI without requiring a backend. Mock functions are in `src/services/mockData.ts`.

To switch to real API calls, update the screen components to use the `api` service instead of mock functions.

### Backend Integration

The app expects the following API endpoints:

- `POST /api/v1/sign-to-text` - Sign language recognition
- `POST /api/v1/speech-to-text` - Speech recognition
- `POST /api/v1/text-to-speech` - Text-to-speech generation
- `POST /api/v1/text-to-sign` - Avatar animation generation
- `POST /api/v1/translate` - Text translation

## Building for Production

### iOS
```bash
# Build for production
npm run ios --configuration Release
```

### Android
```bash
# Build APK
cd android
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease
```

## Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### iOS Build Issues
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
```

## License

Copyright © 2025 - Sign Language Translator

