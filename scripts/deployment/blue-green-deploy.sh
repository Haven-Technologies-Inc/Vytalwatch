#!/bin/bash
################################################################################
# VytalWatch RPM - Blue-Green Deployment Script
# Zero-downtime deployment using blue-green strategy
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/blue_green_deploy_${TIMESTAMP}.log"

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"
DEPLOYMENT_NAME="vytalwatch"
SERVICE_NAME="vytalwatch"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

################################################################################
# Logging
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*" | tee -a "${LOG_FILE}"
}

log_blue() {
    echo -e "${BLUE}[BLUE]${NC} $*" | tee -a "${LOG_FILE}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}"
}

################################################################################
# Blue-Green Deployment Functions
################################################################################

get_current_environment() {
    # Get current active environment (blue or green)
    local current_selector=$(kubectl get service "${SERVICE_NAME}" -n "${NAMESPACE}" \
        -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")

    echo "${current_selector}"
}

get_target_environment() {
    local current="$1"

    if [[ "${current}" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

deploy_new_environment() {
    local target_env="$1"
    local image_tag="$2"

    log_info "Deploying to ${target_env} environment..."

    # Create deployment for target environment
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${DEPLOYMENT_NAME}-${target_env}
  namespace: ${NAMESPACE}
  labels:
    app: ${DEPLOYMENT_NAME}
    version: ${target_env}
spec:
  replicas: 4
  selector:
    matchLabels:
      app: ${DEPLOYMENT_NAME}
      version: ${target_env}
  template:
    metadata:
      labels:
        app: ${DEPLOYMENT_NAME}
        version: ${target_env}
    spec:
      containers:
      - name: backend
        image: vytalwatch/backend:${image_tag}
        ports:
        - containerPort: 3000
        env:
        - name: ENVIRONMENT
          value: ${target_env}
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: vytalwatch-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      - name: frontend
        image: vytalwatch/frontend:${image_tag}
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
EOF

    log_info "Waiting for ${target_env} deployment to be ready..."
    kubectl rollout status deployment/${DEPLOYMENT_NAME}-${target_env} -n "${NAMESPACE}" --timeout=10m

    log_info "${target_env} environment deployed successfully"
}

test_new_environment() {
    local target_env="$1"

    log_info "Testing ${target_env} environment..."

    # Get pod IP for testing
    local pod_name=$(kubectl get pods -n "${NAMESPACE}" \
        -l "app=${DEPLOYMENT_NAME},version=${target_env}" \
        -o jsonpath='{.items[0].metadata.name}')

    if [[ -z "${pod_name}" ]]; then
        log_error "No pods found for ${target_env} environment"
        return 1
    fi

    # Port-forward for testing
    log_info "Port-forwarding to ${target_env} pod for testing..."
    kubectl port-forward -n "${NAMESPACE}" "${pod_name}" 8080:3000 &
    local port_forward_pid=$!

    sleep 5

    # Run smoke tests
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health || echo "000")

    # Kill port-forward
    kill ${port_forward_pid} 2>/dev/null || true

    if [[ "${health_status}" != "200" ]]; then
        log_error "${target_env} health check failed (HTTP ${health_status})"
        return 1
    fi

    log_info "${target_env} environment tests passed"
}

switch_traffic() {
    local target_env="$1"

    log_warn "Switching traffic to ${target_env} environment..."

    # Update service selector to point to new environment
    kubectl patch service "${SERVICE_NAME}" -n "${NAMESPACE}" \
        -p "{\"spec\":{\"selector\":{\"app\":\"${DEPLOYMENT_NAME}\",\"version\":\"${target_env}\"}}}"

    log_info "Traffic switched to ${target_env}"

    # Wait a bit for traffic to stabilize
    sleep 10
}

verify_traffic_switch() {
    local target_env="$1"

    log_info "Verifying traffic switch to ${target_env}..."

    # Check service endpoints
    local endpoints=$(kubectl get endpoints "${SERVICE_NAME}" -n "${NAMESPACE}" \
        -o jsonpath='{.subsets[0].addresses[*].ip}')

    log_info "Active endpoints: ${endpoints}"

    # Run health checks through service
    local service_url=$(kubectl get service "${SERVICE_NAME}" -n "${NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo "pending")

    if [[ "${service_url}" != "pending" ]]; then
        local health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://${service_url}/api/health" || echo "000")

        if [[ "${health_status}" != "200" ]]; then
            log_error "Service health check failed (HTTP ${health_status})"
            return 1
        fi
    fi

    log_info "Traffic switch verified successfully"
}

cleanup_old_environment() {
    local old_env="$1"

    log_info "Cleaning up ${old_env} environment..."

    # Scale down old deployment
    kubectl scale deployment/${DEPLOYMENT_NAME}-${old_env} -n "${NAMESPACE}" --replicas=0

    log_info "Old ${old_env} environment scaled to 0"
    log_info "You can delete it manually with: kubectl delete deployment/${DEPLOYMENT_NAME}-${old_env} -n ${NAMESPACE}"
}

rollback_to_previous() {
    local previous_env="$1"

    log_error "Rollback initiated - switching back to ${previous_env}..."

    switch_traffic "${previous_env}"

    log_error "Rolled back to ${previous_env} environment"
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "Starting Blue-Green deployment for ${ENVIRONMENT}..."
    log_info "Log file: ${LOG_FILE}"

    mkdir -p "${LOG_DIR}"

    # Get current and target environments
    local current_env=$(get_current_environment)
    local target_env=$(get_target_environment "${current_env}")

    log_info "Current environment: ${current_env}"
    log_info "Target environment: ${target_env}"

    # Get image tag
    local git_tag=$(git describe --tags --always)
    log_info "Image tag: ${git_tag}"

    # Deploy to target environment
    deploy_new_environment "${target_env}" "${git_tag}"

    # Test new environment
    if ! test_new_environment "${target_env}"; then
        log_error "New environment tests failed - aborting deployment"
        kubectl delete deployment/${DEPLOYMENT_NAME}-${target_env} -n "${NAMESPACE}" || true
        exit 1
    fi

    # Ask for confirmation before switching traffic
    log_warn "========================================="
    log_warn "Ready to switch traffic to ${target_env}"
    log_warn "========================================="
    read -p "Switch traffic now? (yes/no): " confirm

    if [[ "${confirm}" != "yes" ]]; then
        log_warn "Traffic switch cancelled"
        exit 1
    fi

    # Switch traffic
    switch_traffic "${target_env}"

    # Verify traffic switch
    if ! verify_traffic_switch "${target_env}"; then
        log_error "Traffic switch verification failed - rolling back"
        rollback_to_previous "${current_env}"
        exit 1
    fi

    # Monitor for 2 minutes
    log_info "Monitoring for 2 minutes..."
    sleep 120

    # Final verification
    if ! verify_traffic_switch "${target_env}"; then
        log_error "Post-switch verification failed - rolling back"
        rollback_to_previous "${current_env}"
        exit 1
    fi

    # Cleanup old environment
    cleanup_old_environment "${current_env}"

    log_info "========================================="
    log_info "Blue-Green deployment completed successfully!"
    log_info "Active environment: ${target_env}"
    log_info "========================================="
}

main "$@"
