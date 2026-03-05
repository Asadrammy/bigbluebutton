# ============================================================================
# Start Expo Development Server with QR Code
# ============================================================================
# This script starts Expo and displays the QR code for scanning
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Expo Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please wait for the QR code to appear..." -ForegroundColor Yellow
Write-Host "Once you see the QR code, scan it with Expo Go app on your phone" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Change to mobile-app directory
Set-Location "D:\projects\sign text\Sign-To-Text-Ai\mobile-app"

# Check if port 8081 is in use
$portCheck = netstat -ano | findstr :8081
if ($portCheck) {
    Write-Host "⚠️  Port 8081 is already in use. Attempting to use port 8082..." -ForegroundColor Yellow
    npx expo start --clear --port 8082
} else {
    # Start Expo with clear cache
    npx expo start --clear
}




























