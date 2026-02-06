#!/bin/bash
################################################################################
# VytalWatch RPM - Pre-Migration Backup
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-production}"

echo "Creating pre-migration backup for ${ENVIRONMENT}..."

# Use the main backup script with pre-migration flag
if [[ -f "${SCRIPT_DIR}/../backup/backup-database.sh" ]]; then
    bash "${SCRIPT_DIR}/../backup/backup-database.sh" "${ENVIRONMENT}" "pre-migration"
else
    echo "Error: backup-database.sh not found"
    exit 1
fi

echo "Pre-migration backup completed"
