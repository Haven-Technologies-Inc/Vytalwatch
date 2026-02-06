#!/bin/bash
################################################################################
# VytalWatch RPM - Schema Verification Script
################################################################################

set -euo pipefail

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

echo "Verifying database schema for ${ENVIRONMENT}..."

# Get database credentials
DB_HOST=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-host}' 2>/dev/null | base64 -d || echo "")

if [[ -z "${DB_HOST}" ]]; then
    echo "Cannot retrieve database credentials"
    exit 1
fi

DB_PASSWORD=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-password}' | base64 -d)

DB_NAME=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-name}' | base64 -d || echo "vytalwatch")

DB_USER=$(kubectl get secret vytalwatch-secrets -n "${NAMESPACE}" \
    -o jsonpath='{.data.db-user}' | base64 -d || echo "vytalwatch")

# Check database exists
echo -n "Checking database exists... "

DB_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres \
    -t -c "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}';" | xargs || echo "")

if [[ "${DB_EXISTS}" == "1" ]]; then
    echo "✓"
else
    echo "✗ Database does not exist"
    exit 1
fi

# Check table count
echo -n "Checking tables... "

TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

echo "${TABLE_COUNT} tables found"

if [[ ${TABLE_COUNT} -lt 1 ]]; then
    echo "✗ No tables found"
    exit 1
fi

echo "✓ Schema verification passed"
