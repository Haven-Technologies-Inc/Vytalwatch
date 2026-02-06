#!/bin/bash
################################################################################
# VytalWatch RPM - Log Aggregation Script
################################################################################

set -euo pipefail

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"
LOG_DIR="/home/user/RMP/logs/aggregated"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${LOG_DIR}"

echo "Aggregating logs from ${NAMESPACE}..."

# Get all pods
kubectl get pods -n "${NAMESPACE}" -o name | while read pod; do
    pod_name=$(basename "${pod}")
    echo "Collecting logs from ${pod_name}..."

    kubectl logs -n "${NAMESPACE}" "${pod_name}" --tail=1000 \
        > "${LOG_DIR}/${pod_name}_${TIMESTAMP}.log" 2>/dev/null || true
done

echo "Logs aggregated to: ${LOG_DIR}"
