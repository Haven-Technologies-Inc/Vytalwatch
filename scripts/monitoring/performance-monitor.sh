#!/bin/bash
################################################################################
# VytalWatch RPM - Performance Monitoring Script
################################################################################

set -euo pipefail

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"
METRICS_FILE="/tmp/vytalwatch_metrics_$(date +%s).json"

# Collect metrics
cat > "${METRICS_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "pods": $(kubectl top pods -n "${NAMESPACE}" --no-headers 2>/dev/null | wc -l || echo "0"),
  "cpu_usage": "$(kubectl top pods -n "${NAMESPACE}" --no-headers 2>/dev/null | awk '{sum+=$2} END {print sum}' || echo "0")",
  "memory_usage": "$(kubectl top pods -n "${NAMESPACE}" --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum}' || echo "0")",
  "status": "healthy"
}
EOF

echo "Performance metrics collected: ${METRICS_FILE}"
cat "${METRICS_FILE}"
