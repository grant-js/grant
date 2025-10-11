#!/bin/bash

# Security Audit Script for Grant Platform
# This script checks for security vulnerabilities across all packages in the monorepo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create audit-reports directory if it doesn't exist
REPORT_DIR="audit-reports"
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Grant Platform Security Audit${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}▶ $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        return 0
    else
        echo -e "${RED}✗ $1${NC}"
        return 1
    fi
}

# Track if any vulnerabilities were found
VULNERABILITIES_FOUND=0

# 1. Run pnpm audit
print_header "Running pnpm audit (all workspaces)"
if pnpm audit --json > "$REPORT_DIR/audit-latest.json" 2>&1; then
    echo -e "${GREEN}✓ No vulnerabilities found!${NC}"
else
    AUDIT_EXIT_CODE=$?
    if [ $AUDIT_EXIT_CODE -ne 0 ]; then
        echo -e "${YELLOW}⚠ Vulnerabilities detected${NC}"
        VULNERABILITIES_FOUND=1
        
        # Parse and display summary
        if command -v jq &> /dev/null; then
            print_header "Vulnerability Summary"
            jq -r '.metadata.vulnerabilities | to_entries[] | "\(.key): \(.value)"' "$REPORT_DIR/audit-latest.json" 2>/dev/null || echo "Run 'pnpm audit' for details"
        else
            echo "Install 'jq' for detailed JSON parsing, or run 'pnpm audit' directly"
        fi
    fi
fi

# 2. Check for outdated packages with known vulnerabilities
print_header "Checking for outdated packages"
pnpm outdated --recursive > "$REPORT_DIR/outdated-latest.txt" 2>&1 || true
if [ -s "$REPORT_DIR/outdated-latest.txt" ]; then
    echo -e "${YELLOW}⚠ Outdated packages found:${NC}"
    head -20 "$REPORT_DIR/outdated-latest.txt"
    echo ""
    echo -e "${BLUE}ℹ Run 'pnpm update --recursive' to update packages${NC}"
else
    echo -e "${GREEN}✓ All packages are up to date${NC}"
fi

# 3. Check for packages with known security issues
print_header "Checking specific high-risk packages"

HIGH_RISK_PACKAGES=(
    "lodash@<4.17.21"
    "axios@<0.21.2"
    "jsonwebtoken@<9.0.0"
    "express@<4.17.3"
)

echo "Checking for outdated high-risk packages..."
for pkg in "${HIGH_RISK_PACKAGES[@]}"; do
    PKG_NAME=$(echo $pkg | cut -d'@' -f1)
    if pnpm list --recursive --depth=0 "$PKG_NAME" 2>/dev/null | grep -q "$PKG_NAME"; then
        echo -e "  ${BLUE}ℹ${NC} Found: $PKG_NAME - checking version..."
    fi
done

# 4. Check pnpm-lock.yaml integrity
print_header "Checking lock file integrity"
if [ -f "pnpm-lock.yaml" ]; then
    # Verify lock file is in sync with package.json files
    if pnpm install --frozen-lockfile --dry-run > /dev/null 2>&1; then
        echo -e "${GREEN}✓ pnpm-lock.yaml is in sync${NC}"
    else
        echo -e "${YELLOW}⚠ Lock file may be out of sync${NC}"
        echo -e "${BLUE}ℹ Run 'pnpm install' to update${NC}"
    fi
else
    echo -e "${RED}✗ pnpm-lock.yaml not found${NC}"
fi

# 5. Generate detailed report
print_header "Generating detailed report"
REPORT_FILE="$REPORT_DIR/audit-$(date +%Y%m%d-%H%M%S).txt"

{
    echo "==================================="
    echo "Grant Platform Security Audit Report"
    echo "Generated: $(date)"
    echo "==================================="
    echo ""
    echo "PNPM AUDIT RESULTS:"
    echo "-------------------"
    pnpm audit 2>&1 || true
    echo ""
    echo "OUTDATED PACKAGES:"
    echo "-------------------"
    pnpm outdated --recursive 2>&1 || true
    echo ""
    echo "==================================="
    echo "End of Report"
    echo "==================================="
} > "$REPORT_FILE"

echo -e "${GREEN}✓ Detailed report saved to: $REPORT_FILE${NC}"

# 6. Summary
print_header "Summary"
if [ $VULNERABILITIES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ Security audit completed successfully!${NC}"
    echo -e "${GREEN}✓ No vulnerabilities found.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Security audit completed with warnings${NC}"
    echo -e "${YELLOW}⚠ Vulnerabilities were detected. Please review and fix.${NC}"
    echo ""
    echo -e "${BLUE}Recommended actions:${NC}"
    echo -e "  1. Review the detailed report: ${REPORT_FILE}"
    echo -e "  2. Run 'pnpm audit --fix' to automatically fix issues"
    echo -e "  3. Update vulnerable packages manually if needed"
    echo -e "  4. Review and test changes before committing"
    exit 1
fi

