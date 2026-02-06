#!/bin/bash

# VytalWatch RPM Test Suite Runner
# Runs all test suites with proper configuration

set -e

echo "======================================"
echo "VytalWatch RPM - Running Test Suite"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test database is running
echo -e "${YELLOW}Checking test database connection...${NC}"
if ! pg_isready -h localhost -p 5432 -U test; then
    echo -e "${RED}Test database is not running!${NC}"
    echo "Please start PostgreSQL test database first"
    exit 1
fi

echo -e "${GREEN}Test database is ready${NC}"

# Set test environment
export NODE_ENV=test
export LOG_LEVEL=error

# Create test database if it doesn't exist
echo -e "${YELLOW}Setting up test database...${NC}"
psql -h localhost -U test -tc "SELECT 1 FROM pg_database WHERE datname = 'vitalwatch_test'" | grep -q 1 || \
    psql -h localhost -U test -c "CREATE DATABASE vitalwatch_test"

# Run unit tests
echo ""
echo "======================================"
echo "Running Unit Tests"
echo "======================================"
npm run test -- --selectProjects=unit --coverage

# Run integration tests
echo ""
echo "======================================"
echo "Running Integration Tests"
echo "======================================"
npm run test -- --selectProjects=integration --coverage

# Run E2E tests
echo ""
echo "======================================"
echo "Running E2E Tests"
echo "======================================"
npm run test -- --selectProjects=e2e --coverage

# Run performance tests
echo ""
echo "======================================"
echo "Running Performance Tests"
echo "======================================"
npm run test -- --selectProjects=performance

# Run security tests
echo ""
echo "======================================"
echo "Running Security Tests"
echo "======================================"
npm run test -- --selectProjects=security

# Generate combined coverage report
echo ""
echo "======================================"
echo "Generating Coverage Report"
echo "======================================"
npm run test:cov

# Check coverage thresholds
echo ""
echo "======================================"
echo "Coverage Summary"
echo "======================================"
cat coverage/coverage-summary.json | jq '.total'

# Display results
echo ""
echo -e "${GREEN}======================================"
echo "All Tests Completed Successfully!"
echo "======================================${NC}"
echo ""
echo "Coverage report available at: coverage/lcov-report/index.html"
echo ""

# Exit with success
exit 0
