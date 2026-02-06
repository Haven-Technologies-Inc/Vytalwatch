#!/bin/bash
################################################################################
# VytalWatch RPM - File Backup Script
# Backup uploaded files and attachments to S3
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/file_backup_${TIMESTAMP}.log"

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

# S3 Configuration
S3_BUCKET="vytalwatch-backups"
S3_PREFIX="${ENVIRONMENT}/files"
SOURCE_BUCKET="vytalwatch-uploads-${ENVIRONMENT}"

# KMS Configuration
KMS_KEY_ID="${KMS_KEY_ID:-alias/vytalwatch-backup-key}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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
# Backup Functions
################################################################################

sync_files_to_backup() {
    log_info "Syncing files from ${SOURCE_BUCKET} to backup location..."

    # Use S3 sync for incremental backup
    aws s3 sync "s3://${SOURCE_BUCKET}/" "s3://${S3_BUCKET}/${S3_PREFIX}/${TIMESTAMP}/" \
        --storage-class STANDARD_IA \
        --server-side-encryption aws:kms \
        --ssekms-key-id "${KMS_KEY_ID}" \
        --metadata "environment=${ENVIRONMENT},backup-timestamp=${TIMESTAMP}" \
        2>&1 | tee -a "${LOG_FILE}"

    log_info "File sync completed"
}

create_manifest() {
    log_info "Creating backup manifest..."

    local manifest_file="${PROJECT_ROOT}/tmp/file_manifest_${TIMESTAMP}.json"
    mkdir -p "$(dirname ${manifest_file})"

    # List all files in backup
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${TIMESTAMP}/" --recursive > "${manifest_file}.tmp"

    # Create JSON manifest
    cat > "${manifest_file}" <<EOF
{
    "backup_id": "${TIMESTAMP}",
    "environment": "${ENVIRONMENT}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source_bucket": "${SOURCE_BUCKET}",
    "backup_location": "s3://${S3_BUCKET}/${S3_PREFIX}/${TIMESTAMP}/",
    "file_count": $(wc -l < "${manifest_file}.tmp"),
    "total_size": "$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${TIMESTAMP}/" --recursive --summarize | grep "Total Size" | awk '{print $3}')"
}
EOF

    # Upload manifest
    aws s3 cp "${manifest_file}" "s3://${S3_BUCKET}/${S3_PREFIX}/manifests/manifest_${TIMESTAMP}.json" \
        --server-side-encryption aws:kms \
        --ssekms-key-id "${KMS_KEY_ID}"

    log_info "Manifest created: s3://${S3_BUCKET}/${S3_PREFIX}/manifests/manifest_${TIMESTAMP}.json"

    rm -f "${manifest_file}" "${manifest_file}.tmp"
}

verify_backup() {
    log_info "Verifying file backup..."

    # Count files in source
    local source_count=$(aws s3 ls "s3://${SOURCE_BUCKET}/" --recursive | wc -l)

    # Count files in backup
    local backup_count=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${TIMESTAMP}/" --recursive | wc -l)

    log_info "Source files: ${source_count}"
    log_info "Backup files: ${backup_count}"

    if [[ ${backup_count} -ge ${source_count} ]]; then
        log_info "Backup verification passed"
        return 0
    else
        log_error "Backup verification failed: file count mismatch"
        return 1
    fi
}

cleanup_old_backups() {
    local retention_days=90

    log_info "Cleaning up backups older than ${retention_days} days..."

    local cutoff_date=$(date -u -d "-${retention_days} days" +%Y%m%d)

    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | \
        while read -r line; do
            local backup_date=$(echo "$line" | awk '{print $2}' | sed 's|/||g' | cut -c1-8)

            if [[ -n "${backup_date}" ]] && [[ "${backup_date}" < "${cutoff_date}" ]]; then
                local backup_path=$(echo "$line" | awk '{print $2}')
                log_info "Deleting old backup: ${backup_path}"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${backup_path}" --recursive
            fi
        done

    log_info "Cleanup completed"
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "========================================="
    log_info "VytalWatch File Backup"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Source: ${SOURCE_BUCKET}"
    log_info "========================================="

    mkdir -p "${LOG_DIR}"

    # Sync files
    sync_files_to_backup

    # Create manifest
    create_manifest

    # Verify backup
    verify_backup

    # Cleanup old backups
    cleanup_old_backups

    log_info "========================================="
    log_info "File backup completed successfully!"
    log_info "========================================="
}

main "$@"
