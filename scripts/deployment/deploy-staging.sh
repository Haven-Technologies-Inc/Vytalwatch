#!/bin/bash
################################################################################
# VytalWatch RPM - Staging Deployment Script
# Deploy application to staging environment with comprehensive health checks
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/staging_deploy_${TIMESTAMP}.log"

# Environment variables
ENVIRONMENT="staging"
NAMESPACE="vytalwatch-staging"
DEPLOYMENT_NAME="vytalwatch"
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10

# Slack webhook for notifications
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
        "title": "VytalWatch Staging Deployment",
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

################################################################################
# Cleanup and Error Handling
################################################################################

cleanup() {
    local exit_code=$?
    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Deployment failed with exit code ${exit_code}"
        send_slack_notification "failure" "Staging deployment failed. Check logs for details."
    fi
}

trap cleanup EXIT

################################################################################
# Validation Functions
################################################################################

validate_prerequisites() {
    log_info "Validating prerequisites..."

    # Check required commands
    local required_commands=("kubectl" "helm" "git" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" &> /dev/null; then
            log_error "Required command '${cmd}' not found"
            exit 1
        fi
    done

    # Check kubectl context
    local current_context=$(kubectl config current-context)
    log_info "Current kubectl context: ${current_context}"

    if [[ ! "${current_context}" =~ staging ]]; then
        log_error "kubectl context does not appear to be staging. Current: ${current_context}"
        read -p "Continue anyway? (yes/no): " confirm
        if [[ "${confirm}" != "yes" ]]; then
            exit 1
        fi
    fi

    # Check namespace exists
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_info "Creating namespace ${NAMESPACE}..."
        kubectl create namespace "${NAMESPACE}"
    fi

    log_info "Prerequisites validated successfully"
}

################################################################################
# Pre-deployment Checks
################################################################################

run_pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Run pre-deployment validation script
    if [[ -f "${SCRIPT_DIR}/pre-deployment-checks.sh" ]]; then
        bash "${SCRIPT_DIR}/pre-deployment-checks.sh" "${ENVIRONMENT}"
    else
        log_warn "pre-deployment-checks.sh not found, skipping"
    fi

    log_info "Pre-deployment checks completed"
}

################################################################################
# Database Migration
################################################################################

run_database_migrations() {
    log_info "Running database migrations..."

    # Backup database before migration
    if [[ -f "${SCRIPT_DIR}/../database/backup-before-migration.sh" ]]; then
        bash "${SCRIPT_DIR}/../database/backup-before-migration.sh" "${ENVIRONMENT}"
    fi

    # Run migrations
    if [[ -f "${SCRIPT_DIR}/../database/run-migrations.sh" ]]; then
        bash "${SCRIPT_DIR}/../database/run-migrations.sh" "${ENVIRONMENT}"
    else
        log_warn "Migration script not found, skipping migrations"
    fi

    log_info "Database migrations completed"
}

################################################################################
# Build and Push Docker Images
################################################################################

build_and_push_images() {
    log_info "Building and pushing Docker images..."

    local git_sha=$(git rev-parse --short HEAD)
    local image_tag="${ENVIRONMENT}-${git_sha}-${TIMESTAMP}"

    # Build backend image
    log_info "Building backend image..."
    docker build -t "vytalwatch/backend:${image_tag}" \
        -f "${PROJECT_ROOT}/backend/Dockerfile" \
        "${PROJECT_ROOT}/backend"

    # Build frontend image
    log_info "Building frontend image..."
    docker build -t "vytalwatch/frontend:${image_tag}" \
        -f "${PROJECT_ROOT}/vitalwatch-frontend/Dockerfile" \
        "${PROJECT_ROOT}/vitalwatch-frontend"

    # Push to registry
    log_info "Pushing images to registry..."
    docker push "vytalwatch/backend:${image_tag}"
    docker push "vytalwatch/frontend:${image_tag}"

    # Store image tag for deployment
    echo "${image_tag}" > "${LOG_DIR}/last_image_tag.txt"

    log_info "Images built and pushed successfully: ${image_tag}"
}

################################################################################
# Deploy Application
################################################################################

deploy_application() {
    log_info "Deploying application to ${ENVIRONMENT}..."

    local image_tag=$(cat "${LOG_DIR}/last_image_tag.txt")

    # Deploy using Helm
    helm upgrade --install "${DEPLOYMENT_NAME}" \
        "${PROJECT_ROOT}/infrastructure/helm/vytalwatch" \
        --namespace "${NAMESPACE}" \
        --create-namespace \
        --set environment="${ENVIRONMENT}" \
        --set image.backend.tag="${image_tag}" \
        --set image.frontend.tag="${image_tag}" \
        --set replicas.backend=2 \
        --set replicas.frontend=2 \
        --values "${PROJECT_ROOT}/infrastructure/helm/vytalwatch/values-staging.yaml" \
        --wait \
        --timeout 10m

    log_info "Application deployed successfully"
}

################################################################################
# Health Checks
################################################################################

wait_for_pods_ready() {
    log_info "Waiting for pods to be ready..."

    local elapsed=0
    while [[ ${elapsed} -lt ${HEALTH_CHECK_TIMEOUT} ]]; do
        local ready_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -l app="${DEPLOYMENT_NAME}" \
            -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)

        local total_pods=$(kubectl get pods -n "${NAMESPACE}" \
            -l app="${DEPLOYMENT_NAME}" \
            -o jsonpath='{.items[*].metadata.name}' | wc -w)

        log_info "Pods ready: ${ready_pods}/${total_pods}"

        if [[ ${ready_pods} -eq ${total_pods} ]] && [[ ${total_pods} -gt 0 ]]; then
            log_info "All pods are ready"
            return 0
        fi

        sleep ${HEALTH_CHECK_INTERVAL}
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
    done

    log_error "Timeout waiting for pods to be ready"
    return 1
}

run_health_checks() {
    log_info "Running health checks..."

    # Wait for pods to be ready
    wait_for_pods_ready

    # Run comprehensive health check script
    if [[ -f "${SCRIPT_DIR}/../monitoring/health-check.sh" ]]; then
        bash "${SCRIPT_DIR}/../monitoring/health-check.sh" "${ENVIRONMENT}"
    fi

    # Get service endpoint
    local service_url=$(kubectl get service "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

    log_info "Service URL: ${service_url}"

    # Test API endpoints
    if [[ "${service_url}" != "pending" ]]; then
        log_info "Testing API health endpoint..."
        local health_response=$(curl -s -o /dev/null -w "%{http_code}" \
            "http://${service_url}/api/health" || echo "000")

        if [[ "${health_response}" == "200" ]]; then
            log_info "Health check passed (HTTP ${health_response})"
        else
            log_error "Health check failed (HTTP ${health_response})"
            return 1
        fi
    else
        log_warn "Service endpoint not yet available, skipping URL health check"
    fi

    log_info "Health checks completed successfully"
}

################################################################################
# Post-deployment Tests
################################################################################

run_post_deployment_tests() {
    log_info "Running post-deployment tests..."

    # Run smoke tests
    if [[ -f "${SCRIPT_DIR}/post-deployment-tests.sh" ]]; then
        bash "${SCRIPT_DIR}/post-deployment-tests.sh" "${ENVIRONMENT}"
    else
        log_warn "post-deployment-tests.sh not found, skipping"
    fi

    log_info "Post-deployment tests completed"
}

################################################################################
# Deployment Summary
################################################################################

print_deployment_summary() {
    log_info "========================================="
    log_info "Deployment Summary"
    log_info "========================================="
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "Image Tag: $(cat ${LOG_DIR}/last_image_tag.txt 2>/dev/null || echo 'N/A')"

    # Get pod status
    log_info ""
    log_info "Pod Status:"
    kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT_NAME}"

    # Get service status
    log_info ""
    log_info "Service Status:"
    kubectl get services -n "${NAMESPACE}"

    log_info "========================================="
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "Starting VytalWatch staging deployment..."
    log_info "Log file: ${LOG_FILE}"

    # Create log directory
    mkdir -p "${LOG_DIR}"

    # Send start notification
    send_slack_notification "good" "Starting staging deployment..."

    # Execute deployment steps
    validate_prerequisites
    run_pre_deployment_checks
    run_database_migrations
    build_and_push_images
    deploy_application
    run_health_checks
    run_post_deployment_tests
    print_deployment_summary

    # Send success notification
    send_slack_notification "good" "Staging deployment completed successfully!"

    log_info "Deployment completed successfully!"
}

# Execute main function
main "$@"
