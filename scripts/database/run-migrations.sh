#!/bin/bash
################################################################################
# VytalWatch RPM - Database Migration Script
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Running database migrations for ${ENVIRONMENT}...${NC}"

# Get backend pod
BACKEND_POD=$(kubectl get pods -n "${NAMESPACE}" \
    -l component=backend \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [[ -z "${BACKEND_POD}" ]]; then
    echo -e "${RED}No backend pod found${NC}"
    exit 1
fi

# Run migrations
echo "Executing migrations in pod: ${BACKEND_POD}"

kubectl exec -n "${NAMESPACE}" "${BACKEND_POD}" -- \
    npm run migrate:latest || \
    kubectl exec -n "${NAMESPACE}" "${BACKEND_POD}" -- \
    npx prisma migrate deploy

echo -e "${GREEN}Migrations completed successfully${NC}"
