#!/bin/bash
################################################################################
# VytalWatch RPM - Comprehensive Health Check Script
# Monitor system health across all components
################################################################################

set -euo pipefail

ENVIRONMENT="${1:-production}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

################################################################################
# Health Check Functions
################################################################################

check_pods_health() {
    echo -n "Checking pods health... "

    local unhealthy_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -o jsonpath='{range .items[*]}{.metadata.name}{"|"}{.status.phase}{"\n"}{end}' | \
        grep -v "Running" || true)

    if [[ -z "${unhealthy_pods}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo "${unhealthy_pods}" | while IFS='|' read pod status; do
            echo "  - ${pod}: ${status}"
        done
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_api_endpoints() {
    echo -n "Checking API endpoints... "

    local service_url=$(kubectl get service vytalwatch -n "${NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

    if [[ -z "${service_url}" ]]; then
        echo -e "${YELLOW}⚠${NC} (service URL not available)"
        ((CHECKS_WARNING++))
        return 0
    fi

    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://${service_url}/api/health" 2>/dev/null || echo "000")

    if [[ "${health_status}" == "200" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP ${health_status})"
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_database_connection() {
    echo -n "Checking database connection... "

    local backend_pod=$(kubectl get pods -n "${NAMESPACE}" \
        -l component=backend \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [[ -z "${backend_pod}" ]]; then
        echo -e "${YELLOW}⚠${NC} (no backend pod)"
        ((CHECKS_WARNING++))
        return 0
    fi

    # Test database connection through backend pod
    if kubectl exec -n "${NAMESPACE}" "${backend_pod}" -- \
        printenv DATABASE_URL &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_disk_space() {
    echo -n "Checking disk space... "

    local high_usage=$(kubectl top nodes 2>/dev/null | \
        awk 'NR>1 {gsub("%",""); if ($5 > 80) print $1}' || echo "")

    if [[ -z "${high_usage}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (high usage: ${high_usage})"
        ((CHECKS_WARNING++))
        return 0
    fi
}

check_memory_usage() {
    echo -n "Checking memory usage... "

    local high_memory=$(kubectl top pods -n "${NAMESPACE}" 2>/dev/null | \
        awk 'NR>1 {gsub("Mi",""); if ($3 > 1000) print $1}' || echo "")

    if [[ -z "${high_memory}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (high memory: ${high_memory})"
        ((CHECKS_WARNING++))
        return 0
    fi
}

check_certificates() {
    echo -n "Checking SSL certificates... "

    if kubectl get secret vytalwatch-tls -n "${NAMESPACE}" &>/dev/null; then
        local cert=$(kubectl get secret vytalwatch-tls -n "${NAMESPACE}" \
            -o jsonpath='{.data.tls\.crt}' | base64 -d)

        local expiry_date=$(echo "${cert}" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        local days_until_expiry=$(( ($(date -d "${expiry_date}" +%s) - $(date +%s)) / 86400 ))

        if [[ ${days_until_expiry} -gt 30 ]]; then
            echo -e "${GREEN}✓${NC} (${days_until_expiry} days)"
            ((CHECKS_PASSED++))
            return 0
        else
            echo -e "${YELLOW}⚠${NC} (expires in ${days_until_expiry} days)"
            ((CHECKS_WARNING++))
            return 0
        fi
    else
        echo -e "${YELLOW}⚠${NC} (not configured)"
        ((CHECKS_WARNING++))
        return 0
    fi
}

check_backup_status() {
    echo -n "Checking recent backups... "

    local recent_backup=$(aws s3 ls "s3://vytalwatch-backups/${ENVIRONMENT}/database/scheduled/" \
        --recursive 2>/dev/null | \
        awk '{print $1" "$2}' | \
        while read date time; do
            backup_time=$(date -d "$date $time" +%s 2>/dev/null || echo "0")
            current_time=$(date +%s)
            age=$((current_time - backup_time))
            if [[ $age -lt 86400 ]]; then
                echo "found"
                break
            fi
        done || echo "")

    if [[ -n "${recent_backup}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (no recent backup)"
        ((CHECKS_WARNING++))
        return 0
    fi
}

check_prometheus() {
    echo -n "Checking Prometheus... "

    if kubectl get deployment prometheus -n monitoring &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (not running)"
        ((CHECKS_WARNING++))
        return 0
    fi
}

check_external_dependencies() {
    echo -n "Checking external dependencies... "

    local deps_ok=true

    # Check Plaid
    if ! curl -s -o /dev/null -w "%{http_code}" "https://plaid.com" | grep -q "200\|301\|302"; then
        deps_ok=false
    fi

    # Check Stripe
    if ! curl -s -o /dev/null -w "%{http_code}" "https://api.stripe.com" | grep -q "200\|301\|302"; then
        deps_ok=false
    fi

    if ${deps_ok}; then
        echo -e "${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    echo "========================================="
    echo "VytalWatch Health Check - ${ENVIRONMENT}"
    echo "$(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================="
    echo ""

    check_pods_health
    check_api_endpoints
    check_database_connection
    check_disk_space
    check_memory_usage
    check_certificates
    check_backup_status
    check_prometheus
    check_external_dependencies

    echo ""
    echo "========================================="
    echo "Summary:"
    echo -e "Passed:  ${GREEN}${CHECKS_PASSED}${NC}"
    echo -e "Warning: ${YELLOW}${CHECKS_WARNING}${NC}"
    echo -e "Failed:  ${RED}${CHECKS_FAILED}${NC}"
    echo "========================================="

    if [[ ${CHECKS_FAILED} -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
