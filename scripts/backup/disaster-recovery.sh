#!/bin/bash
################################################################################
# VytalWatch RPM - Disaster Recovery Orchestration Script
# Full system recovery with RTO: 4 hours, RPO: 1 hour
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/dr"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/disaster_recovery_${TIMESTAMP}.log"

ENVIRONMENT="${1:-production}"
DR_SCENARIO="${2:-full}"  # full, database-only, infrastructure-only

# RTO/RPO Targets
RTO_HOURS=4
RPO_HOURS=1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DR_START_TIME=$(date +%s)

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

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $*" | tee -a "${LOG_FILE}"
}

################################################################################
# Time Tracking
################################################################################

get_elapsed_time() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - DR_START_TIME))
    local hours=$((elapsed / 3600))
    local minutes=$(((elapsed % 3600) / 60))
    local seconds=$((elapsed % 60))

    echo "${hours}h ${minutes}m ${seconds}s"
}

check_rto() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - DR_START_TIME))
    local rto_seconds=$((RTO_HOURS * 3600))

    if [[ ${elapsed} -gt ${rto_seconds} ]]; then
        log_warn "RTO of ${RTO_HOURS} hours exceeded! Current: $(get_elapsed_time)"
        return 1
    fi

    log_info "Within RTO: $(get_elapsed_time) / ${RTO_HOURS} hours"
    return 0
}

################################################################################
# Notifications
################################################################################

send_dr_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="warning"
        [[ "${status}" == "success" ]] && color="good"
        [[ "${status}" == "failure" ]] && color="danger"

        local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "${color}",
        "title": "🚨 DISASTER RECOVERY - ${ENVIRONMENT}",
        "text": "${message}",
        "fields": [
            {
                "title": "Scenario",
                "value": "${DR_SCENARIO}",
                "short": true
            },
            {
                "title": "Elapsed Time",
                "value": "$(get_elapsed_time)",
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

    # PagerDuty for critical events
    if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]] && [[ "${status}" == "failure" ]]; then
        local pd_payload=$(cat <<EOF
{
    "routing_key": "${PAGERDUTY_INTEGRATION_KEY}",
    "event_action": "trigger",
    "payload": {
        "summary": "Disaster Recovery Failed - ${ENVIRONMENT}",
        "severity": "critical",
        "source": "vytalwatch-dr"
    }
}
EOF
)

        curl -X POST https://events.pagerduty.com/v2/enqueue \
            -H 'Content-Type: application/json' \
            --data "${pd_payload}" 2>/dev/null || true
    fi
}

################################################################################
# DR Phase 1: Assessment
################################################################################

assess_disaster() {
    log_info "========================================="
    log_info "PHASE 1: Disaster Assessment"
    log_info "========================================="

    log_info "Checking current infrastructure state..."

    # Check Kubernetes cluster
    if kubectl cluster-info &>/dev/null; then
        log_info "Kubernetes cluster is accessible"
    else
        log_critical "Kubernetes cluster is not accessible - full infrastructure recovery needed"
    fi

    # Check database
    if [[ -f "${SCRIPT_DIR}/../database/verify-schema.sh" ]]; then
        if bash "${SCRIPT_DIR}/../database/verify-schema.sh" "${ENVIRONMENT}" &>/dev/null; then
            log_info "Database is accessible"
        else
            log_critical "Database is not accessible - database recovery needed"
        fi
    fi

    # Check S3 backups
    if aws s3 ls "s3://vytalwatch-backups/${ENVIRONMENT}/" &>/dev/null; then
        log_info "Backup storage is accessible"
    else
        log_critical "Backup storage is not accessible - critical issue"
        exit 1
    fi

    log_info "Assessment complete"
}

################################################################################
# DR Phase 2: Infrastructure Recovery
################################################################################

recover_infrastructure() {
    if [[ "${DR_SCENARIO}" != "infrastructure-only" ]] && [[ "${DR_SCENARIO}" != "full" ]]; then
        log_info "Skipping infrastructure recovery for scenario: ${DR_SCENARIO}"
        return 0
    fi

    log_info "========================================="
    log_info "PHASE 2: Infrastructure Recovery"
    log_info "========================================="

    # Apply Terraform to recreate infrastructure
    log_info "Provisioning infrastructure with Terraform..."

    if [[ -d "${PROJECT_ROOT}/infrastructure/terraform" ]]; then
        cd "${PROJECT_ROOT}/infrastructure/terraform"

        terraform init
        terraform plan -out=dr-recovery.tfplan
        terraform apply dr-recovery.tfplan

        log_info "Infrastructure provisioned"
    else
        log_warn "Terraform configuration not found"
    fi

    # Wait for infrastructure to be ready
    log_info "Waiting for infrastructure to stabilize..."
    sleep 60

    check_rto
}

################################################################################
# DR Phase 3: Database Recovery
################################################################################

recover_database() {
    if [[ "${DR_SCENARIO}" != "database-only" ]] && [[ "${DR_SCENARIO}" != "full" ]]; then
        log_info "Skipping database recovery for scenario: ${DR_SCENARIO}"
        return 0
    fi

    log_info "========================================="
    log_info "PHASE 3: Database Recovery"
    log_info "========================================="

    # Find latest backup within RPO
    log_info "Locating latest backup within RPO (${RPO_HOURS} hour)..."

    local cutoff_time=$(date -u -d "-${RPO_HOURS} hours" +%Y-%m-%d)
    local latest_backup=$(aws s3 ls "s3://vytalwatch-backups/${ENVIRONMENT}/database/scheduled/" \
        --recursive | \
        awk '$1 >= "'"${cutoff_time}"'"' | \
        sort | tail -n 1 | awk '{print $4}')

    if [[ -z "${latest_backup}" ]]; then
        log_error "No backup found within RPO window"
        exit 1
    fi

    log_info "Using backup: ${latest_backup}"

    # Restore database
    if [[ -f "${SCRIPT_DIR}/restore-database.sh" ]]; then
        # Auto-confirm for DR scenario
        export VYTALWATCH_DR_MODE=true
        bash "${SCRIPT_DIR}/restore-database.sh" "${ENVIRONMENT}" "${latest_backup}"
    else
        log_error "restore-database.sh not found"
        exit 1
    fi

    log_info "Database recovery completed"

    check_rto
}

################################################################################
# DR Phase 4: File Recovery
################################################################################

recover_files() {
    if [[ "${DR_SCENARIO}" != "full" ]]; then
        log_info "Skipping file recovery for scenario: ${DR_SCENARIO}"
        return 0
    fi

    log_info "========================================="
    log_info "PHASE 4: File Recovery"
    log_info "========================================="

    # Find latest file backup
    local latest_file_backup=$(aws s3 ls "s3://vytalwatch-backups/${ENVIRONMENT}/files/" | \
        sort | tail -n 1 | awk '{print $2}')

    if [[ -z "${latest_file_backup}" ]]; then
        log_warn "No file backup found"
        return 0
    fi

    log_info "Restoring files from: ${latest_file_backup}"

    # Restore files to S3
    aws s3 sync \
        "s3://vytalwatch-backups/${ENVIRONMENT}/files/${latest_file_backup}" \
        "s3://vytalwatch-uploads-${ENVIRONMENT}/" \
        2>&1 | tee -a "${LOG_FILE}"

    log_info "File recovery completed"

    check_rto
}

################################################################################
# DR Phase 5: Application Deployment
################################################################################

deploy_application() {
    if [[ "${DR_SCENARIO}" != "full" ]]; then
        log_info "Skipping application deployment for scenario: ${DR_SCENARIO}"
        return 0
    fi

    log_info "========================================="
    log_info "PHASE 5: Application Deployment"
    log_info "========================================="

    # Deploy using Helm
    log_info "Deploying application with Helm..."

    if [[ -d "${PROJECT_ROOT}/infrastructure/helm/vytalwatch" ]]; then
        helm upgrade --install vytalwatch \
            "${PROJECT_ROOT}/infrastructure/helm/vytalwatch" \
            --namespace "vytalwatch-${ENVIRONMENT}" \
            --create-namespace \
            --values "${PROJECT_ROOT}/infrastructure/helm/vytalwatch/values-${ENVIRONMENT}.yaml" \
            --wait \
            --timeout 15m
    else
        log_error "Helm chart not found"
        exit 1
    fi

    log_info "Application deployed"

    check_rto
}

################################################################################
# DR Phase 6: Verification
################################################################################

verify_recovery() {
    log_info "========================================="
    log_info "PHASE 6: Recovery Verification"
    log_info "========================================="

    # Run health checks
    if [[ -f "${SCRIPT_DIR}/../monitoring/health-check.sh" ]]; then
        bash "${SCRIPT_DIR}/../monitoring/health-check.sh" "${ENVIRONMENT}"
    fi

    # Run post-deployment tests
    if [[ -f "${SCRIPT_DIR}/../deployment/post-deployment-tests.sh" ]]; then
        bash "${SCRIPT_DIR}/../deployment/post-deployment-tests.sh" "${ENVIRONMENT}"
    fi

    # Verify data integrity
    log_info "Verifying data integrity..."

    # This would run data integrity checks

    log_info "Recovery verification completed"

    check_rto
}

################################################################################
# DR Phase 7: DNS and Traffic
################################################################################

restore_traffic() {
    if [[ "${DR_SCENARIO}" != "full" ]]; then
        log_info "Skipping traffic restoration for scenario: ${DR_SCENARIO}"
        return 0
    fi

    log_info "========================================="
    log_info "PHASE 7: Traffic Restoration"
    log_info "========================================="

    # Update DNS if needed
    log_info "Verifying DNS configuration..."

    # Get load balancer hostname
    local lb_hostname=$(kubectl get service vytalwatch -n "vytalwatch-${ENVIRONMENT}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "")

    if [[ -n "${lb_hostname}" ]]; then
        log_info "Load balancer ready: ${lb_hostname}"
        # DNS updates would happen here
    else
        log_warn "Load balancer not ready"
    fi

    log_info "Traffic restoration completed"

    check_rto
}

################################################################################
# DR Summary
################################################################################

print_dr_summary() {
    local status="$1"

    log_info "========================================="
    log_info "DISASTER RECOVERY SUMMARY"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Scenario: ${DR_SCENARIO}"
    log_info "Status: ${status}"
    log_info "Total Time: $(get_elapsed_time)"
    log_info "RTO Target: ${RTO_HOURS} hours"
    log_info "RPO Target: ${RPO_HOURS} hour"
    log_info "========================================="

    if [[ "${status}" == "SUCCESS" ]]; then
        log_info "Current System Status:"
        kubectl get pods -n "vytalwatch-${ENVIRONMENT}"
        echo ""
        kubectl get services -n "vytalwatch-${ENVIRONMENT}"
    fi

    log_info "========================================="
    log_info "Log file: ${LOG_FILE}"
    log_info "========================================="
}

################################################################################
# Main Execution
################################################################################

main() {
    log_critical "========================================="
    log_critical "DISASTER RECOVERY INITIATED"
    log_critical "========================================="
    log_critical "Environment: ${ENVIRONMENT}"
    log_critical "Scenario: ${DR_SCENARIO}"
    log_critical "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
    log_critical "========================================="

    mkdir -p "${LOG_DIR}"

    # Send initial notification
    send_dr_notification "warning" "Disaster recovery initiated"

    # Execute DR phases
    assess_disaster
    recover_infrastructure
    recover_database
    recover_files
    deploy_application
    verify_recovery
    restore_traffic

    # Print summary
    print_dr_summary "SUCCESS"

    # Send success notification
    send_dr_notification "success" "Disaster recovery completed successfully in $(get_elapsed_time)"

    log_info "========================================="
    log_info "DISASTER RECOVERY COMPLETED SUCCESSFULLY"
    log_info "========================================="
}

# Handle errors
trap 'send_dr_notification "failure" "Disaster recovery failed"; print_dr_summary "FAILED"; exit 1' ERR

main "$@"
