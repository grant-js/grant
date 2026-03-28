# Security

## Reporting a vulnerability

Please **do not** report security vulnerabilities in public GitHub issues. To report a vulnerability:

1. **Email** **engineering@grant.center** with a description of the issue and steps to reproduce (if applicable). This inbox is for responsible security disclosure only—not general product support.
2. You can expect an acknowledgment within a reasonable time (typically within a few business days).
3. We will work with you to understand and address the issue. We may ask for more detail or suggest a fix.
4. Once a fix is ready, we will release it and then disclose the vulnerability (e.g. in release notes or a security advisory). We will credit you unless you prefer to remain anonymous.

We ask that you give us time to address the issue before any public disclosure.

## Secret scanning

This project runs [Gitleaks](https://github.com/gitleaks/gitleaks) in CI to detect hardcoded secrets (API keys, tokens, passwords) in the repository. **Do not commit real secrets.** Use environment variables and `.env.example` for configuration. If you accidentally commit a secret, rotate it immediately and remove it from history (e.g. via a force-push after rewriting, or contact the maintainers).

## Dependency and audit workflow

For dependency vulnerability scanning and security audit scripts used in development, see [Security Audit](./docs/contributing/security-audit.md).
