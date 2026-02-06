#!/bin/bash
################################################################################
# VytalWatch RPM - Alert Condition Checker
################################################################################

set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

# Check for alert conditions
ALERTS=()

# Check pod health
UNHEALTHY_PODS=$(kubectl get pods -n "${NAMESPACE}" -o json | \
    jq -r '.items[] | select(.status.phase != "Running") | .metadata.name' | wc -l)

if [[ ${UNHEALTHY_PODS} -gt 0 ]]; then
    ALERTS+=("${UNHEALTHY_PODS} unhealthy pods in ${NAMESPACE}")
fi

# Check high restart count
HIGH_RESTARTS=$(kubectl get pods -n "${NAMESPACE}" -o json | \
    jq -r '.items[] | select(.status.containerStatuses[].restartCount > 5) | .metadata.name' | wc -l)

if [[ ${HIGH_RESTARTS} -gt 0 ]]; then
    ALERTS+=("${HIGH_RESTARTS} pods with high restart count")
fi

# Print alerts
if [[ ${#ALERTS[@]} -gt 0 ]]; then
    echo "⚠️  ALERTS DETECTED:"
    printf '%s\n' "${ALERTS[@]}"
    exit 1
else
    echo "✓ No alerts detected"
    exit 0
fi
