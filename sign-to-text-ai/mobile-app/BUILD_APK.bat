@echo off
echo ========================================
echo Sign Language Translator - APK Builder
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Current directory: %CD%
echo.

:menu
echo.
echo What would you like to do?
echo.
echo [1] Login to EAS (first time only)
echo [2] Build APK (Preview/Development)
echo [3] Build APK (Production)
echo [4] Check build status
echo [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto login
if "%choice%"=="2" goto build_preview
if "%choice%"=="3" goto build_production
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto end
goto menu

:login
echo.
echo Logging in to EAS...
call npx eas-cli login
if errorlevel 1 (
    echo.
    echo ERROR: Login failed. Please try again.
    pause
)
goto menu

:build_preview
echo.
echo Building APK for Preview/Development...
echo This will upload your code to Expo servers and build the APK.
echo.
call npx eas-cli build --platform android --profile preview
if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Check the error messages above.
    pause
) else (
    echo.
    echo Build started successfully!
    echo You can check the build status at: https://expo.dev
)
goto menu

:build_production
echo.
echo Building APK for Production...
echo This will upload your code to Expo servers and build the APK.
echo.
call npx eas-cli build --platform android --profile production
if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Check the error messages above.
    pause
) else (
    echo.
    echo Build started successfully!
    echo You can check the build status at: https://expo.dev
)
goto menu

:check_status
echo.
echo Checking build status...
call npx eas-cli build:list --platform android --limit 5
pause
goto menu

:end
echo.
echo Exiting...
exit /b 0











