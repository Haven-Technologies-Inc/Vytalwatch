#!/bin/bash

# Generate comprehensive test coverage report

set -e

echo "======================================"
echo "Generating Test Coverage Report"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Clean previous coverage
echo -e "${YELLOW}Cleaning previous coverage data...${NC}"
rm -rf coverage/
mkdir -p coverage

# Run all tests with coverage
echo -e "${YELLOW}Running tests with coverage...${NC}"
NODE_ENV=test npm run test:cov

# Generate HTML report
echo -e "${YELLOW}Generating HTML coverage report...${NC}"
npx jest --coverage --coverageReporters=html

# Generate lcov report for CI
echo -e "${YELLOW}Generating LCOV report...${NC}"
npx jest --coverage --coverageReporters=lcov

# Generate JSON summary
echo -e "${YELLOW}Generating JSON summary...${NC}"
npx jest --coverage --coverageReporters=json-summary

# Generate text summary
echo ""
echo "======================================"
echo "Coverage Summary"
echo "======================================"
npx jest --coverage --coverageReporters=text

# Check if coverage meets thresholds
echo ""
echo -e "${YELLOW}Checking coverage thresholds...${NC}"

COVERAGE_FILE="coverage/coverage-summary.json"

if [ -f "$COVERAGE_FILE" ]; then
    LINES=$(cat $COVERAGE_FILE | jq '.total.lines.pct')
    BRANCHES=$(cat $COVERAGE_FILE | jq '.total.branches.pct')
    FUNCTIONS=$(cat $COVERAGE_FILE | jq '.total.functions.pct')
    STATEMENTS=$(cat $COVERAGE_FILE | jq '.total.statements.pct')

    echo ""
    echo "Coverage Results:"
    echo "  Lines:      $LINES%"
    echo "  Branches:   $BRANCHES%"
    echo "  Functions:  $FUNCTIONS%"
    echo "  Statements: $STATEMENTS%"
    echo ""

    THRESHOLD=80

    if (( $(echo "$LINES >= $THRESHOLD" | bc -l) )) && \
       (( $(echo "$BRANCHES >= $THRESHOLD" | bc -l) )) && \
       (( $(echo "$FUNCTIONS >= $THRESHOLD" | bc -l) )) && \
       (( $(echo "$STATEMENTS >= $THRESHOLD" | bc -l) )); then
        echo -e "${GREEN}✓ Coverage meets 80% threshold${NC}"
    else
        echo -e "${RED}✗ Coverage below 80% threshold${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}======================================"
echo "Coverage Report Generated Successfully"
echo "======================================${NC}"
echo ""
echo "View HTML report: coverage/lcov-report/index.html"
echo "View JSON summary: coverage/coverage-summary.json"
echo ""

exit 0
