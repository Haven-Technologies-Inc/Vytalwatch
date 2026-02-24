#!/bin/bash
# Fix CSP to allow Google Fonts
sed -i "s|font-src 'self' data:|font-src 'self' data: https://fonts.gstatic.com|g" /etc/nginx/sites-available/vitalwatch.conf
sed -i "s|style-src 'self' 'unsafe-inline'|style-src 'self' 'unsafe-inline' https://fonts.googleapis.com|g" /etc/nginx/sites-available/vitalwatch.conf
nginx -t && systemctl reload nginx
echo "CSP updated successfully"
