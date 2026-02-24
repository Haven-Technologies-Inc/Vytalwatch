#!/bin/bash
# ============================================================
# VitalWatch Hetzner Server Setup Script
# Run this script on a fresh Ubuntu 22.04/24.04 server
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}VitalWatch Server Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get domain from argument or prompt
DOMAIN=${1:-""}
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., vitalwatch.example.com): " DOMAIN
fi

EMAIL=${2:-""}
if [ -z "$EMAIL" ]; then
    read -p "Enter email for SSL certificates: " EMAIL
fi

echo -e "${YELLOW}Setting up server for domain: $DOMAIN${NC}"

# ============================================================
# 1. System Updates
# ============================================================
echo -e "${GREEN}[1/8] Updating system...${NC}"
apt-get update && apt-get upgrade -y

# ============================================================
# 2. Install Dependencies
# ============================================================
echo -e "${GREEN}[2/8] Installing dependencies...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    ufw \
    fail2ban \
    git \
    htop \
    wget \
    unzip

# ============================================================
# 3. Install Docker
# ============================================================
echo -e "${GREEN}[3/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Add current user to docker group
    usermod -aG docker $SUDO_USER 2>/dev/null || true
fi

# ============================================================
# 4. Install Nginx
# ============================================================
echo -e "${GREEN}[4/8] Installing Nginx...${NC}"
apt-get install -y nginx

# ============================================================
# 5. Install Certbot for SSL
# ============================================================
echo -e "${GREEN}[5/8] Installing Certbot...${NC}"
apt-get install -y certbot python3-certbot-nginx

# ============================================================
# 6. Configure Firewall
# ============================================================
echo -e "${GREEN}[6/8] Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ============================================================
# 7. Configure Fail2Ban
# ============================================================
echo -e "${GREEN}[7/8] Configuring Fail2Ban...${NC}"
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# ============================================================
# 8. Create Application Directory
# ============================================================
echo -e "${GREEN}[8/8] Creating application directory...${NC}"
mkdir -p /opt/vitalwatch
mkdir -p /opt/vitalwatch/deploy
mkdir -p /var/www/certbot

# Create .env placeholder
cat > /opt/vitalwatch/.env << EOF
DOMAIN=$DOMAIN
# Fill in other values from .env.production template
EOF

# ============================================================
# Setup Complete
# ============================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Server setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy your application files to /opt/vitalwatch/"
echo "2. Configure /opt/vitalwatch/.env with your values"
echo "3. Run the deploy.sh script"
echo ""
echo -e "${YELLOW}To obtain SSL certificate:${NC}"
echo "certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive"
