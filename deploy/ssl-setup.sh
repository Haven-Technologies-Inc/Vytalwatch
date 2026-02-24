#!/bin/bash
# ============================================================
# SSL Certificate Setup Script
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment
source /opt/vitalwatch/.env

if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain: " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    read -p "Enter your email for SSL notifications: " EMAIL
fi

echo -e "${GREEN}Setting up SSL for $DOMAIN${NC}"

# Create temporary nginx config for certificate verification
cat > /etc/nginx/sites-available/vitalwatch-temp << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'VitalWatch SSL Setup';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/vitalwatch-temp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Obtain certificate
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
certbot certonly --webroot \
    -w /var/www/certbot \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive

# Setup auto-renewal
echo -e "${YELLOW}Setting up auto-renewal...${NC}"
cat > /etc/cron.d/certbot-renew << EOF
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

echo -e "${GREEN}SSL setup complete!${NC}"
echo ""
echo "Certificates installed at:"
echo "  /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Now run the main deployment script:"
echo "  cd /opt/vitalwatch && ./deploy/deploy.sh"
