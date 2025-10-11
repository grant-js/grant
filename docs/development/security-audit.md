# Security Audit System

The Grant Platform includes a comprehensive security audit system to identify and fix vulnerabilities in dependencies across the entire monorepo.

## Quick Start

### Running Security Audits

```bash
# Quick check (recommended for daily use)
pnpm audit:quick

# Full audit with detailed report
pnpm audit

# Attempt automatic fixes
pnpm audit:fix

# Raw pnpm audit across all workspaces
pnpm audit:pnpm
```

## Available Scripts

### Full Security Audit

```bash
pnpm audit
# or
./scripts/audit-security.sh
```

**What it does:**

- Runs comprehensive security audit across all workspaces
- Checks for outdated packages
- Verifies lock file integrity
- Identifies high-risk packages
- Generates detailed timestamped report

**Output:**

- Timestamped report: `audit-reports/audit-YYYYMMDD-HHMMSS.txt`
- Latest audit JSON: `audit-reports/audit-latest.json`
- Outdated packages: `audit-reports/outdated-latest.txt`

::: info Reports Location
All audit reports are automatically stored in the `audit-reports/` directory (git-ignored). The scripts create this directory automatically if it doesn't exist.
:::

**When to use:**

- Before releases
- Weekly security reviews
- After updating dependencies
- Setting up CI/CD

### Quick Security Check

```bash
pnpm audit:quick
```

**What it does:**

- Fast check for HIGH and CRITICAL vulnerabilities only
- Quick pass/fail result
- Saves minimal report for reference

**Output:** Quick audit JSON saved to `audit-reports/quick-audit-latest.json`

**Exit codes:**

- `0` = No critical vulnerabilities
- `1` = Critical vulnerabilities found

**When to use:**

- Pre-commit hooks
- Quick checks during development
- CI/CD pipeline gate checks

### Automatic Fix

```bash
pnpm audit:fix
```

**What it does:**

- Creates timestamped backup in `audit-reports/`
- Attempts automatic fixes via `pnpm audit --fix`
- Reinstalls dependencies
- Verifies fixes and generates post-fix report
- Provides rollback instructions if needed

**Output:**

- Backup: `audit-reports/pnpm-lock.yaml.backup-YYYYMMDD-HHMMSS`
- Report: `audit-reports/post-fix-audit-YYYYMMDD-HHMMSS.json`

::: warning Important
Always test your application after running automatic fixes. Some fixes may introduce breaking changes.
:::

**Post-fix checklist:**

1. Run `pnpm build` to ensure everything compiles
2. Run `pnpm test` to verify functionality
3. Test critical features manually
4. Review changes in `pnpm-lock.yaml`
5. Commit changes if all tests pass

### Raw PNPM Audit

```bash
pnpm audit:pnpm
```

Runs native `pnpm audit` across all workspaces with no additional formatting or processing.

## Understanding Severity Levels

| Severity     | Symbol | Action                                |
| ------------ | ------ | ------------------------------------- |
| **Critical** | 🔴     | Fix immediately before any deployment |
| **High**     | 🟠     | Fix before production release         |
| **Moderate** | 🟡     | Fix in next update cycle              |
| **Low**      | 🟢     | Fix when convenient                   |

## Script Locations

All security audit scripts are located in `/scripts`:

```
scripts/
├── audit-security.sh    # Full comprehensive audit
├── audit-quick.sh       # Fast critical check
├── audit-fix.sh         # Automatic fixes
└── README.md            # Detailed documentation

audit-reports/           # Git-ignored (auto-created)
├── README.md            # Reports directory documentation
├── audit-*.txt          # Timestamped full audit reports
├── audit-latest.json    # Latest audit JSON
├── outdated-latest.txt  # Latest outdated packages
├── quick-audit-latest.json  # Latest quick audit
├── post-fix-audit-*.json    # Post-fix reports
└── pnpm-lock.yaml.backup-*  # Lockfile backups
```

::: tip Clean Repository
The `audit-reports/` directory is git-ignored to keep your repository clean. Reports are local-only and won't be committed. The directory is created automatically when you run any audit script.
:::

## Recommended Workflow

### Daily Development

```bash
# Before committing changes
pnpm audit:quick
```

### Weekly Maintenance

```bash
# Run full audit
pnpm audit

# Check for outdated packages
pnpm outdated --recursive
```

### After Adding/Updating Packages

```bash
# Verify security
pnpm audit

# Run tests
pnpm test

# Build project
pnpm build
```

### When Vulnerabilities Are Found

1. **Try automatic fix:**

   ```bash
   pnpm audit:fix
   ```

2. **If automatic fix doesn't work:**

   ```bash
   # Update specific package
   pnpm update <package-name>@latest

   # Or update specific workspace
   pnpm --filter <workspace-name> update <package-name>
   ```

3. **Verify the fix:**

   ```bash
   pnpm audit
   pnpm build
   pnpm test
   ```

4. **If no fix is available:**
   - Check if the vulnerability affects your usage
   - Consider alternative packages
   - Document accepted risk if appropriate
   - Monitor for updates

## CI/CD Integration

### GitHub Actions

If you're using GitHub, an automated workflow is available at `.github/workflows/security-audit.yml`:

- ✅ Runs on every push to main/master
- ✅ Runs on all pull requests
- ✅ Runs weekly (Mondays at 9am UTC)
- ✅ Can be triggered manually
- ✅ Uploads audit results as artifacts
- ✅ Comments on PRs with vulnerability details
- ✅ Fails CI if high/critical vulnerabilities found

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
security-audit:
  stage: test
  script:
    - pnpm install --frozen-lockfile
    - pnpm audit:quick
  allow_failure: true
  only:
    - merge_requests
    - main
```

### Generic CI/CD

For any CI/CD platform:

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run quick audit (fails on high/critical)
pnpm audit:quick

# Exit code will be 1 if vulnerabilities found
```

## Pre-commit Hook (Optional)

To run security checks before every commit, create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run quick security audit
pnpm audit:quick || {
    echo "⚠️  Security vulnerabilities detected!"
    echo "Run 'pnpm audit' for details"
    echo "Run 'pnpm audit:fix' to attempt fixes"
    exit 1
}
```

## Audit Report Structure

The full audit generates a comprehensive report in `audit-reports/` with:

1. **PNPM Audit Results**
   - List of all vulnerabilities
   - Severity levels
   - Affected packages and versions
   - Dependency paths
   - Links to security advisories

2. **Outdated Packages**
   - Current versions
   - Latest available versions
   - Which workspaces depend on them

3. **High-Risk Package Check**
   - Known problematic packages
   - Version validation

4. **Lock File Integrity**
   - Sync status with package.json files

### Viewing Reports

```bash
# View latest full audit
cat audit-reports/audit-*.txt | tail -1000

# Process latest JSON report
jq '.' audit-reports/audit-latest.json

# Clean old reports (older than 30 days)
find audit-reports/ -name "audit-*.txt" -mtime +30 -delete
```

## Troubleshooting

### Scripts Not Executable

```bash
chmod +x scripts/*.sh
```

### Lock File Out of Sync

```bash
pnpm install
```

### False Positives

Some vulnerabilities may not affect your specific usage. Check:

- The actual code path used
- Whether the vulnerable function is called
- Your specific configuration

Document accepted risks in your security review notes.

### Package Conflicts

```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm store prune
pnpm install
```

### Vulnerability in Documentation Dependencies

If vulnerabilities are only in dev dependencies (like VitePress plugins), they don't affect production but should still be addressed:

```bash
# Update docs dependencies
cd docs
pnpm update <package>@latest
cd ..
pnpm audit
```

## Platform-Agnostic Design

All scripts use standard bash and work on:

- ✅ Linux
- ✅ macOS
- ✅ Windows (WSL/Git Bash)
- ✅ Docker containers
- ✅ Any bash-compatible CI/CD environment

## Additional Resources

- [scripts/README.md](/scripts/README.md) - Detailed script documentation
- [pnpm audit documentation](https://pnpm.io/cli/audit)
- [npm advisory database](https://github.com/advisories)
- [Snyk vulnerability database](https://snyk.io/vuln)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

## Best Practices

::: tip Security First

- Run `pnpm audit:quick` before every commit
- Run `pnpm audit` weekly
- Fix critical/high vulnerabilities immediately
- Keep dependencies updated
- Review security advisories for your packages
  :::

::: warning Testing Required
Always test after security updates:

- Run full test suite
- Test critical user flows
- Verify builds succeed
- Check for breaking changes
  :::

::: danger Never Skip Security
Even if automated fixes fail, don't ignore vulnerabilities:

- Investigate manual fixes
- Update to secure versions
- Find alternative packages if needed
- Document decisions for accepted risks
  :::
