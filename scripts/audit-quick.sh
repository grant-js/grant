#!/bin/bash

# Quick Security Audit - Fast check for high/critical vulnerabilities.
# Allows one known unfixable: html-minifier (REDoS, GHSA-pfq8-rq6v-vf5m) from mjml — no patched version exists.

set -e

REPORT_DIR="audit-reports"
mkdir -p "$REPORT_DIR"
AUDIT_JSON="$REPORT_DIR/quick-audit-latest.json"

echo "🔍 Running quick security audit..."
echo ""

# Capture audit JSON (pnpm exits 1 when vulns found; Node deprecation may prefix stdout so we strip it when parsing)
NODE_NO_WARNINGS=1 pnpm audit --audit-level=high --json > "$AUDIT_JSON" 2>/dev/null || true

# Pass if: no high/critical, or only html-minifier (unfixable transitive from mjml). Uses pnpm audit JSON: advisories keyed by id with .severity and .module_name.
set +e
AUDIT_MSG=$(AUDIT_FILE="$AUDIT_JSON" node -e '
const fs = require("fs");
const raw = fs.readFileSync(process.env.AUDIT_FILE, "utf8");
const start = raw.indexOf("{");
const data = start >= 0 ? JSON.parse(raw.slice(start)) : {};
const advisories = data.advisories || {};
const highOrCritical = Object.entries(advisories).filter(([, a]) => a.severity === "high" || a.severity === "critical");
const onlyHtmlMinifier = highOrCritical.length > 0 && highOrCritical.every(([, a]) => a.module_name === "html-minifier");
if (highOrCritical.length === 0) {
  console.log("✅ No high or critical vulnerabilities found!");
  process.exit(0);
}
if (onlyHtmlMinifier) {
  console.log("✅ No actionable high/critical vulnerabilities (only known unfixable: html-minifier from mjml).");
  process.exit(0);
}
process.exit(1);
' 2>/dev/null)
NODE_EXIT=$?
set -e
if [ "$NODE_EXIT" -eq 0 ] && [ -n "$AUDIT_MSG" ]; then
  echo "$AUDIT_MSG"
  exit 0
fi

echo "⚠️  High or critical vulnerabilities detected!"
echo ""
echo "Running full audit for details:"
echo "================================"
pnpm audit --audit-level=high
echo ""
echo "💡 Tip: Run 'pnpm audit:fix' to attempt automatic fixes"
echo "📄 Report saved to: $AUDIT_JSON"
exit 1

