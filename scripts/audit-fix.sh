#!/bin/bash

# Security Audit Fix Script - Attempts to automatically fix vulnerabilities

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create audit-reports directory if it doesn't exist
REPORT_DIR="audit-reports"
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Automatic Vulnerability Fixes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Create backup
echo -e "${BLUE}▶ Creating backup...${NC}"
BACKUP_FILE="$REPORT_DIR/pnpm-lock.yaml.backup-$(date +%Y%m%d-%H%M%S)"
cp pnpm-lock.yaml "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
echo ""

# 2. Run audit fix
echo -e "${BLUE}▶ Attempting to fix vulnerabilities...${NC}"
if pnpm audit --fix 2>&1; then
    echo -e "${GREEN}✓ Vulnerabilities fixed!${NC}"
else
    echo -e "${YELLOW}⚠ Some vulnerabilities could not be automatically fixed${NC}"
    echo -e "${BLUE}ℹ Manual intervention may be required${NC}"
fi
echo ""

# 3. Reinstall dependencies
echo -e "${BLUE}▶ Reinstalling dependencies...${NC}"
pnpm install
echo -e "${GREEN}✓ Dependencies reinstalled${NC}"
echo ""

# 4. Run audit again to check
echo -e "${BLUE}▶ Verifying fixes...${NC}"
POST_FIX_REPORT="$REPORT_DIR/post-fix-audit-$(date +%Y%m%d-%H%M%S).json"
if pnpm audit --json > "$POST_FIX_REPORT" 2>&1; then
    echo -e "${GREEN}✓ All vulnerabilities resolved!${NC}"
    echo -e "${GREEN}✓ Backup available at: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠ Some vulnerabilities remain${NC}"
    echo ""
    echo -e "${BLUE}Remaining issues:${NC}"
    pnpm audit || true
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo -e "  1. Review and update packages manually"
    echo -e "  2. Restore backup: ${YELLOW}cp $BACKUP_FILE pnpm-lock.yaml${NC}"
    echo -e "  3. Check for breaking changes in updated packages"
    echo -e "  4. Review report: ${BLUE}$POST_FIX_REPORT${NC}"
fi
echo ""

echo -e "${YELLOW}⚠ Important: Test your application after fixes!${NC}"
echo -e "${BLUE}Recommended steps:${NC}"
echo -e "  1. Run 'pnpm build' to ensure everything compiles"
echo -e "  2. Run 'pnpm test' to verify functionality"
echo -e "  3. Test critical features manually"
echo -e "  4. Commit changes if all tests pass"

