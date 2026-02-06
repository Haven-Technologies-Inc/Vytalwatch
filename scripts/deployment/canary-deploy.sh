#!/bin/bash
################################################################################
# VytalWatch RPM - Canary Deployment Script
# Progressive rollout starting with 10% traffic
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/canary_deploy_${TIMESTAMP}.log"

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"
DEPLOYMENT_NAME="vytalwatch"

# Canary configuration
CANARY_STEPS=(10 25 50 75 100)
CANARY_WAIT_SECONDS=300  # Wait 5 minutes between steps
ERROR_THRESHOLD=0.05     # 5% error rate threshold
LATENCY_THRESHOLD=2000   # 2 second p95 latency threshold

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
# Metrics Functions
################################################################################

get_error_rate() {
    local deployment="$1"

    # Query Prometheus for error rate
    # This is a placeholder - would use actual Prometheus query
    local error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'rate(http_requests_total{job="'"${deployment}"'",status=~"5.."}[5m]) / rate(http_requests_total{job="'"${deployment}"'"}[5m])' \
        2>/dev/null | grep -oP '\d+\.\d+' || echo "0")

    echo "${error_rate}"
}

get_latency_p95() {
    local deployment="$1"

    # Query Prometheus for p95 latency
    # This is a placeholder - would use actual Prometheus query
    local latency=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="'"${deployment}"'"}[5m]))' \
        2>/dev/null | grep -oP '\d+\.\d+' || echo "0")

    # Convert to milliseconds
    echo "${latency}" | awk '{print $1 * 1000}'
}

check_canary_health() {
    local canary_deployment="$1"

    log_info "Checking canary health metrics..."

    # Get error rate
    local error_rate=$(get_error_rate "${canary_deployment}")
    log_info "Canary error rate: ${error_rate}"

    # Get latency
    local latency=$(get_latency_p95 "${canary_deployment}")
    log_info "Canary p95 latency: ${latency}ms"

    # Check thresholds
    if (( $(echo "${error_rate} > ${ERROR_THRESHOLD}" | bc -l) )); then
        log_error "Error rate ${error_rate} exceeds threshold ${ERROR_THRESHOLD}"
        return 1
    fi

    if (( $(echo "${latency} > ${LATENCY_THRESHOLD}" | bc -l) )); then
        log_error "Latency ${latency}ms exceeds threshold ${LATENCY_THRESHOLD}ms"
        return 1
    fi

    log_info "Canary health check passed"
    return 0
}

################################################################################
# Canary Deployment Functions
################################################################################

deploy_canary() {
    local image_tag="$1"

    log_info "Deploying canary version..."

    # Create canary deployment
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${DEPLOYMENT_NAME}-canary
  namespace: ${NAMESPACE}
  labels:
    app: ${DEPLOYMENT_NAME}
    track: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${DEPLOYMENT_NAME}
      track: canary
  template:
    metadata:
      labels:
        app: ${DEPLOYMENT_NAME}
        track: canary
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
    spec:
      containers:
      - name: backend
        image: vytalwatch/backend:${image_tag}
        ports:
        - containerPort: 3000
        env:
        - name: ENVIRONMENT
          value: canary
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

    # Wait for canary to be ready
    kubectl rollout status deployment/${DEPLOYMENT_NAME}-canary -n "${NAMESPACE}" --timeout=5m

    log_info "Canary deployed successfully"
}

scale_canary() {
    local percentage="$1"

    log_info "Scaling canary to ${percentage}% of traffic..."

    # Calculate replica counts based on percentage
    local total_replicas=$(kubectl get deployment ${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" \
        -o jsonpath='{.spec.replicas}')

    local canary_replicas=$(echo "scale=0; ${total_replicas} * ${percentage} / 100" | bc)
    canary_replicas=$((canary_replicas < 1 ? 1 : canary_replicas))

    local stable_replicas=$(echo "${total_replicas} - ${canary_replicas}" | bc)

    log_info "Canary replicas: ${canary_replicas}, Stable replicas: ${stable_replicas}"

    # Scale deployments
    kubectl scale deployment/${DEPLOYMENT_NAME}-canary -n "${NAMESPACE}" --replicas=${canary_replicas}
    kubectl scale deployment/${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" --replicas=${stable_replicas}

    # Wait for scaling
    sleep 30

    # Verify scaling
    kubectl rollout status deployment/${DEPLOYMENT_NAME}-canary -n "${NAMESPACE}" --timeout=3m
    kubectl rollout status deployment/${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" --timeout=3m

    log_info "Scaling completed"
}

monitor_canary() {
    local duration="$1"

    log_info "Monitoring canary for ${duration} seconds..."

    local check_interval=30
    local checks=$((duration / check_interval))

    for ((i=1; i<=checks; i++)); do
        log_info "Health check ${i}/${checks}..."

        if ! check_canary_health "${DEPLOYMENT_NAME}-canary"; then
            log_error "Canary health check failed"
            return 1
        fi

        if [[ ${i} -lt ${checks} ]]; then
            sleep ${check_interval}
        fi
    done

    log_info "Monitoring completed successfully"
    return 0
}

promote_canary() {
    log_info "Promoting canary to stable..."

    # Update stable deployment with canary image
    local canary_image=$(kubectl get deployment ${DEPLOYMENT_NAME}-canary -n "${NAMESPACE}" \
        -o jsonpath='{.spec.template.spec.containers[0].image}')

    kubectl set image deployment/${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" \
        backend="${canary_image}"

    # Scale stable back to full capacity
    kubectl scale deployment/${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" --replicas=4

    # Wait for stable deployment
    kubectl rollout status deployment/${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" --timeout=10m

    # Delete canary deployment
    kubectl delete deployment/${DEPLOYMENT_NAME}-canary -n "${NAMESPACE}"

    log_info "Canary promoted to stable successfully"
}

rollback_canary() {
    log_error "Rolling back canary deployment..."

    # Delete canary deployment
    kubectl delete deployment/${DEPLOYMENT_NAME}-canary -n "${NAMESPACE}"

    # Ensure stable is at full capacity
    kubectl scale deployment/${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" --replicas=4

    log_error "Canary rollback completed"
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "Starting Canary deployment for ${ENVIRONMENT}..."
    log_info "Log file: ${LOG_FILE}"

    mkdir -p "${LOG_DIR}"

    # Get image tag
    local git_tag=$(git describe --tags --always)
    log_info "Image tag: ${git_tag}"

    # Ensure stable deployment exists
    if ! kubectl get deployment ${DEPLOYMENT_NAME}-stable -n "${NAMESPACE}" &>/dev/null; then
        log_info "Renaming current deployment to stable..."
        kubectl get deployment ${DEPLOYMENT_NAME} -n "${NAMESPACE}" -o yaml | \
            sed "s/name: ${DEPLOYMENT_NAME}/name: ${DEPLOYMENT_NAME}-stable/" | \
            kubectl apply -f -
        kubectl delete deployment ${DEPLOYMENT_NAME} -n "${NAMESPACE}"
    fi

    # Deploy initial canary
    deploy_canary "${git_tag}"

    # Progressive rollout
    for percentage in "${CANARY_STEPS[@]}"; do
        log_info "========================================="
        log_info "Canary Step: ${percentage}%"
        log_info "========================================="

        # Scale canary
        scale_canary "${percentage}"

        # Monitor
        if ! monitor_canary "${CANARY_WAIT_SECONDS}"; then
            log_error "Canary monitoring failed at ${percentage}% - initiating rollback"
            rollback_canary
            exit 1
        fi

        if [[ ${percentage} -lt 100 ]]; then
            log_info "Step ${percentage}% successful, proceeding to next step..."
            sleep 10
        fi
    done

    # Promote canary to stable
    promote_canary

    log_info "========================================="
    log_info "Canary deployment completed successfully!"
    log_info "========================================="
}

main "$@"
