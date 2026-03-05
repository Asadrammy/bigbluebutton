# Fix Port 8000 Permission Error on Windows
# Run this script in PowerShell (as Administrator if needed)

Write-Host "=== Port 8000 Troubleshooting Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if port 8000 is in use
Write-Host "Step 1: Checking if port 8000 is in use..." -ForegroundColor Yellow
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

if ($port8000) {
    Write-Host "⚠️  Port 8000 is already in use!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Processes using port 8000:" -ForegroundColor Yellow
    foreach ($conn in $port8000) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  - PID: $($conn.OwningProcess) | Process: $($process.ProcessName) | Path: $($process.Path)" -ForegroundColor White
        }
    }
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  1. Kill the process using port 8000"
    Write-Host "  2. Use a different port (8001, 8002, etc.)"
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1 or 2)"
    
    if ($choice -eq "1") {
        Write-Host ""
        Write-Host "Killing processes on port 8000..." -ForegroundColor Yellow
        foreach ($conn in $port8000) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop
                Write-Host "  ✓ Killed process $($conn.OwningProcess)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to kill process $($conn.OwningProcess): $_" -ForegroundColor Red
            }
        }
        Write-Host ""
        Write-Host "✓ Port 8000 should now be free" -ForegroundColor Green
        Write-Host "  Try running: python run.py" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "To use a different port, create a .env file with:" -ForegroundColor Yellow
        Write-Host "  PORT=8001" -ForegroundColor White
        Write-Host ""
        Write-Host "Or run with custom port:" -ForegroundColor Yellow
        Write-Host "  uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload" -ForegroundColor White
    }
} else {
    Write-Host "✓ Port 8000 is free" -ForegroundColor Green
    Write-Host ""
    Write-Host "The error might be due to:" -ForegroundColor Yellow
    Write-Host "  1. Windows Firewall blocking the port"
    Write-Host "  2. Need to run as Administrator"
    Write-Host "  3. Antivirus blocking the port"
    Write-Host ""
    Write-Host "Try these solutions:" -ForegroundColor Cyan
    Write-Host "  1. Run PowerShell as Administrator and try again"
    Write-Host "  2. Use a different port (8001, 8002, etc.)"
    Write-Host "  3. Check Windows Firewall settings"
}

Write-Host ""
Write-Host "=== Quick Fix: Use Port 8001 ===" -ForegroundColor Cyan
Write-Host "Run this command instead:" -ForegroundColor Yellow
Write-Host "  uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload" -ForegroundColor White
Write-Host ""
Write-Host "Then update mobile app .env file:" -ForegroundColor Yellow
Write-Host "  API_BASE_URL=http://YOUR_IP:8001/api/v1" -ForegroundColor White
Write-Host ""



