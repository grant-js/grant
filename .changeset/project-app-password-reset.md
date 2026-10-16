---
'grant-api': minor
'grant-web': minor
---

Project apps that enable the `password` provider get a **"Forgot password?"** flow (ADR 0011 § 6).

- **Request.** `POST /api/auth/project/password/forgot` sends a reset link to an existing member of the app's project that has an Email method. The response is the same `200` for an unknown address, a non-member, an address over its limit and an address that was sent a link, so it cannot be used to find out who is a member. Each member may be sent `PROJECT_PASSWORD_RESET_MAX_REQUESTS` links (default 5) per `PROJECT_PASSWORD_RESET_REQUEST_WINDOW_SECONDS` (default one hour), on top of the per-IP limiter.
- **Complete.** `POST /api/auth/project/password/reset` sets the member's project password (`source: reset`, so a later CDM import never overwrites it), clears the failed-attempt lockout, marks the Email method verified (the link proved the mailbox; the platform password is untouched) and **revokes every project-app grant the user holds in that project** (other projects and platform sessions are untouched; access tokens already issued live until they expire). The password policy applies and a rejected password does not use the token up.
- **Token.** Random, stored only as a SHA-256 digest scoped to the project and user, looked up by digest, single-use, valid for `PROJECT_PASSWORD_RESET_TOKEN_TTL_SECONDS` (default 30 minutes), and carried in the URL fragment of the emailed link.
- **New table.** Migration `project_password_resets` (one row per project and user, with the project RLS policy). New email: `sendProjectPasswordReset` on every email adapter, in `en` and `de`.
- **Hosted views.** `/auth/project/forgot-password` and `/auth/project/reset-password`; the "Forgot password?" link of the hosted password view is shown now.
