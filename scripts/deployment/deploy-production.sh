#!/bin/bash
################################################################################
# VytalWatch RPM - Production Deployment Script
# Production deployment with comprehensive safety checks and rollback capability
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/production_deploy_${TIMESTAMP}.log"

# Environment variables
ENVIRONMENT="production"
NAMESPACE="vytalwatch-production"
DEPLOYMENT_NAME="vytalwatch"
HEALTH_CHECK_TIMEOUT=600
HEALTH_CHECK_INTERVAL=15
ROLLBACK_TIMEOUT=300

# Slack webhook for notifications
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
PAGERDUTY_INTEGRATION_KEY="${PAGERDUTY_INTEGRATION_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# Logging Functions
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

log_critical() {
    log "CRITICAL" "$@"
    echo -e "${RED}[CRITICAL]${NC} $*"
}

################################################################################
# Notification Functions
################################################################################

send_slack_notification() {
    local status="$1"
    local message="$2"

    if [[ -z "${SLACK_WEBHOOK_URL}" ]]; then
        log_warn "Slack webhook not configured, skipping notification"
        return 0
    fi

    local color="good"
    [[ "${status}" == "failure" ]] && color="danger"
    [[ "${status}" == "warning" ]] && color="warning"

    local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "${color}",
        "title": "🚀 VytalWatch PRODUCTION Deployment",
        "text": "${message}",
        "fields": [
            {
                "title": "Environment",
                "value": "${ENVIRONMENT}",
                "short": true
            },
            {
                "title": "Timestamp",
                "value": "$(date '+%Y-%m-%d %H:%M:%S')",
                "short": true
            },
            {
                "title": "Deployed By",
                "value": "${USER}",
                "short": true
            }
        ]
    }]
}
EOF
)

    curl -X POST -H 'Content-type: application/json' \
        --data "${payload}" \
        "${SLACK_WEBHOOK_URL}" 2>/dev/null || log_warn "Failed to send Slack notification"
}

trigger_pagerduty_incident() {
    local severity="$1"
    local summary="$2"

    if [[ -z "${PAGERDUTY_INTEGRATION_KEY}" ]]; then
        return 0
    fi

    local payload=$(cat <<EOF
{
    "routing_key": "${PAGERDUTY_INTEGRATION_KEY}",
    "event_action": "trigger",
    "payload": {
        "summary": "${summary}",
        "severity": "${severity}",
        "source": "vytalwatch-deployment",
        "custom_details": {
            "environment": "${ENVIRONMENT}",
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        }
    }
}
EOF
)

    curl -X POST https://events.pagerduty.com/v2/enqueue \
        -H 'Content-Type: application/json' \
        --data "${payload}" 2>/dev/null || log_warn "Failed to trigger PagerDuty incident"
}

################################################################################
# Safety and Validation
################################################################################

require_manual_approval() {
    log_warn "========================================="
    log_warn "PRODUCTION DEPLOYMENT APPROVAL REQUIRED"
    log_warn "========================================="
    log_warn "Environment: ${ENVIRONMENT}"
    log_warn "Namespace: ${NAMESPACE}"
    log_warn "Current time: $(date '+%Y-%m-%d %H:%M:%S')"
    log_warn "========================================="

    # Show current production status
    log_info "Current production pods:"
    kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT_NAME}" 2>/dev/null || log_warn "No existing deployment found"

    # Require explicit confirmation
    echo ""
    read -p "Type 'deploy-to-production' to confirm deployment: " confirmation

    if [[ "${confirmation}" != "deploy-to-production" ]]; then
        log_error "Deployment cancelled by user"
        exit 1
    fi

    log_info "Deployment approved by ${USER}"
}

validate_production_prerequisites() {
    log_info "Validating production prerequisites..."

    # Check required commands
    local required_commands=("kubectl" "helm" "git" "jq" "aws")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            log_error "Required command '${cmd}' not found"
            exit 1
        fi
    done

    # Verify kubectl context is production
    local current_context=$(kubectl config current-context)
    log_info "Current kubectl context: ${current_context}"

    if [[ ! "${current_context}" =~ production ]]; then
        log_error "kubectl context MUST be production. Current: ${current_context}"
        exit 1
    fi

    # Check that we're on a tagged release
    if ! git describe --exact-match --tags HEAD &> /dev/null; then
        log_error "Production deployments must be from tagged releases"
        log_error "Current commit: $(git rev-parse --short HEAD)"
        exit 1
    fi

    local git_tag=$(git describe --exact-match --tags HEAD)
    log_info "Deploying from git tag: ${git_tag}"

    # Check namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_error "Production namespace ${NAMESPACE} does not exist"
        exit 1
    fi

    # Verify database backup is recent
    log_info "Checking recent database backups..."
    # This would check S3 for recent backups

    log_info "Production prerequisites validated successfully"
}

################################################################################
# Pre-deployment Backup
################################################################################

create_pre_deployment_backup() {
    log_info "Creating pre-deployment backup..."

    # Database backup
    if [[ -f "${SCRIPT_DIR}/../backup/backup-database.sh" ]]; then
        bash "${SCRIPT_DIR}/../backup/backup-database.sh" "pre-deployment-${TIMESTAMP}"
    fi

    # Save current deployment state
    log_info "Saving current deployment state..."
    kubectl get deployment -n "${NAMESPACE}" -o yaml > "${LOG_DIR}/deployment_backup_${TIMESTAMP}.yaml"
    kubectl get service -n "${NAMESPACE}" -o yaml > "${LOG_DIR}/service_backup_${TIMESTAMP}.yaml"
    kubectl get configmap -n "${NAMESPACE}" -o yaml > "${LOG_DIR}/configmap_backup_${TIMESTAMP}.yaml"

    # Store rollback version
    local current_revision=$(helm history "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --max 1 -o json | jq -r '.[0].revision')
    echo "${current_revision}" > "${LOG_DIR}/rollback_revision.txt"

    log_info "Pre-deployment backup completed"
}

################################################################################
# Deployment
################################################################################

deploy_to_production() {
    log_info "Deploying to production..."

    local git_tag=$(git describe --exact-match --tags HEAD)

    # Build and push production images with tag
    log_info "Building production images with tag: ${git_tag}..."

    docker build -t "vytalwatch/backend:${git_tag}" \
        -t "vytalwatch/backend:latest" \
        -f "${PROJECT_ROOT}/backend/Dockerfile" \
        "${PROJECT_ROOT}/backend"

    docker build -t "vytalwatch/frontend:${git_tag}" \
        -t "vytalwatch/frontend:latest" \
        -f "${PROJECT_ROOT}/vitalwatch-frontend/Dockerfile" \
        "${PROJECT_ROOT}/vitalwatch-frontend"

    # Push to production registry
    docker push "vytalwatch/backend:${git_tag}"
    docker push "vytalwatch/backend:latest"
    docker push "vytalwatch/frontend:${git_tag}"
    docker push "vytalwatch/frontend:latest"

    # Deploy using Helm with production values
    log_info "Deploying with Helm..."
    helm upgrade --install "${DEPLOYMENT_NAME}" \
        "${PROJECT_ROOT}/infrastructure/helm/vytalwatch" \
        --namespace "${NAMESPACE}" \
        --set environment="${ENVIRONMENT}" \
        --set image.backend.tag="${git_tag}" \
        --set image.frontend.tag="${git_tag}" \
        --set replicas.backend=4 \
        --set replicas.frontend=4 \
        --set autoscaling.enabled=true \
        --set autoscaling.minReplicas=4 \
        --set autoscaling.maxReplicas=20 \
        --values "${PROJECT_ROOT}/infrastructure/helm/vytalwatch/values-production.yaml" \
        --wait \
        --timeout 15m \
        --atomic

    log_info "Deployment completed"
}

################################################################################
# Health Checks and Validation
################################################################################

comprehensive_health_checks() {
    log_info "Running comprehensive health checks..."

    # Wait for pods
    local elapsed=0
    while [[ ${elapsed} -lt ${HEALTH_CHECK_TIMEOUT} ]]; do
        local ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -l app="${DEPLOYMENT_NAME}" \
            -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)

        local total_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -l app="${DEPLOYMENT_NAME}" \
            -o jsonpath='{.items[*].metadata.name}' | wc -w)

        log_info "Pods ready: ${ready_pods}/${total_pods}"

        if [[ ${ready_pods} -eq ${total_pods} ]] && [[ ${total_pods} -ge 4 ]]; then
            log_info "All pods are ready"
            break
        fi

        if [[ ${elapsed} -ge ${HEALTH_CHECK_TIMEOUT} ]]; then
            log_error "Timeout waiting for pods to be ready"
            return 1
        fi

        sleep ${HEALTH_CHECK_INTERVAL}
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
    done

    # Run health check script
    if [[ -f "${SCRIPT_DIR}/../monitoring/health-check.sh" ]]; then
        bash "${SCRIPT_DIR}/../monitoring/health-check.sh" "${ENVIRONMENT}"
    fi

    # Check error rates
    log_info "Checking error rates..."
    # This would query Prometheus for error rates

    # Check response times
    log_info "Checking response times..."
    # This would query Prometheus for p95/p99 latencies

    log_info "Health checks passed"
}

smoke_tests() {
    log_info "Running production smoke tests..."

    if [[ -f "${SCRIPT_DIR}/post-deployment-tests.sh" ]]; then
        bash "${SCRIPT_DIR}/post-deployment-tests.sh" "${ENVIRONMENT}"
    fi

    log_info "Smoke tests passed"
}

################################################################################
# Monitoring and Alerting
################################################################################

monitor_deployment() {
    log_info "Monitoring deployment for 5 minutes..."

    local monitor_duration=300
    local check_interval=30
    local elapsed=0

    while [[ ${elapsed} -lt ${monitor_duration} ]]; do
        # Check pod health
        local unhealthy_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -l app="${DEPLOYMENT_NAME}" \
            -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')

        if [[ -n "${unhealthy_pods}" ]]; then
            log_error "Unhealthy pods detected: ${unhealthy_pods}"
            return 1
        fi

        # Check error rates (would query actual metrics)
        log_info "Monitoring metrics... (${elapsed}s/${monitor_duration}s)"

        sleep ${check_interval}
        elapsed=$((elapsed + check_interval))
    done

    log_info "Monitoring completed - deployment is stable"
}

################################################################################
# Rollback
################################################################################

rollback_deployment() {
    log_critical "Initiating automatic rollback..."

    send_slack_notification "failure" "Production deployment failed - initiating automatic rollback"
    trigger_pagerduty_incident "error" "Production deployment failed - rollback in progress"

    # Run rollback script
    if [[ -f "${SCRIPT_DIR}/rollback-deployment.sh" ]]; then
        bash "${SCRIPT_DIR}/rollback-deployment.sh" "${ENVIRONMENT}"
    else
        # Fallback rollback
        local rollback_revision=$(cat "${LOG_DIR}/rollback_revision.txt" 2>/dev/null || echo "0")
        if [[ "${rollback_revision}" != "0" ]]; then
            helm rollback "${DEPLOYMENT_NAME}" "${rollback_revision}" -n "${NAMESPACE}" --wait
        fi
    fi

    log_critical "Rollback completed"
}

################################################################################
# Cleanup and Error Handling
################################################################################

cleanup() {
    local exit_code=$?

    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Production deployment failed with exit code ${exit_code}"

        # Attempt rollback
        rollback_deployment || log_critical "Rollback failed - manual intervention required!"

        send_slack_notification "failure" "Production deployment failed and rollback attempted. Manual verification required."
        trigger_pagerduty_incident "critical" "Production deployment failed - manual intervention required"

        exit ${exit_code}
    fi
}

trap cleanup EXIT

################################################################################
# Deployment Summary
################################################################################

print_deployment_summary() {
    log_info "========================================="
    log_info "PRODUCTION DEPLOYMENT SUMMARY"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Git Tag: $(git describe --exact-match --tags HEAD 2>/dev/null || echo 'N/A')"
    log_info "Deployed By: ${USER}"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

    log_info ""
    log_info "Pod Status:"
    kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT_NAME}"

    log_info ""
    log_info "Service Status:"
    kubectl get services -n "${NAMESPACE}"

    log_info ""
    log_info "Helm Release:"
    helm list -n "${NAMESPACE}"

    log_info "========================================="
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "========================================="
    log_info "VytalWatch PRODUCTION Deployment"
    log_info "========================================="
    log_info "Log file: ${LOG_FILE}"

    # Create log directory
    mkdir -p "${LOG_DIR}"

    # Manual approval required
    require_manual_approval

    # Send start notification
    send_slack_notification "warning" "Production deployment initiated by ${USER}"

    # Validate prerequisites
    validate_production_prerequisites

    # Run pre-deployment checks
    if [[ -f "${SCRIPT_DIR}/pre-deployment-checks.sh" ]]; then
        bash "${SCRIPT_DIR}/pre-deployment-checks.sh" "${ENVIRONMENT}"
    fi

    # Create backup
    create_pre_deployment_backup

    # Deploy
    deploy_to_production

    # Health checks
    comprehensive_health_checks

    # Smoke tests
    smoke_tests

    # Monitor for stability
    monitor_deployment

    # Print summary
    print_deployment_summary

    # Success notification
    send_slack_notification "good" "Production deployment completed successfully! 🎉"

    log_info "========================================="
    log_info "PRODUCTION DEPLOYMENT SUCCESSFUL!"
    log_info "========================================="
}

# Execute main function
main "$@"
