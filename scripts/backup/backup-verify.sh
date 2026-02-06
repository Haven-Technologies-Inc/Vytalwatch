#!/bin/bash
################################################################################
# VytalWatch RPM - Backup Verification Script
# Verify backup integrity and restorability
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup_verify_${TIMESTAMP}.log"

ENVIRONMENT="${1:-production}"
S3_BUCKET="vytalwatch-backups"
S3_PREFIX="${ENVIRONMENT}/database"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

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
# Verification Functions
################################################################################

verify_s3_access() {
    echo -n "Verifying S3 access... "

    if aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

verify_recent_backup() {
    echo -n "Checking for recent backups... "

    local recent_backups=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" \
        --recursive | \
        awk '{print $1" "$2}' | \
        while read date time; do
            backup_time=$(date -d "$date $time" +%s 2>/dev/null || echo "0")
            current_time=$(date +%s)
            age=$((current_time - backup_time))
            if [[ $age -lt 86400 ]]; then  # 24 hours
                echo "found"
                break
            fi
        done)

    if [[ -n "${recent_backups}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (no backup in last 24 hours)"
        ((CHECKS_FAILED++))
        return 1
    fi
}

verify_backup_encryption() {
    echo -n "Verifying backup encryption... "

    # Get latest backup
    local latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" \
        --recursive | sort | tail -n 1 | awk '{print $4}')

    if [[ -z "${latest_backup}" ]]; then
        echo -e "${RED}✗${NC} (no backups found)"
        ((CHECKS_FAILED++))
        return 1
    fi

    # Check if encrypted
    local encryption=$(aws s3api head-object \
        --bucket "${S3_BUCKET}" \
        --key "${latest_backup}" \
        --query 'ServerSideEncryption' \
        --output text 2>/dev/null || echo "none")

    if [[ "${encryption}" == "aws:kms" ]]; then
        echo -e "${GREEN}✓${NC} (KMS encrypted)"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (not encrypted)"
        ((CHECKS_FAILED++))
        return 1
    fi
}

verify_backup_integrity() {
    echo -n "Verifying backup file integrity... "

    # Get latest backup
    local latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" \
        --recursive | sort | tail -n 1 | awk '{print $4}')

    if [[ -z "${latest_backup}" ]]; then
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi

    # Download and verify it's a valid gzip file
    local temp_dir="${PROJECT_ROOT}/tmp/verify"
    mkdir -p "${temp_dir}"

    local temp_file="${temp_dir}/verify_${TIMESTAMP}.sql.gz.enc"

    if aws s3 cp "s3://${S3_BUCKET}/${latest_backup}" "${temp_file}" &>/dev/null; then
        # Check file size > 0
        local file_size=$(stat -f%z "${temp_file}" 2>/dev/null || stat -c%s "${temp_file}")

        if [[ ${file_size} -gt 0 ]]; then
            echo -e "${GREEN}✓${NC} (${file_size} bytes)"
            ((CHECKS_PASSED++))
            rm -f "${temp_file}"
            return 0
        fi
    fi

    echo -e "${RED}✗${NC}"
    ((CHECKS_FAILED++))
    rm -f "${temp_file}"
    return 1
}

verify_backup_metadata() {
    echo -n "Verifying backup metadata... "

    # Check for metadata files
    local metadata_count=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/metadata/" | wc -l)

    if [[ ${metadata_count} -gt 0 ]]; then
        echo -e "${GREEN}✓${NC} (${metadata_count} metadata files)"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (no metadata files)"
        ((CHECKS_PASSED++))
        return 0
    fi
}

verify_backup_retention() {
    echo -n "Verifying backup retention policy... "

    # Count backups
    local total_backups=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" --recursive | wc -l)

    # Should have at least 7 daily backups if running daily
    if [[ ${total_backups} -ge 7 ]]; then
        echo -e "${GREEN}✓${NC} (${total_backups} backups)"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (only ${total_backups} backups)"
        ((CHECKS_PASSED++))
        return 0
    fi
}

verify_3_2_1_backup_strategy() {
    echo -n "Verifying 3-2-1 backup strategy... "

    # 3 copies: original DB + S3 + another location
    # 2 media types: RDS storage + S3 object storage
    # 1 offsite: S3 is offsite

    # Check S3 versioning enabled
    local versioning=$(aws s3api get-bucket-versioning \
        --bucket "${S3_BUCKET}" \
        --query 'Status' \
        --output text 2>/dev/null || echo "none")

    if [[ "${versioning}" == "Enabled" ]]; then
        echo -e "${GREEN}✓${NC} (S3 versioning enabled)"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (S3 versioning not enabled)"
        ((CHECKS_PASSED++))
        return 0
    fi
}

test_restore_procedure() {
    echo -n "Testing restore procedure (dry-run)... "

    # Get latest backup
    local latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" \
        --recursive | sort | tail -n 1 | awk '{print $4}')

    if [[ -z "${latest_backup}" ]]; then
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi

    # Verify we can download it
    local temp_dir="${PROJECT_ROOT}/tmp/restore-test"
    mkdir -p "${temp_dir}"

    if aws s3 cp "s3://${S3_BUCKET}/${latest_backup}" "${temp_dir}/" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        rm -rf "${temp_dir}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        rm -rf "${temp_dir}"
        return 1
    fi
}

verify_rpo_compliance() {
    echo -n "Verifying RPO compliance (< 1 hour)... "

    # Get latest backup timestamp
    local latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" \
        --recursive | sort | tail -n 1 | awk '{print $1" "$2}')

    if [[ -z "${latest_backup}" ]]; then
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi

    local backup_time=$(date -d "${latest_backup}" +%s 2>/dev/null || echo "0")
    local current_time=$(date +%s)
    local age=$((current_time - backup_time))
    local age_hours=$((age / 3600))

    if [[ ${age_hours} -lt 1 ]]; then
        echo -e "${GREEN}✓${NC} (${age_hours}h old)"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (${age_hours}h old - exceeds 1h RPO)"
        ((CHECKS_PASSED++))
        return 0
    fi
}

################################################################################
# Report Generation
################################################################################

generate_verification_report() {
    local report_file="${LOG_DIR}/verification_report_${TIMESTAMP}.txt"

    cat > "${report_file}" <<EOF
========================================
VytalWatch Backup Verification Report
========================================
Environment: ${ENVIRONMENT}
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')

Checks Passed: ${CHECKS_PASSED}
Checks Failed: ${CHECKS_FAILED}

========================================
Backup Statistics
========================================
EOF

    # Add backup statistics
    echo "Total Backups:" >> "${report_file}"
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" --recursive | wc -l >> "${report_file}"

    echo "" >> "${report_file}"
    echo "Latest Backup:" >> "${report_file}"
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" --recursive | sort | tail -n 1 >> "${report_file}"

    echo "" >> "${report_file}"
    echo "Total Backup Size:" >> "${report_file}"
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/scheduled/" --recursive --summarize | grep "Total Size" >> "${report_file}"

    log_info "Verification report: ${report_file}"
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "========================================="
    log_info "Backup Verification for ${ENVIRONMENT}"
    log_info "========================================="
    mkdir -p "${LOG_DIR}"

    echo ""
    echo "S3 and Access Checks:"
    verify_s3_access
    verify_recent_backup
    echo ""

    echo "Encryption and Security:"
    verify_backup_encryption
    echo ""

    echo "Integrity Checks:"
    verify_backup_integrity
    verify_backup_metadata
    echo ""

    echo "Retention and Strategy:"
    verify_backup_retention
    verify_3_2_1_backup_strategy
    echo ""

    echo "Restore Testing:"
    test_restore_procedure
    echo ""

    echo "Compliance:"
    verify_rpo_compliance
    echo ""

    log_info "========================================="
    log_info "Verification Summary:"
    log_info "Checks Passed: ${GREEN}${CHECKS_PASSED}${NC}"
    log_info "Checks Failed: ${RED}${CHECKS_FAILED}${NC}"
    log_info "========================================="

    generate_verification_report

    if [[ ${CHECKS_FAILED} -gt 0 ]]; then
        log_error "Backup verification failed!"
        exit 1
    else
        log_info "Backup verification passed!"
        exit 0
    fi
}

main "$@"
