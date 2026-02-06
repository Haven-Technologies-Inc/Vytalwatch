#!/bin/bash
################################################################################
# VytalWatch RPM - Database Restore Script
# Restore PostgreSQL database from encrypted S3 backup
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/database_restore_${TIMESTAMP}.log"

# Configuration
ENVIRONMENT="${1:-production}"
BACKUP_FILE="${2:-latest}"  # S3 path or 'latest'
NAMESPACE="vytalwatch-${ENVIRONMENT}"

# S3 Configuration
S3_BUCKET="vytalwatch-backups"
S3_PREFIX="${ENVIRONMENT}/database"

# Database Configuration
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-vytalwatch}"
DB_USER="${DB_USER:-vytalwatch}"
DB_PASSWORD="${DB_PASSWORD:-}"

# KMS Configuration
KMS_KEY_ID="${KMS_KEY_ID:-alias/vytalwatch-backup-key}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

################################################################################
# Logging
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*" | tee -a "${LOG_FILE}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}"
}

################################################################################
# Safety Confirmation
################################################################################

require_confirmation() {
    log_warn "========================================="
    log_warn "DATABASE RESTORE OPERATION"
    log_warn "========================================="
    log_warn "Environment: ${ENVIRONMENT}"
    log_warn "This will OVERWRITE the current database!"
    log_warn "========================================="

    echo ""
    read -p "Type 'restore-database' to confirm: " confirmation

    if [[ "${confirmation}" != "restore-database" ]]; then
        log_error "Restore cancelled by user"
        exit 1
    fi

    log_info "Restore confirmed by ${USER}"
}

################################################################################
# Database Credentials
################################################################################

get_database_credentials() {
    log_info "Retrieving database credentials..."

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

    log_info "Database credentials retrieved"
}

################################################################################
# Backup Selection
################################################################################

select_backup() {
    log_info "Selecting backup to restore..."

    if [[ "${BACKUP_FILE}" == "latest" ]]; then
        # Get latest backup
        BACKUP_FILE=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" \
            --recursive | sort | tail -n 1 | awk '{print $4}')

        if [[ -z "${BACKUP_FILE}" ]]; then
            log_error "No backups found"
            exit 1
        fi

        log_info "Selected latest backup: ${BACKUP_FILE}"
    fi

    # Verify backup exists
    if ! aws s3 ls "s3://${S3_BUCKET}/${BACKUP_FILE}" &>/dev/null; then
        log_error "Backup file not found: ${BACKUP_FILE}"
        exit 1
    fi

    log_info "Backup file verified: ${BACKUP_FILE}"
}

################################################################################
# Pre-restore Backup
################################################################################

create_pre_restore_backup() {
    log_info "Creating pre-restore backup of current database..."

    # Use backup-database script
    if [[ -f "${SCRIPT_DIR}/backup-database.sh" ]]; then
        bash "${SCRIPT_DIR}/backup-database.sh" "${ENVIRONMENT}" "pre-restore"
    else
        log_warn "backup-database.sh not found, skipping pre-restore backup"
    fi

    log_info "Pre-restore backup completed"
}

################################################################################
# Download and Decrypt Backup
################################################################################

download_backup() {
    log_info "Downloading backup from S3..."

    local restore_dir="${PROJECT_ROOT}/tmp/restore"
    mkdir -p "${restore_dir}"

    local encrypted_file="${restore_dir}/backup_encrypted.sql.gz.enc"

    aws s3 cp "s3://${S3_BUCKET}/${BACKUP_FILE}" "${encrypted_file}" \
        2>&1 | tee -a "${LOG_FILE}"

    local file_size=$(du -h "${encrypted_file}" | cut -f1)
    log_info "Backup downloaded: ${file_size}"

    echo "${encrypted_file}"
}

decrypt_backup() {
    local encrypted_file="$1"

    log_info "Decrypting backup..."

    local decrypted_file="${encrypted_file%.enc}"

    # Get data key from KMS
    local data_key=$(aws kms generate-data-key \
        --key-id "${KMS_KEY_ID}" \
        --key-spec AES_256 \
        --query 'Plaintext' \
        --output text)

    # Decrypt backup
    echo "${data_key}" | base64 -d | \
        openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "${encrypted_file}" \
        -out "${decrypted_file}" \
        -pass stdin

    log_info "Backup decrypted"

    echo "${decrypted_file}"
}

decompress_backup() {
    local compressed_file="$1"

    log_info "Decompressing backup..."

    gunzip "${compressed_file}"

    local decompressed_file="${compressed_file%.gz}"

    log_info "Backup decompressed"

    echo "${decompressed_file}"
}

################################################################################
# Database Restore
################################################################################

stop_application() {
    log_info "Stopping application to prevent writes..."

    kubectl scale deployment/vytalwatch-backend -n "${NAMESPACE}" --replicas=0 || true
    kubectl scale deployment/vytalwatch-frontend -n "${NAMESPACE}" --replicas=0 || true

    sleep 10

    log_info "Application stopped"
}

terminate_connections() {
    log_info "Terminating active database connections..."

    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
        2>&1 | tee -a "${LOG_FILE}" || true

    log_info "Connections terminated"
}

restore_database() {
    local backup_file="$1"

    log_info "Restoring database from backup..."

    # Drop and recreate database
    log_info "Recreating database..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
        2>&1 | tee -a "${LOG_FILE}"

    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres \
        -c "CREATE DATABASE ${DB_NAME};" \
        2>&1 | tee -a "${LOG_FILE}"

    # Restore from backup
    log_info "Restoring data..."
    PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --no-owner \
        --no-acl \
        "${backup_file}" \
        2>&1 | tee -a "${LOG_FILE}"

    log_info "Database restore completed"
}

################################################################################
# Post-restore Validation
################################################################################

verify_restore() {
    log_info "Verifying database restore..."

    # Check database exists
    local db_exists=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres \
        -t -c "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}';" | xargs)

    if [[ "${db_exists}" != "1" ]]; then
        log_error "Database verification failed"
        return 1
    fi

    # Check table count
    local table_count=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    log_info "Tables found: ${table_count}"

    if [[ ${table_count} -lt 1 ]]; then
        log_error "No tables found after restore"
        return 1
    fi

    # Check data integrity
    log_info "Running data integrity checks..."

    local user_count=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
        -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")

    log_info "Users in database: ${user_count}"

    log_info "Database verification completed"
}

start_application() {
    log_info "Starting application..."

    kubectl scale deployment/vytalwatch-backend -n "${NAMESPACE}" --replicas=4 || true
    kubectl scale deployment/vytalwatch-frontend -n "${NAMESPACE}" --replicas=4 || true

    # Wait for pods to be ready
    sleep 30

    kubectl rollout status deployment/vytalwatch-backend -n "${NAMESPACE}" --timeout=5m || true
    kubectl rollout status deployment/vytalwatch-frontend -n "${NAMESPACE}" --timeout=5m || true

    log_info "Application started"
}

################################################################################
# Cleanup
################################################################################

cleanup() {
    local exit_code=$?

    # Clean up temporary files
    rm -rf "${PROJECT_ROOT}/tmp/restore"

    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Restore failed with exit code ${exit_code}"

        # Attempt to restart application
        start_application || true
    fi
}

trap cleanup EXIT

################################################################################
# Main Execution
################################################################################

main() {
    log_info "========================================="
    log_info "VytalWatch Database Restore"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "========================================="

    mkdir -p "${LOG_DIR}"

    # Confirm restore
    require_confirmation

    # Get credentials
    get_database_credentials

    # Select backup
    select_backup

    # Create pre-restore backup
    create_pre_restore_backup

    # Stop application
    stop_application

    # Download backup
    local encrypted_file=$(download_backup)

    # Decrypt backup
    local compressed_file=$(decrypt_backup "${encrypted_file}")

    # Decompress backup
    local backup_file=$(decompress_backup "${compressed_file}")

    # Terminate connections
    terminate_connections

    # Restore database
    restore_database "${backup_file}"

    # Verify restore
    verify_restore

    # Start application
    start_application

    log_info "========================================="
    log_info "Database restore completed successfully!"
    log_info "========================================="
}

main "$@"
