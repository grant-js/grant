---
'grant-api': patch
---

TOTP and recovery-code verification now enforce `AUTH_MFA_VERIFY_MAX_ATTEMPTS` per user in a rolling `AUTH_MFA_VERIFY_WINDOW_MINUTES` window, so MFA codes cannot be guessed without bound on platform or project verify paths.
