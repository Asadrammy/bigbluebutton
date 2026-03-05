@echo off
echo ========================================
echo Building Production APK
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo IMPORTANT: This will create a new Expo project linked to your account.
echo The old project ID has been removed to fix permission issues.
echo.

pause

echo.
echo Step 1: Verifying login...
call npx eas-cli whoami
if errorlevel 1 (
    echo.
    echo You are not logged in. Please login first:
    call npx eas-cli login
    if errorlevel 1 (
        echo.
        echo ERROR: Login failed. Please try again.
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Starting production build...
echo This will:
echo - Create a new Expo project for your account (if needed)
echo - Upload your code to Expo servers
echo - Build the production APK
echo - You can download it from https://expo.dev when complete
echo.

pause

echo.
echo Building Production APK...
call npx eas-cli build --platform android --profile production
if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Check the error messages above.
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo Build started successfully!
    echo ========================================
    echo.
    echo Your APK is being built on Expo's servers.
    echo Check build status at: https://expo.dev
    echo.
    echo You will receive a notification when the build is complete.
    echo.
)

pause











