# VitalWatch Deployment - Quick Start

## Server Details
- **IP:** 5.78.152.72
- **Domain:** vytalwatch.com
- **Password:** eFdHvhtr93VP

---

## Option 1: Using PuTTY (Recommended for Windows)

### Step 1: Download PuTTY
Download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html

### Step 2: Connect via PuTTY
1. Open PuTTY
2. Host Name: `5.78.152.72`
3. Click "Open"
4. Login as: `root`
5. Password: `eFdHvhtr93VP`

### Step 3: Run Setup Commands (copy/paste into PuTTY)
```bash
# Update system and install Docker
apt-get update && apt-get upgrade -y
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
apt-get install -y nginx certbot python3-certbot-nginx git

# Configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Create app directory
mkdir -p /opt/vitalwatch
cd /opt/vitalwatch
```

### Step 4: Upload Files (From Windows Terminal/PowerShell)
```powershell
cd C:\Users\adeen\OneDrive\Desktop\RPM\Vytalwatch

# Upload deploy folder
scp -r .\deploy root@5.78.152.72:/opt/vitalwatch/

# Upload backend (excluding node_modules)
scp -r .\vitalwatch-backend root@5.78.152.72:/opt/vitalwatch/

# Upload frontend (excluding node_modules/.next)
scp -r .\vitalwatch-frontend root@5.78.152.72:/opt/vitalwatch/
```
(Enter password: eFdHvhtr93VP when prompted)

### Step 5: Configure & Deploy (Back in PuTTY)
```bash
cd /opt/vitalwatch
cp deploy/.env.production .env
nano .env  # Edit and fill in your API keys

chmod +x deploy/*.sh
./deploy/deploy.sh
```

---

## Option 2: Using Windows SSH

Open PowerShell and run these commands one by one:

```powershell
# Connect to server
ssh root@5.78.152.72
# Enter password: eFdHvhtr93VP
```

Then in the SSH session:
```bash
apt-get update && apt-get upgrade -y
curl -fsSL https://get.docker.com | sh
```

---

## After Deployment

1. **Setup SSL:**
```bash
certbot --nginx -d vytalwatch.com -d www.vytalwatch.com --email admin@vytalwatch.com --agree-tos --non-interactive
```

2. **Verify:**
- Visit: https://vytalwatch.com
- API Health: https://vytalwatch.com/api/health

---

## API Keys Required in .env

Fill these in before running deploy.sh:

| Variable | Where to Get |
|----------|--------------|
| STRIPE_SECRET_KEY | Stripe Dashboard |
| TWILIO_ACCOUNT_SID | Twilio Console |
| TWILIO_AUTH_TOKEN | Twilio Console |
| OPENAI_API_KEY | OpenAI Platform |
| ZEPTOMAIL_TOKEN | Zoho ZeptoMail |
