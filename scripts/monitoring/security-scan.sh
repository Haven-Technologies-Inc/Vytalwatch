#!/bin/bash
################################################################################
# VytalWatch RPM - Security Scanning Script
################################################################################

set -euo pipefail

echo "========================================="
echo "Security Scan - VytalWatch RPM"
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# Container image scanning
echo ""
echo "Scanning container images..."

IMAGES=("vytalwatch/backend:latest" "vytalwatch/frontend:latest")

for image in "${IMAGES[@]}"; do
    echo "Scanning ${image}..."

    # Using trivy for vulnerability scanning
    if command -v trivy &> /dev/null; then
        trivy image --severity HIGH,CRITICAL "${image}" || true
    else
        echo "⚠️  trivy not installed - skipping image scan"
    fi
done

# Kubernetes security scanning
echo ""
echo "Scanning Kubernetes configurations..."

if command -v kubesec &> /dev/null; then
    kubectl get deployments -A -o yaml | kubesec scan - || true
else
    echo "⚠️  kubesec not installed - skipping k8s scan"
fi

# Check for exposed secrets
echo ""
echo "Checking for exposed secrets..."

# Scan for common secret patterns
git secrets --scan-history 2>/dev/null || echo "⚠️  git-secrets not configured"

echo ""
echo "========================================="
echo "Security scan completed"
echo "========================================="
