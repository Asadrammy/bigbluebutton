# Start Server Script with Port Conflict Handling
# This script will automatically handle port conflicts

Write-Host "=== Starting Sign Language Translator API ===" -ForegroundColor Cyan
Write-Host ""

# Check if port 8000 is available
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

if ($port8000) {
    Write-Host "⚠️  Port 8000 is in use. Using port 8001 instead..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📱 Update mobile app .env file:" -ForegroundColor Cyan
    Write-Host "   API_BASE_URL=http://YOUR_IP:8001/api/v1" -ForegroundColor White
    Write-Host "   WS_BASE_URL=ws://YOUR_IP:8001/ws" -ForegroundColor White
    Write-Host ""
    $env:PORT = "8001"
} else {
    Write-Host "✅ Port 8000 is available" -ForegroundColor Green
    Write-Host ""
    $env:PORT = "8000"
}

Write-Host "Starting server on port $env:PORT..." -ForegroundColor Yellow
Write-Host ""

# Start the server
cd "$PSScriptRoot"
python run.py



