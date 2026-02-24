#!/bin/bash
# ============================================================
# VitalWatch Deployment Script
# Run this from /opt/vitalwatch directory
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_DIR="/opt/vitalwatch"
cd $DEPLOY_DIR

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}VitalWatch Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Copy .env.production to .env and configure it first."
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
REQUIRED_VARS="DOMAIN DB_USERNAME DB_PASSWORD JWT_SECRET"
for var in $REQUIRED_VARS; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${YELLOW}Deploying to: $DOMAIN${NC}"

# ============================================================
# Step 1: Pull latest code (if using git)
# ============================================================
echo -e "${BLUE}[1/6] Checking for updates...${NC}"
if [ -d ".git" ]; then
    git pull origin main || true
fi

# ============================================================
# Step 2: Build Docker images
# ============================================================
echo -e "${BLUE}[2/6] Building Docker images...${NC}"
docker-compose -f deploy/docker-compose.hetzner.yml build --no-cache

# ============================================================
# Step 3: Run database migrations
# ============================================================
echo -e "${BLUE}[3/6] Running database migrations...${NC}"
# Wait for postgres to be ready, then run migrations
docker-compose -f deploy/docker-compose.hetzner.yml up -d postgres
sleep 10

# Run Prisma migrations
docker-compose -f deploy/docker-compose.hetzner.yml run --rm backend npx prisma migrate deploy || true

# ============================================================
# Step 4: Start all services
# ============================================================
echo -e "${BLUE}[4/6] Starting services...${NC}"
docker-compose -f deploy/docker-compose.hetzner.yml up -d

# ============================================================
# Step 5: Configure Nginx
# ============================================================
echo -e "${BLUE}[5/6] Configuring Nginx...${NC}"

# Replace domain in nginx config
sed "s/YOUR_DOMAIN/$DOMAIN/g" deploy/nginx/vitalwatch.conf > /etc/nginx/sites-available/vitalwatch

# Enable site
ln -sf /etc/nginx/sites-available/vitalwatch /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

# ============================================================
# Step 6: Health Check
# ============================================================
echo -e "${BLUE}[6/6] Running health checks...${NC}"
sleep 10

# Check backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Backend health check returned: $BACKEND_HEALTH${NC}"
fi

# Check frontend health
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Frontend health check returned: $FRONTEND_HEALTH${NC}"
fi

# ============================================================
# Deployment Complete
# ============================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Application URL: ${BLUE}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  docker-compose -f deploy/docker-compose.hetzner.yml logs -f"
echo ""
echo -e "${YELLOW}Check status:${NC}"
echo "  docker-compose -f deploy/docker-compose.hetzner.yml ps"
