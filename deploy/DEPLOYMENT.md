# VitalWatch Hetzner Deployment Guide

## Prerequisites

- Hetzner Cloud Server (Ubuntu 22.04/24.04 LTS recommended)
- Minimum specs: 4 vCPU, 8GB RAM, 80GB SSD
- Domain name pointed to server IP
- SSH access to server

---

## Quick Start

### Step 1: Initial Server Setup

SSH into your Hetzner server:

```bash
ssh root@YOUR_SERVER_IP
```

Run the setup script:

```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/your-repo/vitalwatch/main/deploy/setup-server.sh | bash -s YOUR_DOMAIN YOUR_EMAIL
```

Or manually:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx & Certbot
apt install -y nginx certbot python3-certbot-nginx

# Configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

### Step 2: Upload Application Files

From your local machine:

```bash
# Create deployment package
tar -czvf vitalwatch-deploy.tar.gz \
  vitalwatch-backend \
  vitalwatch-frontend \
  deploy \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist'

# Upload to server
scp vitalwatch-deploy.tar.gz root@YOUR_SERVER_IP:/opt/

# SSH to server and extract
ssh root@YOUR_SERVER_IP
cd /opt
tar -xzvf vitalwatch-deploy.tar.gz
mv vitalwatch-* vitalwatch/
cd vitalwatch
```

### Step 3: Configure Environment

```bash
cd /opt/vitalwatch

# Copy production env template
cp deploy/.env.production .env

# Edit with your values
nano .env
```

**Required environment variables:**

| Variable | Description |
|----------|-------------|
| `DOMAIN` | Your domain (e.g., vitalwatch.example.com) |
| `DB_PASSWORD` | Strong PostgreSQL password |
| `REDIS_PASSWORD` | Strong Redis password |
| `JWT_SECRET` | 64-character secret (generate with `openssl rand -base64 64`) |
| `JWT_REFRESH_SECRET` | 64-character secret |
| `ENCRYPTION_KEY` | 32-byte hex (generate with `openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | From Stripe dashboard |
| `TWILIO_*` | From Twilio console |
| `OPENAI_API_KEY` | From OpenAI |
| `ZOHO_*` | From Zoho Mail settings |

### Step 4: Setup SSL Certificate

```bash
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh
```

### Step 5: Deploy

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

---

## Manual Deployment Steps

### 1. Start Database Services

```bash
cd /opt/vitalwatch
docker-compose -f deploy/docker-compose.hetzner.yml up -d postgres redis influxdb
```

### 2. Run Migrations

```bash
docker-compose -f deploy/docker-compose.hetzner.yml run --rm backend npx prisma migrate deploy
```

### 3. Start Application

```bash
docker-compose -f deploy/docker-compose.hetzner.yml up -d
```

### 4. Configure Nginx

```bash
# Copy nginx config
sed "s/YOUR_DOMAIN/$DOMAIN/g" deploy/nginx/vitalwatch.conf > /etc/nginx/sites-available/vitalwatch

# Enable site
ln -sf /etc/nginx/sites-available/vitalwatch /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
```

---

## Post-Deployment

### Verify Deployment

```bash
# Check all containers are running
docker-compose -f deploy/docker-compose.hetzner.yml ps

# Check backend health
curl https://YOUR_DOMAIN/api/health

# View logs
docker-compose -f deploy/docker-compose.hetzner.yml logs -f
```

### Seed Initial Data

```bash
# Seed consent templates
curl -X POST https://YOUR_DOMAIN/api/consents/seed-templates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Create Admin User

```bash
# Connect to backend container
docker exec -it vitalwatch-backend sh

# Or via API after first registration, promote to admin
```

---

## Maintenance

### View Logs

```bash
# All services
docker-compose -f deploy/docker-compose.hetzner.yml logs -f

# Specific service
docker-compose -f deploy/docker-compose.hetzner.yml logs -f backend
```

### Restart Services

```bash
# Restart all
docker-compose -f deploy/docker-compose.hetzner.yml restart

# Restart specific
docker-compose -f deploy/docker-compose.hetzner.yml restart backend
```

### Update Application

```bash
cd /opt/vitalwatch

# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose -f deploy/docker-compose.hetzner.yml build --no-cache
docker-compose -f deploy/docker-compose.hetzner.yml up -d
```

### Database Backup

```bash
# Backup PostgreSQL
docker exec vitalwatch-db pg_dump -U vitalwatch vitalwatch_prod > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260222.sql | docker exec -i vitalwatch-db psql -U vitalwatch vitalwatch_prod
```

### SSL Certificate Renewal

Certbot auto-renews certificates. To manually renew:

```bash
certbot renew
systemctl reload nginx
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f deploy/docker-compose.hetzner.yml logs backend

# Check container status
docker ps -a
```

### Database connection issues

```bash
# Check postgres is running
docker exec vitalwatch-db pg_isready

# Check connection from backend
docker exec vitalwatch-backend nc -zv postgres 5432
```

### 502 Bad Gateway

- Check if backend is running: `curl http://localhost:3001/health`
- Check nginx config: `nginx -t`
- Check nginx logs: `tail -f /var/log/nginx/error.log`

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Force renewal
certbot renew --force-renewal
```

---

## Security Checklist

- [ ] Change all default passwords in .env
- [ ] Enable UFW firewall
- [ ] Configure Fail2Ban
- [ ] Set up regular backups
- [ ] Enable monitoring/alerting
- [ ] Review Nginx security headers
- [ ] Set up log rotation
- [ ] Configure rate limiting
- [ ] Enable HSTS

---

## Recommended Server Specs

| Environment | vCPU | RAM | Storage |
|-------------|------|-----|---------|
| Development | 2 | 4GB | 40GB |
| Production (Small) | 4 | 8GB | 80GB |
| Production (Medium) | 8 | 16GB | 160GB |
| Production (Large) | 16 | 32GB | 320GB |

---

## Support

For issues, check:
1. Docker logs: `docker-compose logs`
2. Nginx logs: `/var/log/nginx/`
3. System logs: `journalctl -xe`
