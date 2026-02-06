#!/bin/bash
################################################################################
# VytalWatch RPM - PostgreSQL Database Backup Script
# HIPAA-compliant encrypted backups to S3 with verification
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/database_backup_${TIMESTAMP}.log"

# Configuration
ENVIRONMENT="${1:-production}"
BACKUP_TYPE="${2:-scheduled}"  # scheduled, pre-deployment, manual
NAMESPACE="vytalwatch-${ENVIRONMENT}"

# S3 Configuration
S3_BUCKET="vytalwatch-backups"
S3_PREFIX="${ENVIRONMENT}/database"
RETENTION_DAYS=90

# Database Configuration
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-vytalwatch}"
DB_USER="${DB_USER:-vytalwatch}"
DB_PASSWORD="${DB_PASSWORD:-}"

# KMS Configuration for HIPAA compliance
KMS_KEY_ID="${KMS_KEY_ID:-alias/vytalwatch-backup-key}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

################################################################################
# Logging
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $*"
}

################################################################################
# Database Credentials
################################################################################

get_database_credentials() {
    log_info "Retrieving database credentials..."

    # Get from Kubernetes secrets if not set
    if [[ -z "${DB_HOST}" ]] || [[ -z "${DB_PASSWORD}" ]]; then
        DB_HOST=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
            -o jsonpath='{.data.db-host}' 2>/dev/null | base64 -d || echo "")

        DB_PASSWORD=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
            -o jsonpath='{.data.db-password}' 2>/dev/null | base64 -d || echo "")

        DB_USER=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
            -o jsonpath='{.data.db-user}' 2>/dev/null | base64 -d || echo "${DB_USER}")

        DB_NAME=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
            -o jsonpath='{.data.db-name}' 2>/dev/null | base64 -d || echo "${DB_NAME}")
    fi

    if [[ -z "${DB_HOST}" ]] || [[ -z "${DB_PASSWORD}" ]]; then
        log_error "Database credentials not found"
        exit 1
    fi

    log_info "Database credentials retrieved successfully"
}

################################################################################
# Pre-backup Validation
################################################################################

validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check required commands
    local required_commands=("pg_dump" "aws" "openssl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            log_error "Required command '${cmd}' not found"
            exit 1
        fi
    done

    # Check S3 bucket access
    if ! aws s3 ls "s3://${S3_BUCKET}" &>/dev/null; then
        log_error "Cannot access S3 bucket: ${S3_BUCKET}"
        exit 1
    fi

    # Test database connection
    if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" &>/dev/null; then
        log_error "Cannot connect to database"
        exit 1
    fi

    log_info "Prerequisites validated"
}

################################################################################
# Database Backup
################################################################################

create_backup() {
    log_info "Creating database backup..."

    local backup_dir="${PROJECT_ROOT}/tmp/backups"
    mkdir -p "${backup_dir}"

    local backup_file="${backup_dir}/vytalwatch_${ENVIRONMENT}_${TIMESTAMP}.sql"
    local backup_file_compressed="${backup_file}.gz"

    # Create backup with pg_dump
    log_info "Running pg_dump..."
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="${backup_file}" \
        2>&1 | tee -a "${LOG_FILE}"

    # Get backup size
    local backup_size=$(du -h "${backup_file}" | cut -f1)
    log_info "Backup created: ${backup_file} (${backup_size})"

    # Additional gzip compression
    log_info "Compressing backup..."
    gzip -9 "${backup_file}"

    local compressed_size=$(du -h "${backup_file_compressed}" | cut -f1)
    log_info "Backup compressed: ${compressed_size}"

    echo "${backup_file_compressed}"
}

################################################################################
# Encryption
################################################################################

encrypt_backup() {
    local backup_file="$1"

    log_info "Encrypting backup with AES-256..."

    local encrypted_file="${backup_file}.enc"

    # Generate encryption key using KMS
    local data_key=$(aws kms generate-data-key \
        --key-id "${KMS_KEY_ID}" \
        --key-spec AES_256 \
        --query 'Plaintext' \
        --output text)

    # Encrypt backup file
    echo "${data_key}" | base64 -d | \
        openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "${backup_file}" \
        -out "${encrypted_file}" \
        -pass stdin

    # Clean up unencrypted file
    shred -vfz -n 3 "${backup_file}"

    local encrypted_size=$(du -h "${encrypted_file}" | cut -f1)
    log_info "Backup encrypted: ${encrypted_size}"

    echo "${encrypted_file}"
}

################################################################################
# Upload to S3
################################################################################

upload_to_s3() {
    local backup_file="$1"

    log_info "Uploading backup to S3..."

    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_TYPE}/$(basename ${backup_file})"

    # Upload with server-side encryption
    aws s3 cp "${backup_file}" "${s3_path}" \
        --storage-class STANDARD_IA \
        --server-side-encryption aws:kms \
        --ssekms-key-id "${KMS_KEY_ID}" \
        --metadata "environment=${ENVIRONMENT},backup-type=${BACKUP_TYPE},timestamp=${TIMESTAMP}" \
        2>&1 | tee -a "${LOG_FILE}"

    # Verify upload
    if aws s3 ls "${s3_path}" &>/dev/null; then
        log_info "Backup uploaded successfully: ${s3_path}"
    else
        log_error "Backup upload verification failed"
        return 1
    fi

    echo "${s3_path}"
}

################################################################################
# Backup Verification
################################################################################

verify_backup() {
    local s3_path="$1"

    log_info "Verifying backup integrity..."

    # Download backup to temp location
    local temp_dir="${PROJECT_ROOT}/tmp/verify"
    mkdir -p "${temp_dir}"

    local temp_file="${temp_dir}/verify_${TIMESTAMP}.sql.gz.enc"

    aws s3 cp "${s3_path}" "${temp_file}" 2>&1 | tee -a "${LOG_FILE}"

    # Check file size
    local original_size=$(stat -f%z "${backup_file}" 2>/dev/null || stat -c%s "${backup_file}")
    local downloaded_size=$(stat -f%z "${temp_file}" 2>/dev/null || stat -c%s "${temp_file}")

    if [[ ${original_size} -eq ${downloaded_size} ]]; then
        log_info "Backup verification passed"
    else
        log_error "Backup verification failed: size mismatch"
        return 1
    fi

    # Clean up
    rm -f "${temp_file}"
}

################################################################################
# Backup Metadata
################################################################################

create_backup_metadata() {
    local s3_path="$1"

    log_info "Creating backup metadata..."

    local metadata_file="${PROJECT_ROOT}/tmp/backups/metadata_${TIMESTAMP}.json"

    # Get database size
    local db_size=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
        -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" | xargs || echo "unknown")

    # Create metadata
    cat > "${metadata_file}" <<EOF
{
    "backup_id": "${TIMESTAMP}",
    "environment": "${ENVIRONMENT}",
    "backup_type": "${BACKUP_TYPE}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database": {
        "host": "${DB_HOST}",
        "name": "${DB_NAME}",
        "size": "${db_size}"
    },
    "backup": {
        "s3_path": "${s3_path}",
        "encrypted": true,
        "compression": "gzip",
        "kms_key_id": "${KMS_KEY_ID}"
    },
    "retention": {
        "days": ${RETENTION_DAYS},
        "expires": "$(date -u -d "+${RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%SZ)"
    }
}
EOF

    # Upload metadata
    local metadata_s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/metadata/metadata_${TIMESTAMP}.json"
    aws s3 cp "${metadata_file}" "${metadata_s3_path}" \
        --server-side-encryption aws:kms \
        --ssekms-key-id "${KMS_KEY_ID}"

    log_info "Backup metadata created: ${metadata_s3_path}"
}

################################################################################
# Cleanup Old Backups
################################################################################

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    local cutoff_date=$(date -u -d "-${RETENTION_DAYS} days" +%Y-%m-%d)

    # List and delete old backups
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_TYPE}/" --recursive | \
        while read -r line; do
            local backup_date=$(echo "$line" | awk '{print $1}')
            local backup_file=$(echo "$line" | awk '{print $4}')

            if [[ "${backup_date}" < "${cutoff_date}" ]]; then
                log_info "Deleting old backup: ${backup_file}"
                aws s3 rm "s3://${S3_BUCKET}/${backup_file}"
            fi
        done

    log_info "Cleanup completed"
}

################################################################################
# Notifications
################################################################################

send_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        [[ "${status}" == "failure" ]] && color="danger"

        local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "${color}",
        "title": "Database Backup - ${ENVIRONMENT}",
        "text": "${message}",
        "fields": [
            {
                "title": "Environment",
                "value": "${ENVIRONMENT}",
                "short": true
            },
            {
                "title": "Backup Type",
                "value": "${BACKUP_TYPE}",
                "short": true
            }
        ]
    }]
}
EOF
)

        curl -X POST -H 'Content-type: application/json' \
            --data "${payload}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
}

################################################################################
# Cleanup on Exit
################################################################################

cleanup() {
    local exit_code=$?

    # Clean up temporary files
    rm -rf "${PROJECT_ROOT}/tmp/backups"
    rm -rf "${PROJECT_ROOT}/tmp/verify"

    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Backup failed with exit code ${exit_code}"
        send_notification "failure" "Database backup failed. Check logs for details."
    fi
}

trap cleanup EXIT

################################################################################
# Main Execution
################################################################################

main() {
    log_info "========================================="
    log_info "VytalWatch Database Backup"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Backup Type: ${BACKUP_TYPE}"
    log_info "Timestamp: ${TIMESTAMP}"
    log_info "========================================="

    mkdir -p "${LOG_DIR}"

    # Get credentials
    get_database_credentials

    # Validate prerequisites
    validate_prerequisites

    # Create backup
    local backup_file=$(create_backup)

    # Encrypt backup (HIPAA compliance)
    local encrypted_file=$(encrypt_backup "${backup_file}")

    # Upload to S3
    local s3_path=$(upload_to_s3 "${encrypted_file}")

    # Verify backup
    verify_backup "${s3_path}"

    # Create metadata
    create_backup_metadata "${s3_path}"

    # Cleanup old backups
    cleanup_old_backups

    # Send success notification
    send_notification "success" "Database backup completed successfully: ${s3_path}"

    log_info "========================================="
    log_info "Backup completed successfully!"
    log_info "S3 Path: ${s3_path}"
    log_info "========================================="
}

main "$@"
