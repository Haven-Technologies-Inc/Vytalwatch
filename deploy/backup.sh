#!/bin/bash
# ============================================================
# VitalWatch Backup Script
# Run daily via cron: 0 2 * * * /opt/vitalwatch/deploy/backup.sh
# ============================================================

set -e

BACKUP_DIR="/opt/vitalwatch/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Load environment
source /opt/vitalwatch/.env

echo "[$(date)] Starting backup..."

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec vitalwatch-db pg_dump -U $DB_USERNAME $DB_DATABASE | gzip > "$BACKUP_DIR/postgres_$DATE.sql.gz"

# Backup InfluxDB
echo "Backing up InfluxDB..."
docker exec vitalwatch-influxdb influx backup /tmp/influx_backup_$DATE
docker cp vitalwatch-influxdb:/tmp/influx_backup_$DATE "$BACKUP_DIR/influxdb_$DATE"
docker exec vitalwatch-influxdb rm -rf /tmp/influx_backup_$DATE
tar -czvf "$BACKUP_DIR/influxdb_$DATE.tar.gz" -C "$BACKUP_DIR" "influxdb_$DATE"
rm -rf "$BACKUP_DIR/influxdb_$DATE"

# Backup .env (encrypted)
echo "Backing up configuration..."
gpg --symmetric --cipher-algo AES256 --batch --passphrase "$ENCRYPTION_KEY" \
    -o "$BACKUP_DIR/env_$DATE.gpg" /opt/vitalwatch/.env 2>/dev/null || true

# Remove old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

# Calculate total backup size
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)

echo "[$(date)] Backup complete. Total size: $BACKUP_SIZE"
echo "Backups stored in: $BACKUP_DIR"

# Optional: Upload to remote storage
# aws s3 sync $BACKUP_DIR s3://your-bucket/vitalwatch-backups/
# rclone sync $BACKUP_DIR remote:vitalwatch-backups/
