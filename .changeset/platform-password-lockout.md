---
'grant-api': patch
---

Platform (console) email/password login now enforces the same per-user lockout as the project-app password provider (`AUTH_MAX_FAILED_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_DURATION_MINUTES`), recording the attempt before verification so parallel guesses cannot share one remaining try.
