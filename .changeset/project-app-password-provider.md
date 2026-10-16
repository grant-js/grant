---
'grant-api': minor
'grant-web': minor
'@grantjs/schema': minor
---

Project apps can sign people in with an **email and password** that belongs to the project (ADR 0011 § 5). The provider is **opt-in**: a `ProjectApp` offers it only when `enabledProviders` names `password`; an empty list still means Email and the configured social providers, never Password.

- **Project credential only.** `POST /api/auth/project/password` (email, password, `client_id`, `redirect_uri`, `state`) checks the project's own credential for the app's project. The platform password is never accepted, there is no fallback, and a password never creates an identity, a membership or a platform session. The person must already be a project member. On success the response is the same consent redirect the magic link gets; an unknown address, a non-member, no project credential, a wrong password and a locked credential all return one generic `401` after the same bcrypt work.
- **Lockout.** Per `(project, user)`, from `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES`. Each attempt is recorded before the password is compared, on a connection outside the request transaction, so a burst of parallel guesses cannot outrun the count. Platform login and other projects are unaffected, and magic link and OAuth keep working for a locked person.
- **MFA at the ceremony.** With `AUTH_MIN_AAL_AT_LOGIN=aal2` and an active MFA enrolment, the response is `mfa_required` and `POST /api/auth/project/password/mfa` verifies a TOTP or recovery code (each attempt spends from the same lockout) before the consent redirect.
- **Hosted view and schema.** `/auth/project/password` (en, de) and the **Password** button on the project sign-in entry when the app enables it. `ProjectApp.enabledProviders` accepts `password`; `@grantjs/schema` exports `ProjectPasswordSignInResult`.
- Request bodies of `/auth/project/password*` are redacted in request logs.
