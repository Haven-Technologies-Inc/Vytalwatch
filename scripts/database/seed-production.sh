#!/bin/bash
################################################################################
# VytalWatch RPM - Production Seed Data Script
################################################################################

set -euo pipefail

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

echo "========================================="
echo "⚠️  PRODUCTION SEED DATA"
echo "========================================="
echo "This will add initial data to production database"
echo ""

read -p "Are you sure? (yes/no): " confirm

if [[ "${confirm}" != "yes" ]]; then
    echo "Cancelled"
    exit 1
fi

BACKEND_POD=$(kubectl get pods -n "${NAMESPACE}" \
    -l component=backend \
    -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n "${NAMESPACE}" "${BACKEND_POD}" -- \
    npm run seed:production

echo "Seed data loaded successfully"
