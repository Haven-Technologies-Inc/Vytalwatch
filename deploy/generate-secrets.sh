#!/bin/bash
cd /opt/vitalwatch

# Generate secure passwords
DB_PASS=$(openssl rand -base64 24 | tr -d '\n')
REDIS_PASS=$(openssl rand -base64 24 | tr -d '\n')
INFLUX_PASS=$(openssl rand -base64 24 | tr -d '\n')
INFLUX_TOKEN=$(openssl rand -base64 48 | tr -d '\n')
JWT_SEC=$(openssl rand -base64 64 | tr -d '\n')
JWT_REF=$(openssl rand -base64 64 | tr -d '\n')
ENC_KEY=$(openssl rand -hex 32)

# Update .env file
sed -i "s|CHANGE_THIS_STRONG_PASSWORD|$DB_PASS|g" .env
sed -i "s|CHANGE_THIS_GENERATE_SECURE_TOKEN|$INFLUX_TOKEN|" .env
sed -i "s|CHANGE_THIS_GENERATE_64_CHAR_SECRET|$JWT_SEC|" .env
sed -i "s|CHANGE_THIS_GENERATE_32_BYTE_HEX|$ENC_KEY|" .env

echo "Secrets generated successfully!"
echo "DB_PASS: $DB_PASS"
