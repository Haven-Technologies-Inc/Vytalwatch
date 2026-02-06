#!/bin/bash
################################################################################
# VytalWatch RPM - PostgreSQL Maintenance (VACUUM)
################################################################################

set -euo pipefail

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

echo "Running database maintenance (VACUUM) for ${ENVIRONMENT}..."

# Get database credentials
DB_HOST=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-host}' | base64 -d)

DB_PASSWORD=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-password}' | base64 -d)

DB_NAME=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-name}' | base64 -d || echo "vytalwatch")

DB_USER=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-user}' | base64 -d || echo "vytalwatch")

# Run VACUUM ANALYZE
echo "Running VACUUM ANALYZE..."

PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    -c "VACUUM ANALYZE;"

echo "Running REINDEX..."

PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    -c "REINDEX DATABASE ${DB_NAME};"

echo "Database maintenance completed successfully"
