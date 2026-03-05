# Setup Guide

Complete setup instructions for the Sign Language Translator project.

## System Requirements

### For Mobile App Development
- **macOS** (for iOS development):
  - macOS 12.0 or later
  - Xcode 14 or later
  - CocoaPods
  
- **Windows/macOS/Linux** (for Android development):
  - Android Studio
  - Android SDK (API 30+)
  - Java JDK 11+

- **Both Platforms**:
  - Node.js 16.x or later
  - npm or yarn
  - React Native CLI

### For Backend Development
- Python 3.9 or later
- pip or conda
- (Optional) CUDA 11.x for GPU acceleration
- (Optional) Redis for caching

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Deaf-Person
```

### 2. Backend Setup

#### 2.1 Create Python Virtual Environment

```bash
cd backend

# Using venv
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS/Linux
source venv/bin/activate
```

#### 2.2 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: This will take several minutes as it installs TensorFlow, PyTorch, and other large packages.

#### 2.3 Configure Environment Variables

```bash
# Copy example env file
cp env.example .env

# Edit .env with your settings
# On Windows: notepad .env
# On macOS/Linux: nano .env
```

Key settings:
```bash
DEBUG=True
HOST=0.0.0.0
PORT=8000
WHISPER_MODEL_SIZE=base  # Start with 'base', upgrade to 'medium' or 'large' later
```

#### 2.4 Download ML Models (Optional)

For speech recognition, Whisper models download automatically on first use. For faster startup, pre-download:

```bash
python -c "import whisper; whisper.load_model('base')"
```

For sign language recognition, you'll need to add your trained model:
```bash
# Place your model file in backend/models/
cp /path/to/your/model.h5 models/sign_language_model.h5
```

#### 2.5 Test Backend

```bash
# Start the server
python run.py

# In another terminal, test the API
curl http://localhost:8000/health
```

Expected output: `{"status":"healthy","timestamp":...}`

### 3. Mobile App Setup

#### 3.1 Install Node Dependencies

```bash
cd mobile-app
npm install
```

If you encounter errors, try:
```bash
npm install --legacy-peer-deps
```

#### 3.2 Configure Backend URL

Edit `src/utils/constants.ts`:
```typescript
export const API_BASE_URL = 'http://YOUR_BACKEND_IP:8000/api/v1';
```

- For iOS Simulator: `http://localhost:8000/api/v1`
- For Android Emulator: `http://10.0.2.2:8000/api/v1`
- For Physical Device: `http://YOUR_COMPUTER_IP:8000/api/v1`

To find your computer's IP:
- **Windows**: `ipconfig` (look for IPv4 Address)
- **macOS/Linux**: `ifconfig` or `ip addr`

#### 3.3 iOS Setup (macOS only)

```bash
# Install CocoaPods dependencies
cd ios
pod install
cd ..

# Run on iOS
npm run ios

# Or specify simulator
npm run ios -- --simulator="iPhone 15"
```

#### 3.4 Android Setup

```bash
# Ensure Android emulator is running or device is connected
adb devices

# Run on Android
npm run android
```

**Common Android Issues**:

If build fails with "SDK location not found":
```bash
# Create local.properties file in android/
echo "sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk" > android/local.properties
# Or on Windows:
echo sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\sdk > android/local.properties
```

### 4. First Run

#### 4.1 Start Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python run.py
```

Keep this running!

#### 4.2 Start Metro Bundler (Terminal 2)
```bash
cd mobile-app
npm start
```

Keep this running!

#### 4.3 Run Mobile App (Terminal 3)
```bash
cd mobile-app
npm run ios
# or
npm run android
```

### 5. Verify Everything Works

1. **Backend Health Check**:
   - Open http://localhost:8000/health
   - Should see: `{"status":"healthy",...}`

2. **API Documentation**:
   - Open http://localhost:8000/docs
   - You should see interactive Swagger UI

3. **Mobile App**:
   - App should open on simulator/emulator
   - You should see the home screen with two buttons
   - Tap buttons to navigate to different screens

4. **Test API Connection**:
   - In mobile app, go to Speech-to-Sign screen
   - Tap "Start Recording" then "Stop Recording"
   - Should see mock data (avatar and text)

## Development Workflow

### Daily Development

1. **Start Backend** (once per session):
   ```bash
   cd backend && python run.py
   ```

2. **Start Mobile App** (once per session):
   ```bash
   cd mobile-app && npm start
   ```

3. Make changes to code - Hot reload should work automatically!

### Making Changes

- **Backend changes**: Server auto-reloads (if using `--reload` flag)
- **Mobile app changes**: 
  - Code changes: Hot reload (automatic)
  - Native code changes: Rebuild app (`npm run ios` / `npm run android`)

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'xxx'`
```bash
# Make sure virtual environment is activated
pip install -r requirements.txt
```

**Problem**: Port 8000 already in use
```bash
# Change port in .env
PORT=8001

# Or kill process using port 8000
# Windows: netstat -ano | findstr :8000
# macOS/Linux: lsof -ti:8000 | xargs kill
```

### Mobile App Issues

**Problem**: Metro bundler won't start
```bash
npm start -- --reset-cache
```

**Problem**: iOS build fails
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Problem**: Android build fails with Gradle errors
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**Problem**: Can't connect to backend from app
- Check firewall settings
- Ensure backend is running
- Verify API_BASE_URL is correct
- Try `curl http://YOUR_IP:8000/health` from terminal

### Permission Issues

**iOS**: Add permissions to `Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access for sign language recognition</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for speech recognition</string>
```

**Android**: Add permissions to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Next Steps

After successful setup:

1. **Integrate Real ML Models**:
   - Train or obtain DGS recognition model
   - Place in `backend/models/`
   - Update model loading in services

2. **Add Avatar Animations**:
   - Create or download rigged 3D avatar
   - Create sign language animations
   - Implement animation playback in mobile app

3. **Implement Camera/Audio**:
   - Add real camera capture in SignToSpeechScreen
   - Add real audio recording in SpeechToSignScreen
   - Stream data to backend

4. **Test & Optimize**:
   - Test on physical devices
   - Optimize model inference speed
   - Improve UI/UX based on testing

## Getting Help

- Check README files in each subdirectory
- Review API documentation at http://localhost:8000/docs
- Check logs for error messages
- Ensure all dependencies are installed correctly

---

Happy coding! 🚀

