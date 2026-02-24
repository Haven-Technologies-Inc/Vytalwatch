#!/bin/bash
# ============================================================
# VitalWatch Hetzner Deployment Script
# Run from WSL or Git Bash
# ============================================================

set -e

# Server Configuration
SERVER_IP="5.78.152.72"
SERVER_USER="root"
SERVER_PASS="eFdHvhtr93VP"
DOMAIN="vytalwatch.com"
EMAIL="admin@vytalwatch.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}VitalWatch Hetzner Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Server: ${BLUE}$SERVER_IP${NC}"
echo -e "Domain: ${BLUE}$DOMAIN${NC}"
echo ""

# Get script directory (handle WSL paths)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Convert Windows path to WSL path if needed
if [[ "$PROJECT_DIR" == /mnt/* ]]; then
    echo "Running in WSL..."
elif [[ "$PROJECT_DIR" == /c/* ]] || [[ "$PROJECT_DIR" == /d/* ]]; then
    echo "Running in Git Bash..."
else
    # Assume we're in the deploy directory
    PROJECT_DIR="$(pwd)/.."
fi

cd "$PROJECT_DIR"
echo "Project directory: $PROJECT_DIR"

# Check for sshpass
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}Installing sshpass...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v brew &> /dev/null; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "Please install sshpass manually"
        exit 1
    fi
fi

# SSH options
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo -e "${YELLOW}[1/6] Testing SSH connection...${NC}"
sshpass -p "$SERVER_PASS" ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" "echo 'Connection successful!'"

echo -e "${YELLOW}[2/6] Creating remote directories...${NC}"
sshpass -p "$SERVER_PASS" ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" "mkdir -p /opt/vitalwatch"

echo -e "${YELLOW}[3/6] Uploading deployment files...${NC}"
sshpass -p "$SERVER_PASS" scp $SSH_OPTS -r ./deploy "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/"

echo -e "${YELLOW}[4/6] Uploading backend...${NC}"
sshpass -p "$SERVER_PASS" rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.git' \
    -e "sshpass -p $SERVER_PASS ssh $SSH_OPTS" \
    ./vitalwatch-backend/ "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/vitalwatch-backend/" 2>/dev/null || \
sshpass -p "$SERVER_PASS" scp $SSH_OPTS -r ./vitalwatch-backend "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/"

echo -e "${YELLOW}[5/6] Uploading frontend...${NC}"
sshpass -p "$SERVER_PASS" rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -e "sshpass -p $SERVER_PASS ssh $SSH_OPTS" \
    ./vitalwatch-frontend/ "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/vitalwatch-frontend/" 2>/dev/null || \
sshpass -p "$SERVER_PASS" scp $SSH_OPTS -r ./vitalwatch-frontend "$SERVER_USER@$SERVER_IP:/opt/vitalwatch/"

echo -e "${YELLOW}[6/6] Running server setup...${NC}"
sshpass -p "$SERVER_PASS" ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" << 'REMOTE_SCRIPT'
cd /opt/vitalwatch

# Make scripts executable
chmod +x deploy/*.sh

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install Nginx
apt-get install -y nginx

# Configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Copy environment file
cp deploy/.env.production .env

echo "Server setup complete!"
REMOTE_SCRIPT

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Files uploaded successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. SSH into server: sshpass -p '$SERVER_PASS' ssh $SERVER_USER@$SERVER_IP"
echo "2. Configure .env: nano /opt/vitalwatch/.env"
echo "3. Run deployment: cd /opt/vitalwatch && ./deploy/deploy.sh"
echo ""
echo -e "Or run full deployment now with:"
echo -e "${BLUE}sshpass -p '$SERVER_PASS' ssh $SSH_OPTS $SERVER_USER@$SERVER_IP 'cd /opt/vitalwatch && ./deploy/deploy.sh'${NC}"
