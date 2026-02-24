#!/bin/bash
cd /opt/vitalwatch
cp deploy/.env.production .env
DB_PASS=$(openssl rand -base64 16 | tr -d '/+=')
JWT_SEC=$(openssl rand -base64 48 | tr -d '/+=')
ENC_KEY=$(openssl rand -hex 32)
INFLUX_TOK=$(openssl rand -base64 32 | tr -d '/+=')
sed -i "s/CHANGE_THIS_STRONG_PASSWORD/$DB_PASS/g" .env
sed -i "s/CHANGE_THIS_GENERATE_64_CHAR_SECRET/$JWT_SEC/g" .env
sed -i "s/CHANGE_THIS_GENERATE_32_BYTE_HEX/$ENC_KEY/g" .env
sed -i "s/CHANGE_THIS_GENERATE_SECURE_TOKEN/$INFLUX_TOK/g" .env
echo "Secrets generated successfully"
