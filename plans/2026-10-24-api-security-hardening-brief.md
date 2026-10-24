# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Source: [API security and performance audit](./api-security-performance-audit.md) (2026-10-24, `main`). Stack: [2026-10-24-api-security-hardening-stack.md](./2026-10-24-api-security-hardening-stack.md). Also land these two files under repo-root `plans/` when the first slice is cut.

## Metadata

- **Slug**: `api-security-hardening`
- **Date**: 2026-10-24
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro
- **Status**: approved — Gate 1 passed 2026-10-24 by Alejandro / in-progress

## Objective

Close the residual security and hot-path gaps from the 2026-10-24 API audit without changing today’s verified-user or MFA UX. Email verification and MFA stay separate gates. Unverified users keep hitting the API email-verification wall after refresh (today that wall drops after ~15 minutes). That is the intended High #1 change, not an MFA change.

## Acceptance criteria

- [ ] **H1 — Refresh `isVerified`:** `AuthHandler.refreshSession` / `signSession` resolve `isVerified` from the session’s authentication method. Never default the claim to `true`. A regression keeps an unverified refresh false. Login, `/auth/mfa`, and in-app `MfaStepUpDialog` behave as they do today for verified users. Dashboard banner / hidden buttons (already `Me` / DB) stay as they are. Invitation accept keeps showing `EMAIL_VERIFICATION_REQUIRED` after refresh for still-unverified users.
- [ ] **H2 — Project-app mutate/delete:** Update and delete require `existing.projectId ===` scoped project id (mirror picture helpers). Repository `WHERE` includes `project_id`. `project_apps` (and related OAuth tables as needed) get project-scoped RLS.
- [ ] **M1 — GraphQL auth rate limit:** `login`, `register`, `refreshSession` (and unnamed documents that are those operations) use the auth-sensitive bucket, not only the global IP bucket.
- [ ] **M2 — Platform lockout:** Platform email/password login uses the same record-before-verify, out-of-request-transaction lockout as project-app password, keyed by resolved user id, with existing `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` / `AUTH_LOCKOUT_DURATION_MINUTES`.
- [ ] **M3 — MFA verify budget:** `AUTH_CONFIG.auth.mfa.verifyMaxAttempts` / `verifyWindowMinutes` are enforced on platform and project TOTP verify and recovery-verify (per user or per session).
- [ ] **M4 — Empty project-app scopes fail closed:** Do not mint `projectApp` when the consent intersection is empty. `Grant.isAuthorized` denies `projectApp` when `scopes` is missing or empty.
- [ ] **M5 — OAuth refresh vs app allowlist:** Refresh always intersects stored grant slugs with current `app.scopes`. An empty app list means no OAuth scopes.
- [ ] **M6 — Authz cache on delete:** Role, group, and permission **delete** cascades call the same permissions/auth-result invalidation as assign/revoke.
- [ ] **M7 — GraphQL cost + list clamp:** Apollo gets depth/complexity limits aligned with the largest legitimate dashboard query. Every list `limit` is clamped to `PAGINATION_MAX_PAGE_SIZE`; public APIs reject or cap `-1`.
- [ ] **M8 — Org member list:** Page in SQL; batch-load users and roles for the page only. No `limit: -1` on public APIs.
- [ ] **M9 — Scoped entity lists:** Scope and page in the database. Load project-user pivots only for the page’s user ids, not the whole tenant map.
- [ ] **M10 — IAM cascade deletes:** Keep one event per affected subject; batch outbox inserts and/or chunk teardown so the transaction and webhook relay stay bounded.
- [ ] **L1 — Min-AAL unnamed GraphQL:** Unresolved / unnamed operations fail closed when `AUTH_MIN_AAL_AT_LOGIN=aal2`. Allowlist `Me`, `VerifyMfa`, `RefreshSession`, and recovery only. Do not change REST min-AAL.
- [ ] **L2 — Refresh reuse:** Reuse of a rotated refresh secret revokes the session or grant family.
- [ ] **L3 — Residual access JWT window:** Docs keep stating revoked API keys/grants leave access JWTs valid until `exp`. No `jti` denylist unless a later story requires a shorter window.
- [ ] **L4 — Trusted client IP:** Production docs (and config notes) require `SECURITY_TRUSTED_CLIENT_IP_HEADER` set to an edge-overwritten value. Do not key limits on the leftmost untrusted `X-Forwarded-For` hop.
- [ ] **L5 — JWKS HTTP cache:** Short-TTL cache of the JWKS payload per issuer, similar to the in-process verification-key cache.

Each slice ships tests for its acceptance line, Verifier clean, and a patch changeset on the packages it touches.

## Non-goals

- Changing MFA wall / step-up UX for verified users (dual-dialog after sign-in was `/auth/mfa` + `MfaStepUpDialog` on `MFA_REQUIRED`, fixed in `98cb9b0`; out of this story)
- Making the dashboard email-verification banner follow the JWT (it already follows `Me` / DB)
- `jti` revocation / introspection (document only; L3)
- Rewriting RBAC, API-key exchange, project OAuth PKCE/redirects, webhook SSRF, or identity-only `before` (audit found those sound)
- `apps/web` product work except regressions that an API slice forces
- Published `@grantjs/{client,server,cli}` beyond token-type checks already in scope for M4
- Dependency CVE scanning / `pnpm audit`
- Runtime load tests
- GDPR export/delete internals
- Re-filing documented residuals (CDM `findBy: email` / `id` global reuse, global `user_tags`, instance-wide permission catalog, invitation email on webhook `data.after`, `allowPrivateTargets`)

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [x] GDPR export / deletion / PII
- [ ] None of the above

**Why each is checked**

- **Auth / sessions / MFA / AAL:** H1 refresh claim, M2 lockout, M3 MFA budget, L1 min-AAL, L2 refresh-family revoke.
- **API keys / tokens:** M4/M5 project-app scope minting; L3 residual JWT window (docs).
- **Tenancy / RLS:** H2 project-app mutate-by-id and RLS.
- **Permissions / RBAC:** M4 `isAuthorized` fail-closed; M6 cache invalidation on delete.
- **GDPR / PII:** L4 audit IPs; no new PII on the wire. Checked so IP/audit handling is reviewed, not because we add export/delete work.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend stays inactive unless a slice is forced to touch web copy. Architect is inactive (no new package or port boundary beyond existing `I*Service` params / RLS on an existing table).

## Human gate

- [x] Gate 1: Story brief approved — 2026-10-24 by Alejandro.
