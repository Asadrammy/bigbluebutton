# Sign Language Translator - APK Builder (PowerShell)
# This script temporarily bypasses PowerShell execution policy

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sign Language Translator - APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set execution policy for current process only
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

function Show-Menu {
    Write-Host ""
    Write-Host "What would you like to do?" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[1] Login to EAS (first time only)"
    Write-Host "[2] Build APK (Preview/Development)"
    Write-Host "[3] Build APK (Production)"
    Write-Host "[4] Check build status"
    Write-Host "[5] Exit"
    Write-Host ""
}

function Login-EAS {
    Write-Host ""
    Write-Host "Logging in to EAS..." -ForegroundColor Yellow
    npx eas-cli login
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Login failed. Please try again." -ForegroundColor Red
        Read-Host "Press Enter to continue"
    }
}

function Build-Preview {
    Write-Host ""
    Write-Host "Building APK for Preview/Development..." -ForegroundColor Yellow
    Write-Host "This will upload your code to Expo servers and build the APK." -ForegroundColor Gray
    Write-Host ""
    npx eas-cli build --platform android --profile preview
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Build failed. Check the error messages above." -ForegroundColor Red
        Read-Host "Press Enter to continue"
    } else {
        Write-Host ""
        Write-Host "Build started successfully!" -ForegroundColor Green
        Write-Host "You can check the build status at: https://expo.dev" -ForegroundColor Cyan
    }
}

function Build-Production {
    Write-Host ""
    Write-Host "Building APK for Production..." -ForegroundColor Yellow
    Write-Host "This will upload your code to Expo servers and build the APK." -ForegroundColor Gray
    Write-Host ""
    npx eas-cli build --platform android --profile production
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Build failed. Check the error messages above." -ForegroundColor Red
        Read-Host "Press Enter to continue"
    } else {
        Write-Host ""
        Write-Host "Build started successfully!" -ForegroundColor Green
        Write-Host "You can check the build status at: https://expo.dev" -ForegroundColor Cyan
    }
}

function Check-Status {
    Write-Host ""
    Write-Host "Checking build status..." -ForegroundColor Yellow
    npx eas-cli build:list --platform android --limit 5
    Read-Host "Press Enter to continue"
}

# Main menu loop
while ($true) {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-5)"
    
    switch ($choice) {
        "1" { Login-EAS }
        "2" { Build-Preview }
        "3" { Build-Production }
        "4" { Check-Status }
        "5" { 
            Write-Host ""
            Write-Host "Exiting..." -ForegroundColor Green
            break
        }
        default {
            Write-Host "Invalid choice. Please select 1-5." -ForegroundColor Red
        }
    }
}











