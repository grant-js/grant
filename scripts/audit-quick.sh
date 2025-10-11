#!/bin/bash

# Quick Security Audit - Fast check for critical vulnerabilities only

set -e

# Create audit-reports directory if it doesn't exist
REPORT_DIR="audit-reports"
mkdir -p "$REPORT_DIR"

echo "🔍 Running quick security audit..."
echo ""

# Run audit and filter for high/critical only
if pnpm audit --audit-level=high --json > "$REPORT_DIR/quick-audit-latest.json" 2>&1; then
    echo "✅ No high or critical vulnerabilities found!"
    exit 0
else
    echo "⚠️  High or critical vulnerabilities detected!"
    echo ""
    echo "Running full audit for details:"
    echo "================================"
    pnpm audit --audit-level=high
    echo ""
    echo "💡 Tip: Run 'pnpm audit:fix' to attempt automatic fixes"
    echo "📄 Report saved to: $REPORT_DIR/quick-audit-latest.json"
    exit 1
fi

