#!/bin/bash
################################################################################
# VytalWatch RPM - Cloud Cost Monitoring
################################################################################

set -euo pipefail

echo "========================================="
echo "AWS Cost Monitoring - VytalWatch RPM"
echo "$(date '+%Y-%m-%d')"
echo "========================================="

# Get current month costs
START_DATE=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo ""
echo "Current Month Costs (${START_DATE} to ${END_DATE}):"

# EC2 costs
aws ce get-cost-and-usage \
    --time-period Start=${START_DATE},End=${END_DATE} \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=SERVICE \
    --filter file://<(cat <<EOF
{
    "Tags": {
        "Key": "Project",
        "Values": ["VytalWatch"]
    }
}
EOF
) 2>/dev/null || echo "Cost Explorer not available"

echo ""
echo "Resource Optimization Recommendations:"
echo "- Review unused EBS volumes"
echo "- Check for idle load balancers"
echo "- Optimize RDS instance sizing"
echo "- Review S3 storage classes"

echo ""
echo "========================================="
