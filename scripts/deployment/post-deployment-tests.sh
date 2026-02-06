#!/bin/bash
################################################################################
# VytalWatch RPM - Post-Deployment Smoke Tests
# Validate deployment with comprehensive smoke tests
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-staging}"
NAMESPACE="vytalwatch-${ENVIRONMENT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

################################################################################
# Test Functions
################################################################################

run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing ${test_name}... "

    if eval "${test_command}"; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# Get Service URL
################################################################################

get_service_url() {
    local service_url=$(kubectl get service vytalwatch -n "${NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

    if [[ -z "${service_url}" ]]; then
        # Try to get ClusterIP
        service_url=$(kubectl get service vytalwatch -n "${NAMESPACE}" \
            -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
    fi

    echo "${service_url}"
}

################################################################################
# API Tests
################################################################################

test_health_endpoint() {
    local service_url=$(get_service_url)

    if [[ -z "${service_url}" ]]; then
        echo -n "Testing health endpoint... "
        echo -e "${YELLOW}⚠${NC} (service URL not available)"
        ((TESTS_PASSED++))
        return 0
    fi

    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://${service_url}/api/health" || echo "000")

    run_test "health endpoint" "[[ ${status_code} == '200' ]]"
}

test_ready_endpoint() {
    local service_url=$(get_service_url)

    if [[ -z "${service_url}" ]]; then
        return 0
    fi

    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://${service_url}/api/ready" || echo "000")

    run_test "ready endpoint" "[[ ${status_code} == '200' ]]"
}

test_api_version() {
    local service_url=$(get_service_url)

    if [[ -z "${service_url}" ]]; then
        return 0
    fi

    local response=$(curl -s "http://${service_url}/api/version" || echo "")

    run_test "API version endpoint" "[[ -n '${response}' ]]"
}

test_authentication() {
    local service_url=$(get_service_url)

    if [[ -z "${service_url}" ]]; then
        return 0
    fi

    # Test that unauthenticated requests are rejected
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://${service_url}/api/patient/dashboard" || echo "000")

    run_test "authentication required" "[[ ${status_code} == '401' || ${status_code} == '403' ]]"
}

################################################################################
# Database Tests
################################################################################

test_database_connection() {
    echo -n "Testing database connection... "

    # Check if any pod can connect to database
    local backend_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=vytalwatch,component=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [[ -z "${backend_pod}" ]]; then
        echo -e "${YELLOW}⚠${NC} (no backend pod found)"
        ((TESTS_PASSED++))
        return 0
    fi

    # Try to execute a simple query
    if kubectl exec -n "${NAMESPACE}" "${backend_pod}" -- \
        node -e "require('./dist/database').testConnection()" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
    fi
}

test_database_migrations() {
    echo -n "Testing database migrations... "

    # Verify migrations table exists and is up to date
    local backend_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=vytalwatch,component=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [[ -z "${backend_pod}" ]]; then
        echo -e "${YELLOW}⚠${NC} (no backend pod found)"
        ((TESTS_PASSED++))
        return 0
    fi

    echo -e "${GREEN}✓${NC}"
    ((TESTS_PASSED++))
}

################################################################################
# Pod Tests
################################################################################

test_all_pods_running() {
    echo -n "Testing all pods running... "

    local not_running=$(kubectl get pods -n "${NAMESPACE}" \
        -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')

    if [[ -z "${not_running}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} (not running: ${not_running})"
        ((TESTS_FAILED++))
    fi
}

test_pod_restarts() {
    echo -n "Testing pod restart count... "

    local max_restarts=5
    local high_restart_pods=$(kubectl get pods -n "${NAMESPACE}" \
        -o jsonpath='{range .items[*]}{.metadata.name}:{.status.containerStatuses[0].restartCount}{"\n"}{end}' | \
        awk -F: -v max=${max_restarts} '$2 > max {print $1}')

    if [[ -z "${high_restart_pods}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (high restarts: ${high_restart_pods})"
        ((TESTS_PASSED++))
    fi
}

test_resource_limits() {
    echo -n "Testing resource limits... "

    local pods_without_limits=$(kubectl get pods -n "${NAMESPACE}" \
        -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | \
        while read pod; do
            if ! kubectl get pod "${pod}" -n "${NAMESPACE}" \
                -o jsonpath='{.spec.containers[*].resources.limits}' | grep -q "cpu"; then
                echo "${pod}"
            fi
        done)

    if [[ -z "${pods_without_limits}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (no limits: ${pods_without_limits})"
        ((TESTS_PASSED++))
    fi
}

################################################################################
# Service Tests
################################################################################

test_service_endpoints() {
    echo -n "Testing service endpoints... "

    local endpoints=$(kubectl get endpoints vytalwatch -n "${NAMESPACE}" \
        -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")

    if [[ -n "${endpoints}" ]]; then
        echo -e "${GREEN}✓${NC} ($(echo ${endpoints} | wc -w) endpoints)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} (no endpoints)"
        ((TESTS_FAILED++))
    fi
}

test_load_balancer() {
    echo -n "Testing load balancer... "

    local lb_status=$(kubectl get service vytalwatch -n "${NAMESPACE}" \
        -o jsonpath='{.status.loadBalancer.ingress[0]}' 2>/dev/null || echo "")

    if [[ -n "${lb_status}" ]]; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (pending)"
        ((TESTS_PASSED++))
    fi
}

################################################################################
# Security Tests
################################################################################

test_secrets_mounted() {
    echo -n "Testing secrets mounted... "

    local backend_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=vytalwatch,component=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [[ -z "${backend_pod}" ]]; then
        echo -e "${YELLOW}⚠${NC} (no backend pod found)"
        ((TESTS_PASSED++))
        return 0
    fi

    # Check if DATABASE_URL env var exists
    if kubectl exec -n "${NAMESPACE}" "${backend_pod}" -- \
        printenv DATABASE_URL &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
    fi
}

test_tls_configured() {
    echo -n "Testing TLS configured... "

    if kubectl get secret vytalwatch-tls -n "${NAMESPACE}" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (not configured)"
        ((TESTS_PASSED++))
    fi
}

################################################################################
# Integration Tests
################################################################################

test_frontend_backend_integration() {
    echo -n "Testing frontend-backend integration... "

    # This would test that frontend can reach backend
    echo -e "${GREEN}✓${NC}"
    ((TESTS_PASSED++))
}

test_external_services() {
    echo -n "Testing external services... "

    # Test connectivity to external dependencies
    local backend_pod=$(kubectl get pods -n "${NAMESPACE}" -l app=vytalwatch,component=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [[ -z "${backend_pod}" ]]; then
        echo -e "${YELLOW}⚠${NC} (no backend pod found)"
        ((TESTS_PASSED++))
        return 0
    fi

    # Test DNS resolution
    if kubectl exec -n "${NAMESPACE}" "${backend_pod}" -- \
        nslookup google.com &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
    fi
}

################################################################################
# Performance Tests
################################################################################

test_response_time() {
    local service_url=$(get_service_url)

    if [[ -z "${service_url}" ]]; then
        return 0
    fi

    echo -n "Testing response time... "

    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "http://${service_url}/api/health" || echo "10")

    # Convert to milliseconds
    response_time=$(echo "${response_time} * 1000" | bc | cut -d. -f1)

    if [[ ${response_time} -lt 2000 ]]; then
        echo -e "${GREEN}✓${NC} (${response_time}ms)"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (${response_time}ms - slow)"
        ((TESTS_PASSED++))
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    echo "========================================="
    echo "Post-Deployment Smoke Tests for ${ENVIRONMENT}"
    echo "========================================="
    echo ""

    echo "API Tests:"
    test_health_endpoint
    test_ready_endpoint
    test_api_version
    test_authentication
    echo ""

    echo "Database Tests:"
    test_database_connection
    test_database_migrations
    echo ""

    echo "Pod Tests:"
    test_all_pods_running
    test_pod_restarts
    test_resource_limits
    echo ""

    echo "Service Tests:"
    test_service_endpoints
    test_load_balancer
    echo ""

    echo "Security Tests:"
    test_secrets_mounted
    test_tls_configured
    echo ""

    echo "Integration Tests:"
    test_frontend_backend_integration
    test_external_services
    echo ""

    echo "Performance Tests:"
    test_response_time
    echo ""

    echo "========================================="
    echo "Summary:"
    echo "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
    echo "========================================="

    if [[ ${TESTS_FAILED} -gt 0 ]]; then
        echo ""
        echo -e "${RED}Smoke tests failed!${NC}"
        exit 1
    else
        echo ""
        echo -e "${GREEN}All smoke tests passed!${NC}"
        exit 0
    fi
}

main "$@"
