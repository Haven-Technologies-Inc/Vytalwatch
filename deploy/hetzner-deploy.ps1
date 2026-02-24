# VitalWatch Hetzner Deployment Script (Windows PowerShell)
# This script uploads files and deploys to your Hetzner server

$SERVER_IP = "5.78.152.72"
$SERVER_USER = "root"
$SERVER_PASS = "eFdHvhtr93VP"
$DOMAIN = "vytalwatch.com"

Write-Host "========================================" -ForegroundColor Green
Write-Host "VitalWatch Hetzner Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Server: $SERVER_IP"
Write-Host "Domain: $DOMAIN"
Write-Host ""

# Check for sshpass alternative (plink from PuTTY)
$puttyPath = "C:\Program Files\PuTTY"
$usePlink = Test-Path "$puttyPath\plink.exe"

if (-not $usePlink) {
    Write-Host "PuTTY not found. Please install PuTTY or use WSL for deployment." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Run these commands in WSL or Git Bash:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "# Install sshpass" -ForegroundColor Gray
    Write-Host "sudo apt-get install sshpass" -ForegroundColor White
    Write-Host ""
    Write-Host "# Deploy" -ForegroundColor Gray
    Write-Host "cd /mnt/c/Users/adeen/OneDrive/Desktop/RPM/Vytalwatch" -ForegroundColor White
    Write-Host "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no root@$SERVER_IP 'mkdir -p /opt/vitalwatch'" -ForegroundColor White
    Write-Host "sshpass -p '$SERVER_PASS' scp -r -o StrictHostKeyChecking=no ./deploy ./vitalwatch-backend ./vitalwatch-frontend root@$SERVER_IP:/opt/vitalwatch/" -ForegroundColor White
    Write-Host "sshpass -p '$SERVER_PASS' ssh root@$SERVER_IP 'cd /opt/vitalwatch && chmod +x deploy/*.sh && ./deploy/setup-server.sh $DOMAIN admin@$DOMAIN'" -ForegroundColor White
    exit 1
}

Write-Host "Using PuTTY for deployment..." -ForegroundColor Cyan

# Create remote directory
& "$puttyPath\plink.exe" -batch -pw $SERVER_PASS "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/vitalwatch"

# Upload files using pscp
Write-Host "Uploading deployment files..." -ForegroundColor Yellow
& "$puttyPath\pscp.exe" -batch -pw $SERVER_PASS -r ".\deploy" "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/"
& "$puttyPath\pscp.exe" -batch -pw $SERVER_PASS -r ".\vitalwatch-backend" "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/"
& "$puttyPath\pscp.exe" -batch -pw $SERVER_PASS -r ".\vitalwatch-frontend" "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/"

# Run setup script
Write-Host "Running server setup..." -ForegroundColor Yellow
& "$puttyPath\plink.exe" -batch -pw $SERVER_PASS "$SERVER_USER@$SERVER_IP" "cd /opt/vitalwatch && chmod +x deploy/*.sh && ./deploy/setup-server.sh $DOMAIN admin@$DOMAIN"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment initiated!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
