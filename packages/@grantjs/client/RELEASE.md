# Release Guide for @grantjs/client

This package uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

## Overview

Changesets is a modern tool for managing versions in monorepos. It:

- Automatically determines version bumps based on conventional commits
- Generates changelogs
- Handles publishing to npm
- Works seamlessly with pnpm workspaces

## Quick Start

### 1. Create a Changeset

When you make changes that should trigger a release:

```bash
# From the repository root
pnpm changeset
```

This interactive command will:

1. Ask which packages changed (select `@grantjs/client`)
2. Ask what type of change (major/minor/patch)
3. Ask for a summary of changes
4. Create a changeset file in `.changeset/`

**Example:**

```bash
$ pnpm changeset
🦋  Which packages would you like to include?
✔ @grantjs/client

🦋  What kind of change is this for @grantjs/client?
✔ Minor (new feature)

🦋  Please enter a summary for this change:
✔ Add useCanWithLoading hook for loading state management
```

This creates a file like `.changeset/brave-kiwis-sleep.md`:

```markdown
---
'@grantjs/client': minor
---

Add useCanWithLoading hook for loading state management
```

**Commit the changeset file** along with your code changes.

### 2. Version Bumping

When ready to release, bump versions:

```bash
# From the repository root
pnpm version
```

This will:

- Read all changeset files
- Determine version bumps for affected packages
- Update `package.json` versions
- Generate/update `CHANGELOG.md`
- Delete used changeset files

**After versioning:**

```bash
# Install updated dependencies
pnpm install

# Commit the version changes
git add .
git commit -m "chore: version packages"
```

### 3. Publishing

Publish to npm:

```bash
# From the repository root
pnpm release
```

This will:

- Build all packages (`pnpm build`)
- Publish packages with bumped versions to npm
- Create git tags

**Note:** You must be authenticated with npm (`npm login`) for a local publish. CI uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC) instead of a stored token.

## CI/CD Integration

### GitHub Actions

A GitHub Actions workflow is set up at `.github/workflows/release.yml`. It will:

1. **On push to main with pending changesets**: Create/update a "Version Packages" PR
2. **On merge of that version PR**: Publish `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, and `@grantjs/cli` via npm trusted publishing

Do not add an `NPM_TOKEN` secret for this workflow. Each public package's npm Settings → Trusted publishing entry must name this repository and the workflow file `release.yml`. The publish job runs on GitHub-hosted runners (`ubuntu-latest`); self-hosted runners cannot use OIDC trusted publishing.

## Version Types

Changesets uses semantic versioning:

- **Major** (`1.0.0` → `2.0.0`): Breaking changes
  - Example: Removing a public API, changing function signatures
- **Minor** (`1.0.0` → `1.1.0`): New features, backward compatible
  - Example: Adding a new hook, new component prop
- **Patch** (`1.0.0` → `1.0.1`): Bug fixes, backward compatible
  - Example: Fixing a bug, improving error messages

## Manual Release (Alternative)

If you need to release manually without changesets:

```bash
# 1. Update version in package.json manually
# 2. Build
pnpm --filter @grantjs/client build

# 3. Test
pnpm --filter @grantjs/client test:run

# 4. Publish
pnpm --filter @grantjs/client publish --access public
```

## Best Practices

1. **Always create a changeset** for user-facing changes
2. **Don't create changesets** for:
   - Internal refactoring (unless it affects the public API)
   - Documentation-only changes
   - Test-only changes
3. **Use descriptive summaries** in changesets - they become changelog entries
4. **Review version PRs** before merging to ensure correct version bumps
5. **Test before publishing** - the `prepublishOnly` script runs tests automatically

## Troubleshooting

### "No changesets present"

- Make sure you've created a changeset with `pnpm changeset`
- Check that the changeset file is committed

### "Package not found" during publish

- Ensure you're logged into npm: `npm whoami`
- Check that the package name is correct in `package.json`

### Version conflicts

- Run `pnpm install` after `pnpm version` to update lockfile
- Ensure all changeset files are committed before versioning

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [pnpm + Changesets Guide](https://pnpm.io/using-changesets)
- [Semantic Versioning](https://semver.org/)
