# Contributing to Grant

Thank you for your interest in contributing to Grant. This document gives a short overview; for full details see our [Development Guide](./docs/contributing/guide.md).

## How to contribute

1. **Fork** the repository and clone your fork.
2. **Create a feature branch** from `main`: `git checkout -b feat/your-feature`.
3. **Make your changes** following our [layer boundaries and code style](./docs/contributing/guide.md).
4. **Run locally**: `pnpm build`, `pnpm test`, and `pnpm lint` must pass.
5. **Open a pull request** against `main`. Your PR must pass CI (lint, build, test, secret scanning).

## Do not commit secrets

CI runs secret scanning (Gitleaks). Do not commit API keys, tokens, or passwords. Use `.env.example` and environment variables for configuration.

- **Pre-push:** A Git hook runs `pnpm run secret-scan:protect` before each push. Install [Gitleaks](https://github.com/gitleaks/gitleaks) locally (e.g. `brew install gitleaks`) so the hook can run; otherwise the push will fail until you install it or bypass the hook with `--no-verify`.
- **Manual scan:** Run `pnpm run secret-scan` to scan the whole repo (e.g. before opening a PR).

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, etc. Keep the first line short; add details in the body if needed.

## Publishing packages

To publish changes to npm (e.g. `@grantjs/server`, `@grantjs/client`, `@grantjs/cli`):

1. Add a [changeset](https://github.com/changesets/changesets) for the change: `pnpm changeset`
2. Commit the changeset and merge your PR to `main`
3. The release workflow on `main` will open a "Version Packages" PR; merging that PR will publish to npm

Do not run `pnpm release` manually for normal releases; the CI handles it.

## Further reading

- [Contributors](./CONTRIBUTORS.md) — Contributor recognition and the contributor avatar grid
- [Development Guide](./docs/contributing/guide.md) — Project structure, workflow, layer boundaries, adding GraphQL/REST features
- [Adding REST Endpoints](./docs/contributing/rest-api.md) — REST API development
- [Testing](./docs/contributing/testing.md) — Test setup and patterns
- [Security Audit](./docs/contributing/security-audit.md) — Dependency scanning and audit scripts

## Code of conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.
