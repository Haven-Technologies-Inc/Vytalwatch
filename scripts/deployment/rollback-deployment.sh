#!/bin/bash
################################################################################
# VytalWatch RPM - Automatic Rollback Script
# Rollback deployment to previous stable version
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/rollback_${TIMESTAMP}.log"

# Environment
ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"
DEPLOYMENT_NAME="vytalwatch"
ROLLBACK_TIMEOUT=300

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
# Rollback Functions
################################################################################

get_previous_revision() {
    log_info "Finding previous stable revision..."

    # Get Helm history
    local history=$(helm history "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o json)
    local total_revisions=$(echo "${history}" | jq '. | length')

    if [[ ${total_revisions} -lt 2 ]]; then
        log_error "No previous revision found to rollback to"
        return 1
    fi

    # Get last deployed revision (skipping current)
    local previous_revision=$(echo "${history}" | jq -r '.[-2].revision')

    log_info "Previous revision: ${previous_revision}"
    echo "${previous_revision}"
}

perform_rollback() {
    local target_revision="${1:-}"

    if [[ -z "${target_revision}" ]]; then
        target_revision=$(get_previous_revision)
    fi

    log_warn "========================================="
    log_warn "INITIATING ROLLBACK"
    log_warn "========================================="
    log_warn "Environment: ${ENVIRONMENT}"
    log_warn "Target Revision: ${target_revision}"
    log_warn "========================================="

    # Perform Helm rollback
    log_info "Rolling back Helm release..."
    helm rollback "${DEPLOYMENT_NAME}" "${target_revision}" \
        -n "${NAMESPACE}" \
        --wait \
        --timeout "${ROLLBACK_TIMEOUT}s" \
        --cleanup-on-fail

    log_info "Helm rollback completed"
}

verify_rollback() {
    log_info "Verifying rollback..."

    # Wait for pods to stabilize
    sleep 10

    # Check pod status
    local ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -l app="${DEPLOYMENT_NAME}" \
        -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)

    local total_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -l app="${DEPLOYMENT_NAME}" \
        -o jsonpath='{.items[*].metadata.name}' | wc -w)

    log_info "Pods ready: ${ready_pods}/${total_pods}"

    if [[ ${ready_pods} -ne ${total_pods} ]]; then
        log_error "Not all pods are ready after rollback"
        return 1
    fi

    # Run health check
    if [[ -f "${SCRIPT_DIR}/../monitoring/health-check.sh" ]]; then
        bash "${SCRIPT_DIR}/../monitoring/health-check.sh" "${ENVIRONMENT}"
    fi

    log_info "Rollback verified successfully"
}

restore_database() {
    log_warn "Checking if database restore is needed..."

    # Check if there's a pre-deployment backup
    local latest_backup=$(aws s3 ls "s3://vytalwatch-backups/${ENVIRONMENT}/pre-deployment/" \
        --recursive | sort | tail -n 1 | awk '{print $4}' || echo "")

    if [[ -n "${latest_backup}" ]]; then
        read -p "Restore database from backup? (yes/no): " confirm
        if [[ "${confirm}" == "yes" ]]; then
            if [[ -f "${SCRIPT_DIR}/../backup/restore-database.sh" ]]; then
                bash "${SCRIPT_DIR}/../backup/restore-database.sh" "${latest_backup}"
            fi
        fi
    else
        log_warn "No pre-deployment backup found"
    fi
}

print_rollback_summary() {
    log_info "========================================="
    log_info "ROLLBACK SUMMARY"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

    log_info ""
    log_info "Current Helm Release:"
    helm list -n "${NAMESPACE}"

    log_info ""
    log_info "Pod Status:"
    kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT_NAME}"

    log_info "========================================="
}

################################################################################
# Main Execution
################################################################################

main() {
    log_warn "Starting rollback for environment: ${ENVIRONMENT}"

    mkdir -p "${LOG_DIR}"

    # Optional: Restore database if needed
    # restore_database

    # Perform rollback
    perform_rollback

    # Verify rollback
    verify_rollback

    # Print summary
    print_rollback_summary

    log_info "Rollback completed successfully"
}

main "$@"
